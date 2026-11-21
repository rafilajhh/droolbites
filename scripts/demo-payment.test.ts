// Demo payments (DEMO_PAYMENTS) against the real database:  npx tsx scripts/demo-payment.test.ts
// Runs the server-side core (src/lib/demo-payment.ts) with its own product and orders, and a local
// fake Belibayar (scripts/fake-belibayar.mjs on port 4011, sandbox key) for the gateway cases: the
// flag, eligibility, the paid path (payment rows, stock once), repeats and races, the gateway cancel
// and a payment that turns out to be real. Needs the db and Mailpit (docker compose up -d db mailpit);
// deletes everything it created. Its only caller is checkout's PAY INSTANTLY (placeOrder), covered by scripts/e2e.mjs US-009.
import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import Module from "node:module";
import path from "node:path";

// The app's server modules start with `import "server-only"`, which Next resolves when it builds;
// here it is the package's empty server entry. Loaded below with import(), after this hook.
const loader = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = loader._resolveFilename;
loader._resolveFilename = function (request, ...rest) {
  return resolveFilename.call(this, request === "server-only" ? "next/dist/compiled/server-only/empty.js" : request, ...rest);
};

const FAKE_PORT = 4011;
const FAKE = `http://localhost:${FAKE_PORT}`;
// Never the laptop's live key: every gateway call in this test goes to the fake, in sandbox mode.
process.env.BELIBAYAR_BASE_URL = FAKE;
process.env.BELIBAYAR_API_KEY = "byr_test_demo_payment_test";
process.env.BELIBAYAR_SECRET_KEY = "demo-payment-test-secret";
process.env.PAYMENT_PROVIDER = "mock";
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const RUN = Date.now().toString(36);

let failed = 0;
async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const evidence = await fn();
    console.log(`PASS  ${name}${evidence ? `  -- ${evidence}` : ""}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}  -- ${e instanceof Error ? e.message : String(e)}`);
  }
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function startFake(): Promise<ChildProcess> {
  const child = spawn(process.execPath, [path.join(__dirname, "fake-belibayar.mjs")], {
    env: { ...process.env, FAKE_BELIBAYAR_SECRET: process.env.BELIBAYAR_SECRET_KEY, FAKE_BELIBAYAR_PORT: String(FAKE_PORT) },
    stdio: ["ignore", "pipe", "inherit"],
  });
  await new Promise<void>((resolve, reject) => {
    child.stdout!.on("data", (d: Buffer) => d.toString().includes("fake Belibayar on") && resolve());
    child.on("exit", (code) => reject(new Error(`fake Belibayar exited (${code}); is port ${FAKE_PORT} free?`)));
  });
  return child;
}
type FakeLog = { method: string; path: string; reference?: string; code?: string; reason?: string }[];
const fakeLog = async () => (await (await fetch(`${FAKE}/__log`)).json()) as FakeLog;

