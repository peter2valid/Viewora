<template>
  <!-- canvas is always mounted — v-show only toggles display, never destroys PSV -->
  <div v-show="visible" class="canvas">
    <ViewerShell
      :active-scene="activeScene"
      :space-type="spaceType"
      :hotspots="hotspots"
      :is-editing="isEditing"
      :is-tracing="isTracing"
      :trace-points="tracePoints"
      @loaded="emit('loaded')"
      @error="emit('error', $event)"
      @add-hotspot="emit('add-hotspot', $event)"
      @hotspot-click="emit('hotspot-click', $event)"
      @hotspot-edit="emit('hotspot-edit', $event)"
      @hotspot-delete="emit('hotspot-delete', $event)"
      @hotspot-reposition="emit('hotspot-reposition', $event)"
      @update-trace="emit('update-trace', $event)"
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
  isTracing?: boolean
  tracePoints?: Array<{ yaw: number; pitch: number }>
}>()

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number; screenX: number; screenY: number }): void
  (e: 'hotspot-click', id: string): void
  (e: 'hotspot-edit', id: string): void
  (e: 'hotspot-delete', id: string): void
  (e: 'hotspot-reposition', id: string): void
  (e: 'update-trace', payload: { yaw: number; pitch: number }): void
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
