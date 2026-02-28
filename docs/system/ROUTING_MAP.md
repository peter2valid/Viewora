# ROUTING MAP — Viewora

**Generated:** 2026-02-28

---

## 1. Routing System

Nuxt 3 file-based routing. All routes are **prerendered** at build time (SSG mode). Auth protection is handled client-side by the `@nuxtjs/supabase` middleware after the HTML is already served.

---

## 2. Current Route Inventory

### Public Routes (no auth required)

| Route | File | Auth Status | Description |
|-------|------|-------------|-------------|
| `/` | `pages/index.vue` | Public | Homepage — hero, how-it-works, features, testimonials, CTA |
| `/about` | `pages/about.vue` | Public | Company mission and story |
| `/product` | `pages/product.vue` | Public | 4-step how-it-works walkthrough |
| `/pricing` | `pages/pricing.vue` | Public | 4-tier KES pricing with billing toggle |
| `/contact` | `pages/contact.vue` | Public | Contact info + broken form |
| `/blog` | `pages/blog/index.vue` | Public | Blog listing via @nuxt/content |
| `/blog/[slug]` | `pages/blog/[slug].vue` | Public | Individual blog post |
| `/legal/terms` | `pages/legal/terms.vue` | Public | Terms of Service |
| `/legal/privacy` | `pages/legal/privacy.vue` | Public | Privacy Policy |
| `/legal/refund` | `pages/legal/refund.vue` | Public | Refund Policy |
| `/register` | `pages/register.vue` | Public | Sign up form |

### Auth Routes (behavior depends on auth state)

| Route | File | Behavior When Authed | Behavior When Not Authed |
|-------|------|---------------------|-------------------------|
| `/login` | `pages/login.vue` | `@nuxtjs/supabase` redirects away (if configured) | Shows login form |
| `/confirm` | `pages/confirm.vue` | Used as OAuth callback — checks session | Shows "Confirmation Failed" |

### Authenticated Routes (requires session)

Currently **none** exist explicitly. The Supabase module's `redirectOptions.exclude` list protects all routes NOT listed, but there are no actual protected page files in the `pages/` directory.

---

## 3. Route Protection Mechanism Detail

```ts
// nuxt.config.ts
supabase: {
  redirectOptions: {
    login: '/login',        // Redirect here if session required but absent
    callback: '/confirm',   // OAuth callback handler page
    exclude: [              // These routes are exempt from auth check
      '/',
      '/about',
      '/pricing',
      '/product',
      '/contact',
      '/blog',
      '/blog/*',
      '/register'
    ]
  }
}
```

**How it works on a static site (GitHub Pages):**
The `@nuxtjs/supabase` module injects a Nuxt plugin that runs on the **client side** after the static HTML is delivered. This means:
1. Static HTML is served immediately (no auth check at CDN level)
2. Client-side JavaScript hydrates
3. Plugin checks for Supabase session
4. If no session on a protected route: `navigateTo('/login')`

**Security implication:** The HTML content of protected pages is technically accessible to anyone who can delay or intercept JavaScript execution. For a dashboard with sensitive data, this is acceptable only if the data is fetched client-side (not prerendered). If actual user tour data were SSR-rendered into the HTML, this model would leak data.

---

## 4. Post-Login Navigation Problem

After successful login, the user is redirected to `/`:
```js
// pages/login.vue:77
router.push('/')
```

The homepage (`/`) has NO authenticated-state content. The only change visible to a logged-in user is:
- NavBar shows "Dashboard" link (pointing to `/`) + "Log Out" button instead of "Log In" + "Start Free"

The "Dashboard" link also redirects to `/`. There is **no dashboard page**. A logged-in user has nowhere to go after authentication.

---

## 5. Required Future Routes (Product Roadmap)

### Dashboard (Protected)
```
/dashboard                  — Overview: stats, quick actions
/dashboard/tours            — Tour list
/dashboard/tours/new        — Create new tour
/dashboard/tours/[id]       — Edit tour (editor)
/dashboard/tours/[id]/edit  — Explicitly edit
/dashboard/properties       — Property management
/dashboard/properties/new   — Add property
/dashboard/analytics        — View analytics
/dashboard/billing          — Subscription management (Paystack)
/dashboard/settings         — Account settings
/dashboard/settings/profile — Profile editing
/dashboard/settings/brand   — White-label branding (Pro+)
/dashboard/team             — Team management (Elite only)
```

### Public Tour Viewer (No auth required)
```
/tours/[id]                 — Public tour view (published status only)
/embed/[id]                 — Embeddable iframe version of tour
```

### API / Server Routes (Nitro - for SSR mode)
```
/api/webhook/paystack       — Paystack payment webhook handler
/api/tours/[id]/view        — Increment view count
/api/leads                  — Submit lead capture form
```

---

## 6. Blog Route Detail

The blog uses Nuxt Content's dynamic `ContentList` and `ContentDoc` components:

```
/blog                       → ContentList fetches all docs at /content/blog/
/blog/how-virtual-tours-increase-airbnb-bookings → ContentDoc renders specific .md file
```

**Future content needed:** The blog has 1 post. For SEO impact, 15-20 posts minimum are recommended covering keywords like:
- "virtual tour software Kenya"
- "360 tour for Airbnb"
- "property marketing tools"
- "how to create virtual tour"

---

## 7. Route Rules (Prerendering)

```ts
// nuxt.config.ts
routeRules: {
  '/': { prerender: true },
  '/**': { prerender: true }  // Wildcard prerendering
}
```

**Known issue:** With `failOnError: false`, failed prerender attempts (e.g., blog posts referencing invalid images) will not stop the build. This masks errors.

**Limitation for future dashboard:** Dashboard routes with user-specific data CANNOT be prerendered meaningfully. These routes will need either:
1. `{ ssr: false }` — client-side rendering only (no SEO)
2. `{ prerender: false }` — requires a Node.js server (not GitHub Pages compatible)

**This means GitHub Pages deployment is incompatible with the product dashboard.** A migration to Vercel, Railway, or a VPS with a Node.js runtime is required.

---

## 8. Sitemap

The `@nuxtjs/seo` module auto-generates `sitemap.xml` at build time. Current sitemap includes all prerendered pages. Sitemap is available at `/sitemap.xml` in the build output.

**Canonical domain:** Set to `https://viewora.software` in `nuxt.config.ts` but `app.vue` uses `https://viewora.com`. The sitemap will use `viewora.software` for canonical URLs, conflicting with content referencing `viewora.com`.
