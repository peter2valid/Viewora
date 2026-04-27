<template>
  <main
    class="absolute inset-0 z-0 overflow-hidden bg-[#0A0A0A]"
    :class="isHotspotMode && hasScene ? 'cursor-crosshair' : ''"
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
      :visible="hasScene"
      :active-scene="activeScene"
      :space-type="spaceType"
      :hotspots="hotspots"
      :is-editing="isHotspotMode"
      :is-tracing="isTracing"
      :trace-points="tracePoints"
      @loaded="$emit('loaded')"
      @error="$emit('error', $event)"
      @add-hotspot="$emit('add-hotspot', $event)"
      @hotspot-click="$emit('hotspot-click', $event)"
      @update-trace="$emit('update-trace', $event)"
    />

    <!-- Hotspot mode badge -->
    <Transition name="badge-confirm">
      <div
        v-if="isHotspotMode && hasScene"
        class="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/[0.1] border border-blue-500/20 backdrop-blur-sm pointer-events-none select-none"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
        Hotspot Mode — click to place
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
import { ref, computed } from 'vue'
import EditorCanvas from '~/features/editor/EditorCanvas.vue'
import { useEditorStore } from '~/features/editor/store/useEditorStore'
import type { TourScene } from '~/domain/scene'
import type { Hotspot } from '~/domain/hotspot'

const props = defineProps<{
  activeScene: TourScene | null
  spaceType?: string
  hotspots?: Hotspot[]
  isTracing?: boolean
  tracePoints?: Array<{ yaw: number; pitch: number }>
}>()

const editorStore = useEditorStore()

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number }): void
  (e: 'hotspot-click', id: string): void
  (e: 'request-upload', file?: File): void
  (e: 'update-trace', payload: { yaw: number; pitch: number }): void
}>()

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
</script>

<style scoped>
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
