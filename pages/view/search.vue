<template>
  <div class="search">
    <header class="search__topbar">
      <NuxtLink to="/view" class="search__back" aria-label="Back to Home">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </NuxtLink>
      <span class="search__title">Search</span>
    </header>

    <main class="search__main">
      <div class="search__box">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          v-model="q"
          type="text"
          placeholder="Kilimani, Westlands, Lavington…"
          aria-label="What are you looking for?"
          @keydown.enter="apply"
        />
      </div>

      <section v-if="recentSearches.length" class="search__section">
        <h2 class="search__heading">Recent Searches</h2>
        <div class="search__pills">
          <button v-for="(r, i) in recentSearches" :key="i" class="pill" @click="applyRecent(r)">
            {{ r.label }}
          </button>
        </div>
      </section>

      <hr class="search__divider" />

      <section class="search__section">
        <h2 class="search__heading">Type</h2>
        <div class="search__pills">
          <button
            v-for="opt in TYPE_OPTIONS"
            :key="opt.value"
            class="pill"
            :class="{ 'pill--active': type === opt.value }"
            @click="type = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </section>

      <section class="search__section">
        <div class="filter__range">
          <input v-model="priceMin" type="number" min="0" inputmode="numeric" placeholder="Min price (KES)" />
          <span class="filter__range-sep">–</span>
          <input v-model="priceMax" type="number" min="0" inputmode="numeric" placeholder="Max price (KES)" />
        </div>

        <div v-if="type === 'all' || type === 'residential'" class="search__pills search__pills--beds">
          <button
            v-for="n in [1, 2, 3, 4, 5]"
            :key="n"
            class="pill"
            :class="{ 'pill--active': bedsMin === n }"
            @click="bedsMin = bedsMin === n ? null : n"
          >
            {{ n }}{{ n === 5 ? '+' : '' }} bed
          </button>
        </div>

        <button v-if="type === 'all' || type === 'residential'" class="search__more" type="button" @click="showMore = !showMore">
          {{ showMore ? 'Fewer filters' : 'More filters' }}
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: showMore ? 'rotate(180deg)' : 'none' }"><path d="m6 9 6 6 6-6"/></svg>
        </button>

        <template v-if="showMore && (type === 'all' || type === 'residential')">
          <div class="filter">
            <span class="filter__label">Baths</span>
            <div class="search__pills">
              <button
                v-for="n in [1, 2, 3, 4]"
                :key="n"
                class="pill"
                :class="{ 'pill--active': bathsMin === n }"
                @click="bathsMin = bathsMin === n ? null : n"
              >
                {{ n }}{{ n === 4 ? '+' : '' }}
              </button>
            </div>
          </div>

          <div class="filter">
            <span class="filter__label">Min Area (m²)</span>
            <input v-model="areaMin" type="number" min="0" inputmode="numeric" placeholder="e.g. 100" class="filter__single" />
          </div>
        </template>
      </section>

      <button class="search__apply" @click="apply">Apply Filters</button>

      <hr class="search__divider" />

      <section class="search__section">
        <h2 class="search__heading">Popular Areas</h2>
        <div class="search__pills">
          <button v-for="area in POPULAR_AREAS" :key="area" class="pill" @click="applyArea(area)">
            {{ area }}
          </button>
        </div>
      </section>
    </main>

    <UiNavDock active="search" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { ref, onMounted } from 'vue'
import { useHead, useSeoMeta, useRouter } from '#imports'

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'residential', label: 'House' },
  { value: 'automotive', label: 'Car' },
  { value: 'commercial', label: 'Business' },
  { value: 'other', label: 'Other' },
]

const POPULAR_AREAS = [
  'Kilimani', 'Westlands', 'Lavington', 'Kileleshwa', 'Runda',
  'Karen', 'Parklands', 'Langata', 'Ridgeways', 'Thika',
]

const RECENTS_KEY = 'viewora_recent_searches'

interface RecentSearch {
  label: string
  query: Record<string, string>
}

const router = useRouter()
const { init: initTheme } = useTheme()
onMounted(initTheme)

const q = ref('')
const type = ref<'all' | 'residential' | 'automotive' | 'commercial' | 'other'>('all')
const priceMin = ref<string>('')
const priceMax = ref<string>('')
const bedsMin = ref<number | null>(null)
const bathsMin = ref<number | null>(null)
const areaMin = ref<string>('')
// Baths/area are lower-intent filters — collapsed by default so the page
// reads as "type, price, beds" at a glance rather than a long form.
const showMore = ref(false)

