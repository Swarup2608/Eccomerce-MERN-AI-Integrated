# Admin

The admin dashboard for the storefront — product, order, coupon, and sale
management, separate from the customer-facing app but backed by the same
[backend](../backend) API with role-based authorization (admin vs. customer).

Built with Next.js 16 (App Router, Turbopack) and Tailwind CSS 4. See the
[root README](../README.md) for how this fits into the overall project and
[ARCHITECTURE.md](../ARCHITECTURE.md) for the full reasoning.

## Status

Early scaffold — `create-next-app` boilerplate only, no admin UI yet. See
[ROADMAP.md](../ROADMAP.md) for the phased plan.

## Getting Started

From the repo root (npm workspaces) or from this directory:

```bash
npm run dev
```

Runs on [http://localhost:3001](http://localhost:3001) (kept off port 3000 so
it can run alongside the [storefront](../storefront)).

Other scripts: `npm run build`, `npm run start`, `npm run lint`.
