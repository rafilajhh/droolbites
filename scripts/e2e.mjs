// Acceptance check for PRD US-002 (storefront), US-005 (admin), US-007 (integration), US-008 (Google)
// US-009 (demo payments, adaptive to the server's DEMO_PAYMENTS) and US-010 (store hours, payment fee hints,
// guest order lookup by emailed link, sign-up claim of guest orders confirmed while signed in). Store hours are set round the clock for the run.
// US-011: order handling (method-change email, customer receipt, timeline, store cancel of a paid order, refund).
//
//   node scripts/e2e.mjs            (E2E_BASE defaults to http://localhost:3000)
//
// Prints PASS/FAIL per check with evidence, exits 1 on any FAIL. Every DB change is
// undone in the `finally` block (prices, settings, availability, order status, created
// products + uploaded files, the order placed by the checkout flow and its mails).
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mariadb from "mariadb";
import { chromium } from "playwright";

const BASE = (process.env.E2E_BASE ?? "http://localhost:3000").replace(/\/$/, "");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const RUN = Date.now().toString(36);
const rp = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- DB
const dbUrl = new URL(process.env.DATABASE_URL);
const conn = await mariadb.createConnection({
  host: dbUrl.hostname,
  port: Number(dbUrl.port || 3306),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.slice(1),
  allowPublicKeyRetrieval: true, // MySQL 8.4 caching_sha2 after a restart
  bigIntAsNumber: true,
  insertIdAsNumber: true,
  decimalAsNumber: true,
});
const q = (sql, params = []) => conn.query(sql, params);
const one = async (sql, params) => (await q(sql, params))[0];

