<template>
  <div
    ref="rootEl"
    class="vsv"
    role="group"
    tabindex="0"
    :aria-label="`Exterior view, ${currentLabel}. Drag or use the arrow keys to rotate the car.`"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @keydown.left.prevent="step(-1)"
    @keydown.right.prevent="step(1)"
  >
    <!-- Every frame stays in the DOM so a step is just an opacity swap: no decode flash while dragging. -->
    <img
      v-for="(v, i) in sorted"
      :key="v.id"
      :src="v.image_url"
      :alt="i === index ? `Car, ${viewLabel(v)}` : ''"
      :aria-hidden="i === index ? undefined : 'true'"
      class="vsv__frame"
      :class="{ 'is-active': i === index }"
      :loading="i === 0 ? 'eager' : 'lazy'"
      :fetchpriority="i === 0 ? 'high' : 'low'"
      decoding="async"
      draggable="false"
      @load="onFrameLoad(i)"
    />

    <div v-if="!sorted.length" class="vsv__empty">No exterior photos yet</div>

    <div v-if="sorted.length > 1" class="vsv__ui">
      <p v-if="showHint" class="vsv__hint" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-5 4 5 4M16 8l5 4-5 4M3 12h18"/></svg>
        Drag to rotate
      </p>
      <div class="vsv__bar">
        <span class="vsv__label" aria-live="polite">{{ currentLabel }}</span>
        <div class="vsv__dots">
        <button
          v-for="(v, i) in sorted"
          :key="v.id"
          type="button"
          class="vsv__dot"
          :class="{ 'is-active': i === index }"
          :aria-label="viewLabel(v)"
          :aria-current="i === index ? 'true' : undefined"
          @pointerdown.stop
          @click.stop="goTo(i)"
        />
        </div>
      </div>
    </div>
    <div v-if="sorted.length > 1 && loadedCount < sorted.length" class="vsv__progress" :style="{ transform: `scaleX(${loadedCount / sorted.length})` }" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { sortByAngle, viewLabel, wrapIndex, type VehicleView } from '~/shared/utils/vehicleViews'

const props = defineProps<{ views: VehicleView[] }>()
const emit = defineEmits<{ (e: 'change', index: number): void }>()

const sorted = computed(() => sortByAngle(props.views))
const index = ref(0)
const currentLabel = computed(() => (sorted.value[index.value] ? viewLabel(sorted.value[index.value]) : ''))

const rootEl = ref<HTMLElement | null>(null)
const showHint = ref(true)
const loaded = ref<Set<number>>(new Set())
const loadedCount = computed(() => loaded.value.size)
function onFrameLoad(i: number) {
  loaded.value = new Set(loaded.value).add(i)
}

// A full-width drag turns the car one and a half times less than a full lap,
// which feels natural with 8 frames; more frames just means finer steps.
const LAP_WIDTHS = 1.5
let dragging = false
let startX = 0
let startPos = 0
let pos = 0 // continuous frame position, so slow drags still land between frames smoothly
let lastX = 0
let lastT = 0
let velocity = 0 // frames per ms
let raf = 0
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function framesPerPx() {
  const w = rootEl.value?.clientWidth || 360
  return sorted.value.length / (w * LAP_WIDTHS)
}

function setPos(p: number) {
  const n = sorted.value.length
  if (!n) return
  pos = p
  const next = wrapIndex(Math.round(pos), n)
  if (next !== index.value) {
    index.value = next
    emit('change', next)
  }
}

function stopInertia() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

function onDown(e: PointerEvent) {
  if (sorted.value.length < 2) return
  stopInertia()
  dragging = true
  showHint.value = false
  startX = lastX = e.clientX
  startPos = pos
  lastT = performance.now()
  velocity = 0
  rootEl.value?.setPointerCapture?.(e.pointerId)
}

function onMove(e: PointerEvent) {
  if (!dragging) return
  const now = performance.now()
  const dt = Math.max(1, now - lastT)
  // Dragging right turns the car towards its left, like pushing the nearest surface.
  setPos(startPos - (e.clientX - startX) * framesPerPx())
  velocity = Math.max(-0.02, Math.min(0.02, (-(e.clientX - lastX) * framesPerPx()) / dt))
  lastX = e.clientX
  lastT = now
}

