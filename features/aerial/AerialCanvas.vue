<template>
  <div
    ref="rootEl"
    class="ac-root"
    :class="{ 'ac-root--crosshair': crosshair, 'ac-root--dragging': dragging, 'ac-root--coop': coopActive }"
    @wheel="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick.prevent="onDblClick"
  >
    <div v-if="!loaded" class="ac-loading"><span class="ac-spin" /></div>

    <!-- Soft blurred copy of the photo behind it: when the photo's shape doesn't
         match the screen (wide drone shot on a tall phone) the gaps show this
         instead of black. -->
    <img v-if="imageUrl" :src="imageUrl" class="ac-backdrop" alt="" aria-hidden="true" draggable="false" />

    <!-- Embedded on a website: tell visitors how to move the map without
         hijacking the page's own scroll. -->
    <Transition name="ac-notice">
      <div v-if="coopNotice" class="ac-coop" aria-live="polite">{{ coopNotice }}</div>
    </Transition>

    <div class="ac-stage" :style="stageStyle">
      <img
        ref="imgEl"
        :src="imageUrl"
        class="ac-img"
        alt=""
        draggable="false"
        decoding="async"
        @load="onImgLoad"
      />

      <svg v-if="W && H" class="ac-svg" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none">
        <!-- Paint order: estate outlines, plots, road arrows -->
        <polygon
          v-for="s in zones" :key="s.id"
          :points="pts(s.points)"
          class="ac-zone" :class="{ 'ac-sel': s.id === selectedId }"
          vector-effect="non-scaling-stroke"
        />
        <polygon
          v-for="s in plots" :key="s.id"
          :points="pts(s.points)"
          :data-shape-id="s.id"
          class="ac-plot" :class="{ 'ac-sel': s.id === selectedId }"
          :style="{ fill: AERIAL_STATUS[s.status || 'available'].fill }"
          vector-effect="non-scaling-stroke"
        />
        <polygon
          v-for="s in roads" :key="s.id"
          :points="pts(arrowOutline(s.points, W, H, s.arrow_width ?? 1) || [])"
          :data-shape-id="s.id"
          class="ac-road" :class="{ 'ac-sel': s.id === selectedId }"
          vector-effect="non-scaling-stroke"
        />

        <!-- In-progress drawing -->
        <template v-if="draft && draft.points.length">
          <polygon
            v-if="draft.kind === 'road' && draft.points.length >= 2"
            :points="pts(arrowOutline(draft.points, W, H, 1) || [])"
            class="ac-draft-arrow" vector-effect="non-scaling-stroke"
          />
          <polygon
            v-else-if="draft.kind !== 'road' && draft.points.length >= 3"
            :points="pts(draft.points)" class="ac-draft" vector-effect="non-scaling-stroke"
          />
          <polyline v-else :points="pts(draft.points)" class="ac-draft ac-draft--line" vector-effect="non-scaling-stroke" />
        </template>
      </svg>

      <!-- Labels / pins: positioned in image space, counter-scaled to stay readable -->
      <template v-if="W && H">
        <button
          v-for="l in labels" :key="l.id"
          type="button"
          class="ac-label"
          :class="[`ac-label--${l.kind}`, { 'ac-label--sel': l.id === selectedId }]"
          :data-shape-id="l.id"
          :style="labelStyle(l.at)"
          :aria-label="l.aria"
        >
          <template v-if="l.kind === 'beacon'">
            <svg viewBox="0 0 24 32" width="18" height="24" aria-hidden="true">
              <path d="M7 8 L17 8 L19 29 L5 29 Z" fill="#f8fafc" stroke="rgba(0,0,0,0.55)" stroke-width="1.2"/>
              <path d="M6.2 17 L17.8 17 L18.4 23 L5.6 23 Z" fill="#ef4444"/>
              <rect x="6" y="4" width="12" height="4.5" rx="1" fill="#e2e8f0" stroke="rgba(0,0,0,0.55)" stroke-width="1.2"/>
            </svg>
            <span class="ac-label__under">{{ l.text }}</span>
          </template>
          <template v-else>
            <span v-if="l.kind === 'plot'" class="ac-dot" :style="{ background: l.color }" />
            <span>{{ l.text }}</span>
          </template>
        </button>

        <span
          v-for="(p, i) in draft?.points || []" :key="`d${i}`"
          class="ac-vertex" :class="{ 'ac-vertex--first': i === 0, 'ac-vertex--closable': i === 0 && closable }"
          :data-draft-index="i"
          :title="i === 0 && closable ? 'Click to close the shape' : 'Click to remove this corner'"
          :style="labelStyle(p)"
        />
      </template>
    </div>

    <div class="ac-zoom" :style="zoomStyle" @pointerdown.stop>
      <button type="button" aria-label="Zoom in" @click="zoomBy(1.5)">+</button>
      <button type="button" aria-label="Zoom out" @click="zoomBy(1 / 1.5)">−</button>
      <button type="button" aria-label="Fit photo" @click="fit()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  AERIAL_STATUS, arrowOutline, shapeAnchor,
  type AerialIntro, type AerialPoint, type AerialShape, type AerialShapeKind, type CameraView,
} from '~/shared/utils/aerialGeometry'

