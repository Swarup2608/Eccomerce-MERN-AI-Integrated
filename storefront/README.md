# Storefront

The customer-facing e-commerce site — browse, cart, checkout, account, and
(eventually) the AI-driven features: event-based product suggestions, a
budget calculator, and the AI "digital closet." Talks to the
[backend](../backend) API for everything server-verified (payments, orders,
auth).

Built with Next.js 16 (App Router, Turbopack) and Tailwind CSS 4. See the
[root README](../README.md) for how this fits into the overall project and
[ARCHITECTURE.md](../ARCHITECTURE.md) for the full reasoning.

## Status

Early scaffold — `create-next-app` boilerplate only, no storefront UI yet.
See [ROADMAP.md](../ROADMAP.md) for the phased plan.

## Getting Started

From the repo root (npm workspaces) or from this directory:

```bash
npm run dev
```

Runs on [http://localhost:3000](http://localhost:3000).

Other scripts: `npm run build`, `npm run start`, `npm run lint`.
