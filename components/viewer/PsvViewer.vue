<template>
  <div ref="viewerRootEl" class="public-viewer" :class="{ 'public-viewer--chrome-hidden': chromeHidden }" @click="onViewerClick">
    <!-- Floating viewer rail (CloudPano-style controls) -->
    <div class="viewer-rail" aria-label="Viewer controls">
      <button class="viewer-rail__btn" :class="{ 'viewer-rail__btn--active': autoRotateActive }" type="button" aria-label="Toggle auto rotate" :aria-pressed="autoRotateActive" data-tooltip="Auto Rotate" @click.stop="toggleAutoRotate">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 5v4" />
          <path d="M12 15v4" />
          <path d="M5 12h4" />
          <path d="M15 12h4" />
          <path d="M8 8l2.8 2.8" />
          <path d="M13.2 13.2 16 16" />
          <path d="M8 16l2.8-2.8" />
          <path d="M13.2 10.8 16 8" />
        </svg>
      </button>

      <button
        class="viewer-rail__btn viewer-rail__chrome-toggle"
        :class="{ 'viewer-rail__btn--active': chromeHidden }"
        type="button"
        aria-label="Toggle viewer chrome"
        :aria-pressed="chromeHidden"
        :data-tooltip="chromeHidden ? 'Show Controls' : 'Hide Controls'"
        @click.stop="toggleChrome"
      >
        <span class="chrome-switch" :class="{ 'chrome-switch--off': chromeHidden }">
          <span class="chrome-switch__thumb" />
        </span>
      </button>

      <button class="viewer-rail__btn" type="button" aria-label="Share tour" data-tooltip="Share" @click.stop="shareTour">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M16 8a3 3 0 1 0-2.83-4" />
          <path d="M8 12l8-4" />
          <path d="M8 12l8 4" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
        </svg>
      </button>

      <button class="viewer-rail__btn" type="button" aria-label="Fullscreen" data-tooltip="Fullscreen" @click.stop="toggleFullscreen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 3H3v5" />
          <path d="M16 3h5v5" />
          <path d="M21 16v5h-5" />
          <path d="M3 16v5h5" />
        </svg>
      </button>

      <button class="viewer-rail__btn" type="button" aria-label="VR mode" data-tooltip="VR Mode" @click.stop="toggleStereoView">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4.5 8.5h4a2.5 2.5 0 0 1 2.5 2.5v2a2.5 2.5 0 0 1-2.5 2.5h-4V8.5Z" />
          <path d="M19.5 8.5h-4a2.5 2.5 0 0 0-2.5 2.5v2a2.5 2.5 0 0 0 2.5 2.5h4V8.5Z" />
          <path d="M11 13h2" />
        </svg>
      </button>
    </div>

    <Transition name="share-modal">
      <div v-if="showShareModal" class="share-overlay" @click.self="showShareModal = false">
        <div class="share-modal" role="dialog" aria-modal="true" aria-label="Share your tour">
          <div class="share-modal__topbar">
            <h2 class="share-modal__title">Share</h2>
            <button class="share-modal__close" @click="showShareModal = false" aria-label="Close share dialog">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="share-modal__tabs" role="tablist" aria-label="Share options">
            <button
              v-for="tab in shareTabs"
              :key="tab.id"
              type="button"
              class="share-modal__tab"
              :class="{ 'share-modal__tab--active': activeShareTab === tab.id }"
              :aria-selected="activeShareTab === tab.id"
              role="tab"
              @click="activeShareTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="share-modal__body">
            <div v-if="activeShareTab === 'link'" class="share-modal__panel" role="tabpanel">
              <p class="share-modal__eyebrow">Link to share</p>
              <div class="share-modal__link-row">
                <span class="share-modal__link share-modal__link--scroll">{{ publicUrl }}</span>
                <button class="share-modal__copy" @click="copyPublicUrl">
                  <template v-if="urlCopied">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    Copied
                  </template>
                  <template v-else>
                    Copy link
                  </template>
                </button>
              </div>

              <div class="share-modal__share-row" aria-label="Share to apps">
                <a
                  :href="shareWhatsappHref"
                  target="_blank"
                  rel="noopener"
                  class="share-modal__share-item"
                >
                  <span class="share-modal__share-icon share-modal__share-icon--whatsapp" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.49 2 2 6.48 2 12c0 1.89.52 3.66 1.42 5.18L2 22l4.98-1.39A9.96 9.96 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm5.8 14.16c-.24.68-1.44 1.32-1.98 1.39-.52.07-1.2.1-1.95-.12-.46-.14-1.05-.33-1.81-.66-3.18-1.38-5.24-4.6-5.39-4.81-.14-.21-1.3-1.73-1.3-3.3s.79-2.34 1.07-2.66c.28-.32.61-.4.82-.4h.58c.19 0 .45-.07.7.53.24.6.82 2.07.89 2.22.07.15.12.33.02.54-.1.21-.15.34-.3.52-.15.18-.31.4-.45.53-.15.16-.3.33-.13.63.16.31.71 1.17 1.52 1.9 1.04.92 1.9 1.21 2.22 1.37.31.16.49.14.67-.08.18-.22.77-.9.98-1.2.2-.31.4-.26.67-.16.28.1 1.74.82 2.04.97.3.14.5.22.58.34.08.12.08.74-.17 1.42Z"/></svg>
                  </span>
                  <span class="share-modal__share-label">WhatsApp</span>
                </a>
                <a
                  :href="shareXHref"
                  target="_blank"
                  rel="noopener"
                  class="share-modal__share-item"
                >
                  <span class="share-modal__share-icon share-modal__share-icon--x" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.78 7.72L23.2 22h-6.4l-5-6.58L5.98 22H2.84l7.2-8.2L.8 2h6.55l4.53 5.98L18.9 2Zm-1.12 18h1.72L6.42 3.94H4.58L17.78 20Z"/></svg>
                  </span>
                  <span class="share-modal__share-label">X</span>
                </a>
                <a
                  :href="shareGmailHref"
                  class="share-modal__share-item"
                >
                  <span class="share-modal__share-icon share-modal__share-icon--gmail" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M4 6.5h16v11H4z" fill="currentColor" opacity="0.16"/><path d="M4 6.5 12 12 20 6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 7.2 12 12.1 19.2 7.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </span>
                  <span class="share-modal__share-label">Gmail</span>
                </a>
              </div>
            </div>

            <div v-else-if="activeShareTab === 'embed'" class="share-modal__panel" role="tabpanel">
              <p class="share-modal__eyebrow">Embed</p>
              <div class="share-modal__link-row share-modal__link-row--code">
                <code class="share-modal__link share-modal__link--code">{{ shareEmbedCode }}</code>
                <button class="share-modal__copy" @click="copyEmbedCode">
                  <template v-if="embedCopied">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    Copied
                  </template>
                  <template v-else>
                    Copy iframe
                  </template>
                </button>
              </div>
              <div class="share-modal__preview-card">
                <iframe
                  :src="embedUrl"
                  class="share-modal__preview-frame"
                  title="Tour embed preview"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
              </div>
            </div>

            <div v-else class="share-modal__panel share-modal__panel--qr" role="tabpanel">
              <p class="share-modal__eyebrow">QR code</p>
              <div class="share-modal__qr-card">
                <div class="share-modal__qr-wrap">
                  <img v-if="!qrLoading && qrDataUrl" :src="qrDataUrl" alt="QR code for the tour link" class="share-modal__qr-image" />
                  <div v-else class="share-modal__qr-placeholder">
                    <span class="share-modal__qr-loading" />
                  </div>
                </div>
                <p class="share-modal__qr-text">Scan to open the tour on any device.</p>
                <p class="share-modal__qr-url">{{ publicUrl }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── VirtualTour mode: full multi-scene tour ── -->
    <ClientOnly v-if="hasTourData">
      <div
        ref="vtContainerEl"
        class="vt-canvas"
        :class="{
          'vt-canvas--ready': vtReady,
          'vt-canvas--focused': vtFocusing,
          'hide-nav-arrows': !dockCollapsed
        }"
      />

      <!-- VT error -->
      <div v-if="vtError" class="vt-overlay vt-overlay--error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="vt-overlay-icon">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <p class="vt-overlay-msg">{{ vtError }}</p>
      </div>

      <template #fallback>
        <div class="vt-overlay-fallback" />
      </template>
    </ClientOnly>

    <!-- ── Single panorama mode: direct imageUrl prop ── -->
    <ViewerShell
      v-if="!hasTourData"
      ref="viewerShellRef"
      :active-scene="singleScene"
      :hotspots="props.hotspots"
      :is-editing="false"
      @loaded="emit('loaded')"
      @error="emit('error', $event)"
      @hotspot-click="emit('hotspot-click', $event)"
    />

    <!-- ── Scene dock (both modes) ── -->
    <GlassDock
      v-if="sceneCount > 0 && !chromeHidden"
      v-model:collapsed="dockCollapsed"
      :items="dockItems"
      :active-id="activeSceneId"
      glass-class="dock-glass-superdark"
      :sortable="false"
      :bottom-px="20"
      :edge-inset-px="16"
      :max-strip-vw="80"
      :max-strip-px="860"
      :max-scale="1.6"
      :sigma-px="94"
      :lift-px="14"
      @select="handleDockSelect"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import QRCode from 'qrcode'
