# PERFORMANCE & SCALABILITY REVIEW — Viewora

**Generated:** 2026-02-28

---

## 1. Executive Summary

The current marketing site has **excellent performance characteristics** for a static website: prerendered HTML, Brotli/gzip compressed assets, CDN-hosted on GitHub Pages, minimal JavaScript. A Lighthouse score of 90+ is achievable on all metrics.

However, the **planned product** (tour editor + viewer + dashboard) introduces several performance challenges that must be addressed architecturally before they become embedded technical debt.

---

## 2. Current Site Performance

### What Works Well
| Concern | Status | Notes |
|---------|--------|-------|
| HTML delivery speed | Excellent | Prerendered static HTML, zero TTFB beyond CDN latency |
| Asset compression | Excellent | Brotli + gzip via Nitro |
| JavaScript bundle | Good | Minimal JS — no heavy libraries |
| Font loading | Good | `display: swap`, prefetch/preconnect configured |
| Image `loading="lazy"` | Good | All `<img>` tags use lazy loading |
| Payload extraction | Disabled | `payloadExtraction: false` — avoids duplicate data in hydration |

### Performance Issues (Current Site)

#### PERF-001 — `<img>` Tags Instead of `<NuxtImg>`
**Impact:** Medium
All marketing images use plain HTML `<img>` tags:
```html
<img src="/images/home/hardware-setup.png" loading="lazy" alt="..." style="..." />
```
The `@nuxt/image` module is installed but never used. `<NuxtImg>` would provide:
- Automatic WebP conversion (30-50% size reduction)
- Responsive `srcset` generation for different screen sizes
- Built-in width/height placeholders to prevent layout shift (CLS)

**Estimated gain:** 200-500KB reduction in image payload per page.

#### PERF-002 — External Marzipano iframe in Hero
**Impact:** Medium
```html
<iframe src="https://www.marzipano.net/demos/sample-tour/" ...></iframe>
```
This loads a full external website inside the hero section:
- Makes requests to `marzipano.net` servers (external dependency, potential downtime)
- Loads its own JavaScript bundle, fonts, and assets (estimated 1-3MB)
- Adds multiple HTTP connections (potential CORS issues)
- If marzipano.net changes their demo URL, the hero breaks silently

**Fix:** Host a minimal self-contained Marzipano demo locally, or use a video loop of a tour as the hero instead.

#### PERF-003 — Google Analytics Script with Placeholder ID
**Impact:** Low-Medium
```js
src: 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX'
```
This loads Google's GTM script on every page, adding a render-blocking or async request to Google's servers even though the tracking ID is invalid. Real-world impact: ~150-200ms added to network waterfall.

#### PERF-004 — `body` Blueprint Grid via CSS Background
**Impact:** Low
The body has a `background-image` with two `linear-gradient` layers for the blueprint grid effect:
```css
background-image:
  linear-gradient(var(--border) 1px, transparent 1px),
  linear-gradient(90deg, var(--border) 1px, transparent 1px);
background-size: 40px 40px;
background-attachment: fixed;
```
The `background-attachment: fixed` forces repaint on every scroll on many browsers (especially mobile Safari). On mobile, this can cause noticeable jank.

**Fix:** Remove `background-attachment: fixed` or implement the grid as an SVG pattern instead.

#### PERF-005 — Floating Button CSS Animation
**Impact:** Low
```css
.btn-float {
  animation: float 4s ease-in-out infinite;
}
```
Continuous `transform: translateY()` animation on CTA buttons. While `transform` is GPU-accelerated, continuous animations on multiple elements prevent the browser from optimizing paint cycles. Consider `prefers-reduced-motion` media query.

---

## 3. Future Product Performance Concerns

### PERF-006 — Large Image Handling (360° Panoramas)
**Impact:** CRITICAL for product

360° panorama images are large by nature:
- Standard equirectangular: 8,000 × 4,000px JPEG = 15-45MB raw
- Marzipano's tile-based approach loads tiles progressively, but the initial processing still happens

**Required architecture for scalable panorama loading:**
1. **Upload**: User uploads raw panorama (up to 50MB)
2. **Process**: Edge Function triggers image tiling via a tool like `sharp` or a dedicated tiling service
3. **Store**: Tiles stored in Supabase Storage at multiple zoom levels (0: 256x256, 1: 512x512, 2: 1024x1024)
4. **Serve**: Marzipano viewer loads only the tiles visible in the current viewport

Without tiling, loading a single 30MB panorama on a mobile connection (~10Mbps = 3 seconds minimum) makes the viewer unusable.

### PERF-007 — Signed URL Generation at Scale
**Impact:** High

For private tours (draft status), Supabase Storage signed URLs are required. Each signed URL has an expiry time (default 1 hour). Issues at scale:
- If a tour has 20 scenes, that's 20 signed URL generation API calls on every page load
- At 1,000 concurrent users, each loading a 20-scene tour = 20,000 signed URL requests/minute to Supabase
- Supabase's free tier rate limits will be hit quickly

**Recommended approach:**
- Use public buckets for published tours (only `status='published'` tours served)
- Signed URLs only for editor preview (1 URL at a time, short session)
- Cache signed URLs client-side until near expiry

### PERF-008 — Supabase Query Patterns
**Impact:** High

The database queries that will be needed for the dashboard have multiple N+1 query risks:
```js
// Anti-pattern: fetching properties then tours separately
const { data: properties } = await supabase.from('properties').select('*')
for (const property of properties) {
  const { data: tours } = await supabase.from('virtual_tours')
    .select('*').eq('property_id', property.id)
}
// N properties = N+1 queries
```

