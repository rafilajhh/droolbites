// Screenshot a route and (optionally) diff it against a pen reference PNG.
//
//   node scripts/shot.mjs <route> [--ref <penFrameId>] [--width 1440] [--height 900]
//        [--full] [--click "<css selector>"] [--cookie name=value] [--out name]
//
// Writes .shots/<name>.png, and with --ref also .shots/<name>.diff.png plus a
// mismatch percentage. References live in ../droolbites-design/ref/<id>.png
// (exported from droolbites.pen at 1x). Each run uses its own headless
// browser, so several people/agents can run it at the same time.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const args = process.argv.slice(2);
const route = args[0];
if (!route) {
  console.error("usage: node scripts/shot.mjs <route> [--ref id] [--full] [--click sel] [--width w] [--height h]");
  process.exit(1);
}
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);
const all = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));

const width = Number(opt("width", 1440));
const height = Number(opt("height", 900));
const ref = opt("ref");
const base = process.env.SHOT_BASE ?? "http://localhost:3000";
const name = opt("out", (ref ?? route.replace(/[^a-z0-9]+/gi, "_")) + (width !== 1440 ? `@${width}` : ""));
const outDir = path.resolve(".shots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
const cookies = all("cookie").map((c) => {
  const [n, ...v] = c.split("=");
  return { name: n, value: v.join("="), url: base };
});
if (cookies.length) await context.addCookies(cookies);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const res = await page.goto(base + route, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
// Hide the Next.js dev indicator so it neither pollutes diffs nor sits on top of
// buttons (at 390px it covers the bottom-left corner and swallows clicks).
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
for (const sel of all("click")) {
  await page.click(sel);
  await page.waitForTimeout(450);
}
// --fill "<sel>=<text>", --press <key>, --hover <sel>, --wait <ms> run after the clicks.
for (const f of all("fill")) {
  const i = f.lastIndexOf("=");
  await page.fill(f.slice(0, i), f.slice(i + 1));
  await page.waitForTimeout(450);
}
for (const k of all("press")) {
  await page.keyboard.press(k);
  await page.waitForTimeout(300);
}
for (const sel of all("hover")) {
  await page.hover(sel);
  await page.waitForTimeout(300);
}
if (opt("wait")) await page.waitForTimeout(Number(opt("wait")));
await page.waitForTimeout(300);

// next/image lazy-loads below-the-fold images, and a full-page screenshot does
// not scroll, so walk the page once and wait for every image before shooting.
// Back at the top the sticky header returns to its full (pen) height.
async function loadLazyImages() {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    // Only rendered images: a lazy image inside display:none (e.g. mobile-only art) never loads.
    const pending = [...document.images]
      .filter((img) => !img.complete && img.getClientRects().length > 0)
      .map(
        (img) =>
          new Promise((r) => {
            img.addEventListener("load", r, { once: true });
            img.addEventListener("error", r, { once: true });
          }),
      );
    await Promise.race([Promise.all(pending), new Promise((r) => setTimeout(r, 5000))]);
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}

const shotPath = path.join(outDir, `${name}.png`);
if (flag("full")) await loadLazyImages();
await page.screenshot({ path: shotPath, fullPage: flag("full") || (ref ? undefined : false) });
console.log(`status ${res?.status()}  →  ${shotPath}`);
if (errors.length) console.log("browser errors:\n  " + errors.slice(0, 8).join("\n  "));

if (ref) {
  const refPath = path.resolve("..", "droolbites-design", "ref", `${ref}.png`);
  const refPng = PNG.sync.read(fs.readFileSync(refPath));
  // 1440×900 frames are viewport states (overlays, admin screens): shoot the
  // viewport. Taller frames are whole pages: shoot the full page.
  const viewportFrame = refPng.height <= 900;
  await page.setViewportSize({ width: refPng.width, height: viewportFrame ? refPng.height : 900 });
  // Clicking a card scrolls it into view; viewport frames in the pen are shot at the top.
  if (viewportFrame) await page.evaluate(() => window.scrollTo(0, 0));
  else await loadLazyImages();
  await page.waitForTimeout(200);
  await page.screenshot({ path: shotPath, fullPage: !viewportFrame });
  const actual = PNG.sync.read(fs.readFileSync(shotPath));
  const w = refPng.width;
  const h = Math.max(refPng.height, actual.height);
  const pad = (png) => {
    const out = new PNG({ width: w, height: h });
    out.data.fill(255);
    PNG.bitblt(png, out, 0, 0, Math.min(png.width, w), Math.min(png.height, h), 0, 0);
    return out;
  };
  const a = pad(refPng);
  const b = pad(actual);
  const diff = new PNG({ width: w, height: h });
  const mismatched = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1 });
  const diffPath = path.join(outDir, `${name}.diff.png`);
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  console.log(
    `ref ${refPng.width}×${refPng.height}  page ${actual.width}×${actual.height}  ` +
      `mismatch ${((mismatched / (w * h)) * 100).toFixed(2)}%  →  ${diffPath}`,
  );
}

await browser.close();