import { useImage } from '#imports'
import type { Hotspot } from '~/domain/hotspot'
import type { TourScene } from '~/domain/scene'
import { safeHotspots } from '~/shared/utils/guards'
import ViewerShell from '~/features/viewer/ViewerShell.vue'
import GlassDock from '~/components/ui/GlassDock.vue'
import {
  initVirtualTourViewer,
  vtGoToNode,
  vtToggleMarkerActive,
  focusHotspot,
  destroy,
  detectViewerPerformanceMode,
  toggleStereo,
  type PsvViewerHandle,
} from '~/shared/utils/viewerAdapters/psvAdapter'

const props = defineProps<{
  tour?: any
  shareUrl?: string
  imageUrl?: string
  isEditing?: boolean
  hotspots?: Hotspot[]
}>()

const img = useImage()
const optimizedLoadingLogo = computed(() => img('/globe-icon.png', { width: 80, height: 80, format: 'webp' }))

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number }): void
  (e: 'hotspot-click', id: string): void
  (e: 'remove-hotspot', id: string): void
  (e: 'chrome-toggle', hidden: boolean): void
}>()

const { $posthog } = useNuxtApp()
const analytics = useAnalytics()

const viewerRootEl = ref<HTMLElement | null>(null)
const viewerShellRef = ref<InstanceType<typeof ViewerShell> | null>(null)

