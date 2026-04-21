<template>
  <!-- For public/embed pages: pick first scene from tour and render via ViewerShell -->
  <ViewerShell
    :active-scene="activeScene"
    :space-type="tour?.space?.space_type"
    :hotspots="activeSceneHotspots"
    :is-editing="false"
    @loaded="emit('loaded')"
    @error="emit('error', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Hotspot } from '~/domain/hotspot'
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

// Resolve active scene from either tour.scenes[0] or a direct imageUrl prop (editor context)
const activeScene = computed(() => {
  if (props.tour?.scenes?.length) {
    const s = props.tour.scenes[0]
    return s ?? null
  }
  if (props.imageUrl) {
    // Editor passes imageUrl directly — build a minimal scene shape
    return {
      id: 'direct',
      imageUrl: props.imageUrl,
      hotspots: props.hotspots ?? [],
      settings: {
        hfov_default: 90,
        pitch_default: 0,
        yaw_default: 0,
        auto_rotate_enabled: false,
      },
    }
  }
  return null
})

const activeSceneHotspots = computed(() => {
  if (props.hotspots) return safeHotspots(props.hotspots)
  if (props.tour?.scenes?.[0]?.hotspots) {
    return safeHotspots(props.tour.scenes[0].hotspots)
  }
  return []
})
</script>
