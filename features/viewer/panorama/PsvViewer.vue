<template>
  <div class="psv-root">
    <div ref="containerEl" :class="['psv-canvas', { 'psv-canvas--ready': state === 'ready', 'psv-canvas--focused': isFocusing }]" />

    <!-- Error -->
    <div v-if="state === 'error'" class="psv-overlay psv-overlay--error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="psv-overlay-icon">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <p class="psv-overlay-msg">{{ errorMessage }}</p>
    </div>

    <!-- Empty: no image URL provided -->
    <div v-if="state === 'empty'" class="psv-overlay">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="psv-overlay-icon">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.6 9h16.8M3.6 15h16.8M12 3a9 9 0 0 1 0 18M12 3a9 9 0 0 0 0 18" />
      </svg>
      <p class="psv-overlay-msg">No panorama loaded</p>
    </div>

    <!-- Edit mode cursor hint -->
    <div v-if="isEditing && state === 'ready' && !menu.visible" class="psv-edit-hint">
      Click to place hotspot
    </div>

    <!-- Cinematic Vignette -->
    <div :class="['psv-vignette', { 'psv-vignette--active': isFocusing }]" />

    <!-- Hotspot action menu (editor only) -->
    <div v-if="isEditing" class="psv-menu-layer" aria-hidden="true">
      <HotspotActionMenu
        :visible="menu.visible"
        :x="menu.x"
        :y="menu.y"
        @edit="onMenuEdit"
        @delete="onMenuDelete"
        @reposition="onMenuReposition"
        @menu-enter="onMenuEnter"
        @menu-leave="onMenuLeave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import '@photo-sphere-viewer/compass-plugin/index.css'
import type { TourScene } from '~/domain/scene'
import type { Hotspot } from '~/domain/hotspot'
import {
  initViewer,
  loadScene,
  nudgeRender,
  syncHotspots,
  destroy,
  addTracePoint,
  updateTracePolygon,
  getHotspotScreenPos,
  focusHotspot,
  type PsvViewerHandle,
  type InitViewerOptions,
} from '~/shared/utils/viewerAdapters/psvAdapter'
import HotspotActionMenu from '~/features/viewer/panorama/HotspotActionMenu.vue'

const props = defineProps<{
  scene: TourScene | null
  hotspots?: Hotspot[]
  isEditing?: boolean
  isTracing?: boolean
  tracePoints?: Array<{ yaw: number; pitch: number }>
}>()

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number; screenX: number; screenY: number }): void
  (e: 'hotspot-click', id: string): void
  (e: 'hotspot-edit', id: string): void
  (e: 'hotspot-delete', id: string): void
  (e: 'hotspot-reposition', id: string): void
  (e: 'update-trace', payload: { yaw: number; pitch: number }): void
}>()

type State = 'loading' | 'ready' | 'error' | 'empty'

const containerEl = ref<HTMLElement | null>(null)
const handle = ref<PsvViewerHandle | null>(null)
const state = ref<State>('loading')
const errorMessage = ref('Unable to load panorama')
const isFocusing = ref(false)
let resizeObserver: ResizeObserver | null = null
let resizeRaf: number | null = null

// ── Hotspot action menu ────────────────────────────────────
const menu = reactive({ visible: false, locked: false, hotspotId: null as string | null, x: 0, y: 0 })
let menuRaf: number | null = null
let menuCloseTimer: ReturnType<typeof setTimeout> | null = null
let menuHovered = false
let hotspotSyncTimer: ReturnType<typeof setTimeout> | null = null

function trackMenuPosition() {
  if (!menu.visible || !menu.hotspotId || !handle.value) return
  const hs = props.hotspots?.find(h => h.id === menu.hotspotId)
  if (hs) {
    const pos = getHotspotScreenPos(handle.value, hs.yaw, hs.pitch)
    if (pos) { menu.x = pos.x; menu.y = pos.y }
  }
  menuRaf = requestAnimationFrame(trackMenuPosition)
}

function openMenu(id: string) {
  const hs = props.hotspots?.find(h => h.id === id)
  if (!hs) return
  if (menuRaf !== null) { cancelAnimationFrame(menuRaf); menuRaf = null }
  const pos = getHotspotScreenPos(handle.value, hs.yaw, hs.pitch)
  menu.hotspotId = id
  menu.x = pos?.x ?? menu.x
  menu.y = pos?.y ?? menu.y
  menu.visible = true
  menuRaf = requestAnimationFrame(trackMenuPosition)
}

function closeMenu() {
  if (menuCloseTimer) { clearTimeout(menuCloseTimer); menuCloseTimer = null }
  if (menuRaf !== null) { cancelAnimationFrame(menuRaf); menuRaf = null }
  menu.visible = false
  menu.locked = false
  menu.hotspotId = null
  menuHovered = false
}

function onMarkerEnterCb(id: string) {
  if (!props.isEditing) return
  if (menuCloseTimer) { clearTimeout(menuCloseTimer); menuCloseTimer = null }
  if (menu.locked && menu.hotspotId !== id) return
  openMenu(id)
}

