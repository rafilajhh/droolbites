// Stock per size against the real database:  npx tsx scripts/stock.test.ts
// Creates its own product (one tracked and one untracked size) and orders, exercises the paid
// deduction, idempotency, two payments racing for the last unit, and the restore on decline, then
// deletes everything it created.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { mariadbUrl } from "../src/lib/db-url";
import { deductOrderStock, findShortLines, restoreOrderStock, stockLeft, stockStatus } from "../src/lib/stock";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mariadbUrl()) });
const RUN = Date.now().toString(36);
let productId: bigint | null = null;
const orderIds: bigint[] = [];

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

/** An unpaid order with these lines, numbered outside the shop's DB-xxxx range. */
async function makeOrder(lines: { variantId: bigint; qty: number }[]) {
  const n = orderIds.length + 1;
  const order = await prisma.order.create({
    data: {
      orderNumber: `ST${RUN.slice(-6)}${n}`.slice(0, 12),
      customerName: "Stock Test",
      email: `stock-${RUN}@example.test`,
      phone: "081234567890",
      fulfilmentMethod: "pickup",
      subtotal: 0,
      total: 0,
      items: { create: lines.map((l) => ({ variantId: l.variantId, qty: l.qty, unitPrice: 1000 })) },
    },
  });
  orderIds.push(order.id);
  return order.id;
}
const pay = (orderId: bigint) => prisma.$transaction((tx) => deductOrderStock(tx, orderId));
const decline = (orderId: bigint) => prisma.$transaction((tx) => restoreOrderStock(tx, orderId));
const stockOf = async (id: bigint) => (await prisma.productVariant.findUniqueOrThrow({ where: { id }, select: { stock: true } })).stock;
const orderOf = (id: bigint) =>
  prisma.order.findUniqueOrThrow({
    where: { id },
    select: { stockDeducted: true, stockShort: true, items: { orderBy: { id: "asc" }, select: { qty: true, stockTaken: true } } },
  });

