<template>
  <div class="tour-page">
    <div v-if="pending" class="tour-page-loading" aria-label="Loading tour">
      <NuxtImg
        v-if="blurCover"
        :src="blurCover"
        class="tour-page-loading-bg object-cover"
        width="400"
        height="200"
        format="webp"
        quality="30"
        loading="eager"
        aria-hidden="true"
      />
      <div class="tour-page-loading-scrim" aria-hidden="true" />
      <div class="tour-page-loading-center">
        <div class="loading-logo-container">
          <NuxtImg src="/globe-icon.png" width="76" height="76" class="loading-logo" alt="" />
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
      <LazyViewerPsvViewer
        :tour="tour"
        :share-url="shareUrl"
        @chrome-toggle="viewerChromeHidden = $event"
      />

      <!-- Free/Standard tier: Viewora branding -->
      <a
        v-if="!hasBrandingDetails && !viewerChromeHidden"
        :href="watermarkUrl"
        @click="trackWatermarkClick"
        target="_blank"
        rel="noopener"
        class="viewora-free-brand"
        aria-label="Viewora Virtual Tours - Visit our website"
        title="Viewora Virtual Tours"
      >
        <NuxtImg
          src="/globe-icon.png"
          width="76"
          height="76"
          class="viewora-free-brand__logo"
          alt="Viewora Virtual Tour Software Logo"
        />
        <span class="viewora-free-brand__name">Viewora Virtual Tours</span>
      </a>

      <!-- Premium tier: User's custom branding -->
      <div v-else-if="!viewerChromeHidden" class="brand-card" aria-label="Tour branding">
        <NuxtImg
          v-if="tour.space?.logo_url"
          :src="tour.space.logo_url"
          width="140"
          height="52"
          fit="contain"
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
// PsvViewer is auto-imported as LazyPsvViewer by Nuxt when used in template

const { public: { appUrl, marketingUrl, gaMeasurementId } } = useRuntimeConfig()
const { apiFetch } = useApiFetch()
const { $posthog } = useNuxtApp()
const route = useRoute()

const watermarkUrl = computed(() => {
  const base = marketingUrl || 'https://viewora.software'
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base
  return `${cleanBase}/?utm_source=viewer&utm_medium=watermark&utm_campaign=platform_branding`
})

function trackWatermarkClick() {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'click', {
      event_category: 'outbound',
      event_label: watermarkUrl.value,
      transport_type: 'beacon'
    })
  }
}
const requestURL = useRequestURL()
const slug = route.params.slug as string

const pending = ref(true)
const fetchError = ref('')
const state = ref<'loading' | 'ready' | 'empty' | 'error'>('loading')
const space = ref<any>(null)
const tour = ref<any>(null)
const viewerChromeHidden = ref(false)

const shareUrl = computed(() => {
  const identifier = space.value?.slug || space.value?.id || slug
  return `${requestURL.origin}/p/${identifier}`
})

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
  // phone is now used for the WhatsApp contact button, not branding display —
  // only replace the Viewora watermark when there is real visual branding
  return !!(
    spaceData.logo_url ||
    spaceData.description ||
    spaceData.location_text ||
    spaceData.email
  )
})

const { data: tourPayload, error: tourError } = await useAsyncData(
  `public-tour:${slug}`,
  () => apiFetch<any>(`/p/${encodeURIComponent(slug)}`),
  { server: true, lazy: false, getCachedData: (key, nuxtApp) => nuxtApp.isHydrating ? nuxtApp.payload.data[key] : undefined },
)

if (tourError.value) {
  const status = (tourError.value as any)?.response?.status ?? (tourError.value as any)?.status ?? 500
  if (status === 404) {
    // Tour not found — throw a proper 404 so Nuxt returns the correct HTTP status.
    // A "soft 404" (200 with error content) confuses Google and wastes crawl budget.
    throw createError({ statusCode: 404, statusMessage: 'Tour not found', fatal: true })
  }
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
}

pending.value = false

let tourStartTime = 0

