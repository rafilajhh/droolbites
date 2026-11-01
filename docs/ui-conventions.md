# Droolbites — building pages from the pen file

The pen file is the binding visual spec. At 1440px wide every page must match its pen frame; below that it must stay tidy (single column, no horizontal scroll, readable type, 44px touch targets).

## Where the design lives

| What | Where |
|---|---|
| Live pen file (read with the pencil MCP `execute` tool) | `droolbites.pen`, kept outside the repo in the course folder (`Pemweb/Figma/`) |
| 1x PNG of each frame | `../droolbites-design/ref/<frameId>.png` |
| HTML + Tailwind export of each frame (exact px values, `data-pencil-name`/`data-pencil-id` attributes) | `../droolbites-design/html/<frameId>.html` |
| Plain list of every visible text per frame | `../droolbites-design/texts/<frameId>.txt` |

The HTML export is the fastest source of exact sizes, colors, gaps and copy. Its icons are inlined SVG paths; use the matching `lucide-react` icon instead (the export keeps `data-icon-name`). Its hex colors map to tokens below; never hard-code a hex that has a token.

Read a node precisely with the pen MCP when the export is ambiguous:

```js
Print(JSON.stringify(Get('<nodeId>', { depth: 8 })))
```

The pen file is read-only for this work. Never call Insert/Update/Delete/Replace/Move on it.

## Tokens (src/app/globals.css)

