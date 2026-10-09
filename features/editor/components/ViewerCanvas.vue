<template>
  <main
    class="absolute inset-0 z-0 overflow-hidden bg-bg"
    :class="[
      (isHotspotMode || isTracing) && hasScene ? 'cursor-crosshair' : '',
      hideNavArrows ? 'hide-nav-arrows' : ''
    ]"
    @dragenter.prevent="onDragenter"
    @dragover.prevent
    @dragleave="onDragleave"
    @drop.prevent="onDrop"
  >
    <!--
      Ownership boundary: ViewerCanvas controls visibility, overlays, and drag UI only.
      PSV lifecycle (init, destroy, navigation) lives exclusively in EditorCanvas.
      Never call PSV methods or import PSV types here.
    -->
    <!-- Panorama viewer — always mounted so PSV instance survives scene switches -->
    <EditorCanvas
      ref="editorCanvasRef"
      :visible="hasScene"
      :active-scene="activeScene"
      :space-type="spaceType"
      :hotspots="hotspots"
      :is-editing="isHotspotMode"
      :is-tracing="isTracing"
      :trace-points="tracePoints"
      :trace-closable="traceClosable"
      :trace-open="traceMode === 'road'"
      @loaded="$emit('loaded')"
      @error="$emit('error', $event)"
      @add-hotspot="$emit('add-hotspot', $event)"
      @hotspot-click="$emit('hotspot-click', $event)"
      @hotspot-edit="$emit('hotspot-edit', $event)"
      @hotspot-delete="$emit('hotspot-delete', $event)"
      @hotspot-reposition="$emit('hotspot-reposition', $event)"
      @hotspot-drag-drop="$emit('hotspot-drag-drop', $event)"
      @update-trace="$emit('update-trace', $event)"
      @close-trace="$emit('close-trace')"
    />

    <!-- Tracing Overlay: 4-corner video surface -->
    <Transition name="badge-confirm">
      <div
        v-if="isTracing && traceMode === 'surface'"
        class="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 w-[calc(100%-40px)] max-w-sm pointer-events-none"
      >
        <div class="px-4 py-3 rounded-2xl bg-blue-600/90 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
               <span class="text-xs font-black text-white">{{ tracePoints?.length || 0 }}/4</span>
            </div>
            <div>
              <p class="text-[11px] font-black uppercase tracking-widest text-white">Spatial Mapping</p>
              <p class="text-[10px] text-white/70">Click 4 corners in the room</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Tracing Overlay: land plot boundary -->
    <Transition name="badge-confirm">
      <div
        v-if="isTracing && traceMode !== 'surface'"
        class="plot-bar"
        role="toolbar"
        aria-label="Plot boundary drawing"
      >
        <div class="plot-bar__count" :class="{ 'plot-bar__count--ok': traceCanFinish }">
          {{ tracePoints?.length || 0 }}
        </div>
        <div class="plot-bar__copy">
          <p class="plot-bar__title">{{ traceTitle }}</p>
          <p class="plot-bar__hint">{{ traceHint }}</p>
        </div>
        <div class="plot-bar__actions">
          <button class="plot-bar__btn" :disabled="!tracePoints?.length" title="Undo last corner (Backspace)" @click="$emit('undo-trace')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
            <span>Undo</span>
          </button>
          <button class="plot-bar__btn" title="Cancel (Esc)" @click="$emit('cancel-trace')">
            <span>Cancel</span>
          </button>
          <button class="plot-bar__btn plot-bar__btn--primary" :disabled="!traceCanFinish" title="Finish (Enter)" @click="$emit('close-trace')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Finish</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Empty / upload state -->
    <Transition name="guide-fade">
      <div
        v-if="!hasScene"
        class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
      >
        <p
          v-if="!isDragging"
          class="text-[11px] font-medium text-gray-600 uppercase tracking-widest select-none pointer-events-none"
        >
          Start by adding your first 360° image
        </p>

        <!-- Drop zone card -->
        <div
          class="max-w-[300px] w-full p-6 rounded-2xl text-center transition-all duration-200"
          :class="isDragging
            ? 'border-2 border-dashed border-blue-500/60 bg-blue-500/[0.05] scale-[1.02]'
            : 'border border-dashed border-white/10 bg-white/[0.03]'"
        >
          <!-- Icon -->
          <div
            class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors duration-200"
            :class="isDragging ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/[0.04] border border-white/8'"
          >
            <svg
              v-if="!isDragging"
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
              class="text-gray-600" aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <svg
              v-else
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
              class="text-blue-400" aria-hidden="true"
            >
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
          </div>

          <template v-if="!isDragging">
            <p class="text-[13px] font-semibold text-gray-100 mb-2">Upload your first 360° image</p>
            <p class="text-[11px] text-gray-500 leading-relaxed mb-5">Choose an equirectangular panorama (2:1 ratio) to start building your interactive tour.</p>

            <button
              class="inline-flex items-center justify-center gap-2 h-8 px-4 rounded-lg text-[12px] font-semibold bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.03] active:scale-[0.96] transition-all duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 w-full mb-2"
              @click="$emit('request-upload')"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Choose File
            </button>

            <p class="text-[10px] text-gray-600 font-medium">
              Drop a 360° image or click to upload
            </p>

            <NuxtLink
              to="/app/capture"
              class="inline-flex items-center justify-center gap-2 h-8 px-4 rounded-lg text-[12px] font-semibold text-gray-400 border border-white/[0.08] hover:text-gray-100 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-[180ms] w-full mt-1"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Book a Shoot
            </NuxtLink>

            <!-- No 360 image ready yet? Move on rather than get stuck here —
                 Photos supports regular flat photos, and Details/Publish
                 work fine for a gallery-only listing with zero scenes. -->
            <div class="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-white/[0.06] w-full text-[11px] font-semibold">
              <NuxtLink :to="{ query: { tab: 'photos' } }" class="text-gray-400 hover:text-gray-100 transition-colors">Next: Add Photos →</NuxtLink>
              <span class="text-gray-700">·</span>
              <NuxtLink :to="{ query: { tab: 'details' } }" class="text-gray-500 hover:text-gray-200 transition-colors">Skip to Details</NuxtLink>
            </div>
          </template>

          <template v-else>
            <p class="text-[13px] font-semibold text-blue-300 mb-1">Drop to upload</p>
            <p class="text-[11px] text-blue-400/70">Release to upload your panorama</p>
          </template>
        </div>

        <!-- Drop error -->
        <Transition name="error-fade">
          <p
            v-if="dropError"
            class="text-[11px] text-red-400 font-medium select-none pointer-events-none"
            role="alert"
          >{{ dropError }}</p>
        </Transition>
      </div>
    </Transition>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { toast } from 'vue-sonner'
