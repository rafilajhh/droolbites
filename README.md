# Droolbites

Online shop for Droolbites, a fictional dessert shop in Surabaya: soft cookies, fudgy brownies and tiramisu, delivery or store pickup. Built for the Web Programming course (Pemweb, semester 3).

The UI is generated from the pen.dev design file `droolbites.pen` and matches it at 1440px. English is the default language, with a switch to Bahasa Indonesia.

## Stack

| Part | Choice |
|---|---|
| Framework | Next.js 16 (App Router, server actions), React 19, TypeScript |
| Styling | Tailwind CSS v4 with tokens copied from the pen file |
| Database | MySQL 8.4 via Prisma 7 (`prisma/schema.prisma`, mirrors the PDM) |
| Auth | Signed JWT session cookie (`jose`), `bcryptjs` password hashes |
| Payments | Provider interface: `mock` (demo, no money moves) or the Belibayar Direct API (`PAYMENT_PROVIDER=belibayar`), see [Payments](#payments) |
| Email | Nodemailer → Mailpit in development |

## Run it locally (development)

Requirements: Node.js 20+, Docker Desktop.

```bash
npm install
cp .env.example .env          # then set AUTH_SECRET to a long random string (openssl rand -base64 32)
docker compose up -d          # MySQL on 127.0.0.1:3306, Mailpit on 127.0.0.1:8025
npx prisma migrate deploy     # create the tables
npm run db:seed               # menu, store settings, admin + demo customer, demo orders
npm run dev                   # http://localhost:3000
```

## Host it on this laptop (production build)

Either run the optimized build directly:

```bash
npm run build
npm run start                 # http://localhost:3000
```

or run everything in Docker (app + MySQL + Mailpit):

```bash
docker compose --profile app up -d --build             # runs the migrate service first, then the app
docker compose --profile app run --rm migrate npx prisma db seed   # demo data, first time only
# → http://localhost:8080
```

Other devices on the same Wi-Fi can open `http://<laptop-ip>:8080` (only the app port is open to the LAN; MySQL and Mailpit listen on 127.0.0.1). Links in emails use `APP_URL`, which compose sets to `http://localhost:8080` for the app service; change it in `compose.yml` to `http://<laptop-ip>:8080` so those links also work on a phone, then rerun `docker compose --profile app up -d`.

Sign-in and password-reset rate limits key on the client IP only when `TRUST_PROXY=1` (set it when the app runs behind one reverse proxy that sets `X-Real-IP` / `X-Forwarded-For`, e.g. nginx on a VPS). Without it those headers are ignored, since anyone can fake them, and limits apply per email address plus one shared bucket for all clients.

## Accounts and demo data

| Who | Email | Password |
|---|---|---|
| Store admin (`/admin`) | admin@droolbites.biz.id | droolbites123 |
| Demo customer | alya@email.com | alya12345 |

The seed also creates orders DB-0000 (pickup, completed) and DB-0001 (delivery, baking). `npm run db:seed` resets all data to this state.

Emails (order confirmations, password reset, newsletter) are caught by Mailpit at http://localhost:8025.

## Payments

`PAYMENT_PROVIDER` picks the gateway (`src/lib/payments/`):

| Value | What happens |
|---|---|
| `mock` (default) | No money moves. VA numbers, payment codes and QRIS strings are derived from the order; the pay page has a "Simulate payment (demo)" button. |
| `belibayar` | Real payments through the [Belibayar Direct API](https://docs.belibayar.id/docs). A `byr_test_` key uses the sandbox namespace (`/direct/v1/sandbox/…`) and keeps a "Simulate payment" button that calls the sandbox simulate endpoint; a `byr_live_` key charges real money and never shows it. |

Methods: virtual account (BCA, BNI, Mandiri, BRI, Permata, BSI, Muamalat, CIMB Niaga, Sinarmas, Neo Commerce, Maybank), retail (Indomaret, Alfamart; off until switched on in Admin › Store settings), e-wallet (OVO, DANA, ShopeePay) and QRIS. With Belibayar, checkout only offers methods that are both switched on in store settings and active in the gateway's channel list (fetched server-side, cached 10 minutes), and shows the gateway's logos.

How a Belibayar payment flows:

- Placing an order creates the order, then charges it with reference `DB-0007-1` (order number + attempt). Choosing another method on the pay page cancels the open charge and creates `DB-0007-2`, and so on. The order keeps its 24-hour deadline; the gateway's own `expired_at` is the countdown shown.
- If the gateway refuses (channel disabled, amount below minimum, busy), the order stays unpaid without a live payment and the pay page asks for another method. After a 502 or a timeout the status is checked before charging again.
- Who pays the gateway fee is a Belibayar account setting. When the customer bears it, the charged amount is higher than the order total and the pay page, order page and emails show a "Service fee" line.
- Payment status: the pay page polls `GET /api/orders/<number>/payment-status` every 5 s while visible, and Belibayar posts to `POST /api/payments/belibayar/webhook` (signature checked with `BELIBAYAR_WEBHOOK_SECRET`; only sent when `APP_URL` is `https`). Paid is final and wins even after expired.

Env: `BELIBAYAR_BASE_URL`, `BELIBAYAR_API_KEY`, `BELIBAYAR_SECRET_KEY`, `BELIBAYAR_WEBHOOK_SECRET` (see `.env.example`). The server's public IP must be on the Belibayar IP whitelist.

To test without the real gateway, run the local fake (it checks signatures exactly like the docs):

```bash
FAKE_BELIBAYAR_SECRET=local-secret node scripts/fake-belibayar.mjs     # http://localhost:4010
# .env.local: PAYMENT_PROVIDER=belibayar, BELIBAYAR_BASE_URL=http://localhost:4010,
#             BELIBAYAR_API_KEY=byr_test_local, BELIBAYAR_SECRET_KEY=local-secret
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build / server |
| `npm run typecheck` | Route types + TypeScript |
| `npm run lint` | ESLint |
| `npm run db:up` | Start MySQL + Mailpit |
| `npm run db:migrate` | Create a new migration from schema changes |
| `npm run db:seed` | Reset demo data |
| `node scripts/shot.mjs <route> --ref <penFrameId>` | Screenshot a page and diff it against the pen frame |

## Project layout

```
src/app/(shop)       storefront pages (header + footer)
src/app/(checkout)   checkout steps
src/app/(auth)       sign in, sign up, password reset
src/app/admin        store admin
src/components       ui/ (pen design-system components), layout/, and one folder per area
src/i18n             language setup and EN/ID messages per area
src/lib              database, session, cart, catalog, settings, payments, mail
src/content          product copy the database does not store
prisma               schema, migrations, seed
docs                 build conventions
```

See `docs/ui-conventions.md` for how pages are built from the design.
