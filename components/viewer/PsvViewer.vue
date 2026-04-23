<template>
  <div class="public-viewer">
    <ViewerShell
      :active-scene="activeScene"
      :space-type="tour?.space?.space_type"
      :hotspots="activeSceneHotspots"
      :is-editing="false"
      @loaded="emit('loaded')"
      @error="emit('error', $event)"
      @hotspot-click="handleHotspotClick"
    />

    <!-- Scene navigation pills — shown only when tour has multiple scenes -->
    <div v-if="sceneCount > 1" class="scene-nav">
      <button
        v-for="(scene, idx) in tourScenes"
        :key="scene.id"
        class="scene-nav__pill"
        :class="{ 'scene-nav__pill--active': idx === activeSceneIndex }"
        :aria-label="`Go to ${scene.name || `Scene ${idx + 1}`}`"
        @click="goToScene(idx)"
      >
        {{ scene.name || `Scene ${idx + 1}` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Hotspot } from '~/domain/hotspot'
import type { TourScene } from '~/domain/scene'
import { safeHotspots } from '~/shared/utils/guards'
import ViewerShell from '~/features/viewer/ViewerShell.vue'

// tour accepts any shape — public pages use a lighter local TourData type
const props = defineProps<{
  tour?: any
  shareUrl?: string
  imageUrl?: string
  isEditing?: boolean
  hotspots?: Hotspot[]
}>()

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number }): void
  (e: 'hotspot-click', id: string): void
  (e: 'remove-hotspot', id: string): void
}>()

// Multi-scene navigation state for public/embed pages
const activeSceneIndex = ref(0)

const tourScenes = computed<any[]>(() => props.tour?.scenes ?? [])
const sceneCount = computed(() => tourScenes.value.length)

// Maps a raw API scene (DB column names) to the TourScene shape ViewerShell expects.
// hotspots are passed via activeSceneHotspots, not embedded in TourScene, so set to [].
function mapRawScene(s: any, tour: any): TourScene {
  const settings360 = tour?.space?.property_360_settings?.[0]
  return {
    id: s.id,
    // Prefer tiled manifest for quality; fall back to raw upload
    imageUrl: s.tile_manifest_url || s.raw_image_url || '',
    title: s.name,
    hotspots: [],
    settings: {
      hfov_default: settings360?.hfov_default ?? 90,
      pitch_default: s.initial_pitch ?? settings360?.pitch_default ?? 0,
      yaw_default: s.initial_yaw ?? settings360?.yaw_default ?? 0,
      auto_rotate_enabled: settings360?.auto_rotate_enabled ?? false,
    },
  }
}

// Resolve active scene from tour (with field mapping) or a direct imageUrl prop
const activeScene = computed(() => {
  if (props.tour?.scenes?.length) {
    const s = props.tour.scenes[activeSceneIndex.value]
    if (!s) return null
    return mapRawScene(s, props.tour)
  }
  if (props.imageUrl) {
    return {
      id: 'direct',
      imageUrl: props.imageUrl,
      title: undefined,
      hotspots: props.hotspots ?? [],
      settings: {
        hfov_default: 90,
        pitch_default: 0,
        yaw_default: 0,
        auto_rotate_enabled: false,
      },
    } satisfies TourScene
  }
  return null
})

const activeSceneHotspots = computed(() => {
  if (props.hotspots) return safeHotspots(props.hotspots)
  const raw = props.tour?.scenes?.[activeSceneIndex.value]
  if (raw?.hotspots) return safeHotspots(raw.hotspots)
  return []
})

function goToScene(index: number) {
  if (index >= 0 && index < sceneCount.value) {
    activeSceneIndex.value = index
  }
}

function goToSceneById(sceneId: string) {
  const idx = (props.tour?.scenes ?? []).findIndex((s: any) => s.id === sceneId)
  if (idx !== -1) goToScene(idx)
}

function handleHotspotClick(hotspotId: string) {
  // Find in the raw scene hotspots so we have access to target_scene_id
  const rawHotspot = props.tour?.scenes?.[activeSceneIndex.value]?.hotspots?.find(
    (h: any) => h.id === hotspotId
  )
  if (rawHotspot?.type === 'scene_link' && rawHotspot.target_scene_id) {
    goToSceneById(rawHotspot.target_scene_id)
    return
  }
  // Propagate other hotspot clicks to parent for custom handling
  emit('hotspot-click', hotspotId)
}
</script>

<style scoped>
.public-viewer {
  position: relative;
  width: 100%;
  height: 100%;
}

.scene-nav {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  backdrop-filter: blur(12px);
  max-width: 90vw;
  overflow-x: auto;
  scrollbar-width: none;
}
.scene-nav::-webkit-scrollbar { display: none; }

.scene-nav__pill {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms, color 120ms;
}
.scene-nav__pill:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
.scene-nav__pill--active {
  background: rgba(255, 255, 255, 0.9);
  color: #0a0a0a;
  border-color: transparent;
}
</style>
