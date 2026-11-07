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
        <path :d="roundedPath(routePoints)" class="vc-route-casing" />
        <path
          :key="routeKey"
          :d="roundedPath(routePoints)"
          class="vc-route"
          :style="{ '--len': `${routeLen}px` }"
        />
      </template>
    </svg>

    <template v-if="loaded">
      <!-- Every place: a small dot, so the map shows what's searchable -->
      <button
        v-for="p in visibleDots" :key="p.id"
        type="button"
        class="vc-dot"
        :class="{ 'vc-dot--dim': dimOthers || (highlightIds && !highlightIds.has(p.id)), 'vc-dot--hi': highlightIds?.has(p.id) }"
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

      <!-- "You are here": the visitor's 360 view. Always drawn, at any zoom,
           also on dense floors where the other dots are culled. -->
      <span v-if="herePoint" class="vc-here" :style="at(herePoint)">
        <i />
        <b v-if="herePoint.label">{{ herePoint.label }}</b>
      </span>

      <div v-for="m in markers" :key="m.id" class="vc-marker" :class="`vc-marker--${m.tone}`" :style="at(m)">
        <span class="vc-marker__label">{{ m.label }}</span>
        <svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">
          <path d="M15 39C15 39 28 23.5 28 14A13 13 0 0 0 2 14C2 23.5 15 39 15 39Z" />
          <circle cx="15" cy="14" r="5" fill="#fff" />
        </svg>
      </div>
    </template>
    </div>

    <!-- Dense floor, zoomed out: shops aren't marked yet. A small nudge, gone once they are. -->
    <Transition name="vc-hint">
      <button
        v-if="showZoomHint"
        type="button"
        class="vc-hint"
        :style="{ bottom: `calc(${(insets?.bottom ?? 0) + 18}px + env(safe-area-inset-bottom, 0px))` }"
        @pointerdown.stop
        @click="zoomToDots"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>
        <span>Zoom in to see shops</span>
      </button>
    </Transition>

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
  /** The visitor's position ("You are here"); never hidden by dot culling. */
  herePoint?: (RoutePoint & { label?: string }) | null
  markers?: VenueCanvasMarker[]
  connectors?: VenueCanvasConnector[]
  /** Fade the other places' dots (a route or a place is in focus). */
  dimOthers?: boolean
  /** Places of the active category / search: those stay bright, the rest fade. */
  highlightIds?: Set<string> | null
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

