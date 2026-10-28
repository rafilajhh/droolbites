// Local stand-in for the Belibayar Direct API (https://docs.belibayar.id/docs), for testing
// PAYMENT_PROVIDER=belibayar without the real gateway. Verifies X-Signature exactly like the docs:
//   POST                      hex HMAC-SHA256(raw body, secret)
//   GET  …/channels           hex HMAC-SHA256(full path incl. /sandbox, secret)
//   GET  …/payment/status/:r  hex HMAC-SHA256(":" + X-Timestamp, secret)   (legacy v1, ±5 min)
// and answers with doc-shaped JSON. The fee is charged to the customer (fee_bearer "customer")
// with the owner's dashboard rates, so the "Service fee" line shows up.
//
//   FAKE_BELIBAYAR_SECRET=… [FAKE_BELIBAYAR_WEBHOOK_SECRET=… FAKE_BELIBAYAR_WEBHOOK_URL=…] node scripts/fake-belibayar.mjs
//
// Test helpers (unsigned, local only):
//   POST /__control {"failNext": {"status": 403, "code": "CHANNEL_DISABLED", "store": false}, "disabled": ["MAYBANK"]}
//   GET  /__log   -> every request seen (method, path, signature ok?, code)
//   POST /__reset
import { createHmac, timingSafeEqual } from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.FAKE_BELIBAYAR_PORT ?? 4010);
const SECRET = process.env.FAKE_BELIBAYAR_SECRET ?? "";
const WEBHOOK_SECRET = process.env.FAKE_BELIBAYAR_WEBHOOK_SECRET ?? "";
const WEBHOOK_URL = process.env.FAKE_BELIBAYAR_WEBHOOK_URL ?? "";
if (!SECRET) {
  console.error("Set FAKE_BELIBAYAR_SECRET (the same value as BELIBAYAR_SECRET_KEY in the app).");
  process.exit(1);
}

const CDN = "https://cdn.belibayar.digital/channel-logos";
const CHANNELS = [
  ["BCA", "virtual_account", "VA BCA", "va_bca.png?v=1787200372"],
  ["BNI", "virtual_account", "VA BNI", "va_bni.png?v=1787200377"],
  ["MANDIRI", "virtual_account", "VA Mandiri", "va_mandiri.png?v=1783410861"],
  ["BRI", "virtual_account", "VA BRI", "va_bri.png?v=1783410869"],
  ["PERMATA", "virtual_account", "VA Permata", "va_permata.png?v=1783410878"],
  ["BSI", "virtual_account", "VA BSI", "va_bsi.webp?v=1787200387"],
  ["MUAMALAT", "virtual_account", "VA Muamalat", "va_muamalat.png?v=1787200392"],
  ["CIMB", "virtual_account", "VA CIMB", "va_cimb.png?v=1783412430"],
  ["SINARMAS", "virtual_account", "VA Sinarmas", "va_sinarmas.png?v=1787200397"],
  ["BNC", "virtual_account", "VA Neo Commerce", "va_bnc.webp?v=1783412456"],
  ["MAYBANK", "virtual_account", "VA Maybank", "va_maybank.png?v=1783412465"],
  ["OVO", "ewallet", "OVO", "ew_ovo.png?v=1783412511"],
  ["DANA", "ewallet", "DANA", "ew_dana.png?v=1783412516"],
  ["SPAY", "ewallet", "ShopeePay", "ew_shopeepay.png?v=1783412525"],
  ["QRIS", "qris", "QRIS", "qris.webp?v=1787202393"],
].map(([code, method, name, logo]) => ({ code, method, name, logo_url: `${CDN}/${logo}` }));

let txs = new Map(); // reference -> { raw, tx }
let log = [];
let control = { failNext: null, disabled: [] };

const hmac = (canonical, secret = SECRET) => createHmac("sha256", secret).update(canonical).digest("hex");
const safeEq = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const now = () => Math.floor(Date.now() / 1000);

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
const ok = (res, messages, data, status = 200) => send(res, status, { success: true, messages, data });
const fail = (res, status, code, messages = code) => send(res, status, { success: false, messages, data: { code } });

/** The owner's dashboard rates. */
function feeFor(method, channel, amount) {
  if (method === "virtual_account") return channel === "BCA" ? 4000 : channel === "PERMATA" ? 2500 : 3000;
  if (method === "qris") return Math.ceil(amount * (amount < 100000 ? 0.007 : 0.0071));
  const rate = { OVO: 0.035, DANA: 0.025, SPAY: 0.0275 }[channel] ?? 0.03;
  return Math.ceil(amount * rate);
}