// ---------------------------------------------------------------- harness
const results = [];
const undo = []; // cleanup thunks, run in reverse
// E2E_SKIP=US-007.1,US-007.2 skips checks (e.g. the mock-payment flow against a live gateway).
// E2E_REMOTE_UPLOADS=1: uploads live in a container volume, so only the served bytes are checked.
const SKIP = new Set((process.env.E2E_SKIP ?? "").split(",").filter(Boolean));
const LOCAL_UPLOADS = !process.env.E2E_REMOTE_UPLOADS;
async function check(id, name, fn) {
  if (SKIP.has(id)) {
    console.log(`SKIP  ${id}  ${name}`);
    return;
  }
  let ok = true;
  let evidence = "";
  try {
    evidence = (await fn()) ?? "";
  } catch (e) {
    ok = false;
    evidence = String(e?.message ?? e).split("\n")[0].slice(0, 300);
  }
  results.push({ id, name, ok, evidence });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${name}${evidence ? `  -- ${evidence}` : ""}`);
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
async function get(p, opts = {}) {
  const res = await fetch(BASE + p, { redirect: "follow", ...opts });
  return { status: res.status, text: await res.text(), res };
}
const cartCookie = async (ctx) => {
  const c = (await ctx.cookies()).find((x) => x.name === "db_cart");
  if (!c) return [];
  return JSON.parse(decodeURIComponent(c.value));
};

// ---------------------------------------------------------------- browser
const browser = await chromium.launch();
const newCtx = (opts = {}) => browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 }, ...opts });
const open = async (ctx, route) => {
  const page = await ctx.newPage();
  page.setDefaultTimeout(45_000);
  await page.goto(route, { waitUntil: "load", timeout: 90_000 });
  return page;
};
const settle = (page) => page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

async function customerSignIn(ctx) {
  const page = await open(ctx, "/sign-in");
  await page.locator("#email").fill("alya@email.com");
  await page.locator("#password").fill("alya12345");
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 }), page.locator("form button[type=submit]").click()]);
  const url = new URL(page.url()).pathname;
  await page.close();
  return url;
}
async function adminSignIn(ctx) {
  const page = await open(ctx, "/admin/sign-in");
  await page.locator("#admin-email").fill("admin@droolbites.biz.id");
  await page.locator("#admin-password").fill("droolbites123");
  await Promise.all([page.waitForURL((u) => u.pathname !== "/admin/sign-in", { timeout: 60_000 }), page.locator("form button[type=submit]").click()]);
  const url = new URL(page.url()).pathname;
  await page.close();
  return url;
}
async function setFulfilment(ctx, number, label) {
  const page = await open(ctx, `/admin/orders/${number}`);
  await settle(page);
  await page.locator('button[aria-haspopup="listbox"]').first().click();
  await page.getByRole("option", { name: new RegExp(label, "i") }).click();
  await page.locator("form:has(input[name=orderNumber]) button[type=submit]").click();
  await page.locator("[role=status]").filter({ hasText: /\S/ }).first().waitFor({ timeout: 30_000 });
  await page.close();
}

async function acceptOrder(ctx, number) {
  const page = await open(ctx, `/admin/orders/${number}`);
  await settle(page);
  await page.getByRole("button", { name: /accept/i }).click();
  for (let i = 0; i < 30; i++) {
    if ((await one("SELECT fulfilment_status s FROM orders WHERE order_number=?", [number])).s === "baking") break;
    await sleep(1000);
  }
  await page.close();
}

const cleanupLog = [];
try {
  const guest = await newCtx();
  const mobile = await newCtx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const alya = await newCtx();
  const admin = await newCtx();

  // Checkout only takes orders while the shop is open (WIB, last order 30 min before closing). The run may
  // happen at any hour, so the hours become round the clock (00:00–23:59, every day) and are restored at the
  // end; US-010.1 closes the shop on purpose.
  const storeHours = await one("SELECT opens_at, closes_at, open_days FROM store_settings WHERE id=1");
  const alwaysOpen = () => q("UPDATE store_settings SET opens_at='00:00', closes_at='23:59', open_days='mon,tue,wed,thu,fri,sat,sun' WHERE id=1");
  await alwaysOpen();
  undo.push(async () => {
    await q("UPDATE store_settings SET opens_at=?, closes_at=?, open_days=? WHERE id=1", [storeHours.opens_at, storeHours.closes_at, storeHours.open_days]);
    cleanupLog.push(`store hours restored to ${storeHours.opens_at}-${storeHours.closes_at} (${storeHours.open_days})`);
  });

  // ============================================================ US-002 storefront
  await check("US-002.1", "GET /, /menu, /menu/chocolate-chunk, /menu/fudgy-brownies -> 200", async () => {
    const out = [];
    for (const p of ["/", "/menu", "/menu/chocolate-chunk", "/menu/fudgy-brownies"]) {
      const r = await get(p);
      assert(r.status === 200, `${p} -> ${r.status}`);
      out.push(`${p}:200`);
    }
    return out.join(" ");
  });
  await check("US-002.2", "GET /menu/does-not-exist -> 404", async () => {
    const r = await get("/menu/does-not-exist");
    assert(r.status === 404, `got ${r.status}`);
    return "404";
  });

  await check("US-002.3", "/menu shows a variant price changed in the DB (restored afterwards)", async () => {
    const v = await one("SELECT id, price FROM product_variants WHERE id = 1");
    const newPrice = v.price + 2777;
    undo.push(async () => {
      await q("UPDATE product_variants SET price = ? WHERE id = 1", [v.price]);
      cleanupLog.push(`variant 1 price restored to ${v.price}`);
    });
    const before = await get("/menu");
    assert(before.text.includes(rp(v.price)), `old price ${rp(v.price)} not shown before change`);
    await q("UPDATE product_variants SET price = ? WHERE id = 1", [newPrice]);
    const after = await get("/menu");
    assert(after.text.includes(rp(newPrice)), `${rp(newPrice)} not on /menu after DB change (stale cache?)`);
    await q("UPDATE product_variants SET price = ? WHERE id = 1", [v.price]);
    const back = await get("/menu");
    assert(back.text.includes(rp(v.price)), "restored price not shown");
    return `${rp(v.price)} -> ${rp(newPrice)} -> ${rp(v.price)}`;
  });

  await check("US-002.4", "Clicking + on a single-variant card adds to db_cart, header count +1, cart drawer opens with the line", async () => {
    const page = await open(guest, "/menu");
    await settle(page);
    const cartBtn = page.locator('header button[aria-haspopup="dialog"][aria-label^="Open cart"]');
    const labelBefore = await cartBtn.getAttribute("aria-label");
    const card = page.locator("article", { has: page.getByRole("heading", { name: "Chocolate Chunk" }) });
    await card.locator("button[aria-label]").click();
    const drawer = page.locator('[role=dialog][aria-labelledby="cart-title"]');
    await drawer.getByText("Chocolate Chunk").first().waitFor({ state: "visible", timeout: 20_000 });
    await sleep(500);
    const labelAfter = await cartBtn.getAttribute("aria-label");
    const cookie = await cartCookie(guest);
    assert(cookie.some((e) => e.v === "1" && e.q === 1), `db_cart = ${JSON.stringify(cookie)}`);
    assert(labelBefore !== labelAfter && /1/.test(labelAfter), `header label "${labelBefore}" -> "${labelAfter}"`);
    await page.close();
    return `db_cart=${JSON.stringify(cookie)}; header "${labelBefore}" -> "${labelAfter}"`;
  });

  await check("US-002.5", "Brownies open a size picker; 20 x 30 cm adds the Rp90.000 variant", async () => {
    const page = await open(guest, "/menu");
    await settle(page);
    const card = page.locator("article", { has: page.getByRole("heading", { name: "Fudgy Brownies" }) });
    await card.locator('button[aria-haspopup="dialog"]').click();
    const modal = page.locator("[role=dialog][aria-modal=true]", { has: page.locator("fieldset") });
    await modal.waitFor({ state: "visible" });
    await modal.getByText("20 × 30 cm").click();
    const add = modal.getByRole("button", { name: /Rp90\.000/ });
    await add.waitFor({ state: "visible" });
    await add.click();
    await page.locator('[role=dialog][aria-labelledby="cart-title"]').getByText("Fudgy Brownies").first().waitFor({ state: "visible", timeout: 20_000 });
    const cookie = await cartCookie(guest);
    const exp = await one("SELECT id, price FROM product_variants WHERE product_id = 5 AND name = '20 × 30 cm'");
    assert(exp.price === 90000, `DB price for 20 x 30 is ${exp.price}`);
    assert(cookie.some((e) => e.v === String(exp.id)), `db_cart ${JSON.stringify(cookie)} lacks variant ${exp.id}`);
    await page.close();
    return `variant ${exp.id} (Rp90.000) in db_cart`;
  });

  const menuTitles = async (route) => {
    const page = await open(guest, route);
    await settle(page);
    // Visible title only: the card title also carries sr-only badge text (", New").
    const t = await page.locator("article h3").evaluateAll((els) =>
      els.map((el) => {
        const c = el.cloneNode(true);
        c.querySelectorAll(".sr-only").forEach((n) => n.remove());
        return c.textContent.trim();
      }),
    );
    await page.close();
    return t;
  };
  await check("US-002.6", "/menu?category=brownies shows only brownies (real param: category)", async () => {
    const t = await menuTitles("/menu?category=brownies");
    assert(t.length === 1 && t[0] === "Fudgy Brownies", `cards: ${JSON.stringify(t)}`);
    return JSON.stringify(t);
  });
  await check("US-002.7", "/menu?q=matcha shows only Matcha Tiramisu (real param: q)", async () => {
    const t = await menuTitles("/menu?q=matcha");
    assert(t.length === 1 && t[0] === "Matcha Tiramisu", `cards: ${JSON.stringify(t)}`);
    return JSON.stringify(t);
  });

  for (const route of ["/", "/menu", "/menu/chocolate-chunk"]) {
    await check("US-002.8", `390px: ${route} has no horizontal scroll`, async () => {
      const page = await open(mobile, route);
      await settle(page);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      await page.close();
      assert(m.sw <= m.iw, `scrollWidth ${m.sw} > innerWidth ${m.iw}`);
      return `scrollWidth ${m.sw} <= ${m.iw}`;
    });
  }

  // ============================================================ US-005 admin
  const adminRoutes = ["/admin", "/admin/orders", "/admin/orders/DB-0001", "/admin/products", "/admin/products/new", "/admin/products/1/edit", "/admin/settings"];
  await check("US-005.1", "Every /admin page (except sign-in) redirects to /admin/sign-in without a session", async () => {
    const ctx = await newCtx();
    const bad = [];
    for (const r of adminRoutes) {
      const page = await open(ctx, r);
      await settle(page);
      if (new URL(page.url()).pathname !== "/admin/sign-in") bad.push(`${r} -> ${new URL(page.url()).pathname}`);
      await page.close();
    }
    await ctx.close();
    assert(bad.length === 0, bad.join("; "));
    return `${adminRoutes.length} routes redirect`;
  });
  await check("US-005.2", "Customer alya@email.com cannot sign in to admin", async () => {
    const ctx = await newCtx();
    const page = await open(ctx, "/admin/sign-in");
    await page.locator("#admin-email").fill("alya@email.com");
    await page.locator("#admin-password").fill("alya12345");
    await page.locator("form button[type=submit]").click();
    await page.locator("#admin-signin-error").waitFor({ state: "visible", timeout: 30_000 });
    const msg = (await page.locator("#admin-signin-error").textContent())?.trim();
    assert(new URL(page.url()).pathname === "/admin/sign-in", `ended on ${page.url()}`);
    await page.goto("/admin");
    assert(new URL(page.url()).pathname === "/admin/sign-in", `/admin reachable: ${page.url()}`);
    await ctx.close();
    return `error shown: "${msg}"`;
  });
  await check("US-005.3", "Admin admin@droolbites.biz.id signs in", async () => {
    const url = await adminSignIn(admin);
    assert(url === "/admin", `landed on ${url}`);
    return `landed on ${url}`;
  });

  await check("US-005.4", "Overview figures match the DB", async () => {
    // Sales and Orders cover the last 30 Surabaya days (today and the 29 before), as the report's "30 days".
    const salesFrom = () => {
      const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
      const from = new Date(Date.parse(`${today}T00:00:00Z`) - 29 * 86400_000).toISOString().slice(0, 10);
      return new Date(`${from}T00:00:00+07:00`).toISOString().slice(0, 19).replace("T", " ");
    };
    const dbFigures = async () => ({
      awaiting: (await one("SELECT COUNT(*) c FROM orders WHERE payment_status='awaiting' AND fulfilment_status<>'cancelled'")).c,
      // Cancelled (declined) orders are left out of the overview figures.
      sales: await one("SELECT COALESCE(SUM(total),0) s, COUNT(*) c FROM orders WHERE payment_status='paid' AND fulfilment_status<>'cancelled' AND created_at >= ?", [salesFrom()]),
      recent: (await q("SELECT order_number FROM orders ORDER BY created_at DESC LIMIT 3")).map((r) => r.order_number),
    });
    let last = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const a = await dbFigures();
      const page = await open(admin, "/admin");
      await settle(page);
      const kpis = (await page.locator("[data-stat-value]").allTextContents()).map((s) => s.trim());
      const body = await page.locator("main").innerText();
      await page.close();
      const b = await dbFigures();
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        last = "DB changed during read (other writer); retrying";
        continue;
      }
      const exp = [rp(a.sales.s), String(a.sales.c), String(a.awaiting)];
      const rows = a.recent.every((n) => body.includes(n));
      if (JSON.stringify(kpis) === JSON.stringify(exp) && rows) {
        return `KPIs ${JSON.stringify(kpis)} == DB (sales, orders in 30 days, awaiting payment); recent ${a.recent.join(",")}`;
      }
      last = `UI ${JSON.stringify(kpis)} vs DB ${JSON.stringify(exp)}; recent rows present=${rows}`;
    }
    throw new Error(last);
  });

  const rowsOf = async (route) => {
    const page = await open(admin, route);
    await settle(page);
    // The row header's first text is the order number (from xl to 1400px the customer name follows it in the same cell).
    const rows = await page.locator("tbody tr").evaluateAll((trs) => trs.map((tr) => ({ th: tr.querySelector("th")?.firstChild?.textContent?.trim() ?? "" })));
    await page.close();
    return rows.filter((r) => r.th);
  };
  await check("US-005.5", "Orders list search (?q=) works", async () => {
    const out = [];
    for (const qs of ["DB-0001", "Guest Tester", "alya@email"]) {
      const exp = await q("SELECT order_number FROM orders WHERE order_number LIKE ? OR customer_name LIKE ? OR email LIKE ? ORDER BY created_at DESC, id DESC LIMIT 20", [`%${qs}%`, `%${qs}%`, `%${qs}%`]);
      const rows = await rowsOf(`/admin/orders?q=${encodeURIComponent(qs)}`);
      assert(rows.length === exp.length && rows.every((r, i) => r.th === exp[i].order_number), `q=${qs}: UI ${rows.map((r) => r.th)} vs DB ${exp.map((r) => r.order_number)}`);
      out.push(`q=${qs}: ${rows.length}`);
    }
    const none = await rowsOf("/admin/orders?q=zzzz-nothing-matches");
    assert(none.length === 0, "nonsense query returned rows");
    return out.join(", ") + ", nonsense: 0";
  });
  await check("US-005.6", "Orders list status filter (?status=) works", async () => {
    const out = [];
    for (const s of ["paid", "awaiting", "expired"]) {
      // Unpaid orders the store cancelled read "Not paid" and stay out of "Awaiting payment" / "Expired"
      // (cancelledByStore: still awaiting, or closed before the 24 h payment window ended).
      const storeCancelled =
        s === "paid" ? "" : " AND NOT (fulfilment_status='cancelled' AND (payment_status<>'expired' OR updated_at IS NULL OR updated_at < created_at + INTERVAL 86400 SECOND))";
      const exp = (await q(`SELECT order_number FROM orders WHERE payment_status=?${storeCancelled} ORDER BY created_at DESC, id DESC LIMIT 20`, [s])).map((r) => r.order_number);
      const rows = await rowsOf(`/admin/orders?status=${s}`);
      assert(JSON.stringify(rows.map((r) => r.th)) === JSON.stringify(exp), `status=${s}: UI ${rows.map((r) => r.th)} vs DB ${exp}`);
      out.push(`${s}:${rows.length}`);
    }
    return out.join(" ");
  });

  await check("US-005.7", "Order detail changes fulfilment status; customer /orders/<n> reflects it (restored afterwards)", async () => {
    const o = await one("SELECT order_number, fulfilment_status, handed_off_at FROM orders WHERE order_number='DB-0001'");
    assert(o && o.fulfilment_status === "baking", `DB-0001 not in baking (${o?.fulfilment_status}); cannot run`);
    undo.push(async () => {
      await q("UPDATE orders SET fulfilment_status=?, handed_off_at=? WHERE order_number='DB-0001'", [o.fulfilment_status, o.handed_off_at]);
      cleanupLog.push(`DB-0001 fulfilment_status restored to ${o.fulfilment_status}`);
    });
    await setFulfilment(admin, "DB-0001", "Out for delivery");
    const now = (await one("SELECT fulfilment_status s FROM orders WHERE order_number='DB-0001'")).s;
    assert(now === "out_for_delivery", `DB status ${now}`);
    const custCtx = await newCtx();
    await customerSignIn(custCtx);
    const cust = await open(custCtx, "/orders/DB-0001");
    const txt = await cust.locator("body").innerText();
    await cust.close();
    await custCtx.close();
    assert(/Out for delivery/i.test(txt), "customer page lacks 'Out for delivery'");
    return "baking -> out_for_delivery shown to customer";
  });

  const srcImg = path.join(ROOT, "public/images/products/chocolate-chunk.png");
  const uploadsDir = path.join(ROOT, "public/uploads");
  const preUploads = new Set(fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []);
  const pname = `E2E Test Cookie ${RUN}`;
  undo.push(async () => {
    const rows = await q("SELECT id FROM products WHERE name LIKE 'E2E Test Cookie %'");
    for (const r of rows) {
      await q("DELETE FROM products WHERE id=?", [r.id]);
      cleanupLog.push(`deleted leftover product ${r.id}`);
    }
    if (fs.existsSync(uploadsDir)) {
      for (const f of fs.readdirSync(uploadsDir)) {
        if (!preUploads.has(f) && f.startsWith("e2e-test-cookie")) {
          fs.unlinkSync(path.join(uploadsDir, f));
          cleanupLog.push(`removed upload ${f}`);
        }
      }
    }
  });
  let productId = null;
  let uploadName = null;
  await check("US-005.8", "Products: create with uploaded image (stored byte-for-byte, served at /uploads/<file>)", async () => {
    const page = await open(admin, "/admin/products/new");
    await settle(page);
    await page.locator('input[name="name"]').fill(pname);
    await page.locator('select[name="categoryId"]').selectOption({ index: 1 });
    await page.locator('form [name="description"]').fill("Created by scripts/e2e.mjs");
    await page.locator('input[name="photo"]').setInputFiles(srcImg);
    await page.locator('input[name="variantName"]').first().fill("1 piece");
    await page.locator('input[name="variantPrice"]').first().fill("4321");
    await Promise.all([page.waitForURL((u) => u.pathname === "/admin/products", { timeout: 60_000 }), page.locator('form:has(input[name=variantPrice]) button[type=submit]').last().click()]);
    await page.close();
    const p = await one("SELECT id, slug, image_url FROM products WHERE name=?", [pname]);
    assert(p, "product row not created");
    productId = p.id;
    assert(p.image_url?.startsWith("/uploads/"), `image_url=${p.image_url}`);
    uploadName = path.basename(p.image_url);
    const src = fs.readFileSync(srcImg);
    if (LOCAL_UPLOADS) {
      const stored = fs.readFileSync(path.join(uploadsDir, uploadName));
      assert(sha(stored) === sha(src), `stored sha ${sha(stored).slice(0, 12)} != source ${sha(src).slice(0, 12)}`);
    }
    const res = await fetch(BASE + p.image_url);
    const served = Buffer.from(await res.arrayBuffer());
    assert(res.status === 200, `GET ${p.image_url} -> ${res.status}`);
    assert(sha(served) === sha(src), `served sha ${sha(served).slice(0, 12)} != source`);
    const shown = await get("/menu");
    assert(shown.text.includes(pname), "new product not on /menu");
    return `${p.image_url} sha256 ${sha(src).slice(0, 12)}..., ${res.headers.get("content-type")}, ${src.length} bytes`;
  });
  await check("US-005.9", "Products: edit the created product", async () => {
    assert(productId, "no product from previous check");
    const page = await open(admin, `/admin/products/${productId}/edit`);
    await settle(page);
    await page.locator('input[name="name"]').fill(pname + " edited");
    await page.locator('input[name="variantPrice"]').first().fill("5432");
    await Promise.all([page.waitForURL((u) => u.pathname === "/admin/products", { timeout: 60_000 }), page.locator('form:has(input[name=variantPrice]) button[type=submit]').last().click()]);
    await page.close();
    const p = await one("SELECT name, image_url FROM products WHERE id=?", [productId]);
    const v = await one("SELECT price FROM product_variants WHERE product_id=?", [productId]);
    assert(p.name === pname + " edited" && v.price === 5432, `name=${p.name} price=${v.price}`);
    assert(p.image_url === `/uploads/${uploadName}`, "image changed on edit without new upload");
    return "name/price updated, image kept";
  });
  const trashButton = (page) => page.locator("form button[type=button]").filter({ has: page.locator("svg[class*=lucide-trash]") }).last();
  await check("US-005.10", "Products: delete the created product (row and upload file removed)", async () => {
    assert(productId, "no product from previous check");
    const page = await open(admin, `/admin/products/${productId}/edit`);
    await settle(page);
    await trashButton(page).click();
    const dlg = page.locator("[role=alertdialog]");
    await dlg.waitFor({ state: "visible" });
    await Promise.all([page.waitForURL((u) => u.pathname === "/admin/products", { timeout: 60_000 }), dlg.locator("button").last().click()]);
    await page.close();
    const p = await one("SELECT id FROM products WHERE id=?", [productId]);
    assert(!p, "product row still exists");
    if (LOCAL_UPLOADS) assert(!fs.existsSync(path.join(uploadsDir, uploadName)), "upload file still on disk");
    const res = await fetch(BASE + `/uploads/${uploadName}`);
    assert(res.status === 404, `/uploads/${uploadName} -> ${res.status}`);
    return "row deleted, file removed, /uploads 404";
  });

  await check("US-005.11", "Deleting a product that has order items hides it instead (restored afterwards)", async () => {
    const prod = await one("SELECT id, slug, is_available FROM products WHERE slug='red-velvet'");
    const used = (await one("SELECT COUNT(*) c FROM order_items oi JOIN product_variants v ON v.id=oi.variant_id WHERE v.product_id=?", [prod.id])).c;
    assert(used > 0, "red-velvet has no order items");
    undo.push(async () => {
      await q("UPDATE products SET is_available=? WHERE id=?", [prod.is_available, prod.id]);
      cleanupLog.push(`${prod.slug} is_available restored to ${prod.is_available}`);
    });
    const page = await open(admin, `/admin/products/${prod.id}/edit`);
    await settle(page);
    await trashButton(page).click();
    const dlg = page.locator("[role=alertdialog]");
    await dlg.waitFor({ state: "visible" });
    const dlgText = (await dlg.innerText()).replace(/\s+/g, " ");
    await Promise.all([page.waitForURL((u) => u.pathname === "/admin/products", { timeout: 60_000 }), dlg.locator("button").last().click()]);
    await page.close();
    const after = await one("SELECT is_available FROM products WHERE id=?", [prod.id]);
    assert(after, "product row was deleted");
    assert(after.is_available === 0, `is_available=${after.is_available}`);
    const menu = await get("/menu");
    assert(!menu.text.includes(">Red Velvet<"), "still listed on /menu");
    await q("UPDATE products SET is_available=? WHERE id=?", [prod.is_available, prod.id]);
    return `kept row, is_available=0, off /menu; dialog: "${dlgText.slice(0, 70)}..."`;
  });

  await check("US-005.12", "Store settings save to store_settings and footer reflects the new phone (restored afterwards)", async () => {
    const s = await one("SELECT phone FROM store_settings WHERE id=1");
    undo.push(async () => {
      await q("UPDATE store_settings SET phone=? WHERE id=1", [s.phone]);
      cleanupLog.push(`store phone restored to ${s.phone}`);
    });
    const newPhone = "+62 811 2233 4455";
    const page = await open(admin, "/admin/settings");
    await settle(page);
    await page.locator("#settings-phone").fill(newPhone);
    await page.locator("form:has(#settings-phone) button[type=submit]:visible").click();
    await page.locator("[role=status]").filter({ hasText: /\S/ }).first().waitFor({ timeout: 30_000 });
    await page.close();
    const row = await one("SELECT phone FROM store_settings WHERE id=1");
    assert(row.phone === newPhone, `DB phone ${row.phone}`);
    const home = await get("/");
    const loc = await get("/location");
    assert(home.text.includes(newPhone), "footer on / lacks new phone");
    assert(loc.text.includes(newPhone), "/location lacks new phone");
    await q("UPDATE store_settings SET phone=? WHERE id=1", [s.phone]);
    const back = await get("/");
    assert(back.text.includes(s.phone), "restored phone not shown");
    return `${s.phone} -> ${newPhone} in footer + /location -> restored`;
  });

  // ============================================================ US-007 integration
  const tStart = new Date();
  let orderNumber = null;
  await check("US-007.1", "Alya signs in, adds 2 products, checks out (delivery), simulates mock payment, sees order in /account", async () => {
    const landed = await customerSignIn(alya);
    assert(landed === "/account", `after sign-in landed on ${landed}`);
    const page = await open(alya, "/menu");
    await settle(page);
    for (const name of ["Double Chocolate", "Matcha Tiramisu"]) {
      const card = page.locator("article", { has: page.getByRole("heading", { name }) });
      await card.locator("button[aria-label]").click();
      const drawer = page.locator('[role=dialog][aria-labelledby="cart-title"]');
      await drawer.getByText(name).first().waitFor({ state: "visible", timeout: 20_000 });
      await sleep(500);
      await page.keyboard.press("Escape");
      await sleep(500);
    }
    const cookie = await cartCookie(alya);
    assert(cookie.length === 2, `db_cart has ${cookie.length} lines: ${JSON.stringify(cookie)}`);
    await page.goto("/checkout");
    await settle(page);
    await page.locator('input[name="fulfilment"][value="delivery"]').check({ force: true });
    // Delivery needs a pin: tap the map just south-east of the store (inside the delivery radius).
    const map = page.locator(".leaflet-container").first();
    const box = await map.boundingBox();
    await map.click({ position: { x: box.width / 2 + 30, y: box.height / 2 + 40 } });
    await page.waitForFunction(() => document.querySelector('input[name="lat"]')?.value, null, { timeout: 20_000 });
    // Simpler flow: Contact + Delivery or pickup only (no country/province selects, delivery-method card or billing address).
    assert((await page.locator('input[name="billing"], #checkout-country, #checkout-province, input[name="deliveryMethod"]').count()) === 0, "old billing/country/method fields still rendered");
    await page.locator("#checkout-email").fill("alya@email.com");
    await page.locator("#checkout-fullName").fill("Alya Rahmawati");
    await page.locator("#checkout-street").fill("Jl. Test E2E 1");
    assert((await page.locator("#checkout-city").inputValue()) === "Surabaya", "city field is not prefilled with Surabaya");
    await page.locator("#checkout-postal").fill("60111");
    // Phone is required (e-wallets need it) and must be an Indonesian mobile number.
    await page.locator("#checkout-phone").fill("");
    await page.locator("form button[type=submit]").first().click();
    await page.locator("#checkout-phone-error").waitFor({ state: "visible", timeout: 30_000 });
    assert(await page.locator("#checkout-phone").evaluate((el) => el === document.activeElement), "focus not moved to the empty phone field");
    await page.locator("#checkout-phone").fill("12345");
    await page.locator("form button[type=submit]").first().click();
    await sleep(1500);
    assert(page.url().endsWith("/checkout") && (await page.locator("#checkout-phone-error").isVisible()), "non-Indonesian phone accepted");
    await page.locator("#checkout-phone").fill("0812-3456-7890");
    await Promise.all([page.waitForURL(/\/checkout\/payment/, { timeout: 60_000 }), page.locator("form button[type=submit]").first().click()]);
    await settle(page);
    await page.locator('input[name="method"][value="bca_va"]').check({ force: true });
    await Promise.all([page.waitForURL(/\/checkout\/pay\//, { timeout: 60_000 }), page.locator("[data-pinned-bar] button[type=submit]").click()]);
    orderNumber = new URL(page.url()).pathname.split("/").pop();
    assert(/^DB-\d+$/.test(orderNumber), `order number from URL: ${orderNumber}`);
    undo.push(async () => {
      // Paying took its items from stock: put them back before the order goes.
      const back = await q(
        `UPDATE product_variants v JOIN order_items i ON i.variant_id = v.id JOIN orders o ON o.id = i.order_id
         SET v.stock = v.stock + i.qty WHERE o.order_number = ? AND o.stock_deducted = 1 AND v.stock IS NOT NULL`,
        [orderNumber],
      );
      await q("DELETE FROM orders WHERE order_number=?", [orderNumber]);
      cleanupLog.push(`order ${orderNumber} deleted (items/payments cascade)${back.affectedRows ? `, stock of ${back.affectedRows} variant(s) put back` : ""}`);
      try {
        const msgs = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()).messages ?? [];
        const ids = msgs.filter((m) => m.Subject.includes(orderNumber)).map((m) => m.ID);
        if (ids.length) {
          await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ IDs: ids }) });
          cleanupLog.push(`${ids.length} Mailpit message(s) for ${orderNumber} deleted`);
        }
      } catch {}
    });
    await page.getByRole("button", { name: /Simulate payment/i }).click();
    await page.waitForURL(/\/checkout\/success\//, { timeout: 60_000 });
    await page.goto("/account");
    await settle(page);
    const txt = await page.locator("body").innerText();
    await page.close();
    assert(txt.includes(orderNumber), `/account lacks ${orderNumber}`);
    const row = await one("SELECT payment_status, fulfilment_status, fulfilment_method, user_id FROM orders WHERE order_number=?", [orderNumber]);
    assert(row.payment_status === "paid" && row.fulfilment_method === "delivery" && row.user_id === 2, JSON.stringify(row));
    const items = await q("SELECT oi.qty FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.order_number=?", [orderNumber]);
    assert(items.length === 2, `${items.length} order items`);
    return `${orderNumber}: paid, delivery, 2 items, listed in /account`;
  });
  await check("US-007.2", "Admin sees the order in /admin/orders and sets it to out_for_delivery; Alya's order page shows 'Out for delivery'", async () => {
    assert(orderNumber, "no order from previous check");
    const rows = await rowsOf(`/admin/orders?q=${orderNumber}`);
    assert(rows.some((r) => r.th === orderNumber), `${orderNumber} not in admin list`);
    // A new paid order is accepted (or declined) first; accepting moves it to baking.
    await acceptOrder(admin, orderNumber);
    await setFulfilment(admin, orderNumber, "Out for delivery");
    const s = (await one("SELECT fulfilment_status s FROM orders WHERE order_number=?", [orderNumber])).s;
    assert(s === "out_for_delivery", `DB status ${s}`);
    const page = await open(alya, `/orders/${orderNumber}`);
    const txt = await page.locator("body").innerText();
    await page.close();
    assert(/Out for delivery/i.test(txt), "customer order page lacks 'Out for delivery'");
    return "pending -> baking -> out_for_delivery; customer page shows it";
  });
  await check("US-007.3", "Mailpit received confirmation + paid emails for that order", async () => {
    assert(orderNumber, "no order from previous check");
    const want = [`Order ${orderNumber} is awaiting payment`, `Order ${orderNumber} is paid`];
    let subjects = [];
    for (let i = 0; i < 15; i++) {
      const j = await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json();
      subjects = j.messages.filter((m) => m.To.some((t) => t.Address === "alya@email.com") && new Date(m.Created) >= new Date(tStart.getTime() - 60_000)).map((m) => m.Subject);
      if (want.every((w) => subjects.includes(w))) return `got: ${want.join(" | ")}`;
      await sleep(1000);
    }
    throw new Error(`missing; saw ${JSON.stringify(subjects)}`);
  });

  // ============================================================ US-009 demo payments (DEMO_PAYMENTS)
  // Adaptive like US-008: the dev server's env decides. On: PAY INSTANTLY on /checkout/payment places the
  // order paid without the gateway; off: no such button. Either way no page says "demo". Orders are
  // deleted afterwards with their emails; Red Velvet's stock is tracked for the run.
  const DEMO_VARIANT = 3;
  const demoStock = await one("SELECT stock FROM product_variants WHERE id = ?", [DEMO_VARIANT]);
  await q("UPDATE product_variants SET stock = 40 WHERE id = ?", [DEMO_VARIANT]);
  undo.push(async () => {
    await q("UPDATE product_variants SET stock = ? WHERE id = ?", [demoStock.stock, DEMO_VARIANT]);
    cleanupLog.push(`variant ${DEMO_VARIANT} stock restored to ${demoStock.stock}`);
  });
  const variantStock = async () => (await one("SELECT stock FROM product_variants WHERE id = ?", [DEMO_VARIANT])).stock;
  /** An unpaid pickup order of 2 Red Velvet for Alya, with a live mock BCA VA payment unless `live` is false. */
  async function demoOrder({ live = true } = {}) {
    const max = (await one("SELECT MAX(CAST(SUBSTRING(order_number, 4) AS UNSIGNED)) n FROM orders WHERE order_number LIKE 'DB-%'")).n ?? 0;
    const number = `DB-${String(Number(max) + 1).padStart(4, "0")}`;
    const r = await q(
      `INSERT INTO orders (order_number, user_id, customer_name, email, phone, fulfilment_method, subtotal, delivery_fee, total, created_at)
       VALUES (?, 2, 'Alya Rahmawati', 'alya@email.com', '0812-3456-7890', 'pickup', 10000, 0, 10000, UTC_TIMESTAMP(3))`,
      [number],
    );
    const id = r.insertId;
    undo.push(async () => {
      await q("DELETE FROM orders WHERE id=?", [id]);
      cleanupLog.push(`demo order ${number} deleted`);
      try {
        const msgs = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()).messages ?? [];
        const ids = msgs.filter((m) => m.Subject.includes(number)).map((m) => m.ID);
        if (ids.length) await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ IDs: ids }) });
      } catch {}
    });
    await q("INSERT INTO order_items (order_id, variant_id, qty, unit_price) VALUES (?, ?, 2, 5000)", [id, DEMO_VARIANT]);
    if (live) {
      await q(
        `INSERT INTO payments (order_id, method, amount, status, provider, reference, va_number, charged_amount, fee, fee_bearer, expires_at, created_at)
         VALUES (?, 'bca_va', 10000, 'awaiting', 'mock', ?, '8077 1234 5678 9012', 10000, 0, 'merchant', DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 23 HOUR), UTC_TIMESTAMP(3))`,
        [id, `${number}-1`],
      );
    }
    return { id, number };
  }
  const paymentsOf = (id) => q("SELECT provider, status, method, reference, amount, charged_amount, fee FROM payments WHERE order_id=? ORDER BY id", [id]);
  const orderOf = (id) => one("SELECT payment_status, fulfilment_status, stock_deducted FROM orders WHERE id=?", [id]);
  /** A guest with 2 Red Velvet in the cart, through the details step (pickup) onto /checkout/payment. */
  async function guestOnPaymentStep(ctx) {
    await ctx.addCookies([{ name: "db_cart", value: encodeURIComponent(JSON.stringify([{ v: String(DEMO_VARIANT), q: 2 }])), url: BASE }]);
    const page = await open(ctx, "/checkout");
    await settle(page);
    await page.locator('input[name="fulfilment"][value="pickup"]').check({ force: true });
    await page.locator("#checkout-email").fill("alya@email.com");
    await page.locator("#checkout-fullName").fill("Alya Rahmawati");
    await page.locator("#checkout-phone").fill("0812-3456-7890");
    await Promise.all([page.waitForURL(/\/checkout\/payment/, { timeout: 60_000 }), page.locator("form button[type=submit]").first().click()]);
    await settle(page);
    return page;
  }
  const instantButton = (page) => page.getByRole("button", { name: "PAY INSTANTLY", exact: true });
  /** Visible text of an admin page, for the "never says demo" checks. */
  const adminText = async (route) => {
    const page = await open(admin, route);
    await settle(page);
    const txt = await page.locator("body").innerText();
    await page.close();
    return txt;
  };

  let demoOn = false;
  await check("US-009.1", "Unpaid order's admin page: only CANCEL ORDER, no demo button or wording; /checkout/payment shows a plain PAY INSTANTLY exactly when DEMO_PAYMENTS is on, and never the word demo", async () => {
    const demoA = await demoOrder();
    const txt = await adminText(`/admin/orders/${demoA.number}`);
    assert(/CANCEL ORDER/.test(txt), "no CANCEL ORDER");
    assert(!/demo/i.test(txt), "admin order page says demo");
    const ctx = await newCtx();
    try {
      const pay = await guestOnPaymentStep(ctx);
      demoOn = (await instantButton(pay).count()) > 0;
      const payTxt = await pay.locator("body").innerText();
      await pay.close();
      assert(!/demo/i.test(payTxt), "/checkout/payment says demo");
    } finally {
      await ctx.close();
    }
    return `admin: CANCEL ORDER, no demo; /checkout/payment: PAY INSTANTLY ${demoOn ? "shown" : "hidden"} (DEMO_PAYMENTS ${demoOn ? "on" : "off"}), no demo`;
  });

  if (demoOn) {
    let skipped = null;
    await check("US-009.2", "Guest checks out (pickup) and presses PAY INSTANTLY: no gateway charge, one paid payment with the chosen method, stock taken, straight to success", async () => {
      const ctx = await newCtx();
      try {
        const stockBefore = await variantStock();
        const page = await guestOnPaymentStep(ctx);
        await page.locator('input[name="method"][value="bca_va"]').check({ force: true });
        await Promise.all([page.waitForURL(/\/checkout\/success\//, { timeout: 60_000 }), instantButton(page).click()]);
        const number = new URL(page.url()).pathname.split("/").pop();
        await settle(page);
        const successTxt = await page.locator("body").innerText();
        await page.close();
        const row = await one("SELECT id, payment_status, fulfilment_status, stock_deducted FROM orders WHERE order_number=?", [number]);
        assert(row, `no order ${number}`);
        skipped = { id: row.id, number };
        undo.push(async () => {
          await q("DELETE FROM orders WHERE id=?", [row.id]);
          cleanupLog.push(`instant-paid order ${number} deleted`);
          try {
            const msgs = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()).messages ?? [];
            const ids = msgs.filter((m) => m.Subject.includes(number)).map((m) => m.ID);
            if (ids.length) await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ IDs: ids }) });
          } catch {}
        });
        assert(row.payment_status === "paid" && row.fulfilment_status === "pending" && row.stock_deducted === 1, JSON.stringify(row));
        const p = await paymentsOf(row.id);
        assert(p.length === 1 && p[0].provider === "demo" && p[0].status === "paid" && p[0].method === "bca_va" && p[0].fee === 0, `payments ${JSON.stringify(p)}`);
        const stockAfter = await variantStock();
        assert(stockAfter === stockBefore - 2, `stock ${stockBefore} -> ${stockAfter}`);
        assert(!/demo/i.test(successTxt), "success page says demo");
        return `${number}: ${p[0].reference} (bca_va) paid, no gateway payment; stock ${stockBefore} -> ${stockAfter}; success page without demo`;
      } finally {
        await ctx.close();
      }
    });

    await check("US-009.3", "Admin shows that order as an ordinary paid order: order page (BCA VA, accept step), list, overview, invoice, CSV and sales report never say demo", async () => {
      assert(skipped, "no order from US-009.2");
      const page = await open(admin, `/admin/orders/${skipped.number}`);
      await settle(page);
      const method = await page.locator("dt", { hasText: /^Method$/ }).last().locator("xpath=following-sibling::dd[1]").innerText();
      const accept = await page.getByRole("button", { name: /accept/i }).count();
      const txt = await page.locator("body").innerText();
      await page.close();
      assert(method.trim() === "BCA VA", `order page method "${method}"`);
      assert(accept > 0, "no accept / decline step after the instant payment");
      assert(!/demo/i.test(txt), "order page says demo");
      const list = await open(admin, `/admin/orders?q=${skipped.number}`);
      await settle(list);
      const row = await list.locator("tbody tr", { hasText: skipped.number }).innerText();
      const listTxt = await list.locator("body").innerText();
      await list.close();
      assert(/Paid/.test(row) && !/demo/i.test(listTxt), `list "${row.replace(/\s+/g, " ")}"`);
      for (const route of ["/admin", `/admin/invoice/${skipped.number}`, "/admin/reports?range=30d", "/admin/reports?range=all"]) {
        assert(!/demo/i.test(await adminText(route)), `${route} says demo`);
      }
      const csv = await (await admin.request.get(`/admin/orders/export?q=${skipped.number}`)).text();
      assert(csv.includes("BCA Virtual Account") && !/demo/i.test(csv), `CSV: ${csv.split("\r\n")[1]}`);
      return `order page "${method.trim()}", list row, overview, invoice, reports, CSV: no demo`;
    });

    await check("US-009.4", "The paid email and the customer's order page show an ordinary paid order (no demo wording)", async () => {
      assert(skipped, "no order from US-009.2");
      let mail = null;
      for (let i = 0; i < 20 && !mail; i++) {
        const msgs = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()).messages ?? [];
        mail = msgs.find((m) => m.Subject === `Order ${skipped.number} is paid`) ?? null;
        if (!mail) await sleep(500);
      }
      assert(mail, "no 'Order … is paid' email");
      const body = await (await fetch(`${MAILPIT}/api/v1/message/${mail.ID}`)).json();
      assert(/BCA Virtual Account/.test(body.Text) && !/demo/i.test(body.Text + body.HTML), "email names no method or says demo");
      // The guest's order page through the email's own link.
      const link = body.Text.match(/https?:\/\/\S+\/orders\/DB-\d+\?t=\S+/)?.[0];
      assert(link, "paid email has no order link");
      const ctx = await newCtx();
      try {
        const page = await open(ctx, new URL(link).pathname + new URL(link).search);
        await settle(page);
        const txt = await page.locator("main").innerText();
        await page.close();
        assert(/BCA Virtual Account/.test(txt) && /Paid/.test(txt), "order page lacks the paid method");
        assert(!/demo/i.test(txt), "order page says demo");
      } finally {
        await ctx.close();
      }
      return `"${mail.Subject}" email and order page: BCA Virtual Account, no demo`;
    });

    await check("US-009.5", "Declining that order: the dialog asks for no refund, then no refund alert or MARK AS REFUNDED, and still no demo wording", async () => {
      assert(skipped, "no order from US-009.2");
      const page = await open(admin, `/admin/orders/${skipped.number}`);
      await settle(page);
      await page.getByRole("button", { name: "DECLINE ORDER", exact: true }).click();
      const dialog = page.getByRole("alertdialog");
      await dialog.waitFor({ state: "visible" });
      const dialogText = await dialog.innerText();
      assert(!/refund/i.test(dialogText) && !/demo/i.test(dialogText), `dialog: ${dialogText.slice(0, 200)}`);
      await dialog.getByText("Some items sold out today").click();
      await dialog.getByRole("button", { name: "DECLINE ORDER", exact: true }).click();
      for (let i = 0; i < 30 && (await orderOf(skipped.id)).fulfilment_status !== "cancelled"; i++) await sleep(1000);
      await page.close();
      assert((await orderOf(skipped.id)).fulfilment_status === "cancelled", "not declined");
      const after = await open(admin, `/admin/orders/${skipped.number}`);
      await settle(after);
      const txt = await after.locator("body").innerText();
      const refundButton = await after.getByRole("button", { name: "MARK AS REFUNDED", exact: true }).count();
      await after.close();
      assert(refundButton === 0 && !/refund needed/i.test(txt), "refund alert shown for an order that moved no money");
      assert(!/demo/i.test(txt), "order page says demo");
      return `${skipped.number}: declined; no refund wording in the dialog, no refund alert, no demo`;
    });
  }

  await check("US-007.6", "Customer cancels an unpaid order from the pay page (no Pay later; in-page confirm, Keep order backs out): payment closed, order cancelled, order page and email say the customer cancelled", async () => {
    const c = await demoOrder();
    const page = await open(alya, `/checkout/pay/${c.number}`);
    await page.locator("#pay-va-number").waitFor({ state: "visible" });
    assert((await page.getByText(/PAY LATER/i).count()) === 0, "PAY LATER still shown");
    const cancel = page.getByRole("button", { name: "CANCEL ORDER", exact: true });
    const yes = page.getByRole("button", { name: "YES, CANCEL ORDER", exact: true });
    await cancel.click();
    await page.getByRole("button", { name: "KEEP ORDER", exact: true }).click();
    await cancel.waitFor({ state: "visible" });
    assert((await orderOf(c.id)).fulfilment_status === "pending", "cancelled without confirming");
    await cancel.click();
    await Promise.all([page.waitForURL(new RegExp(`/orders/${c.number}`), { timeout: 60_000 }), yes.click()]);
    const txt = await page.locator("main").innerText();
    await page.close();
    const o = await orderOf(c.id);
    const p = await paymentsOf(c.id);
    assert(o.fulfilment_status === "cancelled" && o.payment_status === "expired", JSON.stringify(o));
    assert(p.length === 1 && p[0].status === "expired", `payments ${JSON.stringify(p)}`);
    assert(/You cancelled this order/.test(txt), "order page lacks 'You cancelled this order'");
    let mail = null;
    for (let i = 0; i < 20 && !mail; i++) {
      const msgs = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()).messages ?? [];
      mail = msgs.find((m) => m.Subject === `Order ${c.number} was cancelled`) ?? null;
      if (!mail) await sleep(500);
    }
    assert(mail, "no 'Order … cancelled' email");
    const body = await (await fetch(`${MAILPIT}/api/v1/message/${mail.ID}`)).json();
    assert(/as you asked/i.test(body.Text) && !/had to cancel/.test(body.Text), "email doesn't say the customer cancelled");
    return `${c.number}: cancelled, ${p[0].reference} expired; order page + "${mail.Subject}" email`;
  });

  // ============================================================ US-011 order handling (refund, timeline, receipt)
  // Orders come from demoOrder (Alya, pickup, 2 Red Velvet, a live mock BCA VA payment) and are deleted
  // with their emails afterwards. The paid one is paid through the mock gateway's simulate button, so its
  // payment is real money as far as the app knows (provider mock): it owes a refund once cancelled.
  const mailsFor = async (number) =>
    ((await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()).messages ?? []).filter((m) => m.Subject.includes(number));
  const waitMail = async (subject) => {
    for (let i = 0; i < 30; i++) {
      const msgs = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()).messages ?? [];
      const mail = msgs.find((m) => m.Subject === subject);
      if (mail) return { ...mail, body: await (await fetch(`${MAILPIT}/api/v1/message/${mail.ID}`)).json() };
      await sleep(500);
    }
    throw new Error(`no "${subject}" email`);
  };
  const timesOf = (id) => one("SELECT accepted_at, handed_off_at, completed_at, cancelled_at, refunded_at, refund_note, cancel_reason FROM orders WHERE id=?", [id]);

  await check("US-011.1", "Customer changes payment method: a 'New payment details' email with the new VA only (old VA not in it)", async () => {
    const c = await demoOrder();
    const page = await open(alya, `/checkout/pay/${c.number}?change=1`);
    await settle(page);
    await page.locator('input[name="method"][value="mandiri_va"]').check({ force: true });
    await Promise.all([
      page.waitForURL((u) => u.pathname === `/checkout/pay/${c.number}` && !u.search.includes("change=1"), { timeout: 60_000 }),
      page.getByRole("button", { name: "USE THIS METHOD", exact: true }).click(),
    ]);
    await page.close();
    const p = await paymentsOf(c.id);
    const live = p.at(-1);
    assert(p.length === 2 && p[0].status === "expired" && live.status === "awaiting" && live.method === "mandiri_va", `payments ${JSON.stringify(p)}`);
    const mail = await waitMail(`Order ${c.number} has new payment details`);
    const va = (await one("SELECT va_number FROM payments WHERE reference=?", [live.reference])).va_number;
    assert(va && mail.body.Text.includes(va), `email lacks the new VA ${va}`);
    assert(!mail.body.Text.includes("8077 1234 5678 9012"), "email still has the old VA");
    assert(/Mandiri/.test(mail.body.Text), "email doesn't name the new method");
    return `${c.number}: ${p[0].reference} expired, ${live.reference} (mandiri_va) live; "${mail.Subject}" has ${va}`;
  });

  // One order through the whole paid life: paid (mock) -> waiting marker -> accepted -> ready -> cancelled by the store -> refunded.
  const life = await demoOrder();
  let lifeStock = null;
  await check("US-011.2", "Paid order: receipt for the customer (no gateway ids), 404 for others and unpaid orders; paid email has the breakdown and the receipt link; 'Waiting … min' after 30 min", async () => {
    const unpaidStatus = (await alya.request.get(`${BASE}/orders/${life.number}/invoice`)).status();
    assert(unpaidStatus === 404, `unpaid order receipt -> ${unpaidStatus}`);
    lifeStock = await variantStock();
    const pay = await open(alya, `/checkout/pay/${life.number}`);
    await settle(pay);
    await Promise.all([pay.waitForURL(/\/checkout\/success\//, { timeout: 60_000 }), pay.getByRole("button", { name: /Simulate payment/i }).click()]);
    await pay.close();
    const o = await orderOf(life.id);
    assert(o.payment_status === "paid" && o.fulfilment_status === "pending" && o.stock_deducted === 1, JSON.stringify(o));
    assert((await variantStock()) === lifeStock - 2, "stock not taken");

    const receipt = await open(alya, `/orders/${life.number}/invoice`);
    await settle(receipt);
    const txt = await receipt.locator("main").innerText();
    await receipt.close();
    assert(/Receipt/.test(txt) && txt.includes(life.number) && /Paid/.test(txt) && txt.includes(rp(10000)), "receipt lacks title, number, status or total");
    assert(!txt.includes(`${life.number}-1`) && !/demo/i.test(txt), "receipt shows a gateway reference or demo wording");
    const guest = await get(`/orders/${life.number}/invoice`);
    assert(guest.status === 404, `guest without token got ${guest.status}`);

    const paid = await waitMail(`Order ${life.number} is paid`);
    const link = paid.body.Text.match(/https?:\/\/\S+\/orders\/DB-\d+\/invoice\?t=\S+/)?.[0];
    assert(link, "paid email has no receipt link");
    assert(/Subtotal: /.test(paid.body.Text) && /Pickup: /.test(paid.body.Text) && /Total paid: /.test(paid.body.Text), "paid email lacks Subtotal / Pickup / Total paid rows");
    const viaToken = await get(new URL(link).pathname + new URL(link).search);
    assert(viaToken.status === 200 && viaToken.text.includes(life.number), `receipt link from the email -> ${viaToken.status}`);

    // Paid 45 minutes ago and still new: the orders list marks it.
    await q("UPDATE payments SET paid_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 45 MINUTE) WHERE order_id=? AND status='paid'", [life.id]);
    const list = await open(admin, `/admin/orders?q=${life.number}`);
    const row = await list.locator("tbody tr").filter({ hasText: life.number }).innerText();
    await list.close();
    assert(/Waiting 4\d min/.test(row), `no "Waiting 45 min" in the row: ${row.replace(/\s+/g, " ")}`);
    return `${life.number}: paid (mock), receipt 200 for Alya / via email link, 404 for a guest and while unpaid; row says "${row.match(/Waiting \d+ min/)[0]}"`;
  });

  await check("US-011.3", "Store accepts, hands off, then cancels the paid order with a reason: timeline times set, stock back once, cancel email promises the refund within 1×24 hours", async () => {
    await acceptOrder(admin, life.number);
    await setFulfilment(admin, life.number, "Ready for pickup");
    let t = await timesOf(life.id);
    assert(t.accepted_at && t.handed_off_at && !t.cancelled_at, `times after hand-off ${JSON.stringify(t)}`);

    const page = await open(admin, `/admin/orders/${life.number}`);
    await settle(page);
    await page.locator('button[aria-haspopup="listbox"]').first().click();
    await page.getByRole("option", { name: "Cancelled", exact: true }).click();
    await page.locator("form:has(input[name=orderNumber]) button[type=submit]").click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByText("Another reason").click();
    await dialog.getByRole("button", { name: "CANCEL ORDER", exact: true }).click();
    await dialog.getByText("Write the reason, or pick one above.").first().waitFor({ timeout: 10_000 });
    await dialog.getByRole("textbox").fill("Oven broke down");
    await dialog.getByRole("button", { name: "CANCEL ORDER", exact: true }).click();
    for (let i = 0; i < 30 && (await orderOf(life.id)).fulfilment_status !== "cancelled"; i++) await sleep(1000);
    await page.close();
    const o = await orderOf(life.id);
    t = await timesOf(life.id);
    assert(o.fulfilment_status === "cancelled" && o.payment_status === "paid" && o.stock_deducted === 0, JSON.stringify(o));
    assert(t.cancelled_at && t.cancel_reason === "Oven broke down", `times ${JSON.stringify(t)}`);
    assert((await variantStock()) === lifeStock, `stock ${await variantStock()} vs ${lifeStock} before payment`);

    const mail = await waitMail(`Order ${life.number} was cancelled`);
    assert(/Oven broke down/.test(mail.body.Text) && /within 1×24 hours to refund the full amount/.test(mail.body.Text), "cancel email lacks the reason or the refund promise");
    const cust = await open(alya, `/orders/${life.number}`);
    const txt = await cust.locator("main").innerText();
    await cust.close();
    assert(/The shop had to cancel this order: Oven broke down\. We'll contact you within 1×24 hours/.test(txt), "customer page lacks the store-cancel + refund sentence");
    return `${life.number}: baking -> ready -> cancelled ("Oven broke down"); stock back to ${lifeStock}; email + order page promise the refund`;
  });

  await check("US-011.4", "Mark as refunded (in-page confirm, optional note): refunded_at set once, one 'Refund sent' email, admin shows a quiet line + timeline, customer page and receipt say refunded", async () => {
    const page = await open(admin, `/admin/orders/${life.number}`);
    await settle(page);
    await page.getByRole("button", { name: "MARK AS REFUNDED", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "GO BACK", exact: true }).click();
    assert(!(await timesOf(life.id)).refunded_at, "refunded without confirming");
    await page.getByRole("button", { name: "MARK AS REFUNDED", exact: true }).click();
    await dialog.getByRole("textbox").fill("BCA transfer e2e");
    await dialog.getByRole("button", { name: "MARK REFUNDED", exact: true }).click();
    for (let i = 0; i < 30 && !(await timesOf(life.id)).refunded_at; i++) await sleep(500);
    await page.reload();
    await settle(page);
    const adminTxt = await page.locator("main").innerText();
    await page.close();
    const t = await timesOf(life.id);
    assert(t.refunded_at && t.refund_note === "BCA transfer e2e", JSON.stringify(t));
    assert(/Refunded Rp10\.000 on .* WIB\./.test(adminTxt) && !/MARK AS REFUNDED/.test(adminTxt), "admin page still shows the alert / lacks the refunded line");
    for (const label of ["Placed", "Paid", "Accepted, baking started", "Ready for pickup", "Cancelled", "Refunded"]) {
      assert(new RegExp(`${label}\\s+\\d+ \\w+ \\d{4}, \\d{2}:\\d{2} WIB`).test(adminTxt), `timeline lacks ${label}`);
    }
    const mail = await waitMail(`Order ${life.number} was refunded`);
    assert(/Rp10\.000/.test(mail.body.Text) && !/BCA transfer e2e/.test(mail.body.Text), "refund email lacks the amount or shows the store's note");
    const cust = await open(alya, `/orders/${life.number}`);
    const txt = await cust.locator("main").innerText();
    await cust.close();
    assert(/Your payment was refunded on .* WIB\./.test(txt), "customer page lacks 'refunded on'");
    const receipt = await open(alya, `/orders/${life.number}/invoice`);
    await settle(receipt);
    const rtxt = await receipt.locator("main").innerText();
    await receipt.close();
    assert(/Cancelled · refunded .* WIB/.test(rtxt), "receipt lacks 'Cancelled · refunded'");
    await sleep(1500);
    const sent = (await mailsFor(life.number)).filter((m) => m.Subject === `Order ${life.number} was refunded`).length;
    assert(sent === 1, `${sent} refund emails`);
    return `${life.number}: refunded_at + note saved; 1 refund email; admin line + timeline (6 steps); customer page + receipt say refunded`;
  });

  await check("US-011.5", "Customer order page: step times under reached steps (Baking at the acceptance time); 'usually within 30 minutes' while waiting for the shop", async () => {
    const c = await demoOrder();
    await q("UPDATE payments SET status='paid', paid_at=UTC_TIMESTAMP(3) WHERE order_id=?", [c.id]);
    await q("UPDATE orders SET payment_status='paid' WHERE id=?", [c.id]);
    const page = await open(alya, `/orders/${c.number}`);
    const waiting = await page.locator("main").innerText();
    await q("UPDATE orders SET fulfilment_status='baking', accepted_at=UTC_TIMESTAMP(3) WHERE id=?", [c.id]);
    await page.reload();
    const steps = await page.locator("section[aria-labelledby=order-progress] ol").innerText();
    await page.close();
    assert(/usually within 30 minutes during opening hours/.test(waiting), "confirming text lacks the 30 minutes");
    const times = steps.match(/\d{2}:\d{2}/g) ?? [];
    assert(times.length === 3, `expected 3 step times (payment, confirmed, baking), saw ${times.length}: ${steps.replace(/\s+/g, " ")}`);
    assert(/Baking\s+\d{2}:\d{2}/.test(steps), `Baking has no time: ${steps.replace(/\s+/g, " ")}`);
    return `${c.number}: steps show ${times.join(", ")}`;
  });

  await check("US-007.4", "Internal links on /, /menu, /our-story (header, nav menu, footer, CTAs) return non-404", async () => {
    const links = new Map(); // path -> first seen on
    for (const route of ["/", "/menu", "/our-story"]) {
      const page = await open(guest, route);
      await settle(page);
      await page.locator('header button[aria-label][aria-haspopup="dialog"]').first().click(); // open nav menu
      await sleep(400);
      const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
      await page.close();
      for (const h of hrefs) {
        if (!h || h.startsWith("#") || /^(mailto:|tel:|javascript:)/.test(h)) continue;
        let u;
        try {
          u = new URL(h, BASE);
        } catch {
          continue;
        }
        if (u.origin !== new URL(BASE).origin) continue;
        const p = u.pathname + u.search;
        if (!links.has(p)) links.set(p, route);
      }
    }
    const bad = [];
    for (const [p, from] of links) {
      const r = await get(p);
      if (r.status === 404 || r.status >= 500) bad.push(`${p} (from ${from}) -> ${r.status}`);
    }
    assert(bad.length === 0, bad.join("; "));
    return `${links.size} unique internal links OK`;
  });

  // ============================================================ US-008 Continue with Google
  // Adaptive: the dev server's env decides whether Google is configured (GOOGLE_CLIENT_ID + SECRET).
  const googleStart = await fetch(BASE + "/auth/google?next=%2Fcheckout", { redirect: "manual" });
  const googleLocation = googleStart.headers.get("location") ?? "";
  const googleOn = googleLocation.startsWith("https://accounts.google.com/");
  await check("US-008.1", `Google ${googleOn ? "configured" : "not configured"}: /auth/google ${googleOn ? "-> Google (code, PKCE S256, openid email profile, callback, state) + oauth cookies" : "-> /sign-in"}`, async () => {
    assert(googleStart.status >= 300 && googleStart.status < 400, `status ${googleStart.status}`);
    if (!googleOn) {
      assert(new URL(googleLocation, BASE).pathname === "/sign-in", `location ${googleLocation}`);
      return googleLocation;
    }
    const u = new URL(googleLocation);
    const p = u.searchParams;
    const scopes = (p.get("scope") ?? "").split(" ");
    assert(p.get("response_type") === "code", `response_type ${p.get("response_type")}`);
    assert(p.get("code_challenge_method") === "S256" && p.get("code_challenge"), "no PKCE S256");
    assert(["openid", "email", "profile"].every((s) => scopes.includes(s)), `scope ${p.get("scope")}`);
    assert(p.get("redirect_uri") === `${BASE}/auth/google/callback`, `redirect_uri ${p.get("redirect_uri")}`);
    const state = p.get("state");
    assert(state && p.get("client_id"), "no state / client_id");
    const cookies = googleStart.headers.getSetCookie();
    const jar = Object.fromEntries(cookies.map((c) => [c.split("=")[0], c]));
    assert(jar.g_oauth_state?.startsWith(`g_oauth_state=${state};`), "state cookie != state param");
    assert(jar.g_oauth_verifier && jar.g_oauth_next?.startsWith("g_oauth_next=%2Fcheckout;"), "verifier/next cookies missing");
    assert(cookies.every((c) => /HttpOnly/i.test(c) && /SameSite=lax/i.test(c) && /Path=\/auth\/google/i.test(c) && /Max-Age=600/i.test(c)), cookies.join(" | "));
    return `${u.origin}${u.pathname} scope="${p.get("scope")}" redirect_uri=${p.get("redirect_uri")}`;
  });

  for (const route of ["/sign-in?next=%2Fcheckout", "/sign-up?next=%2Fcheckout"]) {
    await check("US-008.2", `${route.split("?")[0]} ${googleOn ? "shows" : "hides"} the Continue with Google button`, async () => {
      const r = await get(route);
      assert(r.status === 200, `status ${r.status}`);
      const hrefs = [...r.text.matchAll(/href="(\/auth\/google[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
      if (!googleOn) {
        assert(hrefs.length === 0, `button present: ${hrefs.join(", ")}`);
        return "hidden";
      }
      assert(hrefs.length === 1 && hrefs[0] === "/auth/google?next=%2Fcheckout", `hrefs ${JSON.stringify(hrefs)}`);
      assert(/CONTINUE WITH GOOGLE/.test(r.text), "label missing");
      return hrefs[0];
    });
  }

  await check("US-008.3", "/auth/google/callback?state=x&code=y without oauth cookies -> /sign-in?error=google (cancel -> google_cancelled, alert shown)", async () => {
    const r = await fetch(BASE + "/auth/google/callback?state=x&code=y", { redirect: "manual" });
    const loc = new URL(r.headers.get("location") ?? "", BASE);
    if (!googleOn) {
      assert(loc.pathname === "/sign-in", `location ${loc}`);
      return `${loc.pathname}${loc.search}`;
    }
    assert(loc.pathname === "/sign-in" && loc.searchParams.get("error") === "google", `location ${loc.pathname}${loc.search}`);
    assert(!(r.headers.get("set-cookie") ?? "").includes("db_session=ey"), "a session was created");
    const cancel = await fetch(BASE + "/auth/google/callback?error=access_denied&state=x", { redirect: "manual" });
    const cancelLoc = new URL(cancel.headers.get("location") ?? "", BASE);
    assert(cancelLoc.searchParams.get("error") === "google_cancelled", `cancel -> ${cancelLoc.pathname}${cancelLoc.search}`);
    const page = await get(`${cancelLoc.pathname}${cancelLoc.search}`);
    assert(/role="alert"[^>]*>Google sign-in was cancelled/.test(page.text), "cancel alert not shown");
    return `${loc.pathname}${loc.search}; cancel -> ${cancelLoc.search}`;
  });

  const consoleRoutes = [
    ["/", guest], ["/menu", guest], ["/menu/chocolate-chunk", guest], ["/our-story", guest], ["/location", guest], ["/faq", guest],
    ["/sign-in", await newCtx()], ["/account", alya], ["/admin", admin],
  ];
  for (const [route, ctx] of consoleRoutes) {
    await check("US-007.5", `No console errors / page errors on ${route}`, async () => {
      const page = await ctx.newPage();
      page.setDefaultTimeout(45_000);
      const errs = [];
      page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error") errs.push(`console.error: ${m.text()} @ ${m.location().url}`);
      });
      await page.goto(route, { waitUntil: "load", timeout: 90_000 });
      await settle(page);
      await sleep(800);
      await page.close();
      assert(errs.length === 0, errs.slice(0, 3).join(" || "));
      return "clean";
    });
  }

  // ============================================================ US-010 store hours, fees, review, guest orders
  // Guest checkout of one Red Velvet (pickup) up to the payment step; a guest's paid order (inserted) for the
  // lookup, success page and sign-up claim. Everything created is deleted afterwards with its emails.
  const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const mailsTo = async (address) =>
    ((await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()).messages ?? []).filter((m) => m.To.some((t) => t.Address === address));
  const deleteMailsTo = async (address) => {
    const ids = (await mailsTo(address)).map((m) => m.ID);
    if (ids.length) await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ IDs: ids }) });
    return ids.length;
  };
  const closedEmail = `e2e-closed-${RUN}@example.test`;
  const checkoutCtx = await newCtx();
  undo.push(async () => {
    await checkoutCtx.close().catch(() => {});
    const placed = await q("DELETE FROM orders WHERE email=?", [closedEmail]);
    cleanupLog.push(`US-010 checkout: ${placed.affectedRows} order(s) deleted (expected 0)`);
  });
  let payPage = null;

  await check("US-010.1", "Shop closed (today not an open day): both checkout steps say when orders open again, Continue / PAY / PAY INSTANTLY are disabled, a forced submit places nothing", async () => {
    await checkoutCtx.addCookies([{ name: "db_cart", value: encodeURIComponent(JSON.stringify([{ v: String(DEMO_VARIANT), q: 1 }])), url: BASE }]);
    payPage = await open(checkoutCtx, "/checkout");
    await settle(payPage);
    await payPage.locator('input[name="fulfilment"][value="pickup"]').check({ force: true });
    await payPage.locator("#checkout-email").fill(closedEmail);
    await payPage.locator("#checkout-fullName").fill("Closed Test");
    await payPage.locator("#checkout-phone").fill("0812-3456-7890");
    await Promise.all([payPage.waitForURL(/\/checkout\/payment/, { timeout: 60_000 }), payPage.locator("form button[type=submit]").first().click()]);
    // Only tomorrow (WIB) open, 07:00–21:00: closed now, opens tomorrow at 07:00, last order 20:30.
    const today = (new Date(Date.now() + 7 * 3600e3).getUTCDay() + 6) % 7;
    await q("UPDATE store_settings SET opens_at='07:00', closes_at='21:00', open_days=? WHERE id=1", [WEEK[(today + 1) % 7]]);
    try {
      await payPage.reload();
      await settle(payPage);
      const notice = (await payPage.locator("#payment-closed").innerText()).replace(/\s+/g, " ");
      assert(/We're closed right now\. Orders open again tomorrow \(\w+\) at 07:00\. Open 07:00–21:00 WIB · last order 20:30\./.test(notice), `notice: ${notice}`);
      const pay = payPage.locator("[data-pinned-bar] button[type=submit]");
      assert(await pay.isDisabled(), "PAY enabled while closed");
      const skip = payPage.getByRole("button", { name: "PAY INSTANTLY", exact: true });
      if (await skip.count()) assert(await skip.isDisabled(), "PAY INSTANTLY enabled while closed");
      // The server refuses too: enable the button by hand and submit.
      await pay.evaluate((b) => {
        b.disabled = false;
      });
      await pay.click();
      await payPage.getByText("We're not taking orders right now").waitFor({ timeout: 30_000 });
      const placed = (await one("SELECT COUNT(*) n FROM orders WHERE email=?", [closedEmail])).n;
      assert(placed === 0, `${placed} order(s) placed while closed`);
      const details = await open(checkoutCtx, "/checkout");
      await settle(details);
      const detailsNotice = await details.locator("#checkout-closed").isVisible();
      const cont = await details.locator("[data-pinned-bar] button[type=submit]").isDisabled();
      await details.close();
      assert(detailsNotice && cont, `details step: notice ${detailsNotice}, Continue disabled ${cont}`);
      return `"${notice}"; refused server-side, 0 orders`;
    } finally {
      await alwaysOpen();
    }
  });

  await check("US-010.2", "Payment step: review shows name · phone · email; fee hints only when the gateway adds a fee, and PAY names the total with it", async () => {
    assert(payPage, "no payment page from US-010.1");
    await payPage.reload();
    await settle(payPage);
    const main = (await payPage.locator("main").innerText()).replace(/\s+/g, " ");
    assert(main.includes(`Closed Test · 0812-3456-7890 · ${closedEmail}`), "contact row lacks name · phone · email");
    assert((await payPage.locator("#payment-closed").count()) === 0, "closed notice while open");
    await payPage.locator('input[name="method"][value="bca_va"]').check({ force: true });
    const label = await payPage.locator("[data-pinned-bar] button[type=submit]").innerText();
    const hints = await payPage.getByText(/^\+ Rp[\d.]+ service fee$/).count();
    const note = (await payPage.locator("#payment-fee-note").count()) ? await payPage.locator("#payment-fee-note").innerText() : null;
    if (note === null) {
      assert(hints === 0 && /^PAY Rp[\d.]+$/.test(label.trim()), `no fee: ${hints} hints, button "${label}"`);
      return `no service fee (mock): no hints, button "${label.trim()}"`;
    }
    assert(hints > 0 && /^PAY Rp[\d.]+$/.test(label.trim()) && /Includes the Rp[\d.]+ payment service fee/.test(note), `fee: ${hints} hints, "${label}", note "${note}"`);
    return `${hints} fee hints, button "${label.trim()}", note "${note}"`;
  });
  if (payPage) await payPage.close().catch(() => {});

  // A paid guest order (no account) for the lookup, success page and claim, plus one with the same email
  // that already belongs to Alya: the claim must leave that one alone.
  const guestEmail = `e2e-guest-${RUN}@example.test`;
  async function guestOrder(userId) {
    const max = (await one("SELECT MAX(CAST(SUBSTRING(order_number, 4) AS UNSIGNED)) n FROM orders WHERE order_number LIKE 'DB-%'")).n ?? 0;
    const number = `DB-${String(Number(max) + 1).padStart(4, "0")}`;
    const r = await q(
      `INSERT INTO orders (order_number, user_id, customer_name, email, phone, fulfilment_method, subtotal, delivery_fee, total, payment_status, created_at)
       VALUES (?, ?, 'Guest Test', ?, '0812-3456-7890', 'pickup', 10000, 0, 10000, 'paid', UTC_TIMESTAMP(3))`,
      [number, userId, guestEmail],
    );
    await q("INSERT INTO order_items (order_id, variant_id, qty, unit_price) VALUES (?, ?, 2, 5000)", [r.insertId, DEMO_VARIANT]);
    await q(
      `INSERT INTO payments (order_id, method, amount, status, provider, reference, charged_amount, fee, fee_bearer, created_at)
       VALUES (?, 'bca_va', 10000, 'paid', 'mock', ?, 10000, 0, 'merchant', UTC_TIMESTAMP(3))`,
      [r.insertId, `${number}-1`],
    );
    return { id: r.insertId, number };
  }
  const guestA = await guestOrder(null);
  const alyaSame = await guestOrder(2);
  undo.push(async () => {
    await q("DELETE FROM orders WHERE id IN (?, ?)", [guestA.id, alyaSame.id]);
    const user = await one("SELECT id FROM users WHERE email=?", [guestEmail]);
    if (user) await q("DELETE FROM users WHERE id=?", [user.id]);
    const mails = await deleteMailsTo(guestEmail).catch(() => 0);
    cleanupLog.push(`US-010 guest orders ${guestA.number}, ${alyaSame.number}${user ? ", their test account" : ""} and ${mails} email(s) deleted`);
  });

  const lookupCtx = await newCtx();
  undo.push(() => lookupCtx.close().catch(() => {}));
  let orderToken = null;
  await check("US-010.3", "/orders/find: wrong email, unknown number and the right pair all get the same 'if they match, we've emailed you a link' answer; only the match emails the order link, which opens the order", async () => {
    const page = await open(lookupCtx, "/orders/find");
    const submit = async (number, email) => {
      await page.locator("#find-order-number").fill(number);
      await page.locator("#find-order-email").fill(email);
      await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), page.locator("form:has(#find-order-number) button[type=submit]").click()]);
      await page.locator("#find-order-sent").waitFor();
      await sleep(300);
      return page.locator("#find-order-sent").innerText();
    };
    const wrongEmail = await submit(guestA.number, `nobody-${RUN}@example.test`);
    const unknown = await submit("DB-999999999", guestEmail);
    // Lowercase number without the zeros, email in capitals: still a match.
    const match = await submit(guestA.number.toLowerCase().replace(/-0+/, " "), guestEmail.toUpperCase());
    const stayed = new URL(page.url()).pathname;
    await page.close();
    assert(wrongEmail === unknown && unknown === match && /If that order number and email match, we've emailed you a link to it\./.test(match), `"${wrongEmail}" / "${unknown}" / "${match}"`);
    assert(stayed === "/orders/find", `left the lookup page for ${stayed}`);
    const subject = `Your link to order ${guestA.number}`;
    let mails = [];
    for (let i = 0; i < 30; i++) {
      mails = (await mailsTo(guestEmail)).filter((m) => m.Subject === subject);
      if (mails.length) break;
      await sleep(500);
    }
    await sleep(1500); // a stray second email (from the unknown-number try) would have arrived by now
    mails = (await mailsTo(guestEmail)).filter((m) => m.Subject === subject);
    const others = (await mailsTo(`nobody-${RUN}@example.test`)).length;
    assert(mails.length === 1 && others === 0, `${mails.length} link email(s) to the order's address, ${others} to the wrong one`);
    const body = await (await fetch(`${MAILPIT}/api/v1/message/${mails[0].ID}`)).json();
    const link = body.Text.match(new RegExp(`https?://\\S+/orders/${guestA.number}\\?t=\\S+`))?.[0];
    assert(link, "no order link in the email");
    orderToken = new URL(link).searchParams.get("t");
    // A fresh browser (not the one that asked) opens the order from the emailed link.
    const fresh = await newCtx();
    try {
      const order = await open(fresh, new URL(link).pathname + new URL(link).search);
      const txt = await order.locator("main").innerText();
      assert(txt.includes(guestA.number), "order page lacks the order number");
    } finally {
      await fresh.close();
    }
    const signIn = await get("/sign-in");
    const footer = await get("/");
    assert(/Ordered as a guest\?/.test(signIn.text) && signIn.text.includes('href="/orders/find"'), "sign-in lacks the guest lookup link");
    assert(footer.text.includes('href="/orders/find"'), "footer lacks the lookup link");
    return `same answer "${match}"; one "${subject}" email, its link opens ${guestA.number}; linked from sign-in + footer`;
  });

  await check("US-010.4", "Guest success page: 'emailed the details to <email>' and a Create account offer that prefills sign-up", async () => {
    assert(orderToken, "no token from US-010.3");
    const page = await open(lookupCtx, `/checkout/success/${guestA.number}?t=${encodeURIComponent(orderToken)}`);
    const txt = (await page.locator("main").innerText()).replace(/\s+/g, " ");
    assert(txt.includes(`We've emailed the details to ${guestEmail}.`), "no emailed line");
    assert(txt.includes("Save your details for next time"), "no account offer");
    const offer = page.getByRole("link", { name: "Create account" });
    assert((await offer.getAttribute("href")) === `/sign-up?email=${encodeURIComponent(guestEmail)}`, `href ${await offer.getAttribute("href")}`);
    await Promise.all([page.waitForURL(/\/sign-up\?email=/), offer.click()]);
    const prefilled = await page.locator("#email").inputValue();
    await page.close();
    assert(prefilled === guestEmail, `sign-up email "${prefilled}"`);
    return `emailed line + offer; sign-up prefilled with ${prefilled}`;
  });

  // US-010.5–7: the guest signs up with a password (the claim link is emailed); a second account
  // ("another account", whose sign-up name looks like a link) must not be able to take the orders.
  const otherEmail = `e2e-other-${RUN}@example.test`;
  undo.push(async () => {
    const r = await q("DELETE FROM users WHERE email=?", [otherEmail]);
    const mails = await deleteMailsTo(otherEmail).catch(() => 0);
    cleanupLog.push(`US-010 other account: ${r.affectedRows} user(s) and ${mails} email(s) deleted`);
  });
  const signUp = async (ctx, email, name, password) => {
    const page = await open(ctx, `/sign-up?email=${encodeURIComponent(email)}`);
    await page.locator("#fullName").fill(name);
    await page.locator("#password").fill(password);
    await page.locator("#confirm").fill(password);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-up"), { timeout: 60_000 }), page.locator("form button[type=submit]").click()]);
    return page;
  };
  const waitMailTo = async (address, subject) => {
    for (let i = 0; i < 30; i++) {
      const mail = (await mailsTo(address)).find((m) => m.Subject === subject);
      if (mail) return await (await fetch(`${MAILPIT}/api/v1/message/${mail.ID}`)).json();
      await sleep(500);
    }
    return null;
  };
  const NEUTRAL = "If you've ordered as a guest with this email, we've emailed you a link to add those orders to your account.";
  const ownerCtx = await newCtx();
  const otherCtx = await newCtx();
  undo.push(async () => {
    await ownerCtx.close().catch(() => {});
    await otherCtx.close().catch(() => {});
  });
  let claimPath = null;
  const guestOwner = async () => (await one("SELECT user_id FROM orders WHERE id=?", [guestA.id])).user_id;

  await check("US-010.5", "Password sign-up: /account shows the same neutral 'if you ordered as a guest' notice with or without guest orders (no count); the claim email states the count; the welcome greets a plain name, and no name when it looks like a link", async () => {
    const page = await signUp(ownerCtx, guestEmail, "Guest Test", "guest12345");
    assert(new URL(page.url()).pathname === "/account" && new URL(page.url()).search === "?claim=1", `after sign-up: ${page.url()}`);
    const notice = await page.locator("#account-linked").innerText();
    await page.close();
    assert(notice === NEUTRAL, `sign-up notice "${notice}"`);
    assert((await guestOwner()) === null, "guest order linked before the email was verified");
    const other = await signUp(otherCtx, otherEmail, "Visit evil.com now", "other12345");
    const otherUrl = new URL(other.url());
    const otherNotice = await other.locator("#account-linked").innerText();
    await other.close();
    assert(otherUrl.pathname === "/account" && otherUrl.search === "?claim=1" && otherNotice === NEUTRAL, `no guest orders: ${otherUrl.pathname}${otherUrl.search} "${otherNotice}"`);
    const claimMail = await waitMailTo(guestEmail, "Add your past order to your Droolbites account");
    assert(claimMail, "no 'Add your past order' email");
    const link = claimMail.Text.match(/https?:\/\/\S+\/account\/claim\?t=\S+/)?.[0];
    assert(link, "no /account/claim link in the email");
    claimPath = new URL(link).pathname + new URL(link).search;
    const welcome = await waitMailTo(guestEmail, "Welcome to Droolbites");
    assert(welcome?.Text.includes("Hi Guest Test, your Droolbites account is ready."), "welcome email doesn't greet by name");
    const otherWelcome = await waitMailTo(otherEmail, "Welcome to Droolbites");
    assert(otherWelcome?.Text.includes("Hi, your Droolbites account is ready.") && !otherWelcome.Text.includes("evil"), "link-like name appears in the welcome email");
    const otherClaim = (await mailsTo(otherEmail)).filter((m) => /past order/.test(m.Subject)).length;
    assert(otherClaim === 0, `${otherClaim} claim email(s) for an address without guest orders`);
    return `neutral notice for both; "${claimMail.Subject}" -> ${new URL(link).pathname}; welcome "Hi Guest Test" / plain "Hi"`;
  });

  await check("US-010.6", "Claim link changes nothing unless the account it was sent for confirms: signed out it asks to sign in (also via the old /auth/claim-orders URL); another account sees 'for another account' and no button; a confirm page left open then submitted as another account adds nothing", async () => {
    assert(claimPath, "no claim link from US-010.5");
    const anon = await newCtx();
    try {
      const page = await open(anon, claimPath);
      const signInUrl = new URL(page.url());
      assert(signInUrl.pathname === "/sign-in" && signInUrl.searchParams.get("next") === claimPath, `signed out: ${page.url()}`);
      await page.goto(`/auth/claim-orders${new URL(claimPath, BASE).search}`);
      assert(new URL(page.url()).pathname === "/sign-in", `old URL signed out: ${page.url()}`);
      await page.close();
    } finally {
      await anon.close();
    }
    assert((await guestOwner()) === null, "opening the link signed out moved the order");
    const other = await open(otherCtx, claimPath);
    const otherText = (await other.locator("main").innerText()).replace(/\s+/g, " ");
    const buttons = await other.getByRole("button", { name: "ADD TO MY ACCOUNT" }).count();
    await other.close();
    assert(otherText.includes("This link is for another account.") && buttons === 0, `another account: ${buttons} button(s), "${otherText.slice(0, 120)}"`);
    assert((await guestOwner()) === null, "opening the link as another account moved the order");
    // The owner's confirm page, then the session becomes the other account's before the button is pressed.
    const stale = await open(ownerCtx, claimPath);
    await stale.getByRole("button", { name: "ADD TO MY ACCOUNT" }).waitFor();
    const ownerCookies = await ownerCtx.cookies();
    const otherSession = (await otherCtx.cookies()).find((c) => c.name === "db_session");
    assert(otherSession, "no session cookie for the other account");
    await ownerCtx.addCookies([otherSession]);
    await stale.getByRole("button", { name: "ADD TO MY ACCOUNT" }).click();
    await stale.getByRole("heading", { name: "This link is for another account." }).waitFor({ timeout: 30_000 });
    await stale.close();
    await ownerCtx.clearCookies();
    await ownerCtx.addCookies(ownerCookies);
    assert((await guestOwner()) === null, "the stale confirm moved the order to another account");
    return "signed out -> sign-in (new and old URL); other account: notice, no button; stale confirm as other account refused; order still a guest order";
  });

  await check("US-010.7", "Claim flow: link opened signed out -> sign in -> 'Add 1 past order to your account?' -> confirm adds the guest order (not Alya's), /account says so and lists it; again says they're already there; a bad token says the link doesn't work", async () => {
    assert(claimPath, "no claim link from US-010.5");
    const ctx = await newCtx();
    try {
      const page = await open(ctx, claimPath);
      assert(new URL(page.url()).pathname === "/sign-in", `signed out: ${page.url()}`);
      await page.locator("#email").fill(guestEmail);
      await page.locator("#password").fill("guest12345");
      await Promise.all([page.waitForURL((u) => u.pathname === "/account/claim", { timeout: 60_000 }), page.locator("form button[type=submit]").click()]);
      const title = await page.locator("#claim-title").innerText();
      const sub = (await page.locator("main").innerText()).replace(/\s+/g, " ");
      assert(title === "Add 1 past order to your account?" && sub.includes(`placed with ${guestEmail}`), `confirm page "${title}"`);
      assert((await guestOwner()) === null, "the confirm page moved the order before the button");
      await Promise.all([page.waitForURL(/\/account\?linked=1/, { timeout: 60_000 }), page.getByRole("button", { name: "ADD TO MY ACCOUNT" }).click()]);
      const notice = await page.locator("#account-linked").innerText();
      const listed = (await page.locator("main").innerText()).includes(guestA.number);
      const user = await one("SELECT id FROM users WHERE email=?", [guestEmail]);
      const alyas = await one("SELECT user_id FROM orders WHERE id=?", [alyaSame.id]);
      assert((await guestOwner()) === user.id, `guest order not in account ${user.id}`);
      assert(alyas.user_id === 2, `Alya's order moved to ${alyas.user_id}`);
      assert(/past order is now in your account/.test(notice) && listed, `notice "${notice}", listed ${listed}`);
      await page.goto(claimPath);
      await page.waitForURL(/\/account\?linked=0/, { timeout: 60_000 });
      const again = await page.locator("#account-linked").innerText();
      await page.goto("/account/claim?t=nope");
      const bad = await page.locator("#claim-title").innerText();
      await page.close();
      assert(/already in your account/.test(again) && /doesn't work anymore/.test(bad), `again "${again}", bad "${bad}"`);
      return `"${title}" -> ${guestA.number} in user ${user.id}, listed on /account; ${alyaSame.number} stays Alya's; again: "${again}"`;
    } finally {
      await ctx.close();
    }
  });
} finally {
  for (const fn of undo.reverse()) {
    try {
      await fn();
    } catch (e) {
      console.log(`CLEANUP ERROR: ${e.message}`);
    }
  }
  await browser.close().catch(() => {});
  await conn.end().catch(() => {});
  console.log("\nCleanup: " + (cleanupLog.length ? cleanupLog.join("; ") : "nothing to undo"));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed, ${failed.length} failed`);
  process.exitCode = failed.length ? 1 : 0;
}
