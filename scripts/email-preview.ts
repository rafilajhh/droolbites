/**
 * Renders every email the store sends, in English and Indonesian, from the real composers in
 * src/lib/order-emails.ts and src/lib/emails.ts, with sample orders. No database, no SMTP.
 *
 *   npx tsx scripts/email-preview.ts [outDir]      (default: email-preview/)
 *
 * Writes <name>-<lang>.html and <name>-<lang>.txt (subject on the first line, then the plain-text
 * part). Links point at APP_URL (default http://localhost:3000), so the logo loads from a running
 * dev server.
 */
import Module from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

// The app's server modules start with `import "server-only"`, which Next resolves when it builds;
// here it is the package's empty server entry. Loaded below with import(), after this hook.
const loader = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = loader._resolveFilename;
loader._resolveFilename = function (request, ...rest) {
  return resolveFilename.call(this, request === "server-only" ? "next/dist/compiled/server-only/empty.js" : request, ...rest);
};

process.env.APP_URL ??= "http://localhost:3000";
// The modules behind the composers set up a database client when they load; the composers never
// query it (the store settings and the order token are passed in), so any URL does.
process.env.DATABASE_URL ??= "mysql://preview:preview@localhost:3306/preview";

const now = new Date("2026-11-21T09:30:00Z");
const hour = 3600_000;

const settings = {
  storeName: "Droolbites",
  address: "Jl. Palem Sememi Raya F16, Sememi, Benowo, Surabaya",
  phone: "+62 896 7562 4486",
  email: "hello@droolbites.biz.id",
  opensAt: "07:00",
  closesAt: "21:00",
};
const footer = { storeName: settings.storeName, address: settings.address, phone: settings.phone, email: settings.email };
const ctx = { settings, token: "sample-token" };

const item = (qty: number, name: string, variant: string, slug: string, unitPrice: number) => ({
  qty,
  unitPrice,
  variant: { name: variant, product: { name, category: { slug } } },
});

type Payment = Record<string, unknown>;
const payment = (over: Payment = {}): Payment => ({
  id: BigInt(30),
  method: "bca_va",
  amount: 105000,
  vaNumber: "8277 0812 3456 7890",
  status: "awaiting",
  expiresAt: new Date(now.getTime() + 24 * hour),
  paidAt: null,
  provider: "belibayar",
  reference: "DB-0012-1",
  transactionId: "TRX-98123",
  qrContent: null,
  payUrl: null,
  chargedAmount: 109000,
  fee: 4000,
  feeBearer: "customer",
  createdAt: now,
  ...over,
});
const paid = (over: Payment = {}) => payment({ status: "paid", paidAt: now, ...over });

const pickup = {
  fulfilmentMethod: "pickup",
  shippingAddress: null,
  shippingCity: null,
  shippingPostal: null,
  shippingDistrict: null,
  shippingLat: null,
  shippingLng: null,
  deliveryDistanceM: null,
  recipientName: null,
  recipientPhone: null,
  deliveryFee: 0,
  total: 90000,
};

function order(over: Record<string, unknown>, payments: Payment[]) {
  return {
    id: BigInt(12),
    orderNumber: "DB-0012",
    userId: null,
    customerName: "Rafi Mahardika",
    email: "rafi@example.com",
    phone: "081234567890",
    fulfilmentMethod: "delivery",
    shippingAddress: "Jl. Raya Darmo Permai III No. 27, Blok C-12 Lantai 2",
    shippingCity: "Surabaya",
    shippingPostal: "60226",
    shippingDistrict: "Dukuhpakis",
    recipientName: "Rafi Mahardika",
    recipientPhone: "081234567890",
    deliveryNote: null,
    shippingLat: -7.2756,
    shippingLng: 112.6826,
    deliveryDistanceM: 6300,
    cancelReason: null,
    subtotal: 90000,
    deliveryFee: 15000,
    total: 105000,
    paymentStatus: "awaiting",
    fulfilmentStatus: "pending",
    locale: "en",
    stockDeducted: false,
    stockShort: false,
    acceptedAt: null,
    handedOffAt: null,
    completedAt: null,
    cancelledAt: null,
    refundedAt: null,
    refundNote: null,
    createdAt: new Date(now.getTime() - 5 * 60_000),
    updatedAt: null,
    items: [
      item(2, "Chocolate Chunk", "1 piece", "soft-cookies", 5000),
      item(1, "Fudgy Brownies", "20 × 20 cm", "brownies", 60000),
      item(1, "Matcha Tiramisu", "1 portion", "tiramisu", 20000),
    ],
    payments,
    ...over,
  };
}

