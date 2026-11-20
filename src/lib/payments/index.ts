import "server-only";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { PAYMENT_GROUPS, paymentKindEnabled } from "@/lib/order-status";
import type { StoreSettings } from "@/lib/settings";
import { belibayarProvider } from "./belibayar";
import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

export type { AmountFloor, PaymentProvider, PaymentSnapshot, CreatedPayment } from "./types";
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
 *
 * With the order's `amount`, `belowMinimum` lists the methods the gateway is known to
 * refuse for it (see AmountFloor): each with its minimum, or null when the gateway
 * didn't say. They stay in `methods`, shown disabled with the minimum, so the
 * customer sees why. The mock provider knows no minimums.
 */
export async function getPaymentOptions(settings: StoreSettings, amount?: number) {
  const provider = getPaymentProvider();
  const list = await provider.channels();
  const methods: PaymentMethod[] = PAYMENT_GROUPS.filter((g) => paymentKindEnabled(settings, g.key))
    .flatMap((g) => [...g.methods])
    .filter((m) => !list || list.methods.has(m));
  const belowMinimum: Partial<Record<PaymentMethod, number | null>> = {};
  if (amount !== undefined) {
    const floors = provider.amountFloors?.() ?? {};
    for (const m of methods) {
      const floor = floors[m];
      if (floor && ((floor.min !== null && amount < floor.min) || amount <= floor.refusedAt)) belowMinimum[m] = floor.min;
    }
  }
  return { methods, logos: list?.logos ?? {}, belowMinimum };
}
