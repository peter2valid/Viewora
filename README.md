# viewora-app

The auth-protected dashboard SPA for Viewora. Built with **Nuxt 3**, **Tailwind CSS**, **Pinia**, and **Supabase** auth. Deployed to `app.viewora.software`.

> **Standalone repo** — separate GitHub repository, deployed independently to **Vercel**. No shared code with `viewora-backend` or `viewora-marketing`.

1. **Authenticated users** — manage their spaces, upload media, view analytics, handle billing.
2. **The public** — view published spaces at `/p/[slug]` and embed spaces via `/embed/[slug]`.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Nuxt 3 (CSR/SPA mode for auth-protected routes) |
| Styling | Tailwind CSS v3 (via `@nuxtjs/tailwindcss`) |
| State | Pinia (`stores/auth.ts`, `stores/plan.ts`) |
| Auth | `@nuxtjs/supabase` — JWT stored in session, forwarded as Bearer token |
| 360° Viewer | Marzipano (installed), Pannellum (used via `PannellumViewer.vue`) |
| Fonts | Inter 400–700, Outfit 600–700 via Google Fonts |
| HTTP | `useApiFetch` composable wraps `$fetch` with the Supabase JWT |

---

## Folder Structure

```
viewora-app/
├── app.vue                    # Root layout shell, page transitions
├── nuxt.config.ts             # Modules, route rules, runtime config
├── tailwind.config.ts         # Design tokens (zinc palette, etc.)
├── .env.example               # Required environment variables
│
├── pages/
│   ├── index.vue              # Root redirect (→ /app or /login)
│   ├── login.vue              # Auth: email/password login
│   ├── register.vue           # Auth: email/password registration
│   ├── confirm.vue            # Auth: email confirmation callback
│   ├── reset-password.vue     # Auth: password reset
│   │
│   ├── app/                   # Auth-protected dashboard (all CSR, no-cache)
│   │   ├── index.vue          # Dashboard home — summary cards
│   │   ├── analytics.vue      # Analytics: views breakdown per space
│   │   ├── billing.vue        # Billing: plan selection, Paystack flow, usage
│   │   ├── settings.vue       # Profile/account settings
│   │   │
│   │   ├── spaces/
│   │   │   ├── index.vue      # Spaces list + create space modal
│   │   │   └── [id]/
│   │   │       └── index.vue  # Space detail: upload media, 360 settings, publish
│   │   │
│   │   ├── leads/
│   │   │   └── index.vue      # Leads inbox — all inquiries across spaces
│   │   │
│   │   └── capture/
│   │       └── index.vue      # 360 capture tool (plan-gated)
│   │
│   ├── p/
│   │   └── [slug].vue         # Public space viewer (no auth required)
│   │
│   └── embed/
│       └── [slug].vue         # Minimal embed-optimized viewer (iframe safe)
│
├── components/
│   ├── SidebarLink.vue        # Dashboard nav link with active state
│   └── app/
│       ├── ConfirmationModal.vue  # Reusable delete-confirm dialog
│       └── PannellumViewer.vue    # Pannellum-based 360° panorama viewer
│
├── composables/
│   ├── useApiFetch.ts         # $fetch wrapper that injects Supabase Bearer token
│   └── useSpaces.ts           # CRUD + publish operations for spaces
│
├── stores/
│   ├── auth.ts                # User identity, profile, displayName, initials
│   └── plan.ts                # Subscription status, plan limits, can() entitlement checks
│
├── middleware/
│   ├── auth.ts                # Redirects unauthenticated users to /login
│   ├── guest.ts               # Redirects authenticated users away from /login, /register
│   └── redirects.global.ts    # Global redirect rules
│
├── layouts/                   # Nuxt layouts (dashboard shell with sidebar)
├── plugins/                   # Nuxt plugins
├── server/                    # Nitro server routes (proxy if NUXT_PUBLIC_API_BASE_URL not set)
├── types/
│   └── database.types.ts      # Supabase-generated TypeScript types
└── assets/
    └── css/main.css           # Global CSS, Tailwind base
```

---

## Key Files Explained

