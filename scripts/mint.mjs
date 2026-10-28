// Mint signed cookie/URL tokens for screenshot states (same HS256/AUTH_SECRET as src/lib/session.ts).
//   node scripts/mint.mjs reset            -> password-reset token for alya@email.com
//   node scripts/mint.mjs checkout         -> db_checkout cookie value (Alya, delivery)
//   node scripts/mint.mjs vaorder          -> creates a guest BCA VA order awaiting payment (copy of
//                                             DB-0001's items, like pen frame KKqcJ); prints its number
//   node scripts/mint.mjs drop <number>    -> deletes that order again
import "dotenv/config";
import { SignJWT } from "jose";
import { createHash } from "node:crypto";
import mariadb from "mariadb";

const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const sign = (p, exp) => new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(exp).sign(key);
const kind = process.argv[2];
const connect = () => {
  const url = new URL(process.env.DATABASE_URL);
  return mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), allowPublicKeyRetrieval: true, bigIntAsNumber: true, insertIdAsNumber: true });
};
if (kind === "checkout") {
  process.stdout.write(await sign({ d: {
    email: "alya@email.com", fulfilment: "delivery", fullName: "Alya Rahmawati", phone: "+62 812 3456 7890",
    street: "Jl. Raya Darmo No. 12, Wonokromo", apartment: "", city: "Surabaya", postal: "60241",
    billingSame: true, billingAddress: "",
  } }, "6h"));
} else if (kind === "reset") {
  const conn = await connect();
  const [u] = await conn.query("SELECT id, password_hash FROM users WHERE email='alya@email.com'");
  await conn.end();
  const fp = createHash("sha256").update(u.password_hash).digest("hex").slice(0, 16);
  process.stdout.write(await sign({ sub: String(u.id), fp, purpose: "password-reset" }, "1h"));
} else if (kind === "vaorder") {
  const conn = await connect();
  const [{ n }] = await conn.query("SELECT COALESCE(MAX(CAST(SUBSTRING(order_number, 4) AS UNSIGNED)), 0) + 1 AS n FROM orders");
  const number = `DB-${String(n).padStart(4, "0")}`;
  const [src] = await conn.query("SELECT id, subtotal, delivery_fee, total FROM orders WHERE order_number = 'DB-0001'");
  const res = await conn.query(
    "INSERT INTO orders (order_number, customer_name, email, phone, fulfilment_method, shipping_address, shipping_city, shipping_postal, subtotal, delivery_fee, total) VALUES (?, 'Guest Shopper', 'guest@example.com', '081234567890', 'delivery', 'Jl. Raya Darmo No. 12, Wonokromo', 'Surabaya', '60241', ?, ?, ?)",
    [number, src.subtotal, src.delivery_fee, src.total],
  );
  await conn.query("INSERT INTO order_items (order_id, variant_id, qty, unit_price) SELECT ?, variant_id, qty, unit_price FROM order_items WHERE order_id = ?", [res.insertId, src.id]);
  await conn.query(
    "INSERT INTO payments (order_id, method, amount, va_number, status, expires_at, provider, reference) VALUES (?, 'bca_va', ?, '8077 0812 3456 7890', 'awaiting', NOW() + INTERVAL 1 DAY, 'mock', ?)",
    [res.insertId, src.total, `${number}-1`],
  );
  await conn.end();
  process.stdout.write(number);
} else if (kind === "drop") {
  const conn = await connect();
  await conn.query("DELETE FROM orders WHERE order_number = ?", [process.argv[3]]); // items + payments cascade
  await conn.end();
}
