# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Prisma 7 + MySQL 8. Chosen in the implementation plan (`Pemweb/droolbites-plan-implementasi.md`, 28 Oct 2026); the course allows any stack. Runs locally first (Docker Desktop: MySQL + Mailpit); VPS deploy with Docker Compose + Caddy on `droolbites.biz.id` comes later. Payment gateway undecided: a mock provider stands in until Midtrans/Xendit is chosen.

## Users

- **Customers:** people in Surabaya who want to order desserts (soft cookies, fudgy brownies, tiramisu) online, either delivered to their address or picked up at the store. They can check out as a guest or with an account (saved address, order history).
- **Store admin:** the shop owner/staff who checks paid orders, moves them through fulfilment (Baking → Out for delivery / Ready for pickup → Completed), manages the menu and store settings.

## Product Purpose

Droolbites is a fictional dessert shop built as a university Web Programming (Pemweb, semester 3) project. The website lets customers browse a small menu, pay online, and track their order; the admin dashboard runs the shop behind it. Success means a complete, working order flow from menu to payment to fulfilment, and a UI that matches the approved pen.dev design.

## Positioning

A small, focused menu baked fresh daily in Surabaya, with delivery across the city or store pickup, and simple local payments (QRIS, bank virtual accounts, e-wallets).

## Operating Context

- Store: Jl. Palem Sememi Raya F16, Sememi, Benowo, Surabaya. Open 10:00–21:00 every day (WIB).
- Contact: hello@droolbites.biz.id, careers@droolbites.biz.id (Join our team), +62 896 7562 4486.
- Delivery: flat Rp15.000 within Surabaya; store pickup is free.
- Payment methods: BCA, Mandiri, BNI, BRI virtual accounts; QRIS; GoPay, DANA, OVO, ShopeePay.
- Prices in whole Rupiah (Rp5.000 format), times in WIB.

## Capabilities and Constraints

- Menu: 3 categories (Soft cookies, Brownies, Tiramisu), 7 products, 10 variants (cookies Rp5.000 per piece; brownies 10×10 / 15×15 / 20×20 / 20×30 cm at Rp15.000 / 35.000 / 60.000 / 90.000; tiramisu Rp20.000 per portion).
- Data model follows the PDM (`Pemweb/Figma/droolbites-pdm.dbml`): users, categories, products, product_variants, orders, order_items, payments, plus `store_settings` (approved 28 Oct 2026).
- Order numbers use the format DB-0001. Payment status (awaiting/paid/expired) and fulfilment status are separate.
- Bilingual: English is the primary language; visitors can switch to Indonesian. Product names stay as they are.
- Cart lives in a cookie until checkout; guest checkout is allowed.
- Undecided: real payment gateway; production email provider.

## Brand Commitments

- The pen.dev file `Pemweb/Figma/droolbites.pen` (synced with Figma file `qizAl3nJf0eNotVFoa0xaH`) is the binding visual source: UI must match it exactly at 1440px; smaller screens adapt the same design.
- Name "Droolbites"; existing logo badge and product photography from the design's Image assets.

## Evidence on Hand

- Product photos and logo in the design (pen frame "Image assets", Figma frame "Image assets").
- Demo orders: DB-0001 (Alya Rahmawati, 18 Oct 2026, local delivery, paid, Baking, Rp85.000) and DB-0000 (2 Oct 2026, store pickup, paid, Completed, Rp60.000).
- No real testimonials, reviews, sales figures, or press exist. The owner allowed illustrative dummy content on 29 Oct 2026 (sample reviews, perks, roles, directions, numbers) so thin pages don't feel empty; keep it plausible for a small Surabaya bakery and consistent with the real store data above.

## Product Principles

1. The design file is the contract: build what is drawn, do not reinterpret it.
2. Every screen in the design must work end to end with real data, not static mockups.
3. Payment and fulfilment state must always be truthful and consistent between customer and admin views.
4. Keep the menu and flows small and clear; the shop is simple on purpose.