const recentSearches = ref<RecentSearch[]>(loadRecents())

function loadRecents(): RecentSearch[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecent(entry: RecentSearch) {
  const next = [entry, ...recentSearches.value.filter((r) => r.label !== entry.label)].slice(0, 6)
  recentSearches.value = next
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
  } catch {
    // localStorage unavailable (private mode etc.) — recents just won't persist
  }
}

function buildQuery(): Record<string, string> {
  const query: Record<string, string> = {}
  if (q.value.trim()) query.q = q.value.trim()
  if (type.value !== 'all') query.type = type.value
  if (priceMin.value) query.price_min = String(priceMin.value)
  if (priceMax.value) query.price_max = String(priceMax.value)
  if (bedsMin.value) query.beds_min = String(bedsMin.value)
  if (bathsMin.value) query.baths_min = String(bathsMin.value)
  if (areaMin.value) query.area_min = String(areaMin.value)
  return query
}

function buildLabel(query: Record<string, string>): string {
  if (query.q) return query.q
  const parts: string[] = []
  if (query.beds_min) parts.push(`${query.beds_min}+ beds`)
  if (query.price_max) parts.push(`Under KES ${Number(query.price_max).toLocaleString('en-KE')}`)
  else if (query.price_min) parts.push(`From KES ${Number(query.price_min).toLocaleString('en-KE')}`)
  if (query.type) parts.push(TYPE_OPTIONS.find((t) => t.value === query.type)?.label || query.type)
  return parts.join(' · ') || 'All listings'
}

function apply() {
  const query = buildQuery()
  if (Object.keys(query).length > 0) saveRecent({ label: buildLabel(query), query })
  router.push({ path: '/view', query })
}

function applyArea(area: string) {
  q.value = area
  apply()
}

function applyRecent(r: RecentSearch) {
  router.push({ path: '/view', query: r.query })
}

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
  title: 'Search — Viewora',
  description: 'Search 360° property and vehicle tours in Kenya by area, price, beds, and more.',
})
</script>

<style scoped>
.search {
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
  --font-display: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  min-height: 100vh;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-display);
  padding-bottom: 100px;
}

:global(.dark) .search {
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
}

.search__topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--ground);
  border-bottom: 1px solid var(--line);
  /* viewport-fit=cover (nuxt.config.ts) extends the page under the status
     bar/notch on phones that have one — without this the back button/title
     would render underneath it instead of below. */
  padding: max(16px, calc(env(safe-area-inset-top) + 8px)) max(20px, calc((100vw - 1320px) / 2));
}
.search__back {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  border-radius: 999px;
  background: var(--sheet);
  border: 1px solid var(--line);
  color: var(--ink);
}
.search__title {
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}

.search__main {
  width: min(100% - 40px, 920px);
  margin: 0 auto;
  padding: 32px 0 0;
}

.search__box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--sheet);
  border: 1px solid var(--line);
  border-radius: var(--vo-radius-md);
  padding: 12px 14px;
  color: var(--ink-faint);
}
.search__box input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  color: var(--ink);
  font-family: inherit;
  font-size: 0.92rem;
}
.search__box input::placeholder { color: var(--ink-faint); }

.search__section { margin-top: 22px; }
.search__heading {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin: 0 0 10px;
}

.search__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.pill {
  padding: 7px 13px;
  border-radius: var(--vo-radius-pill);
  border: 1px solid var(--line);
  background: var(--sheet);
  color: var(--ink-soft);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.pill--active {
  background: var(--ink);
  border-color: var(--accent);
  color: #fff;
}

.search__divider {
  border: none;
  border-top: 1px solid var(--line);
  margin: 22px 0 0;
}

.search__pills--beds { margin-top: 14px; }
.search__more {
  display: inline-flex; align-items: center; gap: 5px;
  margin-top: 14px;
  border: none; background: none; padding: 0;
  color: var(--ink-soft); font-size: 0.8rem; font-weight: 600;
  cursor: pointer;
}
.search__more svg { transition: transform 200ms ease; }

.filter { margin-bottom: 16px; margin-top: 18px; }
.filter__label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 8px;
}
.filter__range {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter__range input,
.filter__single {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--sheet);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 0.85rem;
}
.filter__range-sep { color: var(--ink-faint); flex: 0 0 auto; }

.search__apply {
  width: 100%;
  margin-top: 8px;
  padding: 13px;
  border: 1px solid var(--vo-border-strong);
  border-radius: var(--vo-radius-sm);
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
}

</style>
