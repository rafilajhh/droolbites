// "Continue with Google" account linking against the real database:  npx tsx scripts/google-auth.test.ts
// Uses fake ID-token claims (no Google call). Every user it creates is deleted at the end;
// the seeded admin is only read, and checked to be unchanged.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { mariadbUrl } from "../src/lib/db-url";
import { linkGoogleAccount, parseGoogleClaims } from "../src/lib/google-account";
import { claimGuestOrders } from "../src/app/auth/google/callback/claim-orders";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mariadbUrl()) });
const RUN = Date.now().toString(36);
const CLIENT_ID = "test-client.apps.googleusercontent.com";
const ADMIN_EMAIL = "admin@droolbites.biz.id";
const created: bigint[] = [];
const createdOrders: bigint[] = [];

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
const token = (over: Record<string, unknown> = {}) => ({
  iss: "https://accounts.google.com",
  aud: CLIENT_ID,
  exp: Math.floor(Date.now() / 1000) + 300,
  sub: `g-${RUN}-new`,
  email: `google-${RUN}@example.test`,
  email_verified: true,
  name: "  Nadia   Google  ",
  picture: "https://lh3.googleusercontent.com/a/ACg8ocTestPhoto=s96-c",
  ...over,
});
const claims = (over: Record<string, unknown> = {}) => {
  const c = parseGoogleClaims(token(over), CLIENT_ID);
  if (!c) throw new Error("claims rejected");
  return c;
};

