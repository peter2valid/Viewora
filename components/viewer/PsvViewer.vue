<template>
  <div class="public-viewer">
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
      v-if="sceneCount > 1"
      :items="dockItems"
      :active-id="activeSceneId"
      glass-class="dock-glass"
      :bottom-px="20"
      :edge-inset-px="16"
      :max-strip-vw="80"
      :max-strip-px="860"
      :max-scale="1.6"
      :sigma-px="94"
      :lift-px="14"
      @select="handleDockSelect"
    />

    <!-- ── Vignette overlay when info card is open ── -->
    <div v-if="hasTourData" :class="['vt-vignette', { 'vt-vignette--active': vtFocusing }]" />

    <!-- ── Settings gear button (VT mode only) ── -->
    <button
      v-if="hasTourData && vtReady"
      class="vt-settings-btn"
      aria-label="Settings"
      @click="openSettings(vtHandle)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
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

// ── VirtualTour state ──────────────────────────────────────────────────────
const vtContainerEl = ref<HTMLElement | null>(null)
const vtHandle = ref<PsvViewerHandle | null>(null)
const vtReady = ref(false)
const vtError = ref('')
const vtFocusing = ref(false)
const vtActiveNodeId = ref('')
let vtInitVersion = 0

// ── Determines which mode we're in ────────────────────────────────────────
const hasTourData = computed(() => (props.tour?.scenes?.length ?? 0) > 0)

// ── Scene list from tour ───────────────────────────────────────────────────
const tourScenes = computed<any[]>(() => props.tour?.scenes ?? [])
const sceneCount = computed(() => tourScenes.value.length)

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
          vtError.value = err.message || 'Panorama load failed'
          emit('error', err)
        },
        onNodeChanged: (nodeId) => {
          if (version !== vtInitVersion) return
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
        onMarkerClick: (markerId, type) => {
          if (version !== vtInitVersion) return
          handleMarkerClick(handle, markerId, type)
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

async function handleMarkerClick(handle: PsvViewerHandle, markerId: string, type: string) {
  // Deactivate any previously active marker
  const all = buildAllHotspots()
  for (const hotspots of Object.values(all)) {
    for (const h of hotspots) {
      if (h.id !== markerId) vtToggleMarkerActive(handle, h.id, false)
    }
  }

  if (type === 'info') {
    vtFocusing.value = true
    vtToggleMarkerActive(handle, markerId, true)
    await focusHotspot(handle, markerId)
  } else if (type === 'url') {
    // Find the hotspot url across all scenes
    for (const hotspots of Object.values(all)) {
      const h = hotspots.find(x => x.id === markerId)
      if (h?.url) { window.open(h.url, '_blank', 'noopener,noreferrer'); break }
    }
  }

  emit('hotspot-click', markerId)
}

// ── GlassDock navigation ───────────────────────────────────────────────────
function handleDockSelect(sceneId: string) {
  if (vtHandle.value) {
    vtGoToNode(vtHandle.value, sceneId)
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
  () => props.tour?.id,
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
.vt-canvas--focused { filter: blur(3px) brightness(0.7); }

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
  background:
    radial-gradient(circle at 18% 16%, rgba(59, 130, 246, 0.18), transparent 38%),
    radial-gradient(circle at 86% 78%, rgba(148, 163, 184, 0.12), transparent 44%),
    rgba(8, 10, 16, 0.62);
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
  top: 16px;
  right: 16px;
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
</style>
