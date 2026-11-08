<template>
  <div
    ref="rootEl"
    class="vsv"
    :class="{ 'is-placing': placing, 'is-edit': editable }"
    role="group"
    tabindex="0"
    :aria-label="`Exterior view, ${currentLabel}. Drag or use the arrow keys to rotate the car.`"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @keydown.left.prevent="step(-1)"
    @keydown.right.prevent="step(1)"
    @keydown.esc="activePinId = null"
  >
    <!-- Every frame stays in the DOM so a step is just an opacity swap: no decode flash while dragging. -->
    <img
      v-for="(v, i) in sorted"
      :key="v.id"
      :src="v.image_url"
      :alt="i === index ? `Car, ${viewLabel(v)}` : ''"
      :aria-hidden="i === index ? undefined : 'true'"
      class="vsv__frame"
      :class="[{ 'is-active': i === index }, fit === 'contain' ? 'is-contain' : '']"
      :loading="i === 0 ? 'eager' : 'lazy'"
      :fetchpriority="i === 0 ? 'high' : 'low'"
      decoding="async"
      draggable="false"
      @load="onFrameLoad(i, $event)"
    />

    <div v-if="!sorted.length" class="vsv__empty">No exterior photos yet</div>

    <!-- Pins of the photo on screen. Positioned against where the photo is actually drawn, so cropping never shifts them. -->
    <div v-if="pins.length" class="vsv__pins">
      <button
        v-for="p in pins"
        :key="p.h.id"
        type="button"
        class="vsv__pin"
        :class="[`vsv__pin--${p.h.kind}`, { 'is-selected': (editable ? selectedHotspotId : activePinId) === p.h.id, 'is-hidden': !p.visible }]"
        :style="{ left: p.left + 'px', top: p.top + 'px' }"
        :aria-label="`${p.h.title}, ${hotspotKindLabel(p.h.kind)}`"
        :tabindex="p.visible ? 0 : -1"
        @pointerdown.stop="onPinDown($event, p.h)"
        @pointermove.stop="onPinMove($event)"
        @pointerup.stop="onPinUp($event, p.h)"
        @pointercancel.stop="onPinCancel"
        @keydown.enter.stop.prevent="selectPin(p.h)"
        @keydown.space.stop.prevent="selectPin(p.h)"
      >
        <svg v-if="p.h.kind === 'damage'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4M12 17.2v.1"/></svg>
        <svg v-else-if="p.h.kind === 'link'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>
        <svg v-else-if="p.h.kind === 'info'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M12 11v6M12 7.2v.1"/></svg>
        <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>
      </button>
    </div>

    <!-- Buyer-side card for a tapped pin (the editor shows these in its side panel instead). -->
    <div v-if="!editable && activePin" class="vsv__card" role="dialog" :aria-label="activePin.title" @pointerdown.stop>
      <button type="button" class="vsv__card-close" aria-label="Close" @click="activePinId = null">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <p class="vsv__card-kind">{{ hotspotKindLabel(activePin.kind) }}</p>
      <p class="vsv__card-title">{{ activePin.title }}</p>
      <p v-if="activePin.body" class="vsv__card-body">{{ activePin.body }}</p>
      <a v-if="activePin.url" :href="activePin.url" class="vsv__card-link" target="_blank" rel="noopener noreferrer">Open link</a>
    </div>

    <div v-if="sorted.length > 1 && !hideBar" class="vsv__ui">
      <p v-if="showHint && !editable && !activePin" class="vsv__hint" aria-hidden="true">
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
import {
  sortByAngle, viewLabel, wrapIndex, fitRect, pointToFraction, hotspotKindLabel,
  type VehicleView, type VehicleHotspot,
} from '~/shared/utils/vehicleViews'

const props = withDefaults(defineProps<{
  views: VehicleView[]
  /** `cover` fills the box (buyers); `contain` shows the whole photo (editor, so pins can go anywhere). */
  fit?: 'cover' | 'contain'
  /** Editor behaviours: pins can be dragged and selected from outside. */
  editable?: boolean
  /** Next click on the photo places a pin instead of doing nothing. */
  placing?: boolean
  selectedHotspotId?: string | null
  /** Controlled frame (index into the angle-sorted list). Omit to let the viewer manage it. */
  index?: number
  hideBar?: boolean
}>(), { fit: 'cover', editable: false, placing: false, selectedHotspotId: null, hideBar: false })

const emit = defineEmits<{
  (e: 'update:index', index: number): void
  (e: 'place', payload: { viewId: string; x: number; y: number }): void
  (e: 'select-hotspot', payload: { viewId: string; id: string }): void
  (e: 'move-hotspot', payload: { viewId: string; id: string; x: number; y: number }): void
}>()

const sorted = computed(() => sortByAngle(props.views))
const idx = ref(0)
const index = computed(() => idx.value)
const currentView = computed(() => sorted.value[idx.value])
const currentLabel = computed(() => (currentView.value ? viewLabel(currentView.value) : ''))