// ── Dense floors: fewer dots on screen ──
// A floor with hundreds of places (a mall's ground floor) can't keep hundreds
// of positioned elements in step with a pinch — phones drop frames and the
// dots drift off the plan. So on those floors: no dots while zooming; zoomed
// far out, only the highlighted ones (a category / search); zoomed in, only
// those near the screen. Small floors keep every dot, always.
const DENSE = 150
/** Dots are worth showing from this zoom (× the whole-floor fit) on dense floors. */
const DOT_ZOOM = 2.2
const isDense = computed(() => props.places.length > DENSE)
const zooming = ref(false)
const fitScale = ref(0)
// What the culling last saw — updated when a gesture settles, not on every frame.
const seen = ref({ tx: 0, ty: 0, s: 1, vw: 0, vh: 0 })
let settleTimer = 0
function snapshot() {
  const el = rootEl.value
  seen.value = { tx: tx.value, ty: ty.value, s: s.value, vw: el?.clientWidth ?? 0, vh: el?.clientHeight ?? 0 }
}
/** A zoom is in progress; it counts as over 140 ms after the last change. */
function zoomingNow() {
  if (!isDense.value) return
  zooming.value = true
  clearTimeout(settleTimer)
  settleTimer = window.setTimeout(() => { zooming.value = false; snapshot() }, 140)
}
/** Zoomed out on a dense floor, with no highlighted dots showing: tell the visitor to zoom in. */
const showZoomHint = computed(() => {
  if (!loaded.value || !isDense.value || !fitScale.value) return false
  if (s.value >= fitScale.value * DOT_ZOOM) return false
  if (routePoints.value.length > 1 || props.dimOthers) return false // a route / place is in focus
  const hi = props.highlightIds
  return !(hi && hi.size > 0 && hi.size <= DENSE) // highlighted dots are already showing
})
function zoomToDots() {
  const el = rootEl.value
  if (!el || !fitScale.value) return
  const k = (fitScale.value * DOT_ZOOM * 1.2) / s.value
  const cx = el.clientWidth / 2, cy = el.clientHeight / 2
  animateTo({ s: s.value * k, tx: cx - (cx - tx.value) * k, ty: cy - (cy - ty.value) * k }, 450)
}
const visibleDots = computed(() => {
  const all = props.places
  if (!isDense.value) return all
  const hi = props.highlightIds
  if (zooming.value || !fitScale.value || seen.value.s < fitScale.value * DOT_ZOOM) {
    return hi && hi.size <= DENSE ? all.filter(p => hi.has(p.id)) : []
  }
  // Zoomed in: places within a screen of the viewport (so a drag doesn't outrun them).
  const { tx: x0, ty: y0, s: sc, vw, vh } = seen.value
  const w = W.value * sc, h = H.value * sc
  return all.filter((p) => {
    const px = p.x * w + x0, py = p.y * h + y0
    return px > -vw && px < vw * 2 && py > -vh && py < vh * 2
  })
})

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
/** Corner radius of the route line, in screen pixels. */
const ROUTE_CORNER = 14
/** The route as an SVG path with rounded corners (a polyline's sharp elbows look jagged). */
function roundedPath(list: RoutePoint[]): string {
  const p = list.map(q => ({ x: lx(q.x), y: ly(q.y) }))
  if (p.length < 2) return ''
  const f = (n: number) => n.toFixed(1)
  let d = `M${f(p[0].x)},${f(p[0].y)}`
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1], b = p[i], c = p[i + 1]
    const ab = Math.hypot(b.x - a.x, b.y - a.y), bc = Math.hypot(c.x - b.x, c.y - b.y)
    const r = Math.min(ROUTE_CORNER, ab / 2, bc / 2)
    if (r < 0.5) { d += `L${f(b.x)},${f(b.y)}`; continue }
    const p1 = { x: b.x + ((a.x - b.x) * r) / ab, y: b.y + ((a.y - b.y) * r) / ab }
    const p2 = { x: b.x + ((c.x - b.x) * r) / bc, y: b.y + ((c.y - b.y) * r) / bc }
    d += `L${f(p1.x)},${f(p1.y)}Q${f(b.x)},${f(b.y)} ${f(p2.x)},${f(p2.y)}`
  }
  const z = p[p.length - 1]
  return `${d}L${f(z.x)},${f(z.y)}`
}
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
  fitScale.value = v.fitS
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
  if (reduce || !loaded.value) { s.value = to.s; tx.value = to.tx; ty.value = to.ty; snapshot(); return }
  const t0 = performance.now()
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const step = (now: number) => {
    if (token !== anim) return
    const k = ease(Math.min(1, (now - t0) / ms))
    s.value = from.s * Math.pow(to.s / from.s, k)
    zoomingNow()
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
  snapshot()
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
  zoomingNow()
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
// Pinch: the plan point between the fingers when it began stays between
// them, at start zoom × finger spread change — recomputed from the start on
// every move, so per-finger events can't make it drift or wobble.
let pinch: { d: number; s: number; px: number; py: number } | null = null
function startPinch() {
  const [a, b] = [...pointers.values()]
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
  pinch = { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), s: s.value, px: (mx - tx.value) / s.value, py: (my - ty.value) / s.value }
}
let lastTap = 0

