<template>
  <div
    ref="rootEl"
    class="vc-root"
    :class="{ 'vc-root--dragging': dragging }"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div v-if="!loaded" class="vc-loading"><span class="vc-spin" /></div>

    <!-- One layer carries the plan and everything on it, moved by a single
         transform and one zoom variable (--s): panning and zooming change
         nothing inside, so pins can't lag or jitter against the plan. Only the
         image is scaled (one GPU texture, stays sharp); pins keep their size
         and sit at their plan pixel × --s. -->
    <div class="vc-stage" :style="stageStyle">
    <img
      ref="imgEl"
      :src="imageUrl"
      class="vc-img"
      :style="imgStyle"
      alt=""
      draggable="false"
      decoding="async"
      @load="onImgLoad"
    />

    <svg v-if="loaded" class="vc-svg" aria-hidden="true">
      <template v-if="routePoints.length > 1">
        <polyline :points="pts(routePoints)" class="vc-route-casing" />
        <polyline
          :key="routeKey"
          :points="pts(routePoints)"
          class="vc-route"
          :style="{ '--len': `${routeLen}px` }"
        />
      </template>
    </svg>

    <template v-if="loaded">
      <!-- Every place: a small dot, so the map shows what's searchable -->
      <button
        v-for="p in dots" :key="p.id"
        type="button"
        class="vc-dot"
        :class="{ 'vc-dot--dim': dimOthers }"
        :style="at(p)"
        :aria-label="p.name"
        :title="p.name"
        @click.stop="emit('place-click', p.id)"
      />

      <!-- Lift / escalator taken on this floor -->
      <button
        v-for="(c, i) in connectors" :key="`c${i}`"
        type="button"
        class="vc-connector"
        :style="at(c)"
        @click.stop="emit('connector-click', c.toFloorId)"
      >
        <span class="vc-connector__icon">{{ c.icon }}</span>
        <span class="vc-connector__label">{{ c.label }}</span>
      </button>

      <span v-if="startPoint" class="vc-start" :style="at(startPoint)"><i /></span>

      <div v-for="m in markers" :key="m.id" class="vc-marker" :class="`vc-marker--${m.tone}`" :style="at(m)">
        <span class="vc-marker__label">{{ m.label }}</span>
        <svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">
          <path d="M15 39C15 39 28 23.5 28 14A13 13 0 0 0 2 14C2 23.5 15 39 15 39Z" />
          <circle cx="15" cy="14" r="5" fill="#fff" />
        </svg>
      </div>
    </template>
    </div>

    <div class="vc-zoom" :style="{ bottom: `calc(${(insets?.bottom ?? 0) + 14}px + env(safe-area-inset-bottom, 0px))` }" @pointerdown.stop>
      <button type="button" aria-label="Zoom in" @click="zoomBy(1.5)">+</button>
      <button type="button" aria-label="Zoom out" @click="zoomBy(1 / 1.5)">−</button>
      <button type="button" aria-label="Whole floor" @click="fitAnimated()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { RoutePoint, VenuePlace } from '~/shared/utils/venue'

export interface VenueCanvasMarker { id: string; x: number; y: number; label: string; tone: 'to' | 'sel' }
export interface VenueCanvasConnector { x: number; y: number; label: string; icon: string; toFloorId: string }

const props = defineProps<{
  imageUrl: string
  width: number
  height: number
  places: VenuePlace[]
  /** This floor's part of the route (plan fractions). */
  routePoints?: RoutePoint[]
  startPoint?: RoutePoint | null
  markers?: VenueCanvasMarker[]
  connectors?: VenueCanvasConnector[]
  /** Fade the other places' dots (a route or a place is in focus). */
  dimOthers?: boolean
  /** Screen space covered by floating panels. */
  insets?: { top?: number; right?: number; bottom?: number; left?: number }
}>()

const emit = defineEmits<{
  (e: 'place-click', id: string): void
  (e: 'connector-click', floorId: string): void
  (e: 'map-click'): void
}>()