const rootEl = ref<HTMLElement | null>(null)
const showHint = ref(true)
const loaded = ref<Set<number>>(new Set())
const loadedCount = computed(() => loaded.value.size)
const natural = ref<Record<string, { w: number; h: number }>>({})
function onFrameLoad(i: number, e: Event) {
  loaded.value = new Set(loaded.value).add(i)
  const img = e.target as HTMLImageElement
  const v = sorted.value[i]
  if (v && img.naturalWidth) natural.value = { ...natural.value, [v.id]: { w: img.naturalWidth, h: img.naturalHeight } }
}

// ── Box size, for placing pins ──
const box = ref({ w: 0, h: 0 })
let ro: ResizeObserver | undefined
function measure() {
  const el = rootEl.value
  if (el) box.value = { w: el.clientWidth, h: el.clientHeight }
}

function rectOf(v: VehicleView) {
  const nat = natural.value[v.id] ?? (v.width && v.height ? { w: v.width, h: v.height } : { w: 4, h: 3 })
  return fitRect(box.value, nat, props.fit)
}

const pins = computed(() => {
  const v = currentView.value
  if (!v?.hotspots?.length || !box.value.w) return []
  const r = rectOf(v)
  return v.hotspots.map((h) => {
    const o = dragOverride.value?.id === h.id ? dragOverride.value : null
    const left = r.x + (o ? o.x : h.x) * r.w
    const top = r.y + (o ? o.y : h.y) * r.h
    const visible = left >= 0 && left <= box.value.w && top >= 0 && top <= box.value.h
    return { h, left, top, visible }
  })
})

// Where a pin being dragged is right now; the real data only changes once it is dropped and saved.
const dragOverride = ref<{ id: string; x: number; y: number } | null>(null)
const activePinId = ref<string | null>(null)
const activePin = computed<VehicleHotspot | null>(() => currentView.value?.hotspots?.find(h => h.id === activePinId.value) ?? null)

// ── Rotation ──
// A full-width drag is one and a half laps' worth less than a lap, which feels natural with 8 frames.
const LAP_WIDTHS = 1.5
let dragging = false
let moved = 0
let downX = 0
let downY = 0
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
  if (next !== idx.value) {
    idx.value = next
    activePinId.value = null
    emit('update:index', next)
  }
}

function stopInertia() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

function onDown(e: PointerEvent) {
  if (sorted.value.length < 1) return
  stopInertia()
  dragging = true
  moved = 0
  showHint.value = false
  downX = startPosX = lastX = e.clientX
  downY = e.clientY
  startPos = pos
  lastT = performance.now()
  velocity = 0
  rootEl.value?.setPointerCapture?.(e.pointerId)
}
let startPosX = 0

function onMove(e: PointerEvent) {
  if (!dragging || sorted.value.length < 2) return
  moved = Math.max(moved, Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY))
  const now = performance.now()
  const dt = Math.max(1, now - lastT)
  // Dragging right turns the car towards its left, like pushing the nearest surface.
  setPos(startPos - (e.clientX - startPosX) * framesPerPx())
  velocity = Math.max(-0.02, Math.min(0.02, (-(e.clientX - lastX) * framesPerPx()) / dt))
  lastX = e.clientX
  lastT = now
}

function onUp(e: PointerEvent) {
  if (!dragging) return
  dragging = false
  rootEl.value?.releasePointerCapture?.(e.pointerId)

  // A tap (not a drag): place a pin in the editor, or dismiss a card for buyers.
  if (moved < 6) {
    const v = currentView.value
    if (props.placing && v && rootEl.value) {
      const b = rootEl.value.getBoundingClientRect()
      const f = pointToFraction(e.clientX - b.left, e.clientY - b.top, rectOf(v))
      if (f) emit('place', { viewId: v.id, x: f.x, y: f.y })
    } else {
      activePinId.value = null
    }
    return
  }

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

// ── Pins ──
let pinDrag: { id: string; sx: number; sy: number; moved: boolean } | null = null

function onPinDown(e: PointerEvent, h: VehicleHotspot) {
  pinDrag = { id: h.id, sx: e.clientX, sy: e.clientY, moved: false }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPinMove(e: PointerEvent) {
  if (!pinDrag || !props.editable) return
  if (!pinDrag.moved && Math.abs(e.clientX - pinDrag.sx) + Math.abs(e.clientY - pinDrag.sy) < 6) return
  pinDrag.moved = true
  const v = currentView.value
  const el = rootEl.value
  if (!v || !el) return
  const b = el.getBoundingClientRect()
  const f = pointToFraction(e.clientX - b.left, e.clientY - b.top, rectOf(v))
  if (!f) return
  dragOverride.value = { id: pinDrag.id, x: f.x, y: f.y }
}

function onPinUp(e: PointerEvent, h: VehicleHotspot) {
  const d = pinDrag
  pinDrag = null
  const v = currentView.value
  if (!d || !v) return
  const o = dragOverride.value
  dragOverride.value = null
  if (d.moved && props.editable) {
    if (o && o.id === h.id) emit('move-hotspot', { viewId: v.id, id: h.id, x: o.x, y: o.y })
  } else {
    selectPin(h)
  }
}

function onPinCancel() { pinDrag = null; dragOverride.value = null }

function selectPin(h: VehicleHotspot) {
  const v = currentView.value
  if (!v) return
  if (props.editable) emit('select-hotspot', { viewId: v.id, id: h.id })
  else activePinId.value = activePinId.value === h.id ? null : h.id
}

// ── Lifecycle ──
let hintTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    ro = new ResizeObserver(measure)
    ro.observe(rootEl.value)
  }
  if (props.index != null) { pos = idx.value = wrapIndex(props.index, sorted.value.length) }
  hintTimer = setTimeout(() => { showHint.value = false }, 4500)
})

