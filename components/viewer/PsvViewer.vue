<template>
  <div class="public-viewer" @click="onViewerClick">
    <!-- ── VirtualTour mode: full multi-scene tour ── -->
    <ClientOnly v-if="hasTourData">
      <div
        ref="vtContainerEl"
        class="vt-canvas"
        :class="{ 'vt-canvas--ready': vtReady, 'vt-canvas--focused': vtFocusing }"
      />

      <!-- VT error -->
      <div v-if="vtError" class="vt-overlay vt-overlay--error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="vt-overlay-icon">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <p class="vt-overlay-msg">{{ vtError }}</p>
      </div>

      <!-- VT loading -->
      <div v-if="!vtReady && !vtError" class="vt-overlay">
        <div class="vt-loading-ring" />
      </div>

      <template #fallback>
        <div class="vt-overlay"><div class="vt-loading-ring" /></div>
      </template>
    </ClientOnly>

    <!-- ── Single panorama mode: direct imageUrl prop ── -->
    <ViewerShell
      v-if="!hasTourData"
      :active-scene="singleScene"
      :hotspots="props.hotspots"
      :is-editing="false"
      @loaded="emit('loaded')"
      @error="emit('error', $event)"
      @hotspot-click="emit('hotspot-click', $event)"
    />

    <!-- ── Scene dock (both modes) ── -->
    <GlassDock
      v-if="sceneCount > 0"
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
import type { Hotspot } from '~/domain/hotspot'
import type { TourScene } from '~/domain/scene'
import { safeHotspots } from '~/shared/utils/guards'
import ViewerShell from '~/features/viewer/ViewerShell.vue'
import GlassDock from '~/components/ui/GlassDock.vue'
import {
  initVirtualTourViewer,
  vtGoToNode,
  vtToggleMarkerActive,
  openSettings,
  focusHotspot,
  destroy,
  type PsvViewerHandle,
} from '~/shared/utils/viewerAdapters/psvAdapter'

const props = defineProps<{
  tour?: any
  shareUrl?: string
  imageUrl?: string
  isEditing?: boolean
  hotspots?: Hotspot[]
}>()

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number }): void
  (e: 'hotspot-click', id: string): void
  (e: 'remove-hotspot', id: string): void
}>()

const { $posthog } = useNuxtApp()

// ── VirtualTour state ──────────────────────────────────────────────────────
const vtContainerEl = ref<HTMLElement | null>(null)
const vtHandle = ref<PsvViewerHandle | null>(null)
const vtReady = ref(false)
const vtError = ref('')
const vtFocusing = ref(false)
const vtTransitioning = ref(false)
const vtActiveNodeId = ref('')
let vtInitVersion = 0

// ── Determines which mode we're in ────────────────────────────────────────
const hasTourData = computed(() => (props.tour?.scenes?.length ?? 0) > 0)

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
  const hotspotKey = tourScenes.value
    .map((scene: any) => `${scene?.id ?? ''}:${Array.isArray(scene?.hotspots) ? scene.hotspots.length : 0}`)
    .join('|')
  const spaceKey = props.tour?.space?.id ?? props.tour?.space?.slug ?? ''

  return `${spaceKey}:${sceneKey}:${hotspotKey}`
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

// ── Map raw API scene → TourScene (for passing to initVirtualTourViewer) ──
function mapRawScene(s: any): TourScene {
  const settings360 = props.tour?.space?.property_360_settings?.[0]
  return {
    id: s.id,
    imageUrl: s.raw_image_url || s.thumbnail_url || '',
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
        onReady: () => {
          if (version !== vtInitVersion) return
          vtReady.value = true
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

// Close info card on background click
function onViewerClick() {
  if (!vtFocusing.value) return
  vtFocusing.value = false
  const all = buildAllHotspots()
  for (const hotspots of Object.values(all)) {
    for (const h of hotspots) vtToggleMarkerActive(vtHandle.value, h.id, false)
  }
}
</script>

<style scoped>
.public-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
}

/* ── VirtualTour canvas ─────────────────────────────────── */
.vt-canvas {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.9s ease, filter 0.5s ease;
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
</style>