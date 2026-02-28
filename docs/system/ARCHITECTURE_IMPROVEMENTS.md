# ARCHITECTURE IMPROVEMENTS — Viewora

**Generated:** 2026-02-28
**Thinking Model:** Senior SaaS Architect, scaling to 10,000 users, Web + Mobile hybrid

---

## 1. Critical Refactors (Before Any Product Code is Written)

### 1.1 Migrate Off GitHub Pages — Immediately

**Current:** GitHub Pages (static only)
**Required:** Node.js runtime environment

GitHub Pages cannot run server-side code. The product dashboard requires:
- Server-side rendering (SSR) for SEO on public tour pages
- Server routes for Paystack webhooks
- API routes for analytics ingestion
- Edge functions for subscription enforcement

**Recommended migration path:**
```
GitHub Pages → Vercel (recommended for Nuxt 3)
OR
GitHub Pages → Railway (more control, Docker-based)
OR
GitHub Pages → DigitalOcean App Platform
```

Vercel is the best fit: free tier covers early growth, native Nuxt 3 support, edge functions, automatic preview deployments, built-in CDN. It deploys directly from the existing GitHub repository.

**`nuxt.config.ts` changes required:**
```ts
// Remove full prerendering
routeRules: {
  // Public marketing pages — prerender for SEO
  '/': { prerender: true },
  '/about': { prerender: true },
  '/pricing': { prerender: true },
  '/product': { prerender: true },
  '/contact': { prerender: true },
  '/blog/**': { prerender: true },
  '/legal/**': { prerender: true },

  // Auth pages — client-side only
  '/login': { ssr: false },
  '/register': { ssr: false },
  '/confirm': { ssr: false },

  // Dashboard — SSR with auth protection
  '/dashboard/**': { ssr: true },

  // Public tour viewer — SSR for SEO/OG image
  '/tours/**': { ssr: true },
}
```

### 1.2 Separate Marketing Site from Product App

At scale, the marketing site and the SaaS product should be architecturally separate:

**Option A: Monorepo with shared packages (recommended for now)**
```
viewora/
├── apps/
│   ├── marketing/          # Nuxt 3 SSG (current site)
│   └── dashboard/          # Nuxt 3 SSR (new product)
└── packages/
    ├── ui/                 # Shared design system
    ├── supabase/           # Shared Supabase client config
    └── types/              # Shared TypeScript types
```

**Option B: Single Nuxt app (simpler for now)**
Keep everything in one repo but with strict feature separation by directory.

### 1.3 Introduce Pinia for State Management

The current `ref()` per-component approach will not scale to a dashboard:
- Tour list, editor state, hotspot positions, user subscription status all need to be shared across components
- Without a store, prop drilling becomes unmanageable in the editor

**Required Pinia stores:**
```ts
// stores/auth.ts
export const useAuthStore = defineStore('auth', () => {
  const user = useSupabaseUser()
  const profile = ref<Profile | null>(null)
  const subscription = ref<Subscription | null>(null)
  const plan = computed(() => subscription.value?.status === 'active'
    ? subscription.value.plan
    : 'free')
  const canCreateTour = computed(() => /* check plan limits */ )
  return { user, profile, subscription, plan, canCreateTour }
})

// stores/tours.ts
export const useToursStore = defineStore('tours', () => { ... })

// stores/editor.ts — for the tour editor state
export const useEditorStore = defineStore('editor', () => {
  const currentTour = ref<VirtualTour | null>(null)
  const scenes = ref<Scene[]>([])
  const activeSceneId = ref<string | null>(null)
  const hotspots = ref<Hotspot[]>([])
  const isDirty = ref(false)
  // ...
})
```

---

## 2. Modularization Improvements

### 2.1 Extract Design System into Proper Component Library

The current `main.css` is a single 742-line file. At product scale:

**Current problem:** Everything is CSS utility classes + custom properties. The entire design system is in one file with no encapsulation.

**Recommended structure:**
```
assets/css/
├── tokens.css          # Design tokens ONLY (variables)
├── reset.css           # Normalize/reset
├── typography.css      # Font system
└── utilities.css       # Utility classes

components/
├── ui/
│   ├── UiButton.vue    # Encapsulated button with variants
│   ├── UiCard.vue      # Card component
│   ├── UiInput.vue     # Form input with validation state
│   ├── UiBadge.vue     # Status badges
│   ├── UiModal.vue     # Modal dialog
│   └── UiToggle.vue    # Pricing billing toggle (currently inline)
├── layout/
│   ├── AppNav.vue      # (rename from NavBar.vue)
│   └── AppFooter.vue   # (rename from Footer.vue)
└── sections/
    ├── HeroSection.vue
    ├── FeaturesSection.vue
    ├── PricingSection.vue
    └── TestimonialsSection.vue
```

### 2.2 Composables Directory