async function main() {
  const { db } = await import("../src/lib/db");
  const { canMarkPaidDemo, markOrderPaidDemo, DEMO_CANCEL_REASON } = await import("../src/lib/demo-payment");
  const { chargeOrder, getOrderByNumber, orderDeadline, syncPaymentStatus } = await import("../src/lib/orders");
  const { getPaymentOptions, getPaymentProvider, shownPayment } = await import("../src/lib/payments");
  const { belibayarServiceFee } = await import("../src/lib/payments/belibayar");
  const { getStoreSettings } = await import("../src/lib/settings");

  const fake = await startFake();
  let productId: bigint | null = null;
  const orderIds: bigint[] = [];
  const orderNumbers: string[] = [];

  /** An unpaid pickup order for `qty` of the tracked size (Rp25.000 each, above the fake's minimum). */
  async function makeOrder(qty: number, over: { createdAt?: Date; fulfilmentStatus?: "cancelled"; paymentStatus?: "expired"; total?: number } = {}) {
    const n = orderIds.length + 1;
    const orderNumber = `DP${RUN.slice(-6)}${n}`.slice(0, 12);
    const order = await db.order.create({
      data: {
        orderNumber,
        customerName: "Demo Test",
        email: `demo-${RUN}@example.test`,
        phone: "081234567890",
        fulfilmentMethod: "pickup",
        subtotal: 25000 * qty,
        total: 25000 * qty,
        ...over,
        items: { create: [{ variantId: tracked, qty, unitPrice: 25000 }] },
      },
    });
    orderIds.push(order.id);
    orderNumbers.push(orderNumber);
    return order;
  }
  const mockPayment = (orderId: bigint, orderNumber: string, status: "awaiting" | "expired" = "awaiting") =>
    db.payment.create({
      data: {
        orderId,
        method: "bca_va",
        amount: 50000,
        status,
        provider: "mock",
        reference: `${orderNumber}-1`,
        vaNumber: "8077 0000 0000 0001",
        chargedAmount: 50000,
        fee: 0,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  const rows = (orderId: bigint) => db.payment.findMany({ where: { orderId }, orderBy: { id: "asc" } });
  const orderRow = (id: bigint) =>
    db.order.findUniqueOrThrow({ where: { id }, select: { paymentStatus: true, fulfilmentStatus: true, stockDeducted: true } });
  const stock = async () => (await db.productVariant.findUniqueOrThrow({ where: { id: tracked }, select: { stock: true } })).stock;
  /** A charge at the (fake) gateway, through the app's own chargeOrder. */
  async function gatewayCharge(order: Awaited<ReturnType<typeof makeOrder>>) {
    process.env.PAYMENT_PROVIDER = "belibayar";
    try {
      const result = await chargeOrder(order, "qris");
      assert(result.ok, `charge failed: ${JSON.stringify(result)}`);
    } finally {
      process.env.PAYMENT_PROVIDER = "mock";
    }
    return (await rows(order.id))[0];
  }

  const category = await db.category.findFirstOrThrow({ orderBy: { id: "asc" }, select: { id: true } });
  const product = await db.product.create({
    data: {
      categoryId: category.id,
      name: `Demo payment test ${RUN}`,
      slug: `demo-payment-test-${RUN}`,
      isAvailable: false,
      variants: { create: [{ name: "Tracked", price: 25000, stock: 20 }] },
    },
    include: { variants: true },
  });
  productId = product.id;
  const tracked = product.variants[0].id;

  try {
    await check("demo provider: stored status (a leftover expires at its deadline), never charges, can't simulate, not selectable by PAYMENT_PROVIDER", async () => {
      const demo = getPaymentProvider("demo");
      const snap = { orderNumber: "X", reference: "X-demo-1", method: "qris" as const, amount: 1, status: "awaiting" as const, expiresAt: new Date(Date.now() + 60_000) };
      assert(demo.id === "demo" && !demo.canSimulate && !demo.mayChargeFee, "flags");
      assert((await demo.getStatus(snap)) === "awaiting", "awaiting before its deadline stays awaiting");
      assert((await demo.getStatus({ ...snap, expiresAt: new Date(0) })) === "expired", "awaiting past its deadline expires");
      assert((await demo.getStatus({ ...snap, status: "paid", expiresAt: new Date(0) })) === "paid", "paid stays paid");
      assert((await demo.channels()) === null, "no channels");
      await demo.cancel(snap);
      let threw = false;
      await demo.createPayment({} as never).catch(() => (threw = true));
      assert(threw, "createPayment did not throw");
      process.env.PAYMENT_PROVIDER = "demo";
      let refused = false;
      try {
        getPaymentProvider();
      } catch {
        refused = true;
      }
      process.env.PAYMENT_PROVIDER = "mock";
      assert(refused, 'PAYMENT_PROVIDER="demo" was accepted');
      return "getStatus = stored, createPayment throws, PAYMENT_PROVIDER=demo refused";
    });

    await check("shownPayment: a real paid payment before a demo-paid one, else the latest", async () => {
      const rows = [
        { id: 3, status: "paid", provider: "demo" },
        { id: 2, status: "paid", provider: "belibayar" },
        { id: 1, status: "expired", provider: "belibayar" },
      ];
      assert(shownPayment(rows)?.id === 2, "real paid first");
      assert(shownPayment(rows.filter((r) => r.id !== 2))?.id === 3, "then the demo-paid one");
      assert(shownPayment([{ id: 5, status: "awaiting", provider: "mock" }, ...rows.slice(2)])?.id === 5, "else the latest");
      return "real > demo > latest";
    });

    await check("Belibayar fees: percentages grossed up like the gateway (fee = ceil(total × r / (1 − r))), VAs flat; the fake charges the same", async () => {
      const cases: [Parameters<typeof belibayarServiceFee>[0], number, number][] = [
        ["qris", 20000, 141],
        ["qris", 5000, 36],
        ["qris", 100000, 716],
        ["dana", 20000, 513],
        ["bca_va", 20000, 4000],
        ["mandiri_va", 5000, 3000],
      ];
      for (const [method, total, want] of cases) {
        const got = belibayarServiceFee(method, total);
        assert(got === want, `${method} on ${total}: ${got}, want ${want}`);
      }
      const order = await makeOrder(1, { total: 20000 });
      const p = await gatewayCharge(order);
      assert(p.fee === 141 && p.chargedAmount === 20141, `fake charged fee ${p.fee}, amount ${p.chargedAmount}`);
      return `QRIS 20000 -> 141, 5000 -> 36, 100000 -> 716; DANA 20000 -> 513; VA flat; fake QRIS 20000 charged ${p.chargedAmount}`;
    });

    await check("Belibayar VA minimum: below Rp10.000 every VA is listed below the minimum (QRIS is not), from Rp10.000 none", async () => {
      const settings = await getStoreSettings();
      process.env.PAYMENT_PROVIDER = "belibayar";
      try {
        const small = await getPaymentOptions(settings, 5000);
        const vas = small.methods.filter((m) => m.endsWith("_va"));
        assert(vas.length > 0, `no VA in ${small.methods.join(",")}`);
        assert(vas.every((m) => small.belowMinimum[m] === 10000), `belowMinimum ${JSON.stringify(small.belowMinimum)}`);
        assert(!("qris" in small.belowMinimum), "QRIS marked below minimum");
        const enough = await getPaymentOptions(settings, 10000);
        assert(Object.keys(enough.belowMinimum).length === 0, `at 10000: ${JSON.stringify(enough.belowMinimum)}`);
        return `5000: ${vas.length} VAs min 10000, QRIS open; 10000: none`;
      } finally {
        process.env.PAYMENT_PROVIDER = "mock";
      }
    });

    await check("canMarkPaidDemo: only unpaid, pending and before the payment deadline", async () => {
      const now = new Date();
      const base = { paymentStatus: "awaiting" as const, fulfilmentStatus: "pending" as const, createdAt: now };
      assert(canMarkPaidDemo(base), "open unpaid order");
      assert(!canMarkPaidDemo({ ...base, paymentStatus: "paid" }), "paid");
      assert(!canMarkPaidDemo({ ...base, paymentStatus: "expired", fulfilmentStatus: "cancelled" }), "expired");
      assert(!canMarkPaidDemo({ ...base, fulfilmentStatus: "cancelled" }), "cancelled by the store");
      assert(!canMarkPaidDemo({ ...base, createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000) }), "past the deadline");
      return "awaiting+pending only, deadline respected";
    });

    // ---------------------------------------------------------------- flag off
    const a = await makeOrder(2);
    const aLive = await mockPayment(a.id, a.orderNumber);
    await check("flag off (DEMO_PAYMENTS unset / not \"on\"): refused, order and payments unchanged", async () => {
      const before = await stock();
      for (const value of [undefined, "", "true", "ON"]) {
        if (value === undefined) delete process.env.DEMO_PAYMENTS;
        else process.env.DEMO_PAYMENTS = value;
        const r = await markOrderPaidDemo(a.orderNumber);
        assert(r === "off", `DEMO_PAYMENTS=${JSON.stringify(value)} -> ${r}`);
      }
      const o = await orderRow(a.id);
      const p = await rows(a.id);
      assert(o.paymentStatus === "awaiting" && !o.stockDeducted, JSON.stringify(o));
      assert(p.length === 1 && p[0].status === "awaiting", `${p.length} rows, ${p[0]?.status}`);
      assert((await stock()) === before, "stock moved");
      return 'unset, "", "true", "ON" -> off';
    });

    process.env.DEMO_PAYMENTS = "on";

    // ---------------------------------------------------------------- the paid path
    await check("flag on: paid via demo; live payment expired, demo row paid (method kept, total, no fee); stock deducted", async () => {
      const before = await stock();
      const r = await markOrderPaidDemo(a.orderNumber);
      assert(r === "paid", `result ${r}`);
      const o = await orderRow(a.id);
      assert(o.paymentStatus === "paid" && o.fulfilmentStatus === "pending" && o.stockDeducted, JSON.stringify(o));
      const p = await rows(a.id);
      assert(p.length === 2, `${p.length} payment rows`);
      const [old, demo] = p;
      assert(old.id === aLive.id && old.status === "expired", `old row ${old.status}`);
      assert(demo.provider === "demo" && demo.status === "paid" && demo.paidAt, `demo row ${demo.provider}/${demo.status}`);
      assert(demo.method === "bca_va", `method ${demo.method} (last attempt was bca_va)`);
      assert(demo.amount === a.total && demo.chargedAmount === a.total && demo.fee === 0, `amount ${demo.amount}/${demo.chargedAmount}/${demo.fee}`);
      assert(demo.reference === `${a.orderNumber}-demo-2`, `reference ${demo.reference}`);
      const after = await stock();
      assert(after === (before ?? 0) - 2, `stock ${before} -> ${after}`);
      return `${a.orderNumber}: ${old.reference} expired, ${demo.reference} paid ${demo.amount}; stock ${before} -> ${after}`;
    });

    await check("second call: refused as invalid, nothing changes (one demo row, stock taken once)", async () => {
      const before = await stock();
      const r = await markOrderPaidDemo(a.orderNumber);
      assert(r === "invalid", `result ${r}`);
      const p = await rows(a.id);
      assert(p.length === 2 && p.filter((x) => x.provider === "demo").length === 1, `${p.length} rows`);
      assert((await stock()) === before, "stock moved again");
      return "invalid; 2 rows; stock unchanged";
    });

    await check("the paid email reaches the customer (same markOrderPaid path)", async () => {
      for (let i = 0; i < 20; i++) {
        const j = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()) as { messages: { Subject: string }[] };
        const hit = j.messages.find((m) => m.Subject === `Order ${a.orderNumber} is paid`);
        if (hit) return hit.Subject;
        await sleep(500);
      }
      throw new Error("no 'Order … is paid' email in Mailpit");
    });

    await check("status poll on a demo-paid order changes nothing", async () => {
      const full = (await getOrderByNumber(a.orderNumber))!;
      const synced = await syncPaymentStatus(full);
      assert(synced.paymentStatus === "paid" && synced.payments[0].provider === "demo" && synced.payments[0].status === "paid", "changed");
      return "paid, demo row first";
    });

    // ---------------------------------------------------------------- races and refusals
    await check("two calls at once: exactly one wins, one demo row, stock taken once (no attempt before: QRIS)", async () => {
      const b = await makeOrder(1);
      const before = await stock();
      const results = await Promise.all([markOrderPaidDemo(b.orderNumber), markOrderPaidDemo(b.orderNumber)]);
      assert(results.filter((r) => r === "paid").length === 1, `results ${results}`);
      assert(results.every((r) => r === "paid" || r === "invalid" || r === "busy"), `results ${results}`);
      const p = await rows(b.id);
      assert(p.length === 1 && p[0].provider === "demo" && p[0].status === "paid" && p[0].method === "qris", JSON.stringify(p.map((x) => [x.provider, x.status, x.method])));
      assert((await stock()) === (before ?? 0) - 1, "stock not taken exactly once");
      return `results ${results.join(" + ")}; ${p[0].reference}`;
    });

    await check("cancelled order refused (payment rows untouched)", async () => {
      const c = await makeOrder(1, { fulfilmentStatus: "cancelled", paymentStatus: "expired" });
      await mockPayment(c.id, c.orderNumber, "expired");
      const r = await markOrderPaidDemo(c.orderNumber);
      const p = await rows(c.id);
      assert(r === "invalid", `result ${r}`);
      assert(p.length === 1 && p[0].status === "expired", "rows changed");
      assert((await orderRow(c.id)).paymentStatus === "expired", "order changed");
      return "invalid";
    });

    await check("order past its payment deadline refused", async () => {
      const d = await makeOrder(1, { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) });
      await mockPayment(d.id, d.orderNumber);
      const r = await markOrderPaidDemo(d.orderNumber);
      assert(r === "invalid", `result ${r}`);
      assert((await orderRow(d.id)).paymentStatus === "awaiting" && (await rows(d.id)).length === 1, "changed");
      return `invalid (deadline ${orderDeadline(d).toISOString()})`;
    });

    await check("unknown order number refused", async () => {
      const r = await markOrderPaidDemo(`NOPE${RUN}`.slice(0, 12));
      assert(r === "invalid", `result ${r}`);
      return "invalid";
    });

    await check("a demo row left awaiting by an interrupted attempt is reused, and the status poll never pays it", async () => {
      const e = await makeOrder(1);
      await db.payment.create({
        data: { orderId: e.id, method: "qris", amount: e.total, status: "awaiting", provider: "demo", reference: `${e.orderNumber}-demo-1`, chargedAmount: e.total, fee: 0, expiresAt: orderDeadline(e) },
      });
      const synced = await syncPaymentStatus((await getOrderByNumber(e.orderNumber))!);
      assert(synced.paymentStatus === "awaiting" && synced.payments[0].status === "awaiting", "poll changed it");
      const r = await markOrderPaidDemo(e.orderNumber);
      const p = await rows(e.id);
      assert(r === "paid" && p.length === 1 && p[0].status === "paid", `${r}; ${p.length} rows`);
      return "poll: still awaiting; then paid with the same row";
    });

    // ---------------------------------------------------------------- real gateway (fake Belibayar)
    await check("live gateway payment: cancelled at the gateway with the demo reason, expired here, demo paid", async () => {
      await fetch(`${FAKE}/__reset`, { method: "POST" });
      const f = await makeOrder(2);
      const live = await gatewayCharge(f);
      assert(live.provider === "belibayar" && live.status === "awaiting", `charge row ${live.provider}/${live.status}`);
      const r = await markOrderPaidDemo(f.orderNumber);
      assert(r === "paid", `result ${r}`);
      const cancel = (await fakeLog()).find((x) => x.path.endsWith("/payment/cancel") && x.reference === live.reference);
      assert(cancel?.code === "CANCELLED", `gateway cancel: ${JSON.stringify(cancel)}`);
      assert(cancel.reason === DEMO_CANCEL_REASON, `reason "${cancel.reason}"`);
      const p = await rows(f.id);
      assert(p.length === 2 && p[0].status === "expired" && p[1].provider === "demo" && p[1].status === "paid", JSON.stringify(p.map((x) => [x.provider, x.status])));
      // The demo row carries the order total: the gateway's fee on the cancelled charge doesn't count.
      assert(p[1].chargedAmount === f.total && p[1].method === "qris", `demo ${p[1].chargedAmount}/${p[1].method}`);
      return `${live.reference} -> CANCELLED ("${cancel.reason}"); ${p[1].reference} paid ${p[1].chargedAmount}`;
    });

    await check("gateway unreachable while closing the open payment: refused as gateway, nothing changes (payment stays live, no demo row)", async () => {
      const h = await makeOrder(1);
      const live = await gatewayCharge(h);
      const before = await stock();
      process.env.BELIBAYAR_BASE_URL = "http://localhost:4019"; // nothing listens there: NETWORK on cancel and status
      let r;
      try {
        r = await markOrderPaidDemo(h.orderNumber);
      } finally {
        process.env.BELIBAYAR_BASE_URL = FAKE;
      }
      assert(r === "gateway", `result ${r}`);
      const p = await rows(h.id);
      assert(p.length === 1 && p[0].id === live.id && p[0].status === "awaiting", JSON.stringify(p.map((x) => [x.provider, x.status])));
      assert((await orderRow(h.id)).paymentStatus === "awaiting" && (await stock()) === before, "order or stock changed");
      return `${live.reference} still awaiting; no demo row`;
    });

    await check("paid for real at the gateway meanwhile: NOT_CANCELLABLE -> order paid with that payment, no demo row", async () => {
      const g = await makeOrder(1);
      const live = await gatewayCharge(g);
      const provider = getPaymentProvider("belibayar");
      const paidThere = await provider.simulatePaid({ orderNumber: g.orderNumber, reference: live.reference, method: live.method, amount: live.amount, status: "awaiting", expiresAt: live.expiresAt });
      assert(paidThere === "paid", `fake says ${paidThere}`);
      const r = await markOrderPaidDemo(g.orderNumber);
      assert(r === "real", `result ${r}`);
      const p = await rows(g.id);
      assert(p.length === 1 && p[0].provider === "belibayar" && p[0].status === "paid", JSON.stringify(p.map((x) => [x.provider, x.status])));
      const o = await orderRow(g.id);
      assert(o.paymentStatus === "paid" && o.stockDeducted, JSON.stringify(o));
      const cancel = (await fakeLog()).find((x) => x.path.endsWith("/payment/cancel") && x.reference === live.reference);
      assert(cancel?.code === "NOT_CANCELLABLE", `gateway cancel: ${JSON.stringify(cancel)}`);
      return `${live.reference}: NOT_CANCELLABLE, paid -> real; no demo row`;
    });
  } finally {
    // Let the queued paid emails finish before their orders go, then remove both.
    await sleep(1500);
    if (orderIds.length) await db.order.deleteMany({ where: { id: { in: orderIds } } });
    if (productId !== null) await db.product.delete({ where: { id: productId } });
    let mails = 0;
    try {
      const j = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=500`)).json()) as { messages: { ID: string; Subject: string }[] };
      const ids = j.messages.filter((m) => orderNumbers.some((n) => m.Subject.includes(n))).map((m) => m.ID);
      mails = ids.length;
      if (ids.length) {
        await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ IDs: ids }) });
      }
    } catch {
      // Mailpit not running: nothing to clean.
    }
    fake.kill();
    await db.$disconnect();
    console.log(`cleanup: ${orderIds.length} orders, 1 product and ${mails} Mailpit message(s) deleted`);
  }
  console.log(failed ? `\n${failed} failed` : "\nall passed");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
