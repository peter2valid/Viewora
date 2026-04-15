<template>
  <div ref="containerRef" class="v360-root relative group">
    <!-- View360 Canvas is injected here -->

    <!-- Hotspot Layer (Absolute positioned over canvas) -->
    <div
      v-if="isLoaded"
      class="absolute inset-0 pointer-events-none overflow-hidden select-none"
    >
      <Hotspot
        v-for="hs in projectedHotspots"
        :key="hs.id"
        v-bind="hs"
        :is-editing="isEditing"
        @click="emit('hotspot-click', $event)"
        @remove="emit('remove-hotspot', $event)"
      />
    </div>

    <!-- Edit Mode Indicator -->
    <div
      v-if="isEditing"
      class="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-emerald-500/90 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-md pointer-events-none select-none z-50 animate-pulse"
    >
      Edit Mode: Click to Place
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import Hotspot from './Hotspot.vue'
import { worldToScreen, screenToWorld } from '~/composables/useHotspotCoords'

// ── Types ────────────────────────────────────────────────────

interface HotspotData {
  id: string
  type: 'info' | 'scene_link' | 'url'
  yaw: number
  pitch: number
  label?: string | null
}

// ── Props ────────────────────────────────────────────────────

const props = withDefaults(defineProps<{
  imageUrl: string
  initialYaw?: number
  initialPitch?: number
  hotspots?: HotspotData[]
  autoRotate?: boolean
  isEditing?: boolean
}>(), {
  initialYaw: 0,
  initialPitch: 0,
  hotspots: () => [],
  autoRotate: false,
  isEditing: false,
})

// ── Emits ────────────────────────────────────────────────────

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: unknown): void
  (e: 'add-hotspot', coords: { yaw: number; pitch: number }): void
  (e: 'hotspot-click', id: string): void
  (e: 'remove-hotspot', id: string): void
}>()

// ── State ─────────────────────────────────────────────────────

const containerRef = ref<HTMLElement | null>(null)
const isLoaded = ref(false)
let viewer: any = null

// Camera state for hotspot projection
const camYaw = ref(props.initialYaw)
const camPitch = ref(props.initialPitch)
const camFov = ref(65) // Default Pannellum/View360 FOV
const containerWidth = ref(0)
const containerHeight = ref(0)

// ── Hotspot Projection ────────────────────────────────────────

const projectedHotspots = computed(() => {
  if (!isLoaded.value || !containerWidth.value || !containerHeight.value) return []

  return props.hotspots.map(hs => {
    const { x, y, visible } = worldToScreen(
      hs.yaw,
      hs.pitch,
      camYaw.value,
      camPitch.value,
      camFov.value,
      containerWidth.value,
      containerHeight.value
    )

    return {
      ...hs,
      x,
      y,
      visible
    }
  })
})

// ── Event Handlers ───────────────────────────────────────────

function onContainerClick(e: MouseEvent) {
  if (!props.isEditing || !viewer || !containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  const coords = screenToWorld(
    px,
    py,
    camYaw.value,
    camPitch.value,
    camFov.value,
    containerWidth.value,
    containerHeight.value
  )

  emit('add-hotspot', coords)
}

// ── Viewer lifecycle ─────────────────────────────────────────

let resizeObserver: ResizeObserver | null = null

async function initViewer(): Promise<void> {
  if (!containerRef.value || !props.imageUrl) return
  destroyViewer()
  isLoaded.value = false

  try {
    const { PanoViewer } = await import('@egjs/view360')

    if (!PanoViewer.isWebGLAvailable()) {
      emit('error', new Error('WebGL is not available in this browser.'))
      return
    }

    viewer = new PanoViewer(containerRef.value, {
      image: props.imageUrl,
      projectionType: PanoViewer.PROJECTION_TYPE.EQUIRECTANGULAR,
      yaw: props.initialYaw,
      pitch: props.initialPitch,
      useZoom: true,
      useKeyboard: false,
      touchDirection: PanoViewer.TOUCH_DIRECTION.ALL,
    })

    viewer.on(PanoViewer.EVENTS.READY, () => {
      isLoaded.value = true
      camFov.value = viewer.getFov()
      emit('loaded')
    })

    viewer.on(PanoViewer.EVENTS.VIEW_CHANGE, (evt: any) => {
      camYaw.value = evt.yaw
      camPitch.value = evt.pitch
      camFov.value = evt.fov
    })

    viewer.on(PanoViewer.EVENTS.ERROR, (evt: any) => {
      emit('error', evt?.errorCode ? new Error(`PanoViewer error ${evt.errorCode}`) : evt)
    })

    // Setup resize observer
    containerWidth.value = containerRef.value.clientWidth
    containerHeight.value = containerRef.value.clientHeight
    
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
        containerHeight.value = entry.contentRect.height
        // PanoViewer v3 uses updateViewportDimensions() — not updateViewportSize()
        if (viewer) viewer.updateViewportDimensions()
      }
    })
    resizeObserver.observe(containerRef.value)

    // Handle clicks for adding hotspots
    containerRef.value.addEventListener('click', onContainerClick)

  } catch (err) {
    emit('error', err)
  }
}

function destroyViewer(): void {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (containerRef.value) {
    containerRef.value.removeEventListener('click', onContainerClick)
  }
  if (viewer) {
    try { viewer.destroy() } catch {}
    viewer = null
  }
  isLoaded.value = false
}

// ── Public API ───────────────────────────────────────────────

async function loadPanorama(url: string, yaw = 0, pitch = 0): Promise<void> {
  if (!viewer || !url) return
  try {
    const { PanoViewer } = await import('@egjs/view360')
    viewer.setImage(url, {
      projectionType: PanoViewer.PROJECTION_TYPE.EQUIRECTANGULAR,
    })
    viewer.lookAt({ yaw, pitch }, 0)
    // Update local state immediately
    camYaw.value = yaw
    camPitch.value = pitch
  } catch (err) {
    emit('error', err)
  }
}

function getYaw(): number {
  return viewer?.getYaw?.() ?? 0
}

function getPitch(): number {
  return viewer?.getPitch?.() ?? 0
}

defineExpose({ loadPanorama, getYaw, getPitch, initViewer })

// ── Mount / unmount ───────────────────────────────────────────

onMounted(initViewer)
onUnmounted(destroyViewer)

// Re-init if imageUrl changes
watch(() => props.imageUrl, (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl) {
    if (viewer) {
      loadPanorama(newUrl, props.initialYaw, props.initialPitch)
    } else {
      initViewer()
    }
  }
})
</script>

<style scoped>
.v360-root {
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
}

:deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
  touch-action: none;
}
</style>
