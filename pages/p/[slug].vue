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
        <h1 class="text-xl font-black text-main tracking-tight mb-2">Transmission Interrupted</h1>
        <p class="text-sm text-dim font-bold leading-relaxed mb-8">{{ errorMessage }}</p>
        <NuxtLink to="/" class="btn btn-secondary !px-8 !py-3 !rounded-xl text-[11px] font-black uppercase tracking-widest">Return to Base</NuxtLink>
      </div>
    </div>

    <!-- No scenes state -->
    <div v-else-if="state === 'empty'" class="tour-page-error p-6" role="main">
      <div class="max-w-md w-full card-glass p-10 text-center shadow-2xl animate-in zoom-in-95 duration-500">
        <div class="w-16 h-16 bg-surface-alt text-main/30 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </div>
        <h1 class="text-xl font-black text-main tracking-tight mb-2">Architectural Draft</h1>
        <p class="text-sm text-dim font-bold leading-relaxed mb-4">This spatial experience is currently being staged by the creator.</p>
        <span class="text-[10px] font-black uppercase tracking-widest text-main/40">Coming Soon</span>
      </div>
    </div>

    <!-- Main viewer -->
    <template v-else-if="state === 'ready' && tour">
      <ViewerPsvViewer
        :tour="tour"
        :share-url="shareUrl"
        @touchstart="showGyroHint = false"
      />

      <!-- Mobile Gyro Hint -->
      <Transition name="fade-smooth">
        <div v-if="showGyroHint" class="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div class="flex flex-col items-center gap-5">
            <div class="gyro-icon-container">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-main">
                <rect x="5" y="2" width="14" height="20" rx="3" ry="3"/>
                <path d="M12 18h.01"/>
              </svg>
            </div>
            <p class="text-[10px] font-black uppercase tracking-[0.25em] text-main drop-shadow-xl bg-zinc-950/40 px-6 py-2.5 rounded-full backdrop-blur-md border border-main/20">Tilt to explore</p>
          </div>
        </div>
      </Transition>

      <!-- WhatsApp share button — top right, always visible -->
      <a
        :href="`https://wa.me/?text=${encodeURIComponent('Take a look at this 360° tour: ' + shareUrl)}`"
        target="_blank"
        rel="noopener noreferrer"
        class="fixed top-4 right-4 z-[50] flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#25D366] text-white text-[11px] font-black uppercase tracking-wider shadow-2xl hover:bg-[#1ebe5d] active:scale-95 transition-all"
        aria-label="Share on WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 shrink-0">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Share
      </a>

      <!-- Lead form — bottom sheet, shows after delay or CTA click -->
      <template v-if="tour.space.lead_form_enabled">
        <button
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-8 py-4 card-glass !rounded-full text-sm font-black text-main shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-main/20 hover:scale-105 active:scale-95 transition-all animate-in slide-in-from-bottom-10"
          :aria-expanded="leadOpen"
          aria-controls="lead-form"
          @click="leadOpen = true"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-main">
            <path d="M17 3H3a1 1 0 00-1 1v10a1 1 0 001 1h4l3 3 3-3h4a1 1 0 001-1V4a1 1 0 00-1-1z"/>
          </svg>
          Inquire Now
        </button>

        <Transition name="sheet-premium">
          <div
            v-if="leadOpen"
            id="lead-form"
            class="fixed inset-0 z-[200] flex items-end justify-center p-0 md:p-6 md:pb-12"
            role="dialog"
            aria-label="Inquiry form"
            @click.self="leadOpen = false"
          >
            <div class="absolute inset-0 bg-zinc-950/60 backdrop-blur-xl" @click="leadOpen = false"></div>
            
            <div class="relative w-full max-w-xl card-glass !rounded-t-[2.5rem] md:!rounded-[2.5rem] border-main/20 shadow-[0_-20px_100px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[90dvh]">
              <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-main/10 via-main to-main/10"></div>
              
              <header class="px-8 py-8 flex items-center justify-between border-b border-border bg-surface-alt/30">
                 <div class="space-y-1">
                   <h3 class="text-[10px] font-black text-main uppercase tracking-widest">Connect with Curator</h3>
                   <p class="text-lg font-black text-main tracking-tight truncate max-w-[300px]">{{ tour.space.title }}</p>
                 </div>
                 <button class="w-10 h-10 flex items-center justify-center text-dim hover:text-main hover:bg-surface-alt rounded-2xl transition-all" @click="leadOpen = false">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="3" class="w-4 h-4"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                 </button>
              </header>

              <div class="flex-1 overflow-y-auto p-8 md:p-10 scrollbar-premium">
                <!-- Success State -->
                <div v-if="leadSent" class="py-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                  <div class="w-20 h-20 bg-main text-bg rounded-3xl flex items-center justify-center mb-8 shadow-[0_20px_50px_rgba(var(--main-rgb),0.3)] border-4 border-surface">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h4 class="text-2xl font-black text-main tracking-tight mb-2">Transmission Successful</h4>
                  <p class="text-sm text-dim font-bold max-w-xs mx-auto leading-relaxed mb-10">Your inquiry has been encrypted and synchronized with the property curator.</p>
                  <button class="btn btn-secondary !px-10 !py-3 !rounded-xl text-[11px] font-black uppercase tracking-widest" @click="resetLead">Send Supplemental Message</button>
                </div>

                <!-- Inquiry Form -->
                <form v-else class="space-y-6" @submit.prevent="submitLead" novalidate>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="flex flex-col gap-2">
                      <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Identity</label>
                      <input id="lead-name" v-model="leadForm.name" type="text" placeholder="Your name" class="input-glass w-full px-5 py-3.5 text-sm font-bold" required />
                    </div>
                    <div class="flex flex-col gap-2">
                      <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Response Channel</label>
                      <input id="lead-email" v-model="leadForm.email" type="email" placeholder="email@address.com" class="input-glass w-full px-5 py-3.5 text-sm font-bold" required />
                    </div>
                  </div>

                  <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Direct Line <span class="opacity-40 italic">(Optional)</span></label>
                    <input id="lead-phone" v-model="leadForm.phone" type="tel" placeholder="+254 700 000 000" class="input-glass w-full px-5 py-3.5 text-sm font-bold" />
                  </div>

                  <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Contextual Message</label>
                    <textarea id="lead-message" v-model="leadForm.message" placeholder="Describe your requirements or questions about this space..." rows="4" class="input-glass w-full px-5 py-4 text-sm font-bold resize-none"></textarea>
                  </div>

                  <p v-if="leadError" class="text-xs font-black text-rose-500 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20" role="alert">{{ leadError }}</p>

                  <button type="submit" class="btn btn-primary w-full !py-4 !rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl relative group overflow-hidden" :disabled="leadPending">
                    <div v-if="leadPending" class="absolute inset-0 bg-main flex items-center justify-center">
                       <div class="w-5 h-5 border-3 border-bg/30 border-t-bg rounded-full animate-spin"></div>
                    </div>
                    Initiate Connection
                  </button>
                </form>
              </div>

              <footer class="px-10 py-6 bg-surface-alt/30 border-t border-border flex items-center justify-center">
                 <p class="text-[9px] font-black uppercase tracking-[0.2em] text-dim/40 italic flex items-center gap-2">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Viewora Spatial Encryption Active
                 </p>
              </footer>
            </div>
          </div>
        </Transition>
      </template>
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
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const slug = route.params.slug as string

