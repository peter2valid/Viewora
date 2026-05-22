<template>
  <!-- canvas is always mounted — v-show only toggles display, never destroys PSV -->
  <div v-show="visible" class="canvas">
    <ViewerShell
      ref="viewerShellRef"
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
      @hotspot-drag-drop="emit('hotspot-drag-drop', $event)"
      @update-trace="emit('update-trace', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TourScene } from '~/domain/scene'
import type { Hotspot } from '~/domain/hotspot'
import ViewerShell from '~/features/viewer/ViewerShell.vue'
import type { LiveViewerSettings } from '~/shared/utils/viewerAdapters/psvAdapter'

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
  (e: 'hotspot-drag-drop', payload: { id: string; yaw: number; pitch: number }): void
  (e: 'update-trace', payload: { yaw: number; pitch: number }): void
}>()

const viewerShellRef = ref<InstanceType<typeof ViewerShell> | null>(null)

function refreshSettings(settings: LiveViewerSettings, animate = true) {
  viewerShellRef.value?.refreshSettings(settings, animate)
}

defineExpose({ refreshSettings })
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
