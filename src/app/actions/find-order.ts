"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { deliverLater } from "@/lib/mail";
import { sendOrderLinkEmail } from "@/lib/order-emails";
import { ORDER_NUMBER_RE } from "@/lib/orders";
import { allowRequest, clientIp, perClientMax } from "@/lib/rate-limit";

export type FindOrderState = {
  errors?: { orderNumber?: "orderNumber"; email?: "email" };
  formError?: "tooMany";
  /** The lookup went through: "if they match, we've emailed you a link". Said whether or not they matched. */
  sent?: boolean;
  values?: { orderNumber: string; email: string };
  /** Changes on every submit so the form can move focus to the first error. */
  attempt?: number;
};

/**
 * Lookups per 15 minutes (see allowRequest), per client and per email. Order numbers run in sequence, so
 * the email is the secret: the per-email limit stops guessing numbers for one address, the per-client
 * one stops trying many addresses. The client is checked first, so a client over its limit uses up no
 * one's per-email allowance.
 */
const FIND_MAX_PER_EMAIL = 5;
const FIND_MAX_PER_IP = 20;

/** "db 42", "DB-0042" or "42" → "DB-0042". */
function normalizeOrderNumber(value: string) {
  const digits = value.trim().toUpperCase().replace(/^DB[\s-]*/, "");
  return /^\d{1,9}$/.test(digits) ? `DB-${digits.padStart(4, "0")}` : value.trim().toUpperCase();
}

/**
 * /orders/find: a guest asks for their order with its number and the checkout email. When both match, the
 * order's signed link (the same one the order emails carry) is emailed to that address; the page never
 * opens the order itself, so knowing someone's order number and email isn't enough to see it. A match and
 * a miss get the same answer, so the form says nothing about which orders exist.
 */
export async function findOrder(_prev: FindOrderState, formData: FormData): Promise<FindOrderState> {
  const raw = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  const orderNumber = normalizeOrderNumber(raw("orderNumber"));
  const email = raw("email").trim().toLowerCase();
  const values = { orderNumber: raw("orderNumber").trim(), email };
  const attempt = Date.now();

  const errors: FindOrderState["errors"] = {};
  if (!ORDER_NUMBER_RE.test(orderNumber)) errors.orderNumber = "orderNumber";
  if (!z.email().max(150).safeParse(email).success) errors.email = "email";
  if (errors.orderNumber || errors.email) return { errors, values, attempt };

  const ip = await clientIp();
  const allowed = allowRequest(`find:ip:${ip}`, perClientMax(ip, FIND_MAX_PER_IP)) && allowRequest(`find:email:${email}`, FIND_MAX_PER_EMAIL);
  if (!allowed) return { formError: "tooMany", values, attempt };

  const order = await db.order.findUnique({ where: { orderNumber }, select: { orderNumber: true, email: true } });
  if (order && order.email.trim().toLowerCase() === email) deliverLater(() => sendOrderLinkEmail(order.orderNumber));
  return { sent: true, values, attempt };
}
