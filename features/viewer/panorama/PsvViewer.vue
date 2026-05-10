<template>
  <div class="psv-root">
    <div ref="containerEl" :class="['psv-canvas', { 'psv-canvas--ready': state === 'ready', 'psv-canvas--focused': isFocusing }]" />

    <!-- Error -->
    <div v-if="state === 'error'" class="psv-overlay psv-overlay--error">
      <div class="psv-overlay-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="psv-overlay-icon">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <div class="psv-overlay-copy">
          <p class="psv-overlay-title">Panorama couldn't load</p>
          <p class="psv-overlay-msg">{{ errorMessage }}</p>
        </div>
        <div class="psv-overlay-actions">
          <button class="psv-overlay-btn" @click="retryCurrentScene">Retry</button>
        </div>
      </div>
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
  toggleHotspotActive,
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
let loadAbortController: AbortController | null = null
let sceneLoadInProgress = false

// ── Hotspot action menu ────────────────────────────────────
const menu = reactive({ visible: false, locked: false, hotspotId: null as string | null, x: 0, y: 0 })
let menuRaf: number | null = null
let menuCloseTimer: ReturnType<typeof setTimeout> | null = null
let menuHovered = false
let hotspotSyncTimer: ReturnType<typeof setTimeout> | null = null
const isAdapterMismatchError = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  return /right adapter|Invalid panorama configuration|Invalid panorama url/i.test(message)
}

async function retryCurrentScene() {
  if (!props.scene?.imageUrl) return
  closeMenu()
  
  // Cancel any pending load
  if (loadAbortController) {
    loadAbortController.abort()
    loadAbortController = null
  }
  
  state.value = 'loading'
  try {
    destroy(handle.value)
  } catch { /* noop */ }
  handle.value = null
  await initWithScene(props.scene)
}

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
  if (!containerEl.value || !scene?.imageUrl) return
  
  // Prevent concurrent loads
  if (sceneLoadInProgress) return
  sceneLoadInProgress = true
  
  // Cancel any pending load
  if (loadAbortController) {
    loadAbortController.abort()
  }
  loadAbortController = new AbortController()
  const signal = loadAbortController.signal
  
  state.value = 'loading'
  try {
    // Set timeout for viewer init (15 seconds)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Viewer initialization timeout')), 15000)
    )
    
    const viewerOptions: InitViewerOptions = {
      isEditing: props.isEditing ?? false,
      onReady: () => {
        if (signal.aborted) return
        state.value = 'ready'
        emit('loaded')
        if (props.hotspots?.length) {
          syncHotspots(handle.value, props.hotspots)
          void nudgeRender(handle.value)
        }
      },
      onError: (err) => {
        if (signal.aborted) return
        try { destroy(handle.value) } catch { /* noop */ }
        handle.value = null
        state.value = 'error'
        const errMsg = err?.message || 'Failed to load panorama'
        errorMessage.value = errMsg.length > 80 ? errMsg.substring(0, 77) + '...' : errMsg
        emit('error', err)
      },
      onClick: (payload) => {
        if (signal.aborted) return
        // Clear active hotspots (public viewer)
        if (handle.value && !props.isEditing) {
          props.hotspots?.forEach(h => toggleHotspotActive(handle.value, h.id, false))
        }

        // Close editor menu but DON'T return — continue to allow adding the hotspot
        if (menu.locked) { closeMenu() }
        
        isFocusing.value = false
        
        if (props.isTracing) {
          emit('update-trace', payload)
        } else if (props.isEditing) {
          // In editor mode, we want to add a hotspot immediately on click
          emit('add-hotspot', payload)
        }
      },
      onMarkerClick: async (id) => {
        if (signal.aborted || !handle.value) return
        if (props.isEditing) {
          // Lock the radial menu on hotspot click in editor mode
          openMenu(id)
          menu.locked = true
        } else {
          const hs = props.hotspots?.find(h => h.id === id)
          
          // Clear others first
          props.hotspots?.forEach(h => {
             if (h.id !== id && handle.value) toggleHotspotActive(handle.value, h.id, false)
          })

          // For info hotspots, we trigger cinematic focus and show the custom card
          if (hs?.type === 'info' || hs?.type === 'url' || hs?.type === 'video' || hs?.type === 'youtube') {
            isFocusing.value = true
            if (handle.value) {
              toggleHotspotActive(handle.value, id, true)
              await focusHotspot(handle.value, id)
            }
          }
          emit('hotspot-click', id)
        }
      },
      onMarkerEnter: onMarkerEnterCb,
      onMarkerLeave: onMarkerLeaveCb,
    }
    
    const initPromise = initViewer(containerEl.value, scene, viewerOptions)
    handle.value = await Promise.race([initPromise, timeoutPromise])
    scheduleResize()
  } catch (err: any) {
    if (signal.aborted) {
      state.value = 'empty'
      return
    }
    state.value = 'error'
    const errMsg = err?.message || 'Viewer initialisation failed'
    errorMessage.value = errMsg.length > 80 ? errMsg.substring(0, 77) + '...' : errMsg
    emit('error', err instanceof Error ? err : new Error(String(err)))
  } finally {
    sceneLoadInProgress = false
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
    
    // Same image already loaded (e.g. local scene ID → real scene ID mapping after upload).
    // Keep the current panorama visible — only sync markers, no reload or camera reset.
    if (next.imageUrl === prev?.imageUrl) {
      if (props.hotspots?.length) {
        syncHotspots(handle.value, props.hotspots ?? [])
      }
      return
    }
    
    // Cancel any pending load and start new one
    if (loadAbortController) {
      loadAbortController.abort()
    }
    loadAbortController = new AbortController()
    const signal = loadAbortController.signal
    
    sceneLoadInProgress = true
    try {
      // Set timeout for scene load (20 seconds)
      const timeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Scene load timeout')), 20000)
      )
      
      const loadPromise = (async () => {
        await loadScene(handle.value, next, props.hotspots ?? [])
        if (!signal.aborted) {
          state.value = 'ready'
          // Second enforcement check after a short delay for safety
          setTimeout(() => {
            if (!signal.aborted && handle.value && props.hotspots) {
              syncHotspots(handle.value, props.hotspots, true)
            }
          }, 300)
          void nudgeRender(handle.value)
        }
      })()
      
      await Promise.race([loadPromise, timeoutPromise])
    } catch (err: any) {
      if (loadAbortController?.signal.aborted) {
        state.value = 'empty'
        return
      }
      state.value = 'error'
      const errMsg = err?.message || 'Failed to switch scene'
      errorMessage.value = errMsg.length > 80 ? errMsg.substring(0, 77) + '...' : errMsg
    } finally {
      sceneLoadInProgress = false
    }
  }
)