type PageState = 'loading' | 'ready' | 'empty' | 'error'
const state = ref<PageState>('loading')
const tour = ref<TourData | null>(null)
const errorMessage = ref('This tour is unavailable or has been removed.')

// Server-side fetch — data is embedded in the HTML payload, no client re-fetch on hydration
const { data: _tourPayload, error: _tourError } = await useAsyncData(
  `tour:${slug}`,
  () => apiFetch<{ tour: TourData }>(`/p/${encodeURIComponent(slug)}`),
  { server: true, lazy: false }
)

if (_tourError.value) {
  const msg = (_tourError.value as any)?.data?.statusMessage ?? _tourError.value?.message ?? ''
  errorMessage.value = msg.includes('404') || msg.toLowerCase().includes('not found')
    ? "This tour doesn't exist or has been unpublished."
    : 'Something went wrong loading this tour.'
  state.value = 'error'
} else if (_tourPayload.value) {
  tour.value = _tourPayload.value.tour
  state.value = _tourPayload.value.tour.scenes.some(s => s.raw_image_url) ? 'ready' : 'empty'
}

// Gyro hint — dismissed on first touch
const showGyroHint = ref(false)

// Lead form
const leadOpen = ref(false)
const leadPending = ref(false)
const leadSent = ref(false)
const leadError = ref('')
const leadForm = ref({ name: '', email: '', phone: '', message: '' })