const rootEl = ref<HTMLElement | null>(null)
const imgEl = ref<HTMLImageElement | null>(null)
const loaded = ref(false)
const W = computed(() => props.width)
const H = computed(() => props.height)
const routePoints = computed(() => props.routePoints ?? [])
const markers = computed(() => props.markers ?? [])
const connectors = computed(() => props.connectors ?? [])
const dots = computed(() => props.places)

// screen = translate(tx, ty) · scale(s) · image px
const s = ref(1), tx = ref(0), ty = ref(0)
let minS = 0.05, maxS = 8

const stageStyle = computed(() => ({ transform: `translate3d(${tx.value}px, ${ty.value}px, 0)`, '--s': s.value }))
const imgStyle = computed(() => ({ width: `${W.value}px`, height: `${H.value}px` }))

// Inside the stage (zoom only; the pan is the stage's own transform).
function lx(x: number) { return x * W.value * s.value }
function ly(y: number) { return y * H.value * s.value }
// On screen (hit-testing taps).
function sx(x: number) { return lx(x) + tx.value }
function sy(y: number) { return ly(y) + ty.value }
function pts(list: RoutePoint[]) { return list.map(p => `${lx(p.x).toFixed(1)},${ly(p.y).toFixed(1)}`).join(' ') }
// Plan pixels only — independent of zoom, so pins never re-render while zooming.
function at(p: { x: number; y: number }) { return { '--x': p.x * W.value, '--y': p.y * H.value } }

// The draw-on animation replays when the route changes, not on every pan.
const routeKey = computed(() => routePoints.value.map(p => `${p.x},${p.y}`).join(';'))
const routeLen = computed(() => {
  let len = 0
  const r = routePoints.value
  for (let i = 1; i < r.length; i++) len += Math.hypot(sx(r[i].x) - sx(r[i - 1].x), sy(r[i].y) - sy(r[i - 1].y))
  return Math.ceil(len) + 10
})

function viewport() {
  const el = rootEl.value
  if (!el) return null
  const i = props.insets ?? {}
  const narrow = el.clientWidth < 768
  const l = narrow ? 0 : (i.left ?? 0), r = narrow ? 0 : (i.right ?? 0)
  const t = i.top ?? 0, b = i.bottom ?? 0
  const cw = Math.max(100, el.clientWidth - l - r), ch = Math.max(100, el.clientHeight - t - b)
  return { l, t, cw, ch, fitS: Math.min(cw / W.value, ch / H.value) }
}

function clamp() {
  const el = rootEl.value
  if (!el) return
  // Keep at least a third of the screen on the plan.
  const mx = el.clientWidth / 3, my = el.clientHeight / 3
  tx.value = Math.min(el.clientWidth - mx, Math.max(mx - W.value * s.value, tx.value))
  ty.value = Math.min(el.clientHeight - my, Math.max(my - H.value * s.value, ty.value))
}

interface View { s: number; tx: number; ty: number }
function fitView(): View | null {
  const v = viewport()
  if (!v) return null
  minS = v.fitS * 0.8
  maxS = Math.max(v.fitS * 12, 2)
  return { s: v.fitS, tx: v.l + (v.cw - W.value * v.fitS) / 2, ty: v.t + (v.ch - H.value * v.fitS) / 2 }
}

/** View framing some points (plan fractions), not closer than `maxZoom` × fit. */
function boundsView(list: RoutePoint[], maxZoom = 4): View | null {
  const v = viewport()
  if (!v || !list.length) return null
  const xs = list.map(p => p.x * W.value), ys = list.map(p => p.y * H.value)
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const bw = Math.max(W.value * 0.06, x1 - x0), bh = Math.max(H.value * 0.06, y1 - y0)
  const sc = Math.min(v.fitS * maxZoom, Math.max(v.fitS, Math.min(v.cw / bw, v.ch / bh) * 0.75))
  return { s: sc, tx: v.l + v.cw / 2 - ((x0 + x1) / 2) * sc, ty: v.t + v.ch / 2 - ((y0 + y1) / 2) * sc }
}

