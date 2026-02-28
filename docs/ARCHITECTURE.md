# Viewora — Architecture Overview

## Routing Map

| Route | Layout | Middleware | Auth | Notes |
|-------|--------|------------|------|-------|
| `/` | default | — | Public | Marketing homepage, prerendered |
| `/login` | default | guest | Redirect→`/app/spaces` | Prerendered |
| `/register` | default | guest | Redirect→`/app/spaces` | Prerendered |
| `/confirm` | default | — | Public | OAuth callback, SSR: false |
| `/pricing`, `/about`, etc. | default | — | Public | Prerendered |
| `/app/spaces` | app | auth | Required | Spaces dashboard, CSR only |
| `/app/spaces/[id]` | app | auth | Required | Space detail + scene upload |
| `/app/spaces/[id]/editor` | editor | auth | Required | Marzipano tour editor |
| `/app/billing` | app | auth | Required | Billing stub |
| `/app/settings` | app | auth | Required | Profile stub |
| `/tours/[slug]` | — | — | Public | Public tour viewer |

## Layouts

- **`layouts/default.vue`** — Marketing layout: `<NavBar /> + <slot /> + <Footer />`
- **`layouts/app.vue`** — Dashboard shell: dark ink sidebar (240px) + light main area. Mobile: slide-in drawer + top bar.
- **`layouts/editor.vue`** — Fullscreen editor: wraps slot in `.editor-shell` (position: fixed; inset: 0).

## Middleware

- **`middleware/auth.ts`** — Protects `/app/**`. Reads `useSupabaseUser()`; redirects to `/login` if null.
- **`middleware/guest.ts`** — Redirects authenticated users away from `/login`, `/register`, `/confirm` to `/app/spaces`.

## Composables

| File | Purpose | DB Table |
|------|---------|----------|
| `composables/useSpaces.ts` | CRUD for spaces | `spaces` |
| `composables/useScenes.ts` | CRUD for panorama scenes | `scenes` |
| `composables/useHotspots.ts` | CRUD for viewer hotspots | `hotspots` |

## Components

- **`components/NavBar.vue`** — Marketing navbar. Auth-aware: shows Dashboard/Logout when logged in.
- **`components/editor/MarzipanoViewer.vue`** — Client-side Marzipano 360° viewer. Emits `hotspot-placed` and `hotspot-navigate`.
- **`components/app/CreateSpaceModal.vue`** — (Legacy) modal; replaced by inline modal in spaces/index.vue.

## Key Config (`nuxt.config.ts`)

```typescript
supabase: {
  redirectOptions: {
    login: '/login',
    callback: '/confirm',
    include: ['/app/**'],   // micromatch glob — ALL /app subroutes are protected
  }
}
routeRules: {
  '/app/**': { ssr: false },   // Client-side only (user-specific data)
  '/confirm': { ssr: false },  // OAuth token exchange must be client-side
  '/tours/**': { ssr: false },
  // All marketing routes: prerendered for SEO
}
```

## Auth Flow

### Email/Password
1. User submits `/login` form → `supabase.auth.signInWithPassword()`
2. On success → `navigateTo('/app/spaces')`
3. `guest` middleware prevents return to `/login` while authenticated

### Google OAuth
1. User clicks "Continue with Google" → `supabase.auth.signInWithOAuth()` with `redirectTo: /confirm`
2. Google redirects to `/confirm` with `#access_token=...` in URL hash
3. Supabase JS SDK on `/confirm` automatically exchanges the token
4. `confirm.vue` watches `useSupabaseUser()` — once set, navigates to `/app/spaces`

### Email Confirmation (new signups)
1. User registers → sees "Check your email"
2. Clicks confirmation link → routed to `/confirm` (configured in Supabase Auth settings as Site URL + redirect)
3. Same flow as OAuth callback above
