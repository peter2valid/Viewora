import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TourScene } from '~/domain/scene'
import type { Hotspot } from '~/domain/hotspot'
import type { Space } from '~/domain/space'

// Global tour state — used by both viewer and editor.
// Viewer reads; editor writes.
export const useTourStore = defineStore('tour', () => {
  const space = ref<Space | null>(null)
  const scenes = ref<TourScene[]>([])
  const hotspots = ref<Hotspot[]>([])
  const activeSceneId = ref<string | null>(null)

  const activeScene = computed(
    () => scenes.value.find(s => s.id === activeSceneId.value) ?? scenes.value[0] ?? null
  )

  const sceneCount = computed(() => scenes.value.length)

  const hotspotsForActiveScene = computed(() =>
    hotspots.value.filter(h => {
      // When scenes carry their own hotspot list, filter by active scene.
      // For single-scene tours, return all hotspots.
      if (!activeSceneId.value) return true
      return (h as any).sceneId === activeSceneId.value || (h as any).sceneId == null
    })
  )

  function setTourData(data: { space: Space; scenes: TourScene[] }) {
    space.value = data.space
    scenes.value = data.scenes
    activeSceneId.value = data.scenes[0]?.id ?? null
    hotspots.value = data.scenes.flatMap(s => s.hotspots as unknown as Hotspot[])
  }

  function setActiveScene(id: string) {
    if (scenes.value.some(s => s.id === id)) {
      activeSceneId.value = id
    }
  }

  function addScene(scene: TourScene) {
    scenes.value.push(scene)
    if (!activeSceneId.value) activeSceneId.value = scene.id
  }

  function removeScene(id: string) {
    scenes.value = scenes.value.filter(s => s.id !== id)
    if (activeSceneId.value === id) {
      activeSceneId.value = scenes.value[0]?.id ?? null
    }
  }

  function upsertHotspot(hotspot: Hotspot) {
    const idx = hotspots.value.findIndex(h => h.id === hotspot.id)
    if (idx !== -1) {
      hotspots.value[idx] = hotspot
    } else {
      hotspots.value.push(hotspot)
    }
  }

  function removeHotspot(id: string) {
    hotspots.value = hotspots.value.filter(h => h.id !== id)
  }

  function $reset() {
    space.value = null
    scenes.value = []
    hotspots.value = []
    activeSceneId.value = null
  }

  return {
    space,
    scenes,
    hotspots,
    activeSceneId,
    activeScene,
    sceneCount,
    hotspotsForActiveScene,
    setTourData,
    setActiveScene,
    addScene,
    removeScene,
    upsertHotspot,
    removeHotspot,
    $reset,
  }
})
