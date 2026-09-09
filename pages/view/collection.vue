<template>
  <div class="collection">
   <div class="collection__frame">
    <header class="collection__topbar">
      <NuxtLink to="/view" class="collection__back" aria-label="Back to Home">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </NuxtLink>
      <span class="collection__title">Shared Listings</span>
    </header>

    <main class="collection__main">
      <div v-if="pending" class="collection__grid" aria-label="Loading" aria-busy="true">
        <div v-for="n in 4" :key="n" class="card card--skeleton">
          <div class="card__media skeleton" />
          <div class="card__body">
            <div class="skeleton skeleton--price" />
            <div class="skeleton skeleton--line" />
          </div>
        </div>
      </div>

      <div v-else-if="listings.length === 0" class="collection__state">
        <p class="collection__state-text">This link doesn't point to any listings anymore.</p>
        <NuxtLink to="/view" class="collection__state-action">Browse listings</NuxtLink>
      </div>

      <template v-else>
        <p class="collection__count">{{ listings.length }} listing{{ listings.length === 1 ? '' : 's' }} shared with you</p>
        <div class="collection__grid">
          <UiListingCard v-for="listing in listings" :key="listing.id" :listing="listing" />
        </div>
      </template>
    </main>
   </div>

    <UiNavDock />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { ref, onMounted } from 'vue'
import { useHead, useSeoMeta, useRoute } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import type { Listing } from '~/utils/listingDisplay'

const { apiFetch } = useApiFetch()
const { init: initTheme } = useTheme()
onMounted(initTheme)

const route = useRoute()
const listings = ref<Listing[]>([])
const pending = ref(true)

const idsParam = typeof route.query.ids === 'string' ? route.query.ids : ''

const { data } = await useAsyncData('view-collection', async () => {
  if (!idsParam) return { data: [] }
  return apiFetch<{ data: Listing[] }>('/listings', { query: { ids: idsParam } })
})
listings.value = data.value?.data || []
pending.value = false

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&family=IBM+Plex+Mono:wght@500&display=swap',
    },
  ],
})

const seoTitle = listings.value.length
  ? `${listings.value.length} Shared Listing${listings.value.length === 1 ? '' : 's'} — Viewora`
  : 'Shared Listings — Viewora'
useSeoMeta({
  title: seoTitle,
  description: 'A set of property and vehicle listings shared with you on Viewora.',
})
</script>

<style scoped>
.collection {
  --ground: var(--vo-page);
  --sheet: var(--vo-surface);
  --sheet-2: var(--vo-elevated);
  --ink: var(--vo-text);
  --ink-soft: var(--vo-secondary);
  --ink-faint: var(--vo-muted);
  --line: var(--vo-border);
  --accent: var(--vo-text);
  --whatsapp: #25D366;
  --whatsapp-ink: #06210F;
  --font-display: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  min-height: 100vh;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-display);
  padding-bottom: 100px;
}

.collection__frame {
  width: min(100% - 40px, 920px);
  margin: 0 auto;
}
@media (min-width: 1024px) {
  .collection__frame { border-left: 1px solid var(--line); border-right: 1px solid var(--line); }
}
.collection__topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--ground);
  border-bottom: 1px solid var(--line);
  padding: max(16px, calc(env(safe-area-inset-top) + 8px)) 20px;
}
.collection__back {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  border-radius: var(--vo-radius-pill);
  background: var(--sheet);
  border: 1px solid var(--line);
  color: var(--ink);
  flex: 0 0 auto;
}
.collection__title { font-weight: 800; font-size: 1.05rem; letter-spacing: -0.01em; }

.collection__main { padding: 20px 20px 0; }
.collection__count {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin: 0 0 14px;
}

/* Single column below 640px, matching pages/view/index.vue's feed grid —
   UiListingCard's price/facts text isn't designed to fit a sub-170px-wide
   card, which a fixed 2-column grid produces on a 390px phone (confirmed:
   it clipped "KES 18,500,000" and wrapped the facts line awkwardly). */
.collection__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}
@media (min-width: 480px) {
  .collection__grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 640px) {
  .collection__grid { grid-template-columns: repeat(3, 1fr); }
}

.collection__state {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 10px;
  padding: 80px 20px;
  color: var(--ink-faint);
}
.collection__state-text { font-size: 0.9rem; font-weight: 600; max-width: 30ch; }
.collection__state-action {
  margin-top: 4px;
  padding: 10px 18px;
  border-radius: var(--vo-radius-sm);
  background: var(--accent);
  color: var(--vo-inverse);
  font-weight: 700;
  font-size: 0.85rem;
  text-decoration: none;
}

/* Loading skeleton — same pattern as pages/view/index.vue */
.card { background: var(--sheet); border-radius: var(--vo-radius-lg); overflow: hidden; border: 1px solid var(--line); }
.card__media { position: relative; aspect-ratio: 4 / 3; background: var(--sheet-2); }
.card__body { padding: 14px; }
.card--skeleton { pointer-events: none; }
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
.skeleton--line { height: 12px; width: 40%; }
@keyframes skeleton-sweep { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) {
  .skeleton::after { animation: none; }
}
</style>
