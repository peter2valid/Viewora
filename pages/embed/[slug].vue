<template>
  <div class="embed-viewer" data-fullscreen-root>
    <div v-if="pending" class="embed-center">
      <div class="embed-loader"></div>
    </div>

    <div v-else-if="fetchError" class="embed-center">
      <p>{{ fetchError }}</p>
    </div>

    <template v-else-if="tour && space">
      <!-- A car: exterior spins, interior 360s and detail photos as one tour, same as /view/p. -->
      <CarTour
        v-if="isCarTour"
        class="embed-car"
        :tour="tour"
        embed
        :share-url="shareUrl"
        :title="hasBrandingDetails ? '' : (vehicleName(space) || space.title)"
        :top-offset="hasBrandingDetails ? 'var(--embed-car-top)' : '16px'"
      />

      <button
        v-if="isCarTour && canFullscreen"
        type="button"
        class="embed-fs"
        :aria-label="isFullscreen ? 'Exit full screen' : 'Full screen'"
        @click="toggleFullscreen"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path v-if="!isFullscreen" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>
          <path v-else d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>
        </svg>
      </button>

      <!-- PSV Viewer — Photo Sphere Viewer integration via ViewerPsvViewer -->
      <div v-else-if="tour.scenes?.length" class="relative h-full w-full">
        <ViewerPsvViewer
          :tour="tour"
          :share-url="shareUrl"
          :is-embed="true"
          @chrome-toggle="chromeHidden = $event"
        />
      </div>

      <!-- Gallery Fallback if no 360 scenes -->
      <div v-else class="embed-gallery">
        <NuxtImg 
          v-if="space.cover_image_url" 
          :src="space.cover_image_url" 
          class="embed-img" 
          width="800"
          height="450"
          format="webp"
          quality="80"
          loading="lazy"
        />
        <div class="embed-overlay">          <h1 class="embed-title">{{ space.title }}</h1>
          <a :href="`/p/${space.slug}`" target="_blank" class="embed-link">View Full Tour</a>
        </div>
      </div>

      <!-- Owner's brand card, same rules as the full tour page (pages/p/[slug].vue):
           logo / name / contact top-left whenever the owner set any branding. -->
      <div v-if="hasBrandingDetails && !chromeHidden" class="brand-card" aria-label="Tour branding">
        <NuxtImg
          v-if="space.logo_url"
          :src="space.logo_url"
          width="140"
          height="52"
          fit="contain"
          class="brand-card__logo"
          :alt="space.title"
        />
        <div class="brand-card__body">
          <p class="brand-card__name">{{ space.title }}</p>
          <p v-if="space.description" class="brand-card__desc">{{ space.description }}</p>
          <p v-if="space.location_text" class="brand-card__line">{{ space.location_text }}</p>
          <p v-if="space.phone" class="brand-card__line">{{ space.phone }}</p>
          <p v-if="space.email" class="brand-card__line">{{ space.email }}</p>
        </div>
      </div>

      <!-- Watermark -->
      <a v-if="!space.branding_enabled" :href="watermarkUrl" @click="trackWatermarkClick" target="_blank" rel="noopener" class="embed-watermark" title="Viewora Virtual Tour Software">
        Viewora
      </a>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useHead, useSeoMeta } from '#imports'
import CarTour from '~/features/viewer/car/CarTour.vue'
import { buildCarTourItems, vehicleName } from '~/shared/utils/carTour'

const { apiFetch } = useApiFetch()
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const slug = route.params.slug as string

// SSR fetch — data embedded in HTML payload, no client re-fetch on hydration
const { data: _payload, error: _error, pending } = await useAsyncData(
  `embed:${slug}`,
  () => apiFetch<any>(`/p/${encodeURIComponent(slug)}`),
  { server: true, lazy: false }
)

const fetchError = computed(() => {
  if (!_error.value) return ''
  return (_error.value as any)?.data?.statusMessage ?? 'Tour not found'
})

const tour = computed(() => _payload.value?.tour || _payload.value || null)
const chromeHidden = ref(false)
const space = computed(() => tour.value?.space ?? null)
// A car with anything to show (a spin, an interior 360 or a detail photo) embeds as the car tour.
const isCarTour = computed(() => space.value?.space_type === 'automotive' && buildCarTourItems(tour.value).length > 0)
// Same test as the full tour page: only real visual branding replaces the watermark.
const hasBrandingDetails = computed(() => {
  const sp = space.value
  return !!(sp && (sp.logo_url || sp.description || sp.location_text || sp.email))
})
// Same value on server and client (no window.location) so SSR hydration can't leave a relative link.
const shareUrl = computed(() => `${String(runtimeConfig.public.appUrl || 'https://app.viewora.software').replace(/\/+$/, '')}/p/${space.value?.slug || space.value?.id || slug}`)

