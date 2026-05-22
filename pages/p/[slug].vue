<template>
  <div class="tour-page">
    <div v-if="pending" class="tour-page-loading" aria-label="Loading tour">
      <img
        v-if="blurCover"
        :src="blurCover"
        class="tour-page-loading-bg object-cover"
        width="100"
        height="50"
        loading="eager"
        aria-hidden="true"
      />
      <div class="tour-page-loading-scrim" aria-hidden="true" />
      <div class="tour-page-loading-center">
        <div class="loading-logo-container">
          <img src="/globe-icon.png" class="loading-logo" alt="" />
        </div>
        <p class="loading-label">Loading Tour</p>
      </div>
    </div>

    <div v-else-if="fetchError" class="tour-page-center p-6" role="main">
      <div class="state-card">
        <div class="state-card__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-7 h-7">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h1 class="state-card__title">Tour Unavailable</h1>
        <p class="state-card__body">{{ fetchError }}</p>
        <NuxtLink to="/" class="state-card__btn">Return Home</NuxtLink>
      </div>
    </div>

    <div v-else-if="state === 'empty'" class="tour-page-center p-6" role="main">
      <div class="state-card">
        <div class="state-card__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-7 h-7">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 class="state-card__title">No Scenes Yet</h1>
        <p class="state-card__body">This tour is published, but no renderable scenes are available yet.</p>
        <NuxtLink to="/" class="state-card__btn">Return Home</NuxtLink>
      </div>
    </div>

    <template v-else-if="state === 'ready' && tour">
      <PsvViewer
        :tour="tour"
        :share-url="shareUrl"
      />

      <!-- Free/Standard tier: Viewora branding -->
      <a
        v-if="!hasBrandingDetails"
        :href="marketingUrl || 'https://viewora.software/'"
        target="_blank"
        rel="noopener noreferrer"
        class="viewora-free-brand"
        aria-label="Visit Viewora"
      >
        <img
          src="/globe-icon.png"
          class="viewora-free-brand__logo"
          alt=""
        />
        <span class="viewora-free-brand__name">Viewora</span>
      </a>

      <!-- Premium tier: User's custom branding -->
      <div v-else class="brand-card" aria-label="Tour branding">
        <img
          v-if="tour.space?.logo_url"
          :src="tour.space.logo_url"
          class="brand-card__logo"
          :alt="tour.space.title"
        />
        <div class="brand-card__body">
          <p class="brand-card__name">{{ tour.space.title }}</p>
          <p v-if="tour.space?.description" class="brand-card__desc">{{ tour.space.description }}</p>
          <p v-if="tour.space?.location_text" class="brand-card__line">{{ tour.space.location_text }}</p>
          <p v-if="tour.space?.phone" class="brand-card__line">{{ tour.space.phone }}</p>
          <p v-if="tour.space?.email" class="brand-card__line">{{ tour.space.email }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useAsyncData, useHead, useRoute, useSeoMeta, useRuntimeConfig } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import PsvViewer from '~/components/viewer/PsvViewer.vue'

const { public: { marketingUrl } } = useRuntimeConfig()
const { apiFetch } = useApiFetch()
const { $posthog } = useNuxtApp()
const route = useRoute()
const slug = route.params.slug as string

const pending = ref(true)
const fetchError = ref('')
const state = ref<'loading' | 'ready' | 'empty' | 'error'>('loading')
const space = ref<any>(null)
const tour = ref<any>(null)
const shareUrl = ref('')

const blurCover = computed(() => {
  if (!tour.value) return null
  return (
    tour.value.scenes?.[0]?.thumbnail_url
    ?? tour.value.scenes?.[0]?.raw_image_url
    ?? tour.value.space?.cover_image_url
    ?? null
  )
})

const hasBrandingDetails = computed(() => {
  const spaceData = tour.value?.space
  if (!spaceData) return false
  return !!(
    spaceData.logo_url ||
    spaceData.description ||
    spaceData.location_text ||
    spaceData.phone ||
    spaceData.email
  )
})

const { data: tourPayload, error: tourError } = await useAsyncData(
  `public-tour:${slug}`,
  () => apiFetch<any>(`/p/${encodeURIComponent(slug)}`),
  { server: true, lazy: false, getCachedData: (key, nuxtApp) => nuxtApp.isHydrating ? nuxtApp.payload.data[key] : undefined },
)