async function main() {
  try {
    await check("parseGoogleClaims rejects wrong iss / aud / expired / unverified email, normalizes email + name", async () => {
      assert(parseGoogleClaims(token({ iss: "https://evil.example" }), CLIENT_ID) === null, "bad iss accepted");
      assert(parseGoogleClaims(token({ aud: "other-client" }), CLIENT_ID) === null, "bad aud accepted");
      assert(parseGoogleClaims(token({ exp: Math.floor(Date.now() / 1000) - 1 }), CLIENT_ID) === null, "expired accepted");
      assert(parseGoogleClaims(token({ email_verified: false }), CLIENT_ID) === null, "unverified accepted");
      assert(parseGoogleClaims(token({ iss: "accounts.google.com" }), CLIENT_ID) !== null, "bare issuer refused");
      const c = claims({ email: "  Mixed.Case@Example.TEST " });
      assert(c.email === "mixed.case@example.test" && c.name === "Nadia Google", JSON.stringify(c));
      return JSON.stringify(c);
    });

    await check("parseGoogleClaims keeps an https Google photo URL and drops any other picture claim", async () => {
      assert(claims().picture === "https://lh3.googleusercontent.com/a/ACg8ocTestPhoto=s96-c", `kept ${claims().picture}`);
      assert(claims({ picture: "https://lh5.googleusercontent.com/-abc/photo.jpg" }).picture !== null, "lh5 photo dropped");
      for (const bad of [
        "http://lh3.googleusercontent.com/a/x",
        "https://evil.example/a.png",
        "https://lh3.googleusercontent.com.evil.example/a",
        "https://user:pw@lh3.googleusercontent.com/a",
        "https://lh3.googleusercontent.com:8443/a",
        "javascript:alert(1)",
        `https://lh3.googleusercontent.com/${"x".repeat(500)}`,
        42,
      ]) {
        const c = claims({ picture: bad });
        assert(c.picture === null, `accepted ${String(bad).slice(0, 60)}`);
      }
      assert(claims({ picture: undefined }).picture === null, "missing picture not null");
      return "lh3/lh5 https kept; http, other hosts, credentials, ports, non-URLs, >500 chars dropped";
    });

    let newId: bigint | undefined;
    await check("New Google user -> customer created with null password and google_id", async () => {
      const r = await linkGoogleAccount(prisma, claims());
      assert(r.ok && r.created, JSON.stringify(r, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
      created.push(r.userId);
      newId = r.userId;
      const u = await prisma.user.findUniqueOrThrow({ where: { id: r.userId } });
      assert(u.passwordHash === null && u.googleId === `g-${RUN}-new` && u.role === "customer", `row ${u.passwordHash} ${u.googleId} ${u.role}`);
      assert(u.fullName === "Nadia Google" && u.email === `google-${RUN}@example.test`, `${u.fullName} ${u.email}`);
      assert(u.avatarUrl === "https://lh3.googleusercontent.com/a/ACg8ocTestPhoto=s96-c", `avatar ${u.avatarUrl}`);
      return `user ${u.id} "${u.fullName}" <${u.email}> with photo`;
    });

    await check("Second sign-in by the same google_id finds the same user (even with a changed email claim)", async () => {
      const r = await linkGoogleAccount(prisma, claims({ email: `changed-${RUN}@example.test` }));
      assert(r.ok && !r.created && r.userId === newId, `got ${r.ok ? r.userId : r.reason}`);
      assert((await prisma.user.count({ where: { googleId: `g-${RUN}-new` } })) === 1, "duplicate rows");
      return `user ${newId}`;
    });

    await check("Every sign-in refreshes the stored photo: a new picture replaces it, a missing one clears it", async () => {
      const next = "https://lh3.googleusercontent.com/a/ACg8ocNewPhoto=s96-c";
      const r1 = await linkGoogleAccount(prisma, claims({ picture: next }));
      assert(r1.ok && r1.userId === newId, "other user");
      const u1 = await prisma.user.findUniqueOrThrow({ where: { id: newId! } });
      assert(u1.avatarUrl === next, `after new photo ${u1.avatarUrl}`);
      const r2 = await linkGoogleAccount(prisma, claims({ picture: undefined }));
      assert(r2.ok && r2.userId === newId, "other user");
      const u2 = await prisma.user.findUniqueOrThrow({ where: { id: newId! } });
      assert(u2.avatarUrl === null, `after no photo ${u2.avatarUrl}`);
      return "replaced, then cleared";
    });

    await check("No name claim -> full name falls back to the email local part", async () => {
      const r = await linkGoogleAccount(prisma, claims({ sub: `g-${RUN}-noname`, email: `noname.${RUN}@example.test`, name: undefined }));
      assert(r.ok && r.created, "not created");
      created.push(r.userId);
      const u = await prisma.user.findUniqueOrThrow({ where: { id: r.userId } });
      assert(u.fullName === `noname.${RUN}`, u.fullName);
      return u.fullName;
    });

    await check("Existing customer with the same email (any case) is NOT linked (pre-hijacking guard)", async () => {
      const existing = await prisma.user.create({
        data: { fullName: "Linked Customer", email: `linkme-${RUN}@example.test`, passwordHash: "$2b$10$keepThisHashUnchangedForTheTestxxxxxxxxxxxxxxxxxxxxxx", role: "customer" },
      });
      created.push(existing.id);
      const r = await linkGoogleAccount(prisma, claims({ sub: `g-${RUN}-link`, email: `LinkMe-${RUN}@Example.test` }));
      assert(!r.ok && r.reason === "exists", JSON.stringify(r, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
      const u = await prisma.user.findUniqueOrThrow({ where: { id: existing.id } });
      assert(u.googleId === null && u.passwordHash === existing.passwordHash, `${u.googleId} ${u.passwordHash}`);
      return `user ${u.id} untouched`;
    });

    await check("Admin email is refused and the admin row is not changed", async () => {
      const before = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
      const r = await linkGoogleAccount(prisma, claims({ sub: `g-${RUN}-admin`, email: ADMIN_EMAIL.toUpperCase() }));
      assert(!r.ok && r.reason === "admin", JSON.stringify(r, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
      const after = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
      assert(after.googleId === before.googleId && after.passwordHash === before.passwordHash, "admin row changed");
      assert((await prisma.user.count({ where: { googleId: `g-${RUN}-admin` } })) === 0, "a user was created for the admin email");
      return "refused";
    });

    await check("claimGuestOrders links guest orders by verified email (any case), never moves owned orders, is idempotent", async () => {
      const owner = await prisma.user.create({ data: { fullName: "Claim Owner", email: `claim-owner-${RUN}@example.test`, role: "customer" } });
      const other = await prisma.user.create({ data: { fullName: "Claim Other", email: `claim-other-${RUN}@example.test`, role: "customer" } });
      created.push(owner.id, other.id);
      const email = `claim-${RUN}@example.test`;
      const order = (n: string, userId: bigint | null, mail = email) =>
        prisma.order.create({
          data: {
            orderNumber: `C${RUN.slice(-8)}${n}`,
            userId,
            customerName: "Claim Test",
            email: mail,
            phone: "081234567890",
            fulfilmentMethod: "pickup",
            subtotal: 5000,
            total: 5000,
          },
        });
      const guest = await order("a", null);
      const guestUpper = await order("b", null, email.toUpperCase());
      const owned = await order("c", other.id);
      createdOrders.push(guest.id, guestUpper.id, owned.id);

      const first = await claimGuestOrders(prisma, owner.id, `  Claim-${RUN}@EXAMPLE.test `);
      const second = await claimGuestOrders(prisma, owner.id, email);
      const rows = await prisma.order.findMany({ where: { id: { in: createdOrders } }, select: { id: true, userId: true } });
      const ownerOf = (id: bigint) => rows.find((r) => r.id === id)?.userId;
      assert(first === 2, `first claim linked ${first}, expected 2`);
      assert(second === 0, `second claim linked ${second}, expected 0`);
      assert(ownerOf(guest.id) === owner.id && ownerOf(guestUpper.id) === owner.id, "guest orders not linked");
      assert(ownerOf(owned.id) === other.id, "an owned order was moved");
      return "2 linked, 0 on rerun, owned order untouched";
    });
  } finally {
    if (createdOrders.length) await prisma.order.deleteMany({ where: { id: { in: createdOrders } } });
    const { count } = await prisma.user.deleteMany({ where: { id: { in: created } } });
    const leftovers = await prisma.user.count({ where: { OR: [{ googleId: { startsWith: `g-${RUN}-` } }, { email: { contains: RUN } }] } });
    console.log(`\nCleanup: deleted ${count} test user(s), ${leftovers} left over`);
    if (leftovers) failed++;
    await prisma.$disconnect();
    console.log(failed ? `${failed} failed` : "all passed");
    process.exitCode = failed ? 1 : 0;
  }
}

void main();
