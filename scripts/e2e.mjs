// Acceptance check for PRD US-002 (storefront), US-005 (admin), US-007 (integration).
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

const cleanupLog = [];
try {
  const guest = await newCtx();
  const mobile = await newCtx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const alya = await newCtx();
  const admin = await newCtx();

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
    const dbFigures = async () => ({
      awaiting: (await one("SELECT COUNT(*) c FROM orders WHERE payment_status='awaiting'")).c,
      paid: await one("SELECT COALESCE(SUM(total),0) s, COUNT(*) c FROM orders WHERE payment_status='paid'"),
      products: (await one("SELECT COUNT(*) c FROM products WHERE is_available=1")).c,
      variants: (await one("SELECT COUNT(*) c FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.is_available=1")).c,
      recent: (await q("SELECT order_number FROM orders ORDER BY created_at DESC LIMIT 3")).map((r) => r.order_number),
    });
    let last = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const a = await dbFigures();
      const page = await open(admin, "/admin");
      await settle(page);
      const kpis = (await page.locator('p[class*="text-[44px]"]').allTextContents()).map((s) => s.trim());
      const body = await page.locator("main").innerText();
      await page.close();
      const b = await dbFigures();
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        last = "DB changed during read (other writer); retrying";
        continue;
      }
      const exp = [String(a.awaiting), rp(a.paid.s), String(a.products)];
      const rows = a.recent.every((n) => body.includes(n));
      if (JSON.stringify(kpis) === JSON.stringify(exp) && rows) {
        return `KPIs ${JSON.stringify(kpis)} == DB; recent ${a.recent.join(",")}; paid orders ${a.paid.c}, variants ${a.variants}`;
      }
      last = `UI ${JSON.stringify(kpis)} vs DB ${JSON.stringify(exp)}; recent rows present=${rows}`;
    }
    throw new Error(last);
  });

  const rowsOf = async (route) => {
    const page = await open(admin, route);
    await settle(page);
    const rows = await page.locator("tbody tr").evaluateAll((trs) => trs.map((tr) => ({ th: tr.querySelector("th")?.textContent?.trim() ?? "" })));
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
      const exp = (await q("SELECT order_number FROM orders WHERE payment_status=? ORDER BY created_at DESC, id DESC LIMIT 20", [s])).map((r) => r.order_number);
      const rows = await rowsOf(`/admin/orders?status=${s}`);
      assert(JSON.stringify(rows.map((r) => r.th)) === JSON.stringify(exp), `status=${s}: UI ${rows.map((r) => r.th)} vs DB ${exp}`);
      out.push(`${s}:${rows.length}`);
    }
    return out.join(" ");
  });

  await check("US-005.7", "Order detail changes fulfilment status; customer /orders/<n> reflects it (restored afterwards)", async () => {
    const o = await one("SELECT order_number, fulfilment_status FROM orders WHERE order_number='DB-0001'");
    assert(o && o.fulfilment_status === "baking", `DB-0001 not in baking (${o?.fulfilment_status}); cannot run`);
    undo.push(async () => {
      await q("UPDATE orders SET fulfilment_status=? WHERE order_number='DB-0001'", [o.fulfilment_status]);
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
    // Simpler flow: Contact + Delivery or pickup only (no country/province selects, delivery-method card or billing address).
    assert((await page.locator('input[name="billing"], #checkout-country, #checkout-province, input[name="deliveryMethod"]').count()) === 0, "old billing/country/method fields still rendered");
    await page.locator("#checkout-email").fill("alya@email.com");
    await page.locator("#checkout-fullName").fill("Alya Rahmawati");
    await page.locator("#checkout-street").fill("Jl. Test E2E 1");
    assert((await page.locator("#checkout-city").inputValue()) === "Surabaya", "city field is not fixed to Surabaya");
    assert(await page.locator("#checkout-city").evaluate((el) => el.readOnly), "city field is not read-only");
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
    await Promise.all([page.waitForURL(/\/checkout\/pay\//, { timeout: 60_000 }), page.locator("form button[type=submit]").last().click()]);
    orderNumber = new URL(page.url()).pathname.split("/").pop();
    assert(/^DB-\d+$/.test(orderNumber), `order number from URL: ${orderNumber}`);
    undo.push(async () => {
      await q("DELETE FROM orders WHERE order_number=?", [orderNumber]);
      cleanupLog.push(`order ${orderNumber} deleted (items/payments cascade)`);
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
    await setFulfilment(admin, orderNumber, "Baking");
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
    const want = [`Your Droolbites order ${orderNumber}`, `Payment received for ${orderNumber}`];
    let subjects = [];
    for (let i = 0; i < 15; i++) {
      const j = await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json();
      subjects = j.messages.filter((m) => m.To.some((t) => t.Address === "alya@email.com") && new Date(m.Created) >= new Date(tStart.getTime() - 60_000)).map((m) => m.Subject);
      if (want.every((w) => subjects.includes(w))) return `got: ${want.join(" | ")}`;
      await sleep(1000);
    }
    throw new Error(`missing; saw ${JSON.stringify(subjects)}`);
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