### `composables/useApiFetch.ts`

The single HTTP abstraction for the entire app. Reads the Supabase session access token and injects it as `Authorization: Bearer <token>` on every call. Respects `NUXT_PUBLIC_API_BASE_URL` — if unset, calls go to Nitro proxy routes at `/api/*`; if set, calls go directly to the Fastify backend. This is the only way the app should make API calls.

### `composables/useSpaces.ts`

Encapsulates all space CRUD operations: `fetchSpaces`, `fetchSpace`, `createSpace`, `updateSpace`, `deleteSpace`, `publishSpace`. All calls go through `useApiFetch`. Spaces are called "spaces" in the frontend but stored as `properties` in the database — the backend normalizes this at the API boundary.

### `stores/auth.ts`

Wraps `useSupabaseUser()` into a Pinia store. Exposes: `user` (JWT payload), `profile` (from `/profile` API), `isLoggedIn`, `displayName`, `avatarInitials`. `fetchProfile()` loads the profile row from the backend on login.

### `stores/plan.ts`

Loaded once on login via `fetchSubscriptionStatus()`. Exposes the active plan's feature flags. Use `planStore.can('lead_capture_enabled')` to gate plan-specific UI. Falls back to a hardcoded Free plan object if the API fails. **Every premium UI element must check this store.**

### `pages/p/[slug].vue`

The public space viewer. Fetches space data server-side via `GET /spaces/by-slug/:slug` (no auth). Renders the Pannellum 360° viewer if a panorama media item exists, or falls back to a cover image. Includes the lead capture form (conditional on `space.lead_form_enabled`), gallery lightbox, and optional agency branding overlay. Fires `POST /analytics/view` on load.

### `pages/app/billing.vue`

Handles the entire billing lifecycle: plan listing, Paystack checkout initialization, success redirect handling, and subscription status display with usage meters.

---

## Route Rules (from `nuxt.config.ts`)

| Route | Mode | Notes |
|---|---|---|
| `/login`, `/register`, `/confirm`, `/reset-password` | CSR, no SSR | Auth pages |
| `/p/**` | CSR | Public space pages, no auth |
| `/embed/**` | CSR | Embed-safe, no auth |
| `/app/**` | CSR, `no-store` | Auth-protected dashboard |
| `/api/**` | — | `private, no-store` caching headers |
| `/**` (marketing) | Prerendered | N/A — this is the marketing site |

---

## Auth Flow

1. User logs in via Supabase on `/login`.
2. Supabase sets a session cookie/localStorage.
3. `middleware/auth.ts` guards all `/app/**` routes — redirects to `/login` if no session.
4. `useApiFetch` reads `useSupabaseSession().access_token` and forwards it on every backend call.
5. In **development only**, `middleware/auth.ts` is bypassed (`if (process.dev) return`).

---

## Setup & Run

```bash
cp .env.example .env
# Required:
# SUPABASE_URL=https://<ref>.supabase.co
# SUPABASE_KEY=<anon-key>
# Optional (defaults to Nitro proxy if unset):
# NUXT_PUBLIC_API_BASE_URL=http://localhost:3000

npm install
npm run dev     # http://localhost:3001
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SUPABASE_URL` | ✅ | — | Supabase project URL |
| `SUPABASE_KEY` | ✅ | — | Supabase anon/public key |
| `NUXT_PUBLIC_APP_URL` | — | `https://app.viewora.software` | App's own public URL |
| `NUXT_PUBLIC_API_BASE_URL` | — | `''` (same-origin Nitro) | Set to Fastify URL for external backend |

---

## Connection to the Rest of Viewora

- **Backend**: All data comes from `viewora-backend` via `useApiFetch`. The app does not query Supabase tables directly (except auth session management via `@nuxtjs/supabase`).
- **Marketing site**: `viewora-marketing` links to `app.viewora.software` for login/register and for any "Get Started" CTAs. The marketing site's `/login` and `/register` pages are thin redirects into this app.
- **Public space URLs**: `viewora.software` (marketing) can link to `app.viewora.software/p/[slug]` for any published space.