A `composables/` directory should be created for reusable logic:
```
composables/
├── useSubscription.ts    # Plan checking, feature gating
├── useTours.ts           # Tour CRUD operations
├── useProperties.ts      # Property CRUD operations
├── useStorage.ts         # Supabase Storage upload/download
├── useAnalytics.ts       # Tour view tracking
└── usePaystack.ts        # Paystack checkout integration
```

**Example `useSubscription.ts`:**
```ts
export const useSubscription = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const { data: subscription } = useAsyncData('subscription', async () => {
    if (!user.value) return null
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.value.id)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .single()
    return data
  })

  const planLimits = computed(() => ({
    free: { tours: 0, storage_gb: 0 },
    basic: { tours: 2, storage_gb: 2 },
    plus: { tours: 15, storage_gb: 8 },
    pro: { tours: 40, storage_gb: 20 },
    elite: { tours: 120, storage_gb: 50 }
  }[subscription.value?.plan ?? 'free']))

  const canCreateTour = (currentCount: number) =>
    currentCount < (planLimits.value?.tours ?? 0)

  return { subscription, planLimits, canCreateTour }
}
```

---

## 3. Subscription Gating Architecture Hardening

The current state has NO gating. Here is the hardened architecture:

### 3.1 Three-Layer Enforcement

**Layer 1: Database (Supabase RLS)**
```sql
-- Enforce tour count limits via PostgreSQL
CREATE FUNCTION check_tour_limit() RETURNS trigger AS $$
DECLARE
  current_count INTEGER;
  plan_limit INTEGER;
  user_plan TEXT;
BEGIN
  SELECT plan INTO user_plan FROM profiles WHERE id = (
    SELECT user_id FROM properties WHERE id = NEW.property_id
  );

  plan_limit := CASE user_plan
    WHEN 'basic' THEN 2
    WHEN 'plus' THEN 15
    WHEN 'pro' THEN 40
    WHEN 'elite' THEN 120
    ELSE 0
  END;

  SELECT COUNT(*) INTO current_count FROM virtual_tours vt
  JOIN properties p ON vt.property_id = p.id
  WHERE p.user_id = (SELECT user_id FROM properties WHERE id = NEW.property_id)
  AND vt.status != 'archived';

  IF current_count >= plan_limit THEN
    RAISE EXCEPTION 'Tour limit reached for current plan';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Layer 2: Server/Edge Function (API routes)**
```ts
// server/api/tours/create.post.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const subscription = await getActiveSubscription(user.id)
  const currentCount = await getTourCount(user.id)

  if (currentCount >= getPlanLimit(subscription?.plan)) {
    throw createError({ statusCode: 403, statusMessage: 'Plan limit reached' })
  }

  // Create tour
})
```

**Layer 3: UI (Client-side — UX only, never security)**
```vue
<UiButton
  :disabled="!canCreateTour(tourCount)"
  @click="showUpgradeModal"
>
  <template v-if="!canCreateTour(tourCount)">
    Upgrade to Add More Tours
  </template>
  <template v-else>
    Create New Tour
  </template>
</UiButton>
```

### 3.2 Paystack Integration Architecture

```
[User clicks "Upgrade"]
→ Client: call /api/paystack/initialize
→ Server: Paystack.transaction.initialize({ email, amount, plan, callback_url })
→ Return: authorization_url
→ Client: redirect to authorization_url
→ [User completes payment on Paystack]
→ Paystack redirects to: /dashboard/billing/callback?reference=xxx
→ Client: call /api/paystack/verify?reference=xxx
→ Server: Paystack.transaction.verify(reference)
→ If success: UPDATE subscriptions SET status='active', plan='{plan}'
→ Also: Paystack sends webhook to /api/webhook/paystack (for reliability)
→ Webhook: verify signature, update subscription record
```

**Critical:** The webhook (`/api/webhook/paystack`) is the authoritative payment confirmation. The callback URL is only for UX (immediate redirect). Never rely solely on the callback URL to activate subscriptions.

---

## 4. Branding System Design

The pricing page advertises white-label branding (Pro/Elite plans). Here is how to build it:

### 4.1 Branding Configuration Schema
```ts
interface BrandingConfig {
  // Viewer overrides
  logo_url: string | null           // Replaces Viewora logo in viewer
  primary_color: string             // Hex color for hotspots/controls
  watermark_enabled: boolean        // Show/hide Viewora watermark

  // Tour page overrides
  company_name: string | null       // Shown in tour footer
  website_url: string | null        // Link on company name

  // Contact/lead capture
  contact_email: string | null      // Where leads are sent

