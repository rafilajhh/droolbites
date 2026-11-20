// Build the link-preview (Open Graph) images: small 1200×630 JPGs for WhatsApp, Instagram and the
// like, which drop previews much over 300 KB. The site photos themselves stay full quality; these
// files are only for sharing.
//
//   node scripts/og-images.mjs
//
// Writes public/images/og/droolbites.jpg (the hero photo with the logo badge, the site default) and
// public/images/og/products/<name>.jpg for every photo in public/images/products (the photo centred,
// its plain backdrop carried out to the sides). Re-run it after adding a product photo there. Photos
// uploaded in the admin have no preview copy and are shared as uploaded.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const W = 1200;
const H = 630;
const root = path.resolve("public/images");
const out = path.join(root, "og");
fs.mkdirSync(path.join(out, "products"), { recursive: true });
const jpg = (img) => img.jpeg({ quality: 82, mozjpeg: true });

// Site default: the hero spread with the round logo badge in the middle.
// The badge file is square; the site always shows it as a circle.
const circle = Buffer.from('<svg width="300" height="300"><circle cx="150" cy="150" r="150"/></svg>');
const badge = await sharp(path.join(root, "site/logo-badge.png"))
  .resize(300, 300)
  .composite([{ input: circle, blend: "dest-in" }])
  .png()
  .toBuffer();
await jpg(
  sharp(path.join(root, "site/hero-background.png"))
    .resize(W, H, { fit: "cover" })
    .composite([{ input: badge, gravity: "center" }]),
).toFile(path.join(out, "droolbites.jpg"));

// Products: the square photo at full height, its edge columns stretched out to the sides (the photos
// sit on a plain backdrop, so this reads as one wider shot).
for (const file of fs.readdirSync(path.join(root, "products")).filter((f) => f.endsWith(".png"))) {
  const src = path.join(root, "products", file);
  const side = (W - H) / 2;
  await jpg(sharp(src).resize(H, H).extend({ left: side, right: side, extendWith: "copy" })).toFile(
    path.join(out, "products", file.replace(/\.png$/, ".jpg")),
  );
}

for (const f of [path.join(out, "droolbites.jpg"), ...fs.readdirSync(path.join(out, "products")).map((f) => path.join(out, "products", f))]) {
  console.log(`${path.relative(process.cwd(), f)}  ${Math.round(fs.statSync(f).size / 1024)} KB`);
}
