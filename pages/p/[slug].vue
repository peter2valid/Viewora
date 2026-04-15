<template>
  <!-- Full-screen tour page. No app chrome. -->
  <div class="tour-page">

    <!-- Loading state — blurred scene image while Pannellum initialises -->
    <div v-if="state === 'loading'" class="tour-page-loading" aria-label="Loading tour">
      <div
        v-if="blurCover"
        class="tour-page-loading-bg"
        :style="{ backgroundImage: `url(${blurCover})` }"
        aria-hidden="true"
      />
      <div class="tour-page-loading-scrim" aria-hidden="true" />
      <div class="tour-page-loading-bar" aria-hidden="true" />
      <div class="tour-page-loading-center">
        <div class="tour-page-loading-dot" />
        <p class="tour-page-loading-text">Immersing…</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="state === 'error'" class="tour-page-error" role="main">
      <div class="tour-page-error-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="tour-page-error-icon" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        <h1 class="tour-page-error-title">Tour unavailable</h1>
        <p class="tour-page-error-body">{{ errorMessage }}</p>
        <a href="/" class="tour-page-error-link">← Back to Viewora</a>
      </div>
    </div>

    <!-- No scenes state (tour exists but has no uploaded panoramas yet) -->
    <div v-else-if="state === 'empty'" class="tour-page-error" role="main">
      <div class="tour-page-error-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="tour-page-error-icon" aria-hidden="true">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <h1 class="tour-page-error-title">Tour coming soon</h1>
        <p class="tour-page-error-body">This tour hasn't been set up yet. Check back soon.</p>
      </div>
    </div>

    <!-- Main viewer — rendered once tour data is loaded -->
    <template v-else-if="state === 'ready' && tour">
      <ViewerTourViewer
        :tour="tour"
        :share-url="shareUrl"
      />

      <!-- Lead form — bottom sheet, shows after delay or CTA click -->
      <template v-if="tour.space.lead_form_enabled">
        <button
          class="tour-lead-cta"
          :aria-expanded="leadOpen"
          aria-controls="lead-form"
          @click="leadOpen = true"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M17 3H3a1 1 0 00-1 1v10a1 1 0 001 1h4l3 3 3-3h4a1 1 0 001-1V4a1 1 0 00-1-1z"/>
          </svg>
          Inquire
        </button>

        <Transition name="sheet">
          <div
            v-if="leadOpen"
            id="lead-form"
            class="tour-lead-sheet-backdrop"
            role="dialog"
            aria-label="Inquiry form"
            @click.self="leadOpen = false"
          >
            <div class="tour-lead-sheet">
              <div class="tour-lead-sheet-header">
                <p class="tour-lead-sheet-title">{{ tour.space.title }}</p>
                <button class="tour-lead-close" aria-label="Close" @click="leadOpen = false">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4l8 8M12 4l-8 8"/>
                  </svg>
                </button>
              </div>

              <!-- Success -->
              <div v-if="leadSent" class="tour-lead-success">
                <div class="tour-lead-success-icon" aria-hidden="true">✓</div>
                <p class="tour-lead-success-title">Inquiry sent</p>
                <p class="tour-lead-success-body">The property owner will be in touch with you shortly.</p>
                <button class="tour-lead-success-again" @click="resetLead">Send another</button>
              </div>

              <!-- Form -->
              <form v-else class="tour-lead-form" @submit.prevent="submitLead" novalidate>
                <div class="tour-lead-field">
                  <label for="lead-name" class="tour-lead-label">Full name</label>
                  <input
                    id="lead-name"
                    v-model="leadForm.name"
                    type="text"
                    placeholder="Your name"
                    required
                    autocomplete="name"
                    class="tour-lead-input"
                  />
                </div>
                <div class="tour-lead-field">
                  <label for="lead-email" class="tour-lead-label">Email</label>
                  <input
                    id="lead-email"
                    v-model="leadForm.email"
                    type="email"
                    placeholder="you@email.com"
                    required
                    autocomplete="email"
                    class="tour-lead-input"
                  />
                </div>
                <div class="tour-lead-field">
                  <label for="lead-phone" class="tour-lead-label">Phone <span class="tour-lead-optional">(optional)</span></label>
                  <input
                    id="lead-phone"
                    v-model="leadForm.phone"
                    type="tel"
                    placeholder="+254 700 000 000"
                    autocomplete="tel"
                    class="tour-lead-input"
                  />
                </div>
                <div class="tour-lead-field">
                  <label for="lead-message" class="tour-lead-label">Message <span class="tour-lead-optional">(optional)</span></label>
                  <textarea
                    id="lead-message"
                    v-model="leadForm.message"
                    placeholder="Questions or requirements…"
                    rows="3"
                    class="tour-lead-input tour-lead-textarea"
                  />
                </div>
                <p v-if="leadError" class="tour-lead-error" role="alert">{{ leadError }}</p>
                <button type="submit" class="tour-lead-submit" :disabled="leadPending">
                  {{ leadPending ? 'Sending…' : 'Send inquiry' }}
                </button>
              </form>
            </div>
          </div>
        </Transition>
      </template>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useSeoMeta, useHead } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