  // Custom domain (Elite only)
  custom_domain: string | null      // e.g., tours.theiragency.com
}
```

### 4.2 Viewer Branding Injection
The tour viewer will read `branding_config` from the tour's Supabase record and apply it to:
- Marzipano viewer controls skin
- Loading screen
- Hotspot colors
- "Powered by" attribution (removed for Pro+)

### 4.3 Custom Domain (Elite)
For custom domain tours (`tours.theiragency.com/tour-slug`):
- User points CNAME to `cname.viewora.software`
- Viewora Cloudflare Worker (or Vercel Edge) matches hostname to user_id
- Serves the Viewora viewer with user's branding injected

---

## 5. Future Mobile App Compatibility Notes

The product roadmap mentions a "Web + Mobile hybrid model." Here is the architectural path:

### 5.1 API Design Principle: API-First from Day One
Every database operation should be exposed as a clean API layer:
```
Frontend (Nuxt) ──→ Supabase JS SDK ──→ Supabase (PostgreSQL + Storage)
Mobile App      ──→ Supabase JS SDK ──→ Supabase (same instance)
```

Supabase's JS SDK is compatible with React Native, Expo, and Capacitor. The same auth tokens, same RLS policies, same storage — the mobile app gets all security for free.

### 5.2 Shared Code Strategy (Nuxt + React Native)
```
viewora/
├── apps/
│   ├── web/         # Nuxt 3 (current)
│   └── mobile/      # Expo (React Native) — future
└── packages/
    ├── api/         # Supabase query functions (shared)
    ├── types/       # TypeScript types (shared)
    └── validators/  # Zod schemas (shared)
```

### 5.3 Mobile-Specific Considerations
- **Tour Viewer on Mobile**: Marzipano has a mobile-optimized mode with gyroscope support. React Native would need a WebView to embed it, or a native 360° renderer (ViroReact, Three.js via Expo GL).
- **Panorama Capture**: Mobile app could integrate with the camera to guide users through capturing a 360° panorama without special hardware (stitching multiple frames).
- **Offline Mode**: Downloaded tours should be viewable offline (Progressive Download with IndexedDB cache).
- **Push Notifications**: Tour view alerts, lead captures, subscription renewal reminders.
- **Deep Links**: `/tours/:id` URLs open in the mobile app if installed, else fall back to web.

### 5.4 Gyroscope/AR Considerations
The pricing page mentions "gyroscope support" and the product was originally called "AR Code Clone." True AR (Augmented Reality overlay on physical spaces) would require:
- ARKit (iOS) / ARCore (Android) integration
- Spatial anchoring (complex)
- This is a V2/V3 feature — not part of current MVP

The current "gyroscope" feature is simply using the device accelerometer to control the 360° viewer pan direction — not true AR.

---

## 6. Server Stitching Integration Pathway

If Viewora later wants to offer their own panorama stitching service (competing with Ricoh/Insta360's apps):

### 6.1 Server-Side Stitching Architecture
```
[Mobile App] captures multiple photos
→ uploads raw photos to Supabase Storage (temp bucket)
→ triggers Edge Function / Queue
→ Edge Function: spin up headless container with Hugin/PTGui/OpenCV
→ stitch images into equirectangular panorama
→ store result in panoramas bucket
→ trigger tour processing pipeline
→ notify user via Supabase Realtime
```

**Tools for server-side stitching:**
- Hugin (open source, command-line controllable)
- OpenPano (Python, GPU-accelerated)
- Paid: Kolor Autopano (enterprise)

**Hosting:** This requires a GPU-capable server (DigitalOcean GPU Droplet, AWS EC2 G4 instance). NOT compatible with serverless/edge functions.

**Recommendation:** This is a V3 feature. For MVP, rely on users capturing panoramas with dedicated 360° cameras (Insta360, Ricoh Theta) that handle stitching in-camera.

---

## 7. Long-Term Scaling Strategy

### Phase 1: Launch (0 → 500 users)
- Migrate to Vercel (free tier)
- Supabase Pro ($25/mo)
- Single Nuxt 3 app (marketing + dashboard)
- Manual Paystack payments (no webhook automation)

### Phase 2: Growth (500 → 2,000 users)
- Vercel Pro or Railway ($20/mo)
- Supabase Pro with connection pooler (PgBouncer)
- Implement proper Paystack webhook automation
- Add Pinia stores, composables
- Launch Expo mobile app (viewer only)
- CDN: Cloudflare Free for panorama caching

### Phase 3: Scale (2,000 → 10,000 users)
- Vercel Enterprise or self-hosted (DigitalOcean Kubernetes)
- Supabase dedicated instance or migrate to self-hosted Supabase
- Dedicated panorama processing workers (separate service)
- Implement Redis caching layer for subscription checks
- Analytics: Posthog or Mixpanel (replace Google Analytics)
- Team accounts: introduce organizations table + RBAC
- White-label system fully deployed
- Mobile app with panorama capture

### Phase 4: Enterprise (10,000+ users)
- Multi-region Supabase (read replicas)
- Custom domain routing via Cloudflare Workers
- SLA-backed infrastructure
- Dedicated API rate limiting (Upstash Redis)
- GDPR-compliant data residency options
- Enterprise SSO (SAML via Supabase Auth)