function onPointerDown(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button')) return
  anim++
  try { rootEl.value?.setPointerCapture(e.pointerId) } catch { /* noop */ }
  const p = rel(e)
  pointers.set(e.pointerId, p)
  if (pointers.size === 1) { downAt = p; moved = false }
  if (pointers.size === 2) startPinch()
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
  } else if (pointers.size === 2 && pinch) {
    moved = true
    const [a, b] = [...pointers.values()]
    s.value = Math.min(maxS, Math.max(minS, pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d))
    tx.value = (a.x + b.x) / 2 - pinch.px * s.value
    ty.value = (a.y + b.y) / 2 - pinch.py * s.value
    clamp()
    zoomingNow()
  }
}
function onPointerUp(e: PointerEvent) {
  const had = pointers.delete(e.pointerId)
  if (pointers.size < 2) pinch = null
  if (pointers.size === 0) { dragging.value = false; if (moved) snapshot() }
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
    ro = new ResizeObserver(() => { if (first) { first = false; return } if (loaded.value) { clamp(); snapshot() } })
    ro.observe(rootEl.value)
  }
})
onBeforeUnmount(() => { ro?.disconnect(); anim++; clearTimeout(settleTimer) })
</script>

<style scoped>
.vc-root { position: absolute; inset: 0; overflow: hidden; background: #f3f4f6; touch-action: none; user-select: none; cursor: grab; }
.vc-root--dragging { cursor: grabbing; }
.vc-stage { position: absolute; left: 0; top: 0; width: 0; height: 0; will-change: transform; }
.vc-img { position: absolute; left: 0; top: 0; transform-origin: 0 0; transform: scale(var(--s)); max-width: none; pointer-events: none; }
/* Anything placed with at(): its plan pixel × the current zoom, sub-pixel exact. */
.vc-dot, .vc-start, .vc-here, .vc-marker, .vc-connector { left: 0; top: 0; --at: translate(calc(var(--x) * var(--s) * 1px), calc(var(--y) * var(--s) * 1px)); transform: var(--at); }
.vc-svg { position: absolute; left: 0; top: 0; width: 1px; height: 1px; pointer-events: none; overflow: visible; }
.vc-route-casing { fill: none; stroke: #fff; stroke-width: 10; stroke-linecap: round; stroke-linejoin: round; opacity: 0.9; }
.vc-route {
  fill: none; stroke: #e11d48; stroke-width: 5.5; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: var(--len); stroke-dashoffset: var(--len);
  animation: vc-draw 1.4s ease-in-out 0.25s forwards;
}
@keyframes vc-draw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .vc-route { animation: none; stroke-dashoffset: 0; } }

/* Pins move with the plan: the app's global touch-device button rule
   (main.css, "faster tap feedback") would otherwise animate their position
   80ms behind the plan. */
.vc-dot, .vc-connector { transition-property: none; }
/* On touch, a finger landing on a dot still pans / pinches the map; a tap
   still picks the nearest place (onPointerUp). */
@media (pointer: coarse) { .vc-dot { pointer-events: none; } }
.vc-dot { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; padding: 0; border: 0; background: transparent; cursor: pointer; }
.vc-dot::after { content: ''; position: absolute; left: 7px; top: 7px; width: 8px; height: 8px; border-radius: 50%; background: #1d4ed8; box-shadow: 0 0 0 2px #fff; opacity: 0.55; transition: opacity 0.2s, transform 0.2s; }
.vc-dot:hover::after { opacity: 1; transform: scale(1.4); }
.vc-dot--dim::after { opacity: 0.18; }
.vc-dot--hi::after { opacity: 1; transform: scale(1.25); }

.vc-start { position: absolute; width: 0; height: 0; pointer-events: none; }
.vc-start i { position: absolute; left: -9px; top: -9px; width: 18px; height: 18px; border-radius: 50%; background: #2563eb; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.35); }
.vc-start::before { content: ''; position: absolute; left: -22px; top: -22px; width: 44px; height: 44px; border-radius: 50%; background: rgba(37,99,235,0.22); animation: vc-pulse 2s ease-out infinite; }
@keyframes vc-pulse { from { transform: scale(0.4); opacity: 1; } to { transform: scale(1.3); opacity: 0; } }

/* "You are here": bigger than the route's start dot, with a soft halo, a pulse and a label. */
.vc-here { position: absolute; width: 0; height: 0; pointer-events: none; z-index: 1; }
.vc-here::before { content: ''; position: absolute; left: -30px; top: -30px; width: 60px; height: 60px; border-radius: 50%; background: rgba(37,99,235,0.22); animation: vc-pulse 2.2s ease-out infinite; }
.vc-here::after { content: ''; position: absolute; left: -20px; top: -20px; width: 40px; height: 40px; border-radius: 50%; background: rgba(37,99,235,0.16); }
.vc-here i { position: absolute; left: -12px; top: -12px; width: 24px; height: 24px; box-sizing: border-box; border-radius: 50%; background: #2563eb; border: 4px solid #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.4); z-index: 1; }
.vc-here b { position: absolute; left: 0; top: 20px; transform: translateX(-50%); padding: 3px 9px; border-radius: 999px; background: #2563eb; color: #fff; font-size: 11.5px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.25); z-index: 1; }
@media (prefers-reduced-motion: reduce) { .vc-here::before { animation: none; } }

.vc-marker { position: absolute; width: 0; height: 0; pointer-events: none; }
.vc-marker svg { position: absolute; left: -15px; top: -40px; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.35)); }
.vc-marker--to path { fill: #e11d48; }
.vc-marker--sel path { fill: #1d4ed8; }
.vc-marker__label { position: absolute; left: 0; top: -66px; transform: translateX(-50%); padding: 4px 9px; border-radius: 8px; background: #fff; color: #111827; font-size: 12px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 10px rgba(0,0,0,0.2); max-width: 220px; overflow: hidden; text-overflow: ellipsis; }

.vc-connector { position: absolute; transform: var(--at) translate(-50%, -50%); display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border: 0; border-radius: 999px; background: #111827; color: #fff; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; box-shadow: 0 3px 12px rgba(0,0,0,0.3); }
.vc-connector__icon { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #e11d48; font-size: 13px; }

.vc-hint { position: absolute; left: 50%; transform: translateX(-50%); z-index: 3; display: inline-flex; align-items: center; gap: 8px; max-width: calc(100% - 32px); padding: 9px 16px 9px 12px; border: 1px solid rgba(255,255,255,0.14); border-radius: 999px; background: rgba(17, 20, 28, 0.86); color: #fff; font-size: 13px; font-weight: 700; white-space: nowrap; cursor: pointer; box-shadow: 0 6px 22px rgba(0,0,0,0.28); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.vc-hint svg { flex: none; animation: vc-hint-nudge 1.8s ease-in-out infinite; }
@keyframes vc-hint-nudge { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.22); } }
.vc-hint-enter-active, .vc-hint-leave-active { transition: opacity 0.25s, transform 0.25s; }
.vc-hint-enter-from, .vc-hint-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
@media (prefers-reduced-motion: reduce) { .vc-hint svg { animation: none; } .vc-hint-enter-active, .vc-hint-leave-active { transition: none; } }
.vc-zoom { position: absolute; right: calc(14px + env(safe-area-inset-right, 0px)); display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.18); z-index: 3; }
.vc-zoom button { width: 40px; height: 40px; border: 0; border-bottom: 1px solid #e5e7eb; background: #fff; color: #111827; font-size: 20px; cursor: pointer; display: grid; place-items: center; }
.vc-zoom button:last-child { border-bottom: 0; }
@media (max-width: 640px) { .vc-zoom { display: none; } }
.vc-loading { position: absolute; inset: 0; display: grid; place-items: center; z-index: 2; }
.vc-spin { width: 28px; height: 28px; border-radius: 50%; border: 3px solid #d1d5db; border-top-color: #1d4ed8; animation: vc-rot 0.8s linear infinite; }
@keyframes vc-rot { to { transform: rotate(360deg); } }
</style>
