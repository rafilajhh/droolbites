import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import { paymentMethodInfo } from "@/lib/order-status";
import { formatVaNumber } from "./mock";
import { PaymentGatewayError, type AmountFloor, type ChannelList, type CreatePaymentInput, type CreatedPayment, type PaymentProvider } from "./types";

/**
 * Belibayar Direct API (https://docs.belibayar.id/docs).
 *
 * Every request carries X-Api-Key and X-Signature = hex HMAC-SHA256(canonical, secret):
 * - POST: canonical is the exact raw JSON body that is sent (serialized once);
 * - GET /channels: canonical is the full path, /sandbox included;
 * - GET /payment/status/:reference (legacy v1): canonical is ":" + unix seconds, sent as X-Timestamp.
 * A byr_test_ key switches every path to the /direct/v1/sandbox namespace.
 */

const TIMEOUT_MS = 15_000;
/** Polls and page views within this window reuse the last answer instead of asking the gateway again. */
const STATUS_TTL_MS = 3_000;
const CHANNELS_TTL_MS = 10 * 60 * 1000;
const CHANNELS_RETRY_MS = 60 * 1000;

type GatewayTx = {
  reference?: string;
  transaction_id?: string;
  status?: string;
  amount?: number;
  base_amount?: number;
  merchant_fee?: number;
  fee_bearer?: string;
  va_number?: string;
  qr_content?: string;
  qr_url?: string;
  payment_url?: string;
  expired_at?: number;
};

function config() {
  const apiKey = process.env.BELIBAYAR_API_KEY ?? "";
  const secret = process.env.BELIBAYAR_SECRET_KEY ?? "";
  const baseUrl = (process.env.BELIBAYAR_BASE_URL || "https://api.belibayar.id").replace(/\/+$/, "");
  if (!apiKey || !secret) throw new PaymentGatewayError("NOT_CONFIGURED", 0, "BELIBAYAR_API_KEY / BELIBAYAR_SECRET_KEY are not set");
  const sandbox = apiKey.startsWith("byr_test_");
  return { apiKey, secret, baseUrl, sandbox, prefix: sandbox ? "/direct/v1/sandbox" : "/direct/v1" };
}

