# Ecommerce-MERN-AI-Integrated Roadmap (Verified 2026-09-25)

## Snapshot

- **Type:** Full-stack web app, Phase 0 essentially complete, Phase 1 started (data model written; no API routes, validation, or auth yet).
- **Stack (actual):** Next.js 16 (App Router, Turbopack) for `storefront` and `admin`, Node/Express backend (`backend`, TypeScript, ESM), MongoDB via Mongoose, Redis via `ioredis`, Zod for env validation, Tailwind CSS 4, npm workspaces (`storefront`, `admin`, `backend`, `packages/*`), Husky (installed, no hook script yet), Prettier, Node's built-in test runner (`node --test` + `tsx`).
- **Layout:** Git repo, 3 workspace apps (`admin/`, `storefront/`, `backend/`) at repo root (not under `apps/` as `ARCHITECTURE.md` proposes), no `packages/*` yet despite being declared in root `package.json` workspaces. Backend has config, middleware, errors, utils, and 39 Mongoose model files across 20 domain modules under `backend/src/modules/` (User, Vendor, Product, Category, Brand, Inventory, Cart, Wishlist, Order, Payment, Shipment, Return, Coupon, Campaign, Commission, Review, ProductQA, Support, Notification, AuditLog). 8 backend test files (25 tests). Admin and storefront still contain only the `create-next-app` boilerplate page.
- **Purpose:** E-commerce storefront with admin, payments, coupons/sales, and later AI-driven features (event-based product suggestions, a finance calculator, and an AI "digital closet" outfit-suggestion portal). The schema now models a **multi-vendor marketplace** (vendors, vendor orders, commissions, payouts) — a scope expansion beyond the original 13-item list (see finding #28).

Re-verified against the running repo (git log, file reads, `npm run typecheck/lint/build/audit`, `npm test --workspace backend`) rather than planned only. Findings below reflect what actually exists as of this run.

## Verdict

- Phase 0 is effectively done: git, workspace scaffolding, Mongo/Redis wiring with fail-fast startup, Zod env validation, health endpoint, central error handler, structured logging, a backend test suite, and project READMEs are all in place. Backend typechecks clean, all workspaces lint clean, `admin` and `storefront` both build, `npm audit` reports 0 vulnerabilities.
- The `admin` build regression from the last review is **fixed** (`next build` no longer passes `-p 3001`).
- **Phase 0 is complete.** The health-test regression from the `/api/v1` route rename is fixed. A readiness endpoint (`/api/v1/ready`, 503 until Mongo and Redis are both connected) was added with tests, and the backend suite passes 29/29.
- Phase 1 has started: the core schemas are written with enums for statuses/roles and indexes on hot fields (unique email/slug/SKU/order number/coupon code, compound status indexes). Money fields are plain `Number` with `min: 0` and nothing enforces integers, so the "money as integers" rule isn't enforced yet (finding #27). No Zod validation layer, routes, services, auth, or schema tests exist yet.
- The riskiest items in your original 13-item list remain #2 (payment gateway), #10 (event-based AI suggestions), and #12 (AI closet/outfit portal).
- **Production ready: No.** The data model exists, but there's no auth, API surface, or commerce logic yet.

## Decision

Keep building in place. Fix the health-route test regression first (a one-line change, and it keeps the test suite green before CI is added). Then add CI so regressions like this one get caught automatically. After that, continue Phase 1: enforce integer money in the schemas, add the Zod validation layer and shared types, then build auth on top of the existing `User` model.

## Rules of engagement

Derived from the stack you named and the feature list, to hold as you build:

- **Money as integers.** Store all prices/coupon amounts/sale prices in minor units (e.g. paise/cents), never floats. The server computes and re-validates totals at checkout — never trust a client-submitted price or discount.
- **One schema source.** Define Mongoose schemas + a validation layer (e.g. Zod) once per entity (User, Product, Cart, Order, Coupon) and share validated types between the Next.js frontend and the API layer — no duplicate shape definitions.
- **Auth before anything that touches user data.** Cart, checkout, coupons, admin, and the "dress collection" upload portal all require an authenticated, authorized user — build login/register and middleware before those, not after.
- **Redis has two distinct jobs — don't conflate them.** (1) ephemeral cache/session store, (2) rate-limit store. Both need eviction/TTL policy; neither is a system of record — Mongo is.
- **Payment webhooks are the source of truth for order state**, not the client redirect. Verify webhook signatures, make handlers idempotent, and drive order status through an explicit state machine (pending → paid → fulfilled → refunded, etc.) — no ad hoc string flags.
- **AI features are additive, not load-bearing.** #10, #11, #12 should degrade gracefully (empty state, not a crash) if the AI provider is down or a user has no data yet.
- **File uploads (item #12) get the same scrutiny as any user input:** size limit, MIME/extension allowlist, storage outside the app server (S3/Cloudinary/GCS), and never trust client-declared content type.
- **Testing bar:** unit tests on pricing/coupon/discount math and the order state machine before those ship; integration tests on every mutating API route; no critical-path route (auth, checkout, payment webhook) merges without a test.

## Phases

### Phase 0 — Foundation and guardrails

Goal: a runnable skeleton before any feature code.

- [x] Initialize the git repository and add a `.gitignore` covering `node_modules`, `.env*`, and build output. Evidence: `.gitignore` has `*.env` / `!.env.example` / `node_modules/` / `dist/` / `build/`; `git ls-files` shows no committed `.env` files, only `*.env.example`.
- [x] Finalize the architecture decision (separate Next.js frontend + Express API) and complete the corresponding project setup. Evidence: `admin`, `storefront` (Next.js 16 + TS + Tailwind) and `backend` (Express + TS, ESM) scaffolded; root `package.json` has workspace dev/build/start/lint/typecheck/test scripts; backend typechecks and builds clean (`tsc --noEmit`, `tsc -p tsconfig.json`), `storefront` build succeeds.
- [x] Set up Mongoose (MongoDB) and Redis client connections. Evidence: `backend/src/config/moongose.ts` (`mongoose.connect`), `backend/src/config/redis.ts` (`ioredis` client, `lazyConnect`), wired into `backend/src/server.ts` `startServer()`. Env validated via Zod in `backend/src/config/env.ts` (`MONGO_URI`, `REDIS_URL` required, parse throws if missing — fails fast on missing config).
- [x] Add test coverage for application initialization and database connectivity checks, and implement health and readiness endpoints. Evidence: `GET /api/v1/health` (liveness) in `backend/src/app.ts` always returns 200 with live Mongo and Redis status. `GET /api/v1/ready` (readiness) returns 200 only when both are connected and 503 otherwise. `backend`'s `test` script runs `node --import tsx --test 'src/tests/**/*.test.ts'` across 8 test files covering env, Mongo, Redis, health/readiness (every connected/disconnected combination), request ID, error handler, and `AppError`: **29/29 pass**. Startup fails fast on connection errors (finding #21 resolved). `admin` and `storefront` now have a `typecheck` script (`tsc --noEmit`), so `npm run typecheck` covers all three workspaces. Frontend component tests are deferred to Phase 4: both apps are still stock boilerplate, and adding a test framework now would mean new dependencies with nothing real to test.
- [x] README with accurate setup steps, kept in sync as features land. Evidence: root `README.md` describes the project. `admin/README.md` and `storefront/README.md` are now project-specific rather than stock `create-next-app` text.
- [x] Central error handler and structured logging established from the outset (not bolted on later). Evidence: `backend/src/app.ts` wires `requestId` → routes → a catch-all 404 (`AppError`) → `errorHandler` (`backend/src/middleware/errorHandler.ts`), registered after all routes; `errorHandler` distinguishes `AppError` from unexpected errors and returns a consistent `{success, error:{code, message, requestId}}` shape. `backend/src/utils/logger.ts` emits structured JSON logs (`timestamp`, `level`, `message`, context) with `info`/`warn`/`error`/`debug` levels — `moongose.ts`, `redis.ts`, and `server.ts` all call `logger.*` instead of bare `console.log`/`console.error`. `backend/src/middleware/requestId.ts` attaches a request ID (from `x-request-id` header or generated) to every request, echoed in the response header and included in error logs/responses.

**Acceptance:** `npm run dev` boots frontend + API against local Mongo/Redis ; health/readiness endpoints respond correctly and initialization/database-connectivity tests pass. — **Completed** (2026-09-25): `npm test` passes 29/29 and `npm run typecheck` is clean across all workspaces.

### Phase 1 — Shared contract, data model, and auth (covers item 8)

Goal: the entities everything else depends on.

- [x] Design core schemas: User, Product, Category, Cart, Order, Coupon, Sale/Campaign. Include indexes on hot fields (SKU, user email, order status). Evidence: 39 model files under `backend/src/modules/` (commit `93da6b6`), covering every listed entity plus Vendor, Inventory, Payment, Shipment, Return, Review, and more. Statuses and roles use `enum` constants (`ORDER_STATUSES`, `ORDER_PAYMENT_STATUSES`, `USER_ROLES`, `DISCOUNT_TYPES`, …). There are 64 `.index()` calls across 36 files, plus `unique` on user email, product slug, order number, and coupon code. — Follow-up: money fields (`price`, `subtotal`, `total`, `amount`) are `Number` with `min: 0` and no integer validator (finding #27).
- [ ] Validation layer (Zod/Joi) at every API boundary — no unvalidated input reaches a Mongo query. — Missing
- [ ] **Login/Register (item 8)**: password hashing (bcrypt/argon2), JWT or session in httpOnly cookie (not localStorage), password reset flow, logout/token revocation. — Missing
- [ ] Service layer separating route handlers from business logic (no business logic in controllers). — Missing
- [ ] Unit tests on schema validation and auth logic. — Missing

**Acceptance:** a user can register, log in, log out, and reset a password; protected routes reject unauthenticated requests; core schemas have indexes and validated writes.

### Phase 2 — Security and identity

Goal: the store isn't trivially exploitable before it does anything else.

- [ ] Authorization checks on every protected route (users can't read/modify other users' carts/orders). — Missing
- [ ] Role model for **Admin (item 3)**: `admin` role, middleware gate, separate admin-only route namespace. — Missing
- [ ] Rate limiting (Redis-backed, survives restarts) on auth and checkout endpoints. — Missing
- [ ] CORS from explicit config (not `*`), security headers (helmet or Next equivalent), body-size limits. — Missing
- [ ] Secrets scan in CI (no committed `.env`, no keys in client bundle). — Missing

**Acceptance:** admin routes are unreachable without the admin role; auth/checkout endpoints are rate-limited; a secrets scan runs in CI.

### Phase 3 — Data integrity and critical commerce flows (covers items 2, 5, 6, 7)

Goal: money and inventory are handled correctly before anything is public.

- [ ] **Cart (item 5)**: server-persisted cart tied to user/session, Redis-cached; quantities validated against live stock. — Missing
- [ ] **Coupons (item 6)**: server-side validation of coupon rules (expiry, usage limits, stacking rules) — never trust a client-applied discount. — Missing
- [ ] **Sales (item 7)**: time-boxed price campaigns; server computes the effective price, not the client. — Missing
- [ ] **Payment gateway (item 2)**: integrate provider (Stripe/Razorpay/etc.); webhook signature verification; idempotency keys on checkout/payment creation; order state machine (pending → paid → fulfilled → refunded/cancelled) with only valid transitions. — Missing
- [ ] Atomic stock decrement on order confirmation (transaction or conditional update — no read-modify-write race). — Missing
- [ ] Expiry/cleanup job for abandoned carts and unpaid pending orders. — Missing
- [ ] Tests on pricing math, coupon edge cases, and webhook idempotency (duplicate delivery must not double-fulfill). — Missing

**Acceptance:** a full checkout (cart → coupon → payment → webhook → fulfilled order) works end-to-end in a test environment with a simulated duplicate webhook causing no double-charge or double-stock-decrement.

### Phase 4 — Client foundation

Goal: a consistent way the UI talks to the API, before building many pages against it.

- [ ] One typed API client (not `fetch` scattered through components). — Missing
- [ ] Data fetching/caching strategy (React Query/SWR or Next server components) with loading/empty/error states as a pattern, not per-page reinvention. — Missing
- [ ] Tailwind design system: shared tokens/components, not duplicated utility soup per page. — Missing
- [ ] Frontend test setup for `storefront` and `admin` (e.g. Vitest + Testing Library) with a `test` script in each app, added along with the first real components. Moved here from Phase 0. — Missing

**Acceptance:** two different pages consume the same typed client and share loading/error UI primitives.

### Phase 5 — Client build and polish (covers items 1, 3 UI, 4)

Goal: the customer- and admin-facing surface.

- [ ] **Home page (item 1)**: SSR/SSG via Next.js for SEO, hero/featured products, responsive layout. — Missing
- [ ] **Filters (item 4)**: category/price/attribute filtering on the product listing, server-side pagination (not client-side over a full dataset). — Missing
- [ ] **Admin panel UI (item 3)**: product/order/coupon/sale management screens, gated by the Phase 2 role check. — Missing
- [ ] Accessibility basics (labels, alt text, keyboard nav, contrast) and dark mode if desired. — Missing
- [ ] Error boundaries around data-fetching components. — Missing

**Acceptance:** a logged-out user can browse/filter/search the home + listing pages; an admin can manage products, orders, coupons, and sales from a gated UI.

### Phase 6 — Operations, reliability, and production build (covers item 9)

Goal: safe to actually deploy.

- [ ] **Production build/deploy (item 9)**: Dockerfile/compose or platform config (Vercel for Next.js + hosted Mongo/Redis), staging environment, rollback plan. — Missing
- [x] Health/readiness endpoint, env validation at startup (fail fast on missing config). Evidence: `/api/v1/health` and `/api/v1/ready` endpoints, Zod env validation, and fail-fast DB/cache startup were all delivered in Phase 0.
- [ ] Error tracking (Sentry or equivalent) and structured logs with request IDs. — Partial: structured JSON logs with request IDs exist (Phase 0). Missing: error tracking.
- [ ] Background job runner for email (order confirmation, password reset) — outbox pattern so a crash doesn't silently drop an email. — Missing

**Acceptance:** a staging deploy runs the full checkout flow with real error tracking and recoverable startup failures (bad env var → clear boot error, not a silent crash).

### Phase 7 — AI integrations (covers items 10, 11, 12)

Goal: layer AI on top of a store that already has real data and traffic — this phase is sequenced last on purpose.

- [ ] **Prerequisite for item 10**: event tracking pipeline (page views, add-to-cart, purchase, category browse) — you cannot build "suggestions based on events" without first logging the events. Flag: your original list put this at #10 with no mention of the pipeline it needs. — Missing
- [ ] **Event-based suggestions (item 10)**: recommendation logic (rules-based first, e.g. "frequently bought together"; LLM/embedding-based later) consuming the event pipeline above. — Missing
- [ ] **Finance calculator (item 11)**: standalone (EMI/installment or budget calculator for purchases) — low dependency, can be built any time after Phase 5, no AI required unless you want it to. Clarify scope: is this EMI-on-checkout, or a general budgeting tool? — UNVERIFIED (scope not specified by user)
- [ ] **Prerequisite for item 12**: secure file upload + storage (S3/Cloudinary/GCS) with size/MIME/extension validation — needed before any "user shares their clothes" feature can exist safely. — Missing
- [ ] **Dress collection / AI outfit portal (item 12)**: user uploads their wardrobe items; vision or LLM-based classification (garment type, color, style); occasion-based outfit suggestion logic. This is the largest single item in your list — treat it as its own mini-project with its own data model (Wardrobe Item entity) and its own AI provider integration, separate from item 10's recommendation engine. — Missing
- [ ] Graceful degradation: every AI feature has a non-AI fallback/empty state if the provider is down or the user has no data yet. — Missing

**Acceptance:** items 10 and 12 each have a working fallback when their data prerequisite (events / uploaded wardrobe) is empty; item 11's scope is defined and implemented; no AI feature can crash the core storefront.

### Phase 8 — Proof and presentation

Goal: demonstrate it actually works.

- [ ] API docs (OpenAPI or equivalent) covering auth, cart, checkout, admin, AI endpoints. — Missing
- [ ] End-to-end test of the golden path: browse → filter → cart → coupon → pay → order confirmed. — Missing
- [ ] Architecture doc/diagram with known limitations, and a short "what happens if the user closes the tab mid-payment" note. — Missing
- [ ] Demo deployment link + basic load/perf numbers on the checkout path. — Missing

**Acceptance:** a reviewer can read one doc, hit one demo link, and understand the system without reading source.

## New findings

14. **List ordering issue**: original order placed "Payment gateway" (#2) before "Cart" (#5) and "Login/Register" (#8). Payment cannot precede the cart/order/user model it charges against. Addressed by the phase reordering above. — `High`
15. **No mention of database schema/indexing design** anywhere in the original list — this is foundational and was implicit. Added to Phase 1. — `High`
16. **No testing strategy or CI mentioned** in the original list. Added to Phase 0/throughout. — `Medium`
17. **Item 12 (dress portal) has no stated data model or storage plan** and is materially larger in scope than every other listed item — recommend scoping it as its own sub-roadmap once Phase 7 is reached. — `Medium`
18. **Item 11 (finance calculator) scope is undefined** — is it EMI-at-checkout, a budgeting tool, or something else? Needs a one-line spec before Phase 7 work starts. — `Low`
19. **Item 10 assumes an event pipeline that isn't in the list** — flagged as its own prerequisite in Phase 7. — `Medium`
20. ~~**`admin`'s `build` script is broken**~~ — **Resolved.** `admin/package.json` now has `"build": "next build"`; `npm run build --workspace admin` succeeds. Phase 0.
21. ~~**Startup doesn't fail fast on DB/cache connection errors**~~ — **Resolved.** `connectDb()` (`backend/src/config/moongose.ts`) and `connectRedis()` (`backend/src/config/redis.ts`) now log via `logger.error` and rethrow; `server.ts`'s `startServer()` catches that in a `try/catch` and calls `process.exit(1)` instead of proceeding to `app.listen`, so a failed Mongo/Redis connection now fails the boot instead of serving traffic anyway. Phase 0/6.
22. **No CI workflow**: no `.github/workflows` directory. Lint/typecheck/build/audit currently only run locally/manually. Phase 0. — `Medium`
23. **Husky is scaffolded but has no hook**: `prepare: "husky install"` has run (`.husky/_` exists) but there is no `.husky/pre-commit` script committed, so lint/format/typecheck don't actually get enforced on commit yet. Phase 0. — `Low`
24. **`packages/*` workspace glob is declared but empty**: root `package.json` lists `"packages/*"` in `workspaces`, matching `ARCHITECTURE.md`'s shared-package plan (`types`, `validation`, `ui`, `api-client`), but no `packages/` directory exists yet. Not urgent before Phase 1, but the "one schema source" rule of engagement depends on this existing. Phase 1. — `Low`
25. **`admin` and `storefront` are still identical boilerplate**: `admin/src/app/page.tsx` and `storefront/src/app/page.tsx` are byte-identical, unedited `create-next-app` output — no product UI work has started in either app yet. Expected at this stage, noted for accurate progress tracking. Phase 5. — `Low`
26. ~~**Health-route rename broke the test suite**~~ — **Resolved.** `backend/src/tests/server.test.ts` now calls `/api/v1/health` and also covers `/api/v1/ready`; the README references the new routes. CI (#22) would have caught the original breakage, which is why it's the next action. Phase 0.
27. **Money isn't enforced as integers in the schemas**: `price`, `subtotal`, `total`, and `amount` fields in Cart, Order, OrderItem, VendorOrder, Payment, PaymentTransaction, and VendorProductVariant are `{ type: Number, min: 0 }`, so a value like `199.99` would be saved without error. This conflicts with the "money as integers" rule of engagement. Fix: add an integer validator (e.g. `validate: Number.isInteger`) or a shared `moneyField` helper, and document the minor-unit convention. Phase 1. — `Medium`
28. **The schema now models a multi-vendor marketplace**: Vendor, VendorStore, VendorOnboarding, VendorDocument, VendorBankAccount, VendorProduct, VendorOrder, VendorPayout, and CommissionRule go well beyond the original 13-item list, which described a single-seller store with an admin. That's fine if intended, but vendor onboarding, per-vendor order splitting, commissions, and payouts each need roadmap items (and payouts need payment-provider support such as Stripe Connect or Razorpay Route) that don't exist yet. Decide whether multi-vendor is in scope for v1. — `Medium`
29. **No tests or validation on the new models**: none of the 39 model files has a test, and no Zod schemas exist alongside them, so the "one schema source" rule and the Phase 1 test item are both still open. Phase 1. — `Medium`

## Top 5 next actions

1. Add a CI workflow (`.github/workflows`) running lint, typecheck, build, test, and audit on every PR (finding #22). `High`
2. Add integer validation to every money field in the models and document the minor-unit convention — Phase 1. `Medium`
3. Create `packages/validation` (or `packages/types`) with Zod schemas for the core entities, shared by the backend and both frontends — Phase 1. `High`
4. Build Login/Register on the `User` model: hashed passwords, httpOnly-cookie sessions, logout, and password reset, with tests — Phase 1. `High`
5. Decide whether the multi-vendor marketplace is in scope for v1 (finding #28), and add roadmap items for vendor onboarding, order splitting, commissions, and payouts if it is. `Medium`

## Progress summary

| Phase                               | Done  | Partial | Open   | N/A   | % of applicable              |
| ----------------------------------- | ----- | ------- | ------ | ----- | ---------------------------- |
| 0 — Foundation                      | 6     | 0       | 0      | 0     | 100%                         |
| 1 — Contract, data model, auth      | 1     | 0       | 4      | 0     | 20%                          |
| 2 — Security & identity             | 0     | 0       | 5      | 0     | 0%                           |
| 3 — Data integrity & critical flows | 0     | 0       | 7      | 0     | 0%                           |
| 4 — Client foundation               | 0     | 0       | 4      | 0     | 0%                           |
| 5 — Client build & polish           | 0     | 0       | 5      | 0     | 0%                           |
| 6 — Operations & production build   | 1     | 1       | 2      | 0     | 38%                          |
| 7 — AI integrations                 | 0     | 0       | 6      | 0     | 0% (1 item UNVERIFIED scope) |
| 8 — Proof & presentation            | 0     | 0       | 4      | 0     | 0%                           |
| **Overall**                         | **8** | **1**   | **37** | **0** | **18%**                      |

_Partial items count as half._

## Interview / review prep

Questions this project should be able to answer well once built:

1. What happens if a user closes the tab after paying but before the webhook is processed?
2. How does a coupon's discount get validated server-side, and what stops a client from sending an arbitrary discount amount?
3. What prevents two simultaneous checkouts from overselling the last unit of stock?
4. If the AI suggestion provider (item 10 or 12) is down or slow, what does the user see?
5. How is an admin's access to the admin panel revoked, and how fast does that take effect?
6. What's stored about a user's uploaded wardrobe photos (item 12), where, and for how long — and what happens if they delete their account?
7. How is a payment webhook verified as genuinely from the provider and not replayed/forged?
8. What's the rollback plan if a production deploy breaks checkout?
