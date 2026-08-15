<template>
  <div class="demo-page" :class="{ 'demo-page--ready': state === 'ready' }">
    <div v-if="pending" class="demo-page-center">
      <p class="demo-page-loading">Loading…</p>
    </div>

    <div v-else-if="state === 'error'" class="demo-page-center">
      <div class="state-card">
        <h1 class="state-card__title">Tour Unavailable</h1>
        <p class="state-card__body">{{ fetchError }}</p>
        <NuxtLink to="/" class="state-card__btn">Return Home</NuxtLink>
      </div>
    </div>

    <template v-else-if="state === 'ready' && tour">
      <div class="stickybar" :class="{ 'is-visible': stickyVisible }">
        <span class="stickybar__title">{{ tour.space.title }}</span>
        <a class="stickybar__cta" :href="whatsappUrl" target="_blank" rel="noopener">Chat on WhatsApp</a>
      </div>

      <ViewerGalleryHeroCarousel
        ref="heroEl"
        :title="tour.space.title"
        :hero-image="heroImage"
        :whatsapp-url="whatsappUrl"
        :room-count="rooms.length"
        @explore-rooms="scrollTo('walkthrough')"
        @explore-tour="scrollTo('stepinside')"
      />

      <main>
        <ViewerGalleryRoomWalkthrough :rooms="rooms" />
        <ViewerGalleryStepInsidePano
          :image-url="panoImage"
          :label="panoLabel"
          :tour-url="fullTourUrl"
        />
        <ViewerGalleryClosingCta :whatsapp-url="whatsappUrl" :phone-display="phoneDisplay" />
      </main>

      <footer class="demo-footer">
        <p class="demo-footer__mark">Viewora — seen before visited</p>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useAsyncData, useHead, useRoute, useSeoMeta, useRuntimeConfig } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

const { public: { appUrl } } = useRuntimeConfig()
const { apiFetch } = useApiFetch()
const route = useRoute()
const slug = (route.params.slug as string) || 'house'

const pending = ref(true)
const fetchError = ref('')
const state = ref<'loading' | 'ready' | 'error'>('loading')
const tour = ref<any>(null)

const { data: tourPayload, error: tourError } = await useAsyncData(
  `demo-tour:${slug}`,
  () => apiFetch<any>(`/p/${encodeURIComponent(slug)}`),
  { server: true, lazy: false },
)

if (tourError.value) {
  fetchError.value = 'This demo listing is unavailable right now.'
  state.value = 'error'
} else if (tourPayload.value) {
  tour.value = tourPayload.value?.tour ?? tourPayload.value
  state.value = 'ready'
}
pending.value = false

const rooms = computed(() => {
  const scenes = tour.value?.scenes ?? []
  return [...scenes]
    .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .filter((s: any) => s.thumbnail_url)
    .map((s: any) => ({ id: s.id, name: s.name || 'Room', thumbnail_url: s.thumbnail_url }))
})

const heroImage = computed(() => rooms.value[0]?.thumbnail_url || tour.value?.space?.cover_image_url || '')

// Prefer the second scene (often a living/sitting area) for the drag-pan preview; fall back to the first.
const panoScene = computed(() => rooms.value[1] || rooms.value[0])
const panoImage = computed(() => panoScene.value?.thumbnail_url || heroImage.value)
const panoLabel = computed(() => panoScene.value?.name || 'Tour Preview')

const phoneDigits = computed(() => (tour.value?.space?.phone || '').replace(/[^0-9]/g, ''))
const phoneDisplay = computed(() => {
  const p = phoneDigits.value
  if (!p) return ''
  return `+${p}`
})
const whatsappUrl = computed(() => {
  const title = tour.value?.space?.title || 'this property'
  const msg = `Hi! I found ${title} on Viewora and would love to know more. Is it still available?`
  return `https://wa.me/${phoneDigits.value}?text=${encodeURIComponent(msg)}`
})
const fullTourUrl = computed(() => {
  const identifier = tour.value?.space?.slug || slug
  return `${appUrl || 'https://app.viewora.software'}/p/${identifier}`
})

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// ── Sticky bar reveal after the hero leaves the viewport ──────────────────
const heroEl = ref<any>(null)
const stickyVisible = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  const el = heroEl.value?.$el as HTMLElement | undefined
  if (!el || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    ([entry]) => { stickyVisible.value = !entry.isIntersecting },
    { threshold: 0.15 },
  )
  observer.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())

// ── Fonts, scoped to this page only ────────────────────────────────────────
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,400&family=Work+Sans:wght@400..600&family=JetBrains+Mono:wght@500&display=swap',
    },
  ],
})

// ── SEO / social share preview ─────────────────────────────────────────────
const seoTitle = computed(() => tour.value ? `${tour.value.space.title} — Walk the House Before You Visit` : 'Viewora Walkthrough')
const seoDescription = 'Move through every room in 360°, then ask questions directly on WhatsApp — before you visit.'
const seoImage = computed(() => heroImage.value)

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogImage: seoImage,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: seoImage,
})
</script>

<style scoped>
.demo-page {
  --ground: #191510;
  --ground-raised: #231D15;
  --ink: #F1E7D5;
  --ink-soft: #AFA28A;
  --line: #372F23;
  --brass: #D9A554;
  --brass-strong: #EFC57C;
  --whatsapp: #25D366;
  --whatsapp-ink: #06210F;
  --shadow: rgba(0, 0, 0, 0.5);
  --scrim-top: rgba(10, 8, 5, 0.15);
  --scrim-bottom: rgba(6, 5, 3, 0.95);
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Work Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-body);
  min-height: 100vh;
}

.demo-page-center {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.demo-page-loading {
  color: var(--ink-soft);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.state-card {
  max-width: 360px;
  text-align: center;
  padding: 36px 28px;
}
.state-card__title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 12px;
}
.state-card__body {
  color: var(--ink-soft);
  margin: 0 0 20px;
}
.state-card__btn {
  display: inline-flex;
  padding: 10px 20px;
  border-radius: 10px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--ink);
  text-decoration: none;
}

.stickybar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: rgba(25, 21, 16, 0.88);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
  opacity: 0;
  transform: translateY(-100%);
  transition: opacity 240ms ease, transform 240ms ease;
  pointer-events: none;
}
.stickybar.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.stickybar__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.05rem;
}
.stickybar__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--whatsapp);
  color: var(--whatsapp-ink);
  border-radius: 999px;
  padding: 9px 18px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
}

.demo-footer {
  padding: 40px 24px 56px;
  text-align: center;
}
.demo-footer__mark {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

@media (prefers-reduced-motion: reduce) {
  .stickybar { transition: none; }
}
</style>