async function main() {
  try {
    const category = await prisma.category.findFirstOrThrow({ orderBy: { id: "asc" }, select: { id: true } });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Stock test ${RUN}`,
        slug: `stock-test-${RUN}`,
        isAvailable: false,
        variants: { create: [{ name: "Tracked", price: 1000, stock: 3 }, { name: "Untracked", price: 1000 }] },
      },
      include: { variants: { orderBy: { id: "asc" } } },
    });
    productId = product.id;
    const [tracked, untracked] = product.variants;

    await check("stockStatus / stockLeft: low at 5 or fewer, sold out when every size is tracked and 0, nothing untracked", async () => {
      assert(stockStatus([null, null]) === null, "untracked");
      assert(stockStatus([6, null]) === null, "plenty");
      assert(stockStatus([5, 20]) === "low", "low");
      assert(stockStatus([0, 20]) === "low", "one out");
      assert(stockStatus([0, 0]) === "soldOut", "all out");
      assert(stockStatus([0, null]) === "low", "one out, an untracked size still orderable");
      assert(stockLeft(null) === undefined && stockLeft(6) === undefined && stockLeft(5) === 5 && stockLeft(0) === 0, "stockLeft");
    });

    let first: bigint;
    await check("findShortLines: asking for more than is left is short; untracked never is", async () => {
      const short = await findShortLines(prisma, [
        { variantId: tracked.id, qty: 4 },
        { variantId: untracked.id, qty: 99 },
      ]);
      assert(short.length === 1 && short[0].variantId === tracked.id.toString() && short[0].left === 3, JSON.stringify(short));
      assert((await findShortLines(prisma, [{ variantId: tracked.id, qty: 3 }])).length === 0, "3 of 3 is fine");
      return "4 of 3 short, untracked ignored";
    });

    await check("Paying takes the items out of stock once (tracked 3 -> 1, untracked stays NULL)", async () => {
      first = await makeOrder([
        { variantId: tracked.id, qty: 2 },
        { variantId: untracked.id, qty: 5 },
      ]);
      const result = await pay(first);
      assert(result.deducted && !result.short, JSON.stringify(result));
      assert((await stockOf(tracked.id)) === 1, `tracked ${await stockOf(tracked.id)}`);
      assert((await stockOf(untracked.id)) === null, "untracked changed");
      const o = await orderOf(first);
      assert(o.stockDeducted && !o.stockShort, "flags");
      assert(o.items[0].stockTaken === 2 && o.items[1].stockTaken === null, JSON.stringify(o.items));
      return "stock 1, stock_taken [2, null]";
    });

    await check("A repeated and a concurrent 'paid' for the same order change nothing", async () => {
      const again = await Promise.all([pay(first), pay(first)]);
      assert(again.every((r) => !r.deducted), JSON.stringify(again));
      assert((await stockOf(tracked.id)) === 1, `tracked ${await stockOf(tracked.id)}`);
    });

    await check("Two orders paying for the last unit at once: stock stops at 0, exactly one is marked short", async () => {
      const a = await makeOrder([{ variantId: tracked.id, qty: 1 }]);
      const b = await makeOrder([{ variantId: tracked.id, qty: 1 }]);
      const results = await Promise.all([pay(a), pay(b)]);
      assert(results.every((r) => r.deducted), JSON.stringify(results));
      assert((await stockOf(tracked.id)) === 0, `tracked ${await stockOf(tracked.id)}`);
      const [oa, ob] = await Promise.all([orderOf(a), orderOf(b)]);
      assert(Number(oa.stockShort) + Number(ob.stockShort) === 1, `short a=${oa.stockShort} b=${ob.stockShort}`);
      const shortOne = oa.stockShort ? oa : ob;
      assert(shortOne.items[0].stockTaken === 0, `short order took ${shortOne.items[0].stockTaken}`);

      // Declining the short one gives back nothing (it took nothing); the other gives back its 1.
      assert(await decline(oa.stockShort ? a : b), "short order restore");
      assert((await stockOf(tracked.id)) === 0, `after short restore ${await stockOf(tracked.id)}`);
      assert(await decline(oa.stockShort ? b : a), "full order restore");
      assert((await stockOf(tracked.id)) === 1, `after full restore ${await stockOf(tracked.id)}`);
      return "0 after both, short order restores 0, the other 1";
    });

    await check("Declining gives back exactly what was taken, once (1 -> 3, then no change)", async () => {
      const results = await Promise.all([decline(first), decline(first)]);
      assert(results.filter(Boolean).length === 1, JSON.stringify(results));
      assert((await stockOf(tracked.id)) === 3, `tracked ${await stockOf(tracked.id)}`);
      assert(!(await decline(first)), "third restore");
      const o = await orderOf(first);
      assert(!o.stockDeducted && o.items.every((i) => i.stockTaken === null), JSON.stringify(o));
    });

    await check("An order larger than the stock takes what's left and is marked short", async () => {
      const big = await makeOrder([{ variantId: tracked.id, qty: 5 }]);
      const result = await pay(big);
      assert(result.deducted && result.short, JSON.stringify(result));
      assert((await stockOf(tracked.id)) === 0, `tracked ${await stockOf(tracked.id)}`);
      assert((await orderOf(big)).items[0].stockTaken === 3, "took 3");
      await decline(big);
      assert((await stockOf(tracked.id)) === 3, `restored ${await stockOf(tracked.id)}`);
    });

    await check("A size no longer tracked when the order is declined stays untracked", async () => {
      const o = await makeOrder([{ variantId: tracked.id, qty: 1 }]);
      await pay(o);
      await prisma.productVariant.update({ where: { id: tracked.id }, data: { stock: null } });
      assert(await decline(o), "restore ran");
      assert((await stockOf(tracked.id)) === null, `stock ${await stockOf(tracked.id)}`);
    });
  } finally {
    if (orderIds.length) await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    if (productId !== null) await prisma.product.delete({ where: { id: productId } });
    const left = await prisma.order.count({ where: { email: `stock-${RUN}@example.test` } });
    console.log(`cleanup: ${orderIds.length} orders and 1 product deleted (${left} left)`);
    await prisma.$disconnect();
  }

  if (failed) {
    console.log(`${failed} failed`);
    process.exit(1);
  }
  console.log("all passed");
}

void main();
