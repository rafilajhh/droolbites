import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { mariadbUrl } from "../src/lib/db-url";
import { categories, productImageUrl, products, storeSettings } from "./catalog";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mariadbUrl()) });

// Demo orders exactly as drawn in the design.
const demoOrders = [
  {
    orderNumber: "DB-0000",
    createdAt: new Date("2026-10-02T05:30:00Z"),
    paidAt: new Date("2026-10-02T05:41:00Z"),
    method: "pickup" as const,
    fulfilmentStatus: "completed" as const,
    paymentMethod: "qris" as const,
    items: [{ slug: "fudgy-brownies", variant: "20 × 20 cm", qty: 1 }],
  },
  {
    orderNumber: "DB-0001",
    createdAt: new Date("2026-10-18T07:00:00Z"),
    paidAt: new Date("2026-10-18T07:12:00Z"),
    method: "delivery" as const,
    fulfilmentStatus: "baking" as const,
    paymentMethod: "bca_va" as const,
    items: [
      { slug: "chocolate-chunk", variant: "1 piece", qty: 1 },
      { slug: "double-chocolate", variant: "1 piece", qty: 1 },
      { slug: "red-velvet", variant: "1 piece", qty: 1 },
      { slug: "fudgy-brownies", variant: "10 × 10 cm", qty: 1 },
      { slug: "classic-coffee-tiramisu", variant: "1 portion", qty: 1 },
      { slug: "matcha-tiramisu", variant: "1 portion", qty: 1 },
    ],
  },
];

async function main() {
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.storeSettings.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  // Restart ids at 1 so demo data (variant ids in carts, /admin/products/5/edit) is the same after every reseed.
  for (const table of ["payments", "order_items", "orders", "product_variants", "products", "categories", "users", "newsletter_subscribers"]) {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
  }

  await prisma.storeSettings.create({ data: storeSettings });

  const categoryIds = new Map<string, number>();
  for (const c of categories) {
    const row = await prisma.category.create({ data: c });
    categoryIds.set(c.slug, row.id);
  }

  for (const p of products) {
    await prisma.product.create({
      data: {
        categoryId: categoryIds.get(p.category)!,
        name: p.name,
        slug: p.slug,
        description: p.description,
        imageUrl: productImageUrl(p.slug),
        variants: { create: p.variants },
      },
    });
  }

  await prisma.user.create({
    data: {
      fullName: "Droolbites Admin",
      email: "admin@droolbites.biz.id",
      passwordHash: await bcrypt.hash("droolbites123", 10),
      role: "admin",
    },
  });

  const alya = await prisma.user.create({
    data: {
      fullName: "Alya Rahmawati",
      email: "alya@email.com",
      phone: "+62 812 3456 7890",
      passwordHash: await bcrypt.hash("alya12345", 10),
      address: "Jl. Raya Darmo No. 12, Wonokromo",
      city: "Surabaya",
      postalCode: "60241",
    },
  });

  for (const o of demoOrders) {
    const lines = [];
    for (const item of o.items) {
      const variant = await prisma.productVariant.findFirstOrThrow({
        where: { name: item.variant, product: { slug: item.slug } },
      });
      lines.push({ variantId: variant.id, qty: item.qty, unitPrice: variant.price });
    }
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
    const deliveryFee = o.method === "delivery" ? 15000 : 0;
    await prisma.order.create({
      data: {
        orderNumber: o.orderNumber,
        userId: alya.id,
        customerName: alya.fullName,
        email: alya.email,
        phone: alya.phone!,
        fulfilmentMethod: o.method,
        shippingAddress: o.method === "delivery" ? alya.address : null,
        shippingCity: o.method === "delivery" ? alya.city : null,
        shippingPostal: o.method === "delivery" ? alya.postalCode : null,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        paymentStatus: "paid",
        fulfilmentStatus: o.fulfilmentStatus,
        createdAt: o.createdAt,
        items: { create: lines },
        payments: {
          create: {
            method: o.paymentMethod,
            amount: subtotal + deliveryFee,
            vaNumber: o.paymentMethod === "bca_va" ? "8077 0812 3456 7890" : null,
            provider: "mock",
            reference: `${o.orderNumber}-1`,
            chargedAmount: subtotal + deliveryFee,
            fee: 0,
            feeBearer: "merchant",
            status: "paid",
            expiresAt: new Date(o.createdAt.getTime() + 24 * 60 * 60 * 1000),
            paidAt: o.paidAt,
            createdAt: o.createdAt,
          },
        },
      },
    });
  }

  const totals = await prisma.order.findMany({ select: { orderNumber: true, total: true } });
  console.log("Seeded:", totals);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