function onMarkerLeaveCb(id: string) {
  if (!props.isEditing || menu.locked) return
  if (menu.hotspotId !== id) return
  menuCloseTimer = setTimeout(() => {
    if (!menuHovered) closeMenu()
  }, 260)
}

function onMenuEnter() {
  menuHovered = true
  if (menuCloseTimer) { clearTimeout(menuCloseTimer); menuCloseTimer = null }
}

function onMenuLeave() {
  menuHovered = false
  if (!menu.locked) {
    menuCloseTimer = setTimeout(() => closeMenu(), 150)
  }
}

function onMenuEdit() {
  const id = menu.hotspotId
  closeMenu()
  if (id) emit('hotspot-edit', id)
}

function onMenuDelete() {
  const id = menu.hotspotId
  closeMenu()
  if (id) emit('hotspot-delete', id)
}

function onMenuReposition() {
  const id = menu.hotspotId
  closeMenu()
  if (id) emit('hotspot-reposition', id)
}

function resizeViewer() {
  handle.value?.viewer?.resize?.()
}

function scheduleResize() {
  if (resizeRaf != null) return
  resizeRaf = window.requestAnimationFrame(() => {
    resizeRaf = null
    resizeViewer()
  })
}

async function initWithScene(scene: TourScene) {
  if (!containerEl.value) return
  state.value = 'loading'
  try {
    const viewerOptions: InitViewerOptions = {
      isEditing: props.isEditing ?? false,
      onReady: () => {
        state.value = 'ready'
        emit('loaded')
        if (props.hotspots?.length) {
          syncHotspots(handle.value, props.hotspots)
          void nudgeRender(handle.value)
        }
      },
      onError: (err) => {
        state.value = 'error'
        errorMessage.value = err.message || 'Failed to load panorama'
        emit('error', err)
      },
      onClick: (payload) => {
        // Canvas click: close locked menu, then handle add/trace
        if (menu.locked) { closeMenu(); return }
        
        // Clear active hotspots when clicking background
        if (handle.value) {
          props.hotspots?.forEach(h => toggleHotspotActive(handle.value, h.id, false))
        }

        isFocusing.value = false
        if (props.isTracing) {
          emit('update-trace', payload)
        } else if (props.isEditing) {
          emit('add-hotspot', payload)
        }
      },
      onMarkerClick: async (id) => {
        if (props.isEditing) {
          // Lock the radial menu on hotspot click in editor mode
          openMenu(id)
          menu.locked = true
        } else {
          const hs = props.hotspots?.find(h => h.id === id)
          
          // Clear others first
          props.hotspots?.forEach(h => {
             if (h.id !== id) toggleHotspotActive(handle.value, h.id, false)
          })

          // For info hotspots, we trigger cinematic focus and show the custom card
          if (hs?.type === 'info' || hs?.type === 'url' || hs?.type === 'video' || hs?.type === 'youtube') {
            isFocusing.value = true
            toggleHotspotActive(handle.value, id, true)
            await focusHotspot(handle.value, id)
          }
          emit('hotspot-click', id)
        }
      },
      onMarkerEnter: onMarkerEnterCb,
      onMarkerLeave: onMarkerLeaveCb,
    }
    handle.value = await initViewer(containerEl.value, scene, viewerOptions)
    scheduleResize()
  } catch (err: any) {
    state.value = 'error'
    errorMessage.value = err?.message || 'Viewer initialisation failed'
    emit('error', err instanceof Error ? err : new Error(String(err)))
  }
}

onMounted(async () => {
  if (containerEl.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      scheduleResize()
    })
    resizeObserver.observe(containerEl.value)
  }

  if (!props.scene?.imageUrl) {
    state.value = 'empty'
    return
  }

  await initWithScene(props.scene)
})

    // Scene change → keep current panorama visible and switch smoothly.
    // PSV can load the next panorama without showing a blocking loader.
watch(
  () => props.scene,
  async (next, prev) => {
    if (!next?.imageUrl) {
      state.value = 'empty'
      return
    }
    if (!handle.value) {
      await initWithScene(next)
      return
    }
    if (next.id === prev?.id) return
    closeMenu()
    isFocusing.value = false
    try {
      await loadScene(handle.value, next, props.hotspots ?? [])
      state.value = 'ready'
      // Second enforcement check after a short delay for safety
      setTimeout(() => {
        if (handle.value && props.hotspots) {
          syncHotspots(handle.value, props.hotspots, true)
        }
      }, 300)
      void nudgeRender(handle.value)
    } catch (err: any) {
      state.value = 'error'
      errorMessage.value = err?.message || 'Failed to switch scene'
    }
  }
)

// Hotspot sync whenever the list changes — debounced to prevent flicker on fast keystrokes
watch(
  () => props.hotspots,
  (next) => {
    if (state.value !== 'ready' || !handle.value) return
    if (hotspotSyncTimer) clearTimeout(hotspotSyncTimer)
    hotspotSyncTimer = setTimeout(() => {
      syncHotspots(handle.value, next ?? [])
    }, 150)
  },
  { deep: true }
)

