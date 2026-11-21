"use server";

import { redirect } from "next/navigation";
import { findClaim } from "@/app/auth/claim-orders/claim-token";
import { claimGuestOrders } from "@/app/auth/google/callback/claim-orders";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * The button on /account/claim: checks the link and the session again (the account signed in must be the
 * one the link was emailed for, and its email must still be the one the link names), then adds the guest
 * orders placed with that email and shows /account with how many were added.
 */
export async function claimPastOrders(formData: FormData) {
  const token = String(formData.get("t") ?? "");
  const claim = await findClaim(token);
  if (!claim) redirect("/account?linked=invalid");
  const page = `/account/claim?t=${encodeURIComponent(token)}`;
  const user = await getCurrentUser();
  // Signed out meanwhile, or another account: the page asks to sign in, or says the link is for another account.
  if (!user || user.id !== claim.userId || user.email.trim().toLowerCase() !== claim.email) redirect(page);

  let added: number;
  try {
    added = await claimGuestOrders(db, claim.userId, claim.email);
  } catch (error) {
    console.error("[claim-orders] could not attach guest orders", error);
    redirect("/account?linked=error");
  }
  redirect(`/account?linked=${added}`);
}
