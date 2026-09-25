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

## Project Status

**Phase 0 (foundation) is complete. Phase 1 (data model and auth) is in
progress:** the data model is written; validation, auth, and API routes
are next. No storefront or admin features exist yet. See
[ROADMAP.md](ROADMAP.md) for the full phased plan and verified status.

### What's built

- **Workspaces**: `storefront` and `admin` (Next.js 16 + Tailwind CSS 4) and
  `backend` (Express, TypeScript, ESM), wired together with npm workspaces
  and run together from the repo root.
- **Configuration**: environment variables are validated with Zod at startup
  (`backend/src/config/env.ts`), so the API refuses to boot with missing
  config.
- **MongoDB and Redis**: connections via Mongoose
  (`backend/src/config/mongoose.ts`) and `ioredis`
  (`backend/src/config/redis.ts`). If either fails to connect, the server
  logs the error and exits instead of serving traffic without its
  dependencies.
- **Health and readiness endpoints**: see [API](#api) below.
- **Error handling**: a central error handler
  (`backend/src/middleware/errorHandler.ts`) returns one consistent error
  shape for every failure, including unknown routes (404). Application
  errors are thrown as `AppError(statusCode, code, message)`.
- **Structured logging**: JSON logs with timestamp, level, and context
  (`backend/src/utils/logger.ts`). Every request gets a request ID (taken
  from the `x-request-id` header or generated), which is echoed in the
  response header and included in error logs and responses.
- **Data model**: 39 Mongoose schemas across 20 domain modules in
  `backend/src/modules/`, including users, vendors, products and variants,
  categories, brands, inventory, carts, wishlists, orders, payments,
  shipments, returns, coupons, campaigns, commissions, reviews, product
  Q&A, support tickets, notifications, and audit logs. Statuses and roles are
  enums, and hot fields are indexed.
- **Tests**: 29 backend tests covering env validation, Mongo/Redis
  connection handling, health/readiness, error handling, request IDs, and
  `AppError`.

### Not built yet

Authentication, request validation, API routes on top of the data model,
cart/checkout/payments, the storefront and admin UIs, CI, and all AI
features.

## Getting Started

### Prerequisites

- Node.js 22 or newer (developed on Node 24)
- npm (ships with Node)
- A running MongoDB instance (local or Atlas)
- A running Redis instance

If you don't have MongoDB and Redis installed locally, Docker is the
quickest way to get both:

```bash
docker run -d --name mongo -p 27017:27017 mongo
docker run -d --name redis -p 6379:6379 redis
```

### 1. Install dependencies

From the repo root (this installs every workspace):

```bash
npm install
```

### 2. Configure environment variables

Each app has a `.env.example`. Copy it to `.env` and fill in the values:

```bash
cp backend/.env.example backend/.env
cp storefront/.env.example storefront/.env
cp admin/.env.example admin/.env
```

| App                     | Variable                  | Required | Example                     |
| ----------------------- | ------------------------- | -------- | --------------------------- |
| `backend`               | `MONGO_URI`               | Yes      | `mongodb://localhost:27017/ecommerce` |
| `backend`               | `REDIS_URL`               | Yes      | `redis://localhost:6379`    |
| `backend`               | `PORT`                    | No       | `5000` (default)            |
| `storefront`, `admin`   | `NEXT_PUBLIC_BACKEND_URL` | Yes      | `http://localhost:5000`     |

`.env` files are git-ignored. Never commit real credentials.

### 3. Run in development

```bash
npm run dev
```

This starts all three apps together:

| App        | URL                     |
| ---------- | ----------------------- |
| Storefront | http://localhost:3000   |
| Admin      | http://localhost:3001   |
| Backend    | http://localhost:5000   |

To run a single app, use `npm run dev:storefront`, `npm run dev:admin`, or
`npm run dev:backend`.

Check that the API is up and connected:

```bash
curl http://localhost:5000/api/v1/ready
```

## API

All routes are versioned under `/api/v1`.

| Method | Route             | Purpose                                                                                                   |
| ------ | ----------------- | --------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/health`  | Liveness. Always `200` while the process is running, with Mongo and Redis connection status.              |
| GET    | `/api/v1/ready`   | Readiness. `200` only when Mongo and Redis are both connected, `503` otherwise, so traffic can wait until the API can serve it. |

Example responses:

```json
// GET /api/v1/ready → 200
{ "status": "ready", "configs": { "mongodb": "connected", "redis": "connected" } }

// GET /api/v1/ready → 503
{ "status": "not_ready", "configs": { "mongodb": "connected", "redis": "disconnected" } }
```

Every error response has the same shape:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route GET /api/v1/unknown not found",
    "requestId": "123e3d45-d4f3-4bb9-8886-112ddd8b38c3"
  }
}
```

## Scripts

Run from the repo root. Each script runs across all workspaces.

| Command                | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Start storefront, admin, and backend in watch mode        |
| `npm run build`        | Production build of all three apps                        |
| `npm run start`        | Start the production builds                               |
| `npm test`             | Run the test suites (currently the backend)               |
| `npm run typecheck`    | Type-check all three apps with `tsc --noEmit`             |
| `npm run lint`         | Lint the Next.js apps with ESLint                         |
| `npm run format`       | Format the repo with Prettier                             |
| `npm run format:check` | Check formatting without writing changes                  |

### Testing

Backend tests use Node's built-in test runner with `tsx`, and live in
`backend/src/tests/`. They don't need a running MongoDB or Redis: connection
behavior is tested with mocks. `backend/.env` must still exist with
`MONGO_URI` and `REDIS_URL` set (see step 2), because env validation runs
when the modules load. Frontend component tests will be added with
the first real UI (Phase 4 in the roadmap).

## Project Structure

```
.
├── admin/                  Next.js admin dashboard (port 3001)
├── storefront/             Next.js customer site (port 3000)
├── backend/
│   └── src/
│       ├── app.ts          Express app: middleware, routes, error handling
│       ├── server.ts       Entry point: connects Mongo + Redis, then listens
│       ├── config/         env validation, Mongoose and Redis clients
│       ├── errors/         AppError
│       ├── middleware/     requestId, errorHandler
│       ├── modules/        Domain modules (User, Product, Order, …) with their Mongoose models
│       ├── types/          Express type extensions
│       ├── utils/          Structured logger
│       └── tests/          Backend test suite
├── ARCHITECTURE.md         Architecture decisions
└── ROADMAP.md              Phased plan and verified progress
```

## Tech Stack

| Layer      | Tech                                               |
| ---------- | -------------------------------------------------- |
| Storefront | Next.js 16 (App Router, Turbopack), Tailwind CSS 4 |
| Admin      | Next.js 16 (App Router, Turbopack), Tailwind CSS 4 |
| Backend    | Node.js, Express, TypeScript (ESM)                 |
| Database   | MongoDB (Mongoose)                                 |
| Cache      | Redis (ioredis)                                    |
| Validation | Zod                                                |
| Testing    | Node test runner + tsx                             |
| Tooling    | npm workspaces, ESLint, Prettier, Husky            |
