import "server-only";
import type { PaymentProvider } from "./types";

/** payments.provider of a payment the store marked paid in demo mode. */
export const DEMO_PROVIDER = "demo";

/**
 * DEMO_PAYMENTS="on" lets an admin mark an unpaid order paid without money moving, and lets the
 * customer skip paying at checkout or on the pay page (src/lib/demo-payment.ts), to try every
 * after-payment flow on the live site. Anything else: off.
 */
export function demoPaymentsEnabled() {
  return process.env.DEMO_PAYMENTS === "on";
}

/**
 * The attempt the admin shows for an order: a paid one that brought real money first, then a demo-paid
 * one, else the latest (payments newest first). Should a gateway payment also arrive for a demo-paid
 * order, the real money is what the order page, lists, invoice, CSV and report show.
 */
export function shownPayment<T extends { status: string; provider: string | null }>(payments: T[]): T | undefined {
  return (
    payments.find((p) => p.status === "paid" && p.provider !== DEMO_PROVIDER) ??
    payments.find((p) => p.status === "paid") ??
    payments[0]
  );
}

/**
 * The payments the store marked paid in demo mode. Nothing exists at a gateway: the stored status is
 * the answer, so the status poll, the pay page and the order sweeper never ask a real gateway about
 * them (one left awaiting by an interrupted attempt expires at its deadline like a mock payment).
 * Never chosen by PAYMENT_PROVIDER (see getPaymentProvider) and never charges anything.
 */
export const demoProvider: PaymentProvider = {
  id: DEMO_PROVIDER,
  canSimulate: false,
  mayChargeFee: false,

  async createPayment() {
    throw new Error("The demo provider never charges: demo payments are only recorded by the admin's Mark paid (demo).");
  },

  async getStatus(payment, now = new Date()) {
    if (payment.status === "awaiting" && payment.expiresAt && payment.expiresAt <= now) return "expired";
    return payment.status;
  },

  async cancel() {},

  async simulatePaid(payment) {
    return payment.status;
  },

  async channels() {
    return null;
  },
};
