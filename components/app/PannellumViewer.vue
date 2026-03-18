<template>
  <div class="pannellum-container" ref="container">
    <div :id="id" class="pannellum-viewer"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

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

// Load Pannellum scripts dynamically to avoid bloat on non-360 pages
async function loadPannellum() {
  if (!(window as any).pannellum) {
    // CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css'
    document.head.appendChild(link)

    // JS
    await new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js'
      script.onload = resolve
      document.head.appendChild(script)
    })
  }
}

function initViewer() {
  if (viewer) {
    viewer.destroy()
  }

  viewer = (window as any).pannellum.viewer(id, {
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
    mouseZoom: false // Disable mouse zoom to prevent scrolling issues on pages
  })
}

onMounted(async () => {
  await loadPannellum()
  initViewer()
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
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