if (tourError.value) {
  const errorData = (tourError.value as any)?.data
  fetchError.value = errorData?.statusMessage || 'Space unavailable or removed.'
  state.value = 'error'
} else if (tourPayload.value) {
  const tourData = tourPayload.value?.tour ?? tourPayload.value
  tour.value = tourData
  const spaceData = tourData?.space ?? tourData
  space.value = spaceData

  const hasRenderableScene = Array.isArray(tourData?.scenes) && tourData.scenes.some((scene: any) => {
    return Boolean(scene?.raw_image_url || scene?.thumbnail_url || scene?.tile_manifest_url)
  })

  state.value = hasRenderableScene ? 'ready' : 'empty'
  syncShareLinks(spaceData)
}

pending.value = false

let tourStartTime = 0

onMounted(() => {
  tourStartTime = Date.now()
  if (space.value?.id) {
    fireViewEvent(space.value.id)
  }
  syncShareLinks()
})

onBeforeUnmount(() => {
  if (space.value?.id && tourStartTime) {
    const durationSec = Math.round((Date.now() - tourStartTime) / 1000)
    $posthog?.capture('tour_session_ended', {
      space_id: space.value.id,
      slug,
      duration_seconds: durationSec,
    })
  }
})

function syncShareLinks(value = space.value) {
  if (typeof window === 'undefined' || !value) return

  const identifier = value.slug || value.id || slug
  const origin = window.location.origin
  shareUrl.value = `${origin}/p/${identifier}`
}

function fireViewEvent(spaceId: string) {
  apiFetch('/analytics/view', {
    method: 'POST',
    body: { spaceId, source: route.query.src || 'direct' },
  }).catch(() => {})

  $posthog?.capture('tour_viewed', {
    space_id: spaceId,
    source: route.query.src || 'direct',
    referrer: typeof document !== 'undefined' ? (document.referrer || 'direct') : 'direct',
    slug,
  })
}

useSeoMeta({
  title: computed(() => tour.value ? `${tour.value.space.title} — Viewora` : 'Tour — Viewora'),
  description: computed(() => tour.value?.space?.description || 'Experience this immersive architectural vision on Viewora.'),
  ogTitle: computed(() => tour.value ? `${tour.value.space.title} — Viewora` : 'Tour — Viewora'),
  ogDescription: computed(() => tour.value?.space?.description || 'Experience this immersive architectural vision on Viewora.'),
  ogImage: computed(() => space.value?.cover_image_url || 'https://app.viewora.software/images/og-default.png'),
  twitterCard: 'summary_large_image',
  twitterTitle: computed(() => tour.value ? `${tour.value.space.title} — Viewora` : 'Tour — Viewora'),
  twitterDescription: computed(() => tour.value?.space?.description || 'Experience this immersive architectural vision on Viewora.'),
  twitterImage: computed(() => space.value?.cover_image_url || 'https://app.viewora.software/images/og-default.png'),
})

useHead({
  link: [{ rel: 'canonical', href: computed(() => `${marketingUrl}/p/${slug}`) }],
})
</script>

<style scoped>
.tour-page {
  position: fixed;
  inset: 0;
  background: #0a0a0a;
  overflow: hidden;
  font-family: 'Inter', -apple-system, sans-serif;
}

.tour-page-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tour-page-loading-bg {
  position: absolute;
  inset: -20px;
  width: calc(100% + 40px);
  height: calc(100% + 40px);
  object-fit: cover;
  filter: blur(28px) brightness(0.3) saturate(0.8);
}

.tour-page-loading-scrim {
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 10, 0.6);
}

.tour-page-loading-center {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.05), inset 0 0 15px rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  margin-bottom: 8px;
  animation: logo-glow 2s ease-in-out infinite alternate;
}

.loading-logo {
  width: 76px;
  height: 76px;
  object-fit: contain;
  filter: invert(1);
  animation: logo-spin 6s linear infinite;
}

@keyframes logo-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes logo-glow {
  from {
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.03), inset 0 0 10px rgba(255, 255, 255, 0.03);
  }
  to {
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 0 40px rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.1);
  }
}

.loading-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
}

