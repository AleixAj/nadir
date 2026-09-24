<p align="center">
  <img src="public/logo-256.png" width="128" alt="Nadir">
</p>

<h1 align="center">Nadir</h1>

<p align="center">
  <sub>Read this page in:</sub>
</p>
<p align="center">
  <a href="README.md"><img src="docs/readme/lang-es.svg" alt="Español" width="170"></a>
  <img src="docs/readme/lang-en-active.svg" alt="English" width="170">
  <a href="README.ca.md"><img src="docs/readme/lang-ca.svg" alt="Català" width="170"></a>
</p>

<p align="center">
  Compares the price of a product across several stores, keeps its history<br>and alerts you when it drops below the price you choose.
</p>

<p align="center">
  <a href="https://nadir.aleixaj.com/app?demo=1">
    <img src="docs/readme/btn-demo-en.svg" alt="Try the demo" width="460">
  </a>
</p>
<p align="center">
  <a href="https://nadir.aleixaj.com/entrar">
    <img src="docs/readme/btn-web-en.svg" alt="Open the website" width="320">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs&logoColor=fff" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=111" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=fff" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=fff" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Zustand-5-443e38" alt="Zustand">
  <img src="https://img.shields.io/badge/Motion-13-ea580c?logo=framer&logoColor=fff" alt="Motion">
  <img src="https://img.shields.io/badge/Vitest-5-6e9f18?logo=vitest&logoColor=fff" alt="Vitest">
  <img src="https://img.shields.io/badge/Neon-Postgres-00e599?logo=postgresql&logoColor=fff" alt="Postgres">
  <img src="https://img.shields.io/badge/Drizzle-ORM-c5f74f?logo=drizzle&logoColor=111" alt="Drizzle">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-f38020?logo=cloudflare&logoColor=fff" alt="Cloudflare">
</p>

## How it looks

<p align="center">
  <img src="docs/screenshots/ficha.webp" alt="Product page: price history with the lowest point marked, store comparison and price alert.">
</p>
<p align="center">
  <sub>Product page: price history with the lowest point marked, store comparison and price alert.</sub>
</p>

---

Nadir is a price tracker: it follows the products you care about across several stores, keeps their price history and alerts you when they drop below the price you choose.

The name comes from *nadir*, the lowest point of a curve. It is a portfolio project built like a real SaaS product: custom design with a token system, Google or email accounts, a database, scheduled jobs, tested domain logic, and deployed to production.

