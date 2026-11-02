import { isCronRequest } from "@/lib/cron";
import { db } from "@/lib/db";
import { getOrderByNumber, syncPaymentStatus } from "@/lib/orders";
import { PAYMENT_WINDOW_MS } from "@/lib/payments";

export const dynamic = "force-dynamic";

/** Orders closed per run; the next run picks up the rest. */
const BATCH = 25;
/** Only orders whose deadline passed within this long; older ones close lazily, as before. */
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Housekeeping, called every few minutes by the app itself (src/instrumentation.ts): unpaid orders
 * past their deadline are closed the same way a visit to the order page would close them (the
 * gateway is asked first, so a late payment still counts), which sends the "expired" email.
 * Without this an order only expired when someone looked at it.
 */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return new Response(null, { status: 404 });
  const now = Date.now();

  const overdue = await db.order.findMany({
    where: {
      paymentStatus: "awaiting",
      // Store-cancelled orders are closed already; leave their history alone.
      fulfilmentStatus: "pending",
      createdAt: { lt: new Date(now - PAYMENT_WINDOW_MS), gt: new Date(now - PAYMENT_WINDOW_MS - LOOKBACK_MS) },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { orderNumber: true },
  });

  let closed = 0;
  for (const { orderNumber } of overdue) {
    try {
      const order = await getOrderByNumber(orderNumber);
      if (order && (await syncPaymentStatus(order)).paymentStatus !== "awaiting") closed++;
    } catch (error) {
      console.error(`[cron] could not close ${orderNumber}`, error);
    }
  }
  return Response.json({ checked: overdue.length, closed });
}
