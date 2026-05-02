<template>
  <!-- Full-screen tour preview page — no app chrome -->
  <div class="tour-page">

    <!-- Loading state -->
    <div v-if="state === 'loading'" class="tour-page-loading" aria-label="Loading tour">
      <NuxtImg
        v-if="blurCover"
        :src="blurCover"
        class="tour-page-loading-bg object-cover"
        width="100"
        height="50"
        format="webp"
        quality="30"
        loading="eager"
        aria-hidden="true"
      />
      <div class="tour-page-loading-scrim" aria-hidden="true" />
      <div class="tour-page-loading-center">
        <div class="loading-orb" />
        <p class="loading-label">Loading Preview</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="state === 'error'" class="tour-page-center p-6" role="main">
      <div class="state-card">
        <div class="state-card__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-7 h-7">
            <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <h1 class="state-card__title">Preview Unavailable</h1>
        <p class="state-card__body">{{ errorMessage }}</p>
        <NuxtLink to="/app/spaces" class="state-card__btn">Back to Dashboard</NuxtLink>
      </div>
    </div>

    <!-- No scenes state -->
    <div v-else-if="state === 'empty'" class="tour-page-center p-6" role="main">
      <div class="state-card">
        <div class="state-card__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-7 h-7">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <h1 class="state-card__title">No Scenes Yet</h1>
        <p class="state-card__body">Upload your first 360° image to preview the tour.</p>
        <NuxtLink to="/app/spaces" class="state-card__btn">Back to Editor</NuxtLink>
      </div>
    </div>

    <!-- ── Main Viewer ──────────────────────────────────── -->
    <template v-else-if="state === 'ready' && tour">

      <!-- 360 Viewer — fills the screen -->
      <ViewerPsvViewer
        :tour="tour"
        :share-url="shareUrl"
      />

      <!-- ── Top Bar Overlay ──────────────────────────── -->
      <div class="preview-topbar">
        <!-- Left: Space title + scene info -->
        <div class="preview-topbar__left">
          <div class="preview-logo">
            <svg viewBox="0 0 20 20" fill="none" class="w-4 h-4" stroke="currentColor" stroke-width="2">
              <circle cx="10" cy="10" r="8"/>
              <path d="M10 2a8 8 0 0 1 0 16M10 2a8 8 0 0 0 0 16M2 10h16"/>
            </svg>
          </div>
          <div class="preview-topbar__meta">
            <span class="preview-topbar__title">{{ tour.space.title }}</span>
            <span class="preview-topbar__scene">
              {{ tour.scenes.length }} scene{{ tour.scenes.length !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>

        <!-- Center: Preview mode badge -->
        <div class="preview-badge">
          <span class="preview-badge__dot" />
          Preview Mode
        </div>

        <!-- Right: Exit button -->
        <div class="preview-topbar__right">
          <NuxtLink
            :to="`/app/spaces/${id}?tab=360`"
            class="preview-exit-btn"
            aria-label="Exit preview and return to editor"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" class="w-3.5 h-3.5">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
            Exit Preview
          </NuxtLink>
        </div>
      </div>

      <!-- ── Bottom Bar: Scene name + Viewora brand ───── -->
      <div class="preview-bottombar">
        <div class="preview-bottombar__inner">
          <!-- Scene order hint -->
          <div class="preview-scene-chip">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3 opacity-60">
              <circle cx="8" cy="8" r="6"/>
              <path d="M8 4v4l2.5 2.5"/>
            </svg>
            Use hotspots or scene dock to navigate
          </div>

          <!-- Viewora watermark -->
          <a
            :href="marketingUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="preview-watermark"
            aria-label="Powered by Viewora"
          >
            Powered by <strong>Viewora</strong>
          </a>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useSeoMeta, useHead, useAsyncData, useRuntimeConfig } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

const { public: { marketingUrl } } = useRuntimeConfig()

// ── Types ──────────────────────────────────────────────────────

interface Hotspot {
  id: string
  type: 'info' | 'scene_link' | 'url' | 'video' | 'youtube'
  yaw: number
  pitch: number
  label?: string | null
  icon?: string | null
  target_scene_id?: string | null
  content?: Record<string, string> | null
}

interface Scene {
  id: string
  name: string
  order_index: number
  raw_image_url?: string | null
  tile_manifest_url?: string | null
  thumbnail_url?: string | null
  width?: number | null
  height?: number | null
  tile_cols?: number | null
  tile_rows?: number | null
  tiles_ready?: boolean | null
  status: string
  initial_yaw?: number
  initial_pitch?: number
  hotspots?: Hotspot[]
}

interface Space {
  id: string
  title: string
  description?: string | null
  slug?: string | null
  cover_image_url?: string | null
  lead_form_enabled: boolean
}

interface TourData {
  space: Space
  scenes: Scene[]
}

// ── Page meta ──────────────────────────────────────────────────
definePageMeta({ layout: false, middleware: 'auth' })

// ── Setup ──────────────────────────────────────────────────────
const { apiFetch } = useApiFetch()
const route = useRoute()
const id = route.params.id as string

type PageState = 'loading' | 'ready' | 'empty' | 'error'
const state = ref<PageState>('loading')
const tour = ref<TourData | null>(null)
const errorMessage = ref('This preview is unavailable.')

// Server-side fetch
const { data: _tourPayload, error: _tourError } = await useAsyncData(
  `preview:${id}`,
  () => apiFetch<{ tour: TourData }>(`/p/preview/${id}`),
  { server: true, lazy: false }
)

if (_tourError.value) {
  const msg = (_tourError.value as any)?.data?.statusMessage ?? _tourError.value?.message ?? ''
  errorMessage.value = msg.includes('404')
    ? "This tour doesn't exist or you don't have permission to preview it."
    : 'Something went wrong loading this preview.'
  state.value = 'error'
} else if (_tourPayload.value) {
  tour.value = _tourPayload.value.tour
  state.value = _tourPayload.value.tour.scenes.some(s => s.raw_image_url) ? 'ready' : 'empty'
}

// ── Computed ───────────────────────────────────────────────────

const shareUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/p/preview/${id}`
})

const blurCover = computed(() => {
  if (!tour.value) return null
  return (
    tour.value.scenes[0]?.thumbnail_url
    ?? tour.value.scenes[0]?.raw_image_url
    ?? tour.value.space.cover_image_url
    ?? null
  )
})

// ── SEO ────────────────────────────────────────────────────────
useSeoMeta({
  title: computed(() =>
    tour.value ? `[PREVIEW] ${tour.value.space.title} — Viewora` : 'Tour Preview — Viewora'
  ),
  robots: 'noindex, nofollow',
})

useHead({
  link: [{ rel: 'canonical', href: computed(() => tour.value?.space?.slug ? `${marketingUrl}/p/${tour.value.space.slug}` : '') }],
})
</script>

<style scoped>
/* ── Base ────────────────────────────────────────────────── */
.tour-page {
  position: fixed;
  inset: 0;
  background: #0a0a0a;
  overflow: hidden;
  font-family: 'Inter', -apple-system, sans-serif;
}

/* ── Loading ─────────────────────────────────────────────── */
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

.loading-orb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.2);
  animation: orb-pulse 1.6s ease-in-out infinite;
}

@keyframes orb-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.6); opacity: 0.5; }
}

.loading-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
}

/* ── Error / Empty states ─────────────────────────────────── */
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

/* ── Top Bar ─────────────────────────────────────────────── */
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

/* Center badge */
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

.preview-topbar__right {
  pointer-events: auto;
}

/* Exit button */
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

/* ── Bottom Bar ──────────────────────────────────────────── */
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
</style>
