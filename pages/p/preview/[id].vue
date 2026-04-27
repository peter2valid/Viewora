<template>
  <!-- Full-screen tour page. No app chrome. -->
  <div class="tour-page">

    <!-- Loading state — blurred scene image while viewer initialises -->
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
        <div class="w-1.5 h-1.5 bg-main rounded-full animate-pulse shadow-[0_0_15px_rgba(var(--main-rgb),0.8)] mb-4"></div>
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-main/60 animate-in fade-in slide-in-from-bottom-2 duration-1000">Synchronizing Atmosphere</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="state === 'error'" class="tour-page-error p-6" role="main">
      <div class="max-w-md w-full card-glass p-10 text-center shadow-2xl animate-in zoom-in-95 duration-500">
        <div class="w-16 h-16 bg-surface-alt text-main/30 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <h1 class="text-xl font-black text-main tracking-tight mb-2">Preview Interrupted</h1>
        <p class="text-sm text-dim font-bold leading-relaxed mb-8">{{ errorMessage }}</p>
        <NuxtLink to="/app/spaces" class="btn btn-secondary !px-8 !py-3 !rounded-xl text-[11px] font-black uppercase tracking-widest">Return to Dashboard</NuxtLink>
      </div>
    </div>

    <!-- No scenes state -->
    <div v-else-if="state === 'empty'" class="tour-page-error p-6" role="main">
      <div class="max-w-md w-full card-glass p-10 text-center shadow-2xl animate-in zoom-in-95 duration-500">
        <div class="w-16 h-16 bg-surface-alt text-main/30 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </div>
        <h1 class="text-xl font-black text-main tracking-tight mb-2">Architectural Draft</h1>
        <p class="text-sm text-dim font-bold leading-relaxed mb-4">This spatial experience is currently being staged.</p>
        <span class="text-[10px] font-black uppercase tracking-widest text-main/40">Owner Preview Mode</span>
      </div>
    </div>

    <!-- Main viewer -->
    <template v-else-if="state === 'ready' && tour">
      <div class="fixed top-4 left-4 z-[60] pointer-events-none">
        <div class="px-3 py-1.5 rounded-full bg-blue-600/90 text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-xl border border-white/20">
          Private Preview Mode
        </div>
      </div>

      <ViewerPsvViewer
        :tour="tour"
        :share-url="shareUrl"
      />

      <!-- WhatsApp share button disabled in preview -->
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useSeoMeta, useHead, useAsyncData } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

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

// ── No app layout — this page is full-screen ──────────────────
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

// First scene thumbnail or cover image — shown as blurred background during load
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
  link: [{ rel: 'canonical', href: computed(() => tour.value?.space?.slug ? `https://viewora.software/p/${tour.value.space.slug}` : '') }],
})
</script>

<style scoped>
/* Full-screen container */
.tour-page {
  position: fixed;
  inset: 0;
  background: #0a0a0a;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* ── Loading ─────────────────────────────────────────────── */
.tour-page-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
}

.tour-page-loading-bg {
  position: absolute;
  inset: -20px;
  background-size: cover;
  background-position: center;
  filter: blur(24px) brightness(0.35);
}

.tour-page-loading-scrim {
  position: absolute;
  inset: 0;
  background: rgba(10,10,10,0.55);
}

.tour-page-loading-center {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* ── Error ───────────────────────────────────────────────── */
.tour-page-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* Reuse existing viewer styles or global components if available */
</style>