// The editor drives the frame from its dock.
watch(() => props.index, (i) => {
  if (i == null || !sorted.value.length) return
  const next = wrapIndex(i, sorted.value.length)
  if (next === idx.value) return
  stopInertia()
  pos = idx.value = next
  activePinId.value = null
})

watch(() => sorted.value.length, (n) => {
  if (idx.value >= n) { idx.value = Math.max(0, n - 1); pos = idx.value }
})

onBeforeUnmount(() => { stopInertia(); ro?.disconnect(); if (hintTimer) clearTimeout(hintTimer) })

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
.vsv.is-placing, .vsv.is-placing:active { cursor: crosshair; }
.vsv:focus-visible { box-shadow: inset 0 0 0 3px #fff; }
.vsv__frame {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  opacity: 0; pointer-events: none;
}
.vsv__frame.is-contain { object-fit: contain; }
.vsv__frame.is-active { opacity: 1; }
.vsv__empty {
  position: absolute; inset: 0; display: grid; place-items: center;
  color: rgba(255,255,255,0.5); font-size: 13px;
}

.vsv__pins { position: absolute; inset: 0; pointer-events: none; }
/* 44px hit area around a 28px visible pin. */
.vsv__pin {
  position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; padding: 0;
  display: grid; place-items: center; border: 0; background: transparent; cursor: pointer;
  pointer-events: auto; touch-action: none; color: #0b0b0c;
}
.vsv__pin::before {
  content: ''; position: absolute; width: 28px; height: 28px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 0 2px rgba(0,0,0,0.45);
  transition: transform 120ms;
}
.vsv__pin > svg { position: relative; }
.vsv__pin--damage::before { background: #ffb020; }
.vsv.is-edit .vsv__pin { cursor: move; }
.vsv__pin:hover::before { transform: scale(1.12); }
.vsv__pin.is-selected::before { box-shadow: 0 0 0 2px rgba(0,0,0,0.45), 0 0 0 5px #fff; }
.vsv__pin:focus-visible::before { box-shadow: 0 0 0 2px #000, 0 0 0 5px #fff; }
.vsv__pin.is-hidden { opacity: 0; pointer-events: none; }

.vsv__card {
  position: absolute; left: 12px; right: 12px; bottom: 76px; max-width: 360px; margin: 0 auto;
  padding: 14px 44px 14px 14px; border-radius: 12px; background: #fff; color: #111;
  box-shadow: 0 6px 24px rgba(0,0,0,0.35); cursor: default;
}
.vsv__card-close {
  position: absolute; top: 2px; right: 2px; width: 44px; height: 44px; border: 0; background: transparent;
  color: #444; display: grid; place-items: center; cursor: pointer;
}
.vsv__card-kind { margin: 0 0 2px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #666; }
.vsv__card-title { margin: 0; font-size: 15px; font-weight: 800; }
.vsv__card-body { margin: 6px 0 0; font-size: 13px; line-height: 1.45; color: #333; }
.vsv__card-link {
  display: inline-flex; align-items: center; min-height: 44px; margin-top: 4px;
  font-size: 13px; font-weight: 700; color: #111; text-decoration: underline; text-underline-offset: 3px;
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
/* 44px tap target around a small visible dot. */
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
.vsv__label { color: #fff; font-size: 12px; font-weight: 700; white-space: nowrap; }
.vsv__progress {
  position: absolute; left: 0; right: 0; top: 0; height: 3px; background: #fff; opacity: 0.8;
  transform-origin: left; transition: transform 160ms;
}
@media (prefers-reduced-motion: reduce) {
  .vsv__dot::after, .vsv__progress, .vsv__pin::before { transition: none; }
}
@media (max-width: 420px) {
  .vsv__dot { width: 26px; }
}
</style>
