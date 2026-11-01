// Production seed: the menu, store settings and ONE admin account. No demo users,
// customers, orders or newsletter rows (those only come from the demo seed, prisma/seed.ts).
//
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='at least 12 characters' npx tsx prisma/seed-production.ts
//   (on the VPS: see docs/deploy-vps.md)
//
// Safe to re-run: rows that already exist are left as they are, so prices, photos and
// settings edited in the admin are never overwritten; missing ones are added. An existing
// admin keeps their password unless ADMIN_RESET_PASSWORD=1.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { mariadbUrl } from "../src/lib/db-url";
import { categories, productImageUrl, products, storeSettings } from "./catalog";

const BCRYPT_COST = 10; // same as src/app/actions/auth.ts
const MIN_PASSWORD = 12;
const MAX_PASSWORD = 72; // bcrypt only reads the first 72 bytes

function adminFromEnv() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const problems = [];
  if (!z.email().max(150).safeParse(email).success) problems.push("ADMIN_EMAIL must be a valid email address");
  if (password.length < MIN_PASSWORD) problems.push(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD} characters`);
  if (Buffer.byteLength(password) > MAX_PASSWORD) problems.push(`ADMIN_PASSWORD must be at most ${MAX_PASSWORD} bytes`);
  if (problems.length) {
    console.error(`Production seed refused:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  return { email, password, reset: process.env.ADMIN_RESET_PASSWORD === "1" };
}

const admin = adminFromEnv();
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mariadbUrl()) });

async function main() {
  await prisma.storeSettings.upsert({ where: { id: storeSettings.id }, create: storeSettings, update: {} });

  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
  }

  for (const p of products) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.category } });
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        categoryId: category.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        imageUrl: productImageUrl(p.slug),
      },
      update: {},
    });
    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { productId_name: { productId: product.id, name: v.name } },
        create: { productId: product.id, ...v },
        update: {},
      });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email: admin.email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        fullName: "Droolbites Admin",
        email: admin.email,
        passwordHash: await bcrypt.hash(admin.password, BCRYPT_COST),
        role: "admin",
      },
    });
    console.log(`Admin ${admin.email}: created.`);
  } else {
    const setPassword = admin.reset || !existing.passwordHash;
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "admin",
        ...(setPassword ? { passwordHash: await bcrypt.hash(admin.password, BCRYPT_COST) } : {}),
      },
    });
    const notes = [
      existing.role === "admin" ? "already admin" : "promoted to admin",
      setPassword ? "password set" : "password unchanged (ADMIN_RESET_PASSWORD=1 to replace it)",
    ];
    console.log(`Admin ${admin.email}: ${notes.join(", ")}.`);
  }

  const [categoryCount, productCount, variantCount, adminCount] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.user.count({ where: { role: "admin" } }),
  ]);
  console.log(
    `Production seed done: ${categoryCount} categories, ${productCount} products, ${variantCount} variants, ${adminCount} admin(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
