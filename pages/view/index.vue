<template>
  <div class="feed">
    <header class="feed__topbar">
      <div class="feed__row">
        <NuxtLink to="/view" class="feed__brand" aria-label="Viewora home">
          <span class="feed__logo-text">Viewora</span>
        </NuxtLink>
      </div>
      <div class="feed__controls">
        <div class="feed__chips" role="tablist" aria-label="Property type">
          <button
            v-for="opt in TYPE_OPTIONS"
            :key="opt.value"
            class="chip"
            :class="{ 'chip--active': type === opt.value }"
            @click="setType(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <select v-model="sort" class="feed__sort" aria-label="Sort by" @change="reload">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>
      <div v-if="hasActiveSearch" class="feed__activesearch">
        <span>Filtered{{ route.query.q ? `: "${route.query.q}"` : '' }}</span>
        <button class="feed__clear" @click="clearSearch">Clear</button>
      </div>
    </header>

    <main class="feed__main">
      <div v-if="pending && listings.length === 0" class="feed__state">
        <p class="feed__state-text">Loading listings…</p>
      </div>

      <div v-else-if="error" class="feed__state">
        <p class="feed__state-text">Couldn't load listings right now. Try again shortly.</p>
      </div>

      <div v-else-if="listings.length === 0" class="feed__state">
        <p class="feed__state-text">No listings yet{{ type !== 'all' ? ' in this category' : '' }}.</p>
      </div>

      <div v-else class="feed__grid">
        <article v-for="listing in listings" :key="listing.id" class="card">
          <NuxtLink :to="`/view/p/${listing.slug || listing.id}`" class="card__media-link">
            <div class="card__media">
              <img v-if="listing.hero_image" :src="listing.hero_image" :alt="listing.title" loading="lazy" />
              <div v-else class="card__media-placeholder" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>
              </div>
              <span v-if="listing.has_360" class="card__badge">360°</span>
            </div>
          </NuxtLink>

          <div class="card__body">
            <p class="card__price">{{ formatPrice(listing.price_kes) }}</p>
            <p v-if="factsLine(listing)" class="card__facts">{{ factsLine(listing) }}</p>
            <p v-if="listing.location_text" class="card__location">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>
              {{ listing.location_text }}
            </p>

            <a
              v-if="listing.phone"
              class="card__cta"
              :href="cardWhatsappUrl(listing)"
              target="_blank"
              rel="noopener"
              @click.stop
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2m0 18.1a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.18 8.18 0 0 1-1.26-4.4c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.27-8.24 8.27m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.36-.77-1.86-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28"/></svg>
              Chat Owner
            </a>
          </div>
        </article>
      </div>

      <div v-if="listings.length > 0 && hasMore" class="feed__loadmore">
        <button class="loadmore-btn" :disabled="pending" @click="loadMore">
          {{ pending ? 'Loading…' : 'Load more' }}
        </button>
      </div>
    </main>

    <UiNavDock active="home" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { ref, computed, onMounted } from 'vue'
import { useAsyncData, useHead, useSeoMeta, useRoute } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { formatPrice, factsLine, whatsappUrl } from '~/utils/listingDisplay'

interface Listing {
  id: string
  slug: string | null
  title: string
  space_type: string
  location_text: string | null
  price_kes: number
  listing_status: string
  bedrooms: number | null
  bathrooms: number | null
  area_sqm: number | null
  vehicle_year: number | null
  vehicle_mileage_km: number | null
  vehicle_transmission: string | null
  vehicle_fuel_type: string | null
  amenities: string[]
  phone: string | null
  has_360: boolean
  hero_image: string | null
  created_at: string
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'residential', label: 'House' },
  { value: 'automotive', label: 'Car' },
  { value: 'commercial', label: 'Business' },
  { value: 'other', label: 'Other' },
]

const { apiFetch } = useApiFetch()
const route = useRoute()
const { init: initTheme } = useTheme()
onMounted(initTheme)

