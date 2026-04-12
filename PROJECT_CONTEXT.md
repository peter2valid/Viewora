# PROJECT_CONTEXT.md — viewora-app

Single source of truth for AI assistants and developers working in this repo. Updated April 2026.

---

## What This Repo Is

The auth-protected dashboard SPA for the Viewora 360° virtual tour platform.

- **GitHub repo**: `viewora-app` (standalone, separate from backend and marketing)
- **Deployed to**: Vercel → `app.viewora.software`
- **Framework**: Nuxt 3, CSR/SPA mode for protected routes
- **Auth**: Supabase (`@nuxtjs/supabase`)
- **Styling**: Tailwind CSS v3

---

## The Full Viewora System (for context)

Viewora is three independent repos. This repo is one of them.

| Repo | URL | Platform | Purpose |
|---|---|---|---|
| **viewora-app** (this repo) | `app.viewora.software` | Vercel | Auth dashboard + public space viewer |
| `viewora-backend` | `api.viewora.software` | Railway | Fastify REST API — all business logic |
| `viewora-marketing` | `viewora.software` | Vercel | Public marketing + SEO site (Nuxt SSG) |

**Infrastructure:**
- Auth + database: **Supabase** (Postgres)
- Media storage: **Cloudflare R2** (presigned URL uploads — browser → R2 directly)
- Payments: **Paystack**

This app never touches R2 or Paystack directly. All data goes through the backend API.

---

## Who Uses This App

Two audiences, same codebase:

1. **Authenticated users** (`/app/**`) — create/manage spaces, upload media, view analytics, manage billing.
2. **The public** (`/p/[slug]`, `/embed/[slug]`) — view published spaces, submit lead inquiries. No login required.

---

## Architecture

### API Communication

All HTTP calls go through `composables/useApiFetch.ts`. This composable:
- Reads the Supabase session access token
- Injects `Authorization: Bearer <token>` on every request
- Resolves the base URL from `NUXT_PUBLIC_API_BASE_URL` (if set) or falls back to same-origin Nitro proxy routes

**Never call `$fetch` directly.** Always use `useApiFetch`.

### Auth Flow

1. User signs in via Supabase on `/login` (email + password).
2. Supabase stores the session (localStorage/cookie).
3. `middleware/auth.ts` guards `/app/**` — redirects to `/login` if no session.
4. `useApiFetch` automatically attaches the JWT to every API call.
5. **In development**, `middleware/auth.ts` is bypassed (`if (process.dev) return`) — remove this line to test auth redirects locally.

### State Management

Two Pinia stores:

- **`stores/auth.ts`** — user identity, profile row from `/profile` API, `displayName`, `avatarInitials`.
- **`stores/plan.ts`** — subscription status, plan limits, `can('feature_flag')` entitlement checker. Loaded from `/billing/status` on login.

**Pattern:** `planStore.can('lead_capture_enabled')` before rendering any premium UI. The backend also enforces this — do both.

### Route Modes (from `nuxt.config.ts`)

| Route | Mode |
|---|---|
| `/app/**` | CSR only, `Cache-Control: no-store` |
| `/p/**` | CSR only (no auth) |
| `/embed/**` | CSR only (no auth, iframe-safe) |
| `/login`, `/register`, `/confirm`, `/reset-password` | CSR only |

---

## Key Files

| File | What it does |
|---|---|
| `composables/useApiFetch.ts` | **The only HTTP abstraction.** Wraps `$fetch` with Supabase JWT. |
| `composables/useSpaces.ts` | Space CRUD: `fetchSpaces`, `createSpace`, `updateSpace`, `deleteSpace`, `publishSpace`. |
| `stores/auth.ts` | User identity + profile. |
| `stores/plan.ts` | Plan limits + `can()` entitlement checks. |
| `pages/p/[slug].vue` | Public space viewer. Pannellum 360, gallery lightbox, lead form, analytics ping. |
| `pages/app/spaces/[id]/index.vue` | Space detail editor: media upload, 360 settings, publish. |
| `pages/app/billing.vue` | Full billing lifecycle: plan selection → Paystack checkout → subscription status. |
| `components/app/PannellumViewer.vue` | Pannellum-based 360° viewer. Client-only. |
| `middleware/auth.ts` | Auth guard for `/app/**`. Bypassed in dev. |

---

## The "Properties vs Spaces" Naming Issue

The database table is `properties`, and the column is `property_type`. However, **all API responses use `space_type`** — the backend normalizes this at the boundary. In this codebase, always use `space_type`, never `property_type`. The `Space` interface in `useSpaces.ts` is the source of truth for frontend field names.

---

## Upload Flow

Media never passes through the API server:

1. Call `POST /uploads/create-signed-url` → get `{ signedUrl, objectKey, publicUrl }`.
2. `PUT signedUrl` with the file bytes directly from the browser to Cloudflare R2.
3. Call `POST /uploads/complete` with `{ spaceId, mediaType, objectKey, publicUrl, width, height, fileSize }`.
4. Backend registers the media record in Supabase.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_KEY` | ✅ | Supabase anon (public) key |
| `NUXT_PUBLIC_APP_URL` | — | App's own public URL (default: `https://app.viewora.software`) |
| `NUXT_PUBLIC_API_BASE_URL` | — | Fastify backend URL. Leave empty to use Nitro proxy. |

---

## Known Gaps / Incomplete Work

| Area | Status |
|---|---|
| Marzipano | Installed in `package.json` but unused. Pannellum is the active 360 renderer. |
| Hotspots | `hotspots_json` exists in DB and 360 settings — no creation UI or rendering logic. |
| QR codes | Plan flags `qr_download_enabled` / `qr_svg_enabled` exist — not implemented. |
| Advanced analytics gating | `advanced_analytics_enabled` plan flag exists — analytics page doesn't enforce it yet. |
| Test coverage | None. |

---

## Rules for AI Editing This Repo

1. **Use `useApiFetch` for all API calls** — never raw `$fetch` or `useFetch`.
2. **Check `planStore.can()` before adding any premium feature UI**.
3. **Use `space_type`, never `property_type`** — the API normalizes this.
4. **Auth middleware is bypassed in dev** — don't be confused if `/app/**` loads without redirecting locally.
5. **Media goes to R2, not through the backend** — follow the two-step presigned URL pattern.
6. **Do not add Supabase direct queries in pages/components** — all data goes through the backend API endpoints.
7. **All `/app/**` pages are CSR only** — do not add `useFetch` with SSR enabled on dashboard pages.