const props = defineProps<{
  imageUrl: string
  width?: number | null
  height?: number | null
  shapes: AerialShape[]
  selectedId?: string | null
  crosshair?: boolean
  draft?: { kind: AerialShapeKind; points: AerialPoint[] } | null
  /** First draft vertex can be clicked to close the shape. */
  closable?: boolean
  /** Screen space covered by floating UI; the photo fits inside what's left. */
  insets?: { top?: number; right?: number; bottom?: number; left?: number }
  /** 'auto' (public): fill the screen when shapes match, else whole photo. 'contain' (editor): always whole photo. */
  fitMode?: 'auto' | 'contain'
}>()

const emit = defineEmits<{
  (e: 'canvas-click', p: AerialPoint): void
  (e: 'shape-click', id: string): void
  (e: 'close-draft'): void
  (e: 'remove-draft-point', index: number): void
  (e: 'ready', size: { width: number; height: number }): void
  /** First touch / drag / scroll — hides the "how to move" hint, stops the intro. */
  (e: 'interact'): void
}>()

const rootEl = ref<HTMLElement | null>(null)
const loaded = ref(false)
const natW = ref(0), natH = ref(0)
const W = computed(() => props.width || natW.value)
const H = computed(() => props.height || natH.value)

// View transform: screen = translate(tx, ty) · scale(s) · image px
const s = ref(1), tx = ref(0), ty = ref(0)
let fitted = false
let minS = 0.1, maxS = 8

