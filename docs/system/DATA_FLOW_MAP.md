# DATA FLOW MAP — Viewora

**Generated:** 2026-02-28

---

## 1. Current Data Flows (Implemented)

### 1.1 Authentication Flow — Email/Password

```
[User] → /register (form submit)
  → supabase.auth.signUp({ email, password, data: { full_name } })
  → Supabase Auth creates auth.users record
  → Supabase sends confirmation email
  → user sees successMsg in UI

[User] → clicks email link
  → redirected to /confirm
  → setTimeout(2000) → useSupabaseUser() checked
  → if user.value exists: show "Email Confirmed!"
  → user must manually click "Log In"

[User] → /login (form submit)
  → supabase.auth.signInWithPassword({ email, password })
  → Supabase Auth validates, returns session
  → session stored in browser localStorage/cookie by Supabase SDK
  → router.push('/') → user lands on public homepage
```

### 1.2 Authentication Flow — Google OAuth

```
[User] → clicks "Continue with Google" on /login or /register
  → supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/confirm' })
  → browser redirected to Google OAuth
  → Google redirects back to Supabase callback URL
  → Supabase exchanges code for session
  → Supabase redirects to /confirm
  → setTimeout(2000) → useSupabaseUser() checked
  → if user.value exists: show "Email Confirmed!"
```

### 1.3 Sign Out Flow

```
[User] → clicks "Log Out" in NavBar
  → supabase.auth.signOut()
  → session cleared from browser
  → router.push('/login')
```

### 1.4 Route Protection Flow

```
[User] → navigates to any route NOT in supabase.redirectOptions.exclude
  → @nuxtjs/supabase middleware intercepts
  → checks for active session
  → if no session: redirect to /login
  → if session: allow navigation
```

**Public routes (excluded from auth check):**
- `/`
- `/about`
- `/pricing`
- `/product`
- `/contact`
- `/blog`
- `/blog/*`
- `/register`

**All other routes (will require auth):**
- `/login` (excluded via different mechanism — redirect if already logged in)
- `/confirm`
- Any future `/dashboard/*` routes

### 1.5 Blog Content Flow

```
[Build Time] Nuxt Content scans /content/blog/*.md
  → parses frontmatter (title, description, category, author, date, image)
  → generates content API endpoints
  → prerendered into static HTML

[Runtime] /blog
  → ContentList component queries content API
  → renders article cards with metadata

[Runtime] /blog/[slug]
  → useAsyncData fetches article by slug
  → ContentDoc renders full markdown
  → SEO meta set from frontmatter
```

---

## 2. Intended Data Flows (Not Yet Implemented)

### 2.1 Tour Creation Flow (Product Vision)

```
[User] → authenticated dashboard
  → selects "New Tour"
  → fills tour title, property selection
  → INSERT into virtual_tours (property_id, title, status='draft')

[User] → upload panorama images
  → supabase.storage.from('panoramas').upload(file)
  → get public URL or signed URL
  → associate image with tour scene

[User] → open editor
  → Marzipano renders panorama in canvas
  → user clicks to place hotspots
  → hotspot data saved (target scene, yaw, pitch)
  → saves to scenes/hotspots table (NOT YET IN SCHEMA)

[User] → publish tour
  → UPDATE virtual_tours SET status='published', tour_url='...'
  → generates public URL: /tours/{id}
```

### 2.2 Subscription Flow (Product Vision)

```
[User] → /pricing → clicks plan
  → redirect to Paystack checkout
  → Paystack processes payment
  → Paystack webhook → backend endpoint
  → INSERT into subscriptions (user_id, plan, billing_freq, status='active')
  → UPDATE profiles SET plan='{plan}'

[Subscription Check] → any feature access attempt
  → SELECT from subscriptions WHERE user_id = auth.uid() AND status = 'active'
  → compare plan level vs feature requirement
  → allow or block
```

### 2.3 Tour Viewing Flow (Product Vision)

```
[Visitor] → /tours/{tour_id} (public route)
  → SELECT from virtual_tours WHERE id = tour_id AND status = 'published'
  → load panorama URLs
  → Marzipano viewer initializes with scene/hotspot data
  → viewer renders 360° panorama
  → hotspot click → transitions to next scene
```

---

## 3. Data Store Architecture

### 3.1 Supabase Auth (auth.users)
- Managed entirely by Supabase
- Contains: id (UUID), email, created_at, user_metadata (full_name)
- Accessed via: `useSupabaseUser()`, `useSupabaseClient().auth`

### 3.2 Supabase PostgreSQL (public schema)

**profiles** — user profile extending auth.users
```
id (UUID, FK → auth.users.id)
full_name (text, nullable)
phone (text, nullable)
plan (text, default unknown — 'free'? not specified)
created_at (timestamp)
```
**NOTE:** This table is defined in TypeScript types but never queried in any existing page.

**properties** — user's properties/locations
```
id (UUID)
user_id (UUID, FK → auth.users.id)
name (text)
address (text, nullable)
property_type (text)
created_at (timestamp)
```
**NOTE:** Not queried anywhere. No `property_type` enum defined.

**virtual_tours** — tours associated with properties
```
id (UUID)
property_id (UUID, FK → properties.id)
title (text)
tour_url (text, nullable)
status (text — 'draft'/'published'?)
created_at (timestamp)
```
**NOTE:** Not queried anywhere. No `status` enum. Missing scene/hotspot structure entirely.

**subscriptions** — subscription records
```
id (UUID)
user_id (UUID, FK → auth.users.id)
plan (text)
billing_freq (text — 'monthly'/'yearly'?)
status (text — 'active'/'cancelled'/'expired'?)
created_at (timestamp)
```
**NOTE:** Not queried anywhere. No webhook handler to populate this table.

### 3.3 Browser Storage
- Supabase session: stored in `localStorage` by the Supabase JS SDK
- No application-level localStorage or sessionStorage usage

### 3.4 Nuxt Content Cache
- Blog content cached in `.data/content/contents.sqlite` (SQLite)
- Also cached in `.nuxt/content-cache/`

---

## 4. External Data Sources

| Source | Usage | Risk |
|--------|-------|------|
| Supabase (tpfxwybnywojwqjxtvcr.supabase.co) | Auth + DB | Credentials in .env.backup committed |
| Marzipano.net | Hero iframe demo only | External dependency, not owned |
| Unsplash (via URL in blog post) | Blog post cover image | External CDN, privacy implications |
| Google (GTM/Analytics) | Tracking (placeholder IDs) | Not active (placeholder G-XXXXXXXXXX) |
| Google OAuth | Social login | Configured via Supabase |
| Paystack | Payments | Mentioned only — zero code |
| Cloudflare | CDN (mentioned in Privacy Policy) | Not configured in codebase |

---

## 5. State Management Summary

| State Type | Implementation | Location |
|-----------|---------------|----------|
| Auth user | `useSupabaseUser()` | Global (Nuxt plugin) |
| Supabase client | `useSupabaseClient()` | Global (Nuxt plugin) |
| Billing toggle | `ref('monthly')` | `pages/pricing.vue` local |
| Mobile menu | `ref(false)` | `components/NavBar.vue` local |
| Form state | `ref('')` | `pages/login.vue`, `register.vue` local |
| Blog content | `useAsyncData()` | `pages/blog/[slug].vue` |
| Desktop detection | `ref(true)` + `window.resize` | `pages/product.vue` local |

**No global state management library (Pinia, Vuex) is installed or used.**
