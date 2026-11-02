import { db } from "@/lib/db";
import { readUnsubscribeToken } from "@/lib/emails";

export const dynamic = "force-dynamic";

/**
 * RFC 8058 one-click unsubscribe: Gmail and other mail apps POST here from their own "Unsubscribe"
 * button (List-Unsubscribe header). GET does nothing, so link scanners can't unsubscribe anyone.
 */
export async function POST(request: Request) {
  const email = await readUnsubscribeToken(new URL(request.url).searchParams.get("t"));
  if (!email) return new Response("Invalid link", { status: 400 });
  await db.newsletterSubscriber.deleteMany({ where: { email } });
  return new Response("Unsubscribed", { status: 200 });
}
