<template>
  <PsvViewer
    :scene="scene"
    :hotspots="[]"
    :is-editing="false"
    @loaded="emit('loaded')"
    @error="emit('error', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TourScene } from '~/domain/scene'
import PsvViewer from '~/features/viewer/panorama/PsvViewer.vue'

const props = defineProps<{
  panoramaUrl: string
  autoRotate?: boolean
  hfov?: number
  pitch?: number
  yaw?: number
}>()

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
}>()

const scene = computed<TourScene | null>(() => {
  if (!props.panoramaUrl) return null
  return {
    id: 'embed-panorama',
    imageUrl: props.panoramaUrl,
    title: undefined,
    hotspots: [],
    settings: {
      hfov_default: props.hfov ?? 90,
      pitch_default: props.pitch ?? 0,
      yaw_default: props.yaw ?? 0,
      auto_rotate_enabled: props.autoRotate ?? false,
    },
  }
})
</script>