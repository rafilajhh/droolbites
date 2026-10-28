import type { StatusTone } from "@/components/ui/badges";
import type { Locale } from "@/i18n/config";
import type { Prisma } from "@/generated/prisma/client";
import type { FulfilmentStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";

/** Labels and badge tones for order states. Shared by checkout, account and admin. */
type Entry = { en: string; id: string; tone: StatusTone };

export const paymentStatusInfo: Record<PaymentStatus, Entry> = {
  awaiting: { en: "Awaiting payment", id: "Menunggu pembayaran", tone: "mustard" },
  paid: { en: "Paid", id: "Lunas", tone: "success" },
  expired: { en: "Payment failed", id: "Pembayaran gagal", tone: "crimson" },
};

export const fulfilmentStatusInfo: Record<FulfilmentStatus, Entry> = {
  pending: { en: "New order", id: "Pesanan baru", tone: "muted" },
  baking: { en: "Baking", id: "Dipanggang", tone: "lavender" },
  ready_for_pickup: { en: "Ready for pickup", id: "Siap diambil", tone: "teal" },
  out_for_delivery: { en: "Out for delivery", id: "Sedang diantar", tone: "cobalt" },
  completed: { en: "Completed", id: "Selesai", tone: "success" },
  cancelled: { en: "Cancelled", id: "Dibatalkan", tone: "crimson" },
};

export type PaymentKind = "va" | "retail" | "ewallet" | "qris";

type MethodInfo = {
  name: string;
  kind: PaymentKind;
  /** Belibayar pay_method.channel (null for QRIS). */
  channel: string | null;
  /** Text mark in the brand's colors (logos come from the gateway when it is connected). */
  mark: string;
  markClass: string;
};

/** Brand colors sampled from each brand's own logo. Small type for long names so they fit the 56px mark. */
export const paymentMethodInfo: Record<PaymentMethod, MethodInfo> = {
  bca_va: { name: "BCA Virtual Account", kind: "va", channel: "BCA", mark: "BCA", markClass: "bg-[#005EAA] text-white" },
  bni_va: { name: "BNI Virtual Account", kind: "va", channel: "BNI", mark: "BNI", markClass: "bg-[#006885] text-[#F15A22]" },
  mandiri_va: { name: "Mandiri Virtual Account", kind: "va", channel: "MANDIRI", mark: "mandiri", markClass: "bg-[#003A70] text-[#FFB700]" },
  bri_va: { name: "BRI Virtual Account", kind: "va", channel: "BRI", mark: "BRI", markClass: "bg-[#00529C] text-white" },
  permata_va: { name: "Permata Virtual Account", kind: "va", channel: "PERMATA", mark: "Permata", markClass: "bg-white text-[#E2231A] text-[11px] inset-ring-1 inset-ring-border-subtle" },
  bsi_va: { name: "BSI Virtual Account", kind: "va", channel: "BSI", mark: "BSI", markClass: "bg-[#00A39D] text-white" },
  muamalat_va: { name: "Muamalat Virtual Account", kind: "va", channel: "MUAMALAT", mark: "Muamalat", markClass: "bg-[#5E2A84] text-[#A6CE39] text-[10px]" },
  cimb_va: { name: "CIMB Niaga Virtual Account", kind: "va", channel: "CIMB", mark: "CIMB", markClass: "bg-[#EC1C24] text-white" },
  sinarmas_va: { name: "Sinarmas Virtual Account", kind: "va", channel: "SINARMAS", mark: "sinarmas", markClass: "bg-[#E31E24] text-white text-[10px]" },
  bnc_va: { name: "Neo Commerce Virtual Account", kind: "va", channel: "BNC", mark: "neo", markClass: "bg-[#FDD100] text-ink" },
  maybank_va: { name: "Maybank Virtual Account", kind: "va", channel: "MAYBANK", mark: "Maybank", markClass: "bg-[#FFC72C] text-black text-[10px]" },
  indomaret: { name: "Indomaret", kind: "retail", channel: "INDOMARET", mark: "Indomaret", markClass: "bg-[#0B4DA2] text-[#FFD400] text-[9px]" },
  alfamart: { name: "Alfamart", kind: "retail", channel: "ALFAMART", mark: "Alfamart", markClass: "bg-[#E30613] text-white text-[10px]" },
  ovo: { name: "OVO", kind: "ewallet", channel: "OVO", mark: "OVO", markClass: "bg-[#4C2A86] text-white" },
  dana: { name: "DANA", kind: "ewallet", channel: "DANA", mark: "DANA", markClass: "bg-[#118EEA] text-white" },
  shopeepay: { name: "ShopeePay", kind: "ewallet", channel: "SPAY", mark: "SPay", markClass: "bg-[#EE4D2D] text-white" },
  qris: { name: "QRIS", kind: "qris", channel: null, mark: "QRIS", markClass: "bg-white text-ink inset-ring-1 inset-ring-border-subtle" },
};

/** Payment groups in checkout order (Checkout · Payment and the change-method form). */
export const PAYMENT_GROUPS = [
  { key: "va", methods: ["bca_va", "bni_va", "mandiri_va", "bri_va", "permata_va", "bsi_va", "muamalat_va", "cimb_va", "sinarmas_va", "bnc_va", "maybank_va"] },
  { key: "retail", methods: ["indomaret", "alfamart"] },
  { key: "ewallet", methods: ["ovo", "dana", "shopeepay"] },
  { key: "qris", methods: ["qris"] },
] as const satisfies readonly { key: PaymentKind; methods: readonly PaymentMethod[] }[];

/** Store settings switches per group. */
export function paymentKindEnabled(
  settings: { vaEnabled: boolean; retailEnabled: boolean; ewalletEnabled: boolean; qrisEnabled: boolean },
  kind: PaymentKind,
) {
  return kind === "va"
    ? settings.vaEnabled
    : kind === "retail"
      ? settings.retailEnabled
      : kind === "ewallet"
        ? settings.ewalletEnabled
        : settings.qrisEnabled;
}

export function statusLabel(entry: Entry, locale: Locale) {
  return entry[locale];
}

/** Fulfilment statuses that still need the kitchen/counter: a paid order in one of these needs action. */
export const ACTIVE_FULFILMENT = ["pending", "baking", "ready_for_pickup", "out_for_delivery"] as const satisfies readonly FulfilmentStatus[];

/** Paid orders still in progress. The overview banner and /admin/orders?needs=action share this filter. */
export const needsActionWhere = {
  paymentStatus: "paid",
  fulfilmentStatus: { in: [...ACTIVE_FULFILMENT] },
} satisfies Prisma.OrderWhereInput;

const unpaidFulfilmentInfo: Record<Exclude<PaymentStatus, "paid">, Entry> = {
  awaiting: { en: "Unpaid", id: "Belum dibayar", tone: "muted" },
  expired: { en: "Not paid", id: "Tidak dibayar", tone: "muted" },
};

/**
 * The fulfilment badge for an order. An unpaid order hasn't reached the kitchen,
 * so instead of "New order" it shows that it is waiting for (or never got) payment.
 */
export function fulfilmentBadgeInfo(order: { paymentStatus: PaymentStatus; fulfilmentStatus: FulfilmentStatus }): Entry {
  if (order.paymentStatus !== "paid" && order.fulfilmentStatus === "pending") return unpaidFulfilmentInfo[order.paymentStatus];
  return fulfilmentStatusInfo[order.fulfilmentStatus];
}