// Car tours have no 360 viewer chrome of their own, so the embed carries the full-screen button.
const canFullscreen = ref(false)
const isFullscreen = ref(false)
function onFsChange() { isFullscreen.value = !!document.fullscreenElement }
onMounted(() => {
  canFullscreen.value = !!document.fullscreenEnabled
  document.addEventListener('fullscreenchange', onFsChange)
})
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFsChange))
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  else (document.querySelector('[data-fullscreen-root]') as HTMLElement | null)?.requestFullscreen?.().catch(() => {})
}

const watermarkUrl = computed(() => {
  const base = runtimeConfig.public.marketingUrl || 'https://viewora.software'
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base
  return `${cleanBase}/?utm_source=embed&utm_medium=watermark&utm_campaign=platform_branding`
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

// White-label tours carry no Viewora name in the title or description.
const whiteLabel = computed(() => !!space.value?.branding_enabled)
useSeoMeta({
  title: computed(() => {
    const t = space.value?.title
    if (whiteLabel.value) return t || 'Virtual Tour'
    return t ? `${t} — Viewora` : 'Virtual Tour — Viewora'
  }),
  description: computed(() => space.value?.description || (whiteLabel.value ? 'Explore this immersive virtual tour.' : 'Experience this immersive virtual tour on Viewora.')),
  robots: 'index, follow',
})

useHead(computed(() => {
  const scripts: any[] = []
  const gaId = runtimeConfig.public.gaMeasurementId
  if (gaId) {
    scripts.push(
      {
        src: `https://www.googletagmanager.com/gtag/js?id=${gaId}`,
        async: true,
      },
      {
        children: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
          });
        `,
      }
    )
  }

  return {
    link: [
      { rel: 'canonical', href: `${runtimeConfig.public.appUrl}/p/${slug}` },
      // Tiles and thumbnails come from here: open the connection before the first request needs it.
      { rel: 'preconnect', href: 'https://media.viewora.software', crossorigin: '' },
    ],
    script: scripts
  }
}))
</script>

<style scoped>
/* Black behind the tour so nothing flashes white while an embed resizes or goes full screen. */
:global(html), :global(body) { background: #000; }
.embed-viewer {
  width: 100%;
  width: 100svw;     /* small viewport width — excludes scrollbar */
  height: 100vh;     /* fallback for older browsers */
  height: 100dvh;    /* dynamic viewport height — adjusts as browser chrome shows/hides */
  background: #000;
  overflow: hidden;
  position: relative;
  font-family: sans-serif;
}

/* Car tour: on narrow embeds the brand card (top-left) would cover the Exterior/Interior/Details
   switch, so the tour's top controls move below it. The open photo strip stops short of the watermark. */
.embed-viewer { --embed-car-top: 16px; }
@media (max-width: 640px) { .embed-viewer { --embed-car-top: 104px; } }
.embed-car { position: absolute; inset: 0; --ct-ribbon-right: 84px; }
.embed-fs {
  position: absolute; z-index: 25; right: 16px; bottom: 40px;
  width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
  background: rgba(0,0,0,0.6); color: #fff; border: 1px solid rgba(255,255,255,0.18);
}
.embed-fs:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

.embed-center {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
}

.embed-loader {
  width: 30px;
  height: 30px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.embed-gallery {
  width: 100%;
  height: 100%;
  position: relative;
}

.embed-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.embed-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  padding: 2rem;
  text-align: center;
}

.embed-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }
.embed-link { background: #fff; color: #000; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 0.9rem; }

/* Brand card: same look as the full tour page, fitted to an iframe. */
.brand-card {
  position: absolute; top: 14px; left: 14px; z-index: 30;
  display: flex; flex-direction: column; gap: 6px;
  max-width: min(200px, 46%);
  pointer-events: none;
}
.brand-card__logo {
  width: auto; max-width: 140px; max-height: 52px;
  object-fit: contain; object-position: left center;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));
}
.brand-card__body { display: flex; flex-direction: column; gap: 2px; }
.brand-card__name {
  margin: 0; font-size: 14px; font-weight: 800; line-height: 1.2; letter-spacing: -0.01em;
  color: #fff; text-shadow: 0 1px 10px rgba(0,0,0,0.8);
}
.brand-card__desc {
  margin: 0; font-size: 10px; font-weight: 500; line-height: 1.45;
  color: rgba(255,255,255,0.6); text-shadow: 0 1px 6px rgba(0,0,0,0.7);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.brand-card__line {
  margin: 0; font-size: 11px; font-weight: 500; line-height: 1.4;
  color: rgba(255,255,255,0.78); text-shadow: 0 1px 6px rgba(0,0,0,0.7);
}
/* Narrow iframes (phones): logo + name only, so it never crowds the tour. */
@media (max-width: 480px) { .brand-card__desc, .brand-card__line { display: none; } }
@media (max-height: 360px) { .brand-card { top: 8px; left: 8px; } .brand-card__logo { max-height: 34px; } }

.embed-watermark {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  text-decoration: none;
  opacity: 0.7;
  z-index: 10;
}
.embed-watermark:hover { opacity: 1; }
</style>
