<template>
  <div class="feed">
   <div class="feed__frame">
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
      <div v-if="pending && listings.length === 0" class="feed__grid" aria-label="Loading listings" aria-busy="true">
        <div v-for="n in 8" :key="n" class="card card--skeleton">
          <div class="card__media skeleton" />
          <div class="card__body">
            <div class="skeleton skeleton--price" />
            <div class="skeleton skeleton--line" />
            <div class="skeleton skeleton--line skeleton--short" />
            <div class="skeleton skeleton--cta" />
          </div>
        </div>
      </div>

      <div v-else-if="error" class="feed__state">
        <p class="feed__state-text">Couldn't load listings right now. Try again shortly.</p>
        <button class="feed__state-action" @click="reload">Try again</button>
      </div>

      <div v-else-if="listings.length === 0" class="feed__state">
        <p class="feed__state-text">No listings yet{{ type !== 'all' ? ' in this category' : '' }}.</p>
        <button v-if="type !== 'all'" class="feed__state-action" @click="setType('all')">Show all listings</button>
        <button v-else-if="hasActiveSearch" class="feed__state-action" @click="clearSearch">Clear search</button>
      </div>

      <div v-else class="feed__grid">
        <UiListingCard v-for="listing in listings" :key="listing.id" :listing="listing" />
      </div>

      <div v-if="listings.length > 0 && hasMore" class="feed__loadmore">
        <button class="loadmore-btn" :disabled="pending" @click="loadMore">
          {{ pending ? 'Loading…' : 'Load more' }}
        </button>
      </div>
    </main>
   </div>

    <UiNavDock active="home" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { ref, computed, onMounted } from 'vue'
import { useAsyncData, useHead, useSeoMeta, useRoute } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import type { Listing } from '~/utils/listingDisplay'

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

/* Single shared frame the topbar and main content both live inside, so
   they're guaranteed the same width instead of two independent formulas
   that can drift out of alignment (which is what was happening before —
   the topbar centered its content via a 100vw-based calc while the body
   used a 100%-based width, and 100vw includes the scrollbar's width that
   100% doesn't, on top of which every buyer page had a slightly different
   number in that calc). Border only shows once there's room for visible
   gutters beside it — matches the detail page's .stage frame: same
   var(--line) token, same 1024px breakpoint. */
.feed__frame {
  width: min(100% - 40px, 1320px);
  margin: 0 auto;
}
@media (min-width: 1024px) {
  .feed__frame { border-left: 1px solid var(--line); border-right: 1px solid var(--line); }
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
  padding: max(18px, calc(env(safe-area-inset-top) + 8px)) 20px 14px;
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
  color: var(--vo-inverse);
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
  border-radius: var(--vo-radius-md);
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
  padding: 32px 20px 0;
}
.feed__state {
  padding: 60px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.feed__state-text {
  color: var(--ink-soft);
  font-size: 0.9rem;
}
.feed__state-action {
  padding: 9px 18px;
  border-radius: var(--vo-radius-sm);
  border: 1px solid var(--line);
  background: var(--sheet);
  color: var(--ink);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
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
.card__media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--sheet-2);
}
.card__body { padding: 14px; }

/* Loading skeleton — neutral grayscale sweep, no color, matches the real
   card's exact geometry (media aspect-ratio, body padding) so nothing
   shifts when real listings replace it. Real cards render via
   UiListingCard now; .card/.card__media/.card__body here only back this
   skeleton, which is drawn inline rather than through that component. */
.card--skeleton { pointer-events: none; }
.card--skeleton:hover { transform: none; border-color: var(--line); background: var(--sheet); }
.skeleton {
  position: relative; overflow: hidden;
  background: var(--sheet-2);
  border-radius: 4px;
}
.skeleton::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, var(--vo-border-strong) 50%, transparent);
  transform: translateX(-100%);
  animation: skeleton-sweep 1.6s ease-in-out infinite;
}
.skeleton--price { height: 20px; width: 55%; margin: 0 0 11px; }
.skeleton--line { height: 12px; width: 40%; margin: 0 0 8px; }
.skeleton--short { width: 30%; margin: 0 0 16px; }
.skeleton--cta { height: 38px; width: 100%; border-radius: var(--vo-radius-sm); }
@keyframes skeleton-sweep { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) {
  .skeleton::after { animation: none; }
}

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
