<template>
  <div class="psv-root">
    <div ref="containerEl" :class="['psv-canvas', { 'psv-canvas--ready': state === 'ready' }]" />

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
    <div v-if="isEditing && state === 'ready'" class="psv-edit-hint">
      Click to place hotspot
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import '@photo-sphere-viewer/compass-plugin/index.css'
import type { TourScene } from '~/domain/scene'
import type { Hotspot } from '~/domain/hotspot'
import {
  initViewer,
  loadScene,
  nudgeRender,
  syncHotspots,
  destroy,
  type PsvViewerHandle,
} from '~/shared/utils/viewerAdapters/psvAdapter'

const props = defineProps<{
  scene: TourScene | null
  hotspots?: Hotspot[]
  isEditing?: boolean
}>()

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number }): void
  (e: 'hotspot-click', id: string): void
}>()

type State = 'loading' | 'ready' | 'error' | 'empty'

const containerEl = ref<HTMLElement | null>(null)
const handle = ref<PsvViewerHandle | null>(null)
const state = ref<State>('loading')
const errorMessage = ref('Unable to load panorama')
let resizeObserver: ResizeObserver | null = null
let resizeRaf: number | null = null

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
    handle.value = await initViewer(
      containerEl.value,
      scene,
      () => {
        state.value = 'ready'
        emit('loaded')
        
        // Delay hotspot sync if intro animation is playing
        const delay = props.isEditing ? 0 : 2000
        setTimeout(() => {
          if (props.hotspots?.length) {
            syncHotspots(handle.value, props.hotspots)
            void nudgeRender(handle.value)
          }
        }, delay)
      },
      (err) => {
        state.value = 'error'
        errorMessage.value = err.message || 'Failed to load panorama'
        emit('error', err)
      },
      (payload) => {
        if (props.isEditing) emit('add-hotspot', payload)
      },
      (id) => emit('hotspot-click', id),
      props.isEditing ?? false,
    )
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
    try {
      await loadScene(handle.value, next)
      state.value = 'ready'
      syncHotspots(handle.value, props.hotspots ?? [])
      void nudgeRender(handle.value)
    } catch (err: any) {
      state.value = 'error'
      errorMessage.value = err?.message || 'Failed to switch scene'
    }
  }
)

// Hotspot sync whenever the list changes
watch(
  () => props.hotspots,
  (next) => {
    if (state.value !== 'ready') return
    syncHotspots(handle.value, next ?? [])
  },
  { deep: true }
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeRaf != null) {
    window.cancelAnimationFrame(resizeRaf)
    resizeRaf = null
  }
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
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(6px);
  transition: box-shadow 0.2s ease;
}

:global(.psv-hs-marker svg) {
  width: 18px;
  height: 18px;
  color: #fff;
  flex-shrink: 0;
}

/* ── Per-type colours ────────────────────────────── */
:global(.psv-hs-marker--info) {
  background: rgba(20, 184, 166, 0.88);
  box-shadow: 0 4px 18px rgba(20, 184, 166, 0.45), 0 2px 6px rgba(0, 0, 0, 0.35);
}

:global(.psv-hs-marker--url) {
  background: rgba(59, 130, 246, 0.88);
  box-shadow: 0 4px 18px rgba(59, 130, 246, 0.45), 0 2px 6px rgba(0, 0, 0, 0.35);
}

:global(.psv-hs-marker--scene_link) {
  background: rgba(99, 102, 241, 0.88);
  box-shadow: 0 4px 18px rgba(99, 102, 241, 0.45), 0 2px 6px rgba(0, 0, 0, 0.35);
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


</style>