let anim = 0
function animateTo(to: View | null, ms = 650) {
  if (!to) return
  const token = ++anim
  const from = { s: s.value, tx: tx.value, ty: ty.value }
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce || !loaded.value) { s.value = to.s; tx.value = to.tx; ty.value = to.ty; return }
  const t0 = performance.now()
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const step = (now: number) => {
    if (token !== anim) return
    const k = ease(Math.min(1, (now - t0) / ms))
    s.value = from.s * Math.pow(to.s / from.s, k)
    tx.value = from.tx + (to.tx - from.tx) * k
    ty.value = from.ty + (to.ty - from.ty) * k
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function fitAnimated() { animateTo(fitView()) }
function focusPoints(list: RoutePoint[], maxZoom?: number) { animateTo(boundsView(list, maxZoom)) }


let pendingFocus: (() => void) | null = null
function onImgLoad() {
  loaded.value = true
  const f = fitView()
  if (f) { s.value = f.s; tx.value = f.tx; ty.value = f.ty }
  if (pendingFocus) { const run = pendingFocus; pendingFocus = null; requestAnimationFrame(run) }
}
/** Runs once the plan has loaded (immediately if it already has). */
function whenLoaded(fn: () => void) { if (loaded.value) fn(); else pendingFocus = fn }
defineExpose({ fitAnimated, focusPoints, whenLoaded })

// ── Gestures ──
function rel(e: { clientX: number; clientY: number }) {
  const r = rootEl.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
function zoomAt(factor: number, cx: number, cy: number) {
  anim++
  const next = Math.min(maxS, Math.max(minS, s.value * factor))
  const k = next / s.value
  tx.value = cx - (cx - tx.value) * k
  ty.value = cy - (cy - ty.value) * k
  s.value = next
  clamp()
}
function zoomBy(f: number) {
  const el = rootEl.value
  if (el) zoomAt(f, el.clientWidth / 2, el.clientHeight / 2)
}
function onWheel(e: WheelEvent) {
  const p = rel(e)
  zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y)
}

const pointers = new Map<number, { x: number; y: number }>()
const dragging = ref(false)
let downAt = { x: 0, y: 0 }
let moved = false
let pinchDist = 0
let lastTap = 0

function onPointerDown(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button')) return
  anim++
  try { rootEl.value?.setPointerCapture(e.pointerId) } catch { /* noop */ }
  const p = rel(e)
  pointers.set(e.pointerId, p)
  if (pointers.size === 1) { downAt = p; moved = false }
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
  }
}
function onPointerMove(e: PointerEvent) {
  const prev = pointers.get(e.pointerId)
  if (!prev) return
  const p = rel(e)
  pointers.set(e.pointerId, p)
  if (pointers.size === 1) {
    if (!moved && Math.hypot(p.x - downAt.x, p.y - downAt.y) < 6) return
    moved = true
    dragging.value = true
    tx.value += p.x - prev.x
    ty.value += p.y - prev.y
    clamp()
  } else if (pointers.size === 2) {
    moved = true
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (pinchDist > 0) zoomAt(d / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2)
    pinchDist = d
  }
}
function onPointerUp(e: PointerEvent) {
  const had = pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchDist = 0
  if (pointers.size === 0) dragging.value = false
  if (!had || moved || pointers.size) return
  const now = performance.now()
  const p = rel(e)
  if (now - lastTap < 300) { lastTap = 0; zoomAt(1.8, p.x, p.y); return }
  lastTap = now
  // A tap near a place picks it (dots are small on phones).
  let best: VenuePlace | null = null, bestD = 22
  for (const pl of props.places) {
    const d = Math.hypot(sx(pl.x) - p.x, sy(pl.y) - p.y)
    if (d < bestD) { bestD = d; best = pl }
  }
  if (best) emit('place-click', best.id)
  else emit('map-click')
}

let ro: ResizeObserver | null = null
onMounted(() => {
  // Server-rendered or cached: the image may have loaded before the listener existed.
  if (imgEl.value?.complete && imgEl.value.naturalWidth && !loaded.value) onImgLoad()
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    let first = true
    ro = new ResizeObserver(() => { if (first) { first = false; return } if (loaded.value) clamp() })
    ro.observe(rootEl.value)
  }
})
onBeforeUnmount(() => { ro?.disconnect(); anim++ })
</script>

