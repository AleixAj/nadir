<img src="public/icon.svg" alt="" width="56">

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

The name comes from *nadir*, the lowest point of a curve. It is a portfolio project built like a real SaaS product: custom design with a token system, light and dark themes, polished animations, isolated and tested domain logic, and a demo you can use without signing up.

> **Demo:** click **“Entrar como demo”** (*Try the demo*) to open an account that already tracks 12 products, with alerts and a one-year history.
> The public deployment on Cloudflare is on its way. The interface is in Spanish.

## What you can do

- **Dashboard** with this month's savings, active alerts, latest price drops and products close to their target price.
- **My products**: a table with a 7-day sparkline, all-time low, best store and alert status. List filters, search and four sort orders.
- **Product page**, the main screen:
  - price history chart drawn in SVG, with 7-day, 1-month, 3-month and 1-year periods, a tooltip, the target price line and the *nadir* point highlighted;
  - store comparison sorted by final price including shipping, with the best option highlighted;
  - price alert with a toggle, shortcuts (all-time low, −5 %, −10 %) and notification channels;
  - period summary: high, average, low and change.
- **Add a product** by pasting a supported store URL or searching by name, with a preview before confirming.
- **Alerts**: active alerts with their progress towards the target, plus a history of sent notifications.
- **Stores**: status of each store, last check and response time, including an example of a store that is down and a retry button.
- **Settings**: profile, channels, check frequency, theme and a button to reset the demo.
- **Alert email**: preview of the email sent when a target is reached.

Product details:

- Responsive design: on mobile the sidebar becomes a bottom bar, tables become lists and dialogs open as bottom sheets.
- Loading (skeletons), empty and error states on every screen. You can force them with `?estado=vacio`, `?estado=cargando` or `?estado=error`.
- Light and dark themes with no flash on load: a script in `<head>` applies the theme before the first paint.
- Demo changes (alerts, added products, settings) are saved in the browser.
- Accessibility: ARIA roles on tables, tabs, switches and dialogs; visible focus; `Escape` closes the dialog; `prefers-reduced-motion` is respected.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | File-based routes, nested layouts and prerendered pages. |
| UI | React 19 | Components, hooks and the current version of the ecosystem. |
| Language | TypeScript 5 (strict) | Typed domain models (`Product`, `ShopOffer`, `Chart`...). |
| Styling | Tailwind CSS 4 + CSS tokens | Design colors are CSS variables; Tailwind exposes them as utilities (`bg-surface`, `text-brand-text`). |
| State | Zustand 5 + `persist` | Global state without boilerplate, saved to `localStorage`. |
| Animation | Motion 13 + CSS | Motion for interactive parts (dialog, toasts, sliding indicators); CSS for predictable ones (enter animations, chart drawing). |
| Charts | Custom SVG | Full control over the design (step line, *nadir* point, target) without a charting library. |
| Icons | Tabler Icons | Imported one by one, so only the icons in use are bundled. |
| Database | Neon (Postgres) + Drizzle ORM | Serverless Postgres that scales to zero; typed queries and versioned migrations. |
| Auth | Better Auth + Google | Sessions stored in our own database, no passwords. |
| Server | Server Actions + Zod | Every action checks the session and validates input before touching the database. |
| Tests | Vitest | Unit tests for pricing logic, page parsing and URL safety. |
| Deployment | Cloudflare Workers (OpenNext) | Continuous deployment from GitHub and a Cron Trigger that checks prices every hour. |

## Architecture

The logic does not depend on React: it lives in pure functions in `src/lib/` that can be tested on their own. Components only read state and render.

```txt
src/lib/demo-data.ts     Products, stores and history generator
        |
src/lib/store.ts         Zustand: demo state + persistence
        |
src/lib/insights.ts      Sorting, progress to target, alert status
src/lib/chart.ts         Chart geometry: scales, axes, nadir
src/lib/format.ts        Spanish formatting for prices, percentages and dates
        |
src/app/**               Pages: read from the store and render
```

