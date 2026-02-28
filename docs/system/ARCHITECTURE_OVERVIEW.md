# ARCHITECTURE OVERVIEW — Viewora

**Generated:** 2026-02-28
**Analyst:** Claude Code (Senior SaaS Architecture Review)
**Status:** Marketing Website Only — Core Product Not Yet Built

---

## 1. Executive Summary

**Viewora** is currently a **Nuxt 3 marketing/landing site** for an immersive 360° virtual tour SaaS platform. The codebase as it stands contains **zero product functionality** — no tour editor, no viewer, no dashboard, no upload logic, no subscription enforcement, and no payment integration. It is a pure marketing front-end that describes a product that has not yet been implemented in this repository.

This is not inherently a problem; it is a deliberate MVP marketing-first approach. However, the documentation, data types, and Supabase schema hint at a clear product vision that must be built next.

---

## 2. Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Nuxt 3 | ^3.10.0 | Vue 3 SSG/SSR hybrid |
| Language | TypeScript | Nuxt built-in | Partial adoption — types file exists but no strict typing |
| Styling | Custom CSS | — | Single `main.css` file, design token system via CSS variables |
| Auth | @nuxtjs/supabase | ^2.0.4 | Email/password + Google OAuth |
| Database | Supabase (PostgreSQL) | — | Remote; no local migration files |
| Storage | Supabase Storage | — | Referenced in types/pricing but NOT implemented |
| Payments | Paystack | — | Mentioned in UI and Terms but NO integration code |
| Content | @nuxt/content | ^2.13.4 | Markdown blog, 1 post exists |
| Images | @nuxt/image | ^2.0.0 | Installed, used via `<img>` tags (not `<NuxtImg>`) |
| SEO | @nuxtjs/seo | ^3.4.0 | OG Image, sitemap, structured data |
| Fonts | @nuxtjs/google-fonts | ^3.2.0 | Inter, Outfit, JetBrains Mono |
| Deployment | GitHub Pages | — | GitHub Actions CI/CD, static site |
| Viewer | Marzipano | External | Iframed from `marzipano.net` demo — NOT owned/hosted |

---

## 3. Framework Configuration

### Nuxt 3 Mode: Static Site Generation (SSG)
```ts
// nuxt.config.ts
routeRules: {
  '/': { prerender: true },
  '/**': { prerender: true }  // ALL routes prerendered
}
```

**Implication:** Every page is compiled to static HTML at build time and served from GitHub Pages. This means:
- No server-side computation at runtime
- Auth state is entirely client-side (via Supabase JS SDK)
- Supabase redirect-based auth protection works via the `@nuxtjs/supabase` middleware that runs on the client

### Supabase Module Configuration
```ts
supabase: {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_KEY,
  redirectOptions: {
    login: '/login',
    callback: '/confirm',
    exclude: ['/', '/about', '/pricing', '/product', '/contact', '/blog', '/blog/*', '/register']
  }
}
```

The `exclude` array defines **public routes**. Any route NOT in this list will trigger an automatic redirect to `/login` if the user is not authenticated. This is the only form of access control in the codebase.

---

## 4. Application Structure

```
nuxt-ar-code-clone/
├── app.vue                    # Root component, global SEO meta, structured data
├── nuxt.config.ts             # Framework config (modules, supabase, routeRules, SEO)
├── package.json               # Dependencies
├── .env.backup                # ⚠️ CRITICAL: Real credentials committed to repo
├── .gitignore                 # Correctly excludes .env (but .env.backup is listed as *.backup)
│
├── assets/
│   └── css/
│       └── main.css           # Entire design system — CSS variables, components, utilities
│
├── layouts/
│   └── default.vue            # NavBar + slot + Footer wrapper
│
├── components/
│   ├── NavBar.vue             # Navigation with auth state, mobile menu, sign out
│   ├── Footer.vue             # Static footer with links and Paystack mention
│   ├── FeaturesSection.vue    # Industry use case cards (Real Estate, Airbnb, etc.)
│   └── HeroSection.vue        # (referenced but component is inline in pages/index.vue)
│
├── pages/
│   ├── index.vue              # Homepage — hero, stats, how-it-works, features, CTA
│   ├── about.vue              # Company story, mission statement
│   ├── product.vue            # 4-step how-it-works walkthrough
│   ├── pricing.vue            # 4-tier KES pricing (Basic/Plus/Pro/Elite), billing toggle
│   ├── contact.vue            # Contact info + non-functional form (alert() only)
│   ├── login.vue              # Email/password + Google OAuth sign in
│   ├── register.vue           # Email/password + Google OAuth sign up
│   ├── confirm.vue            # Email confirmation callback (setTimeout hack)
│   ├── blog/
│   │   ├── index.vue          # Blog listing via @nuxt/content ContentList
│   │   └── [slug].vue         # Blog post via ContentDoc
│   └── legal/
│       ├── terms.vue          # Terms of Service (static, dated Oct 2023)
│       ├── privacy.vue        # Privacy Policy (static, dated Oct 2023)
│       └── refund.vue         # Refund Policy (not read but file exists)
│
├── content/
│   └── blog/
│       └── how-virtual-tours-increase-airbnb-bookings.md  # 1 blog post
│
├── public/
│   └── images/home/           # 10 marketing images (PNG)
│
├── types/
│   └── database.types.ts      # TypeScript schema for 4 Supabase tables
│
└── .github/
    └── workflows/
        └── nuxtjs.yml          # GitHub Actions: build → static export → deploy to Pages
```