- Colors: `bg-background` (paper #FBF6EC), `text-foreground` (ink #1F2A14), `text-muted-foreground` (#5B6650), `bg-card` (oat #F3EAD7), `bg-card-accent` / `bg-mint` (#D5EFE3), `bg-primary` (moss #4E6424), `hover:bg-primary-hover`, `text-primary-foreground`, `inset-ring-border` (moss), `inset-ring-border-subtle` (#4E642429), `bg-surface-inverse`, `text-foreground-inverse`, `text-error`, `text-success`, `bg-highlight` (mustard), plus `accent-*` and `tint-*` palette (`bg-tint-lavender`, `bg-accent-teal`, …), `bg-oat`, `bg-white`, `text-ink`.
- Strokes the pen draws without a variable: `inset-ring-border-input` (#5B665080, form inputs) and `bg-border-divider` / `var(--border-divider)` (#4E642433, summary and timeline dividers).
- Radius: `rounded-sm` 12 (the pen calls it `--radius-s`; Tailwind v4's own `rounded-s` is a logical start-corner utility, so never use it), `rounded-m` 20, `rounded-pill` 999.
- Fonts: `font-display` (Bricolage Grotesque, rendered at `opsz` 96 like the pen), `font-body` (Manrope, the default), `font-mono` (IBM Plex Mono 600, also italic).
- pen `letterSpacing` is px → `tracking-[-1px]`. pen `lineHeight` is a multiplier, but the pen rounds each text box to whole pixels (fontSize × lineHeight, rounded half-up). Write it as explicit px so heights add up: 14 × 1.3 = 18.2 → `leading-[18px]`, 17 × 1.25 = 21.25 → `leading-[21px]`, 15 × 1.5 = 22.5 → `leading-[23px]`.
- Focus: `:focus-visible` draws a 2px ring in `var(--focus-ring)` (ink). Inside dark containers (moss, photos) add `[--focus-ring:var(--white)]` to the container. Use `outline-hidden`, never `outline-none`.
- `cn()` (`src/lib/cn.ts`) runs tailwind-merge, so a later class wins (`cn("hidden", "sm:flex")`, overrides via `className`).
- Motion: no global reduced-motion kill. Give each animation a `motion-reduce:` fallback (fade instead of slide, static row instead of the marquee).
- **Strokes are inside the box in pen.** Use `inset-ring-[1.5px] inset-ring-border` for full strokes and `shadow-[inset_0_-1px_0_var(--border-subtle)]` / `shadow-[inset_0_1px_0_…]` for one-sided strokes. Do not use `border-*` for pen strokes; it changes the box size.
- Do not edit `globals.css`. Turbopack does not hot-reload changes to it reliably; ask the lead instead.

## Shared building blocks (reuse, do not duplicate)

| pen component | Code |
|---|---|
| Button/Primary, Button/Secondary | `Button`, `ButtonLink`, `buttonClasses()` in `src/components/ui/button.tsx` (variant `primary` / `secondary` / `inverse`) |
| Button/Link | `ArrowLink` in `button.tsx` |
| Chip, Sticker, Badge/Status | `Chip`, `Sticker`, `StatusBadge` in `src/components/ui/badges.tsx` |
| Quantity Stepper | `QuantityStepper` (client) in `src/components/ui/quantity-stepper.tsx`, `size="sm"` for the drawer override |
| Form Field | `Field`, `TextInput`, `TextArea`, `Select`, `inputClasses` in `src/components/ui/form-field.tsx` |
| Order Line, Summary Row | `OrderLine`, `SummaryRow` in `src/components/ui/order-bits.tsx` |
| Accordion Item | `AccordionItem` in `src/components/ui/accordion.tsx` (native `<details>`) |
| Option Tile, Payment Option | `OptionTile`, `PaymentOption` in `src/components/ui/choice-tiles.tsx` (real radio inputs) |
| Site Top, Footer, Navigation menu, Cart drawer | already built in `src/components/layout/*` and mounted by `src/app/(shop)/layout.tsx` |

If a shared component needs a new prop, add it in a backwards-compatible way and say so in your report.

## Data and helpers

- Prisma client: `import { db } from "@/lib/db"` (server only). Generated types: `@/generated/prisma/client`, enums from `@/generated/prisma/enums`. IDs are `BigInt`; convert with `.toString()` before passing to client components.
- `formatRupiah(5000)` → `Rp5.000`, `formatDate`, `formatTime`, `formatDateTime` (Asia/Jakarta) in `src/lib/format.ts`.
- Catalog: `getMenu()`, `getProductBySlug()`, `fromPrice()` in `src/lib/catalog.ts`. Copy the DB lacks (badges, long text, translations, brownie servings, variant labels, category names): `src/content/products.ts`.
- Cart: `getCart()` in `src/lib/cart.ts`; server actions `addToCart`, `setCartQty`, `removeFromCart` in `src/app/actions/cart.ts`. After adding, call `useOpenCart()` from `src/components/layout/shop-ui.tsx` to slide the drawer in.
- Auth: `getSession()`, `createSession()`, `deleteSession()`, `signToken()`, `verifyToken()` in `src/lib/session.ts`; `getCurrentUser()`, `requireUser(returnTo)`, `requireAdmin()`, `safeNext()` in `src/lib/auth.ts`. Passwords use `bcryptjs`.
- Store settings (name, contacts, address, hours, delivery fee, which payment methods are on): `getStoreSettings()` in `src/lib/settings.ts`.
- Order/payment labels and badge tones: `src/lib/order-status.ts`.
- Email: `sendMail()` and `appUrl()` in `src/lib/mail.ts` (Mailpit inbox at http://localhost:8025).
- Modal behavior (Escape, focus trap, scroll lock): `useModal()` in `shop-ui.tsx`.

## Language (EN default, ID switch)

- Every user-visible string goes through a message file: `src/i18n/messages/<area>.ts` created with `defineMessages({ en: {...}, id: {...} })`. English copy is exactly the pen copy. Indonesian is natural, casual-polite Indonesian (use "kamu").
- Server components: `const t = await getMessages(myMessages)`; `const locale = await getLocale()` (`@/i18n/server`).
- Client components: `const t = useMessages(myMessages)`; `useLocale()` (`@/i18n/client`).
- Product names stay English. Prices are always `Rp` + dot thousands.

## Next.js 16 rules (this is not the Next.js you remember)

- `params`, `searchParams`, `cookies()`, `headers()` are async: `const { slug } = await params`.
- Page/layout props types: `PageProps<"/menu/[slug]">`, `LayoutProps<"/admin">` (global, generated by `next typegen`).
- `middleware.ts` is now `proxy.ts`. We do not use it; guard pages in layouts/pages with `requireUser` / `requireAdmin`.
- Server actions: `"use server"` files under `src/app/actions/` or colocated `actions.ts`. Forms use `useActionState` and progressive enhancement where reasonable. Revalidate with `revalidatePath`.
- `next/image` only allows `quality={100}` (configured). Always pass `quality={100}` and real `sizes`.
- Docs for anything unclear: `node_modules/next/dist/docs/`.

## Checking your work

```bash
npm run typecheck                    # route types + tsc
npx eslint src
node scripts/shot.mjs /menu --ref uQ4f5          # full page vs pen frame, writes .shots/*.png + diff
node scripts/shot.mjs / --ref wNl2v --click 'button[aria-label="Open menu"]'
node scripts/shot.mjs /menu --width 390 --full   # mobile check
```

The dev server is already running at http://localhost:3000 (do not start another one). Database: MySQL in Docker, seeded (`npm run db:seed` resets demo data). Accounts: admin `admin@droolbites.biz.id` / `droolbites123`, customer `alya@email.com` / `alya12345`. For signed-in pages, pass a session cookie: `node scripts/shot.mjs /account --cookie db_session=$(node scripts/session-token.mjs customer)` (or `admin`).

Look at the diff PNG, not only the percentage: photos and anti-aliasing always differ slightly, but layout shifts show as solid red bands. Aim for the layout lining up within 1–2px at 1440.
