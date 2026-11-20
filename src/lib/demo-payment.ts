import "server-only";
import type { FulfilmentStatus, PaymentStatus } from "@/generated/prisma/enums";
import { db } from "./db";
import { markOrderPaid, markPaymentExpired, orderDeadline, paymentSnapshot, withOrderLock } from "./orders";
import { DEMO_PROVIDER, demoPaymentsEnabled, getPaymentProvider, PaymentGatewayError } from "./payments";

/**
 * Demo payments (DEMO_PAYMENTS="on"): the store marks an unpaid order paid without money moving, so
 * every after-payment flow (emails, stock, the accept / decline step, the status steps) can be tried
 * on the live site with the real gateway configured. The order then goes through markOrderPaid like
 * any payment; only its payment row says provider "demo".
 */

/**
 * What happened: paid in demo mode, found really paid at the gateway, or refused: flag off, order not
 * unpaid and open, someone else changing its payment, or the gateway couldn't close the open payment.
 */
export type DemoPaidResult = "paid" | "real" | "off" | "invalid" | "busy" | "gateway";

/** Shown on the gateway's dashboard for the payment request the demo closes. */
export const DEMO_CANCEL_REASON = "Marked paid in demo mode by the store";

/** Unpaid and still open: not cancelled, not past its payment deadline. */
export function canMarkPaidDemo(
  order: { paymentStatus: PaymentStatus; fulfilmentStatus: FulfilmentStatus; createdAt: Date },
  now = new Date(),
) {
  return order.paymentStatus === "awaiting" && order.fulfilmentStatus === "pending" && orderDeadline(order) > now;
}

/**
 * Mark an order paid in demo mode. Under the order's lock (the same one as the customer's method
 * switch and the store's cancel), in this order, so the customer's open pay page keeps polling and
 * then moves to the success page:
 * 1. a "demo" payment row (the last attempt's method, else QRIS; the order total, no fee) becomes
 *    the latest attempt, the one the status poll looks at;
 * 2. every live gateway payment is closed at the gateway and on our side. If the gateway won't close
 *    one because it was paid, the money is real: the order is paid with that payment, and the demo
 *    row goes (`real`). If the gateway can't be reached or answers with an error, the payment may
 *    still be payable, so nothing changes (`gateway`, like the customer's method switch);
 * 3. the demo row is paid through markOrderPaid: the paid email, the store alert, stock and status.
 * A second call finds the order paid and changes nothing (`invalid`). If anything throws halfway,
 * the demo row is removed again, so it never stands in front of a live gateway payment.
 */
export async function markOrderPaidDemo(orderNumber: string): Promise<DemoPaidResult> {
  if (!demoPaymentsEnabled()) return "off";
  const found = await db.order.findUnique({
    where: { orderNumber },
    select: { id: true, paymentStatus: true, fulfilmentStatus: true, createdAt: true },
  });
  if (!found || !canMarkPaidDemo(found)) return "invalid";

  const outcome = await withOrderLock(found.id, async (): Promise<DemoPaidResult> => {
    // Read again under the lock: a payment, a cancel or another click may have landed meanwhile.
    const order = await db.order.findUnique({
      where: { id: found.id },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        paymentStatus: true,
        fulfilmentStatus: true,
        createdAt: true,
        payments: { orderBy: { id: "desc" } },
      },
    });
    if (!order || !canMarkPaidDemo(order)) return "invalid";

    // A demo row left awaiting by an earlier attempt that stopped halfway is reused.
    const demo =
      order.payments.find((p) => p.provider === DEMO_PROVIDER && p.status === "awaiting") ??
      (await db.payment.create({
        data: {
          orderId: order.id,
          method: order.payments[0]?.method ?? "qris",
          amount: order.total,
          status: "awaiting",
          provider: DEMO_PROVIDER,
          reference: `${order.orderNumber}-demo-${order.payments.length + 1}`,
          chargedAmount: order.total,
          fee: 0,
          expiresAt: orderDeadline(order),
        },
      }));
    // No money came with the demo row: whenever it doesn't end up paying the order, it goes.
    const dropDemo = () => db.payment.deleteMany({ where: { id: demo.id, status: { not: "paid" } } });

    try {
      for (const live of order.payments.filter((p) => p.status === "awaiting" && p.provider !== DEMO_PROVIDER)) {
        const provider = getPaymentProvider(live.provider);
        const snapshot = paymentSnapshot(order, live);
        try {
          await provider.cancel(snapshot, DEMO_CANCEL_REASON);
        } catch (error) {
          const code = error instanceof PaymentGatewayError ? error.code : null;
          const status = await provider.getStatus(snapshot);
          if (status === "paid") {
            // Paid for real meanwhile (NOT_CANCELLABLE): that payment pays the order.
            await dropDemo();
            await markOrderPaid(order.id, live.id);
            return "real";
          }
          // Closed already (not cancellable or unknown there, or expired) is fine. Any other failure
          // leaves the request possibly payable: keep it live and change nothing.
          if (status !== "expired" && code !== "NOT_CANCELLABLE" && code !== "NOT_FOUND") {
            console.warn(`[demo] ${order.orderNumber}: cancel ${live.reference} at the gateway failed (${code ?? String(error)}); not marked paid`);
            await dropDemo();
            return "gateway";
          }
        }
        await markPaymentExpired(live.id);
      }

      // The sweeper (no lock) may have closed the order at its deadline while the gateway answered.
      const ready = await db.payment.count({ where: { id: demo.id, status: "awaiting", order: { paymentStatus: "awaiting", fulfilmentStatus: "pending" } } });
      if (ready === 0) {
        await dropDemo();
        return "invalid";
      }
      const changed = await markOrderPaid(order.id, demo.id);
      const after = await db.order.findUnique({ where: { id: order.id }, select: { paymentStatus: true } });
      if (changed && after?.paymentStatus === "paid") {
        console.info(`[demo] ${order.orderNumber} marked paid in demo mode (${demo.reference})`);
        return "paid";
      }
      // Paid some other way at the last moment (a webhook): markOrderPaid still recorded the demo row
      // as paid, so it is removed whatever its status.
      await db.payment.deleteMany({ where: { id: demo.id } });
      return after?.paymentStatus === "paid" ? "real" : "invalid";
    } catch (error) {
      await dropDemo().catch(() => {});
      throw error;
    }
  });
  return outcome ?? "busy";
}