<style scoped>
.vc-root { position: absolute; inset: 0; overflow: hidden; background: #f3f4f6; touch-action: none; user-select: none; cursor: grab; }
.vc-root--dragging { cursor: grabbing; }
.vc-stage { position: absolute; left: 0; top: 0; width: 0; height: 0; will-change: transform; }
.vc-img { position: absolute; left: 0; top: 0; transform-origin: 0 0; transform: scale(var(--s)); max-width: none; pointer-events: none; }
/* Anything placed with at(): its plan pixel × the current zoom, sub-pixel exact. */
.vc-dot, .vc-start, .vc-marker, .vc-connector { left: 0; top: 0; --at: translate(calc(var(--x) * var(--s) * 1px), calc(var(--y) * var(--s) * 1px)); transform: var(--at); }
.vc-svg { position: absolute; left: 0; top: 0; width: 1px; height: 1px; pointer-events: none; overflow: visible; }
.vc-route-casing { fill: none; stroke: #fff; stroke-width: 10; stroke-linecap: round; stroke-linejoin: round; opacity: 0.9; }
.vc-route {
  fill: none; stroke: #e11d48; stroke-width: 5.5; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: var(--len); stroke-dashoffset: var(--len);
  animation: vc-draw 1.4s ease-in-out 0.25s forwards;
}
@keyframes vc-draw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .vc-route { animation: none; stroke-dashoffset: 0; } }

.vc-dot { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; padding: 0; border: 0; background: transparent; cursor: pointer; }
.vc-dot::after { content: ''; position: absolute; left: 7px; top: 7px; width: 8px; height: 8px; border-radius: 50%; background: #1d4ed8; box-shadow: 0 0 0 2px #fff; opacity: 0.55; transition: opacity 0.2s, transform 0.2s; }
.vc-dot:hover::after { opacity: 1; transform: scale(1.4); }
.vc-dot--dim::after { opacity: 0.18; }

.vc-start { position: absolute; width: 0; height: 0; pointer-events: none; }
.vc-start i { position: absolute; left: -9px; top: -9px; width: 18px; height: 18px; border-radius: 50%; background: #2563eb; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.35); }
.vc-start::before { content: ''; position: absolute; left: -22px; top: -22px; width: 44px; height: 44px; border-radius: 50%; background: rgba(37,99,235,0.22); animation: vc-pulse 2s ease-out infinite; }
@keyframes vc-pulse { from { transform: scale(0.4); opacity: 1; } to { transform: scale(1.3); opacity: 0; } }

.vc-marker { position: absolute; width: 0; height: 0; pointer-events: none; }
.vc-marker svg { position: absolute; left: -15px; top: -40px; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.35)); }
.vc-marker--to path { fill: #e11d48; }
.vc-marker--sel path { fill: #1d4ed8; }
.vc-marker__label { position: absolute; left: 0; top: -66px; transform: translateX(-50%); padding: 4px 9px; border-radius: 8px; background: #fff; color: #111827; font-size: 12px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 10px rgba(0,0,0,0.2); max-width: 220px; overflow: hidden; text-overflow: ellipsis; }

.vc-connector { position: absolute; transform: var(--at) translate(-50%, -50%); display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border: 0; border-radius: 999px; background: #111827; color: #fff; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; box-shadow: 0 3px 12px rgba(0,0,0,0.3); }
.vc-connector__icon { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #e11d48; font-size: 13px; }

.vc-zoom { position: absolute; right: calc(14px + env(safe-area-inset-right, 0px)); display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.18); z-index: 3; }
.vc-zoom button { width: 40px; height: 40px; border: 0; border-bottom: 1px solid #e5e7eb; background: #fff; color: #111827; font-size: 20px; cursor: pointer; display: grid; place-items: center; }
.vc-zoom button:last-child { border-bottom: 0; }
@media (max-width: 640px) { .vc-zoom { display: none; } }
.vc-loading { position: absolute; inset: 0; display: grid; place-items: center; z-index: 2; }
.vc-spin { width: 28px; height: 28px; border-radius: 50%; border: 3px solid #d1d5db; border-top-color: #1d4ed8; animation: vc-rot 0.8s linear infinite; }
@keyframes vc-rot { to { transform: rotate(360deg); } }
</style>
