import type { PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";

export type CreatePaymentInput = {
  orderNumber: string;
  /** Unique per attempt (order number + attempt), the gateway's idempotency key. */
  reference: string;
  method: PaymentMethod;
  /** Order total in rupiah. */
  amount: number;
  /** Our payment window; the gateway may answer with an earlier deadline. */
  expiresAt: Date;
  customer: { name: string; email: string; phone: string };
};

export type CreatedPayment = {
  /** Formatted VA number / retail payment code ("8077 0812 3456 7890"), null otherwise. */
  vaNumber: string | null;
  /** QRIS EMV string to render as a QR code. */
  qrContent: string | null;
  /** E-wallet payment_url (DANA, ShopeePay) or the QRIS image URL. Absent for OVO. */
  payUrl: string | null;
  transactionId: string | null;
  /** What the customer pays (amount + fee when the customer bears it). */
  chargedAmount: number;
  fee: number;
  feeBearer: "merchant" | "customer";
  /** The deadline that really applies (show this one). */
  expiresAt: Date;
};

/** What a provider needs to know about a stored payment row. */
export type PaymentSnapshot = {
  orderNumber: string;
  reference: string | null;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  expiresAt: Date | null;
};

/** Channels the gateway currently accepts, with its logo per method. Null = no list (mock, or the API failed). */
export type ChannelList = { methods: Set<PaymentMethod>; logos: Partial<Record<PaymentMethod, string>> } | null;

/**
 * A payment gateway. `createPayment` issues the VA number / QR / e-wallet
 * request; `getStatus` asks whether it has been paid; `cancel` voids an unpaid
 * one. Real gateways also push webhooks (see src/app/api/payments/*).
 */
export interface PaymentProvider {
  readonly id: string;
  /** True when the UI may offer a "simulate payment" button (mock, gateway sandbox). */
  readonly canSimulate: boolean;
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  getStatus(payment: PaymentSnapshot, now?: Date): Promise<PaymentStatus>;
  cancel(payment: PaymentSnapshot): Promise<void>;
  /** Demo/sandbox only: pay it, then report the resulting status. */
  simulatePaid(payment: PaymentSnapshot): Promise<PaymentStatus>;
  channels(): Promise<ChannelList>;
}

/** Gateway refused or could not be reached. `code` is the gateway's data.code (or TIMEOUT / NETWORK). */
export class PaymentGatewayError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message?: string,
  ) {
    super(message ?? `Payment gateway error ${httpStatus} ${code}`);
    this.name = "PaymentGatewayError";
  }

  /** The method can't be used for this order (choose another). */
  get unavailable() {
    return ["CHANNEL_DISABLED", "PROVIDER_REJECTED", "AMOUNT_BELOW_MINIMUM", "VALIDATION_ERROR"].includes(this.code);
  }
}