// Search tab (pages/view/search.vue) hands filters over as query params —
// e.g. /view?q=Kilimani&beds_min=3&price_max=10000000 — and Home applies
// them on load rather than owning a separate results view (per
// VIEWORA_2_PRODUCT_SPEC.md §7.2: "Apply filters -> shows filtered results
// in the Home tab").
const initialType = route.query.type
const type = ref<'all' | 'residential' | 'commercial' | 'hospitality' | 'education' | 'automotive' | 'other'>(
  (typeof initialType === 'string' ? initialType : 'all') as any,
)
const sort = ref<'newest' | 'price_asc' | 'price_desc'>('newest')
const page = ref(1)
const LIMIT = 20

const searchFilters = {
  q: route.query.q,
  price_min: route.query.price_min,
  price_max: route.query.price_max,
  beds_min: route.query.beds_min,
  baths_min: route.query.baths_min,
  area_min: route.query.area_min,
}

const listings = ref<Listing[]>([])
const total = ref(0)
const pending = ref(true)
const error = ref(false)

const hasActiveSearch = computed(() => Object.values(searchFilters).some((v) => typeof v === 'string' && v.length > 0))

async function fetchPage(pageNum: number) {
  return apiFetch<{ data: Listing[]; total: number; page: number; limit: number }>('/listings', {
    query: {
      page: pageNum,
      limit: LIMIT,
      type: type.value,
      sort: sort.value,
      ...searchFilters,
    },
  })
}

// searchFilters is captured once from the initial route at page load, so
// clearing it needs a full navigation rather than a reactive reset.
function clearSearch() {
  window.location.href = '/view'
}

const { data: firstPage } = await useAsyncData('view-feed', () => fetchPage(1), { server: true, lazy: false })
if (firstPage.value) {
  listings.value = firstPage.value.data
  total.value = firstPage.value.total
}
pending.value = false

const hasMore = computed(() => listings.value.length < total.value)

async function reload() {
  pending.value = true
  error.value = false
  page.value = 1
  try {
    const result = await fetchPage(1)
    listings.value = result.data
    total.value = result.total
  } catch {
    error.value = true
  }
  pending.value = false
}

function setType(value: typeof type.value) {
  type.value = value
  reload()
}

async function loadMore() {
  pending.value = true
  try {
    const result = await fetchPage(page.value + 1)
    listings.value = [...listings.value, ...result.data]
    page.value += 1
  } catch {
    error.value = true
  }
  pending.value = false
}

function cardWhatsappUrl(l: Listing): string {
  return whatsappUrl(l.phone, l.title)
}

// Fonts scoped to this page only — matches pages/demo/[slug].vue's precedent
// rather than the dashboard's global Inter/Outfit (nuxt.config.ts).
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&family=IBM+Plex+Mono:wght@500&display=swap',
    },
  ],
})

useSeoMeta({
  title: 'Browse Homes — Viewora',
  description: 'Real 360° property tours in Kenya. Browse, then chat directly with the owner on WhatsApp.',
})
</script>

<style scoped>
.feed {
  --ground: var(--vo-page);
  --sheet: var(--vo-surface);
  --sheet-2: var(--vo-elevated);
  --ink: var(--vo-text);
  --ink-soft: var(--vo-secondary);
  --ink-faint: var(--vo-muted);
  --line: var(--vo-border);
  --accent: var(--vo-text);
  --accent-strong: var(--vo-text);
  --accent-tint: var(--vo-elevated);
  --whatsapp: var(--vo-text);
  --whatsapp-ink: var(--vo-inverse);
  --font-display: 'Plus Jakarta Sans', Inter, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  min-height: 100vh;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-display);
  padding-bottom: 104px;
}

 :global(.dark) .feed {
    --ground: #121316;
    --sheet: #1C1E22;
    --sheet-2: #16181B;
    --ink: #F2F1EE;
    --ink-soft: #9A9DA6;
    --ink-faint: #6D6F76;
    --line: #2A2D32;
    --accent: var(--vo-text);
    --accent-strong: var(--vo-text);
    --accent-tint: var(--vo-elevated);
}

.feed__topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--vo-glass);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--line);
  /* viewport-fit=cover (nuxt.config.ts) extends the page under the status
     bar/notch on phones that have one — without this the topbar's content
     would render underneath it instead of below. */
  padding: max(18px, calc(env(safe-area-inset-top) + 8px)) max(20px, calc((100vw - 1320px) / 2)) 14px;
}
.feed__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.feed__brand {
  display: inline-flex;
  align-items: center;
}
/* No small-format mark exists yet — the only brand asset (globe-icon.png /
   images/viewora-logo.png) is an intricate wireframe sphere that turns into
   an illegible gray smudge below ~50px (checked by rendering it at 20/26/32/
   44px). It's fine at the large sizes it's already used at (dashboard
   sidebar logo, tour-loading overlay) but not as a compact header mark —
   would need a simplified low-detail version to work here. Text-only
   wordmark until one exists. */