**Required approach:**
```js
// Use Supabase's PostgREST foreign key joins
const { data } = await supabase.from('properties')
  .select(`
    *,
    virtual_tours(id, title, status, cover_image_url, view_count)
  `)
  .eq('user_id', user.id)
// 1 query, returns nested data
```

### PERF-009 — Missing Database Indexes
**Impact:** High at scale

No index definitions are visible in the codebase. At 10,000 users with an average of 10 properties and 5 tours each:
- `virtual_tours` table: ~500,000 rows
- Without index on `property_id`: full table scan for every dashboard load
- Without index on `status`: full table scan for every public tour request

**Required indexes (minimum):**
```sql
CREATE INDEX idx_profiles_plan ON profiles(plan);
CREATE INDEX idx_properties_user_id ON properties(user_id);
CREATE INDEX idx_virtual_tours_property_id ON virtual_tours(property_id);
CREATE INDEX idx_virtual_tours_status ON virtual_tours(status);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
```

### PERF-010 — SSR Performance for Dashboard
**Impact:** High

The current architecture (SSG + GitHub Pages) cannot support a real dashboard. When migrating to SSR (required for the product), every dashboard page load will:
1. Execute server-side Nuxt code
2. Make Supabase database queries
3. Wait for data
4. Send HTML to client

Without caching, a dashboard with 5 sections each making 2-3 Supabase queries = 10-15 round trips per page load. At 1,000 concurrent users, this is 15,000 Supabase queries/second at peak.

**Mitigation strategies:**
- Supabase query caching with `staleTime` (via TanStack Query / Pinia)
- Edge caching of public tour data (Cloudflare Workers)
- Supabase Realtime for live updates instead of polling
- Dashboard data batching with PostgREST single-query joins

### PERF-011 — Hotspot Rendering Efficiency (Viewer)
**Impact:** Medium

Marzipano renders hotspots as DOM elements overlaid on the WebGL canvas. For a tour with many hotspots:
- Each hotspot is an absolutely positioned `<div>` updated on every frame
- At 60fps, 20 hotspots = 1,200 DOM updates per second
- On mobile GPU, this can cause significant frame drops

**Recommended approach:**
- Limit hotspots to 3-5 per scene (UX best practice anyway)
- Use Marzipano's `hotspotContainer` properly with `perspective` transform
- Test on low-end Android devices (target market in Kenya)

### PERF-012 — Potential Memory Leaks in Viewer (Future)
**Impact:** Medium

Marzipano uses WebGL contexts. Common memory leak patterns:
- Creating a new `Marzipano.Viewer` instance without destroying the previous one on route navigation
- Adding event listeners on `window` or `document` without cleanup in `onUnmounted`
- Keeping WebGL textures loaded for all scenes simultaneously

**Preventive architecture:**
- Always call `viewer.destroy()` in Vue's `onUnmounted()` hook
- Use Nuxt's `onBeforeRouteLeave` guard for tour editor navigation
- Implement scene lazy-loading: only load current + adjacent scenes

### PERF-013 — No CDN for User-Uploaded Assets (Future)
**Impact:** High

Supabase Storage's default CDN performance is acceptable for global access, but:
- Without explicit CDN configuration, large panorama files load from the closest Supabase edge node
- Supabase's free tier has a 2GB bandwidth limit — a single user uploading and serving 8K panoramas can exhaust this quickly
- There's no native Cloudflare Workers integration out of the box

**Recommended:** Configure Supabase Storage with custom domain and Cloudflare CDN for high-bandwidth panorama serving.

---

## 4. Scalability Assessment at 10,000 Users

### Database Layer
| Metric | 1,000 users | 10,000 users | Risk |
|--------|-------------|--------------|------|
| Supabase connections | ~50 concurrent | ~500 concurrent | Supabase Pro: 200 connections limit |
| Properties rows | ~10,000 | ~100,000 | Manageable with indexes |
| Tours rows | ~50,000 | ~500,000 | Needs composite indexes |
| Storage files | ~50,000 | ~500,000 | Supabase Pro: 100GB — may exceed |
| Bandwidth | ~50GB/mo | ~500GB/mo | Supabase Pro: 250GB — will exceed |

### Infrastructure
| Layer | Current | Required at 10K |
|-------|---------|-----------------|
| Hosting | GitHub Pages (free) | Vercel/Railway (paid) |
| Database | Supabase Free | Supabase Pro ($25/mo minimum) |
| Storage | Supabase Free (1GB) | Supabase Pro (100GB) + expansion |
| Payments | Not integrated | Paystack business account |
| CDN | GitHub Pages CDN | Cloudflare Pro or Vercel Edge Network |

---

## 5. Immediate Performance Actions (Before Product Launch)

1. Replace `<img>` with `<NuxtImg>` on all marketing pages (PERF-001)
2. Replace external Marzipano iframe with locally hosted alternative (PERF-002)
3. Remove placeholder GA script or replace with real ID + cookie consent (PERF-003)
4. Remove `background-attachment: fixed` from body CSS (PERF-004)
5. Add `prefers-reduced-motion` to floating animation (PERF-005)
6. Design panorama tiling pipeline before allowing uploads (PERF-006)
7. Add all required database indexes before data grows (PERF-009)
8. Implement query joining strategy for dashboard (PERF-008)