### Simulated price history

`makeSeries()` generates a year of daily prices **deterministically**: the same seed always produces the same series, so the data does not change between visits. There are four curve shapes, so each chart tells a different story:

- `launch`: starts expensive and drops in steps (phones after launch).
- `volatile`: the price changes often (typical of marketplaces).
- `stable`: barely moves.
- `random`: occasional changes.

It also adds Black Friday and Prime Day drops, and guarantees that the all-time low, the price 7 days ago and the current price match the product data. The tests check these rules.

### Chart

`buildChart()` works out everything that has to be drawn: "nice" axis steps (1, 2, 2.5, 5 × 10ⁿ), the step line (a price holds until it changes), the area, the axis ticks, the lowest point of the period and whether that point is the all-time low. The `PriceChart` component only renders the SVG, measures its width with `ResizeObserver` and handles the tooltip.

### Animations

They follow a few simple rules:

- Only `transform` and `opacity` are animated.
- The interface uses strong `ease-out` curves and durations under 300 ms.
- Anything you can press responds (`scale(0.97)`).
- Motion is removed under `prefers-reduced-motion`.

There are staggered enter animations on each screen, a chart line that draws itself when the period changes, sliding indicators in segmented controls and navigation, and a dialog that opens as a bottom sheet on mobile.

## Project structure

```txt
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── entrar/               # Sign in (demo; Google coming soon)
│   ├── email/alerta/         # Alert email preview
│   └── app/                  # The application
│       ├── layout.tsx        # Shell: sidebar, headers, dialog, toasts
│       ├── page.tsx          # Dashboard
│       ├── productos/        # My products + [id] (product page)
│       ├── alertas/
│       ├── tiendas/
│       └── ajustes/
├── components/
│   ├── ui.tsx                # Buttons, Switch, Segmented, badges, skeletons...
│   ├── theme.tsx             # Light/dark theme with no flash
│   └── app/                  # Shell, add-product dialog, chart
└── lib/
    ├── demo-data.ts          # Demo data and history generator
    ├── store.ts              # Global state (Zustand)
    ├── chart.ts              # Chart geometry
    ├── insights.ts           # Derived calculations
    ├── format.ts             # es-ES formatting
    └── __tests__/            # Unit tests
```

## Run locally

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`. The demo works with no setup; for real accounts, copy `.env.example` to `.env.local`, fill in the database and Google keys, and run `npm run db:migrate`.

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # serve the build
npm run lint       # ESLint
npm run typecheck  # check TypeScript without emitting files
npm test           # unit tests with Vitest
npm run db:migrate # apply database migrations
npm run preview    # run the app in the Cloudflare runtime
npm run deploy     # deploy to Cloudflare Workers
```

## Roadmap

- [x] **Phase 0 · Foundation**: Next.js, TypeScript, Tailwind, design system and light/dark theme.
- [x] **Phase 1 · MVP with demo**: every screen from the design, no-signup demo, loading, empty and error states, and tests for the logic.
- [x] **User accounts**: Google sign-in, database and real per-user data.
- [x] **Phase 2 · Price engine**: product page parsing (JSON-LD / Open Graph), real history and scheduled checks.
- [ ] **Deployment** at `nadir.aleixaj.com` (Cloudflare Workers).
- [ ] **Phase 3 · Notifications**: emails with React Email + Resend, then Telegram.
- [ ] **Phase 4 · Polish**: end-to-end tests with Playwright, installable PWA and screenshots in this README.

## About the data

Nadir is a portfolio project and is not affiliated with any of the stores or brands shown. In the demo, the stores and products are real, but **prices are indicative and the history is simulated**: nothing is fetched live. Real accounts will use real data obtained from sources that allow it. Product photos come from Amazon.es and belong to their respective owners.

---

Design and development: [Aleix](https://github.com/AleixAj).