.feed__logo-text {
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.feed__controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  overflow-x: auto;
}
.feed__chips {
  display: flex;
  gap: 6px;
  flex: 0 1 auto;
  overflow-x: auto;
  scrollbar-width: none;
}
.feed__chips::-webkit-scrollbar { display: none; }
.chip {
  flex: 0 0 auto;
  padding: 6px 12px;
  border-radius: var(--vo-radius-pill);
  border: 1px solid var(--line);
  background: var(--sheet);
  color: var(--ink-soft);
  font-size: 0.76rem;
  font-weight: 600;
  height: 30px;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.chip--active {
  background: var(--ink);
  border-color: var(--accent);
  color: #fff;
}
.feed__sort {
  flex: 0 0 auto;
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--sheet);
  color: var(--ink);
}
@media (max-width: 639px) {
  .feed__controls { flex-wrap: wrap; overflow: visible; }
  .feed__sort { order: -1; margin-left: auto; }
  .feed__chips { flex-basis: 100%; width: 100%; margin-left: 0; }
}
.feed__activesearch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  padding: 7px 12px;
  border-radius: 10px;
  background: var(--accent-tint);
  color: var(--accent-strong);
  font-size: 0.78rem;
  font-weight: 600;
}
.feed__clear {
  border: none;
  background: none;
  color: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.78rem;
  padding: 0;
}

.feed__main {
  width: min(100% - 40px, 1320px);
  margin: 0 auto;
  padding: 32px 0 0;
}
.feed__state {
  padding: 60px 16px;
  text-align: center;
}
.feed__state-text {
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.feed__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}
@media (min-width: 640px) {
  .feed__grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .feed__grid { grid-template-columns: repeat(3, 1fr); }
}
@media (min-width: 1440px) {
  .feed__grid { grid-template-columns: repeat(4, 1fr); }
}

.card {
  background: var(--sheet);
  border-radius: var(--vo-radius-lg);
  overflow: hidden;
  border: 1px solid var(--line);
  transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
}
.card:hover {
  border-color: var(--vo-border-strong);
  background: var(--vo-elevated);
  transform: translateY(-2px);
}
.card__media-link { display: block; }
.card__media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--sheet-2);
}
.card__media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 500ms cubic-bezier(.2,.7,.2,1); }
.card:hover .card__media img { transform: scale(1.025); }
.card__media-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-faint);
}
.card__badge {
  position: absolute; top: 10px; left: 10px;
  background: rgba(7, 7, 7, 0.58);
  backdrop-filter: blur(8px);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  padding: 4px 8px;
  border-radius: 999px;
}
.card__body { padding: 14px; }
.card__price {
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 1.15rem;
  margin: 0 0 7px;
}
.card__facts {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
  margin: 0 0 4px;
}
.card__location {
  display: flex; align-items: center; gap: 4px;
  font-size: 0.76rem;
  color: var(--ink-faint);
  margin: 0 0 12px;
}
.card__cta {
  display: inline-flex; align-items: center; gap: 7px;
  background: var(--whatsapp);
  color: var(--whatsapp-ink);
  font-weight: 700;
  font-size: 0.8rem;
  padding: 9px 14px;
  border: 1px solid var(--vo-border-strong);
  border-radius: var(--vo-radius-sm);
  text-decoration: none;
  width: 100%;
  justify-content: center;
  transition: background-color 180ms ease, color 180ms ease;
}
.card__cta:hover { background: var(--vo-inverse); color: var(--vo-text); opacity: 1; }

.feed__loadmore { display: flex; justify-content: center; padding: 24px 0; }
.loadmore-btn {
  padding: 10px 22px;
  border-radius: var(--vo-radius-sm);
  border: 1px solid var(--line);
  background: var(--sheet);
  color: var(--ink);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.loadmore-btn:disabled { opacity: 0.6; cursor: default; }
</style>
