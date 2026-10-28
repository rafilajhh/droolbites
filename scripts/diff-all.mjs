// Diff every pen frame against its route and write .shots/report.md.
//   node scripts/diff-all.mjs            (dev server must be running)
// Frames with interactive states use a click selector; signed-in frames use a
// session cookie made by scripts/session-token.mjs.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const token = (who) => execFileSync("node", ["scripts/session-token.mjs", who]).toString();
const customer = token("customer");
const admin = token("admin");

// Placeholders usable in frames.json route/cookies/fill: @cart6 (6-item cart cookie value),
// @checkout (signed db_checkout value), @reset (password-reset token), @vaorder (a temporary
// guest BCA VA order awaiting payment, deleted right after its frame). Variant ids are stable
// because the seed resets AUTO_INCREMENT.
const cart6 = encodeURIComponent(JSON.stringify([1, 2, 3, 5, 9, 10].map((v) => ({ v: String(v), q: 1 }))));
const mint = (kind) => execFileSync("node", ["scripts/mint.mjs", kind]).toString();
const needs = (f, ph) => JSON.stringify(f).includes(ph);
const subst = (str, v) =>
  str.replaceAll("@cart6", cart6).replaceAll("@checkout", v.checkout ?? "").replaceAll("@reset", v.reset ?? "").replaceAll("@vaorder", v.vaorder ?? "");

// [frameId, name, route, extra args]
// Optional: node scripts/diff-all.mjs id1,id2  → only those frames.
//           node scripts/diff-all.mjs --mobile [ids] → 390px full-page shots (<id>@390.png), no pen diff.
const mobile = process.argv.includes("--mobile");
const only = process.argv.slice(2).find((a) => !a.startsWith("--"))?.split(",");
const frames = JSON.parse(fs.readFileSync(new URL("./frames.json", import.meta.url), "utf8")).filter((f) => !only || only.includes(f.id));

const rows = [];
const minted = {};
for (const f of frames) {
  for (const k of ["checkout", "reset", "vaorder"]) if (needs(f, "@" + k) && !minted[k]) minted[k] = mint(k);
  const args = ["scripts/shot.mjs", subst(f.route, minted)];
  // Modal states (drawer, menu, dialogs) are pinned to the viewport: a full-page shot would
  // stitch the overlay onto the page scrolled behind it, so those use the 390×900 viewport.
  if (mobile) args.push("--width", "390", "--out", `${f.id}@390`, ...(f.mobileViewport ? [] : ["--full"]));
  else args.push("--ref", f.id);
  for (const sel of f.click ?? []) args.push("--click", sel);
  for (const x of f.fill ?? []) args.push("--fill", x);
  for (const x of f.press ?? []) args.push("--press", x);
  for (const x of f.hover ?? []) args.push("--hover", x);
  if (f.wait) args.push("--wait", String(f.wait));
  if (f.as === "customer") args.push("--cookie", `db_session=${customer}`);
  if (f.as === "admin") args.push("--cookie", `db_session=${admin}`);
  for (const c of f.cookies ?? []) args.push("--cookie", subst(c, minted));
  let out = "";
  try {
    out = execFileSync("node", args, { encoding: "utf8", timeout: 120000 });
  } catch (e) {
    out = String(e.stdout ?? "") + String(e.stderr ?? e.message);
  }
  if (minted.vaorder) {
    execFileSync("node", ["scripts/mint.mjs", "drop", minted.vaorder]);
    delete minted.vaorder;
  }
  const mismatch = out.match(/mismatch ([\d.]+)%/)?.[1] ?? "ERR";
  const size = out.match(/page (\d+×\d+)/)?.[1] ?? "";
  const refSize = out.match(/ref (\d+×\d+)/)?.[1] ?? "";
  // First browser error line, so the report says what failed instead of just "yes".
  const errors = out.includes("browser errors") ? out.split("browser errors:")[1].trim().split(/\r?\n/)[0].slice(0, 120) : "";
  rows.push({ ...f, mismatch, size, refSize, errors });
  console.log(`${f.id.padEnd(8)} ${f.name.padEnd(32)} ${mismatch.padStart(6)}%  ${refSize} → ${size} ${errors && `(console: ${errors})`}`);
}

const md = [
  "# Pen vs site diff report",
  "",
  "| Frame | Name | Route | Ref size | Page size | Mismatch % | Console errors | Note |",
  "|---|---|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.id} | ${r.name} | \`${r.route}\` | ${r.refSize} | ${r.size} | ${r.mismatch} | ${r.errors} | ${r.note ?? ""} |`),
].join("\n");
if (mobile) {
  console.log("\n→ .shots/<id>@390.png");
} else {
  fs.writeFileSync(".shots/report.md", md + "\n");
  console.log("\n→ .shots/report.md");
}