// Hotspot sync whenever the list changes — debounced to prevent flicker on fast keystrokes
watch(
  () => props.hotspots,
  (next) => {
    if (state.value !== 'ready' || !handle.value) return
    if (!next || !Array.isArray(next)) return
    
    if (hotspotSyncTimer) clearTimeout(hotspotSyncTimer)
    hotspotSyncTimer = setTimeout(() => {
      try {
        syncHotspots(handle.value, next ?? [])
      } catch (err) {
        console.error('Hotspot sync error:', err)
        // Continue without crashing
      }
    }, 150)
  },
  { deep: true }
)

// Tracing visualization
watch(
  [() => props.isTracing, () => props.tracePoints],
  ([isTracing, points]) => {
    if (!handle.value?.markers) return
    
    try {
      // Clear old trace markers if tracing is off or starting over
      if (!isTracing || !points?.length) {
        try { handle.value.markers.removeMarker('trace-poly') } catch { /* noop */ }
        for (let i = 0; i < 4; i++) {
          try { handle.value.markers.removeMarker(`trace-dot-${i}`) } catch { /* noop */ }
        }
        return
      }

      // Validate and draw points
      const safePoints = (Array.isArray(points) ? points : []).filter(p => 
        p && typeof p === 'object' && typeof p.yaw === 'number' && typeof p.pitch === 'number'
      )
      
      safePoints.forEach((p, i) => {
        try {
          addTracePoint(handle.value, `trace-dot-${i}`, p)
        } catch (err) {
          console.error(`Failed to add trace point ${i}:`, err)
        }
      })

      // Draw polygon if enough points
      if (safePoints.length >= 3) {
        try {
          updateTracePolygon(handle.value, safePoints)
        } catch (err) {
          console.error('Failed to update trace polygon:', err)
        }
      }
    } catch (err) {
      console.error('Tracing error:', err)
    }
  },
  { deep: true }
)

onUnmounted(() => {
  // Cancel any pending operations
  if (loadAbortController) {
    loadAbortController.abort()
    loadAbortController = null
  }
  
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeRaf != null) { window.cancelAnimationFrame(resizeRaf); resizeRaf = null }
  if (hotspotSyncTimer) { clearTimeout(hotspotSyncTimer); hotspotSyncTimer = null }
  if (menuCloseTimer) { clearTimeout(menuCloseTimer); menuCloseTimer = null }
  if (menuRaf != null) { cancelAnimationFrame(menuRaf); menuRaf = null }
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
  background: rgba(8, 10, 16, 0.55);
}

.psv-overlay-card {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 320px;
  padding: 18px 18px 16px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 26%, rgba(0,0,0,0.12) 100%),
    rgba(10, 12, 20, 0.42);
  border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(24px) saturate(1.08) brightness(1.02);
  -webkit-backdrop-filter: blur(24px) saturate(1.08) brightness(1.02);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.12),
    0 24px 60px rgba(0, 0, 0, 0.35);
}

.psv-overlay-icon {
  width: 28px;
  height: 28px;
  color: rgba(255, 255, 255, 0.25);
}

.psv-overlay-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.psv-overlay-title {
  font-size: 13px;
  font-weight: 800;
  color: rgba(255,255,255,0.92);
  letter-spacing: -0.01em;
}

.psv-overlay-msg {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.58);
  font-weight: 500;
}

.psv-overlay-actions {
  display: flex;
  gap: 8px;
}

.psv-overlay-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.9);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms ease, transform 120ms ease;
}

.psv-overlay-btn:hover {
  background: rgba(255,255,255,0.14);
  transform: translateY(-1px);
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
:global(.psv-marker) {
  overflow: visible !important; /* Prevent clipping of floating cards */
}

/* Safety net: Ensure the custom element tag is never 0x0px */
:global(viewora-hotspot) {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  position: relative !important;
}

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
  background: rgba(10, 12, 20, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  margin-left: 12px;
  margin-bottom: 220px; /* High enough to clear SceneDock and LeftToolbar on mobile */
  width: 80px !important;
  height: 80px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.psv-canvas :deep(.psv-compass svg) {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
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
