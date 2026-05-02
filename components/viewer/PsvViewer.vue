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

    <GlassDock
      v-if="sceneCount > 1"
      :items="dockItems"
      :active-id="activeSceneId"
      glass-class="dock-glass"
      :bottom-px="20"
      :edge-inset-px="16"
      :max-strip-vw="80"
      :max-strip-px="860"
      :max-scale="1.6"
      :sigma-px="94"
      :lift-px="14"
      @select="goToSceneById"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Hotspot } from '~/domain/hotspot'
import type { TourScene } from '~/domain/scene'
import { safeHotspots } from '~/shared/utils/guards'
import ViewerShell from '~/features/viewer/ViewerShell.vue'
import GlassDock from '~/components/ui/GlassDock.vue'

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
const activeSceneId = computed(() => tourScenes.value[activeSceneIndex.value]?.id ?? '')

const dockItems = computed(() =>
  tourScenes.value.map((s: any, idx: number) => ({
    id: s.id,
    label: s.name || `Scene ${idx + 1}`,
    imageUrl: s.thumbnail_url || s.raw_image_url || null,
    ariaLabel: `Go to ${s.name || `Scene ${idx + 1}`}`,
    badge: (s.status && s.status !== 'ready' ? 'loading' : null) as 'loading' | 'failed' | null,
  }))
)

// Maps a raw API scene (DB column names) to the TourScene shape ViewerShell expects.
// hotspots are passed via activeSceneHotspots, not embedded in TourScene, so set to [].
function mapRawScene(s: any, tour: any): TourScene {
  const settings360 = tour?.space?.property_360_settings?.[0]
  return {
    id: s.id,
    // Use thumbnail as baseUrl for the viewer to ensure fast initial load
    // while tiled manifest handles the high resolution.
    imageUrl: s.thumbnail_url || s.raw_image_url || '',
    tileManifestUrl: s.tile_manifest_url || undefined,
    width: s.width,
    height: s.height,
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
  // Find in the raw scene hotspots so we have access to target_scene_id / content.url
  const rawHotspot = props.tour?.scenes?.[activeSceneIndex.value]?.hotspots?.find(
    (h: any) => h.id === hotspotId
  )
  if (rawHotspot?.type === 'scene_link' && rawHotspot.target_scene_id) {
    goToSceneById(rawHotspot.target_scene_id)
    return
  }
  if (rawHotspot?.type === 'url') {
    const url = rawHotspot.url ?? rawHotspot.content?.url
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  emit('hotspot-click', hotspotId)
}
</script>

<style scoped>
.public-viewer {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