function digits(seed, n) {
  const h = hmac(seed, "fake");
  return BigInt(`0x${h.slice(0, 15)}`).toString().padStart(n, "0").slice(-n);
}

async function postWebhook(tx) {
  if (!WEBHOOK_URL || !WEBHOOK_SECRET) return;
  const body = JSON.stringify({
    reference: tx.reference,
    transaction_id: tx.transaction_id,
    merchant_id: "BYR000000",
    method_api: "direct",
    payment_method: tx.payment_method,
    payment_channel: tx.payment_channel,
    amount: tx.amount,
    base_amount: tx.base_amount,
    merchant_fee: tx.merchant_fee,
    fee_bearer: tx.fee_bearer,
    net_credit: tx.net_credit,
    status: tx.status,
    ...(tx.status === "paid" ? { paid_at: now() } : {}),
  });
  try {
    const r = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-belibayar-signature": hmac(body, WEBHOOK_SECRET) },
      body,
    });
    log.push({ webhook: tx.reference, status: tx.status, http: r.status });
  } catch (e) {
    log.push({ webhook: tx.reference, error: String(e) });
  }
}

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const entry = { at: new Date().toISOString(), method: req.method, path };
  log.push(entry);

  // ---- test helpers
  if (path === "/__log") return send(res, 200, log);
  if (path === "/__reset") {
    txs = new Map();
    log = [];
    control = { failNext: null, disabled: [] };
    return send(res, 200, { ok: true });
  }
  if (path === "/__control") {
    Object.assign(control, JSON.parse(raw || "{}"));
    return send(res, 200, control);
  }
  if (path.startsWith("/fake-wallet/")) {
    // What payment_url opens: a tiny "wallet" page.
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(`<!doctype html><title>Fake wallet</title><h1>Fake e-wallet</h1><p>${path.split("/").pop()}</p>`);
  }

  const m = path.match(/^\/direct\/v1(\/sandbox)?(\/.*)$/);
  if (!m) return fail(res, 404, "NOT_FOUND");
  const sandbox = Boolean(m[1]);
  const route = m[2];

  // ---- auth
  const key = req.headers["x-api-key"] ?? "";
  if (!key || !String(key).startsWith(sandbox ? "byr_test_" : "byr_live_")) return (entry.code = "UNAUTHORIZED"), fail(res, 401, "UNAUTHORIZED");
  const sig = String(req.headers["x-signature"] ?? "");
  let canonical;
  if (req.method === "POST") canonical = raw;
  else if (route.startsWith("/payment/status/")) {
    const ts = String(req.headers["x-timestamp"] ?? "");
    if (!/^\d+$/.test(ts) || Math.abs(now() - Number(ts)) > 300) return (entry.code = "STALE_TIMESTAMP"), fail(res, 401, "STALE_TIMESTAMP");
    canonical = `:${ts}`;
  } else canonical = path;
  entry.signatureOk = safeEq(hmac(canonical), sig);
  if (!entry.signatureOk) return (entry.code = "INVALID_SIGNATURE"), fail(res, 401, "INVALID_SIGNATURE");

  let body = {};
  if (req.method === "POST") {
    try {
      body = JSON.parse(raw);
    } catch {
      return fail(res, 400, "VALIDATION_ERROR");
    }
  }
  entry.reference = body.reference;

  // ---- channels
  if (req.method === "GET" && route === "/channels") {
    return ok(res, "Daftar channel", { channels: CHANNELS.filter((c) => !control.disabled.includes(c.code)) });
  }

  // ---- charge
  if (req.method === "POST" && route === "/payment/charge") {
    const { reference, amount, pay_method: pm = {}, customer_name, customer_email, customer_phone, expired_time } = body;
    entry.channel = pm.channel ?? pm.method;
    if (!reference || !Number.isInteger(amount) || amount <= 0 || !customer_name || !customer_email || !pm.method) {
      return (entry.code = "VALIDATION_ERROR"), fail(res, 400, "VALIDATION_ERROR");
    }
    if (pm.method === "ewallet" && !customer_phone) return (entry.code = "VALIDATION_ERROR"), fail(res, 400, "VALIDATION_ERROR", "customer_phone: wajib utk method ewallet");
    const existing = txs.get(reference);
    if (existing) {
      if (existing.raw !== raw) return (entry.code = "IDEMPOTENCY_CONFLICT"), fail(res, 409, "IDEMPOTENCY_CONFLICT");
      return ok(res, "Transaksi berhasil dibuat", existing.tx, 200);
    }
    const channel = pm.method === "qris" ? "QRIS" : pm.channel;
    if (control.disabled.includes(channel)) return (entry.code = "CHANNEL_DISABLED"), fail(res, 403, "CHANNEL_DISABLED");
    if (amount < 10000) return (entry.code = "AMOUNT_BELOW_MINIMUM"), fail(res, 422, "AMOUNT_BELOW_MINIMUM");

    const fee = feeFor(pm.method, channel, amount);
    const ttl = pm.method === "ewallet" ? 30 * 60 : 24 * 60 * 60; // e-wallet requests are short-lived
    const tx = {
      reference,
      transaction_id: `${pm.method === "qris" ? "QR" : pm.method === "ewallet" ? "EW" : "VA"}${digits(reference, 16)}`,
      order_id: reference,
      payment_method: pm.method,
      payment_channel: channel,
      amount: amount + fee,
      currency: "IDR",
      customer_name,
      customer_email,
      ...(customer_phone ? { customer_phone } : {}),
      ...(pm.method === "virtual_account" ? { va_number: `88${digits(reference, 12)}` } : {}),
      ...(pm.method === "qris"
        ? { qr_content: `00020101021226610014COM.FAKEBELIBAYAR0118${reference}5204481653033605802ID6304${digits(reference, 4)}`, qr_url: `http://localhost:${PORT}/qr/${reference}.png` }
        : {}),
      ...(pm.method === "ewallet" && channel !== "OVO" ? { payment_url: `http://localhost:${PORT}/fake-wallet/${reference}` } : {}),
      status: "pending",
      base_amount: amount,
      merchant_fee: fee,
      net_credit: amount,
      fee_bearer: "customer",
      expired_at: Math.min(Number(expired_time) || now() + 86400, now() + ttl),
    };

    const f = control.failNext;
    if (f) {
      control.failNext = null;
      entry.code = f.code;
      if (f.store) txs.set(reference, { raw, tx }); // 502: created at the provider, answer lost
      return fail(res, f.status, f.code);
    }
    txs.set(reference, { raw, tx });
    entry.code = "CREATED";
    return ok(res, "Transaksi berhasil dibuat", tx, 201);
  }

  // ---- status
  const st = route.match(/^\/payment\/status\/(.+)$/);
  if (req.method === "GET" && st) {
    const t = txs.get(decodeURIComponent(st[1]));
    if (!t) return (entry.code = "NOT_FOUND"), fail(res, 404, "NOT_FOUND");
    entry.reference = t.tx.reference;
    entry.code = t.tx.status;
    return ok(res, "Status transaksi", t.tx);
  }

  // ---- cancel
  if (req.method === "POST" && route === "/payment/cancel") {
    const t = txs.get(body.reference);
    if (!t) return (entry.code = "NOT_FOUND"), fail(res, 404, "NOT_FOUND");
    if (t.tx.status !== "pending") return (entry.code = "NOT_CANCELLABLE"), fail(res, 409, "NOT_CANCELLABLE");
    t.tx.status = "cancelled";
    entry.code = "CANCELLED";
    return ok(res, "Transaksi dibatalkan", { transaction: t.tx });
  }

  // ---- sandbox simulate
  if (req.method === "POST" && route === "/payment/simulate") {
    if (!sandbox) return fail(res, 404, "NOT_FOUND");
    const t = txs.get(body.reference);
    if (!t) return (entry.code = "NOT_FOUND"), fail(res, 404, "NOT_FOUND");
    if (body.action === "success") t.tx.status = "paid";
    else if (body.action === "expire") t.tx.status = "expired";
    else return fail(res, 400, "VALIDATION_ERROR");
    entry.code = t.tx.status;
    postWebhook(t.tx);
    return ok(res, "Simulasi berhasil", t.tx);
  }

  return fail(res, 405, "METHOD_NOT_ALLOWED");
});

server.listen(PORT, () => console.log(`fake Belibayar on http://localhost:${PORT}${WEBHOOK_URL ? ` (webhooks → ${WEBHOOK_URL})` : ""}`));
