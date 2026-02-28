<template>
  <div class="marzipano-wrapper">
    <!-- Viewer canvas -->
    <div ref="viewerEl" class="marzipano-viewer"></div>

    <!-- No scene state -->
    <div v-if="!activeSceneId || !hasActivePanorama" class="marzipano-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
      </svg>
      <p>{{ scenes.length === 0 ? 'Add a scene to get started' : 'Select a scene to preview' }}</p>
    </div>

    <!-- Add-hotspot crosshair overlay -->
    <div v-if="addHotspotMode" class="marzipano-crosshair-overlay">
      <div class="crosshair-hint">Click anywhere to place a hotspot</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Database } from '~/types/database.types'

type Scene = Database['public']['Tables']['scenes']['Row']
type Hotspot = Database['public']['Tables']['hotspots']['Row']

const props = defineProps<{
  scenes: Scene[]
  hotspots: Hotspot[]
  activeSceneId: string | null
  addHotspotMode: boolean
}>()

const emit = defineEmits<{
  (e: 'hotspot-placed', coords: { yaw: number; pitch: number }): void
  (e: 'hotspot-navigate', sceneId: string): void
}>()

const viewerEl = ref<HTMLElement | null>(null)
let viewer: any = null
let MarzipanoLib: any = null
const mSceneMap = new Map<string, any>()

const hasActivePanorama = computed(() => {
  if (!props.activeSceneId) return false
  return props.scenes.find(s => s.id === props.activeSceneId)?.panorama_url != null
})

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  // Marzipano uses document/canvas APIs, must run client-side only.
  // Since /app/** is ssr: false, this is guaranteed to be client-side.
  const mod = await import('marzipano')
  MarzipanoLib = (mod as any).default ?? mod

  viewer = new MarzipanoLib.Viewer(viewerEl.value!, {
    controls: { mouseViewMode: 'drag' },
  })

  // Add all scenes that already have panoramas
  for (const scene of props.scenes) {
    if (scene.panorama_url) {
      addMarzipanoScene(scene)
    }
  }

  syncHotspots()

  // Switch to active scene if set
  if (props.activeSceneId) {
    switchToScene(props.activeSceneId)
  }
})

onBeforeUnmount(() => {
  viewerEl.value?.removeEventListener('click', handleClick)
  viewer?.destroy()
  mSceneMap.clear()
})

// ── Watchers ──────────────────────────────────────────────────────────────────

// New scenes uploaded → add to viewer
watch(
  () => props.scenes,
  (scenes) => {
    for (const scene of scenes) {
      if (scene.panorama_url && !mSceneMap.has(scene.id)) {
        addMarzipanoScene(scene)
      }
    }
    syncHotspots()
  },
  { deep: true }
)

// Active scene changed → switch viewer
watch(() => props.activeSceneId, (id) => {
  if (id) switchToScene(id)
})

// Hotspots changed → re-render
watch(() => props.hotspots, () => { syncHotspots() }, { deep: true })

// ── Marzipano helpers ────────────────────────────────────────────────────────

function addMarzipanoScene(scene: Scene) {
  if (!viewer || !MarzipanoLib || !scene.panorama_url) return

  const source = MarzipanoLib.ImageUrlSource.fromString(scene.panorama_url)
  const geometry = new MarzipanoLib.EquirectGeometry([{ width: 4096 }])
  const limiter = MarzipanoLib.RectilinearView.limit.traditional(
    1024,
    100 * Math.PI / 180
  )
  const view = new MarzipanoLib.RectilinearView(
    {
      yaw: scene.initial_yaw,
      pitch: scene.initial_pitch,
      fov: scene.initial_fov,
    },
    limiter
  )

  const mScene = viewer.createScene({ source, geometry, view })
  mSceneMap.set(scene.id, mScene)
}

function switchToScene(sceneId: string) {
  const mScene = mSceneMap.get(sceneId)
  if (!mScene) return
  mScene.switchTo({ transitionDuration: 1000 })
}

function syncHotspots() {
  if (!viewer || !MarzipanoLib) return

  // Clear all existing hotspots from every scene
  for (const mScene of mSceneMap.values()) {
    const container = mScene.hotspotContainer()
    const existing = container.listHotspots()
    for (const h of existing) container.destroyHotspot(h)
  }

  // Re-inject current hotspots
  for (const hotspot of props.hotspots) {
    const mScene = mSceneMap.get(hotspot.scene_id)
    if (!mScene) continue

    const container = mScene.hotspotContainer()
    const el = buildHotspotEl(hotspot)
    container.createHotspot(el, { yaw: hotspot.yaw, pitch: hotspot.pitch })
  }
}

function buildHotspotEl(hotspot: Hotspot): HTMLElement {
  const el = document.createElement('div')
  el.className = 'mz-hotspot'

  if (hotspot.target_scene_id) {
    el.classList.add('mz-hotspot--nav')
    el.title = hotspot.label || 'Go to scene'
    el.innerHTML = `
      <div class="mz-hotspot-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
      </div>
      ${hotspot.label ? `<span class="mz-hotspot-label">${escapeHtml(hotspot.label)}</span>` : ''}
    `
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      emit('hotspot-navigate', hotspot.target_scene_id!)
    })
  } else {
    el.classList.add('mz-hotspot--info')
    el.title = hotspot.label || 'Info'
    el.innerHTML = `
      <div class="mz-hotspot-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      ${hotspot.label ? `<span class="mz-hotspot-label">${escapeHtml(hotspot.label)}</span>` : ''}
    `
  }

  return el
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Click-to-place hotspot ────────────────────────────────────────────────────

function handleClick(e: MouseEvent) {
  if (!props.addHotspotMode || !viewer) return

  const currentMScene = viewer.scene()
  if (!currentMScene) return

  const rect = viewerEl.value!.getBoundingClientRect()
  const coords = currentMScene.view().screenToCoordinates({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  })

  emit('hotspot-placed', { yaw: coords.yaw, pitch: coords.pitch })
}

// Attach/detach click handler depending on addHotspotMode to avoid
// conflicting with Marzipano's own drag controls.
watch(() => props.addHotspotMode, (active) => {
  if (!viewerEl.value) return
  if (active) {
    viewerEl.value.addEventListener('click', handleClick)
  } else {
    viewerEl.value.removeEventListener('click', handleClick)
  }
})
</script>
