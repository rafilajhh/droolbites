import type { NextRequest } from "next/server";

/**
 * Where the "add my past orders" link pointed before it moved to /account/claim, kept so links already
 * emailed still work. Changes nothing: it passes the token on to the page that asks to confirm.
 */
export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  return new Response(null, {
    status: 302,
    headers: { Location: `/account/claim?t=${encodeURIComponent(token)}`, "Cache-Control": "no-store" },
  });
}