.tour-page-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-card {
  max-width: 360px;
  width: 100%;
  background: rgba(16,16,20,0.95);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 36px 28px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  backdrop-filter: blur(16px);
  box-shadow: 0 40px 80px rgba(0,0,0,0.5);
}

.state-card__icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.3);
  margin-bottom: 4px;
}

.state-card__title {
  font-size: 18px;
  font-weight: 800;
  color: rgba(255,255,255,0.9);
  letter-spacing: -0.02em;
}

.state-card__body {
  font-size: 13px;
  color: rgba(255,255,255,0.45);
  line-height: 1.6;
  font-weight: 500;
  margin: 0;
}

.state-card__btn {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border-radius: 10px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.8);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: all 0.15s ease;
}

.state-card__btn:hover {
  background: rgba(255,255,255,0.14);
  color: white;
}

.preview-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%);
  pointer-events: none;
}

.preview-topbar__left {
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
}

.preview-logo {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.8);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}

.preview-topbar__meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.preview-topbar__title {
  font-size: 13px;
  font-weight: 800;
  color: rgba(255,255,255,0.92);
  letter-spacing: -0.01em;
  line-height: 1;
  text-shadow: 0 1px 8px rgba(0,0,0,0.8);
}

.preview-topbar__scene {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.04em;
}

.preview-badge {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: rgba(147, 197, 253, 0.9);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  backdrop-filter: blur(12px);
  white-space: nowrap;
  pointer-events: none;
}

.preview-badge__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #60a5fa;
  box-shadow: 0 0 8px rgba(96,165,250,0.8);
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.preview-bottombar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  padding: 0 16px 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%);
  pointer-events: none;
}

.preview-bottombar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: auto;
}

.preview-topbar__right {
  pointer-events: auto;
}

.preview-exit-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 9px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.85);
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  letter-spacing: 0.04em;
  transition: all 0.15s ease;
  backdrop-filter: blur(12px);
  white-space: nowrap;
}

.preview-exit-btn:hover {
  background: rgba(255,255,255,0.18);
  color: white;
  border-color: rgba(255,255,255,0.25);
  transform: translateY(-1px);
}

.preview-scene-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
  font-size: 10px;
  font-weight: 600;
  backdrop-filter: blur(8px);
  letter-spacing: 0.02em;
}

.preview-watermark {
  font-size: 10px;
  font-weight: 500;
  color: rgba(255,255,255,0.3);
  text-decoration: none;
  letter-spacing: 0.04em;
  transition: color 0.15s ease;
}

.preview-watermark strong {
  font-weight: 800;
  color: rgba(255,255,255,0.5);
}

.preview-watermark:hover {
  color: rgba(255,255,255,0.6);
}

.preview-watermark:hover strong {
  color: rgba(255,255,255,0.8);
}

/* ── Brand card (top-left of viewer) ───────────────────── */
.brand-card {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 200px;
  pointer-events: none;
}

.brand-card__logo {
  width: auto;
  max-width: 140px;
  max-height: 52px;
  object-fit: contain;
  object-position: left center;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));
}

.brand-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-card__name {
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 1px 10px rgba(0,0,0,0.8);
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin: 0;
}

.brand-card__desc {
  font-size: 10px;
  font-weight: 500;
  color: rgba(255,255,255,0.55);
  text-shadow: 0 1px 6px rgba(0,0,0,0.7);
  line-height: 1.45;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.brand-card__line {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255,255,255,0.75);
  text-shadow: 0 1px 6px rgba(0,0,0,0.7);
  line-height: 1.4;
  margin: 0;
}

.viewora-free-brand {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0px;
  padding: 0;
  background: transparent;
  border: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: 0;
  color: #ffffff;
  text-decoration: none;
  font-family: 'Inter', -apple-system, sans-serif;
  box-shadow: none;
  pointer-events: auto;
  transition: opacity 150ms ease, transform 150ms ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.viewora-free-brand:hover {
  opacity: 0.8;
  transform: translateY(-1px);
}

.viewora-free-brand__logo {
  width: 76px;
  height: 76px;
  object-fit: contain;
  margin-top: 3px;
  margin-left: -15px;
  margin-right: -12px;
  filter: invert(1);
}

.viewora-free-brand__name {
  font-size: 1.25rem; /* 20px */
  font-weight: 900;
  letter-spacing: -0.05em;
  color: #ffffff;
  line-height: 1;
}
</style>