// ── Computed ───────────────────────────────────────────────────

const shareUrl = computed(() => {
  if (typeof window === 'undefined') return `${runtimeConfig.public.appUrl}/p/${slug}`
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
  ?? `${runtimeConfig.public.appUrl}/images/og-default.png`
)

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

const seoTitle = computed(() => {
  const name = tour.value?.space.title || 'Virtual Tour'
  return `Experience 360° Virtual Tour: ${name} | Viewora — Immersive Spatial Reality`
})

const seoDesc = computed(() => tour.value?.space.description || 'Step inside and explore this immersive 360° virtual tour. Experience every detail in high-resolution spatial reality on Viewora.')

// Build SEO tags early for SSR
useSeoMeta({
  title: seoTitle,
  description: seoDesc,
  keywords: computed(() => {
    const base = '360 virtual tour, VR experience, virtual reality, immersive tour, spatial reality, Viewora'
    return tour.value ? `${tour.value.space.title}, ${tour.value.space.space_type || 'property'}, ${base}` : base
  }),
  // OpenGraph / Facebook
  ogTitle: seoTitle,
  ogDescription: seoDesc,
  ogImage: computed(() => ogImage.value),
  ogImageSecureUrl: computed(() => ogImage.value),
  ogImageType: 'image/jpeg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogType: 'website',
  ogSiteName: 'Viewora',
  ogUrl: shareUrl,
  ogLocale: 'en_US',
  // Twitter
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDesc,
  twitterImage: computed(() => ogImage.value),
  twitterLabel1: 'Experience Type',
  twitterData1: '360° Virtual Reality',
  twitterLabel2: 'Platform',
  twitterData2: 'Viewora Spatial Engine'
})

useHead({
  title: seoTitle,
  link: [
    { rel: 'canonical', href: shareUrl.value },
    { rel: 'icon', type: 'image/png', href: '/favicon.png' }
  ],
  meta: [
    { name: 'theme-color', content: '#0a0a0a' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'pinterest', content: 'nopin', data_pin_description: seoDesc.value },
    { property: 'og:image:alt', content: computed(() => `360° Virtual Tour of ${tour.value?.space.title || 'Property'}`) }
  ],
  script: [
    {
      type: 'application/ld+json',
      children: computed(() => {
        if (!tour.value) return '{}'
        const s = tour.value.space
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'RealEstateListing',
          'name': s.title,
          'description': s.description || seoDesc.value,
          'url': shareUrl.value,
          'image': ogImage.value,
          'datePosted': s.created_at,
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': (s as any).location_text || 'Available on request',
          },
          'subjectOf': {
            '@type': 'Place',
            'name': s.title,
            'photo': ogImage.value,
            'hasDriveThroughService': false,
            'publicAccess': true,
            'additionalType': 'http://www.productontology.org/id/Virtual_tour'
          }
        })
      })
    }
  ]
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
.sheet-premium-enter-active { transition: opacity 200ms ease; }
.sheet-premium-leave-active { transition: opacity 200ms ease-in; }
.sheet-premium-enter-from, .sheet-premium-leave-to { opacity: 0; }
.sheet-premium-enter-active .card-glass,
.sheet-premium-leave-active .card-glass { transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1); }
.sheet-premium-enter-from .card-glass,
.sheet-premium-leave-to .card-glass { transform: translateY(100%); }

.fade-smooth-enter-active, .fade-smooth-leave-active { transition: opacity 400ms ease; }
.fade-smooth-enter-from, .fade-smooth-leave-to { opacity: 0; }

/* ── Reduced motion ──────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .animate-pulse, .animate-spin { animation: none !important; }
  .sheet-premium-enter-active, .sheet-premium-leave-active { transition-duration: 0ms !important; }
}
</style>
