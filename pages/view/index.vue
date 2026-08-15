<template>
  <div class="feed">
    <header class="feed__topbar">
      <span class="feed__brand">Viewora</span>
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
          <NuxtLink :to="`/p/${listing.slug || listing.id}`" class="card__media-link">
            <div class="card__media">
              <img v-if="listing.hero_image" :src="listing.hero_image" :alt="listing.title" loading="lazy" />
              <div v-else class="card__media-placeholder" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>
              </div>
              <span v-if="listing.hero_image" class="card__badge">360°</span>
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
              :href="whatsappUrl(listing)"
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

    <nav class="dock" aria-label="Primary">
      <div class="dock__inner">
        <span class="tab tab--active"><HomeIcon /><span>Home</span></span>
        <span class="tab tab--disabled" title="Coming soon"><SavedIcon /><span>Saved</span></span>
        <span class="tab tab--disabled" title="Coming soon"><ChatIcon /><span>Chat</span></span>
        <span class="tab tab--disabled" title="Coming soon"><ProfileIcon /><span>Profile</span></span>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { ref, h, computed } from 'vue'
import { useAsyncData, useHead, useSeoMeta } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

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

const type = ref<'all' | 'residential' | 'commercial' | 'hospitality' | 'education' | 'automotive' | 'other'>('all')
const sort = ref<'newest' | 'price_asc' | 'price_desc'>('newest')
const page = ref(1)
const LIMIT = 20

const listings = ref<Listing[]>([])
const total = ref(0)
const pending = ref(true)
const error = ref(false)

async function fetchPage(pageNum: number) {
  return apiFetch<{ data: Listing[]; total: number; page: number; limit: number }>('/listings', {
    query: {
      page: pageNum,
      limit: LIMIT,
      type: type.value,
      sort: sort.value,
    },
  })
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

function formatPrice(kes: number): string {
  return `KES ${kes.toLocaleString('en-KE')}`
}

function factsLine(l: Listing): string {
  if (l.space_type === 'residential') {
    const parts = []
    if (l.bedrooms) parts.push(`${l.bedrooms} Bed`)
    if (l.bathrooms) parts.push(`${l.bathrooms} Bath`)
    if (l.area_sqm) parts.push(`${l.area_sqm} m²`)
    return parts.join(' · ')
  }
  if (l.space_type === 'automotive') {
    const parts = []
    if (l.vehicle_year) parts.push(String(l.vehicle_year))
    if (l.vehicle_mileage_km != null) parts.push(`${l.vehicle_mileage_km.toLocaleString('en-KE')} km`)
    if (l.vehicle_transmission) parts.push(l.vehicle_transmission[0].toUpperCase() + l.vehicle_transmission.slice(1))
    return parts.join(' · ')
  }
  if (l.area_sqm) return `${l.area_sqm} m²`
  return ''
}

function whatsappUrl(l: Listing): string {
  const digits = (l.phone || '').replace(/[^0-9]/g, '')
  const msg = `Hi! I saw ${l.title} on Viewora and would like more details.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
}

// ── Inline nav icons — small enough not to warrant separate component files ──
const HomeIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M3 11l9-8 9 8' }),
  h('path', { d: 'M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10' }),
])
const SavedIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z' }),
])
const ChatIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' }),
])
const ProfileIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('circle', { cx: '12', cy: '8', r: '4' }),
  h('path', { d: 'M4 21c0-4 4-6 8-6s8 2 8 6' }),
])

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
  --ground: #EFF1F3;
  --sheet: #FFFFFF;
  --sheet-2: #F6F7F8;
  --ink: #1C1D21;
  --ink-soft: #6B6E76;
  --ink-faint: #9598A0;
  --line: #E3E5E9;
  --accent: #C2410C;
  --accent-strong: #9A3412;
  --accent-tint: #FBEAE1;
  --whatsapp: #1FA855;
  --whatsapp-ink: #06210F;
  --font-display: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  min-height: 100vh;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-display);
  padding-bottom: 90px;
}

@media (prefers-color-scheme: dark) {
  .feed {
    --ground: #121316;
    --sheet: #1C1E22;
    --sheet-2: #16181B;
    --ink: #F2F1EE;
    --ink-soft: #9A9DA6;
    --ink-faint: #6D6F76;
    --line: #2A2D32;
    --accent: #FB923C;
    --accent-strong: #FDBA74;
    --accent-tint: #2E2013;
  }
}

.feed__topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--ground);
  border-bottom: 1px solid var(--line);
  padding: 16px 16px 12px;
}
.feed__brand {
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: -0.01em;
}
.feed__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  overflow-x: auto;
}
.feed__chips {
  display: flex;
  gap: 6px;
  flex: 1 1 auto;
  overflow-x: auto;
}
.chip {
  flex: 0 0 auto;
  padding: 6px 13px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--sheet);
  color: var(--ink-soft);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}
.chip--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.feed__sort {
  flex: 0 0 auto;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--sheet);
  color: var(--ink);
}

.feed__main {
  padding: 16px;
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
  gap: 16px;
}
@media (min-width: 640px) {
  .feed__grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .feed__grid { grid-template-columns: repeat(3, 1fr); }
}

.card {
  background: var(--sheet);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--line);
}
.card__media-link { display: block; }
.card__media {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--sheet-2);
}
.card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card__media-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-faint);
}
.card__badge {
  position: absolute; top: 10px; left: 10px;
  background: rgba(20,18,16,0.55);
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
  font-size: 1.05rem;
  margin: 0 0 4px;
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
  border-radius: 999px;
  text-decoration: none;
  width: 100%;
  justify-content: center;
}

.feed__loadmore { display: flex; justify-content: center; padding: 24px 0; }
.loadmore-btn {
  padding: 10px 22px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--sheet);
  color: var(--ink);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.loadmore-btn:disabled { opacity: 0.6; cursor: default; }

.dock {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
  display: flex; justify-content: center;
  padding-bottom: max(14px, env(safe-area-inset-bottom));
  pointer-events: none;
}
.dock__inner {
  pointer-events: auto;
  display: flex; align-items: center; gap: 2px;
  padding: 6px; border-radius: 999px;
  background: rgba(255,255,255,0.86);
  backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(28,29,33,0.06);
  box-shadow: 0 12px 32px rgba(15,13,10,0.28);
}
@media (prefers-color-scheme: dark) {
  .dock__inner { background: rgba(28,30,34,0.78); border-color: rgba(255,255,255,0.08); }
}
.tab {
  width: 72px;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 9px 0 8px;
  color: var(--ink-faint);
}
.tab svg { width: 21px; height: 21px; }
.tab span { font-size: 0.62rem; font-weight: 700; }
.tab--active { color: var(--accent); }
.tab--disabled { opacity: 0.45; }
</style>
