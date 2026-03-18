# Viewora Project Memory
**Last Updated:** 2026-03-18

## What This Project Is
Viewora — Nuxt 3 SaaS for 360° virtual tours + property experiences. Target: East Africa (Kenya).
Users upload 360° panoramas and 2D gallery images, publish public property pages, share trackable links, generate QR codes, capture leads, and view analytics.

## Canonical Domain
**viewora.software** — all code, SEO, and docs use this exclusively.

## Tech Stack
- Nuxt 3 ^3.10.0 + TypeScript, Vue 3 `<script setup>` throughout
- **@nuxtjs/supabase ^2.0.4** — auth only (email + Google OAuth)
- **Supabase PostgreSQL** — all data (via `server/utils/db.ts` service-role client)
- **Pinia (@pinia/nuxt)** — state management (auth + subscription stores)
- **Cloudflare R2** — media storage (panoramas, gallery images, thumbnails)
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` — R2 presigned URLs
- **Pannellum 2.5.6** (CDN) — 360° viewer, loaded on demand
- **Paystack** — billing (not yet wired)
- @nuxt/content ^2.13.4 (blog), @nuxtjs/seo ^3.4.0, @nuxtjs/google-fonts (Inter, Outfit)
- Single CSS design system: `assets/css/main.css` — no Tailwind
- Deployment: **Vercel** (Nuxt frontend) + **Railway** (Fastify backend — separate repo)

## Architecture
```
Frontend:  Nuxt 3 → Vercel            (this repo)
Backend:   Fastify → Railway          (separate repo, trusted rules engine)
Database:  Supabase PostgreSQL        (migration 012 is the live schema)
Storage:   Cloudflare R2              (direct browser upload via presigned URLs)
Auth:      Supabase Auth              (JWT, verified server-side via requireUser())
Payments:  Paystack                   (not yet integrated)
Viewer:    Pannellum 2.5.6 (CDN)      (components/app/PannellumViewer.vue)
```

## Database Schema — Migration 012 (Canonical)
Migration `012_viewora_unified_schema.sql` is the authoritative schema.
It **drops all legacy tables** (spaces, scenes, hotspots, projects, organizations, memberships, cloudpano_mappings, plan_entitlements, project_leads, project_analytics_daily, photo_shoot_credits, photo_shoot_bookings, audit_logs) and creates:

| Table | Purpose |
|-------|---------|
| `profiles` | User identity: id, email, full_name, company_name, avatar_url, phone |
| `plans` | Plan definitions: Free/Basic/Plus/Pro, KES pricing, entitlement flags |
| `subscriptions` | Per-user billing state: user_id, plan_id, provider, status, billing_cycle, grace_period_ends_at |
| `properties` | Primary entity: title, slug, description, cover_image_url, has_360, has_gallery, is_published, visibility, lead_form_enabled |
| `property_media` | Media attached to a property: media_type (image/panorama/thumbnail), storage_key, public_url, sort_order, is_primary |
| `property_360_settings` | Pannellum config per property: hfov, pitch, yaw, auto_rotate, hotspots_json |
| `leads` | Lead submissions: property_id, name, phone, email, message, source (direct/qr/embed) |
| `usage_counters` | Per-user quota tracking: active_properties_count, storage_used_bytes |
| `analytics_daily` | Per property/date: total_views, qr_views, direct_views, embed_views, leads_count |

### Key Enums (migration 012)
- `property_status`: draft, published, archived
- `property_visibility`: private, public
- `sub_status`: active, trialing, past_due, canceled, unpaid

### Plans (seeded in migration 012)
| Name | Monthly KES | Yearly KES | Max Properties | Storage |
|------|-------------|------------|----------------|---------|
| Free | 0 | 0 | 2 | 512 MB |
| Basic | 1,500 | 15,000 | 10 | 5 GB |
| Plus | 4,000 | 40,000 | 30 | 20 GB |
| Pro | 8,500 | 85,000 | 100 | 100 GB |

### Auto-triggers (migration 012)
- `on_auth_user_created` → inserts row into `profiles` + `usage_counters`
- `on_*_updated` → updates `updated_at` on profiles, properties, plans, subscriptions

## Key Design Decision: Unified Property Model
CloudPano, spaces, scenes, hotspots, and the org/multi-tenant model are **all removed**.
The single entity is `properties` (owned by a user, not an org).
- Public URL: `/p/[slug]`
- Embed URL: `/embed/[slug]`
- No CloudPano. No organizations. No multi-tenancy.

## Pinia Stores
- `stores/auth.ts` — `useAuthStore()`: user (JwtPayload), profile (AppProfile), isLoggedIn, displayName, avatarInitials, fetchProfile(), $reset()
- `stores/organization.ts` — **STALE**: still references old org/membership/plan_entitlements model from pre-012. Needs rewrite to user-level subscription model.

## Composables
- `composables/useApiFetch.ts` — wraps `$fetch` with `Authorization: Bearer <supabaseJwt>`. Uses `config.public.apiBaseUrl` (defaults to `http://localhost:3001` for Fastify backend).
- `composables/useProperties.ts` — full CRUD for properties: fetchProperties, fetchProperty(id), createProperty, updateProperty, deleteProperty, publishProperty. Calls `/api/properties/*`.