import EditorCanvas from '~/features/editor/EditorCanvas.vue'
import { useEditorStore } from '~/features/editor/store/useEditorStore'
import type { TourScene } from '~/domain/scene'
import type { Hotspot } from '~/domain/hotspot'
import type { LiveViewerSettings } from '~/shared/utils/viewerAdapters/psvAdapter'

const props = defineProps<{
  activeScene: TourScene | null
  spaceType?: string
  hotspots?: Hotspot[]
  isTracing?: boolean
  tracePoints?: Array<{ yaw: number; pitch: number }>
  traceMode?: 'surface' | 'plot' | 'zone' | 'road'
  traceClosable?: boolean
  traceCanFinish?: boolean
  redrawingPlot?: boolean
  hideNavArrows?: boolean
}>()

const editorStore = useEditorStore()

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number; screenX: number; screenY: number }): void
  (e: 'cancel-placement'): void
  (e: 'hotspot-click', id: string): void
  (e: 'hotspot-edit', id: string): void
  (e: 'hotspot-delete', id: string): void
  (e: 'hotspot-reposition', id: string): void
  (e: 'hotspot-drag-drop', payload: { id: string; yaw: number; pitch: number }): void
  (e: 'request-upload', file?: File): void
  (e: 'update-trace', payload: { yaw: number; pitch: number }): void
  (e: 'close-trace'): void
  (e: 'undo-trace'): void
  (e: 'cancel-trace'): void
}>()

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
const traceTitle = computed(() => {
  const redo = props.redrawingPlot
  if (props.traceMode === 'road') return redo ? 'Redraw road arrow' : 'Draw road arrow'
  if (props.traceMode === 'zone') return redo ? 'Redraw estate outline' : 'Draw estate / phase outline'
  return redo ? 'Redraw boundary' : 'Draw plot boundary'
})

const traceHint = computed(() => {
  const n = props.tracePoints?.length || 0
  if (props.traceMode === 'road') {
    if (n === 0) return `${isTouch ? 'Tap' : 'Click'} along the road where the arrow starts`
    if (n === 1) return `${isTouch ? 'Tap' : 'Click'} where the arrow should point (add bends on the way)`
    return isTouch ? 'Add more points or tap Finish' : 'Add more points, press Enter, or Finish'
  }
  if (n === 0) return isTouch ? 'Tap each corner of the plot, in order' : 'Click each corner of the plot, in order. Zoom in for accuracy.'
  if (n < 3) return `Add ${3 - n} more corner${3 - n === 1 ? '' : 's'}`
  return isTouch ? 'Tap the first corner or Finish to close' : 'Click the first corner, press Enter, or Finish'
})

