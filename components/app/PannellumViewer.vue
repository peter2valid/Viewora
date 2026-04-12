<template>
  <div class="pannellum-container" ref="container">
    <div :id="id" class="pannellum-viewer"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const emit = defineEmits<{
  (event: 'loaded'): void
  (event: 'error', error: unknown): void
}>()

const props = defineProps<{
  panoramaUrl: string
  hfov?: number
  pitch?: number
  yaw?: number
  autoRotate?: boolean
}>()

const id = `pannellum-${Math.random().toString(36).substring(2, 9)}`
const container = ref<HTMLElement | null>(null)
let viewer: any = null
let loadFallbackTimer: ReturnType<typeof setTimeout> | null = null
let pannellumLoadPromise: Promise<void> | null = null
let hasEmittedLoaded = false

function markLoaded() {
  if (hasEmittedLoaded) return
  hasEmittedLoaded = true
  emit('loaded')
}

// Load Pannellum scripts dynamically to avoid bloat on non-360 pages
async function loadPannellum() {
  if (!(window as any).pannellum) {
    if (pannellumLoadPromise) {
      return pannellumLoadPromise
    }

    // CSS
    if (!document.querySelector('link[data-pannellum="true"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css'
      link.dataset.pannellum = 'true'
      document.head.appendChild(link)
    }

    // JS
    pannellumLoadPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-pannellum="true"]') as HTMLScriptElement | null
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true })
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Pannellum viewer script')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js'
      script.dataset.pannellum = 'true'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Pannellum viewer script'))
      document.head.appendChild(script)
    })

    try {
      await pannellumLoadPromise
    } catch (error) {
      pannellumLoadPromise = null
      emit('error', error)
      throw error
    }
  }
}

function initViewer() {
  if (viewer) {
    viewer.destroy()
  }

  hasEmittedLoaded = false
  if (loadFallbackTimer) {
    clearTimeout(loadFallbackTimer)
    loadFallbackTimer = null
  }

  const pannellum = (window as any).pannellum
  if (!pannellum?.viewer) {
    emit('error', new Error('Pannellum viewer is not available'))
    return
  }

  try {
    viewer = pannellum.viewer(id, {
      type: 'equirectangular',
      panorama: props.panoramaUrl,
      autoLoad: true,
      autoRotate: props.autoRotate ? -2 : 0,
      hfov: props.hfov || 100,
      pitch: props.pitch || 0,
      yaw: props.yaw || 0,
      compass: false,
      showZoomCtrl: true,
      showFullscreenCtrl: true,
      mouseZoom: false,
    })

    if (typeof viewer.on === 'function') {
      viewer.on('load', markLoaded)
      viewer.on('error', (error: unknown) => emit('error', error))
    }

    loadFallbackTimer = window.setTimeout(() => {
      markLoaded()
    }, 750)
  } catch (error) {
    emit('error', error)
  }
}

onMounted(async () => {
  try {
    await loadPannellum()
    initViewer()
  } catch (error) {
    emit('error', error)
  }
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
  }
  if (loadFallbackTimer) {
    clearTimeout(loadFallbackTimer)
    loadFallbackTimer = null
  }
})

// Re-init if URL changes
watch(() => props.panoramaUrl, () => {
  if (viewer) initViewer()
})
</script>

<style scoped>
.pannellum-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #000;
}

.pannellum-viewer {
  width: 100%;
  height: 100%;
}

:deep(.pnlm-container) {
  background: #000;
}
</style>
