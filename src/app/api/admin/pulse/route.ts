import { adminPulse } from "@/lib/admin-pulse";
import { getCurrentUser } from "@/lib/auth";

/** Polled by the open admin (every 15 s while visible) to notice new paid orders without a reload. */
export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await adminPulse(), { headers: { "Cache-Control": "no-store" } });
}

export const dynamic = "force-dynamic";