// ── Types ──────────────────────────────────────────────────────

interface Hotspot {
  id: string
  type: 'info' | 'scene_link' | 'url'
  yaw: number
  pitch: number
  label?: string | null
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
  property_360_settings?: Array<{ auto_rotate_enabled?: boolean }> | null
}

interface TourData {
  space: Space
  scenes: Scene[]
}

// ── No app layout — this page is full-screen ──────────────────
definePageMeta({ layout: false })

// ── Setup ──────────────────────────────────────────────────────
const { apiFetch } = useApiFetch()
const route = useRoute()
const slug = route.params.slug as string

type PageState = 'loading' | 'ready' | 'empty' | 'error'
const state = ref<PageState>('loading')
const tour = ref<TourData | null>(null)
const errorMessage = ref('This tour is unavailable or has been removed.')

// Lead form
const leadOpen = ref(false)
const leadPending = ref(false)
const leadSent = ref(false)
const leadError = ref('')
const leadForm = ref({ name: '', email: '', phone: '', message: '' })

// ── Computed ───────────────────────────────────────────────────

const shareUrl = computed(() => {
  if (typeof window === 'undefined') return `https://viewora.software/p/${slug}`
  return `${window.location.origin}/p/${slug}`
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

const ogImage = computed(() =>
  tour.value?.space.cover_image_url
  ?? tour.value?.scenes[0]?.thumbnail_url
  ?? 'https://app.viewora.software/images/og-default.png'
)

// ── Data fetch ─────────────────────────────────────────────────

onMounted(fetchTour)

async function fetchTour() {
  state.value = 'loading'
  try {
    const result = await apiFetch<{ tour: TourData }>(`/p/${encodeURIComponent(slug)}`)
    tour.value = result.tour

    const hasScenes = result.tour.scenes.some(s => s.raw_image_url)
    state.value = hasScenes ? 'ready' : 'empty'
  } catch (err: any) {
    const msg = err?.data?.statusMessage ?? err?.message ?? ''
    errorMessage.value = msg.includes('404') || msg.toLowerCase().includes('not found')
      ? 'This tour doesn\'t exist or has been unpublished.'
      : 'Something went wrong loading this tour.'
    state.value = 'error'
  }
}

// ── Lead form ──────────────────────────────────────────────────

async function submitLead() {
  leadError.value = ''
  if (!leadForm.value.name.trim() || !leadForm.value.email.trim()) {
    leadError.value = 'Name and email are required.'
    return
  }
  leadPending.value = true
  try {
    await apiFetch('/leads', {
      method: 'POST',
      body: {
        spaceId: tour.value!.space.id,
        name: leadForm.value.name,
        email: leadForm.value.email,
        phone: leadForm.value.phone || undefined,
        message: leadForm.value.message || undefined,
        source: (route.query.src as string) || 'direct',
      },
    })
    leadSent.value = true
  } catch (err: any) {
    leadError.value = err?.data?.statusMessage ?? 'Failed to send. Please try again.'
  } finally {
    leadPending.value = false
  }
}

function resetLead() {
  leadSent.value = false
  leadError.value = ''
  leadForm.value = { name: '', email: '', phone: '', message: '' }
}

// ── SEO ────────────────────────────────────────────────────────

useSeoMeta({
  title: computed(() =>
    tour.value ? `${tour.value.space.title} — Viewora` : 'Virtual Tour — Viewora'
  ),
  description: computed(() =>
    tour.value?.space.description
    ?? 'Explore this immersive 360° virtual tour on Viewora.'
  ),
  ogTitle: computed(() =>
    tour.value ? `${tour.value.space.title} — Viewora` : 'Virtual Tour — Viewora'
  ),
  ogDescription: computed(() =>
    tour.value?.space.description
    ?? 'Experience this property in 360° on Viewora.'
  ),
  ogImage,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: computed(() =>
    tour.value ? `${tour.value.space.title} — Viewora` : 'Virtual Tour — Viewora'
  ),
  twitterDescription: computed(() =>
    tour.value?.space.description ?? 'Immersive 360° virtual tour on Viewora.'
  ),
  twitterImage: ogImage,
})

useHead({
  link: [{ rel: 'canonical', href: computed(() => `https://viewora.software/p/${slug}`) }],
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

.tour-page-loading-bar {
  position: absolute;
  top: 0; left: 0;
  height: 2px;
  background: #00dc82;
  animation: page-load-bar 2s ease-in-out infinite;
}

@keyframes page-load-bar {
  0%   { width: 0%; left: 0; }
  50%  { width: 55%; left: 25%; }
  100% { width: 0%; left: 100%; }
}

.tour-page-loading-center {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.tour-page-loading-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #00dc82;
  box-shadow: 0 0 16px rgba(0, 220, 130, 0.7);
  animation: dot-pulse 1.4s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.5); opacity: 0.5; }
}

.tour-page-loading-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
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

.tour-page-error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 320px;
  text-align: center;
}

.tour-page-error-icon {
  width: 40px;
  height: 40px;
  color: rgba(255,255,255,0.25);
  margin-bottom: 4px;
}

.tour-page-error-title {
  font-size: 18px;
  font-weight: 700;
  color: #f5f5f5;
}

.tour-page-error-body {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  line-height: 1.5;
}

.tour-page-error-link {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #00dc82;
  text-decoration: none;
}
.tour-page-error-link:hover { text-decoration: underline; }

/* ── Lead CTA button (always visible over viewer) ────────── */
.tour-lead-cta {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 35;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 999px;
  background: rgba(10,10,10,0.8);
  border: 1px solid rgba(255,255,255,0.12);
  color: #f5f5f5;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: background 150ms, transform 150ms;
  font-family: 'Inter', sans-serif;
}
.tour-lead-cta:hover { background: rgba(255,255,255,0.1); transform: translateX(-50%) translateY(-2px); }
.tour-lead-cta svg { width: 15px; height: 15px; }

/* ── Lead sheet ────────────────────────────────────────────  */
.tour-lead-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.tour-lead-sheet {
  width: 100%;
  max-width: 520px;
  background: #141414;
  border: 1px solid rgba(255,255,255,0.08);
  border-bottom: none;
  border-radius: 20px 20px 0 0;
  padding: 20px 20px 40px;
  max-height: 90dvh;
  overflow-y: auto;
}

.tour-lead-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.tour-lead-sheet-title {
  font-size: 14px;
  font-weight: 600;
  color: #f5f5f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.tour-lead-close {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  border: none; cursor: pointer;
  color: rgba(255,255,255,0.5);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.tour-lead-close svg { width: 12px; height: 12px; }
.tour-lead-close:hover { background: rgba(255,255,255,0.12); }

/* Form */
.tour-lead-form { display: flex; flex-direction: column; gap: 14px; }

.tour-lead-field { display: flex; flex-direction: column; gap: 5px; }

.tour-lead-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.45);
}

