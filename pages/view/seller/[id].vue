<template>
  <div class="seller-page">
    <div class="seller-page__frame">
      <header class="seller-page__topbar">
        <NuxtLink to="/view" class="seller-page__back" aria-label="Back to Home">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </NuxtLink>
        <span class="seller-page__title">{{ pending ? 'Profile' : (seller?.full_name || 'Property Owner') }}</span>
        <button v-if="seller" class="seller-page__share" aria-label="Share this profile" @click="shareProfile">
          <svg v-if="!shareCopied" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.5 15.4 6.5M8.6 13.5l6.8 4" /></svg>
          <svg v-else viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </button>
      </header>

      <main v-if="pending" class="seller-page__loading" aria-busy="true">
        <div class="skeleton skeleton--avatar" />
        <div class="skeleton skeleton--line skeleton--short" />
        <div class="skeleton skeleton--line skeleton--tiny" />
      </main>

      <div v-else-if="notFound" class="seller-page__state">
        <p class="seller-page__state-text">This profile isn't available.</p>
        <NuxtLink to="/view" class="seller-page__state-link">Back to listings</NuxtLink>
      </div>

      <main v-else-if="seller">
        <SellerHeader :seller-name="seller.full_name || 'Property Owner'" :avatar-url="seller.avatar_url" :listing-count="seller.listing_count" />
        <SellerBio :bio="seller.bio" />
        <SellerListingsGrid :listings="seller.listings" :pending="false" />
      </main>
    </div>

    <UiNavDock />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { ref, computed, onMounted } from 'vue'
import { useAsyncData, useHead, useSeoMeta, useRoute } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

const { apiFetch } = useApiFetch()
const { init: initTheme } = useTheme()
onMounted(initTheme)

const route = useRoute()
const sellerId = route.params.id as string

interface SellerProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  listing_count: number
  listings: any[]
}

const pending = ref(true)
const notFound = ref(false)
const seller = ref<SellerProfile | null>(null)

const { data, error } = await useAsyncData(
  `seller:${sellerId}`,
  () => apiFetch<{ data: SellerProfile }>(`/sellers/${encodeURIComponent(sellerId)}`),
  { server: true, lazy: false },
)

if (error.value) {
  const status = (error.value as any)?.response?.status ?? (error.value as any)?.status ?? 500
  if (status === 404) notFound.value = true
  else notFound.value = true // Same dead-end treatment — nothing else useful to show.
} else {
  seller.value = data.value?.data ?? null
  if (!seller.value) notFound.value = true
}
pending.value = false

const shareCopied = ref(false)
async function shareProfile() {
  if (!seller.value || typeof window === 'undefined') return
  const url = window.location.href
  const shareData = {
    title: `${seller.value.full_name || 'Property Owner'} on Viewora`,
    text: `${seller.value.listing_count} listing${seller.value.listing_count === 1 ? '' : 's'} on Viewora`,
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

const seoTitle = computed(() => `${seller.value?.full_name || 'Property Owner'} — Viewora`)
useSeoMeta({
  title: seoTitle,
  description: 'Listings on Viewora.',
})
</script>

<style scoped>
.seller-page {
  --font-display: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  min-height: 100vh;
  background: var(--vo-page);
  color: var(--vo-text);
  font-family: var(--font-display);
  padding-bottom: 100px;
}

.seller-page__frame {
  width: min(100% - 40px, 920px);
  margin: 0 auto;
}
@media (min-width: 1024px) {
  .seller-page__frame { border-left: 1px solid var(--vo-border); border-right: 1px solid var(--vo-border); }
}

.seller-page__topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 12px;
  background: var(--vo-page);
  border-bottom: 1px solid var(--vo-border);
  padding: max(16px, calc(env(safe-area-inset-top) + 8px)) 20px;
}
.seller-page__back, .seller-page__share {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: var(--vo-radius-pill);
  background: var(--vo-surface); border: 1px solid var(--vo-border); color: var(--vo-text);
  flex: 0 0 auto; cursor: pointer;
}
.seller-page__title {
  flex: 1 1 auto; min-width: 0; text-align: center;
  font-weight: 800; font-size: 1rem; letter-spacing: -0.01em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.seller-page__loading { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 20px; }
.skeleton { position: relative; overflow: hidden; background: var(--vo-elevated); border-radius: 4px; }
.skeleton::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, var(--vo-border-strong) 50%, transparent);
  transform: translateX(-100%);
  animation: skeleton-sweep 1.6s ease-in-out infinite;
}
.skeleton--avatar { width: 88px; height: 88px; border-radius: 50%; }
.skeleton--line { height: 12px; width: 40%; border-radius: 4px; }
.skeleton--short { width: 45%; }
.skeleton--tiny { width: 30%; height: 10px; }
@keyframes skeleton-sweep { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) {
  .skeleton::after { animation: none; }
}

.seller-page__state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; text-align: center; }
.seller-page__state-text { color: var(--vo-secondary); font-size: 0.9rem; }
.seller-page__state-link { color: var(--vo-text); font-weight: 700; text-decoration: none; }
</style>
