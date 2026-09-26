# Project Architecture

## Recommendation: Separate Storefront and Admin Apps

For an e-commerce site, keep the **customer storefront** and **admin panel** as
separate applications/folders, while sharing common code where appropriate
via a monorepo.

## Recommended Structure

```text
ecommerce/
├── apps/
│   ├── storefront/          # Customer-facing website
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   └── ...
│   │
│   ├── admin/               # Admin dashboard
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   └── ...
│   │
│   └── api/                 # Backend
│       ├── modules/
│       ├── controllers/
│       ├── services/
│       └── ...
│
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── types/                # Shared TypeScript types
│   ├── validation/           # Zod schemas / validation
│   ├── config/               # Shared configuration
│   └── utils/
│
├── package.json
└── pnpm-workspace.yaml
```

## Why Separate Admin?

The two applications have fundamentally different responsibilities.

| Storefront        | Admin                        |
| ------------------ | ----------------------------- |
| Product browsing   | Product management            |
| Search              | Create/edit/delete products   |
| Cart                | Inventory                      |
| Checkout            | Orders                         |
| Payments            | Refunds                        |
| Customer account    | Customers                      |
| Wishlist            | Analytics                      |
| Reviews             | Coupons                        |
| Public SEO          | Internal operations            |

You don't want the customer application carrying hundreds of admin-only
components, routes, and permissions.

```text
storefront/
  /products
  /products/[id]
  /cart
  /checkout
  /account

admin/
  /dashboard
  /products
  /orders
  /customers
  /inventory
  /coupons
  /analytics
```

## What Should NOT Be Duplicated

This is where a monorepo becomes useful.

**Don't do:**

```text
storefront/
  Button.tsx
  ProductCard.tsx

admin/
  Button.tsx
  ProductCard.tsx
```

**Instead:**

```text
packages/
└── ui/
    ├── Button.tsx
    ├── Modal.tsx
    ├── Table.tsx
    ├── Input.tsx
    └── ...
```

Then both apps import from the shared package:

```text
storefront → @ecommerce/ui
admin      → @ecommerce/ui
```

Also share:

```text
packages/
├── types/
├── validation/
├── utils/
└── api-client/
```

## One Important Distinction: Don't Split the Backend

Do **not** create a separate backend just because there's a separate admin
frontend.

```text
storefront ─────┐
                 │
admin ───────────┼──→ API ──→ Database
                 │
mobile app ──────┘
```

The API handles authorization for both:

```text
Customer
   ↓
JWT
   ↓
GET /products
POST /cart
POST /orders

Admin
   ↓
JWT + ADMIN role
   ↓
POST /admin/products
PUT /admin/products/:id
DELETE /admin/products/:id
GET /admin/orders
```

- **Frontend separation** is for architecture and maintainability.
- **Backend authorization** (JWT + role checks) is what actually protects
  admin operations.

## Final Structure for This Project

```text
ecommerce/
│
├── apps/
│   ├── web/          ← Customer application
│   ├── admin/        ← Admin application
│   └── api/          ← Backend
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   ├── api-client/
│   └── config/
│
├── docker/
├── docs/
├── .env.example
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

This gives a clear architecture story:

> The e-commerce platform uses a monorepo with independently deployable
> customer and admin applications, a shared backend API, and reusable
> packages for UI, types, validation, and API contracts.

This is more scalable than putting everything into a single Next.js app:

```text
app/
├── shop/
└── admin/
```

**Decision:** separate `web` + `admin` apps, same monorepo, shared packages.
