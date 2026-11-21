import "server-only";
import { variantLabel } from "@/content/products";
import type { Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/config";
import { emailMessages } from "@/i18n/messages/emails";
import { formatDateTime, formatDistance, formatRupiah } from "./format";
import { renderEmail, type Block, type EmailItem, type Fact, type Mail, type Row } from "./email-template";
import { appUrl, sendMail } from "./mail";
import { cancelReasonText, paymentMethodInfo } from "./order-status";
import { getOrderByNumber, orderAccessToken, orderAddress, orderDeadline, otherRecipient, payable, type FullOrder } from "./orders";
import { DEMO_PROVIDER } from "./payments/demo";
import { getStoreSettings, type StoreSettings } from "./settings";

/**
 * Every email about an order, in the language it was placed in: how to pay (placed, and again when
 * the customer changes method), paid, the store's status updates (baking, ready for pickup, out for
 * delivery, completed), cancelled (expired, by the customer, by the store: declined or cancelled)
 * and refund sent; plus the store's own alert for a new paid order.
 *
 * Each email says one thing: the subject and intro say what happened, then only what the customer
 * needs for that moment, one button to the order. The `…Email` functions build the message from
 * the order alone (scripts/email-preview.ts renders them); the `send…` functions add the store
 * settings and the order link's token, and send it.
 */

export type EmailSettings = Pick<StoreSettings, "storeName" | "address" | "phone" | "email" | "opensAt" | "closesAt">;
/** What the composers need besides the order: the store details and the order link's token. */
export type OrderEmailContext = { settings: EmailSettings; token: string };

async function contextFor(order: FullOrder): Promise<OrderEmailContext> {
  const [settings, token] = await Promise.all([getStoreSettings(), orderAccessToken(order.orderNumber)]);
  return { settings, token };
}

function base(order: FullOrder, { settings, token }: OrderEmailContext) {
  const lang: Locale = order.locale === "id" ? "id" : "en";
  const t = pickMessages(emailMessages, lang);
  return {
    lang,
    t,
    name: order.customerName,
    baseUrl: appUrl("/"),
    link: appUrl(`/orders/${order.orderNumber}?t=${token}`),
    /** The printable receipt (paid orders only). */
    receipt: appUrl(`/orders/${order.orderNumber}/invoice?t=${token}`),
    footer: { storeName: settings.storeName, address: settings.address, phone: settings.phone, email: settings.email },
    eyebrow: t.common.orderEyebrow(order.orderNumber),
    reason: t.common.orderReason,
  };
}

function emailItems(order: FullOrder, lang: Locale): EmailItem[] {
  return order.items.map((item) => ({
    qty: item.qty,
    name: item.variant.product.name,
    detail: variantLabel(item.variant.name, item.variant.product.category.slug, lang),
    price: formatRupiah(item.unitPrice * item.qty),
  }));
}

/** Subtotal and the delivery (or pickup) row, as the order summary on the site shows them. */
function baseTotals(order: FullOrder, t: ReturnType<typeof base>["t"], lang: Locale): Row[] {
  return [
    [t.common.subtotal, formatRupiah(order.subtotal)],
    [
      order.fulfilmentMethod === "delivery"
        ? order.deliveryDistanceM !== null
          ? `${t.common.delivery} (${formatDistance(order.deliveryDistanceM, lang)})`
          : t.common.delivery
        : t.common.pickup,
      order.deliveryFee ? formatRupiah(order.deliveryFee) : t.common.free,
    ],
  ];
}

/** A wa.me chat link for an Indonesian mobile number as it was typed (08…, +62 8…, 62 8…). */
function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`;
}

const paidPayment = (order: FullOrder) => order.payments.find((x) => x.status === "paid");
/** A demo payment moved no money, so nothing goes back. */
const realPaid = (order: FullOrder) => order.payments.filter((x) => x.status === "paid" && x.provider !== DEMO_PROVIDER);

/* ------------------------------------------------------------------ */
/* How to pay                                                           */
/* ------------------------------------------------------------------ */

/**
 * `changed`: the customer switched to another method on the pay page, so the email says so in its
 * subject and opening; it only ever holds the new (latest) payment's details.
 */
export function orderPlacedEmail(order: FullOrder, ctx: OrderEmailContext, { changed = false }: { changed?: boolean } = {}): Mail {
  const b = base(order, ctx);
  const { t, lang } = b;
  const p = t.placed;
  const payment = order.payments[0];
  const info = payment ? paymentMethodInfo[payment.method] : null;
  const pay = payable(order, payment);
  const amount = formatRupiah(payment ? pay.amount : order.total);
  const when = formatDateTime(payment?.expiresAt ?? orderDeadline(order), lang);
  const deadline: Row = [p.payBefore, p.at(when)];
  const feeNote = pay.serviceFee > 0 ? p.feeNote(formatRupiah(pay.serviceFee)) : undefined;

  // The mint box holds the one thing to copy (the VA number or payment code), else the amount.
  let key: Block;
  if (payment?.vaNumber && info) {
    key = {
      kind: "key",
      label: info.kind === "retail" ? p.codeLabel(info.name) : p.vaLabel(info.name),
      value: payment.vaNumber,
      rows: [[p.amountToPay, amount], deadline],
      note: feeNote,
    };
  } else {
    key = { kind: "key", label: p.amountToPay, value: amount, rows: [...(info ? ([[p.method, info.name]] as Row[]) : []), deadline], note: feeNote };
  }
  const steps = !info
    ? null
    : info.kind === "va"
      ? p.steps.va(amount)
      : info.kind === "retail"
        ? p.steps.retail(info.name, amount)
        : info.kind === "qris"
          ? p.steps.qris(amount)
          : p.steps.ewallet(info.name, amount);

  const { html, text } = renderEmail({
    lang,
    baseUrl: b.baseUrl,
    preheader: info ? p.preheader(amount, info.name, when) : p.preheaderChoose(when),
    eyebrow: b.eyebrow,
    title: changed ? p.changed.title : p.title,
    intro: changed && info ? p.changed.intro(b.name, info.name) : info ? p.intro(b.name) : p.introChoose(b.name),
    blocks: [key, ...(steps ? [{ kind: "steps", steps } as Block] : [])],
    action: { label: info ? p.button : p.buttonChoose, href: b.link },
    footer: b.footer,
    reason: b.reason,
  });
  return { subject: (changed ? p.changed.subject : p.subject)(order.orderNumber), text, html };
}

export async function sendOrderPlacedEmail(order: FullOrder, opts: { changed?: boolean } = {}) {
  await sendMail({ to: order.email, ...orderPlacedEmail(order, await contextFor(order), opts) });
}

/* ------------------------------------------------------------------ */
/* Paid                                                                 */
/* ------------------------------------------------------------------ */

export function orderPaidEmail(order: FullOrder, ctx: OrderEmailContext): Mail {
  const b = base(order, ctx);
  const { t, lang } = b;
  const p = t.paid;
  const payment = paidPayment(order);
  const pay = payable(order, payment);
  const totalPaid = formatRupiah(pay.amount);
  // The receipt's breakdown: subtotal, delivery, the gateway's fee when the customer paid it, total paid.
  const totals: Row[] = [
    ...baseTotals(order, t, lang),
    ...(pay.serviceFee > 0 ? ([[t.common.serviceFee, formatRupiah(pay.serviceFee)]] as Row[]) : []),
    [t.common.totalPaid, totalPaid],
  ];
  const method = payment ? paymentMethodInfo[payment.method].name : null;

  const { html, text } = renderEmail({
    lang,
    baseUrl: b.baseUrl,
    preheader: p.preheader(totalPaid),
    eyebrow: b.eyebrow,
    title: p.title,
    intro: p.intro(b.name, method),
    blocks: [{ kind: "p", text: p.next }],
    action: { label: t.common.viewOrder, href: b.link },
    after: [
      { kind: "summary", items: emailItems(order, lang), totals },
      { kind: "link", label: p.receipt, href: b.receipt },
    ],
    footer: b.footer,
    reason: b.reason,
  });
  return { subject: p.subject(order.orderNumber), text, html };
}

export async function sendOrderPaidEmail(order: FullOrder) {
  await sendMail({ to: order.email, ...orderPaidEmail(order, await contextFor(order)) });
}

/* ------------------------------------------------------------------ */
/* The store moved the order along                                      */
/* ------------------------------------------------------------------ */

/** Statuses without a message of their own send nothing. */
export type NotifiedStatus = "baking" | "ready_for_pickup" | "out_for_delivery" | "completed";
export const NOTIFIED_STATUSES: readonly NotifiedStatus[] = ["baking", "ready_for_pickup", "out_for_delivery", "completed"];

export function orderStatusEmail(order: FullOrder, status: NotifiedStatus, ctx: OrderEmailContext): Mail {
  const b = base(order, ctx);
  const { t } = b;
  const delivery = order.fulfilmentMethod === "delivery";
  const s = t.status;
  let title: string, preheader: string, intro: string;
  let blocks: Block[] = [];
  switch (status) {
    case "baking":
      ({ title, preheader } = s.baking);
      intro = delivery ? s.baking.introDelivery(b.name) : s.baking.introPickup(b.name);
      break;
    case "ready_for_pickup":
      ({ title, preheader } = s.ready_for_pickup);
      intro = s.ready_for_pickup.intro(b.name);
      // What to show at the counter, then where and when to come.
      blocks = [
        { kind: "key", label: t.common.orderNumber, value: order.orderNumber },
        { kind: "facts", facts: [{ label: t.common.pickUpAt, value: `${ctx.settings.address}\n${t.common.hours(ctx.settings.opensAt, ctx.settings.closesAt)}` }] },
      ];
      break;
    case "out_for_delivery": {
      ({ title, preheader } = s.out_for_delivery);
      intro = s.out_for_delivery.intro(b.name);
      const recipient = otherRecipient(order);
      const facts: Fact[] = [{ label: t.common.deliverTo, value: orderAddress(order) }];
      if (recipient) facts.push({ label: t.common.recipient, value: `${recipient.name} · ${recipient.phone}` });
      blocks = [{ kind: "facts", facts }];
      break;
    }
    case "completed":
      ({ title, preheader } = s.completed);
      intro = delivery ? s.completed.introDelivery(b.name) : s.completed.introPickup(b.name);
      break;
  }

  const { html, text } = renderEmail({
    lang: b.lang,
    baseUrl: b.baseUrl,
    preheader,
    eyebrow: b.eyebrow,
    title,
    intro,
    blocks,
    action: { label: t.common.viewOrder, href: b.link },
    footer: b.footer,
    reason: b.reason,
  });
  return { subject: s[status].subject(order.orderNumber), text, html };
}

export async function sendOrderStatusEmail(order: FullOrder, status: NotifiedStatus) {
  await sendMail({ to: order.email, ...orderStatusEmail(order, status, await contextFor(order)) });
}

/* ------------------------------------------------------------------ */
/* Cancelled                                                            */
/* ------------------------------------------------------------------ */

/**
 * Closed at the payment deadline ("expired"), cancelled by the customer on the pay page ("customer")
 * or by the store ("store"): before payment, a paid order it declined (never accepted), or a paid
 * order it had to cancel after accepting it. The refund line only when real money came in, in the
 * order page's words.
 */
export function orderCancelledEmail(order: FullOrder, why: "expired" | "store" | "customer", ctx: OrderEmailContext): Mail {
  const b = base(order, ctx);
  const { t } = b;
  const c = t.cancelled;
  const reason = why === "store" ? cancelReasonText(order.cancelReason, c.reasons) : null;
  const paid = why === "store" && Boolean(paidPayment(order));
  const refund = paid && realPaid(order).length > 0;
  const intro =
    why === "expired"
      ? c.expired(b.name)
      : why === "customer"
        ? c.customer(b.name)
        : !paid
          ? c.store(b.name, reason)
          : order.acceptedAt
            ? c.storePaid(b.name, reason)
            : c.declined(b.name, reason);
  const title = why === "expired" ? c.expiredTitle : c.title;

  const { html, text } = renderEmail({
    lang: b.lang,
    baseUrl: b.baseUrl,
    preheader: refund ? c.refundPromise : title,
    eyebrow: b.eyebrow,
    title,
    intro,
    blocks: refund ? [{ kind: "p", text: c.refundPromise }] : [],
    action: { label: t.common.viewOrder, href: b.link },
    footer: b.footer,
    reason: b.reason,
  });
  return { subject: (why === "expired" ? c.expiredSubject : c.subject)(order.orderNumber), text, html };
}

export async function sendOrderCancelledEmail(order: FullOrder, why: "expired" | "store" | "customer") {
  await sendMail({ to: order.email, ...orderCancelledEmail(order, why, await contextFor(order)) });
}

/* ------------------------------------------------------------------ */
/* Refund sent                                                          */
/* ------------------------------------------------------------------ */

/**
 * The store marked a cancelled, paid order as refunded (markRefunded): how much went back, when, and
 * that it can take a few days to show. The store's own refund note stays with the store.
 */
export function orderRefundedEmail(order: FullOrder, ctx: OrderEmailContext): Mail {
  const b = base(order, ctx);
  const { t, lang } = b;
  const r = t.refunded;
  // Every real paid attempt went back.
  const amount = formatRupiah(realPaid(order).reduce((sum, x) => sum + payable(order, x).amount, 0));
  const when = order.refundedAt ? formatDateTime(order.refundedAt, lang) : null;

  const { html, text } = renderEmail({
    lang,
    baseUrl: b.baseUrl,
    preheader: r.preheader(amount),
    eyebrow: b.eyebrow,
    title: r.title,
    intro: r.intro(b.name),
    blocks: [
      { kind: "key", label: r.amount, value: amount, rows: when ? [[r.on, t.placed.at(when)]] : [] },
      { kind: "p", text: r.timing, muted: true },
    ],
    action: { label: t.common.viewOrder, href: b.link },
    footer: b.footer,
    reason: b.reason,
  });
  return { subject: r.subject(order.orderNumber), text, html };
}

export async function sendOrderRefundedEmail(order: FullOrder) {
  await sendMail({ to: order.email, ...orderRefundedEmail(order, await contextFor(order)) });
}

/* ------------------------------------------------------------------ */
/* The order's link, asked for on /orders/find                          */
/* ------------------------------------------------------------------ */

/**
 * Someone entered this order's number and email on /orders/find: the order's link goes to that email
 * (the page itself only says "if they match, we've emailed you a link"), so only the inbox owner opens it.
 */
export function orderLinkEmail(order: FullOrder, ctx: OrderEmailContext): Mail {
  const b = base(order, ctx);
  const { t } = b;
  const l = t.orderLink;

  const { html, text } = renderEmail({
    lang: b.lang,
    baseUrl: b.baseUrl,
    preheader: l.preheader,
    eyebrow: b.eyebrow,
    title: l.title,
    intro: l.intro(b.name),
    action: { label: t.common.viewOrder, href: b.link },
    after: [{ kind: "p", text: l.ignore, muted: true }],
    footer: b.footer,
    reason: l.reason,
  });
  return { subject: l.subject(order.orderNumber), text, html };
}

export async function sendOrderLinkEmail(orderNumber: string) {
  const order = await getOrderByNumber(orderNumber);
  if (order) await sendMail({ to: order.email, ...orderLinkEmail(order, await contextFor(order)) });
}

/* ------------------------------------------------------------------ */
/* The store's alert                                                    */
/* ------------------------------------------------------------------ */

/**
 * To the store when an order is paid: what to bake, who and where, and a button to accept or
 * decline it. In Indonesian, the shop's own language. The phone numbers open WhatsApp and the pin
 * opens the map, so the shop can act straight from the email.
 */
export function storeNewOrderEmail(order: FullOrder, settings: EmailSettings): Mail {
  const lang: Locale = "id";
  const t = pickMessages(emailMessages, lang);
  const s = t.storeNew;
  // Through the admin sign-in, which goes straight on to the order when the session is still valid
  // and comes back to it after signing in otherwise (the panel's own guard drops the path).
  const link = appUrl(`/admin/sign-in?next=${encodeURIComponent(`/admin/orders/${order.orderNumber}`)}`);
  const payment = paidPayment(order);
  const total = formatRupiah(payable(order, payment).amount);
  const method = payment ? paymentMethodInfo[payment.method].name : null;
  const delivery = order.fulfilmentMethod === "delivery";

  const facts: Fact[] = [
    { label: s.customer, value: order.customerName },
    { label: s.phone, value: order.phone, href: whatsappUrl(order.phone) },
    { label: s.method, value: delivery ? s.delivery(order.deliveryDistanceM !== null ? formatDistance(order.deliveryDistanceM, lang) : null) : s.pickup },
  ];
  if (delivery) {
    facts.push({ label: t.common.deliverTo, value: orderAddress(order) });
    // Checkout copies the contact into an empty recipient, so the row only shows for someone else.
    const recipient = otherRecipient(order);
    if (recipient) facts.push({ label: t.common.recipient, value: `${recipient.name} · ${recipient.phone}`, href: whatsappUrl(recipient.phone) });
    if (order.deliveryNote) facts.push({ label: s.note, value: order.deliveryNote });
    if (order.shippingLat !== null && order.shippingLng !== null) {
      const map = `https://www.google.com/maps/search/?api=1&query=${order.shippingLat},${order.shippingLng}`;
      facts.push({ label: s.pin, value: s.pinLink, href: map, text: map });
    }
  }

  const { html, text } = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: s.preheader(order.customerName, total),
    eyebrow: t.common.orderEyebrow(order.orderNumber),
    title: s.title,
    intro: s.intro(order.customerName, total, method),
    blocks: [
      { kind: "summary", items: emailItems(order, lang), totals: [[t.common.totalPaid, total]] },
      { kind: "facts", facts },
    ],
    action: { label: s.button, href: link },
    footer: { storeName: settings.storeName, address: settings.address, phone: settings.phone, email: settings.email },
    reason: s.reason,
  });
  return { subject: s.subject(order.orderNumber, total), text, html };
}

/** Goes to the notification email in store settings (the store email when that's empty). */
export async function sendStoreNewOrderEmail(order: FullOrder) {
  const settings = await getStoreSettings();
  const to = settings.notifyEmail?.trim() || settings.email;
  await sendMail({ to, ...storeNewOrderEmail(order, settings) });
}
