<template>
  <div class="viewer-shell">

    <!-- No active scene -->
    <div v-if="viewerMode === 'empty'" class="viewer-shell__empty">
      <p class="viewer-shell__empty-label">No scene selected</p>
    </div>

    <!-- Panorama viewer -->
    <PsvViewer
      v-else-if="viewerMode === 'panorama'"
      :scene="activeScene!"
      :hotspots="sceneHotspots"
      @hotspot-click="onHotspotClick"
      @add-hotspot="onAddHotspot"
    />

    <!-- Car spin viewer -->
    <CarSpinViewer
      v-else-if="viewerMode === 'car'"
      :frames="(activeScene as any)?.frames ?? []"
    />

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTourStore } from '~/features/tour/store/useTourStore'
import PsvViewer from '~/features/viewer/panorama/PsvViewer.vue'
import CarSpinViewer from '~/features/viewer/car/CarSpinViewer.vue'

// ── Emits ────────────────────────────────────────────────────────────────────
const emit = defineEmits<{
  (e: 'hotspot-click', payload: string): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number }): void
}>()

// ── Store ─────────────────────────────────────────────────────────────────────
const store = useTourStore()

// ── Derived state (computed only — no watchers, no mutations) ─────────────────

const activeScene = computed(() => {
  if (!store.activeSceneId) return null
  return store.scenes.find(s => s.id === store.activeSceneId) ?? null
})

type ViewerMode = 'empty' | 'panorama' | 'car'

const viewerMode = computed((): ViewerMode => {
  if (!activeScene.value) return 'empty'
  if ((activeScene.value as any).type === 'car-exterior') return 'car'
  return 'panorama'
})

const imageUrl = computed(() => (activeScene.value as any)?.panorama_url ?? null)

const sceneHotspots = computed(() =>
  store.hotspots.filter(h => (h as any).sceneId === store.activeSceneId)
)

// ── Event forwarding (no payload transformation) ──────────────────────────────

function onHotspotClick(payload: string): void {
  emit('hotspot-click', payload)
}

function onAddHotspot(payload: { yaw: number; pitch: number }): void {
  emit('add-hotspot', payload)
}
</script>

<style scoped>
.viewer-shell {
  width: 100%;
  height: 100%;
  background: #000;
  position: relative;
  overflow: hidden;
}

.viewer-shell__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-shell__empty-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.25);
}
</style>