function onUp(e: PointerEvent) {
  if (!dragging) return
  dragging = false
  rootEl.value?.releasePointerCapture?.(e.pointerId)
  if (reduceMotion || Math.abs(velocity) < 0.002 || performance.now() - lastT > 80) {
    setPos(Math.round(pos))
    return
  }
  let v = velocity
  let prev = performance.now()
  const tick = (t: number) => {
    const dt = t - prev
    prev = t
    setPos(pos + v * dt)
    v *= Math.pow(0.0015, dt / 1000) // friction: ~99.8% lost per second
    if (Math.abs(v) > 0.0006) raf = requestAnimationFrame(tick)
    else { raf = 0; setPos(Math.round(pos)) }
  }
  raf = requestAnimationFrame(tick)
}

function goTo(i: number) {
  stopInertia()
  showHint.value = false
  // Take the short way round the car.
  const n = sorted.value.length
  let diff = i - wrapIndex(Math.round(pos), n)
  if (diff > n / 2) diff -= n
  if (diff < -n / 2) diff += n
  setPos(Math.round(pos) + diff)
}

function step(dir: number) {
  stopInertia()
  showHint.value = false
  setPos(Math.round(pos) + dir)
}

// The "Drag to rotate" hint goes away after a few seconds, or on first touch.
let hintTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  hintTimer = setTimeout(() => { showHint.value = false }, 4500)
})

watch(() => sorted.value.length, (n) => {
  if (index.value >= n) { index.value = 0; pos = 0 }
})

onBeforeUnmount(() => { stopInertia(); if (hintTimer) clearTimeout(hintTimer) })

defineExpose({ goTo, index })
</script>

<style scoped>
.vsv {
  position: absolute; inset: 0; overflow: hidden;
  background: #0b0b0c;
  cursor: grab; touch-action: pan-y; user-select: none; -webkit-user-select: none;
  outline: none;
}
.vsv:active { cursor: grabbing; }
.vsv:focus-visible { box-shadow: inset 0 0 0 3px #fff; }
.vsv__frame {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  opacity: 0; pointer-events: none;
}
.vsv__frame.is-active { opacity: 1; }
.vsv__empty {
  position: absolute; inset: 0; display: grid; place-items: center;
  color: rgba(255,255,255,0.5); font-size: 13px;
}
.vsv__ui {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 0 16px max(18px, env(safe-area-inset-bottom));
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  pointer-events: none;
}
.vsv__hint {
  display: inline-flex; align-items: center; gap: 8px; margin: 0;
  padding: 8px 12px; border-radius: 999px;
  background: rgba(0,0,0,0.62); color: #fff; font-size: 12px; font-weight: 600;
}
.vsv__bar {
  display: flex; flex-direction: column; align-items: center; pointer-events: auto;
  padding: 8px 10px 0; border-radius: 16px; background: rgba(0,0,0,0.62);
}
.vsv__dots { display: flex; align-items: center; }
/* 48px tap target around a small visible dot. */
.vsv__dot {
  position: relative; width: 28px; height: 44px; padding: 0; border: 0; background: transparent; cursor: pointer;
}
.vsv__dot::after {
  content: ''; position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px;
  border-radius: 50%; background: rgba(255,255,255,0.4);
  transition: background 120ms, transform 120ms;
}
.vsv__dot.is-active::after { background: #fff; transform: scale(1.35); }
.vsv__dot:focus-visible { outline: 2px solid #fff; outline-offset: -4px; border-radius: 8px; }
.vsv__label {
  color: #fff; font-size: 12px; font-weight: 700; white-space: nowrap;
}
.vsv__progress {
  position: absolute; left: 0; right: 0; top: 0; height: 3px; background: #fff; opacity: 0.8;
  transform-origin: left; transition: transform 160ms;
}
@media (prefers-reduced-motion: reduce) {
  .vsv__dot::after, .vsv__progress { transition: none; }
}
@media (max-width: 420px) {
  .vsv__dot { width: 26px; }
}
</style>