const stageStyle = computed(() => ({
  width: `${W.value}px`,
  height: `${H.value}px`,
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${s.value})`,
}))

// Keep the zoom buttons clear of floating panels (editor side panel, photo strip).
const vw = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const zoomStyle = computed(() => {
  const i = props.insets ?? {}
  const narrow = vw.value < 768
  return { right: `${(narrow ? 0 : (i.right ?? 0)) + 14}px`, bottom: `calc(${(i.bottom ?? 0) + 14}px + env(safe-area-inset-bottom, 0px))` }
})

const zones = computed(() => props.shapes.filter(x => x.kind === 'zone' && x.points.length >= 3))
const plots = computed(() => props.shapes.filter(x => x.kind === 'plot' && x.points.length >= 3))
const roads = computed(() => props.shapes.filter(x => x.kind === 'road' && x.points.length >= 2))

const labels = computed(() => props.shapes
  .filter(x => x.points.length)
  .map(x => {
    const num = x.kind === 'plot' ? /^plot\s*#?\s*(\d+)$/i.exec((x.label || '').trim())?.[1] : undefined
    const text = num ?? x.label ?? (x.kind === 'plot' ? 'Plot' : x.kind === 'zone' ? 'Estate' : x.kind === 'road' ? 'Road' : 'Beacon')
    const status = AERIAL_STATUS[x.status || 'available']
    return {
      id: x.id,
      kind: x.kind,
      text,
      color: status.color,
      at: shapeAnchor(x, W.value, H.value),
      aria: x.kind === 'plot' ? `${x.label || 'Plot'}, ${status.label}` : (x.label || x.kind),
    }
  }))

function pts(list: AerialPoint[]): string {
  return list.map(p => `${(p.x * W.value).toFixed(1)},${(p.y * H.value).toFixed(1)}`).join(' ')
}

function labelStyle(p: AerialPoint) {
  return {
    left: `${p.x * W.value}px`,
    top: `${p.y * H.value}px`,
    transform: `translate(-50%, -50%) scale(${1 / s.value})`,
  }
}

const imgEl = ref<HTMLImageElement | null>(null)

function onImgLoad(e: Event | { target: HTMLImageElement }) {
  const img = e.target as HTMLImageElement
  natW.value = img.naturalWidth
  natH.value = img.naturalHeight
  loaded.value = true
  // Only fit on first load: swapping to a lighter copy of the same photo
  // (background upload) must not reset the user's zoom/pan.
  if (!fitted) {
    fitted = true
    requestAnimationFrame(() => {
      fit()
      if (introRequested) { introRequested = false; void playIntro(pendingIntro) }
    })
  }
  emit('ready', { width: img.naturalWidth, height: img.naturalHeight })
}

/**
 * The usable part of the screen (minus floating panels) and the base scale.
 *
 * Base scale is picked from the photo's shape vs the screen's shape:
 *  - shapes close (≤ ~20% would be cropped, e.g. 16:9 photo on a 16:10 laptop,
 *    4:3 on an iPad) → "cover": the photo fills the screen edge to edge;
 *  - shapes very different (16:9 drone shot on a 9:16 phone, a portrait shot
 *    on a desktop) → "contain": the whole photo is visible and the spare space
 *    shows the blurred backdrop, never black.
 * The editor always uses contain so every corner can be drawn on.
 */
function viewport() {
  const el = rootEl.value
  if (!el || !W.value || !H.value) return null
  const i = props.insets ?? {}
  const narrow = el.clientWidth < 768 // floating panels stack differently on phones
  const l = narrow ? 0 : (i.left ?? 0), r = narrow ? 0 : (i.right ?? 0)
  const t = i.top ?? 0, b = i.bottom ?? 0
  const cw = Math.max(100, el.clientWidth - l - r), ch = Math.max(100, el.clientHeight - t - b)
  const contain = Math.min(cw / W.value, ch / H.value)
  const cover = Math.max(cw / W.value, ch / H.value)
  const useCover = props.fitMode !== 'contain' && contain / cover >= 0.8
  return { l, t, cw, ch, fitS: useCover ? cover : contain }
}

/**
 * Keep the photo on screen. Per axis:
 *  - bigger than the whole canvas → edges pinned to the canvas (no strip of
 *    backdrop even behind translucent bars);
 *  - bigger than the usable area only → edges pinned to the usable area;
 *  - smaller → centred in the usable area (gaps show the blurred backdrop).
 */
function clamp() {
  const v = viewport()
  const el = rootEl.value
  if (!v || !el) return
  const axis = (pos: number, size: number, start: number, len: number, full: number) => {
    if (size >= full) return Math.min(0, Math.max(full - size, pos))
    if (size >= len) return Math.min(start, Math.max(start + len - size, pos))
    return start + (len - size) / 2
  }
  tx.value = axis(tx.value, W.value * s.value, v.l, v.cw, el.clientWidth)
  ty.value = axis(ty.value, H.value * s.value, v.t, v.ch, el.clientHeight)
}

let lastVp: ReturnType<typeof viewport> = null

function fit() {
  const v = viewport()
  if (!v) return
  minS = v.fitS // never zoom out past the fit — that's where black edges came from
  maxS = Math.max(v.fitS * 10, 2)
  s.value = v.fitS
  tx.value = v.l + (v.cw - W.value * v.fitS) / 2
  ty.value = v.t + (v.ch - H.value * v.fitS) / 2
  lastVp = v
}

/**
 * Container resized (phone rotation, mobile address bar sliding, window
 * resize): keep what the visitor was looking at instead of re-fitting, which
 * used to throw away their zoom every time the URL bar moved on iPhone.
 */
function onResize() {
  const old = lastVp
  const v = viewport()
  if (!v) return
  if (!old) { fit(); return }
  const cx = (old.l + old.cw / 2 - tx.value) / s.value / W.value
  const cy = (old.t + old.ch / 2 - ty.value) / s.value / H.value
  const zoom = s.value / old.fitS
  minS = v.fitS
  maxS = Math.max(v.fitS * 10, 2)
  lastVp = v
  applyView({ cx, cy, zoom })
}

// ── Camera views: { cx, cy } = photo point at screen centre, zoom × "whole photo" ──
const round4 = (n: number) => Math.round(n * 1e4) / 1e4

function getView(): CameraView | null {
  const v = viewport()
  if (!v) return null
  const sx = v.l + v.cw / 2, sy = v.t + v.ch / 2
  return {
    cx: round4((sx - tx.value) / s.value / W.value),
    cy: round4((sy - ty.value) / s.value / H.value),
    zoom: round4(s.value / v.fitS),
  }
}

function applyView(view: CameraView) {
  const v = viewport()
  if (!v) return
  const sc = Math.min(maxS, Math.max(minS, v.fitS * view.zoom))
  s.value = sc
  tx.value = v.l + v.cw / 2 - view.cx * W.value * sc
  ty.value = v.t + v.ch / 2 - view.cy * H.value * sc
  clamp()
}

/** View framing all plots (or every shape), so buyers land on the properties. */
function shapesView(): CameraView | null {
  const v = viewport()
  const pts = (props.shapes.some(x => x.kind === 'plot') ? props.shapes.filter(x => x.kind === 'plot') : props.shapes)
    .flatMap(x => x.points)
  if (!v || !pts.length) return null
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(1, Math.max(...xs))
  const y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(1, Math.max(...ys))
  const bw = Math.max(0.04, x1 - x0) * W.value, bh = Math.max(0.04, y1 - y0) * H.value
  // Fill ~80% of the screen with the plots, never zoom out past the whole photo.
  const zoom = Math.max(1, Math.min(6, Math.min(v.cw / bw, v.ch / bh) * 0.8 / v.fitS))
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, zoom }
}

// ── Intro: glide start → end, then a slow drift until the visitor touches it ──
let animToken = 0
let introRunning = false
let pendingIntro: AerialIntro | null = null
let introRequested = false
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function stopMotion() { animToken++; introRunning = false }

function animateView(from: CameraView, to: CameraView, ms: number, token: number): Promise<boolean> {
  return new Promise(resolve => {
    const t0 = performance.now()
    const step = (now: number) => {
      if (token !== animToken) return resolve(false)
      const k = easeInOut(Math.min(1, (now - t0) / ms))
      // Zoom interpolated geometrically so the glide feels like constant speed.
      applyView({ cx: lerp(from.cx, to.cx, k), cy: lerp(from.cy, to.cy, k), zoom: from.zoom * Math.pow(to.zoom / from.zoom, k) })
      if (k < 1) requestAnimationFrame(step); else resolve(true)
    }
    requestAnimationFrame(step)
  })
}

/**
 * Plays the buyer intro. `intro` comes from the editor's "Set start / end";
 * without it: whole photo → the plots. Any touch, drag, scroll or zoom click stops it.
 */
async function playIntro(intro?: AerialIntro | null) {
  if (!loaded.value || !fitted) { pendingIntro = intro ?? null; introRequested = true; return }
  const token = ++animToken
  introRunning = true
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const start = intro?.start ?? { cx: 0.5, cy: 0.5, zoom: 1 }
  const end = intro?.end ?? shapesView() ?? { cx: 0.5, cy: 0.5, zoom: 1.25 }
  applyView(reduce ? end : start)
  if (reduce) { introRunning = false; return }
  await new Promise(r => setTimeout(r, 700))
  if (token !== animToken) return
  if (!(await animateView(start, end, 3600, token))) return
  // Gentle hover: a slow figure-of-eight drift around the end view.
  const t0 = performance.now()
  const drift = (now: number) => {
    if (token !== animToken) return
    const t = (now - t0) / 1000
    const amp = 0.035 / end.zoom
    applyView({ cx: end.cx + Math.sin(t / 5) * amp, cy: end.cy + Math.sin(t / 2.5) * amp * 0.5, zoom: end.zoom * (1 + Math.sin(t / 7) * 0.04) })
    requestAnimationFrame(drift)
  }
  requestAnimationFrame(drift)
}

/** Smoothly move to a saved view (editor "Preview"). */
async function goToView(view: CameraView) {
  const from = getView()
  const token = ++animToken
  if (from) await animateView(from, view, 1200, token)
}

function zoomAt(factor: number, cx: number, cy: number) {
  const next = Math.min(maxS, Math.max(minS, s.value * factor))
  const k = next / s.value
  tx.value = cx - (cx - tx.value) * k
  ty.value = cy - (cy - ty.value) * k
  s.value = next
  clamp()
}

function zoomBy(factor: number) {
  const el = rootEl.value
  if (!el) return
  zoomAt(factor, el.clientWidth / 2, el.clientHeight / 2)
}

/** Centre and zoom to a shape (used when a plot is picked from a list). */
function focusShape(id: string) {
  const shape = props.shapes.find(x => x.id === id)
  const el = rootEl.value
  if (!shape || !el || !W.value) return
  const xs = shape.points.map(p => p.x * W.value), ys = shape.points.map(p => p.y * H.value)
  const bw = Math.max(40, Math.max(...xs) - Math.min(...xs)), bh = Math.max(40, Math.max(...ys) - Math.min(...ys))
  const target = Math.min(maxS, Math.min(el.clientWidth / (bw * 3), el.clientHeight / (bh * 3)), Math.max(s.value, minS))
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2
  s.value = Math.max(target, s.value)
  tx.value = el.clientWidth / 2 - cx * s.value
  ty.value = el.clientHeight / 2 - cy * s.value
  clamp()
}

defineExpose({ fit, focusShape, getView, goToView, playIntro, stopMotion })

function rel(e: { clientX: number; clientY: number }) {
  const r = rootEl.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function userTook() {
  introRequested = false
  if (introRunning) stopMotion()
  emit('interact')
}

function onWheel(e: WheelEvent) {
  if (coopActive.value && !e.ctrlKey && !e.metaKey) {
    // Embedded on someone's page: let the page scroll; explain how to zoom.
    showCoop(navigator.platform?.toLowerCase().includes('mac') ? 'Use ⌘ + scroll to zoom the map' : 'Use Ctrl + scroll to zoom the map')
    return
  }
  e.preventDefault()
  userTook()
  const p = rel(e)
  // Trackpad pinch arrives as ctrl+wheel with small deltas — same formula works.
  zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y)
}

function onDblClick(e: MouseEvent) {
  if (props.crosshair) return // double-click while drawing would add points, not zoom
  const p = rel(e)
  zoomAt(1.8, p.x, p.y)
}

// ── Pointer: pan, pinch, click ──────────────────────────────
const pointers = new Map<number, { x: number; y: number }>()
let downAt = { x: 0, y: 0, t: 0 }
let moved = false
let pinchDist = 0
let pinchMid: { x: number; y: number } | null = null
let lastTap = { t: 0, x: 0, y: 0 }
const dragging = ref(false)

function onPointerDown(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('.ac-zoom')) { userTook(); return }
  // Embedded + one finger: that's the visitor scrolling the page, not the map.
  if (coopActive.value && e.pointerType === 'touch' && pointers.size === 0) {
    pointers.set(e.pointerId, rel(e))
    downAt = { ...rel(e), t: performance.now() }
    moved = false
    return
  }
  userTook()
  // Capture can throw (pointer already gone, synthetic events) — never let it
  // abort the gesture.
  try { rootEl.value?.setPointerCapture(e.pointerId) } catch { /* noop */ }
  pointers.set(e.pointerId, rel(e))
  if (pointers.size === 1) {
    downAt = { ...rel(e), t: performance.now() }
    moved = false
  } else if (pointers.size === 2) {
    userTook()
    const [a, b] = [...pointers.values()]
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
    pinchMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    moved = true // a pinch is never a click
  }
}

function onPointerMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return
  const prev = pointers.get(e.pointerId)!
  const cur = rel(e)
  pointers.set(e.pointerId, cur)
  if (pointers.size === 1) {
    if (!moved && Math.hypot(cur.x - downAt.x, cur.y - downAt.y) > 6) {
      moved = true
      if (coopActive.value && e.pointerType === 'touch') showCoop('Use two fingers to move the map')
    }
    if (moved && !(coopActive.value && e.pointerType === 'touch')) {
      dragging.value = true
      tx.value += cur.x - prev.x
      ty.value += cur.y - prev.y
      clamp()
    }
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    // Two fingers both pan (midpoint moves) and zoom (distance changes).
    if (pinchMid) { tx.value += mid.x - pinchMid.x; ty.value += mid.y - pinchMid.y }
    if (pinchDist > 0) zoomAt(d / pinchDist, mid.x, mid.y)
    else clamp()
    pinchDist = d
    pinchMid = mid
  }
}

function onPointerUp(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return
  pointers.delete(e.pointerId)
  if (pointers.size === 1) {
    // Lifted one finger of a pinch: continue as a one-finger pan from here.
    pinchMid = null; pinchDist = 0
    return
  }
  if (pointers.size > 0) return
  pinchMid = null; pinchDist = 0
  dragging.value = false
  if (moved || e.type === 'pointercancel') return

  // Double-tap to zoom on touch (iOS doesn't reliably send dblclick).
  if (e.pointerType === 'touch' && !props.crosshair) {
    const p0 = rel(e), now = performance.now()
    if (now - lastTap.t < 300 && Math.hypot(p0.x - lastTap.x, p0.y - lastTap.y) < 30) {
      lastTap = { t: 0, x: 0, y: 0 }
      userTook()
      if (s.value > minS * 2.5) fit(); else zoomAt(2, p0.x, p0.y)
      return
    }
    lastTap = { t: now, x: p0.x, y: p0.y }
  }

  // Pointer capture retargets events to the root, so hit-test the real element.
  const target = (document.elementFromPoint(e.clientX, e.clientY) ?? e.target) as HTMLElement
  // Draft corners: the first one closes the shape (once closable), any other
  // — or the first before that — is removed, to fix a misplaced click.
  const vertex = target.closest?.('[data-draft-index]') as HTMLElement | null
  if (vertex) {
    const index = Number(vertex.dataset.draftIndex)
    if (index === 0 && props.closable) emit('close-draft')
    else emit('remove-draft-point', index)
    return
  }
  const shapeEl = target.closest?.('[data-shape-id]') as HTMLElement | null
  if (shapeEl && !props.crosshair) { emit('shape-click', shapeEl.dataset.shapeId!); return }

  const p = rel(e)
  const x = (p.x - tx.value) / s.value / W.value
  const y = (p.y - ty.value) / s.value / H.value
  if (x < -0.02 || x > 1.02 || y < -0.02 || y > 1.02) return
  emit('canvas-click', { x, y })
}

// ── Embedded on another website (iframe): cooperative gestures ──
// One-finger drag / plain scroll belong to the host page; two fingers or
// Ctrl/⌘+scroll move the map. Not in the editor, and not in fullscreen.
const embedded = ref(false)
const isFullscreen = ref(false)
const coopActive = computed(() => embedded.value && !isFullscreen.value && props.fitMode !== 'contain')
const coopNotice = ref('')
let coopTimer: ReturnType<typeof setTimeout> | null = null
function showCoop(msg: string) {
  coopNotice.value = msg
  if (coopTimer) clearTimeout(coopTimer)
  coopTimer = setTimeout(() => { coopNotice.value = '' }, 1600)
}
function onFsChange() { isFullscreen.value = !!document.fullscreenElement }
// Two-finger touch inside an embed must not scroll/zoom the host page.
function onTouchMove(e: TouchEvent) { if (coopActive.value && e.touches.length >= 2) e.preventDefault() }

// ── Keyboard: arrows pan (Shift = faster), +/- zoom, 0 = whole photo ──
// Window-level like the 360 viewer, but only when this map is visible, the
// visitor isn't typing, and no other dialog sits on top of it.
function onKeyDown(e: KeyboardEvent) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
  const el = rootEl.value
  if (!el || !loaded.value || el.offsetParent === null) return
  const ae = document.activeElement as HTMLElement | null
  if (ae && (ae.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))) return
  const r = el.getBoundingClientRect()
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  const dlg = top?.closest('[role="dialog"]')
  if (dlg && !dlg.contains(el)) return
  const step = e.shiftKey ? 240 : 80
  let handled = true
  switch (e.key) {
    case 'ArrowLeft': tx.value += step; clamp(); break
    case 'ArrowRight': tx.value -= step; clamp(); break
    case 'ArrowUp': ty.value += step; clamp(); break
    case 'ArrowDown': ty.value -= step; clamp(); break
    case '+': case '=': zoomBy(1.25); break
    case '-': case '_': zoomBy(1 / 1.25); break
    case '0': fit(); break
    default: handled = false
  }
  if (handled) { e.preventDefault(); userTook() }
}

let ro: ResizeObserver | null = null
onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  try { embedded.value = window.self !== window.top } catch { embedded.value = true }
  // The app blocks overscroll globally (stops Android pull-to-refresh), which
  // inside an iframe also stops scrolls reaching the host page — relax it.
  if (embedded.value && props.fitMode !== 'contain') document.documentElement.classList.add('vw-embedded')
  onFsChange()
  document.addEventListener('fullscreenchange', onFsChange)
  rootEl.value?.addEventListener('touchmove', onTouchMove, { passive: false })
  // Server-rendered page: the photo can finish loading before hydration, so
  // its load event never reaches us — handle an already-complete image here.
  if (imgEl.value?.complete && imgEl.value.naturalWidth) onImgLoad({ target: imgEl.value })
  ro = new ResizeObserver(() => { vw.value = rootEl.value?.clientWidth ?? vw.value; if (loaded.value) onResize() })
  if (rootEl.value) ro.observe(rootEl.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  ro?.disconnect()
  document.removeEventListener('fullscreenchange', onFsChange)
  rootEl.value?.removeEventListener('touchmove', onTouchMove)
  if (coopTimer) clearTimeout(coopTimer)
})
// Same photo, new URL (local preview → lighter copy): keep showing it, no spinner.
watch(() => props.imageUrl, () => { if (!fitted) loaded.value = false })
</script>

<style scoped>
.ac-root {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0b0d12;
  touch-action: none;
  user-select: none;
  cursor: grab;
}
.ac-root--dragging { cursor: grabbing; }
/* Embedded: let one finger scroll the host page vertically/horizontally. */
.ac-root--coop { touch-action: pan-x pan-y; }
.ac-backdrop {
  position: absolute; inset: -8%; width: 116%; height: 116%; object-fit: cover;
  filter: blur(28px) brightness(0.55) saturate(1.1);
  pointer-events: none; user-select: none;
}
.ac-coop {
  position: absolute; inset: 0; z-index: 6; display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.45); color: #fff; font: 700 15px/1.3 -apple-system, 'Inter', sans-serif;
  text-align: center; padding: 20px; pointer-events: none;
}
.ac-notice-enter-active, .ac-notice-leave-active { transition: opacity 0.25s; }
.ac-notice-enter-from, .ac-notice-leave-to { opacity: 0; }
.ac-root--crosshair { cursor: crosshair; }
.ac-stage { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform; }
.ac-img { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.ac-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }

.ac-plot { stroke: rgba(255, 255, 255, 0.96); stroke-width: 2.5px; stroke-linejoin: round; cursor: pointer; transition: fill 0.15s; }
.ac-plot:hover { filter: brightness(1.25); }
.ac-zone { fill: rgba(255, 255, 255, 0.04); stroke: #fff; stroke-width: 5px; stroke-linejoin: round; pointer-events: none; }
.ac-road { fill: rgba(17, 17, 22, 0.86); stroke: rgba(255, 255, 255, 0.92); stroke-width: 2px; stroke-linejoin: round; cursor: pointer; }
.ac-sel { stroke: #60a5fa !important; stroke-width: 4px !important; }
.ac-draft { fill: rgba(59, 130, 246, 0.22); stroke: #93c5fd; stroke-width: 2.5px; stroke-dasharray: 7 5; }
.ac-draft--line { fill: none; }
.ac-draft-arrow { fill: rgba(17, 17, 22, 0.55); stroke: rgba(255, 255, 255, 0.8); stroke-width: 2px; }

.ac-label {
  position: absolute;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px 3px 6px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(8, 10, 18, 0.8);
  color: #fff;
  font: 700 11px/1 -apple-system, 'Inter', sans-serif;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  cursor: pointer;
  transform-origin: center;
}
.ac-label:hover { background: rgba(8, 10, 18, 0.95); }
.ac-label--sel { outline: 2px solid #60a5fa; outline-offset: 1px; }
.ac-dot { width: 7px; height: 7px; border-radius: 50%; }
.ac-label--zone {
  padding: 7px 16px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.94); color: #0b0d14;
  font-size: 14px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase;
}
.ac-label--road {
  padding: 6px 12px; border-radius: 7px;
  background: rgba(24, 36, 84, 0.94); border: 1.5px solid rgba(255, 255, 255, 0.95);
  font-size: 12.5px;
}
.ac-label--beacon {
  flex-direction: column; gap: 2px; padding: 0; background: none; border: 0; box-shadow: none;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}
.ac-label__under { font-size: 10.5px; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9); }

.ac-vertex {
  position: absolute; width: 18px; height: 18px; border-radius: 50%; box-sizing: border-box;
  background: #3b82f6; border: 2.5px solid #fff; cursor: pointer;
}
.ac-vertex:not(.ac-vertex--closable):hover { background: #ef4444; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.35); }
.ac-vertex--first { width: 22px; height: 22px; background: #fff; border: 3px solid #3b82f6; }
.ac-vertex--closable { animation: ac-pulse 1.4s ease-in-out infinite; }
@keyframes ac-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); } }

.ac-zoom {
  position: absolute; right: 14px; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); z-index: 5;
  display: flex; flex-direction: column; gap: 4px;
}
.ac-zoom button {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(10, 12, 20, 0.82); border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff; font-size: 18px; font-weight: 700; cursor: pointer;
}
.ac-zoom button:hover { background: rgba(10, 12, 20, 0.95); }
/* Touch screens: pinch / double-tap replace +/−; keep only "fit" so the
   buttons don't sit under the plot card on phones. */
@media (pointer: coarse) {
  .ac-zoom button[aria-label="Zoom in"],
  .ac-zoom button[aria-label="Zoom out"] { display: none; }
}

.ac-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 2; }
.ac-spin { width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.15); border-top-color: #fff; animation: ac-rot 0.8s linear infinite; }
@keyframes ac-rot { to { transform: rotate(360deg); } }
</style>