// ── VirtualTour state ──────────────────────────────────────────────────────
const vtContainerEl = ref<HTMLElement | null>(null)
const vtHandle = ref<PsvViewerHandle | null>(null)
const vtReady = ref(false)
const vtError = ref('')
const vtFocusing = ref(false)
const vtTransitioning = ref(false)
const vtActiveNodeId = ref('')
const dockCollapsed = ref(false)
const chromeHidden = ref(false)
const autoRotateActive = ref(false)
const viewerPerformanceMode = ref<'lite' | 'full'>('full')
let vtInitVersion = 0
const showShareModal = ref(false)
const activeShareTab = ref<'link' | 'embed' | 'qr'>('link')
const urlCopied = ref(false)
const embedCopied = ref(false)
const qrDataUrl = ref('')
const qrLoading = ref(false)
const shareTabs = [
  { id: 'link', label: 'Send a link' },
  { id: 'embed', label: 'Embed' },
  { id: 'qr', label: 'QR code' },
] as const

// ── Determines which mode we're in ────────────────────────────────────────
const hasTourData = computed(() => (props.tour?.scenes?.length ?? 0) > 0)
const isLiteMode = computed(() => viewerPerformanceMode.value === 'lite')

// ── Scene list from tour ───────────────────────────────────────────────────
const tourScenes = computed<any[]>(() => {
  const raw = props.tour?.scenes ?? []
  return raw.slice().sort((a: any, b: any) => {
    const orderDiff = Number(a.order_index || 0) - Number(b.order_index || 0)
    if (orderDiff !== 0) return orderDiff
    return String(a.id || '').localeCompare(String(b.id || ''))
  })
})
const sceneCount = computed(() => tourScenes.value.length)
const tourLoadKey = computed(() => {
  if (!hasTourData.value) return ''

  const sceneKey = tourScenes.value.map((scene: any) => scene?.id ?? '').filter(Boolean).join('|')
  const sceneImageKey = tourScenes.value.map((scene: any) => {
    if (!scene) return ''
    return isLiteMode.value
      ? (scene.thumbnail_url || scene.raw_image_url || scene.tile_manifest_url || '')
      : (scene.raw_image_url || scene.tile_manifest_url || scene.thumbnail_url || '')
  }).join('|')
  const hotspotKey = tourScenes.value
    .map((scene: any) => `${scene?.id ?? ''}:${Array.isArray(scene?.hotspots) ? scene.hotspots.length : 0}`)
    .join('|')
  const spaceKey = props.tour?.space?.id ?? props.tour?.space?.slug ?? ''

  return `${spaceKey}:${sceneKey}:${sceneImageKey}:${hotspotKey}:${viewerPerformanceMode.value}`
})

const activeSceneId = computed(() =>
  hasTourData.value
    ? (vtActiveNodeId.value || tourScenes.value[0]?.id || '')
    : ''
)

const dockItems = computed(() =>
  tourScenes.value.map((s: any, idx: number) => ({
    id: s.id,
    label: s.name || `Scene ${idx + 1}`,
    imageUrl: s.thumbnail_url || s.raw_image_url || null,
    ariaLabel: `Go to ${s.name || `Scene ${idx + 1}`}`,
    badge: (s.status && s.status !== 'ready' ? 'loading' : null) as 'loading' | 'failed' | null,
  }))
)

// ── Single-scene mode (no tour) ────────────────────────────────────────────
const singleScene = computed<TourScene | null>(() => {
  if (!props.imageUrl) return null
  return {
    id: 'direct',
    imageUrl: props.imageUrl,
    title: undefined,
    hotspots: props.hotspots ?? [],
    settings: { hfov_default: 90, pitch_default: 0, yaw_default: 0, auto_rotate_enabled: false },
  }
})

const publicUrl = computed(() => {
  if (props.shareUrl) return props.shareUrl
  return typeof window !== 'undefined' ? window.location.href : ''
})

