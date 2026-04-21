<template>
  <div class="viewer-shell">
    <ClientOnly>
      <!-- Panorama viewer (all non-automotive spaces) -->
      <PsvViewer
        v-if="viewerType === 'panorama'"
        :scene="activeScene"
        :hotspots="safeHotspots(hotspots ?? [])"
        :is-editing="isEditing"
        @loaded="emit('loaded')"
        @error="emit('error', $event)"
        @add-hotspot="emit('add-hotspot', $event)"
        @hotspot-click="emit('hotspot-click', $event)"
      />

      <!-- Car spin viewer (automotive space type — stub until integrated) -->
      <div v-else-if="viewerType === 'car'" class="viewer-car-stub">
        <p class="viewer-car-stub__label">Car viewer — integration pending</p>
      </div>

      <!-- No viewable content -->
      <div v-else class="viewer-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="viewer-empty__icon">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <p class="viewer-empty__msg">No media uploaded yet</p>
      </div>

      <template #fallback>
        <div class="viewer-loading">
          <div class="viewer-loading__spinner" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TourScene } from '~/domain/scene'
import type { Hotspot } from '~/domain/hotspot'
import { safeHotspots } from '~/shared/utils/guards'
import PsvViewer from '~/features/viewer/panorama/PsvViewer.vue'

const props = defineProps<{
  // Active scene to render
  activeScene: TourScene | null
  // Space type determines which viewer engine to use
  spaceType?: string
  // Hotspots for the current scene
  hotspots?: Hotspot[]
  // True when the editor is placing hotspots
  isEditing?: boolean
}>()

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number }): void
  (e: 'hotspot-click', id: string): void
}>()

// Route to the right viewer based on space type
const viewerType = computed((): 'panorama' | 'car' | 'empty' => {
  if (!props.activeScene?.imageUrl) return 'empty'
  if (props.spaceType === 'automotive') return 'car'
  return 'panorama'
})
</script>

<style scoped>
.viewer-shell {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
}

.viewer-empty,
.viewer-car-stub,
.viewer-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.viewer-empty__icon {
  width: 28px;
  height: 28px;
  color: rgba(255, 255, 255, 0.2);
}

.viewer-empty__msg,
.viewer-car-stub__label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.25);
  font-weight: 500;
}

.viewer-loading__spinner {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