## Server API Routes (Nitro — this repo)
### Working / Current
- `GET  /api/health` — D1/R2 binding check (may be legacy wrangler artifact)
- `GET  /api/profile` — authenticated user's profile row
- `DELETE /api/hotspots/:id` — delete hotspot (legacy — hotspots table dropped in 012)

### Stale — reference old schema, need rewrite against migration 012
- `GET  /api/org/current` — queries `memberships` + `organizations` (dropped in 012)
- `POST /api/org/bootstrap` — creates org + membership (dropped in 012)
- `GET  /api/dashboard/summary` — queries `projects` + `project_analytics_daily` (dropped in 012)
- `GET  /api/leads` — queries `project_leads` (dropped in 012; new table is `leads`)
- `PATCH /api/leads/:id` — patches `project_leads`
- `DELETE /api/leads/:id` — soft-deletes `project_leads`
- `POST /api/analytics/tour-view` — references old analytics table

### Missing — frontend calls these but routes do not exist yet
- `GET  /api/properties` — list user's properties
- `POST /api/properties` — create property
- `GET  /api/properties/:id` — get property
- `PATCH /api/properties/:id` — update property
- `DELETE /api/properties/:id` — delete property
- `POST /api/properties/:id/publish` — publish/unpublish
- `POST /api/uploads/signed-url` — presigned PUT URL for R2
- `GET  /api/uploads/signed-url` — presigned GET URL for R2
- `GET  /api/dashboard/summary` — needs rewrite against `properties` + `analytics_daily`

## Server Utilities
- `server/utils/auth.ts` → `requireUser(event)` — verifies Supabase JWT, returns `{ id, email }`
- `server/utils/db.ts` → `serverDb()` — Supabase service-role client (bypasses RLS)
- `server/services/permissions.ts` — `getUserOrg`, `requireRole`, `requireActiveSubscription` (stale — org model)

## Initialization Flow (current)
1. `plugins/app-init.client.ts` — runs post-supabase; if session: calls `orgStore.fetchCurrentOrg()` + `authStore.fetchProfile()` in background; watches auth state changes
2. **Note:** `orgStore.fetchCurrentOrg()` calls the stale `/api/org/current` — needs to be replaced with user-level subscription fetch

