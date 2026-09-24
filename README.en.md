<img src="public/logo-256.png" alt="Nadir" width="64">

# Nadir

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs&logoColor=fff)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=fff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=fff)
![Zustand](https://img.shields.io/badge/Zustand-5-443e38)
![Motion](https://img.shields.io/badge/Motion-13-ea580c?logo=framer&logoColor=fff)
![Vitest](https://img.shields.io/badge/Vitest-5-6e9f18?logo=vitest&logoColor=fff)
![Postgres](https://img.shields.io/badge/Neon-Postgres-00e599?logo=postgresql&logoColor=fff)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-c5f74f?logo=drizzle&logoColor=111)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-f38020?logo=cloudflare&logoColor=fff)

<p>
  <a href="README.md"><img src="docs/readme/lang-es.svg" alt="Español" width="170"></a>
  <img src="docs/readme/lang-en-active.svg" alt="English" width="170">
  <a href="README.ca.md"><img src="docs/readme/lang-ca.svg" alt="Català" width="170"></a>
</p>

**Buy at the lowest point.** Nadir is a price tracker: it follows the products you care about across several stores, keeps their price history and alerts you when they drop below the price you choose.

The name comes from *nadir*, the lowest point of a curve. It is a portfolio project built like a real SaaS product: custom design with a token system, Google accounts, a database, scheduled jobs, tested domain logic, and deployed to production.

> **Website:** [nadir.aleixaj.com](https://nadir.aleixaj.com) (the interface is in Spanish)
> **No-signup demo:** click “Entrar como demo” to open an account that already tracks 12 products, with alerts and a one-year history.
> **Real account:** sign in with Google, search any product in the catalog and start tracking its price.

## What you can do

- **Dashboard** with this week's drops, active alerts, latest price drops and products close to their target price.
- **Search and add products by name**, with suggestions and photos as you type and keyboard navigation. You can also paste a store link.
- **My products**: a table with a 7-day sparkline, all-time low, best store and alert status. List filters, search and four sort orders.
- **Product page**, the main screen:
  - price history chart drawn in SVG, with 7-day, 1-month, 3-month and 1-year periods, a tooltip, the target price line and the *nadir* point highlighted;
  - store comparison sorted by final price, with the best option highlighted;
  - price alert with a toggle, shortcuts (all-time low, −5 %, −10 %) and notification channels;
  - period summary, “Check price now” and “Stop tracking”.
- **Alerts**: active alerts with progress towards the target, plus a history of generated notifications.
- **Stores**: status of each store, last check and retry on failure.
- **Settings**: Google account, channels, check frequency, theme, sign out and delete the account with all its data.
- **Installable as an app** (PWA) on mobile or desktop.

## Test catalog

Large stores (Amazon, PcComponentes, MediaMarkt…) don't allow their pages to be read automatically; in production the data would come from their **affiliate programs** (official catalogs with daily prices). To simulate that honestly:

1. `scripts/seed-catalog.ts` runs 58 Google Shopping Spain searches **once**, through the SerpApi API.
2. It keeps products from **well-known retailers and official brand stores**, drops accessories and outlier prices (monthly instalments), and groups offers for the same product across stores.
3. Photos are downloaded, cropped and converted to WebP (`public/catalog/`), and everything is stored in Postgres.

The result is **more than 600 real products**, mostly tech. When you track one, its price starts from the real one and **evolves in a simulated way** on every automatic check, with small changes and occasional deals. The site always says so, with a “test environment” notice and a “simulated price” label.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components, Server Actions, nested layouts and prerendered routes. |
| UI | React 19 | Components, hooks and the current version of the ecosystem. |
| Language | TypeScript 5 (strict) | End-to-end typed domain models, from the database schema to the UI. |
| Styling | Tailwind CSS 4 + CSS tokens | Design colors are CSS variables; Tailwind exposes them as utilities (`bg-surface`, `text-brand-text`). |
| State | Zustand 5 | A single store with two modes: demo (in `localStorage`) and real account (synced with the server). |
| Animation | Motion 13 + CSS | Motion for interactive parts (dialog, toasts, indicators); CSS for predictable ones (enter animations, shine, chart drawing). |
| Database | Neon (Postgres) + Drizzle ORM | Serverless Postgres, typed queries and versioned migrations. |
| Auth | Better Auth + Google | Sessions stored in our own database, no passwords. |
| Server | Server Actions + Zod | Every action checks the session and data ownership, and validates input. |
| Tests | Vitest | Unit tests for pricing logic, chart, page parsing, URL safety and the catalog. |
| Deployment | Cloudflare Workers (OpenNext) | Continuous deployment from GitHub and a Cron Trigger that checks prices. |

## Architecture

```txt
                 ┌──────────────────────── Cloudflare Worker ────────────────────────┐
 Browser ──────► │ Next.js (OpenNext)                                                 │
                 │  ├─ Pages and layouts (Server Components)                          │
                 │  ├─ Server Actions  ── Zod ──► Drizzle ──► Neon Postgres (EU)     │
                 │  ├─ /api/auth/*  Better Auth + Google                              │
                 │  └─ /api/cron/check  ◄── Cron Trigger (with a secret)              │
                 └────────────────────────────────────────────────────────────────────┘
```

- **The logic doesn't depend on React.** It lives in pure, tested functions in `src/lib/`: chart geometry, price history, product page parsing, catalog and price simulation.
- **One interface for the demo and real accounts.** The server maps database rows to the same `Product` model the demo uses, so screens don't care where the data comes from.
- **The server is the source of truth.** Every action returns the updated account state and the UI replaces its own; small changes (toggling an alert) apply instantly and roll back if the server fails.
- **Amounts in cents** (integers) to avoid floating-point errors.

### Product page parsing

When a link is pasted, `fetchProduct()` downloads the page and `parseProductPage()` extracts name, photo and price from **schema.org structured data (JSON-LD)** or **Open Graph** tags, the same ones search engines and social networks use. Before downloading anything, `checkPublicUrl()` blocks internal addresses, private IPs and unusual ports (**SSRF** protection), and redirects are followed manually, validating every hop.

### Chart and price history

`buildChart()` computes scales with "nice" steps, the step line (a price holds until it changes), the lowest point of the period and whether it's the all-time low. `makeSeries()` generates deterministic histories with four curve shapes (launch, volatile, stable, random) plus Black Friday and Prime Day deals.

### Security

- Better Auth sessions in signed cookies; every Server Action checks the session and that the product belongs to the user.
- All input validated with Zod and parameterized queries through Drizzle.
- The automatic check route is protected with a secret; keys are stored as Cloudflare secrets.
- Security headers (HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Account deletion cascades to all its data, plus privacy and terms pages.

### Performance and quality

- Public pages are prerendered; the app is rendered on the server only when it depends on the session.
- Icons imported one by one, font via `next/font`, WebP images of a few KB.
- Animations only on `transform` and `opacity`, hover effects only with a mouse, and everything disabled under `prefers-reduced-motion`.
- Metadata for search engines and social networks (Open Graph), `robots.txt`, `sitemap.xml` and a PWA manifest.

## Project structure

```txt
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── entrar/               # Sign in with Google or demo
│   ├── app/                  # The app (dashboard, products, product page, alerts, stores, settings)
│   ├── api/auth/             # Better Auth
│   ├── api/cron/check/       # Automatic price checks
│   ├── privacidad/, condiciones/, email/alerta/
│   └── manifest.ts, robots.ts, sitemap.ts
├── components/               # Base UI, app shell, add-product dialog, chart
├── db/                       # Schema and connection (Drizzle + Neon)
├── server/                   # Server Actions, account loader, checks, simulation, page reader
└── lib/                      # Pure logic and tests (chart, history, catalog, formatting…)
scripts/seed-catalog.ts       # Test catalog loader
drizzle/                      # SQL migrations
worker.ts, wrangler.jsonc     # Cloudflare Worker and Cron Trigger
```

## Run locally

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

The demo works with no setup. For real accounts: copy `.env.example` to `.env.local`, fill in the database and Google keys, and run `npm run db:migrate`. Loading the test catalog also needs a SerpApi key and `npm run catalog:seed`.

## Scripts

```bash
npm run dev           # development server
npm run build         # production build
npm run lint          # ESLint
npm run typecheck     # TypeScript check
npm test              # unit tests with Vitest
npm run db:migrate    # apply database migrations
npm run catalog:seed  # load the test catalog (cached: searches aren't repeated)
npm run preview       # run the app in the Cloudflare runtime
npm run deploy        # deploy to Cloudflare Workers
```

## Roadmap

- [x] **Foundation and MVP**: design, every screen, no-signup demo, loading, empty and error states.
- [x] **Real accounts**: Google, database, per-user data, account deletion.
- [x] **Price engine**: page parsing, test catalog, history, scheduled checks and in-app alerts.
- [x] **Deployment** at [nadir.aleixaj.com](https://nadir.aleixaj.com) with continuous deployment.
- [ ] **Email alerts** with React Email + Resend, then Telegram.
- [ ] **Production data**: store affiliate catalogs instead of the test catalog.
- [ ] **End-to-end tests** with Playwright and screenshots in this README.

## About the data

Nadir is a portfolio project and is not affiliated with any of the stores or brands shown. In the demo, prices are indicative and the history is simulated. In real accounts, the catalog is real (September 2026) but price evolution is simulated, and the site says so. Product photos come from the stores themselves and belong to their respective owners.

---

Design and development: [Aleix](https://github.com/AleixAj).