async function main() {
  const oe = await import("../src/lib/order-emails");
  const em = await import("../src/lib/emails");
  type Order = Parameters<typeof oe.orderPlacedEmail>[0];
  type Mail = ReturnType<typeof oe.orderPlacedEmail>;

  const out = process.argv[2] ?? "email-preview";
  mkdirSync(out, { recursive: true });
  const write = (name: string, mail: Mail) => {
    writeFileSync(`${out}/${name}.html`, mail.html);
    writeFileSync(`${out}/${name}.txt`, `Subject: ${mail.subject}\n\n${mail.text}\n`);
    console.log(`${name.padEnd(34)} ${mail.subject}`);
  };

  for (const lang of ["en", "id"] as const) {
    const o = (over: Record<string, unknown>, payments: Payment[]) => order({ locale: lang, ...over }, payments) as unknown as Order;
    const isPaid = { paymentStatus: "paid" };
    const emails: [string, Mail][] = [
      ["01-placed-va", oe.orderPlacedEmail(o({}, [payment()]), ctx)],
      ["02-placed-qris-pickup", oe.orderPlacedEmail(o(pickup, [payment({ method: "qris", vaNumber: null, amount: 90000, chargedAmount: 90630, fee: 630 })]), ctx)],
      ["03-placed-ewallet", oe.orderPlacedEmail(o({}, [payment({ method: "ovo", vaNumber: null, chargedAmount: 105000, fee: 0, payUrl: "https://pay.example/ovo" })]), ctx)],
      ["04-placed-retail", oe.orderPlacedEmail(o({}, [payment({ method: "alfamart", vaNumber: "ALF7788123456", chargedAmount: 107500, fee: 2500 })]), ctx)],
      ["05-placed-no-payment", oe.orderPlacedEmail(o({}, []), ctx)],
      ["06-changed-method", oe.orderPlacedEmail(o({}, [payment({ method: "mandiri_va", vaNumber: "8908 1234 5678 9012" }), payment({ status: "expired" })]), ctx, { changed: true })],
      ["07-paid-delivery", oe.orderPaidEmail(o(isPaid, [paid()]), ctx)],
      ["08-paid-pickup", oe.orderPaidEmail(o({ ...isPaid, ...pickup }, [paid({ method: "qris", vaNumber: null, amount: 90000, chargedAmount: 90630, fee: 630 })]), ctx)],
      ["09-baking", oe.orderStatusEmail(o({ ...isPaid, fulfilmentStatus: "baking" }, [paid()]), "baking", ctx)],
      ["10-ready-for-pickup", oe.orderStatusEmail(o({ ...isPaid, ...pickup, fulfilmentStatus: "ready_for_pickup" }, [paid()]), "ready_for_pickup", ctx)],
      ["11-out-for-delivery", oe.orderStatusEmail(o({ ...isPaid, fulfilmentStatus: "out_for_delivery", recipientName: "Alya Putri", recipientPhone: "082233445566" }, [paid()]), "out_for_delivery", ctx)],
      ["12-completed", oe.orderStatusEmail(o({ ...isPaid, fulfilmentStatus: "completed" }, [paid()]), "completed", ctx)],
      ["13-cancelled-expired", oe.orderCancelledEmail(o({ paymentStatus: "expired", fulfilmentStatus: "cancelled" }, [payment({ status: "expired" })]), "expired", ctx)],
      ["14-cancelled-customer", oe.orderCancelledEmail(o({ fulfilmentStatus: "cancelled", cancelReason: "Cancelled by the customer" }, [payment({ status: "expired" })]), "customer", ctx)],
      ["15-cancelled-store-unpaid", oe.orderCancelledEmail(o({ fulfilmentStatus: "cancelled", cancelReason: "closed" }, [payment({ status: "expired" })]), "store", ctx)],
      ["16-declined-paid", oe.orderCancelledEmail(o({ ...isPaid, fulfilmentStatus: "cancelled", cancelReason: "sold_out" }, [paid()]), "store", ctx)],
      ["17-cancelled-after-accept", oe.orderCancelledEmail(o({ ...isPaid, fulfilmentStatus: "cancelled", cancelReason: "Oven broke down.", acceptedAt: now }, [paid()]), "store", ctx)],
      ["18-declined-demo", oe.orderCancelledEmail(o({ ...isPaid, fulfilmentStatus: "cancelled", cancelReason: "fully_booked" }, [paid({ provider: "demo", chargedAmount: null, fee: null })]), "store", ctx)],
      ["19-refunded", oe.orderRefundedEmail(o({ ...isPaid, fulfilmentStatus: "cancelled", cancelReason: "sold_out", refundedAt: now }, [paid()]), ctx)],
      ["19b-order-link", oe.orderLinkEmail(o(isPaid, [paid()]), ctx)],
      ["21-account-welcome", em.accountWelcomeEmail(lang, { name: "Alya Rahmawati" }, footer)],
      ["21-account-welcome-no-name", em.accountWelcomeEmail(lang, { name: null }, footer)],
      ["22-newsletter-welcome", em.newsletterWelcomeEmail(lang, `${process.env.APP_URL}/newsletter/unsubscribe?t=sample-token`, footer)],
      ["23-password-reset", em.passwordResetEmail(lang, { name: "Rafi Mahardika", link: `${process.env.APP_URL}/reset-password/sample-token` }, footer)],
      ["24-claim-orders-1", em.claimOrdersEmail(lang, { count: 1, link: `${process.env.APP_URL}/account/claim?t=sample-token` }, footer)],
      ["24-claim-orders-3", em.claimOrdersEmail(lang, { count: 3, link: `${process.env.APP_URL}/account/claim?t=sample-token` }, footer)],
    ];
    // The store's alert is always Indonesian.
    if (lang === "id") {
      const alert = o({ ...isPaid, recipientName: "Alya Putri", recipientPhone: "082233445566", deliveryNote: "Pagar hijau, sebelah warung Bu Sri. Titip satpam kalau tidak ada orang." }, [paid()]);
      emails.push(["20-store-new-order", oe.storeNewOrderEmail(alert, settings)]);
    }
    for (const [name, mail] of emails) write(`${name}-${lang}`, mail);
  }
  console.log(`wrote ${out}/*.html and *.txt`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