## Route Map
| Route | Rendering | Auth | Notes |
|-------|-----------|------|-------|
| `/`, `/about`, `/pricing`, `/product`, `/contact`, `/blog/**`, `/legal/**` | prerender | none | Marketing |
| `/login`, `/register` | prerender | guest middleware | Auth pages |
| `/confirm` | ssr:false | none | Email confirm |
| `/app/**` | ssr:false | auth middleware | Dashboard |
| `/app` | ssr:false | auth | Dashboard home |
| `/app/properties` | ssr:false | auth | Properties list |
| `/app/properties/[id]` | ssr:false | auth | Property editor |
| `/app/leads` | ssr:false | auth | Leads dashboard |
| `/app/analytics` | ssr:false | auth | Analytics dashboard |
| `/app/billing` | ssr:false | auth | Billing (stub) |
| `/app/services` | ssr:false | auth | Photography (stub) |
| `/app/settings` | ssr:false | auth | Profile settings |
| `/p/[slug]` | ssr:false | none | Public property page |
| `/embed/[slug]` | ssr:false | none | Lightweight embed |

## App Layout (`layouts/app.vue`)
Dark sidebar (`--ink: #0a0a0a`) + light main area.
Sidebar sections: Overview / Content (Properties, Leads, Analytics) / Services (Photography) / Account (Billing, Settings, Logout).

## Design System
- Accent: `--accent: #00dc82` (electric green)
- `--ink: #0a0a0a`, `--paper: #ffffff`, `--slate: #6b7280`
- Blueprint grid on `body::before` (40px, opacity 0.4)
- Classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-danger`, `.btn-dark`
- `.card`, `.form-group`, `.form-label`, `.form-input`, `.modal-*`
- `.app-*` (shell), `.dash-*` (dashboard), `.stat-*` (metrics)
- `.skeleton-line`, `.toast--success/error`

## Implementation Status
### Done ✅
- Auth (email/password + Google OAuth, confirm flow, middleware)
- Pinia auth store
- Migration 012 — unified property schema
- Frontend composable `useProperties.ts` — full CRUD
- Dashboard shell, sidebar, topbar, app layout
- Properties list page + property editor page
- Leads dashboard page (`/app/leads`)
- Analytics dashboard page (`/app/analytics`)
- Public property page `/p/[slug]` — Pannellum viewer + lead form + analytics event
- Embed route `/embed/[slug]`
- QR on-demand generation, trackable `?src=qr|whatsapp|embed` links
- Marketing pages (homepage, pricing, product, about, blog, contact, legal)

### Stale / Needs Rewrite ⚠️
- `stores/organization.ts` — old org model; replace with user-level subscription store
- `server/api/org/` routes — query dropped tables; replace with user subscription lookup
- `server/api/dashboard/summary.get.ts` — queries `projects`/`project_analytics_daily`; rewrite for `properties`/`analytics_daily`
- `server/api/leads/` routes — query `project_leads`; rewrite for `leads` table
- `server/services/permissions.ts` — org-based permissions; simplify to user ownership checks
- `types/database.types.ts` — still has old schema types; needs regeneration from migration 012

### Not Yet Built ❌
- `/api/properties/*` server routes (all CRUD + publish)
- `/api/uploads/signed-url` (R2 presigned URLs)
- `/api/dashboard/summary` (rewritten for properties model)
- `/api/leads` CRUD (rewritten for `leads` table, not `project_leads`)
- `/api/analytics/*` (rewritten for `analytics_daily` table)
- Paystack billing integration
- Plan enforcement (quota checks, entitlement gates)

## Security
- `.env` and `.env.backup` — not git-tracked (protected by .gitignore)
- Old `.env.backup` has credentials for a different Supabase project — rotate if not done
- Every protected API route must call `requireUser(event)` from `server/utils/auth.ts`
- Backend (Fastify/Railway) is the trusted rules engine — quota and plan checks run there

## CI/CD
- `.github/workflows/build.yml` — build check CI for Vercel integration
- `.github/workflows/nuxtjs.yml` — disabled (renamed .disabled)
- Deploy: Vercel (connect repo, set `NITRO_PRESET=vercel`)
