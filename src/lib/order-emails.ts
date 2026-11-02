import "server-only";
import { variantLabel } from "@/content/products";
import type { Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/config";
import { emailMessages } from "@/i18n/messages/emails";
import { formatDateTime, formatDistance, formatRupiah } from "./format";
import { button, fallbackLink, highlight, infoBox, itemsTable, paragraph, renderEmail, type EmailItem } from "./email-template";
import { appUrl, sendMail } from "./mail";
import { cancelReasonText, paymentMethodInfo } from "./order-status";
import { formatAddress, orderAccessToken, orderDeadline, payable, type FullOrder } from "./orders";
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
      ? [t.common.deliveryTo, formatAddress({ address: order.shippingAddress, city: order.shippingCity, postal: order.shippingPostal })]
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
  // Pickup: where and when to come. Delivery and completed: the address it went to.
  const place: Row = status === "ready_for_pickup" ? [where[0], `${where[1]} · ${hours}`] : where;

  const text = [
    t.common.hi(order.customerName),
    "",
    s.title,
    s.body,
    "",
    itemsText,
    "",
    ...rowsText([place]),
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
      paragraph(`${t.common.hi(order.customerName)} ${s.body}`),
      infoBox(...place),
      button(t.common.viewOrder, link),
      itemsTable(items, [[t.common.total, formatRupiah(payable(order, order.payments.find((x) => x.status === "paid")).amount)]]),
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
  const reason = why === "store" ? cancelReasonText(order.cancelReason, c.reasons) : null;
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
      paragraph(`${t.common.hi(order.customerName)} ${lines[0]}`),
      ...lines.slice(1).map((line) => paragraph(line)),
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
  const link = appUrl(`/admin/orders/${order.orderNumber}`);
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
  const rows: Row[] = [
    [s.customer, order.customerName],
    [s.phone, order.phone],
    [s.method, delivery ? s.delivery(order.deliveryDistanceM !== null ? formatDistance(order.deliveryDistanceM, lang) : null) : s.pickup],
    ...(delivery
      ? ([[s.address, formatAddress({ address: order.shippingAddress, city: order.shippingCity, postal: order.shippingPostal })]] as Row[])
      : []),
    ...(delivery && order.shippingLat !== null && order.shippingLng !== null
      ? ([[s.pin, `https://www.google.com/maps/search/?api=1&query=${order.shippingLat},${order.shippingLng}`]] as Row[])
      : []),
  ];

  const text = [
    s.intro(order.customerName, via),
    "",
    ...items.map((i) => `- ${i.qty} × ${i.name} (${i.detail})  ${i.price}`),
    "",
    ...rowsText([...rows, [s.totalPaid, total]]),
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
      ...rows.map(([label, value]) => infoBox(label, value)),
      fallbackLink(t.common.fallback, link),
    ].join("\n"),
    footer: { storeName: settings.storeName, address: settings.address, phone: settings.phone, email: settings.email },
    reason: s.reason,
  });

  await sendMail({ to, subject: s.subject(order.orderNumber, total), text, html });
}
