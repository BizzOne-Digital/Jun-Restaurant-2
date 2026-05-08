# A Wok — Premium Restaurant Ordering

Production-ready ordering experience for **A Wok** (Hayward, CA): public marketing site, menu with cart, Stripe Checkout, MongoDB, NextAuth (credentials), and a full admin portal with payouts and Stripe Connect split support.

## Stack

- Next.js 14 (App Router) + TypeScript  
- Tailwind CSS + Framer Motion + Sonner toasts  
- MongoDB + Mongoose  
- Stripe Checkout + Connect (destination charges with `application_fee_amount`)  
- NextAuth (JWT) + bcryptjs password hashing  
- Zod validation on server routes  

## Prerequisites

- Node.js 18+  
- MongoDB 6+ (local or Atlas)  
- Stripe account (test mode for development)  

## 1. Install dependencies

```bash
npm install
```

## 2. Environment variables

Copy `.env.example` to `.env` and fill in values:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Mongo connection string |
| `NEXTAUTH_SECRET` | Long random string for JWT signing |
| `NEXTAUTH_URL` | Base URL of the app (e.g. `http://localhost:3000`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-safe) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from Stripe Dashboard → Webhooks |
| `PLATFORM_ACCOUNT_COUNTRY` | `US` (reference for Connect onboarding) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL used for Checkout success/cancel URLs |

Never commit real secrets. Server-only keys stay in server routes / webhooks only.

## 3. Run MongoDB

Example with Docker:

```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

Or use MongoDB Atlas and set `MONGODB_URI` to your cluster URI.

## 4. Seed restaurant, categories, menu, and admin user

```bash
npm run seed
```

Creates:

- Restaurant **A Wok** (`slug: a-wok`), address, hours, default `paymentMode: platform_collect`  
- Categories and menu items (prices stored **in cents** in the database)  
- Admin user: **`admin@awok.local`** / **`Admin12345!`** (change immediately in production)

Place the logo at `public/awok-logo.png` (already expected by the seed `logoUrl`).

### Menu item photos

Put files in **`public/menu/`** using the same name as each item’s **slug** in the database: **`/menu/<slug>.jpg`** (example: `public/menu/appetizer-shrimp-katsu.jpg` → URL **`/menu/appetizer-shrimp-katsu.jpg`**). The seed sets **`imageUrl`** automatically from that pattern.

If you already ran the seed with empty images, after adding files run:

```bash
npm run backfill:menu-images
```

You can still override any item in **Admin → Menu** with a different **Image URL** (or use `.webp` if you change the extension in `scripts/backfill-menu-images.ts` and in `scripts/seed.ts` to match your files).

### Buy 1 get 1 free (BOGO) & popular items

- **BOGO** is toggled per item in **Admin → Menu** (“Enable BOGO”). Checkout charges `ceil(quantity / 2)` × list price for that line; Stripe line items match that total.
- **Popular** flags are **automatic**: after each successful payment, the webhook increments per-item **`purchaseCount`** and recomputes the top sellers (see `lib/recompute-popular.ts`). Admins can also click **Recalculate popular** on the Menu admin page.

## 5. Stripe webhook

1. In Stripe Dashboard → **Developers → Webhooks → Add endpoint**  
2. URL: `https://<your-domain>/api/stripe/webhook` (local: use Stripe CLI — below)  
3. Event: **`checkout.session.completed`**  
4. Copy the **signing secret** into `STRIPE_WEBHOOK_SECRET`

Local forwarding with Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Payment success is **only** finalized in the webhook handler (never trust the client alone).

## 6. Payment modes (10% platform / 90% restaurant)

- **`platform_collect`** — Full charge to the platform. Order stores `commissionAmount` (10% of total charged) and `restaurantPayoutAmount` (remainder). `PayoutLedger` rows stay **`pending`** until you run a **Stripe Transfer** from the admin Payouts screen (requires a connected account on the restaurant) or **mark manual paid** for offline reconciliation.  
- **`stripe_connect_split`** — Allowed only when `stripeConnectedAccountId` is set. Checkout uses `payment_intent_data.application_fee_amount` + `transfer_data.destination`. Webhook records ledger as **`transferred`** for that scenario.

Admin → **Settings** documents the warning about enabling Connect split only after KYC / void check / ID are complete.

## 7. Development server

```bash
npm run dev
```

Open `http://localhost:3000`. Admin UI: `http://localhost:3000/admin/login`.

## 8. Production build

```bash
npm run build
npm start
```

## Security notes

- Checkout recomputes totals from **database menu prices** (cents); the client cannot set arbitrary totals.  
- Admin APIs use `getServerSession` + role check.  
- Passwords are hashed with **bcryptjs** (bcrypt-compatible API, pure JS for simpler cross-platform installs).  
- Webhook signature verified with `STRIPE_WEBHOOK_SECRET`.  

## Project layout (high level)

- `app/(public)/` — Marketing, menu, cart, checkout, auth, order success, tracking  
- `app/admin/` — Admin login + dashboard (orders, menu, users, settings, payouts, print ticket)  
- `app/api/` — Menu, checkout, Stripe webhook, orders, admin CRUD  
- `models/` — Mongoose schemas  
- `scripts/seed.ts` — Seed data entry point  

## Support

Stripe Connect and transfers depend on your Stripe account capabilities and connected account status. Use Stripe test mode until flows are verified end-to-end.