const shareText = computed(() => `Check out this immersive virtual tour created with Viewora: ${publicUrl.value}`)
const shareWhatsappHref = computed(() => `https://wa.me/?text=${encodeURIComponent(shareText.value)}`)
const shareXHref = computed(() => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.value)}`)
const shareGmailHref = computed(() => `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('Viewora virtual tour')}&body=${encodeURIComponent(shareText.value)}`)
const embedUrl = computed(() => {
  if (!publicUrl.value) return ''
  try {
    const target = new URL(publicUrl.value, typeof window !== 'undefined' ? window.location.origin : 'https://viewora.software')
    const slug = target.pathname.split('/').filter(Boolean).pop() || ''
    return `${target.origin}/embed/${slug}`
  } catch {
    return publicUrl.value.replace('/p/', '/embed/')
  }
})
const shareEmbedCode = computed(() => {
  const title = props.tour?.space?.title || 'Viewora tour'
  const brandingEnabled = props.tour?.space?.branding_enabled || false
  const backlink = brandingEnabled
    ? ''
    : `\n<div style="text-align: center; margin-top: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #64748b;">\n  Created with <a href="https://viewora.software/?utm_source=embed&utm_medium=virtual_tour&utm_campaign=platform_branding" target="_blank" rel="noopener" style="color: #3b82f6; text-decoration: none; font-weight: 600;">Viewora Virtual Tour Software</a>\n</div>`
  return `<iframe src="${embedUrl.value}" width="100%" height="600" frameborder="0" allowfullscreen style="border-radius:8px; border:none;"></iframe>${backlink}`
})

function sceneImageUrl(scene: any): string {
  if (!scene) return ''
  return isLiteMode.value
    ? (scene.thumbnail_url || scene.raw_image_url || scene.tile_manifest_url || '')
    : (scene.raw_image_url || scene.tile_manifest_url || scene.thumbnail_url || '')
}

async function copyPublicUrl() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    urlCopied.value = true
    setTimeout(() => { urlCopied.value = false }, 2000)
    analytics.track('tour_shared', { method: 'link', space_id: props.tour?.space?.id })
  } catch {
    // no-op: user can copy manually
  }
}

async function copyEmbedCode() {
  try {
    await navigator.clipboard.writeText(shareEmbedCode.value)
    embedCopied.value = true
    setTimeout(() => { embedCopied.value = false }, 2000)
    analytics.track('tour_shared', { method: 'embed', space_id: props.tour?.space?.id })
  } catch {
    // no-op: user can copy manually
  }
}

// ── Map raw API scene → TourScene (for passing to initVirtualTourViewer) ──
function mapRawScene(s: any): TourScene {
  const settings360 = props.tour?.space?.property_360_settings?.[0]
  return {
    id: s.id,
    imageUrl: sceneImageUrl(s),
    tileManifestUrl: s.tile_manifest_url || undefined,
    tileCols: s.tile_cols ?? undefined,
    tileRows: s.tile_rows ?? undefined,
    tilesReady: s.tiles_ready ?? false,
    width: s.width ?? undefined,
    height: s.height ?? undefined,
    title: s.name,
    hotspots: [],
    settings: {
      hfov_default: settings360?.hfov_default ?? 90,
      pitch_default: s.initial_pitch ?? settings360?.pitch_default ?? 0,
      yaw_default: s.initial_yaw ?? settings360?.yaw_default ?? 0,
      auto_rotate_enabled: settings360?.auto_rotate_enabled ?? false,
    },
  }
}

// ── Build hotspots dict from all scenes in tour ────────────────────────────
function buildAllHotspots(): Record<string, Hotspot[]> {
  const result: Record<string, Hotspot[]> = {}
  for (const s of tourScenes.value) {
    if (Array.isArray(s.hotspots)) {
      result[s.id] = safeHotspots(s.hotspots)
    }
  }
  return result
}

// ── Initialize VirtualTour viewer ─────────────────────────────────────────
async function initVT() {
  if (!vtContainerEl.value || !hasTourData.value) return
  const version = ++vtInitVersion

  // Tear down previous instance
  if (vtHandle.value) {
    destroy(vtHandle.value)
    vtHandle.value = null
  }

  vtReady.value = false
  vtError.value = ''
  vtFocusing.value = false

  const mappedScenes = tourScenes.value.map(mapRawScene)
  const hotspotsByScene = buildAllHotspots()
  const startNodeId = tourScenes.value[0]?.id ?? ''
  const autoRotate = props.tour?.space?.property_360_settings?.[0]?.auto_rotate_enabled ?? false

  try {
    const handle = await initVirtualTourViewer(
      vtContainerEl.value,
      mappedScenes,
      hotspotsByScene,
      startNodeId,
      {
        autoRotate,
        performanceMode: viewerPerformanceMode.value,
        loadingImg: optimizedLoadingLogo.value,
        onReady: () => {
          if (version !== vtInitVersion) return
          vtReady.value = true
          autoRotateActive.value = props.tour?.space?.property_360_settings?.[0]?.auto_rotate_enabled ?? false
          vtActiveNodeId.value = startNodeId
          emit('loaded')
        },
        onError: (err) => {
          if (version !== vtInitVersion) return
          vtTransitioning.value = false
          vtError.value = err.message || 'Panorama load failed'
          emit('error', err)
        },
        onNodeChanged: (nodeId) => {
          if (version !== vtInitVersion) return
          vtTransitioning.value = false
          vtFocusing.value = false
          $posthog?.capture('scene_navigated', {
            from_scene: vtActiveNodeId.value,
            to_scene: nodeId,
            via: 'hotspot',
          })
          vtActiveNodeId.value = nodeId
          vtFocusing.value = false
          // Deactivate all info markers on scene change
          const prevScene = buildAllHotspots()
          for (const hotspots of Object.values(prevScene)) {
            for (const h of hotspots) {
              vtToggleMarkerActive(handle, h.id, false)
            }
          }
        },
        onMarkerClick: (markerId, type, url) => {
          if (version !== vtInitVersion) return
          $posthog?.capture('hotspot_interacted', { hotspot_type: type })
          handleMarkerClick(handle, markerId, type, url)
        },
      }
    )
    if (version !== vtInitVersion) { destroy(handle); return }
    vtHandle.value = handle
  } catch (err: any) {
    if (version !== vtInitVersion) return
    vtError.value = err?.message || 'Viewer initialisation failed'
    emit('error', err instanceof Error ? err : new Error(String(err)))
  }
}

function loadFullQuality() {
  viewerPerformanceMode.value = 'full'
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem('viewora-viewer-performance-mode', 'full')
    } catch { /* noop */ }
  }
  if (hasTourData.value) {
    setTimeout(() => initVT(), 0)
  }
}

async function handleMarkerClick(handle: PsvViewerHandle, markerId: string, type: string, url = '') {
  if (vtTransitioning.value) return

  // Deactivate any previously active info card first
  const all = buildAllHotspots()
  for (const hotspots of Object.values(all)) {
    for (const h of hotspots) {
      if (h.id !== markerId) vtToggleMarkerActive(handle, h.id, false)
    }
  }
  vtFocusing.value = false

  if (type === 'info') {
    // Show the floating info card and pan the viewer to it
    vtFocusing.value = true
    vtToggleMarkerActive(handle, markerId, true)
    await focusHotspot(handle, markerId)

  } else if (type === 'url') {
    // Open external link — url comes directly from the marker data attribute
    const target = url || (() => {
      for (const hotspots of Object.values(all)) {
        const h = hotspots.find(x => x.id === markerId)
        if (h?.url) return h.url
      }
      return ''
    })()
    if (target) window.open(target, '_blank', 'noopener,noreferrer')

  } else if (type === 'scene_link') {
    // Navigate to the target scene. We read targetSceneId from marker.data
    // (set in buildTourNodes) so we never need to scan the entire hotspot list.
    try {
      const marker = handle.markers?.getMarker(markerId)
      const targetSceneId = marker?.config?.data?.targetSceneId
        || (() => {
          for (const hotspots of Object.values(all)) {
            const h = hotspots.find(x => x.id === markerId)
            if (h?.targetSceneId) return h.targetSceneId
          }
          return null
        })()

      if (targetSceneId) {
        vtTransitioning.value = true
        const success = await vtGoToNode(handle, targetSceneId)
        if (!success) vtTransitioning.value = false
      }
    } catch {
      vtTransitioning.value = false
    }
  }

  emit('hotspot-click', markerId)
}

// ── GlassDock navigation ───────────────────────────────────────────────────
async function handleDockSelect(sceneId: string) {
  if (vtHandle.value && !vtTransitioning.value && vtActiveNodeId.value !== sceneId) {
    vtTransitioning.value = true
    $posthog?.capture('scene_navigated', {
      from_scene: vtActiveNodeId.value,
      to_scene: sceneId,
      via: 'dock',
    })
    try {
      const success = await vtGoToNode(vtHandle.value, sceneId)
      if (!success) vtTransitioning.value = false
    } catch {
      vtTransitioning.value = false
    }
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(() => {
  if (typeof window !== 'undefined') {
    try {
      const savedMode = window.sessionStorage.getItem('viewora-viewer-performance-mode')
      viewerPerformanceMode.value = savedMode === 'lite' || savedMode === 'full'
        ? savedMode
        : detectViewerPerformanceMode()
    } catch {
      viewerPerformanceMode.value = detectViewerPerformanceMode()
    }
  } else {
    viewerPerformanceMode.value = detectViewerPerformanceMode()
  }

  if (hasTourData.value) {
    // wait one tick for vtContainerEl to be rendered by ClientOnly
    setTimeout(() => initVT(), 0)
  }

  // Prefetch 2nd + 3rd scene thumbnails during idle time
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      const nextScenes = tourScenes.value.slice(1, 3)
      for (const s of nextScenes) {
        const url = s.thumbnail_url || s.raw_image_url
        if (url) { const img = new Image(); img.src = url }
      }
    }, { timeout: 3000 })
  }
})

onUnmounted(() => {
  vtInitVersion++
  if (vtHandle.value) { destroy(vtHandle.value); vtHandle.value = null }
})

// Re-init VT if the tour data changes (e.g. navigating to a different tour)
watch(
  () => tourLoadKey.value,
  (next, prev) => {
    if (next && next !== prev && hasTourData.value) {
      // wait for vtContainerEl after re-render
      setTimeout(() => initVT(), 0)
    }
  }
)

// Close info card on background click; restore chrome if hidden
function onViewerClick() {
  if (chromeHidden.value) {
    toggleChrome()
    return
  }
  if (!vtFocusing.value) return
  vtFocusing.value = false
  const all = buildAllHotspots()
  for (const hotspots of Object.values(all)) {
    for (const h of hotspots) vtToggleMarkerActive(vtHandle.value, h.id, false)
  }
}

function showActionMessage(message: string) {
  void message
}

function toggleChrome() {
  chromeHidden.value = !chromeHidden.value
  emit('chrome-toggle', chromeHidden.value)
}

function toggleAutoRotate() {
  autoRotateActive.value = !autoRotateActive.value

  if (hasTourData.value) {
    if (vtHandle.value) toggleAutorotate(vtHandle.value)
  } else {
    viewerShellRef.value?.toggleAutorotate?.()
  }
}

function shareTour() {
  showShareModal.value = true
}

async function toggleFullscreen() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    const target = viewerRootEl.value?.parentElement || viewerRootEl.value
    if (target?.requestFullscreen) {
      await target.requestFullscreen()
    }
  } catch {
    // silent by design
  }
}

function toggleStereoView() {
  if (hasTourData.value) {
    if (vtHandle.value) toggleStereo(vtHandle.value)
    return
  }

  viewerShellRef.value?.toggleStereo?.()
}

watch([showShareModal, publicUrl], async ([open, url]) => {
  activeShareTab.value = 'link'
  qrDataUrl.value = ''
  qrLoading.value = false
  if (!open || !url) return

  qrLoading.value = true
  try {
    qrDataUrl.value = await QRCode.toDataURL(url, {
      width: 192,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' },
    })
  } finally {
    qrLoading.value = false
  }
})

watch(
  () => hasTourData.value,
  () => {
    autoRotateActive.value = false
  },
)
</script>

<style scoped>
.public-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
  overscroll-behavior: none;
}

.viewer-rail {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 35;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: opacity 220ms ease, transform 220ms ease;
}

.public-viewer--chrome-hidden .viewer-rail {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) translateX(8px);
}

.viewer-rail__btn {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(10, 12, 20, 0.66);
  backdrop-filter: blur(14px) saturate(1.15);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
  color: rgba(255, 255, 255, 0.68);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 140ms ease, background 140ms ease, color 140ms ease, border-color 140ms ease;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

.viewer-rail__btn svg {
  width: 18px;
  height: 18px;
}

.viewer-rail__btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}

.viewer-rail__btn--active {
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.26);
}

.viewer-rail__btn:active {
  transform: scale(0.96);
}

/* Tooltip on hover — floats to the left of each button */
.viewer-rail__btn[data-tooltip]::before {
  content: attr(data-tooltip);
  position: absolute;
  right: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(4px);
  background: rgba(8, 10, 18, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.01em;
  white-space: nowrap;
  padding: 5px 10px;
  border-radius: 8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 140ms ease, transform 140ms ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.viewer-rail__btn[data-tooltip]:hover::before {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* Toggle switch (chrome hide/show button) */
.viewer-rail__chrome-toggle svg {
  display: none;
}

.chrome-switch {
  width: 28px;
  height: 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  padding: 2px;
  display: flex;
  align-items: center;
  transition: background 220ms ease;
  flex-shrink: 0;
}

.chrome-switch--off {
  background: rgba(255, 255, 255, 0.08);
}

.chrome-switch__thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: translateX(12px);
  flex-shrink: 0;
}

.chrome-switch--off .chrome-switch__thumb {
  transform: translateX(0);
}

.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(60, 64, 67, 0.32);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}

.share-modal {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 8px 24px rgba(60, 64, 67, 0.18);
  color: #202124;
  overflow: hidden;
}

.share-modal__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
}

.share-modal__title { font-size: 22px; font-weight: 400; color: #202124; line-height: 1.2; }

.share-modal__close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #5f6368;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms, color 120ms;
}

.share-modal__close:hover { background: rgba(60, 64, 67, 0.08); color: #202124; }

.share-modal__tabs {
  display: flex;
  gap: 8px;
  padding: 0 20px;
  border-bottom: 1px solid #e8eaed;
}

.share-modal__tab {
  position: relative;
  padding: 12px 4px 11px;
  border: none;
  background: transparent;
  color: #5f6368;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.share-modal__tab--active { color: #1a73e8; }

.share-modal__tab--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 999px;
  background: #1a73e8;
}

.share-modal__body { padding: 16px 20px 20px; }

.share-modal__panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.share-modal__eyebrow {
  font-size: 13px;
  font-weight: 500;
  color: #5f6368;
}

.share-modal__link-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  border: 1px solid #dadce0;
  border-radius: 10px;
  padding: 0 12px;
  background: #fff;
}

.share-modal__link-row--code {
  align-items: center;
  padding: 10px 12px;
}

.share-modal__link {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #3c4043;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  font-family: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}

.share-modal__link--scroll { scrollbar-width: thin; }

.share-modal__link--code {
  white-space: nowrap;
  word-break: normal;
}

.share-modal__copy {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #dadce0;
  background: #f8f9fa;
  color: #1a73e8;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms, color 120ms, border-color 120ms;
  flex-shrink: 0;
}

.share-modal__copy:hover { background: #eef3fd; border-color: #c6dafc; }

.share-modal__share-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding-top: 6px;
}

.share-modal__share-item {
  width: 76px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: #3c4043;
  text-decoration: none;
}

.share-modal__share-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-modal__share-icon svg { width: 22px; height: 22px; }
.share-modal__share-icon--whatsapp { color: #25d366; background: rgba(37, 211, 102, 0.12); }
.share-modal__share-icon--x { color: #111827; background: #f3f4f6; }
.share-modal__share-icon--gmail { color: #ea4335; background: rgba(234, 67, 53, 0.10); }
.share-modal__share-label { font-size: 12px; font-weight: 500; color: #3c4043; }

.share-modal__preview-card {
  border: 1px solid #dadce0;
  border-radius: 14px;
  overflow: hidden;
  background: #f8f9fa;
}

.share-modal__preview-frame {
  display: block;
  width: 100%;
  height: 300px;
  border: 0;
  background: #fff;
}

.share-modal__panel--qr { align-items: center; }

.share-modal__qr-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border: 1px solid #dadce0;
  border-radius: 16px;
  padding: 20px;
  background: #fff;
}

.share-modal__qr-wrap {
  width: 192px;
  height: 192px;
  border-radius: 14px;
  border: 1px solid #e8eaed;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.share-modal__qr-image {
  width: 176px;
  height: 176px;
}

.share-modal__qr-placeholder {
  width: 176px;
  height: 176px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-modal__qr-loading {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid #e8eaed;
  border-top-color: #1a73e8;
  animation: share-spin 0.8s linear infinite;
}

.share-modal__qr-text {
  font-size: 13px;
  color: #5f6368;
  text-align: center;
}

.share-modal__qr-url {
  font-size: 12px;
  color: #80868b;
  text-align: center;
  word-break: break-all;
}

@keyframes share-spin { to { transform: rotate(360deg); } }

.share-modal-enter-active, .share-modal-leave-active {
  transition: opacity 180ms ease;
}

.share-modal-enter-active .share-modal, .share-modal-leave-active .share-modal {
  transition: transform 180ms ease, opacity 180ms ease;
}

.share-modal-enter-from { opacity: 0; }
.share-modal-enter-from .share-modal { transform: scale(0.92) translateY(12px); }
.share-modal-leave-to { opacity: 0; }
.share-modal-leave-to .share-modal { transform: scale(0.95) translateY(6px); }

.viewer-quality-banner {
  position: absolute;
  left: 50%;
  top: 18px;
  transform: translateX(-50%);
  z-index: 36;
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(100vw - 24px, 680px);
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(7, 10, 16, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px) saturate(1.1);
  -webkit-backdrop-filter: blur(18px) saturate(1.1);
}

.viewer-quality-banner__copy {
  min-width: 0;
  flex: 1;
}

.viewer-quality-banner__title {
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 2px;
}

.viewer-quality-banner__msg {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.55);
}

.viewer-quality-banner__btn {
  flex-shrink: 0;
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.88);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
}

.viewer-quality-banner__btn:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.viewer-action-badge {
  position: absolute;
  right: 18px;
  top: calc(50% + 210px);
  z-index: 36;
  max-width: 220px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(8, 10, 16, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.84);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.public-viewer--chrome-hidden :deep(.dock-glass-superdark) {
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 640px) {
  .viewer-rail {
    right: 10px;
    top: auto;
    bottom: 130px;
    transform: none;
    gap: 8px;
  }

  .public-viewer--chrome-hidden .viewer-rail {
    transform: translateX(8px);
  }

  .viewer-rail__btn {
    width: 38px;
    height: 38px;
    border-radius: 12px;
  }

  .viewer-action-badge {
    right: 10px;
    top: auto;
    bottom: 42px;
    max-width: 180px;
  }

  .viewer-quality-banner {
    top: 10px;
    width: calc(100vw - 20px);
    padding: 10px 12px;
    gap: 10px;
    border-radius: 14px;
  }

  .viewer-quality-banner__title {
    font-size: 11px;
  }

  .viewer-quality-banner__msg {
    font-size: 10px;
  }

  .viewer-quality-banner__btn {
    height: 32px;
    padding: 0 10px;
    font-size: 10px;
  }
}

/* ── VirtualTour canvas ─────────────────────────────────── */
.vt-canvas {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.9s ease, filter 0.5s ease;
  touch-action: none;
  overscroll-behavior: none;
}
.vt-canvas--ready { opacity: 1; }
.vt-canvas--focused :deep(.psv-canvas-container) { filter: blur(3px) brightness(0.7); }

.vt-canvas :deep(.psv-container) {
  width: 100% !important;
  height: 100% !important;
}

/* ── Overlays ───────────────────────────────────────────── */
.vt-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  pointer-events: none;
  background: rgba(8, 10, 16, 0.85);
  backdrop-filter: blur(12px);
  z-index: 10;
}
.vt-overlay--error { background: rgba(10, 10, 10, 0.85); }

.vt-overlay-icon { width: 28px; height: 28px; color: rgba(255,255,255,0.25); }
.vt-overlay-msg  { font-size: 12px; color: rgba(255,255,255,0.3); font-weight: 500; }

.vt-loading-ring {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255,255,255,0.12);
  border-top-color: rgba(59, 130, 246, 0.7);
  border-radius: 50%;
  animation: vt-spin 0.8s linear infinite;
}
@keyframes vt-spin { to { transform: rotate(360deg); } }

/* ── Cinematic vignette ─────────────────────────────────── */
.vt-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, transparent 40%, rgba(0,0,0,0.6) 100%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
  z-index: 5;
}
.vt-vignette--active { opacity: 1; }

/* ── PSV/VirtualTour overrides ──────────────────────────── */
:global(.psv-virtual-tour-arrow) {
  /* Let viewora-hotspot control its own display */
  background: transparent !important;
  border: none !important;
}

.vt-canvas :deep(.psv-compass) {
  background: rgba(10, 12, 20, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  margin-left: 12px;
  margin-bottom: 220px;
  width: 80px !important;
  height: 80px !important;
}
@media (min-width: 640px) {
  .vt-canvas :deep(.psv-compass) {
    margin-left: 20px;
    margin-bottom: 20px;
    width: 120px !important;
    height: 120px !important;
  }
}

.vt-canvas :deep(.psv-tooltip) {
  background: rgba(10, 12, 20, 0.75);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

:global(.psv-marker) { overflow: visible !important; }
:global(viewora-hotspot) {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  position: relative !important;
}

/* ── Settings gear button ───────────────────────────────── */
.vt-settings-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 20;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(10, 12, 20, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms, color 150ms, transform 150ms;
}
.vt-settings-btn:hover {
  background: rgba(255, 255, 255, 0.10);
  color: #fff;
  transform: rotate(30deg);
}
.vt-settings-btn svg { width: 17px; height: 17px; }

/* ── PSV Settings panel overrides ───────────────────────── */
:global(.psv-settings) {
  background: rgba(10, 12, 20, 0.96) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 14px !important;
  backdrop-filter: blur(16px) !important;
  padding: 6px !important;
  min-width: 200px !important;
}
:global(.psv-settings-item) {
  border-radius: 8px !important;
  padding: 10px 14px !important;
  color: rgba(255, 255, 255, 0.75) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  transition: background 120ms !important;
}
:global(.psv-settings-item:hover) {
  background: rgba(255, 255, 255, 0.07) !important;
  color: #fff !important;
}
:global(.psv-settings-item--active .psv-settings-item-icon) {
  color: #3b82f6 !important;
}
:global(.dock-glass-superdark) {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(32px) saturate(180%) brightness(1.1) !important;
  -webkit-backdrop-filter: blur(32px) saturate(180%) brightness(1.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.20) !important;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(255, 255, 255, 0.05) !important;
}

/* ── Plain-DOM hotspot styles ───────────────────────────── */

/* ── NAV hotspot: indigo circle + pulse ring + label ──── */
:global(.vhs-nav) {
  position: relative;
  width: 52px;
  height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
  transition: transform 0.2s ease;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
}
:global(.vhs-nav:hover) { transform: scale(1.18); }

:global(.vhs-nav__pulse) {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 20px;
  margin: auto;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(99, 102, 241, 0.75);
  animation: vhs-nav-pulse 2s ease-out infinite;
  pointer-events: none;
}
@keyframes vhs-nav-pulse {
  0%   { transform: scale(1);   opacity: 0.8; }
  100% { transform: scale(1.9); opacity: 0;   }
}

:global(.vhs-nav__icon) {
  width: 48px;
  height: 48px;
  object-fit: contain;
  pointer-events: none;
}

:global(.vhs-nav__arrow) {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.65), inset 0 1px 0 rgba(255,255,255,0.25);
}
:global(.vhs-nav__arrow svg) { width: 22px; height: 22px; }

:global(.vhs-nav__label) {
  margin-top: 6px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.85);
  white-space: nowrap;
  text-shadow: 0 1px 6px rgba(0,0,0,0.95);
  background: rgba(0,0,0,0.55);
  padding: 2px 7px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── INFO hotspot: colored pin trigger + animated card ── */
:global(.vhs-info) {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
}

:global(.vhs-info__trigger) {
  position: relative;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
  z-index: 2;
}
:global(.vhs-info:hover .vhs-info__trigger) { transform: scale(1.25); }

:global(.vhs-info__pin-ring) {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 2px solid var(--vhs-color, #6366f1);
  opacity: 0.6;
  animation: vhs-info-ring 2.5s ease-out infinite;
  pointer-events: none;
}
@keyframes vhs-info-ring {
  0%   { transform: scale(1);   opacity: 0.65; }
  100% { transform: scale(2.1); opacity: 0;    }
}

:global(.vhs-info__trigger-icon) {
  width: 34px;
  height: 34px;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 2px 10px rgba(0,0,0,0.6));
  position: relative;
  z-index: 1;
}
:global(.vhs-info:hover .vhs-info__trigger-icon) { filter: drop-shadow(0 4px 14px rgba(0,0,0,0.7)) brightness(1.08); }

:global(.vhs-info__pin-dot) {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  box-shadow: 0 0 12px var(--vhs-color, #6366f1), 0 2px 6px rgba(0,0,0,0.5);
  border: 2.5px solid rgba(255,255,255,0.95);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
:global(.vhs-info--active .vhs-info__pin-dot) {
  box-shadow: 0 0 20px var(--vhs-color, #6366f1), 0 2px 8px rgba(0,0,0,0.6);
}

/* Card hidden by default — floats above the pin, slides in on .vhs-info--active */
:global(.vhs-info__card) {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  width: 220px;
  background: rgba(6, 8, 16, 0.97);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.11);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.07);
  color: #fff;
  font-family: -apple-system, 'Inter', sans-serif;
  /* Hidden state */
  opacity: 0;
  transform: translateX(-50%) translateY(8px) scale(0.93);
  pointer-events: none;
  transition: opacity 0.32s cubic-bezier(0.23,1,0.32,1), transform 0.32s cubic-bezier(0.23,1,0.32,1);
}
/* Active: card visible */
:global(.vhs-info--active .vhs-info__card) {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
  pointer-events: auto;
}

:global(.vhs-info__img) {
  width: 100%;
  height: 110px;
  background-size: cover;
  background-position: center;
  background-color: rgba(255,255,255,0.04);
}

:global(.vhs-info__body) { padding: 12px 14px 14px; }

:global(.vhs-info__header) {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
}

:global(.vhs-info__icon) {
  width: 14px; height: 14px;
  object-fit: contain;
  opacity: 0.9;
  flex-shrink: 0;
}

:global(.vhs-info__tag) {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

:global(.vhs-info__title) {
  margin: 0 0 5px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

:global(.vhs-info__desc) {
  margin: 0 0 8px;
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  line-height: 1.55;
}

:global(.vhs-info__link) {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  margin-top: 2px;
}
:global(.vhs-info__link:hover) { text-decoration: underline; }

/* Reset PSV marker defaults */
:global(.psv-marker) { overflow: visible !important; background: none !important; border: none !important; }

/* Hide arrows when dock is open */
:global(.hide-nav-arrows .psv-virtual-tour-arrow) {
  display: none !important;
}
</style>