import type { NextRequest } from "next/server";
import { getOrderForViewer } from "@/lib/orders";

const noStore = { "Cache-Control": "no-store" };

/**
 * Polled by the pay page every few seconds. Same access rule as the pay page
 * (owner, admin, the browser that placed it, or the email `?t=` token). Asks
 * the gateway (throttled) and stores the answer through the same path the
 * webhook and the simulate button use.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/orders/[orderNumber]/payment-status">) {
  const { orderNumber } = await ctx.params;
  const order = await getOrderForViewer(orderNumber, request.nextUrl.searchParams.get("t"));
  if (!order) return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
  return Response.json(
    { status: order.paymentStatus, payment: order.payments[0]?.status ?? null },
    { headers: noStore },
  );
}
