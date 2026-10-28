import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";

/** Signed-in visitors have no business on sign-in/sign-up/reset: send them on. */
export async function redirectIfSignedIn(next?: unknown) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : safeNext(next));
}