const hasScene = computed(() => Boolean(props.activeScene?.imageUrl))
const isHotspotMode = computed(() => editorStore.mode === 'hotspot')
const isDragging = ref(false)
const dropError = ref('')
let dropErrorTimer: ReturnType<typeof setTimeout> | null = null

let dragCounter = 0

function showDropError(msg: string) {
  if (dropErrorTimer) clearTimeout(dropErrorTimer)
  dropError.value = msg
  dropErrorTimer = setTimeout(() => { dropError.value = '' }, 3000)
}

function onDragenter() {
  if (hasScene.value) return
  dragCounter++
  isDragging.value = true
}

function onDragleave() {
  dragCounter--
  if (dragCounter === 0) isDragging.value = false
}

function onDrop(e: DragEvent) {
  dragCounter = 0
  isDragging.value = false
  if (hasScene.value) return
  const file = e.dataTransfer?.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showDropError('Only image files are supported')
    return
  }
  emit('request-upload', file)
}

let hotspotToastId: string | number | null = null

watch(() => isHotspotMode.value && hasScene.value && !props.isTracing, (isActive) => {
  if (isActive) {
    if (!hotspotToastId) {
      hotspotToastId = toast.info('Click anywhere to place hotspot', {
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: 'Cancel',
          onClick: () => emit('cancel-placement')
        }
      })
    }
  } else {
    if (hotspotToastId) {
      toast.dismiss(hotspotToastId)
      hotspotToastId = null
    }
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (hotspotToastId) {
    toast.dismiss(hotspotToastId)
    hotspotToastId = null
  }
})

const editorCanvasRef = ref<InstanceType<typeof EditorCanvas> | null>(null)

function refreshSettings(settings: LiveViewerSettings, animate = true) {
  editorCanvasRef.value?.refreshSettings(settings, animate)
}

defineExpose({ refreshSettings })
</script>

<style scoped>
.plot-bar {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px 10px 12px;
  width: max-content;
  max-width: calc(100% - 32px);
  border-radius: 18px;
  background: rgba(10, 12, 20, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  color: #fff;
}
.plot-bar__count {
  flex-shrink: 0;
  width: 34px; height: 34px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 900;
  background: rgba(255, 255, 255, 0.12);
  transition: background 0.2s;
}
.plot-bar__count--ok { background: #22c55e; color: #0b0d14; }
.plot-bar__copy { min-width: 0; }
.plot-bar__title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; }
.plot-bar__hint { font-size: 11px; color: rgba(255, 255, 255, 0.62); margin-top: 2px; }
.plot-bar__actions { display: flex; gap: 6px; flex-shrink: 0; }
.plot-bar__btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 34px; padding: 0 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 12px; font-weight: 700;
  transition: background 0.15s, opacity 0.15s;
}
.plot-bar__btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.16); }
.plot-bar__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.plot-bar__btn--primary { background: #22c55e; border-color: #22c55e; color: #0b0d14; }
.plot-bar__btn--primary:hover:not(:disabled) { background: #4ade80; }
@media (max-width: 640px) {
  .plot-bar { flex-wrap: wrap; justify-content: center; top: 10px; }
  .plot-bar__copy { flex: 1 1 calc(100% - 50px); }
  .plot-bar__btn span { display: none; }
  .plot-bar__btn { padding: 0 11px; }
  .plot-bar__btn--primary span { display: inline; }
}

.badge-confirm-enter-active { animation: badge-confirm 200ms ease-out forwards; }
.badge-confirm-leave-active { transition: opacity 150ms ease, transform 150ms ease; }
.badge-confirm-leave-to     { opacity: 0; transform: translateY(-4px); }

@keyframes badge-confirm {
  0%   { opacity: 0; transform: translateY(-4px); }
  60%  { opacity: 1; transform: translateY(0); }
  75%  { opacity: 0.6; }
  100% { opacity: 1; }
}

.guide-fade-enter-active { transition: opacity 250ms ease, transform 250ms ease; }
.guide-fade-leave-active { transition: opacity 150ms ease; }
.guide-fade-enter-from   { opacity: 0; transform: translateY(6px); }
.guide-fade-leave-to     { opacity: 0; }

.error-fade-enter-active,
.error-fade-leave-active { transition: opacity 200ms ease; }
.error-fade-enter-from,
.error-fade-leave-to     { opacity: 0; }
</style>
