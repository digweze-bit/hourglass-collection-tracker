# Catalogue

A minimalist, elegant private art collection registry for cataloguing, tracking, and managing an artwork collection.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — build + run the API server (port 8080)
- `pnpm --filter @workspace/api-server run build` — rebuild the API server bundle (required after route changes)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui + Tailwind CSS

## Where things live

- `lib/db/src/schema/index.ts` — source of truth for DB schema (locations, artworks, provenance, condition_reports, documents, pricing, loans)
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/api-server/src/app.ts` — Express app wiring (mounts router at `/api`)
- `artifacts/artwork-catalogue/src/pages/` — all frontend pages
- `artifacts/artwork-catalogue/src/components/layout.tsx` — sidebar navigation

## Architecture decisions

- Contract-first API: OpenAPI spec in `lib/api-spec/` drives Orval codegen for React Query hooks
- API dev script runs `build && start` (esbuild bundle, not ts-node). Always rebuild after route changes.
- Pricing is a single upsert record per artwork (PUT endpoint), not a list
- Loans auto-set `artworks.onLoan = true` on creation, `false` on return (when no active loans remain)
- `noImplicitReturns: true` — route handlers use `{ res.json(); return; }` pattern, never `return res.json()`

## Product

- **Dashboard** — collection overview: total artworks, estimated USD value, on-loan count, breakdowns by medium and location, recently acquired list
- **Catalogue** (`/artworks`) — grid/list view with search and filters (medium, location, loan status); "ON LOAN" badge
- **Artwork Detail** (`/artworks/:id`) — full record with tabs: Provenance, Condition Reports, Documents, Pricing, Loans
- **Locations** (`/locations`) — hierarchical tree (building → room/storage), artwork counts per location, click to browse contents
- **Loans** (`/loans`) — active/returned tabs, countdown timers (days remaining), overdue detection
- **Reports** (`/reports`) — printable PDF report generation via `window.print()`
- **Add Artwork** (`/artworks/new`) — form with title, artist, year, medium, dimensions, location assignment

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Rebuild required**: the API dev command runs a compiled bundle (`esbuild`). After editing any route file, run `pnpm --filter @workspace/api-server run build` before restarting the workflow.
- Frontend Vite workflow may show "FAILED" in `restart_workflow` even when Vite is running cleanly — verify with `curl http://localhost:21048/` instead.
- Pricing uses PUT (upsert), not POST. Field names: `purchasePrice`, `purchaseCurrency`, `usdConversionRate`, `currentValueUsd`, etc.
- Loans field names: `loanee`, `institution`, `purpose`, `startDate`, `endDate`, `status`, `notes`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