onMounted(() => {
  tourStartTime = Date.now()
  if (space.value?.id) {
    fireViewEvent(space.value.id)
  }
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

// ── SEO computed values ───────────────────────────────────────────────────
const seoCanonical = computed(() => {
  const base = (appUrl || 'https://app.viewora.software').replace(/\/$/, '')
  return `${base}/p/${slug}`
})

const seoTitle = computed(() => {
  const title = tour.value?.space?.title
  return title ? `${title} — Virtual Tour` : 'Virtual Tour — Viewora'
})

const seoDescription = computed(() => {
  const raw = tour.value?.space?.description
  const name = tour.value?.space?.title
  const loc  = tour.value?.space?.location_text
  const sceneCount = tour.value?.scenes?.length ?? 0
  const roomLabel = sceneCount > 1 ? `${sceneCount} rooms` : 'immersive space'

  if (raw && raw.length >= 50) return raw.length > 160 ? raw.slice(0, 157) + '…' : raw
  if (name && loc) return `Explore ${name} in ${loc} — an interactive 360° virtual tour with ${roomLabel}. Powered by Viewora.`
  if (name)        return `Explore ${name} in an interactive 360° virtual tour with ${roomLabel}. Powered by Viewora.`
  return 'Experience an immersive 360° virtual tour. Walk through every room from anywhere in the world. Powered by Viewora.'
})

// Prefer the first scene thumbnail (2048×1024, known dimensions) so platforms
// always get a real panorama preview. Fall back to user-uploaded cover, then default.
// Image priority: scene thumbnail → raw panorama → cover → absolute fallback.
// raw_image_url is included because thumbnail processing may not have run yet.
// The fallback URL is hardcoded (not appUrl) so it never resolves to "undefined/..."
// when the env var is missing during SSR.
const OG_FALLBACK = 'https://app.viewora.software/images/og-default.png'
const seoImage = computed(() => {
  // raw_image_url is intentionally excluded: original panoramas can be 10–50MB
  // and WhatsApp/social crawlers time out fetching images that large, showing
  // a blank preview. Only use the processed 2048×1024 thumbnail or cover image.
  const url =
    tour.value?.scenes?.[0]?.thumbnail_url
    || space.value?.cover_image_url
    || OG_FALLBACK
  // Guard: must be an absolute HTTPS URL or WhatsApp silently drops it
  if (!url || !url.startsWith('http')) return OG_FALLBACK
  return url
})

// Report exact dimensions only when using the known 2048×1024 thumbnail.
// Omit for raw_image_url / cover (unknown dims) — platforms handle missing dims better
// than wrong dims.
const seoImageWidth  = computed(() => tour.value?.scenes?.[0]?.thumbnail_url ? '2048' : undefined)
const seoImageHeight = computed(() => tour.value?.scenes?.[0]?.thumbnail_url ? '1024' : undefined)
const seoImageAlt    = computed(() => `360° virtual tour of ${tour.value?.space?.title || 'this property'}`)

const seoKeywords = computed(() => {
  const base = ['virtual tour', '360 tour', 'immersive tour', 'property tour', 'Viewora']
  const name = tour.value?.space?.title
  const loc  = tour.value?.space?.location_text
  if (name) base.unshift(name)
  if (loc)  base.splice(name ? 1 : 0, 0, loc)
  return base.join(', ')
})

useSeoMeta({
  // Core
  title:       seoTitle,
  description: seoDescription,
  keywords:    seoKeywords,
  robots:      'index, follow',
  author:      'Viewora',
  themeColor:  '#0a0a0a',

  // Open Graph — read by WhatsApp, Facebook, LinkedIn, Telegram, iMessage, Slack…
  ogType:            'website',
  ogSiteName:        'Viewora',
  ogLocale:          'en_US',
  ogUrl:             seoCanonical,
  ogTitle:           seoTitle,
  ogDescription:     seoDescription,
  ogImage:           seoImage,
  ogImageSecureUrl:  seoImage,
  // ogImageType intentionally omitted — thumbnail may be JPEG or WebP; wrong type
  // causes WhatsApp to skip the image even if the URL is valid.
  ogImageWidth:      seoImageWidth,
  ogImageHeight:     seoImageHeight,
  ogImageAlt:        seoImageAlt,

  // Twitter / X — summary_large_image shows the panorama thumbnail full-width
  twitterCard:        'summary_large_image',
  twitterSite:        '@vieworasoftware',
  twitterTitle:       seoTitle,
  twitterDescription: seoDescription,
  twitterImage:       seoImage,
  twitterImageAlt:    seoImageAlt,
})

useHead(computed(() => {
  const spaceData = tour.value?.space
  const scripts: any[] = []

  // GA4
  if (gaMeasurementId) {
    scripts.push(
      { src: `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`, async: true },
      {
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaMeasurementId}',{page_path:window.location.pathname});`,
      }
    )
  }

  const marketingBase = (marketingUrl || 'https://viewora.software').replace(/\/$/, '')

  // Viewora Organization entity — included in every tour's JSON-LD so Google
  // clusters all tour pages under the Viewora brand in its knowledge graph.
  const vieworaOrg = {
    '@type':            'Organization',
    '@id':              `${marketingBase}/#organization`,
    name:               'Viewora',
    url:                marketingBase,
    logo: {
      '@type': 'ImageObject',
      url:     `${marketingBase}/logo.png`,
    },
    sameAs: [
      'https://twitter.com/vieworasoftware',
      'https://www.linkedin.com/company/viewora',
    ],
  }

  // JSON-LD structured data — Google uses this for rich results
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type':    'TouristAttraction',
    name:        spaceData?.title || 'Virtual Tour',
    description: seoDescription.value,
    url:         seoCanonical.value,
    image: {
      '@type':  'ImageObject',
      url:       seoImage.value,
      width:     seoImageWidth.value,
      height:    seoImageHeight.value,
    },
    // Links this tour page back to Viewora in Google's knowledge graph
    provider:   vieworaOrg,
    publisher:  vieworaOrg,
    isPartOf: {
      '@type': 'WebSite',
      '@id':   `${marketingBase}/#website`,
      name:    'Viewora',
      url:      marketingBase,
    },
    ...(spaceData?.location_text ? {
      address: { '@type': 'PostalAddress', streetAddress: spaceData.location_text },
    } : {}),
    ...(spaceData?.phone ? { telephone: spaceData.phone }    : {}),
    ...(spaceData?.email ? { email:     spaceData.email }    : {}),
    ...(spaceData?.logo_url ? {
      logo: { '@type': 'ImageObject', url: spaceData.logo_url },
    } : {}),
    potentialAction: {
      '@type':  'ViewAction',
      target:    seoCanonical.value,
      name:     'View Virtual Tour',
    },
  }

  return {
    link: [
      { rel: 'canonical', href: seoCanonical.value },
    ],
    script: [
      ...scripts,
      { type: 'application/ld+json', children: JSON.stringify(jsonLd) },
    ],
  }
}))
</script>

<style scoped>
.tour-page {
  /* position:fixed with all four edges = 0 is the ONLY correct way to fill
     the viewport on Android Chrome. Do NOT also set width/height — they
     conflict with the edge-based sizing and cause the black gap at the bottom
     on Redmi and other Android devices where dvh != (bottom - top). */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0a0a0a;
  overflow: hidden;
  font-family: 'Inter', -apple-system, sans-serif;
  overscroll-behavior: none;
  touch-action: none;
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
