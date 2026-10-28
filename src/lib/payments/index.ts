import "server-only";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { PAYMENT_GROUPS, paymentKindEnabled } from "@/lib/order-status";
import type { StoreSettings } from "@/lib/settings";
import { belibayarProvider } from "./belibayar";
import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, PaymentSnapshot, CreatedPayment } from "./types";
export { PaymentGatewayError } from "./types";
export { PAYMENT_WINDOW_MS, formatVaNumber } from "./mock";

const providers: Record<string, PaymentProvider> = {
  mock: mockProvider,
  belibayar: belibayarProvider,
};

/**
 * The gateway chosen by PAYMENT_PROVIDER (default: mock), or the one that
 * issued a stored payment (`payments.provider`) so old payments keep being
 * checked where they were created.
 */
export function getPaymentProvider(id?: string | null): PaymentProvider {
  const key = id || process.env.PAYMENT_PROVIDER || "mock";
  const provider = providers[key];
  if (!provider) {
    throw new Error(`PAYMENT_PROVIDER="${key}" is not available. Supported: ${Object.keys(providers).join(", ")}.`);
  }
  return provider;
}

/**
 * "Simulate payment" is only allowed when both the provider that issued the
 * payment and the configured one can simulate (mock, or a gateway sandbox
 * key). A mock payment left over from a demo never becomes payable for free
 * once a live gateway is configured, and a live payment never does either.
 */
export function canSimulatePayment(paymentProvider: string | null): boolean {
  try {
    return getPaymentProvider(paymentProvider).canSimulate && getPaymentProvider().canSimulate;
  } catch {
    return false; // unknown provider id
  }
}

/**
 * Methods a customer can choose right now, in checkout order: switched on in
 * store settings and (with a real gateway) active in its channel list. Logos
 * come from the gateway; without them the UI draws the text marks.
 */
export async function getPaymentOptions(settings: StoreSettings) {
  const list = await getPaymentProvider().channels();
  const methods: PaymentMethod[] = PAYMENT_GROUPS.filter((g) => paymentKindEnabled(settings, g.key))
    .flatMap((g) => [...g.methods])
    .filter((m) => !list || list.methods.has(m));
  return { methods, logos: list?.logos ?? {} };
}
