<template>
  <!-- canvas is always mounted — v-show only toggles display, never destroys PSV -->
  <div v-show="visible" class="canvas">
    <!-- remove-hotspot is intentionally not wired; deletion is sidebar-only for now -->
    <ViewerShell
      :active-scene="activeScene"
      :space-type="spaceType"
      :hotspots="hotspots"
      :is-editing="isEditing"
      @loaded="emit('loaded')"
      @error="emit('error', $event)"
      @add-hotspot="emit('add-hotspot', $event)"
      @hotspot-click="emit('hotspot-click', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { TourScene } from '~/domain/scene'
import type { Hotspot } from '~/domain/hotspot'
import ViewerShell from '~/features/viewer/ViewerShell.vue'

defineProps<{
  visible: boolean
  activeScene: TourScene | null
  spaceType?: string
  hotspots?: Hotspot[]
  isEditing?: boolean
}>()

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number }): void
  (e: 'hotspot-click', id: string): void
}>()
</script>

<style scoped>
.canvas {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