> **Website:** [nadir.aleixaj.com](https://nadir.aleixaj.com) (the interface is in Spanish)
> **No-signup demo:** click “Entrar como demo” to open an account that already tracks 12 products, with alerts and a one-year history.
> **Real account:** sign in with Google or create an account with your email, search any product in the catalog and start tracking its price.

## What you can do

- **Dashboard** with this week's drops, active alerts, latest price drops and products close to their target price.
- **Search and add products by name**, with suggestions and photos as you type and keyboard navigation. You can also paste a store link.
- **My products**: a table with a 7-day sparkline, all-time low, best store and alert status. List filters, search and four sort orders.
- **Your own lists**: create, rename, recolour or delete lists and move each product to the one you want.
- **Product page**, the main screen:
  - price history chart drawn in SVG, with 7-day, 1-month, 3-month and 1-year periods, a tooltip, the target price line and the *nadir* point highlighted;
  - store comparison sorted by final price, with the best option highlighted;
  - price alert with a toggle, shortcuts (all-time low, −5 %, −10 %) and notification channels;
  - period summary, “Check price now” and “Stop tracking”.
- **Alerts**: active alerts with progress towards the target, plus a history of generated notifications.
- **Stores**: every store that sells your products, how many each one sells, last check and retry on failure.
- **Settings**: profile (name and a photo you can upload from your computer), password change, channels, check frequency, theme, sign out and delete the account with all its data.
- **Installable as an app** (PWA) on mobile or desktop.

## Test catalog

Large stores (Amazon, PcComponentes, MediaMarkt…) don't allow their pages to be read automatically; in production the data would come from their **affiliate programs** (official catalogs with daily prices). To simulate that honestly:

1. `scripts/seed-catalog.ts` runs 63 Google Shopping Spain searches **once** (SerpApi API) and keeps products from **well-known retailers and official brand stores**, without accessories or outlier prices.
2. To add more stores, it searches each product by name (Serper API) and only accepts results that are **exactly the same model**: it won't mix an iPhone 17 with a 17 Pro, different storage sizes or refurbished units.
3. Only **trusted** stores get in: well-known chains or highly rated shops with many reviews; never marketplaces, second-hand sites or carriers. Prices far from the rest are dropped and duplicate products are merged.
4. Products left with a single store are removed (no comparison, no value). Photos are converted to WebP (`public/catalog/`) and everything is stored in Postgres.

The result is **347 real products, all with prices from 2 or more stores** (almost 1,500 prices), mostly tech. The comparison on the product page is sorted by final price, shipping included. When you track a product, its price starts from the real one and **evolves in a simulated way** on every automatic check, with small changes and occasional deals. The site always says so, with a “test environment” notice and a “simulated price” label.

## Screenshots

<p align="center">
  <img src="docs/screenshots/landing.webp" alt="Landing page">
</p>
<p align="center">
  <sub>Landing page</sub>
</p>

<p align="center">
  <img src="docs/screenshots/panel.webp" alt="Dashboard with this week's drops and products close to their target">
</p>
<p align="center">
  <sub>Dashboard with this week's drops and products close to their target</sub>
</p>

<p align="center">
  <img src="docs/screenshots/productos.webp" alt="My products, with list filters and 7-day sparklines">
</p>
<p align="center">
  <sub>My products, with list filters and 7-day sparklines</sub>
</p>

<p align="center">
  <img src="docs/screenshots/buscar.webp" alt="Search and add a product by name">
</p>
<p align="center">
  <sub>Search and add a product by name</sub>
</p>

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
| Auth | Better Auth | Google or email and password (hashed). Sessions stored in our own database. |
| Server | Server Actions + Zod | Every action checks the session and data ownership, and validates input. |
| Tests | Vitest | Unit tests for pricing logic, chart, page parsing, URL safety and the catalog. |
| Deployment | Cloudflare Workers (OpenNext) | Continuous deployment from GitHub and a Cron Trigger that checks prices. |

## Architecture

```txt
                 ┌──────────────────────── Cloudflare Worker ────────────────────────┐
 Browser ──────► │ Next.js (OpenNext)                                                 │
                 │  ├─ Pages and layouts (Server Components)                          │
                 │  ├─ Server Actions  ── Zod ──► Drizzle ──► Neon Postgres (EU)     │
                 │  ├─ /api/auth/*  Better Auth (Google and email)                    │
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
- Passwords hashed by Better Auth, and protection so nobody can take over a Google account by registering its email first.
- Profile photos cropped in the browser and checked on the server (real file type and maximum size).
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
│   ├── entrar/               # Sign in with Google, email or demo
│   ├── app/                  # The app (dashboard, products, product page, alerts, stores, settings)
│   ├── api/auth/             # Better Auth
│   ├── api/avatar/           # Uploaded profile photos
│   ├── api/cron/check/       # Automatic price checks
│   ├── privacidad/, condiciones/, email/alerta/
│   └── manifest.ts, robots.ts, sitemap.ts
├── components/               # Base UI, app shell, add-product and list dialogs, chart
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

The demo works with no setup. For real accounts: copy `.env.example` to `.env.local`, fill in the database and Google keys, and run `npm run db:migrate`. Loading the test catalog also needs SerpApi and Serper keys and `npm run catalog:seed` (searches are cached and never repeated).

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
- [x] **Real accounts**: Google or email, profile with photo, database, per-user data, account deletion.
- [x] **Price engine**: page parsing, test catalog, history, scheduled checks and in-app alerts.
- [x] **Deployment** at [nadir.aleixaj.com](https://nadir.aleixaj.com) with continuous deployment.
- [ ] **Emails** with React Email + Resend: price alerts, email verification and password reset. Then Telegram.
- [ ] **Production data**: store affiliate catalogs instead of the test catalog.
- [ ] **End-to-end tests** with Playwright.

## About the data

Nadir is a portfolio project and is not affiliated with any of the stores or brands shown. In the demo, prices are indicative and the history is simulated. In real accounts, the catalog is real (September 2026) but price evolution is simulated, and the site says so. Product photos come from the stores themselves and belong to their respective owners.

---

Design and development: [Aleix](https://github.com/AleixAj).
