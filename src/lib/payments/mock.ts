import "server-only";
import { createHash } from "node:crypto";
import type { PaymentMethod } from "@/generated/prisma/enums";
import type { PaymentProvider } from "./types";

/** How long an order waits for payment. */
export const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Company-code prefixes in the style of each bank's VA numbers; retail codes get a store prefix. */
const VA_PREFIX: Partial<Record<PaymentMethod, string>> = {
  bca_va: "8077",
  bni_va: "8241",
  mandiri_va: "8960",
  bri_va: "2622",
  permata_va: "8625",
  bsi_va: "9009",
  muamalat_va: "8015",
  cimb_va: "5919",
  sinarmas_va: "8090",
  bnc_va: "9028",
  maybank_va: "7812",
  indomaret: "7020",
  alfamart: "7030",
};

/** 16 digits, shown in groups of 4. */
export function formatVaNumber(digits: string) {
  return digits.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Same reference + bank always gives the same VA number. */
export function mockVaNumber(reference: string, method: PaymentMethod): string | null {
  const prefix = VA_PREFIX[method];
  if (!prefix) return null;
  const hash = createHash("sha256").update(`droolbites:${reference}:${method}`).digest("hex");
  const digits = (BigInt(`0x${hash.slice(0, 15)}`) % BigInt("1000000000000")).toString().padStart(12, "0");
  return formatVaNumber(prefix + digits);
}

/**
 * No gateway: VA numbers are derived from the reference, nothing is ever paid
 * unless the demo "simulate payment" action marks it so.
 */
export const mockProvider: PaymentProvider = {
  id: "mock",
  /** Only together with the configured provider: see canSimulatePayment. */
  canSimulate: true,

  async createPayment({ orderNumber, reference, method, amount, expiresAt }) {
    return {
      vaNumber: mockVaNumber(reference, method),
      qrContent: method === "qris" ? `DROOLBITES-MOCK|${reference}|IDR${amount}` : null,
      // DANA / ShopeePay open the "app"; in the demo that jumps to the simulate box.
      payUrl: method === "dana" || method === "shopeepay" ? `/checkout/pay/${orderNumber}#simulate` : null,
      transactionId: null,
      chargedAmount: amount,
      fee: 0,
      feeBearer: "merchant",
      expiresAt,
    };
  },

  async getStatus(payment, now = new Date()) {
    if (payment.status === "awaiting" && payment.expiresAt && payment.expiresAt <= now) return "expired";
    return payment.status;
  },

  async cancel() {},

  async simulatePaid() {
    return "paid";
  },

  async channels() {
    return null;
  },
};