// Tracing visualization
watch(
  [() => props.isTracing, () => props.tracePoints],
  ([isTracing, points]) => {
    if (!handle.value?.markers) return
    
    // Clear old trace markers if tracing is off or starting over
    if (!isTracing || points?.length === 0) {
      handle.value.markers.removeMarker('trace-poly')
      for (let i = 0; i < 4; i++) {
        try { handle.value.markers.removeMarker(`trace-dot-${i}`) } catch { /* noop */ }
      }
      return
    }

    // Draw points
    const safePoints = points ?? []
    safePoints.forEach((p, i) => {
      addTracePoint(handle.value, `trace-dot-${i}`, p)
    })

    // Draw polygon
    if (safePoints.length >= 3) {
      updateTracePolygon(handle.value, safePoints)
    }
  },
  { deep: true }
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeRaf != null) { window.cancelAnimationFrame(resizeRaf); resizeRaf = null }
  if (hotspotSyncTimer) { clearTimeout(hotspotSyncTimer); hotspotSyncTimer = null }
  closeMenu()
  destroy(handle.value)
  handle.value = null
})
</script>

<style scoped>
.psv-root {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
}

.psv-canvas {
  position: absolute;
  inset: 0;
  transition: filter 0.5s ease;
}

.psv-canvas--focused {
  filter: blur(3px) brightness(0.7);
}

.psv-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, transparent 40%, rgba(0, 0, 0, 0.6) 100%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
  z-index: 5;
}

.psv-vignette--active {
  opacity: 1;
}

.psv-menu-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
}

.psv-canvas :deep(.psv-container) {
  width: 100% !important;
  height: 100% !important;
}

.psv-canvas--ready {
  animation: psv-intro 0.9s ease forwards;
}

@keyframes psv-intro {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.psv-overlay {
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

.psv-overlay--error {
  background: rgba(10, 10, 10, 0.85);
}

.psv-overlay-icon {
  width: 28px;
  height: 28px;
  color: rgba(255, 255, 255, 0.25);
}

.psv-overlay-msg {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 500;
}

.psv-edit-hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
  pointer-events: none;
  backdrop-filter: blur(4px);
  letter-spacing: 0.03em;
  z-index: 20;
}

/* ── Hotspot marker base ─────────────────────────── */
:global(.psv-hs-marker) {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

:global(.psv-hs-icon-img) {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.45));
  transition: filter 0.18s ease, transform 0.18s ease;
}

:global(.psv-hs-marker:hover .psv-hs-icon-img) {
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.6));
}

/* ── 3D Spatial Containers ──────────────────────── */
:global(.psv-hs-spatial-container) {
  transition: transform 0.2s;
}

:global(.psv-hs-spatial-overlay) {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* Let container handle clicks */
  transition: all 0.3s ease;
}

:global(.psv-hs-spatial--editable) {
  cursor: pointer !important;
  border: 2px solid transparent;
}

:global(.psv-hs-spatial--editable:hover) {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(59, 130, 246, 0.1);
}

:global(.psv-hs-spatial-overlay--mapped) {
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
}


/* ── Pulse ring (scene_link only) ────────────────── */
:global(.psv-hs-pulse) {
  position: absolute;
  inset: -7px;
  border-radius: 50%;
  border: 2px solid rgba(99, 102, 241, 0.55);
  animation: psv-hs-pulse 2.2s ease-out infinite;
  pointer-events: none;
}

@keyframes psv-hs-pulse {
  0%   { transform: scale(1);    opacity: 0.7; }
  100% { transform: scale(1.65); opacity: 0;   }
}

/* ── PSV side-panel overrides (info content panel) ── */
.psv-canvas :deep(.psv-panel) {
  background: rgba(10, 12, 20, 0.82);
  backdrop-filter: blur(16px);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.psv-canvas :deep(.psv-panel-content) {
  padding: 24px 20px;
}

:global(.psv-hs-panel) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

:global(.psv-hs-panel-title) {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.3;
  margin: 0;
}

:global(.psv-hs-panel-desc) {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

/* ── PSV tooltip overrides ───────────────────────── */
.psv-canvas :deep(.psv-tooltip) {
  background: rgba(10, 12, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  animation: tooltip-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes tooltip-in {
  from { opacity: 0; transform: translateY(4px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.psv-canvas :deep(.psv-tooltip-arrow) {
  border-top-color: rgba(255, 255, 255, 0.12);
}

/* ── Compass overrides ───────────────────────────── */
.psv-canvas :deep(.psv-compass) {
  background: rgba(10, 12, 20, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  margin-left: 12px;
  margin-bottom: 220px; /* High enough to clear SceneDock and LeftToolbar on mobile */
  width: 80px !important;
  height: 80px !important;
}

@media (min-width: 640px) {
  .psv-canvas :deep(.psv-compass) {
    margin-left: 20px;
    margin-bottom: 20px; /* Bottom left corner for desktop */
    width: 120px !important;
    height: 120px !important;
  }
}


/* ── Tracing styles ──────────────────────────────── */
:global(.psv-hs-trace-dot) {
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
}
</style>
