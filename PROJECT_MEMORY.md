# PROJECT MEMORY — Viewora

**Last Updated:** 2026-02-28
**Purpose:** Persistent context file for Claude and any developer working on this codebase.
**IMPORTANT:** Claude Code must reference this file at the start of every session.

---

## 1. What Viewora Is

**Viewora** is a Kenyan-founded SaaS platform for creating, hosting, and sharing interactive 360° virtual tours. The target market is real estate agents, Airbnb hosts, property developers, car dealerships, and hospitality businesses across East Africa and globally.

**Domain:** viewora.software (primary) / viewora.com (also referenced — inconsistency exists)
**Location:** Juja, Kiambu County, Kenya
**Currency:** KES (Kenyan Shillings) for pricing
**Payment Processor:** Paystack (not yet integrated)
**Contact:** peterbjorogeirungu76@gmail.com (developer personal email — needs business email)

---

## 2. What Problem It Solves

Property buyers, renters, and guests make decisions based on static 2D photos that can be manipulated with wide angles and editing. This creates:
- Wasted physical viewings for agents
- Disappointed guests for Airbnb hosts
- Longer sales cycles for developers

Viewora allows any business to create an immersive 360° walkthrough that builds trust, reduces friction, and closes more deals — without needing expensive hardware or technical knowledge.

---

## 3. Current State of the Codebase

**CRITICAL REALITY:** This is a **marketing website only**. Zero product features are implemented.

