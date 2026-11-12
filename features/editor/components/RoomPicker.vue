<template>
  <div class="qe-room-picker">
    <!-- One big photo at a time; arrows step through the scenes in dock order. -->
    <div
      class="qe-room-carousel"
      tabindex="0"
      aria-label="Destination room"
      @keydown.left.prevent="stepRoom(-1)"
      @keydown.right.prevent="stepRoom(1)"
    >
      <div class="qe-room-stage">
        <button class="qe-room-arrow" title="Previous room" aria-label="Previous room" @click="stepRoom(-1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <!-- The chosen room in 360°: drag to look around, scroll to zoom. -->
        <RoomSphere
          v-if="selected?.imageUrl && !previewOpen"
          class="qe-room-photo qe-room-photo--sphere"
          :image-url="selected.imageUrl"
          title="Drag to look around"
        >
          <button class="qe-room-expand" title="Bigger view" aria-label="Open a bigger view of this room" @click="previewOpen = true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          </button>
          <span class="qe-room-drag-hint" aria-hidden="true">Drag to look around</span>
        </RoomSphere>
        <div v-else class="qe-room-photo">
          <span v-if="!selected" class="qe-room-photo-hint">Use the arrows to pick a room</span>
          <span v-else-if="!selected.imageUrl" class="qe-room-thumb-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </span>
        </div>
        <button class="qe-room-arrow" title="Next room" aria-label="Next room" @click="stepRoom(1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
      <div class="qe-room-caption">
        <span class="qe-room-name" :title="selected?.label">{{ selected?.label || 'No room selected' }}</span>
        <span v-if="selectedIndex >= 0" class="qe-room-count">{{ selectedIndex + 1 }} / {{ scenes.length }}</span>
      </div>
    </div>
    <RoomPreviewOverlay
      v-if="previewOpen"
      :scenes="scenes"
      :start-index="selectedIndex"
      @close="previewOpen = false"
      @choose="onPreviewChoose"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Destination room chooser for navigation hotspots (add card and side panel):
 * the chosen room in 360° (drag to look around), arrows to step through the
 * rooms in dock order, and a bigger preview.
 */
import { computed, ref } from 'vue'
import RoomPreviewOverlay from '~/features/editor/components/RoomPreviewOverlay.vue'
import RoomSphere from '~/features/editor/components/RoomSphere.vue'

const props = defineProps<{
  scenes: Array<{ id: string; label: string; imageUrl?: string | null }>
  modelValue?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void
}>()

const selected = computed(() => props.scenes.find(s => s.id === props.modelValue))

const previewOpen = ref(false)

function onPreviewChoose(id: string) {
  emit('update:modelValue', id)
  previewOpen.value = false
}

const selectedIndex = computed(() => props.scenes.findIndex(s => s.id === props.modelValue))

/** Previous/next room in dock order, wrapping at the ends. With none picked, right starts at the first and left at the last. */
function stepRoom(dir: 1 | -1) {
  const n = props.scenes.length
  if (!n) return
  const i = selectedIndex.value
  const next = i < 0 ? (dir > 0 ? 0 : n - 1) : (i + dir + n) % n
  emit('update:modelValue', props.scenes[next].id)
}
</script>

<style scoped>
/* ── Room picker ── */
.qe-room-carousel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  outline: none;
  border-radius: 12px;
}
.qe-room-carousel:focus-visible { box-shadow: 0 0 0 2px rgba(129,140,248,0.6); }
.qe-room-stage {
  position: relative;
}
.qe-room-photo {
  width: 100%;
  aspect-ratio: 2 / 1;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  background-color: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.qe-room-photo {
  position: relative;
  transition: border-color 130ms;
}
.qe-room-photo--sphere { display: block; }
.qe-room-photo--sphere:hover { border-color: rgba(255,255,255,0.3); }
.qe-room-drag-hint {
  position: absolute;
  left: 50%;
  bottom: 6px;
  transform: translateX(-50%);
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(12, 14, 22, 0.55);
  color: rgba(255,255,255,0.85);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
}
.qe-room-expand {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(12, 14, 22, 0.6);
  color: #fff;
  border: none;
  cursor: zoom-in;
  z-index: 1;
}
.qe-room-expand:hover { background: rgba(12, 14, 22, 0.85); }
.qe-room-photo-hint {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
  text-align: center;
  padding: 0 12px;
}
.qe-room-thumb-icon { color: rgba(255,255,255,0.2); }
.qe-room-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(12, 14, 22, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.22);
  color: #fff;
  cursor: pointer;
  transition: background 130ms, border-color 130ms;
}
.qe-room-arrow:first-child { left: 8px; }
.qe-room-arrow:last-child { right: 8px; }
.qe-room-arrow:hover { background: rgba(12, 14, 22, 0.78); border-color: rgba(255,255,255,0.4); }
.qe-room-caption {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 2px;
}
.qe-room-name {
  flex: 1;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.85);
  line-height: 1.35;
  /* Full scene names wrap (long camera file names have no spaces to break at). */
  overflow-wrap: anywhere;
}
.qe-room-count {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
  font-variant-numeric: tabular-nums;
}

</style>
