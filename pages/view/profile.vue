<template>
  <div class="profile">
   <div class="profile__frame">
    <header class="profile__topbar">
      <NuxtLink to="/view" class="profile__back" aria-label="Back to Home">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </NuxtLink>
      <span class="profile__title">Saved</span>
      <button
        v-if="listings.length > 0"
        class="profile__share"
        aria-label="Share your saved listings"
        @click="shareCollection"
      >
        <svg v-if="!shareCopied" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5 15.4 6.5M8.6 13.5l6.8 4"/></svg>
        <svg v-else viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    </header>

    <main class="profile__main">
      <div v-if="pending" class="profile__grid" aria-label="Loading saved listings" aria-busy="true">
        <div v-for="n in 4" :key="n" class="card card--skeleton">
          <div class="card__media skeleton" />
          <div class="card__body">
            <div class="skeleton skeleton--price" />
            <div class="skeleton skeleton--line" />
          </div>
        </div>
      </div>

      <div v-else-if="!signedIn || listings.length === 0" class="profile__state">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
        <p class="profile__state-text">Nothing saved yet</p>
        <p class="profile__state-sub">Tap the heart on a listing to keep it here.</p>
        <NuxtLink to="/view" class="profile__state-action">Browse listings</NuxtLink>
      </div>

      <div v-else class="profile__grid">
        <UiListingCard v-for="listing in listings" :key="listing.id" :listing="listing" />
      </div>
    </main>
   </div>

    <UiNavDock active="profile" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { ref, onMounted, watch } from 'vue'
import { useHead, useSeoMeta, useSupabaseUser } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import type { Listing } from '~/utils/listingDisplay'

const { apiFetch } = useApiFetch()
const { init: initTheme } = useTheme()
onMounted(initTheme)

const supabaseUser = useSupabaseUser()
const listings = ref<Listing[]>([])
// Distinguishes "still figuring out if there's a session at all" from "we
// checked, there genuinely isn't one" — an anonymous session that only
// exists for e.g. an earlier save on a different device wouldn't be known
// yet on first paint, same restore-race the detail page's Save button
// already accounts for.
const pending = ref(true)
const signedIn = ref(false)
const shareCopied = ref(false)

let checked = false
watch(supabaseUser, async (u) => {
  if (checked) return
  if (!u) {
    // No session at all (including anonymous) — nothing could have been
    // saved. Don't mint one just to look; that's what the Save button does.
    pending.value = false
    return
  }
  checked = true
  signedIn.value = true
  try {
    const result = await apiFetch<{ data: Listing[] }>('/saved')
    listings.value = result.data || []
  } catch {
    listings.value = []
  } finally {
    pending.value = false
  }
}, { immediate: true })

// Same Web Share API first, clipboard fallback pattern as the detail
// page's Share button — see pages/view/p/[slug].vue.
async function shareCollection() {
  if (typeof window === 'undefined' || !listings.value.length) return
  const ids = listings.value.map((l) => l.id).join(',')
  const url = `${window.location.origin}/view/collection?ids=${ids}`
  const shareData = {
    title: 'Properties I saved on Viewora',
    text: `${listings.value.length} listing${listings.value.length === 1 ? '' : 's'} I saved on Viewora`,
    url,
  }
  if (navigator.share) {
    try { await navigator.share(shareData) } catch { /* cancelled */ }
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    shareCopied.value = true
    setTimeout(() => { shareCopied.value = false }, 2000)
  } catch { /* nothing left to do silently */ }
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
  title: 'Saved — Viewora',
  description: 'Your saved property and vehicle tours on Viewora.',
})
</script>

<style scoped>
.profile {
  --ground: var(--vo-page);
  --sheet: var(--vo-surface);
  --sheet-2: var(--vo-elevated);
  --ink: var(--vo-text);
  --ink-soft: var(--vo-secondary);
  --ink-faint: var(--vo-muted);
  --line: var(--vo-border);
  --accent: var(--vo-text);
  --whatsapp: var(--vo-text);
  --whatsapp-ink: var(--vo-inverse);
  --font-display: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  min-height: 100vh;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-display);
  padding-bottom: 100px;
}

.profile__frame {
  width: min(100% - 40px, 920px);
  margin: 0 auto;
}
@media (min-width: 1024px) {
  .profile__frame { border-left: 1px solid var(--line); border-right: 1px solid var(--line); }
}
.profile__topbar {
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
.profile__back {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  border-radius: var(--vo-radius-pill);
  background: var(--sheet);
  border: 1px solid var(--line);
  color: var(--ink);
  flex: 0 0 auto;
}
.profile__title {
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  flex: 1 1 auto;
}
.profile__share {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  border-radius: var(--vo-radius-pill);
  background: var(--sheet);
  border: 1px solid var(--line);
  color: var(--ink);
  flex: 0 0 auto;
  cursor: pointer;
}

.profile__main { padding: 20px 20px 0; }

.profile__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
@media (min-width: 640px) {
  .profile__grid { grid-template-columns: repeat(3, 1fr); }
}

.profile__state {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 6px;
  padding: 80px 20px;
  color: var(--ink-faint);
}
.profile__state-text { font-size: 0.95rem; font-weight: 700; color: var(--ink-soft); margin: 6px 0 0; }
.profile__state-sub { font-size: 0.82rem; margin: 0 0 8px; max-width: 28ch; }
.profile__state-action {
  margin-top: 6px;
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