### What exists:
- Nuxt 3 marketing landing pages (homepage, about, product, pricing, contact, blog)
- Email/password + Google OAuth authentication via @nuxtjs/supabase
- Supabase database schema (TypeScript types only — 4 tables)
- Static blog with 1 article (Nuxt Content)
- CI/CD via GitHub Actions → GitHub Pages
- Design system: CSS variables, Vercel/Linear aesthetic, Electric green accent (#00dc82)

### What does NOT exist:
- Tour editor (hotspot placement, room linking)
- Panorama upload system
- Marzipano viewer integration (only external iframe demo in hero)
- User dashboard
- Subscription enforcement
- Paystack payment integration
- Analytics system
- White-label branding
- Public tour URL (`/tours/:id`)
- Lead capture inside tours
- Any API server routes

---

## 4. Technical Architecture

```
Framework:    Nuxt 3 (^3.10.0) — SSG mode
Language:     TypeScript (partial — types file exists)
Styling:      Single CSS file (assets/css/main.css) — CSS variables design system
Auth:         @nuxtjs/supabase ^2.0.4 (email + Google OAuth)
Database:     Supabase (PostgreSQL) — remote project: tpfxwybnywojwqjxtvcr
Storage:      Supabase Storage — NOT yet implemented
Payments:     Paystack — mentioned only, zero code
Content:      @nuxt/content ^2.13.4 (Markdown blog)
Images:       @nuxt/image ^2.0.0 (installed but NOT used — all plain <img> tags)
SEO:          @nuxtjs/seo ^3.4.0 (sitemap, OG images, schema.org)
Fonts:        Inter, Outfit, JetBrains Mono (via @nuxtjs/google-fonts)
Deployment:   GitHub Pages (static) — MUST migrate to Vercel for product
Viewer:       Marzipano (planned) — currently external iframe only
```

---

## 5. Database Schema (4 Tables)

```
profiles    → id (FK auth.users), full_name, phone, plan, created_at
properties  → id, user_id, name, address, property_type, created_at
virtual_tours → id, property_id, title, tour_url, status, created_at
subscriptions → id, user_id, plan, billing_freq, status, created_at
```

**Critical missing tables:** `scenes`, `hotspots`, `leads`, `tour_analytics`, `user_files`
**Critical missing fields:** `current_period_end` on subscriptions, `slug` on virtual_tours, `paystack_customer_code`
**Critical missing setup:** RLS policies (status unknown), PostgreSQL enums, database indexes

---

## 6. Pricing Tiers (KES)

| Plan | Monthly | Yearly | Tours | Storage |
|------|---------|--------|-------|---------|
| Basic | 1,500 | 15,000 | 2 | 2 GB |
| Plus | 4,000 | 40,000 | 15 | 8 GB |
| Pro | 8,500 | 85,000 | 40 | 20 GB |
| Elite | 18,000 | 180,000 | 120 | 50 GB |

Yearly = exactly 10x monthly (should be ~20% discount = 12x monthly for "save 20%"). **Math inconsistency on pricing page.**

---

## 7. Active Security Issues

1. **CRITICAL: `.env.backup` is committed to git** — contains real Supabase URL + anon key. Must rotate credentials immediately.
2. **HIGH: RLS policy status unknown** — must verify all 4 tables have RLS enabled with correct policies
3. **HIGH: Contact form never sends data** — `submitForm()` only does `alert()`, no backend
4. **HIGH: Google Analytics placeholder ID** (`G-XXXXXXXXXX`) loads script on every page
5. **MEDIUM: Password reset links to `#`** — not implemented
6. **MEDIUM: "Remember me" checkbox does nothing**
7. Personal email exposed in contact page
8. OG image, favicon, and Viewora logo are all placeholder references (files don't exist)

---

## 8. Current Limitations

### Infrastructure
- GitHub Pages = static only — no server routes, no webhooks, no SSR
- Must migrate to Vercel before building product dashboard
- Supabase Free tier: 1GB storage, 500MB database, 50,000 MAU

### Codebase
- No Pinia state management — all local refs (will not scale to dashboard)
- No composables directory — no reusable data fetching logic
- No server routes (`/server/api/`) — required for Paystack webhooks
- Single 742-line CSS file — needs modularization for scale
- `<img>` tags not `<NuxtImg>` — no WebP optimization, no responsive images
- `failOnError: false` in prerender — masks build errors silently

### Schema
- No migration files — schema exists only in Supabase dashboard + TypeScript types
- No enum constraints on status fields — invalid values insertable
- No subscription enforcement logic anywhere
- `profiles.plan` and `subscriptions.plan` both exist — sync problem

---

## 9. Key Technical Decisions Made

| Decision | Rationale |
|----------|-----------|
| Nuxt 3 (not Next.js/SvelteKit) | Vue ecosystem, good Supabase module support, SSG for marketing |
| Supabase (not Firebase/custom Postgres) | Instant auth + storage + DB, free tier for MVP, PostgREST API |
| GitHub Pages | Zero-cost hosting for static marketing site MVP |
| Paystack (not Stripe) | Kenya/Africa-first payment gateway, M-Pesa support, KES currency |
| Marzipano (planned) | Open source, WebGL, mobile-optimized, MIT license |
| Single CSS file | Fast iteration during design phase; needs modularization soon |
| KES pricing | Primary market is Kenya/East Africa; international expansion later |

---

## 10. Roadmap Direction

### Immediate (Before any product code)
1. Rotate Supabase credentials (SEC-001 — CRITICAL)
2. Remove .env.backup from git history
3. Migrate deployment to Vercel
4. Verify/enable RLS on all tables
5. Add Supabase CLI migrations
6. Connect contact form to email backend (Resend/SendGrid)
7. Add real OG image, favicon, Viewora logo
8. Replace placeholder GA ID or remove script
9. Implement password reset flow
10. Fix "Remember me" checkbox

### Next (Dashboard MVP)
1. Create `/dashboard` route structure
2. Install Pinia
3. Build `composables/` (useSubscription, useTours, useProperties, useStorage)
4. Build upload component with Supabase Storage
5. Create `scenes` and `hotspots` tables
6. Integrate Paystack (initialize + verify + webhook)
7. Build tour editor with Marzipano
8. Build public tour viewer (`/tours/:id`)

### Later (Growth)
1. Analytics (tour views, lead tracking)
2. White-label branding system
3. Google Street View publishing
4. Mobile app (Expo/React Native viewer)
5. Panorama stitching service
6. Team accounts
7. Custom domain support (Elite)

---

## 11. Principles

- **Security First**: RLS on every table. Server enforces limits, not just UI.
- **API-First**: Every operation exposed as composable → enables mobile app sharing the same layer
- **Clean Architecture**: Separate concerns — pages are thin, logic lives in composables/stores
- **SaaS Grade**: Subscription enforcement, analytics, white-label from Day 1 architecture
- **Africa-First UX**: Mobile-first, works on slow connections, WhatsApp sharing as primary distribution
- **Brutally Honest Progress**: This is a marketing site. The product must be built. No confusing the two.

---

## 12. File Reference Index

```
nuxt.config.ts              — Framework config, module setup, route rules
types/database.types.ts     — Database schema (TypeScript)
assets/css/main.css         — Entire design system
layouts/default.vue         — NavBar + Footer wrapper
components/NavBar.vue       — Navigation + auth state
components/Footer.vue       — Footer with Paystack mention
components/FeaturesSection.vue — Industry use case cards
pages/index.vue             — Homepage
pages/pricing.vue           — 4-tier pricing, billing toggle
pages/login.vue             — Auth: email/password + Google
pages/register.vue          — Auth: sign up form
pages/confirm.vue           — OAuth callback (setTimeout hack)
pages/product.vue           — How it works walkthrough
pages/about.vue             — Company mission
pages/contact.vue           — Contact info + broken form
pages/blog/index.vue        — Blog listing
pages/blog/[slug].vue       — Blog post renderer
pages/legal/terms.vue       — Terms of Service (Oct 2023)
pages/legal/privacy.vue     — Privacy Policy (Oct 2023)
.github/workflows/nuxtjs.yml — GitHub Actions deployment
.env.backup                 — ⚠️ REAL CREDENTIALS — DO NOT COMMIT — ROTATE NOW
docs/system/                — Full system documentation (this analysis)
```

---

## 13. Constraints

- **Budget**: Bootstrapped startup — must use free tiers where possible initially
- **Server**: No dedicated server — serverless/edge/PaaS preferred
- **Supabase**: Free tier constraints (1GB storage, 500MB DB, 50K MAU)
- **Team**: Solo or very small team — architecture must enable one developer to build the full product
- **Geographic**: Primary users are in Kenya, but global distribution needed for panorama CDN
- **Bandwidth**: African mobile networks are often slow (3G/4G) — panorama loading must be progressive
- **Device**: Primary device is mobile phone — tour viewer must be fully gyroscope-enabled on iOS/Android
