<template>
  <div v-if="visible" class="minimap" role="navigation" aria-label="Tour floor plan">
    <div class="minimap__header">
      <span class="minimap__title">Floor Plan</span>
      <button class="minimap__close" aria-label="Close minimap" @click="emit('close')">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <svg
      class="minimap__svg"
      :viewBox="viewBox"
      xmlns="http://www.w3.org/2000/svg"
      @click.self="() => {}"
    >
      <!-- Connection lines between adjacent scenes (order-based) -->
      <g class="minimap__edges">
        <line
          v-for="edge in edges"
          :key="edge.key"
          :x1="edge.x1" :y1="edge.y1"
          :x2="edge.x2" :y2="edge.y2"
          class="minimap__edge-line"
        />
      </g>

      <!-- Scene dots -->
      <g
        v-for="dot in dots"
        :key="dot.id"
        class="minimap__dot-group"
        :class="{ 'minimap__dot-group--active': dot.id === activeSceneId }"
        role="button"
        tabindex="0"
        :aria-label="`Go to ${dot.label}`"
        :aria-current="dot.id === activeSceneId ? 'true' : undefined"
        @click="emit('select', dot.id)"
        @keydown.enter="emit('select', dot.id)"
        @keydown.space.prevent="emit('select', dot.id)"
      >
        <!-- Pulse ring on active dot -->
        <circle
          v-if="dot.id === activeSceneId"
          :cx="dot.x" :cy="dot.y"
          :r="DOT_R + 4"
          class="minimap__pulse"
        />
        <circle
          :cx="dot.x" :cy="dot.y"
          :r="DOT_R"
          class="minimap__dot"
        />
        <text
          :x="dot.x"
          :y="dot.y + DOT_R + 8"
          class="minimap__label"
          text-anchor="middle"
        >{{ dot.shortLabel }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface MinimapScene {
  id: string
  name?: string
  positionX?: number
  positionY?: number
  orderIndex?: number
}

const props = defineProps<{
  scenes: MinimapScene[]
  activeSceneId: string
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'select', sceneId: string): void
  (e: 'close'): void
}>()

const DOT_R = 6
const PADDING = 20
const SVG_W = 200
const SVG_H = 120

// Build dot positions. Use positionX/positionY when set (any non-zero value),
// otherwise fall back to a linear arrangement by order_index so the minimap
// always shows something useful out of the box.
const dots = computed(() => {
  if (!props.scenes.length) return []

  const hasRealPositions = props.scenes.some(
    s => (s.positionX ?? 0) !== 0 || (s.positionY ?? 0) !== 0
  )

  const rawPositions = props.scenes.map((s, i) => ({
    id: s.id,
    label: s.name || `Scene ${i + 1}`,
    shortLabel: s.name ? s.name.slice(0, 6) : `${i + 1}`,
    rawX: hasRealPositions ? (s.positionX ?? i * 3) : i * 3,
    rawY: hasRealPositions ? (s.positionY ?? 0) : 0,
  }))

  // Compute bounding box and scale to fit the SVG canvas
  const xs = rawPositions.map(p => p.rawX)
  const ys = rawPositions.map(p => p.rawY)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const usableW = SVG_W - PADDING * 2
  const usableH = SVG_H - PADDING * 2

  return rawPositions.map(p => ({
    id: p.id,
    label: p.label,
    shortLabel: p.shortLabel,
    x: PADDING + ((p.rawX - minX) / rangeX) * usableW,
    y: PADDING + ((p.rawY - minY) / rangeY) * usableH,
  }))
})

// Edges: connect consecutive scenes by order (simple linear path)
const edges = computed(() => {
  const result: { key: string; x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 0; i < dots.value.length - 1; i++) {
    const a = dots.value[i]
    const b = dots.value[i + 1]
    result.push({ key: `${a.id}-${b.id}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y })
  }
  return result
})

const viewBox = computed(() => `0 0 ${SVG_W} ${SVG_H}`)
</script>

<style scoped>
.minimap {
  position: absolute;
  bottom: 90px;
  left: 16px;
  z-index: 30;
  width: 200px;
  background: rgba(8, 10, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  backdrop-filter: blur(18px) saturate(1.2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  user-select: none;
}

.minimap__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 4px;
}

.minimap__title {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

.minimap__close {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 120ms, background 120ms;
  padding: 0;
}
.minimap__close:hover { color: rgba(255, 255, 255, 0.8); background: rgba(255,255,255,0.08); }

.minimap__svg {
  display: block;
  width: 100%;
  height: 120px;
  cursor: default;
}

.minimap__edge-line {
  stroke: rgba(255, 255, 255, 0.12);
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
}

.minimap__dot-group {
  cursor: pointer;
  outline: none;
}

.minimap__dot {
  fill: rgba(255, 255, 255, 0.25);
  stroke: rgba(255, 255, 255, 0.45);
  stroke-width: 1.5;
  transition: fill 180ms ease, stroke 180ms ease;
}

.minimap__dot-group:hover .minimap__dot,
.minimap__dot-group:focus-visible .minimap__dot {
  fill: rgba(255, 255, 255, 0.5);
  stroke: rgba(255, 255, 255, 0.8);
}

.minimap__dot-group--active .minimap__dot {
  fill: #6366f1;
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 2;
}

.minimap__pulse {
  fill: none;
  stroke: rgba(99, 102, 241, 0.5);
  stroke-width: 1.5;
  animation: minimap-pulse 2s ease-out infinite;
}

@keyframes minimap-pulse {
  0%   { r: 10; opacity: 0.7; }
  100% { r: 16; opacity: 0; }
}

.minimap__label {
  font-size: 7px;
  font-weight: 600;
  fill: rgba(255, 255, 255, 0.45);
  pointer-events: none;
  letter-spacing: 0.03em;
}

.minimap__dot-group--active .minimap__label {
  fill: rgba(255, 255, 255, 0.85);
}

@media (max-width: 640px) {
  .minimap {
    bottom: 130px;
    left: 12px;
    width: 160px;
  }
  .minimap__svg { height: 96px; }
}
</style>
