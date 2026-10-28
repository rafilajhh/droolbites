import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { mariadbUrl } from "../src/lib/db-url";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mariadbUrl()) });

const categories = [
  { name: "Soft cookies", slug: "soft-cookies" },
  { name: "Brownies", slug: "brownies" },
  { name: "Tiramisu", slug: "tiramisu" },
];

const products = [
  {
    category: "soft-cookies",
    name: "Chocolate Chunk",
    slug: "chocolate-chunk",
    description: "Buttery dough with dark chocolate chunks.",
    variants: [{ name: "1 piece", price: 5000 }],
  },
  {
    category: "soft-cookies",
    name: "Double Chocolate",
    slug: "double-chocolate",
    description: "Soft cocoa dough with chocolate chunks.",
    variants: [{ name: "1 piece", price: 5000 }],
  },
  {
    category: "soft-cookies",
    name: "Red Velvet",
    slug: "red-velvet",
    description: "Red velvet dough with white chocolate pieces.",
    variants: [{ name: "1 piece", price: 5000 }],
  },
  {
    category: "soft-cookies",
    name: "White Chocolate Almond",
    slug: "white-chocolate-almond",
    description: "White chocolate and roasted almonds.",
    variants: [{ name: "1 piece", price: 5000 }],
  },
  {
    category: "brownies",
    name: "Fudgy Brownies",
    slug: "fudgy-brownies",
    description: "The same fudgy chocolate brownie in four tray sizes.",
    variants: [
      { name: "10 × 10 cm", price: 15000 },
      { name: "15 × 15 cm", price: 35000 },
      { name: "20 × 20 cm", price: 60000 },
      { name: "20 × 30 cm", price: 90000 },
    ],
  },
  {
    category: "tiramisu",
    name: "Classic Coffee Tiramisu",
    slug: "classic-coffee-tiramisu",
    description: "Coffee, mascarpone cream and cocoa.",
    variants: [{ name: "1 portion", price: 20000 }],
  },
  {
    category: "tiramisu",
    name: "Matcha Tiramisu",
    slug: "matcha-tiramisu",
    description: "Matcha sponge and mascarpone cream.",
    variants: [{ name: "1 portion", price: 20000 }],
  },
];

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

  await prisma.storeSettings.create({
    data: {
      id: 1,
      storeName: "Droolbites",
      city: "Surabaya",
      email: "hello@droolbites.biz.id",
      phone: "+62 896 7562 4486",
      address: "Jl. Palem Sememi Raya F16, Sememi, Benowo, Surabaya",
      opensAt: "10:00",
      closesAt: "21:00",
      deliveryFee: 15000,
    },
  });

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
        imageUrl: `/images/products/${p.slug}.png`,
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