.tour-lead-optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: rgba(255,255,255,0.25); }

.tour-lead-input {
  padding: 10px 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  color: #f5f5f5;
  font-size: 14px;
  outline: none;
  font-family: 'Inter', sans-serif;
  transition: border-color 150ms;
}
.tour-lead-input::placeholder { color: rgba(255,255,255,0.25); }
.tour-lead-input:focus { border-color: rgba(0, 220, 130, 0.5); }

.tour-lead-textarea { resize: none; }

.tour-lead-error { font-size: 12px; color: #f87171; }

.tour-lead-submit {
  padding: 12px;
  border-radius: 10px;
  background: #00dc82;
  color: #0a0a0a;
  font-size: 14px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: background 150ms;
  font-family: 'Inter', sans-serif;
}
.tour-lead-submit:hover:not(:disabled) { background: #00c972; }
.tour-lead-submit:disabled { opacity: 0.6; cursor: default; }

/* Success */
.tour-lead-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  text-align: center;
}

.tour-lead-success-icon {
  width: 48px; height: 48px;
  border-radius: 14px;
  background: rgba(0, 220, 130, 0.15);
  border: 1px solid rgba(0, 220, 130, 0.3);
  color: #00dc82;
  font-size: 22px;
  display: flex; align-items: center; justify-content: center;
}

.tour-lead-success-title { font-size: 16px; font-weight: 700; color: #f5f5f5; }
.tour-lead-success-body  { font-size: 13px; color: rgba(255,255,255,0.55); max-width: 260px; line-height: 1.5; }

.tour-lead-success-again {
  margin-top: 8px;
  font-size: 12px;
  color: #00dc82;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
}
.tour-lead-success-again:hover { text-decoration: underline; }

/* ── Sheet transition ─────────────────────────────────────── */
.sheet-enter-active { transition: opacity 200ms ease; }
.sheet-leave-active { transition: opacity 200ms ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-active .tour-lead-sheet,
.sheet-leave-active .tour-lead-sheet { transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1); }
.sheet-enter-from .tour-lead-sheet,
.sheet-leave-to .tour-lead-sheet { transform: translateY(100%); }

/* ── Reduced motion ──────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .tour-page-loading-dot, .tour-page-loading-bar, @keyframes dot-pulse, @keyframes page-load-bar { animation: none !important; }
  .sheet-enter-active, .sheet-leave-active { transition-duration: 0ms !important; }
}
</style>
