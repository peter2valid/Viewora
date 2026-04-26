<template>
  <div class="psv-root">
    <div ref="containerEl" class="psv-canvas" />

    <!-- Loading -->
    <Transition name="fade">
      <div v-if="state === 'loading'" class="psv-overlay">
        <div class="psv-spinner" />
      </div>
    </Transition>

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

function resizeViewer() {
  handle.value?.viewer?.resize?.()
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
        if (props.hotspots?.length) {
          syncHotspots(handle.value, props.hotspots)
          void nudgeRender(handle.value)
        }
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
    )
    resizeViewer()
  } catch (err: any) {
    state.value = 'error'
    errorMessage.value = err?.message || 'Viewer initialisation failed'
    emit('error', err instanceof Error ? err : new Error(String(err)))
  }
}

onMounted(async () => {
  if (containerEl.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      resizeViewer()
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
    if (!next?.imageUrl) { state.value = 'empty'; return }
    if (!handle.value) {
      await initWithScene(next)
      return
    }
    if (next.id === prev?.id) return
    try {
      await loadScene(handle.value, next)
      state.value = 'ready'
      // Scene changed: re-sync hotspots for this scene (if any) and force a render.
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

.psv-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: none;
  background: rgba(10, 10, 10, 0.55);
  backdrop-filter: blur(10px);
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

.psv-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
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

/* Hotspot marker styles */
:global(.psv-hs) {
  width: 24px;
  height: 24px;
  cursor: pointer;
}

:global(.psv-hotspot-pin) {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(0, 0, 0, 0.4);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s ease;
}

:global(.psv-hs:hover .psv-hotspot-pin) {
  transform: scale(1.25);
}

:global(.psv-hs--info .psv-hotspot-pin) { background: #fff; }
:global(.psv-hs--url .psv-hotspot-pin) { background: #3B82F6; }
:global(.psv-hs--scene_link .psv-hotspot-pin) { background: #3B82F6; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
