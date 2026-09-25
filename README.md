# Eccomerce-MERN-AI-Integrated

A full-stack e-commerce platform with a customer storefront, an admin panel,
and a set of AI-driven features layered on top once the core store works —
built on the MERN stack (MongoDB, Express, React/Next.js, Node).

## The Idea

Most e-commerce demos stop at "browse products, add to cart, checkout."
This project's goal is a store that also:

- Sells with the usual mechanics done right: product catalog with filters,
  cart, coupons/sales, and a real payment flow (server-verified, not
  client-trusted).
- Gives store owners a proper **admin panel** — product, order, coupon, and
  sale management — separate from the customer-facing app but backed by the
  same API with role-based authorization.
- Adds **AI as a layer on top of a working store, not a gimmick bolted on
  first**:
  - **Event-based product suggestions** — recommendations driven by real
    browsing/purchase behavior, not just static "related products."
  - **A finance/budget calculator** to help shoppers plan bigger purchases.
  - **An AI "digital closet"** — users upload their own wardrobe items and
    get outfit suggestions for an occasion, based on what they actually own.

The AI features are intentionally sequenced last: they need real data
(events, uploaded items) and a store that already works to be useful, and
they're designed to degrade gracefully (empty state, not a crash) if the AI
provider is unavailable.

## Architecture

Three independently deployable apps sharing one backend API:

```
storefront/   Next.js — customer-facing site (browse, cart, checkout, account)
admin/        Next.js — admin dashboard (products, orders, coupons, analytics)
backend/      Express + TypeScript — the API both apps talk to
```

The storefront and admin apps are kept separate because they serve very
different users and don't need to share routes or bundle each other's code.
The backend is **not** split per-app — one API, with JWT + role checks
(customer vs. admin) deciding what each caller can do. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the full reasoning and the planned
shared-package layout (`packages/ui`, `packages/types`, etc.).

## What's Built So Far

This project is early — foundation stage, no storefront/admin features yet.

- **Workspaces scaffolded**: `storefront` and `admin` (Next.js 16 + Tailwind
  CSS 4), `backend` (Express, TypeScript, ESM), wired together via npm
  workspaces.
- **Backend infrastructure**: MongoDB connection via Mongoose
  (`backend/src/config/moongose.ts`), Redis connection via `ioredis`
  (`backend/src/config/redis.ts`), and environment validation with Zod
  (`backend/src/config/env.ts`) so the server won't boot with missing
  config.
- **Health and readiness**: `GET /api/v1/health` (liveness) always returns
  200 with live Mongo and Redis connection status; `GET /api/v1/ready`
  returns 200 only when both are connected and 503 otherwise, so a load
  balancer or orchestrator can hold traffic until the API can serve it.
- **Error handling and logging**: a central error handler with a consistent
  error response shape, structured JSON logs, and a request ID on every
  request.
- **Data model**: Mongoose schemas for users, vendors, products, inventory,
  carts, orders, payments, coupons, campaigns, and more under
  `backend/src/modules/`.
- **Test suite**: `npm test` runs the backend suite (app initialization,
  DB/Redis connectivity, health/readiness, error handling) under
  `backend/src/tests/`. `npm run typecheck` type-checks all three
  workspaces; frontend component tests come with the first real UI.
- **Tooling**: shared lint/typecheck/build/test scripts across workspaces,
  Prettier, Husky installed (pre-commit hook not yet wired up).

Not built yet: authentication, API routes on top of the data model,
cart/checkout/payments, the admin UI, and all AI features. See
[ROADMAP.md](ROADMAP.md) for the phased plan and current status in detail.

## Tech Stack

| Layer      | Tech                                              |
| ---------- | -------------------------------------------------- |
| Storefront | Next.js 16 (App Router, Turbopack), Tailwind CSS 4 |
| Admin      | Next.js 16 (App Router, Turbopack), Tailwind CSS 4 |
| Backend    | Node.js, Express, TypeScript (ESM)                 |
| Database   | MongoDB (Mongoose)                                  |
| Cache      | Redis (ioredis)                                     |
| Validation | Zod                                                  |
| Tooling    | npm workspaces, Prettier, Husky                     |