function hmac(canonical: string, secret: string) {
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

async function request<T>(method: "GET" | "POST", path: string, opts: { body?: object; legacy?: boolean } = {}): Promise<T> {
  const c = config();
  const fullPath = c.prefix + path;
  const headers: Record<string, string> = { "X-Api-Key": c.apiKey, Accept: "application/json" };
  let body: string | undefined;
  if (opts.body) {
    body = JSON.stringify(opts.body); // serialized once: these exact bytes are signed and sent
    headers["Content-Type"] = "application/json";
    headers["X-Signature"] = hmac(body, c.secret);
  } else if (opts.legacy) {
    const ts = String(Math.floor(Date.now() / 1000));
    headers["X-Timestamp"] = ts;
    headers["X-Signature"] = hmac(`:${ts}`, c.secret);
  } else {
    headers["X-Signature"] = hmac(fullPath, c.secret);
  }

  let res: Response;
  try {
    res = await fetch(c.baseUrl + fullPath, { method, headers, body, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (error) {
    const code = (error as Error).name === "TimeoutError" ? "TIMEOUT" : "NETWORK";
    console.warn(`[belibayar] ${method} ${fullPath} failed: ${code}`);
    throw new PaymentGatewayError(code, 0);
  }

  let json: { success?: boolean; messages?: unknown; data?: unknown } = {};
  try {
    json = await res.json();
  } catch {
    // Not JSON (proxy error page): handled below by status.
  }
  if (!res.ok || json.success !== true) {
    const code = (json.data as { code?: unknown } | undefined)?.code;
    const errorCode = typeof code === "string" ? code : `HTTP_${res.status}`;
    console.warn(`[belibayar] ${method} ${fullPath} -> ${res.status} ${errorCode}`);
    throw new PaymentGatewayError(errorCode, res.status, typeof json.messages === "string" ? json.messages : undefined, json.data);
  }
  return json.data as T;
}

/** "0812-3456-789" / "+62 812…" → "62812…" (the gateway only takes Indonesian numbers). */
export function normalizeIdPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

function gatewayMethod(method: PaymentMethod) {
  const kind = paymentMethodInfo[method].kind;
  return kind === "ewallet" ? "ewallet" : kind === "qris" ? "qris" : "virtual_account";
}

function toStatus(status: string | undefined): PaymentStatus {
  if (status === "paid" || status === "success") return "paid";
  if (status === "expired" || status === "cancelled") return "expired";
  return "awaiting";
}

function toCreated(tx: GatewayTx, input: CreatePaymentInput): CreatedPayment {
  const va = tx.va_number?.trim() || null;
  const payUrl = tx.payment_url || tx.qr_url || null;
  if (payUrl && payUrl.length > 500) console.warn(`[belibayar] ${input.reference}: payment URL longer than 500 chars, not stored`);
  return {
    vaNumber: va ? (/^\d+$/.test(va) ? formatVaNumber(va) : va).slice(0, 30) : null,
    qrContent: tx.qr_content || null,
    payUrl: payUrl && payUrl.length <= 500 ? payUrl : null,
    transactionId: tx.transaction_id ? String(tx.transaction_id).slice(0, 64) : null,
    chargedAmount: typeof tx.amount === "number" ? tx.amount : input.amount,
    fee: typeof tx.merchant_fee === "number" ? tx.merchant_fee : 0,
    feeBearer: tx.fee_bearer === "customer" ? "customer" : "merchant",
    expiresAt: typeof tx.expired_at === "number" ? new Date(tx.expired_at * 1000) : input.expiresAt,
  };
}

function inquiry(reference: string) {
  return request<GatewayTx>("GET", `/payment/status/${encodeURIComponent(reference)}`, { legacy: true });
}

/** Outcome unknown: the payment may exist at the gateway. */
function uncertain(error: PaymentGatewayError) {
  return ["PAYMENT_CREATION_FAILED", "TIMEOUT", "NETWORK", "INTERNAL_ERROR"].includes(error.code);
}

/**
 * The minimum in an AMOUNT_BELOW_MINIMUM answer, if it names one. The docs don't fix its shape (for
 * payment links `data.channels` lists the methods with their minimums), so this looks for a positive
 * number under a min-like key in `data` or in its single `channels` entry. Null when there is none.
 */
export function minimumFrom(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const read = (obj: Record<string, unknown>) => {
    for (const key of ["min_amount", "minimum_amount", "minimum", "min"]) {
      const v = obj[key];
      const n = typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : NaN;
      if (Number.isInteger(n) && n > 0) return n;
    }
    return null;
  };
  const top = read(data as Record<string, unknown>);
  if (top !== null) return top;
  const channels = (data as { channels?: unknown }).channels;
  return Array.isArray(channels) && channels.length === 1 && channels[0] && typeof channels[0] === "object"
    ? read(channels[0] as Record<string, unknown>)
    : null;
}

/**
 * Minimums learned from refused charges, per method; forgotten after FLOOR_TTL_MS in case the gateway
 * changes them. Kept in memory (a restart forgets them; the next refusal teaches them again).
 */
const FLOOR_TTL_MS = 6 * 60 * 60 * 1000;
const floors = new Map<PaymentMethod, AmountFloor & { at: number }>();

/**
 * The methods a refusal for `method` says something about. Virtual-account banks are taken as one
 * (the minimum seen is per payment type), so a customer refused by one bank isn't sent to try the
 * next for the same error; e-wallets, QRIS and retail stay per method. A later accepted charge
 * clears its own method (learnAccepted).
 */
function sharingFloor(method: PaymentMethod): PaymentMethod[] {
  if (paymentMethodInfo[method].kind !== "va") return [method];
  return (Object.keys(paymentMethodInfo) as PaymentMethod[]).filter((m) => paymentMethodInfo[m].kind === "va");
}

function learnRefused(method: PaymentMethod, amount: number, min: number | null) {
  for (const m of sharingFloor(method)) {
    const known = floors.get(m);
    const fresh = known && Date.now() - known.at < FLOOR_TTL_MS ? known : null;
    floors.set(m, {
      min: min ?? fresh?.min ?? null,
      refusedAt: Math.max(amount, fresh?.refusedAt ?? 0),
      at: Date.now(),
    });
  }
}

/** A charge went through: anything learned that says this amount is too small is out of date. */
function learnAccepted(method: PaymentMethod, amount: number) {
  const known = floors.get(method);
  if (known && (known.refusedAt >= amount || (known.min !== null && known.min > amount))) floors.delete(method);
}

/**
 * The store's service fee rates from its Belibayar dashboard, charged to the customer (the same table
 * scripts/fake-belibayar.mjs uses). The API names a fee only in a charge's answer, so checkout shows
 * these before the order is placed; the charge's answer is what the pay page shows and what is paid.
 * Update this table when the dashboard rates change. Virtual accounts are flat; QRIS and e-wallets a
 * percentage (in basis points: 70 = 0.7%) rounded up to the rupiah. Retail stores have no known rate.
 */
const FLAT_FEES: Partial<Record<PaymentMethod, number>> = { bca_va: 4000, permata_va: 2500 };
const OTHER_VA_FEE = 3000;
const RATE_BP: Partial<Record<PaymentMethod, number>> = { ovo: 350, dana: 250, shopeepay: 275 };

export function belibayarServiceFee(method: PaymentMethod, amount: number): number | null {
  const kind = paymentMethodInfo[method].kind;
  if (kind === "va") return FLAT_FEES[method] ?? OTHER_VA_FEE;
  // QRIS: 0.7% below Rp100.000, 0.71% from there.
  const bp = kind === "qris" ? (amount < 100_000 ? 70 : 71) : RATE_BP[method];
  return bp === undefined ? null : Math.ceil((amount * bp) / 10_000);
}

const statusCache = new Map<string, { at: number; status: PaymentStatus }>();
let channelCache: { at: number; ttl: number; value: Promise<ChannelList> } | null = null;

async function loadChannels(): Promise<ChannelList> {
  try {
    const data = await request<{ channels?: { code?: string; method?: string; logo_url?: string }[] }>("GET", "/channels");
    const methods = new Set<PaymentMethod>();
    const logos: Partial<Record<PaymentMethod, string>> = {};
    for (const ch of data.channels ?? []) {
      const match = (Object.keys(paymentMethodInfo) as PaymentMethod[]).find(
        (m) => gatewayMethod(m) === ch.method && (paymentMethodInfo[m].channel ?? "QRIS") === ch.code,
      );
      if (!match) continue;
      methods.add(match);
      if (ch.logo_url && /^https:\/\//.test(ch.logo_url)) logos[match] = ch.logo_url;
    }
    return { methods, logos };
  } catch {
    channelCache = channelCache && { ...channelCache, ttl: CHANNELS_RETRY_MS };
    return null;
  }
}

export const belibayarProvider: PaymentProvider = {
  id: "belibayar",

  /** Only the sandbox can be "paid" from our UI. */
  get canSimulate() {
    return (process.env.BELIBAYAR_API_KEY ?? "").startsWith("byr_test_");
  },

  /** Who bears the fee is an account setting, and the amount depends on the channel (flat or a percentage). */
  mayChargeFee: true,
  feeBearerSetAtGateway: true,
  serviceFee: belibayarServiceFee,

  async createPayment(input) {
    const info = paymentMethodInfo[input.method];
    const method = gatewayMethod(input.method);
    const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");
    const body = {
      reference: input.reference,
      amount: input.amount,
      pay_method: info.channel ? { method, channel: info.channel } : { method },
      customer_name: input.customer.name,
      customer_email: input.customer.email,
      ...(method === "ewallet" ? { customer_phone: normalizeIdPhone(input.customer.phone) } : {}),
      expired_time: Math.floor(input.expiresAt.getTime() / 1000),
      // A webhook can only reach a public https site (not localhost); without it we rely on polling.
      ...(appUrl.startsWith("https://") ? { callback_url: `${appUrl}/api/payments/belibayar/webhook` } : {}),
      ...(method === "ewallet" && appUrl ? { redirect_url: `${appUrl}/checkout/pay/${input.orderNumber}` } : {}),
    };

    let tx: GatewayTx;
    try {
      tx = await request<GatewayTx>("POST", "/payment/charge", { body });
    } catch (error) {
      if (error instanceof PaymentGatewayError && error.code === "AMOUNT_BELOW_MINIMUM") {
        const min = minimumFrom(error.data);
        learnRefused(input.method, input.amount, min);
        // Keep the data on the error so the caller can name the minimum.
        throw new PaymentGatewayError(error.code, error.httpStatus, error.message, { min_amount: min ?? undefined });
      }
      if (!(error instanceof PaymentGatewayError) || !uncertain(error)) throw error;
      // 502/timeout: the payment may already exist. Look before charging again.
      let existing: GatewayTx | null = null;
      try {
        existing = await inquiry(input.reference);
      } catch (lookup) {
        if (!(lookup instanceof PaymentGatewayError) || lookup.code !== "NOT_FOUND") throw error;
      }
      // Not stored at the gateway: safe to send the same reference and body once more.
      tx = existing ?? (await request<GatewayTx>("POST", "/payment/charge", { body }));
    }
    if (toStatus(tx.status) === "expired") throw new PaymentGatewayError("NOT_PENDING", 409);
    learnAccepted(input.method, input.amount);
    return toCreated(tx, input);
  },

  async getStatus(payment) {
    if (!payment.reference || payment.status !== "awaiting") return payment.status;
    const cached = statusCache.get(payment.reference);
    if (cached && Date.now() - cached.at < STATUS_TTL_MS) return cached.status;
    try {
      const status = toStatus((await inquiry(payment.reference)).status);
      statusCache.set(payment.reference, { at: Date.now(), status });
      if (statusCache.size > 5_000) statusCache.clear();
      return status;
    } catch {
      return payment.status; // gateway unreachable: keep waiting, the next poll or webhook settles it
    }
  },

  async cancel(payment, reason = "Customer chose another payment method") {
    if (!payment.reference) return;
    statusCache.delete(payment.reference);
    await request("POST", "/payment/cancel", {
      body: { reference: payment.reference, reason },
    });
  },

  async simulatePaid(payment) {
    if (!this.canSimulate || !payment.reference) return payment.status;
    await request("POST", "/payment/simulate", { body: { reference: payment.reference, action: "success" } });
    statusCache.delete(payment.reference);
    return this.getStatus(payment);
  },

  amountFloors() {
    const now = Date.now();
    const out: Partial<Record<PaymentMethod, AmountFloor>> = {};
    for (const [method, floor] of floors) {
      if (now - floor.at < FLOOR_TTL_MS) out[method] = { min: floor.min, refusedAt: floor.refusedAt };
      else floors.delete(method);
    }
    return out;
  },

  channels() {
    const now = Date.now();
    if (!channelCache || now - channelCache.at >= channelCache.ttl) {
      channelCache = { at: now, ttl: CHANNELS_TTL_MS, value: loadChannels() };
    }
    return channelCache.value;
  },
};

/** X-Belibayar-Signature = hex HMAC-SHA256(raw body, webhook secret), compared in constant time. */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = Buffer.from(hmac(rawBody, secret), "utf8");
  const given = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
