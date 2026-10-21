<template>
  <div
    class="area-overlay"
    role="application"
    aria-label="Drag a box around the area you want the AI to work on"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="cancel"
  >
    <div v-if="!box" class="area-overlay__hint">
      <strong>Drag a box</strong> around what you want to change, remove, or add something to
      <span class="area-overlay__esc">Esc to cancel</span>
    </div>
    <div
      v-if="box"
      class="area-overlay__box"
      :style="{ left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Point = { yaw: number; pitch: number }

const props = defineProps<{
  /** Page coords → panorama position (from the viewer). */
  toSpherical: (clientX: number, clientY: number) => Point | null
}>()

const emit = defineEmits<{
  (e: 'select', corners: Point[]): void
  (e: 'cancel'): void
}>()

const MIN_SIZE = 16   // px — smaller drags are treated as accidental taps

const start = ref<{ x: number; y: number; cx: number; cy: number } | null>(null)
const end   = ref<{ x: number; y: number; cx: number; cy: number } | null>(null)

const box = computed(() => {
  if (!start.value || !end.value) return null
  return {
    x: Math.min(start.value.x, end.value.x),
    y: Math.min(start.value.y, end.value.y),
    w: Math.abs(end.value.x - start.value.x),
    h: Math.abs(end.value.y - start.value.y),
  }
})

function local(e: PointerEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top, cx: e.clientX, cy: e.clientY }
}

function onDown(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  start.value = local(e)
  end.value   = local(e)
}

function onMove(e: PointerEvent) {
  if (start.value) end.value = local(e)
}

function onUp(e: PointerEvent) {
  if (!start.value) return
  end.value = local(e)
  const s = start.value, t = end.value
  start.value = null
  end.value   = null
  if (Math.abs(t.x - s.x) < MIN_SIZE || Math.abs(t.y - s.y) < MIN_SIZE) return

  const left = Math.min(s.cx, t.cx), right = Math.max(s.cx, t.cx)
  const top  = Math.min(s.cy, t.cy), bottom = Math.max(s.cy, t.cy)
  // Clockwise from top-left — the backend centres its crop on these
  const corners = [[left, top], [right, top], [right, bottom], [left, bottom]].map(([x, y]) => props.toSpherical(x, y))
  if (corners.some(c => !c)) return
  emit('select', corners as Point[])
}

function cancel() {
  start.value = null
  end.value   = null
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.area-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  cursor: crosshair;
  touch-action: none;
  background: rgba(0, 0, 0, 0.18);
}

.area-overlay__hint {
  position: absolute;
  top: 84px;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100vw - 32px);
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(15, 15, 18, 0.88);
  color: #fff;
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  pointer-events: none;
}

.area-overlay__esc {
  margin-left: 8px;
  opacity: 0.6;
}

.area-overlay__box {
  position: absolute;
  border: 2px solid #ff3b5c;
  border-radius: 4px;
  background: rgba(255, 59, 92, 0.12);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}
</style>
