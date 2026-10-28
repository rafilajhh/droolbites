import { db } from "@/lib/db";
import { expireOrder, markOrderPaid, markPaymentExpired, orderDeadline } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/payments/belibayar";

const ok = (messages = "OK") => Response.json({ success: true, messages });

/**
 * Belibayar payment notifications (https://docs.belibayar.id/docs/webhooks).
 * Verifies X-Belibayar-Signature over the raw body, ignores withdrawal events,
 * and applies paid / expired / cancelled idempotently (a repeat of the same
 * transaction_id + status changes nothing). A paid that arrives after expired
 * or cancelled is still accepted: only paid is final. Replies 2xx quickly;
 * the paid email is sent after the response.
 */
export async function POST(request: Request) {
  const secret = process.env.BELIBAYAR_WEBHOOK_SECRET ?? "";
  if (!secret) {
    console.error("[belibayar webhook] webhook secret not configured (BELIBAYAR_WEBHOOK_SECRET)");
    return Response.json({ success: false, messages: "Webhook not configured" }, { status: 503 });
  }

  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-belibayar-signature") ?? "", secret)) {
    return Response.json({ success: false, messages: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    payload = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ success: false, messages: "Invalid JSON" }, { status: 400 });
  }

  // Payment notifications have no `event`; withdrawals use "withdrawal.*". Neither kind may be retried forever.
  if (Object.hasOwn(payload, "event")) {
    if (!(typeof payload.event === "string" && payload.event.startsWith("withdrawal."))) {
      console.warn("[belibayar webhook] unknown event ignored:", String(payload.event).slice(0, 60));
    }
    return ok("Ignored");
  }

  const reference = typeof payload.reference === "string" ? payload.reference : "";
  const status = payload.status;
  const payment = reference
    ? await db.payment.findUnique({
        where: { reference },
        select: {
          id: true,
          orderId: true,
          transactionId: true,
          chargedAmount: true,
          fee: true,
          feeBearer: true,
          order: { select: { createdAt: true, total: true } },
        },
      })
    : null;
  if (!payment) {
    console.warn(`[belibayar webhook] no payment for reference "${reference.slice(0, 64)}"`);
    return ok("Unknown reference");
  }
  if (payment.transactionId && typeof payload.transaction_id === "string" && payload.transaction_id !== payment.transactionId) {
    console.warn(`[belibayar webhook] ${reference}: transaction_id does not match, ignored`);
    return ok("Ignored");
  }

  if (status === "paid") {
    const amount = typeof payload.amount === "number" ? payload.amount : null;
    // Without an amount the notification can't show a full payment: don't mark it paid from here.
    // The status poll (gateway inquiry) settles it instead.
    if (amount === null) {
      console.warn(`[belibayar webhook] ${reference}: paid without an amount, not marked paid (left to the status poll)`);
      return ok("Amount missing");
    }
    // Less than the order total is not a full payment: leave it for the store to sort out.
    if (amount < payment.order.total) {
      console.warn(`[belibayar webhook] ${reference}: paid amount ${amount} is below the order total ${payment.order.total}, not marked paid`);
      return ok("Amount mismatch");
    }
    const paidAt = typeof payload.paid_at === "number" ? new Date(payload.paid_at * 1000) : new Date();
    await markOrderPaid(payment.orderId, payment.id, paidAt);
    // Keep what the gateway finally charged (fee settings can change between charge and payment),
    // also when a status poll already marked the payment paid.
    const fee = typeof payload.merchant_fee === "number" ? payload.merchant_fee : payment.fee;
    const feeBearer = payload.fee_bearer === "customer" || payload.fee_bearer === "merchant" ? payload.fee_bearer : payment.feeBearer;
    if (amount !== payment.chargedAmount || fee !== payment.fee || feeBearer !== payment.feeBearer) {
      await db.payment.updateMany({ where: { id: payment.id, status: "paid" }, data: { chargedAmount: amount, fee, feeBearer } });
    }
  } else if (status === "expired" || status === "cancelled") {
    await markPaymentExpired(payment.id);
    if (orderDeadline(payment.order) <= new Date()) await expireOrder(payment.orderId);
  }
  return ok();
}
