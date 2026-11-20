import "server-only";
import { variantLabel } from "@/content/products";
import type { Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/config";
import { emailMessages } from "@/i18n/messages/emails";
import { formatDateTime, formatDistance, formatRupiah } from "./format";
import { button, fallbackLink, highlight, infoBox, itemsTable, paragraph, renderEmail, type EmailItem } from "./email-template";
import { appUrl, sendMail } from "./mail";
import { cancelReasonText, paymentMethodInfo } from "./order-status";
import { orderAccessToken, orderAddress, orderDeadline, otherRecipient, payable, type FullOrder } from "./orders";
import { getStoreSettings } from "./settings";

/**
 * Every email about an order, in the language it was placed in: placed (with how to pay), paid,
 * the store's status updates (ready for pickup, out for delivery, completed) and cancelled.
 * Each sends plain text and the HTML version.
 */

type Row = [string, string];

async function context(order: FullOrder) {
  const lang: Locale = order.locale === "id" ? "id" : "en";
  const t = pickMessages(emailMessages, lang);
  const settings = await getStoreSettings();
  const link = appUrl(`/orders/${order.orderNumber}?t=${await orderAccessToken(order.orderNumber)}`);
  const items: EmailItem[] = order.items.map((item) => ({
    qty: item.qty,
    name: item.variant.product.name,
    detail: variantLabel(item.variant.name, item.variant.product.category.slug, lang),
    price: formatRupiah(item.unitPrice * item.qty),
  }));
  const where: Row =
    order.fulfilmentMethod === "delivery"
      ? [t.common.deliveryTo, orderAddress(order)]
      : [t.common.pickupAt, settings.address];
  return {
    lang,
    t,
    settings,
    link,
    items,
    where,
    footer: { storeName: settings.storeName, address: settings.address, phone: settings.phone, email: settings.email },
    itemsText: items.map((i) => `- ${i.qty} × ${i.name} (${i.detail})  ${i.price}`).join("\n"),
    signature: `${settings.storeName}\n${settings.address}\nWhatsApp ${settings.phone} · ${settings.email}`,
  };
}

const rowsText = (rows: Row[]) => rows.map(([k, v]) => `${k}: ${v}`);

/** A wa.me chat link for an Indonesian mobile number as it was typed (08…, +62 8…, 62 8…). */
function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`;
}

export async function sendOrderPlacedEmail(order: FullOrder) {
  const { lang, t, link, items, where, footer, itemsText, signature } = await context(order);
  const p = t.placed;
  const payment = order.payments[0];
  const pay = payable(order, payment);
  const method = payment ? paymentMethodInfo[payment.method].name : "";
  const payLine = payment
    ? payment.expiresAt
      ? p.payBefore(method, formatDateTime(payment.expiresAt, lang))
      : p.payWith(method)
    : p.chooseBefore(formatDateTime(orderDeadline(order), lang));
  const codeLabel = payment?.vaNumber
    ? paymentMethodInfo[payment.method].kind === "retail"
      ? t.common.paymentCode
      : t.common.vaNumber
    : null;
  const totals: Row[] = [
    [t.common.subtotal, formatRupiah(order.subtotal)],
    [
      order.fulfilmentMethod === "delivery"
        ? order.deliveryDistanceM !== null
          ? `${t.common.delivery} (${formatDistance(order.deliveryDistanceM, lang)})`
          : t.common.delivery
        : t.common.pickup,
      order.deliveryFee ? formatRupiah(order.deliveryFee) : t.common.free,
    ],
    [t.common.total, formatRupiah(order.total)],
  ];
  const feeRow: Row[] = pay.serviceFee > 0 ? [[t.common.serviceFee, formatRupiah(pay.serviceFee)]] : [];
  const amountRow: Row = [t.common.amountToPay, formatRupiah(pay.amount)];

  const text = [
    t.common.hi(order.customerName),
    "",
    p.textIntro(order.orderNumber),
    "",
    itemsText,
    "",
    ...rowsText(totals),
    "",
    payLine,
    ...(payment ? rowsText([...(payment.vaNumber && codeLabel ? ([[codeLabel, payment.vaNumber]] as Row[]) : []), ...feeRow, amountRow]) : []),
    "",
    ...rowsText([where]),
    "",
    `${p.textLink}: ${link}`,
    "",
    signature,
  ].join("\n");

  // The one thing to copy goes in the mint box: the VA number or payment code, else the amount.
  const payBox = !payment
    ? ""
    : payment.vaNumber && codeLabel
      ? highlight(codeLabel, payment.vaNumber, [...feeRow, amountRow])
      : highlight(amountRow[0], amountRow[1], feeRow);

  const html = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: p.preheader(order.orderNumber, formatRupiah(payment ? pay.amount : order.total)),
    eyebrow: t.common.orderEyebrow(order.orderNumber),
    title: p.title,
    body: [
      paragraph(p.intro(order.customerName)),
      payBox,
      paragraph(payLine, { muted: true }),
      button(payment ? p.buttonPay : p.buttonChoose, link),
      itemsTable(items, totals),
      infoBox(...where),
      fallbackLink(t.common.fallback, link),
    ].join("\n"),
    footer,
    reason: t.common.orderReason,
  });

  await sendMail({ to: order.email, subject: p.subject(order.orderNumber), text, html });
}

export async function sendOrderPaidEmail(order: FullOrder) {
  const { lang, t, link, items, where, footer, itemsText, signature } = await context(order);
  const p = t.paid;
  const payment = order.payments.find((x) => x.status === "paid");
  const via = payment ? ` (${paymentMethodInfo[payment.method].name})` : "";
  const next = order.fulfilmentMethod === "delivery" ? p.nextDelivery : p.nextPickup;
  const totalPaid = formatRupiah(payable(order, payment).amount);

  const text = [
    t.common.hi(order.customerName),
    "",
    p.textIntro(order.orderNumber, via),
    next,
    "",
    itemsText,
    "",
    ...rowsText([[t.common.totalPaid, totalPaid], where]),
    "",
    `${p.textLink}: ${link}`,
    "",
    signature,
  ].join("\n");

  const html = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: p.preheader(order.orderNumber),
    eyebrow: `${t.common.orderEyebrow(order.orderNumber)} · ${p.tag}`,
    title: p.title,
    body: [
      paragraph(p.intro(order.customerName, order.orderNumber, via)),
      paragraph(next, { muted: true }),
      button(p.button, link),
      itemsTable(items, [[t.common.totalPaid, totalPaid]]),
      infoBox(...where),
      fallbackLink(t.common.fallback, link),
    ].join("\n"),
    footer,
    reason: t.common.orderReason,
  });

  await sendMail({ to: order.email, subject: p.subject(order.orderNumber), text, html });
}

/** The store moved the order along. Statuses without a message of their own send nothing. */
export type NotifiedStatus = "baking" | "ready_for_pickup" | "out_for_delivery" | "completed";
export const NOTIFIED_STATUSES: readonly NotifiedStatus[] = ["baking", "ready_for_pickup", "out_for_delivery", "completed"];

export async function sendOrderStatusEmail(order: FullOrder, status: NotifiedStatus) {
  const { lang, t, settings, link, items, where, footer, itemsText, signature } = await context(order);
  const s = t.status[status];
  const hours = t.status.hours(settings.opensAt, settings.closesAt);
  const ready = status === "ready_for_pickup";
  // Pickup: where and when to come. Delivery and completed: the address it went to.
  const place: Row = ready ? [where[0], `${where[1]} · ${hours}`] : where;
  // The pickup email asks the customer to show the order number, so it says it where it can be seen.
  const number: Row = [t.common.orderNumber, order.orderNumber];
  const total = formatRupiah(payable(order, order.payments.find((x) => x.status === "paid")).amount);

  const text = [
    t.common.hi(order.customerName),
    "",
    s.title,
    s.body,
    "",
    itemsText,
    `${t.common.total}: ${total}`,
    "",
    ...rowsText(ready ? [number, place] : [place]),
    "",
    `${t.common.viewOrderText}: ${link}`,
    "",
    signature,
  ].join("\n");

  const html = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: s.body,
    eyebrow: `${t.common.orderEyebrow(order.orderNumber)} · ${s.tag}`,
    title: s.title,
    body: [
      // The greeting is its own line, as in the text part: the bodies are full sentences.
      paragraph(t.common.hi(order.customerName)),
      paragraph(s.body),
      ...(ready ? [infoBox(...number)] : []),
      infoBox(...place),
      button(t.common.viewOrder, link),
      itemsTable(items, [[t.common.total, total]]),
      fallbackLink(t.common.fallback, link),
    ].join("\n"),
    footer,
    reason: t.common.orderReason,
  });

  await sendMail({ to: order.email, subject: s.subject(order.orderNumber), text, html });
}

/** Closed at the payment deadline ("expired") or cancelled by the store ("store"). */
export async function sendOrderCancelledEmail(order: FullOrder, why: "expired" | "store") {
  const { lang, t, link, items, footer, itemsText, signature } = await context(order);
  const c = t.cancelled;
  const n = order.orderNumber;
  const paid = why === "store" && order.payments.some((x) => x.status === "paid");
  // The message adds its own full stop, so one typed at the end of a custom reason is dropped.
  const reason = why === "store" ? cancelReasonText(order.cancelReason, c.reasons)?.replace(/[\s.!?]+$/, "") || null : null;
  const lines =
    why === "expired" ? [c.expiredBody(n)] : [c.storeBody(n), ...(reason ? [c.reason(reason)] : []), ...(paid ? [c.storePaid] : [])];
  const menu = appUrl("/menu");

  const text = [
    t.common.hi(order.customerName),
    "",
    ...lines,
    "",
    itemsText,
    "",
    `${c.again} ${menu}`,
    `${t.common.viewOrderText}: ${link}`,
    "",
    signature,
  ].join("\n");

  const html = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: lines[0],
    eyebrow: `${t.common.orderEyebrow(n)} · ${c.tag}`,
    title: why === "expired" ? c.expiredTitle : c.storeTitle,
    body: [
      paragraph(t.common.hi(order.customerName)),
      ...lines.map((line) => paragraph(line)),
      itemsTable(items, [[t.common.total, formatRupiah(order.total)]]),
      paragraph(c.again, { muted: true }),
      button(c.button, menu),
      fallbackLink(t.common.fallback, link),
    ].join("\n"),
    footer,
    reason: t.common.orderReason,
  });

  await sendMail({ to: order.email, subject: why === "expired" ? c.expiredSubject(n) : c.storeSubject(n), text, html });
}

/**
 * To the store when an order is paid: who, what, where, and a button to accept or decline it.
 * Goes to the notification email in store settings (the store email when that's empty), in
 * Indonesian, the shop's own language.
 */
export async function sendStoreNewOrderEmail(order: FullOrder) {
  const lang: Locale = "id";
  const t = pickMessages(emailMessages, lang);
  const s = t.storeNew;
  const settings = await getStoreSettings();
  const to = settings.notifyEmail?.trim() || settings.email;
  // Through the admin sign-in, which goes straight on to the order when the session is still valid
  // and comes back to it after signing in otherwise (the panel's own guard drops the path).
  const link = appUrl(`/admin/sign-in?next=${encodeURIComponent(`/admin/orders/${order.orderNumber}`)}`);
  const payment = order.payments.find((x) => x.status === "paid");
  const via = payment ? ` (${paymentMethodInfo[payment.method].name})` : "";
  const total = formatRupiah(payable(order, payment).amount);
  const delivery = order.fulfilmentMethod === "delivery";
  const items: EmailItem[] = order.items.map((item) => ({
    qty: item.qty,
    name: item.variant.product.name,
    detail: variantLabel(item.variant.name, item.variant.product.category.slug, lang),
    price: formatRupiah(item.unitPrice * item.qty),
  }));
  // { label, value, href, text }: the phone numbers open WhatsApp and the pin opens the map, so the shop
  // can act straight from the email; `text` is what the plain-text part shows instead of the value.
  type Fact = { label: string; value: string; href?: string; text?: string };
  const rows: Fact[] = [
    { label: s.customer, value: order.customerName },
    { label: s.phone, value: order.phone, href: whatsappUrl(order.phone) },
    {
      label: s.method,
      value: delivery ? s.delivery(order.deliveryDistanceM !== null ? formatDistance(order.deliveryDistanceM, lang) : null) : s.pickup,
    },
  ];
  if (delivery) {
    rows.push({ label: s.address, value: orderAddress(order) });
    // Checkout copies the contact into an empty recipient, so the row only shows for someone else.
    const recipient = otherRecipient(order);
    if (recipient) rows.push({ label: s.recipient, value: `${recipient.name} · ${recipient.phone}`, href: whatsappUrl(recipient.phone) });
    if (order.deliveryNote) rows.push({ label: s.note, value: order.deliveryNote });
    if (order.shippingLat !== null && order.shippingLng !== null) {
      const map = `https://www.google.com/maps/search/?api=1&query=${order.shippingLat},${order.shippingLng}`;
      rows.push({ label: s.pin, value: s.pinLink, href: map, text: map });
    }
  }

  const text = [
    s.intro(order.customerName, via),
    "",
    ...items.map((i) => `- ${i.qty} × ${i.name} (${i.detail})  ${i.price}`),
    "",
    ...rowsText([...rows.map((r): Row => [r.label, r.text ?? r.value]), [s.totalPaid, total]]),
    "",
    `${s.textLink}: ${link}`,
  ].join("\n");

  const html = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: s.preheader(order.customerName, total),
    eyebrow: s.eyebrow(order.orderNumber),
    title: s.title,
    body: [
      paragraph(s.intro(order.customerName, via)),
      button(s.button, link),
      itemsTable(items, [[s.totalPaid, total]]),
      ...rows.map((r) => infoBox(r.label, r.value, r.href)),
      fallbackLink(t.common.fallback, link),
    ].join("\n"),
    footer: { storeName: settings.storeName, address: settings.address, phone: settings.phone, email: settings.email },
    reason: s.reason,
  });

  await sendMail({ to, subject: s.subject(order.orderNumber, total), text, html });
}