---

## 5. Authentication Architecture

### Flow
1. User visits any non-excluded route → `@nuxtjs/supabase` middleware detects no session → redirects to `/login`
2. User submits credentials → `supabase.auth.signInWithPassword()` called on client
3. On success → `router.push('/')` (redirects to homepage, NOT a dashboard)
4. For Google OAuth → `signInWithOAuth({ provider: 'google', options: { redirectTo: '/confirm' } })`
5. `/confirm` page uses a `setTimeout(2000)` then checks `useSupabaseUser()` — crude timing hack

### Auth Composables Used
- `useSupabaseClient()` — raw Supabase client
- `useSupabaseUser()` — reactive user state
- `useRouter()` — navigation after auth

### Critical Auth Gaps
- After login, user lands on `/` (public homepage with no dashboard content)
- No dashboard route exists
- No profile completion step after registration
- Password reset is linked to `#` — not implemented
- "Remember me" checkbox is decorative — does nothing
- `confirm.vue` relies on timing (2s delay) rather than proper token exchange event

---

## 6. Component Architecture

All components are **presentational only**. Zero Pinia stores, zero Vuex, zero composable state management beyond Vue's built-in `ref()`. State is:
- Local (`ref()` in `<script setup>`)
- Auth state via `useSupabaseUser()` (global reactive)

**NavBar.vue** is the only component that reads global auth state (`useSupabaseUser()`) to conditionally show Login/Register vs Dashboard/Logout.

---

## 7. Content Architecture

Blog content is managed via `@nuxt/content` (v2). Markdown files live in `/content/blog/`. The blog uses:
- `ContentList` for listing all posts
- `ContentDoc` for rendering individual posts
- Frontmatter fields: `title`, `description`, `category`, `author`, `date`, `image`

Currently **1 blog post** exists. Blog images are loaded from external Unsplash URLs (no CDN control, privacy concern).

---

## 8. Design System

The entire design system lives in `assets/css/main.css` as a single 742-line file. It uses CSS custom properties (design tokens) for:
- Color palette (ink/paper/accent scheme)
- Typography (Inter, Outfit, JetBrains Mono)
- Shadows, borders, spacing
- Component classes: `.btn`, `.card`, `.container`, `.section`, `.grid-2`, `.grid-3`, etc.

**Aesthetic**: Linear/Vercel/Framer-inspired technical minimalism. Blueprint grid background on `body`. Electric green (`#00dc82`) accent.

---

## 9. Deployment Architecture

- **Platform**: GitHub Pages (static CDN)
- **CI/CD**: GitHub Actions on push to `main`
- **Build**: `npm run generate` → Nuxt SSG → `.output/public/`
- **Assets**: Compressed with Brotli + gzip (Nitro `compressPublicAssets: true`)
- **Env Vars**: Injected via GitHub Secrets (`SUPABASE_URL`, `SUPABASE_KEY`)

**Limitation**: GitHub Pages cannot run a Node.js server. All routes must be pre-generated at build time. This is fine for the current marketing site but will become a **critical blocker** when the actual product dashboard is built — dashboards require server-rendered or client-only routes (not prerendered).

---

## 10. What Does NOT Exist (Product Gap)

The following advertised features have **zero implementation** in this codebase:

| Feature | Status |
|---------|--------|
| Tour Editor (hotspot placement, room linking) | Not started |
| Panorama Upload to Supabase Storage | Not started |
| Tour Viewer (Marzipano or equivalent) | Not started (external iframe used in demo) |
| User Dashboard | Not started |
| Subscription enforcement | Not started |
| Paystack payment integration | Not started |
| Analytics (tour views, leads) | Not started |
| White-label branding system | Not started |
| Public tour URL (`/tours/:id`) | Not started |
| Lead capture forms inside tours | Not started |
| Google Street View publishing | Not started |
| Multi-property management | Not started |
| Team accounts | Not started |
| Custom domain option | Not started |
| QR code generation | Not started |
