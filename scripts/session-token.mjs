// Print a db_session JWT for a seeded user, for screenshots of signed-in pages.
//   node scripts/session-token.mjs admin      (admin@droolbites.biz.id, id 1)
//   node scripts/session-token.mjs customer   (alya@email.com, id 2)
// Usage: node scripts/shot.mjs /account --cookie db_session=$(node scripts/session-token.mjs customer)
import "dotenv/config";
import { SignJWT } from "jose";
import mariadb from "mariadb";

const who = process.argv[2] ?? "customer";
const email = who === "admin" ? "admin@droolbites.biz.id" : who === "customer" ? "alya@email.com" : who;

const url = new URL(process.env.DATABASE_URL);
const conn = await mariadb.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  allowPublicKeyRetrieval: true, // MySQL 8.4 caching_sha2 after a restart
});
const [row] = await conn.query("SELECT id, role FROM users WHERE email = ?", [email]);
await conn.end();
if (!row) {
  console.error(`no user ${email}`);
  process.exit(1);
}

const token = await new SignJWT({ userId: String(row.id), role: row.role })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1d")
  .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
process.stdout.write(token);
