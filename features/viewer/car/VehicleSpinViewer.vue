<template>
  <div
    ref="rootEl"
    class="vsv"
    :class="{ 'is-placing': placing, 'is-edit': editable, 'is-zoomed': zoomed }"
    role="group"
    tabindex="0"
    :aria-label="`Exterior view, ${currentLabel}. Drag or use the arrow keys to rotate the car; plus and minus zoom.`"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @wheel="onWheel"
    @keydown.left.prevent="step(-1)"
    @keydown.right.prevent="step(1)"
    @keydown="onZoomKey"
    @keydown.esc="activePinId = null"
  >
    <!-- Blurred copy behind a car shown whole (contain), so a portrait phone has no black bars. -->
    <div v-if="showBackdrop" class="vsv__backdrop" :style="{ backgroundImage: `url(${backdropUrl})` }" aria-hidden="true" />

    <!-- First frame as a plain image: it is in the server HTML, so the car shows before any script runs. -->
    <img
      v-if="posterUrl && !painted"
      :src="posterUrl"
      alt=""
      class="vsv__poster"
      :class="{ 'is-contain': fitNow === 'contain' }"
      fetchpriority="high"
      decoding="async"
      draggable="false"
    />
    <canvas ref="canvasEl" class="vsv__canvas" :aria-label="currentView ? `Car, ${currentLabel}` : undefined" role="img" />

    <div v-if="!sorted.length" class="vsv__empty">No exterior photos yet</div>

    <!-- Pins of the photo on screen. Positioned against where the photo is actually drawn (zoom included). -->
    <div v-if="pins.length" class="vsv__pins">
      <button
        v-for="p in pins"
        :key="p.h.id"
        type="button"
        class="vsv__pin"
        :class="[`vsv__pin--${p.h.kind}`, { 'is-selected': (editable ? selectedHotspotId : activePinId) === p.h.id, 'is-hidden': !p.visible }]"
        :style="{ left: p.left + 'px', top: p.top + 'px', opacity: p.visible ? p.alpha : 0 }"
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

    <!-- Zoom: buttons for mouse and keyboard users; pinch, wheel and double-tap do the same. -->
    <div v-if="zoomable && sorted.length && !hideZoom" class="vsv__zoom" :style="{ bottom: zoomBottom }" @pointerdown.stop>
      <button type="button" class="vsv__zbtn" aria-label="Zoom in" :disabled="zoom.z >= ZOOM_MAX - 0.01" @click="zoomBy(1.6)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <button type="button" class="vsv__zbtn" aria-label="Zoom out" :disabled="!zoomed" @click="zoomBy(1 / 1.6)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>
      </button>
      <button v-if="zoomed" type="button" class="vsv__zbtn" aria-label="Show the whole car" @click="resetZoom(true)">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/></svg>
      </button>
    </div>

    <div v-if="sorted.length > 1 && !hideBar" class="vsv__ui">
      <p v-if="showHint && !editable && !activePin" class="vsv__hint" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-5 4 5 4M16 8l5 4-5 4M3 12h18"/></svg>
        {{ zoomed ? 'Drag to look around' : 'Drag to rotate' }}
      </p>
      <div class="vsv__bar">
        <span class="vsv__label" aria-live="polite">{{ currentLabel }}</span>
        <!-- A spin has dozens of frames: one slim turn track instead of a dot per frame (which overflowed phones). -->
        <input
          v-if="smooth"
          class="vsv__scrub"
          type="range"
          min="0"
          :max="sorted.length - 1"
          step="1"
          :value="index"
          aria-label="Turn the car"
          :aria-valuetext="currentLabel"
          @pointerdown.stop
          @input="goTo(Number(($event.target as HTMLInputElement).value), true)"
        />
        <div v-else class="vsv__dots">
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
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  sortByAngle, viewLabel, wrapIndex, fitRect, pointToFraction, hotspotKindLabel, isSpinSet,
  resolveFit, clampZoom, zoomAt, zoomForward, zoomInverse, spinLoadOrder, indexNearestAngle,
  ZOOM_MAX, ZOOM_MIN,
  type VehicleView, type VehicleHotspot, type ZoomState,
} from '~/shared/utils/vehicleViews'

const props = withDefaults(defineProps<{
  views: VehicleView[]
  /**
   * `auto` (buyers): fill the box when that crops little, otherwise the whole car over a blurred copy.
   * `contain`: whole photo (the editor, so pins can go anywhere). `cover`: always fill.
   */
  fit?: 'cover' | 'contain' | 'auto'
  /** Editor behaviours: pins can be dragged and selected from outside. */
  editable?: boolean
  /** Next click on the photo places a pin instead of doing nothing. */
  placing?: boolean
  selectedHotspotId?: string | null
  /** Controlled frame (index into the angle-sorted list). Omit to let the viewer manage it. */
  index?: number
  /** First frame shown (degrees around the car), when `index` is not given. */
  startAngle?: number
  hideBar?: boolean
  hideZoom?: boolean
  /** Distance of the zoom buttons from the bottom, so a host page can keep them clear of its own controls. */
  zoomBottom?: string
  zoomable?: boolean
  /** Turn once by itself when a smooth set has loaded, so it is obvious the car spins. Stops at the first touch. */
  autoplay?: boolean
}>(), {
  fit: 'auto', editable: false, placing: false, selectedHotspotId: null, hideBar: false, hideZoom: false,
  zoomBottom: '50%', zoomable: true, autoplay: true, startAngle: 0,
})

const emit = defineEmits<{
  (e: 'update:index', index: number): void
  (e: 'place', payload: { viewId: string; x: number; y: number }): void
  (e: 'select-hotspot', payload: { viewId: string; id: string }): void
  (e: 'move-hotspot', payload: { viewId: string; id: string; x: number; y: number }): void
  (e: 'zoom', zoomed: boolean): void
}>()

const sorted = computed(() => sortByAngle(props.views))
const startIndex = computed(() => (props.index != null ? wrapIndex(props.index, sorted.value.length) : indexNearestAngle(sorted.value, props.startAngle)))
const idx = ref(0)
const index = computed(() => idx.value)
// Enough frames to turn smoothly: neighbours are blended as you drag. A few photos just step (with a short crossfade).
const smooth = computed(() => isSpinSet(sorted.value.length))
const blend = { base: 0, alpha: 0 }
const currentView = computed(() => sorted.value[idx.value])
const currentLabel = computed(() => (currentView.value ? viewLabel(currentView.value) : ''))

const rootEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const showHint = ref(true)
const painted = ref(false)

// ── Box size ──
const box = ref({ w: 0, h: 0 })
let ro: ResizeObserver | undefined
let dpr = 1
function measure() {
  const el = rootEl.value
  const c = canvasEl.value
  if (!el) return
  box.value = { w: el.clientWidth, h: el.clientHeight }
  dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
  if (c) {
    c.width = Math.max(1, Math.round(box.value.w * dpr))
    c.height = Math.max(1, Math.round(box.value.h * dpr))
  }
  zoom.value = clampZoom(zoom.value, box.value, rectOf(currentView.value))
  requestDraw()
}

// ── Frames ──
// Each frame is fetched as a file and decoded off the main thread to a bitmap sized for this screen,
// so 64 frames stay within a phone's memory. If the media host refuses a cross-origin fetch, frames
// fall back to plain images (full size, still drawn on the canvas).
type Drawable = ImageBitmap | HTMLImageElement | HTMLCanvasElement
const frames = new Map<string, Drawable>()
const natural = ref<Record<string, { w: number; h: number }>>({})
const loadedIds = shallowRef<Set<string>>(new Set())
const loadedCount = computed(() => sorted.value.filter(v => loadedIds.value.has(v.id)).length)
let corsOk = true
let resizeOk = true
let loadGen = 0

function natOf(v?: VehicleView) {
  if (!v) return { w: 16, h: 9 }
  return natural.value[v.id] ?? (v.width && v.height ? { w: v.width, h: v.height } : { w: 16, h: 9 })
}
const fitNow = computed(() => resolveFit(props.fit, box.value, natOf(sorted.value[startIndex.value] ?? currentView.value)))
function rectOf(v?: VehicleView) {
  return fitRect(box.value, natOf(v), fitNow.value)
}
const showBackdrop = computed(() => !props.editable && fitNow.value === 'contain' && !!backdropUrl.value)
const backdropUrl = computed(() => sorted.value[startIndex.value]?.image_url ?? '')
const posterUrl = computed(() => sorted.value[startIndex.value]?.image_url ?? '')

/** Long edge of the stored bitmap: what this screen can show, smaller when there are many frames. */
function bitmapLongEdge(): number {
  const n = sorted.value.length
  const screenLong = typeof window !== 'undefined' ? Math.max(window.screen?.width || 1280, window.screen?.height || 720) : 1280
  const smallScreen = typeof window !== 'undefined' && Math.min(window.screen?.width || 1280, window.screen?.height || 720) < 600
  const cap = n > 40 ? (smallScreen ? 1024 : 1440) : (smallScreen ? 1280 : 1600)
  return Math.min(cap, Math.round(screenLong * dpr))
}

async function decodeFrame(v: VehicleView): Promise<Drawable> {
  if (corsOk) {
    try {
      const res = await fetch(v.image_url, { mode: 'cors', credentials: 'omit' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const long = bitmapLongEdge()
      if (resizeOk && v.width && v.height) {
        const s = Math.min(1, long / Math.max(v.width, v.height))
        try {
          const bmp = await createImageBitmap(blob, s < 1
            ? { resizeWidth: Math.round(v.width * s), resizeHeight: Math.round(v.height * s), resizeQuality: 'high' }
            : {})
          setNatural(v.id, v.width, v.height)
          return bmp
        } catch { resizeOk = false }
      }
      const full = await createImageBitmap(blob)
      setNatural(v.id, full.width, full.height)
      const s = Math.min(1, long / Math.max(full.width, full.height))
      if (s >= 1) return full
      // No resize support (older Safari): shrink once through a scratch canvas.
      const c = document.createElement('canvas')
      c.width = Math.round(full.width * s)
      c.height = Math.round(full.height * s)
      const ctx = c.getContext('2d')
      if (!ctx) return full
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(full, 0, 0, c.width, c.height)
      full.close()
      try {
        const small = await createImageBitmap(c)
        c.width = 0
        return small
      } catch { return c }
    } catch {
      corsOk = false
    }
  }
  const img = new Image()
  img.decoding = 'async'
  img.src = v.image_url
  await img.decode()
  setNatural(v.id, img.naturalWidth, img.naturalHeight)
  return img
}

function setNatural(id: string, w: number, h: number) {
  if (natural.value[id]?.w === w && natural.value[id]?.h === h) return
  natural.value = { ...natural.value, [id]: { w, h } }
}

function loadAll() {
  if (typeof window === 'undefined') return
  const gen = ++loadGen
  const list = sorted.value
  const order = spinLoadOrder(list.length, startIndex.value).map(i => list[i]).filter(v => !frames.has(v.id))
  let next = 0
  const worker = async () => {
    while (next < order.length && gen === loadGen) {
      const v = order[next++]
      try {
        const d = await decodeFrame(v)
        if (gen !== loadGen || !sorted.value.some(x => x.id === v.id)) { closeDrawable(d); continue }
        frames.set(v.id, d)
        loadedIds.value = new Set(loadedIds.value).add(v.id)
        requestDraw()
      } catch { /* a missing frame is skipped; its neighbours stand in */ }
    }
  }
  for (let k = 0; k < 6; k++) worker()
}

function closeDrawable(d: Drawable) {
  if (typeof ImageBitmap !== 'undefined' && d instanceof ImageBitmap) d.close()
  else if (d instanceof HTMLCanvasElement) d.width = 0
}

/** The frame to draw for index i: itself if it has arrived, otherwise the nearest one that has. */
function drawableNear(i: number): { d: Drawable; v: VehicleView } | null {
  const list = sorted.value
  const n = list.length
  for (let k = 0; k <= n / 2; k++) {
    for (const j of k === 0 ? [i] : [i + k, i - k]) {
      const v = list[wrapIndex(j, n)]
      const d = v && frames.get(v.id)
      if (d) return { d, v }
    }
  }
  return null
}

// ── Sharp frame while zoomed: the full-size photo for the frame on screen ──
let sharp: { id: string; img: HTMLImageElement } | null = null
let sharpTimer: ReturnType<typeof setTimeout> | undefined
function scheduleSharpen() {
  if (sharpTimer) clearTimeout(sharpTimer)
  if (!zoomed.value) return
  sharpTimer = setTimeout(async () => {
    const v = currentView.value
    if (!v || !zoomed.value || sharp?.id === v.id) return
    const d = frames.get(v.id)
    if (d instanceof HTMLImageElement) return // already full size
    const img = new Image()
    if (corsOk) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.src = v.image_url
    try {
      await img.decode()
      if (currentView.value?.id === v.id && zoomed.value) { sharp = { id: v.id, img }; requestDraw() }
    } catch { /* stay on the screen-sized frame */ }
  }, 220)
}

// ── Drawing ──
let drawRaf = 0
function requestDraw() {
  if (typeof window === 'undefined' || drawRaf) return
  drawRaf = requestAnimationFrame(() => { drawRaf = 0; draw() })
}

let fade: { fromId: string; t0: number } | null = null
const FADE_MS = 220

function draw() {
  const c = canvasEl.value
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, c.width, c.height)
  const list = sorted.value
  if (!list.length) return
  const z = zoom.value
  const cx = box.value.w / 2
  const cy = box.value.h / 2
  ctx.setTransform(dpr * z.z, 0, 0, dpr * z.z, dpr * (cx * (1 - z.z) + z.x), dpr * (cy * (1 - z.z) + z.y))
  ctx.imageSmoothingQuality = 'high'

  const paint = (d: Drawable, v: VehicleView, alpha: number) => {
    const r = rectOf(v)
    ctx.globalAlpha = alpha
    ctx.drawImage(d, r.x, r.y, r.w, r.h)
  }

  const baseI = smooth.value ? blend.base : idx.value
  const base = drawableNear(baseI)
  if (!base) return
  const baseSrc = sharp && sharp.id === base.v.id && zoomed.value ? sharp.img : base.d
  paint(baseSrc, base.v, 1)

  if (smooth.value) {
    const nextV = list[(blend.base + 1) % list.length]
    const nd = nextV && frames.get(nextV.id)
    // Only blend a neighbour that has arrived; otherwise the car would fade into a stand-in frame.
    if (nd && blend.alpha > 0.001 && base.v.id === list[blend.base].id) paint(nd, nextV, blend.alpha)
  } else if (fade) {
    // A few photos: the outgoing photo fades away over the new one.
    const k = (performance.now() - fade.t0) / FADE_MS
    const from = list.find(v => v.id === fade!.fromId)
    const fd = from && frames.get(from.id)
    if (k < 1 && fd && from) { paint(fd, from, 1 - k); requestDraw() } else fade = null
  }
  ctx.globalAlpha = 1
  if (!painted.value) painted.value = true
}

// ── Pins ──
// In a smooth spin, frames are only a few degrees apart, so a pin placed on one frame also shows (fading)
// on the frames either side. The editor shows just the frame being edited, so what you move is what you see.
const PIN_REACH_DEG = 14
function angularDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

const pins = computed(() => {
  const cur = currentView.value
  if (!cur || !box.value.w) return []
  const sources = props.editable || !smooth.value
    ? [cur]
    : sorted.value.filter(v => angularDistance(v.angle, cur.angle) <= PIN_REACH_DEG)
  const out: Array<{ h: VehicleHotspot; left: number; top: number; visible: boolean; alpha: number }> = []
  for (const v of sources) {
    if (!v.hotspots?.length) continue
    const r = rectOf(v)
    const alpha = v.id === cur.id ? 1 : Math.max(0.25, 1 - angularDistance(v.angle, cur.angle) / PIN_REACH_DEG)
    for (const h of v.hotspots) {
      const o = dragOverride.value?.id === h.id ? dragOverride.value : null
      const p = zoomForward({ x: r.x + (o ? o.x : h.x) * r.w, y: r.y + (o ? o.y : h.y) * r.h }, box.value, zoom.value)
      out.push({ h, left: p.x, top: p.y, alpha, visible: p.x >= 0 && p.x <= box.value.w && p.y >= 0 && p.y <= box.value.h })
    }
  }
  return out
})

// Where a pin being dragged is right now; the real data only changes once it is dropped and saved.
const dragOverride = ref<{ id: string; x: number; y: number } | null>(null)
const activePinId = ref<string | null>(null)
const activePin = computed<VehicleHotspot | null>(() => {
  for (const v of sorted.value) {
    const h = v.hotspots?.find(x => x.id === activePinId.value)
    if (h) return h
  }
  return null
})

/** A pointer position -> fractions of the current photo, undoing zoom. Null when it misses the photo. */
function eventToFraction(e: PointerEvent) {
  const v = currentView.value
  const el = rootEl.value
  if (!v || !el) return null
  const b = el.getBoundingClientRect()
  const p = zoomInverse({ x: e.clientX - b.left, y: e.clientY - b.top }, box.value, zoom.value)
  return pointToFraction(p.x, p.y, rectOf(v))
}

// ── Zoom ──
const zoom = ref<ZoomState>({ z: 1, x: 0, y: 0 })
const zoomed = computed(() => zoom.value.z > 1.01)
watch(zoomed, (z) => { emit('zoom', z); if (!z) sharp = null })
let zoomAnim = 0

function setZoom(s: ZoomState) {
  zoom.value = clampZoom(s, box.value, rectOf(currentView.value))
  requestDraw()
  scheduleSharpen()
}

function animateZoom(target: ZoomState) {
  if (zoomAnim) cancelAnimationFrame(zoomAnim)
  const from = { ...zoom.value }
  const to = clampZoom(target, box.value, rectOf(currentView.value))
  if (reduceMotion) { setZoom(to); return }
  const t0 = performance.now()
  const tick = (t: number) => {
    const k = Math.min(1, (t - t0) / 240)
    const e = 1 - Math.pow(1 - k, 3)
    zoom.value = { z: from.z + (to.z - from.z) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }
    requestDraw()
    if (k < 1) zoomAnim = requestAnimationFrame(tick)
    else { zoomAnim = 0; setZoom(to) }
  }
  zoomAnim = requestAnimationFrame(tick)
}

function zoomBy(factor: number, sx = box.value.w / 2, sy = box.value.h / 2) {
  if (!props.zoomable) return
  stopInertia()
  autoplayed = true
  showHint.value = false
  const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom.value.z * factor))
  animateZoom(zoomAt(zoom.value, z, sx, sy, box.value))
}

function resetZoom(animated = false) {
  if (animated) animateZoom({ z: 1, x: 0, y: 0 })
  else setZoom({ z: 1, x: 0, y: 0 })
}

// Wheel zoom inside a tour; inside someone else's page (an iframe) only with ctrl or a trackpad pinch,
// so scrolling past an embedded car never gets trapped.
const inIframe = typeof window !== 'undefined' && (() => { try { return window.self !== window.top } catch { return true } })()
function onWheel(e: WheelEvent) {
  if (!props.zoomable || !sorted.value.length) return
  if (inIframe && !e.ctrlKey) return
  e.preventDefault()
  const b = rootEl.value!.getBoundingClientRect()
  const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018))
  stopInertia()
  autoplayed = true
  setZoom(zoomAt(zoom.value, Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom.value.z * factor)), e.clientX - b.left, e.clientY - b.top, box.value))
}

function onZoomKey(e: KeyboardEvent) {
  if (!props.zoomable || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1.6) }
  else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1 / 1.6) }
  else if (e.key === '0') { e.preventDefault(); resetZoom(true) }
}

// ── Rotation ──
// A full-width drag is one and a half laps' worth less than a lap, which feels natural with 8 frames.
const LAP_WIDTHS = 1.5
let pos = 0 // continuous frame position, so slow drags still land between frames smoothly
let velocity = 0 // frames per ms
let raf = 0
const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function framesPerPx() {
  const w = rootEl.value?.clientWidth || 360
  return sorted.value.length / (w * LAP_WIDTHS)
}

function syncBlend() {
  const n = sorted.value.length
  if (!n) return
  const fl = Math.floor(pos)
  blend.base = wrapIndex(fl, n)
  blend.alpha = smooth.value ? pos - fl : 0
}

function setPos(p: number) {
  const n = sorted.value.length
  if (!n) return
  pos = p
  syncBlend()
  const next = wrapIndex(Math.round(pos), n)
  if (next !== idx.value) {
    if (!smooth.value && sorted.value[idx.value] && !reduceMotion) fade = { fromId: sorted.value[idx.value].id, t0: performance.now() }
    idx.value = next
    activePinId.value = null
    emit('update:index', next)
    scheduleSharpen()
  }
  requestDraw()
}

function stopInertia() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

// One slow lap when a smooth set has fully loaded, so it is obvious the car turns. Any touch stops it.
let autoplayed = false
function startAutoplay() {
  const n = sorted.value.length
  const from = pos
  const t0 = performance.now()
  const DURATION_MS = 7000
  const tick = (t: number) => {
    const k = Math.min(1, (t - t0) / DURATION_MS)
    const eased = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k)
    setPos(from + n * eased)
    if (k < 1) raf = requestAnimationFrame(tick)
    else { raf = 0; setPos(Math.round(pos)) }
  }
  raf = requestAnimationFrame(tick)
}
watch(loadedCount, (c) => {
  const n = sorted.value.length
  if (autoplayed || !props.autoplay || props.editable || reduceMotion || !smooth.value || !n || c < n) return
  autoplayed = true
  startAutoplay()
})

// ── Pointers: one finger rotates (or pans while zoomed), two fingers pinch ──
const pointers = new Map<number, { x: number; y: number }>()
let pinch: { d0: number; z0: ZoomState; mx: number; my: number } | null = null
let dragging = false
let panning = false
let moved = 0
let downX = 0
let downY = 0
let startPos = 0
let startPosX = 0
let lastX = 0
let lastY = 0
let lastT = 0
let lastTap = { t: 0, x: 0, y: 0 }

function localXY(e: PointerEvent) {
  const b = rootEl.value!.getBoundingClientRect()
  return { x: e.clientX - b.left, y: e.clientY - b.top }
}

function onDown(e: PointerEvent) {
  if (sorted.value.length < 1) return
  stopInertia()
  autoplayed = true
  showHint.value = false
  pointers.set(e.pointerId, localXY(e))
  rootEl.value?.setPointerCapture?.(e.pointerId)
  if (pointers.size === 2 && props.zoomable) {
    const [a, b] = [...pointers.values()]
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: { ...zoom.value }, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
    dragging = false
    panning = false
    moved = 99 // a pinch is never a tap
    return
  }
  if (pointers.size > 1) return
  dragging = true
  panning = zoomed.value
  moved = 0
  downX = startPosX = lastX = e.clientX
  downY = lastY = e.clientY
  startPos = pos
  lastT = performance.now()
  velocity = 0
}

function onMove(e: PointerEvent) {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, localXY(e))
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinch.z0.z * (d / pinch.d0)))
    const s = zoomAt(pinch.z0, z, pinch.mx, pinch.my, box.value)
    setZoom({ z, x: s.x + (mx - pinch.mx), y: s.y + (my - pinch.my) })
    return
  }
  if (!dragging) return
  moved = Math.max(moved, Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY))
  const now = performance.now()
  if (panning) {
    setZoom({ z: zoom.value.z, x: zoom.value.x + (e.clientX - lastX), y: zoom.value.y + (e.clientY - lastY) })
    lastX = e.clientX
    lastY = e.clientY
    return
  }
  if (sorted.value.length < 2) return
  const dt = Math.max(1, now - lastT)
  // Dragging right turns the car towards its left, like pushing the nearest surface.
  setPos(startPos - (e.clientX - startPosX) * framesPerPx())
  velocity = Math.max(-0.02, Math.min(0.02, (-(e.clientX - lastX) * framesPerPx()) / dt))
  lastX = e.clientX
  lastY = e.clientY
  lastT = now
}

function onUp(e: PointerEvent) {
  pointers.delete(e.pointerId)
  rootEl.value?.releasePointerCapture?.(e.pointerId)
  if (pinch) {
    if (pointers.size < 2) pinch = null
    return
  }
  if (!dragging) return
  dragging = false

  // A tap (not a drag): double-tap zooms; otherwise place a pin in the editor, or dismiss a card for buyers.
  if (moved < 6) {
    const p = localXY(e)
    const now = performance.now()
    if (props.zoomable && !props.placing && now - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) {
      lastTap = { t: 0, x: 0, y: 0 }
      if (zoomed.value) resetZoom(true)
      else animateZoom(zoomAt(zoom.value, 2.5, p.x, p.y, box.value))
      return
    }
    lastTap = { t: now, x: p.x, y: p.y }
    const v = currentView.value
    if (props.placing && v) {
      const f = eventToFraction(e)
      if (f) emit('place', { viewId: v.id, x: f.x, y: f.y })
    } else {
      activePinId.value = null
    }
    return
  }
  if (panning) return

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

function goTo(i: number, direct = false) {
  stopInertia()
  showHint.value = false
  autoplayed = true
  const n = sorted.value.length
  // The turn track maps straight onto the frames; everything else takes the short way round the car.
  let diff = i - wrapIndex(Math.round(pos), n)
  if (!direct) {
    if (diff > n / 2) diff -= n
    if (diff < -n / 2) diff += n
  }
  setPos(Math.round(pos) + diff)
}

function step(dir: number) {
  stopInertia()
  showHint.value = false
  autoplayed = true
  setPos(Math.round(pos) + dir)
}

// ── Pin dragging (editor) ──
let pinDrag: { id: string; sx: number; sy: number; moved: boolean } | null = null

function onPinDown(e: PointerEvent, h: VehicleHotspot) {
  pinDrag = { id: h.id, sx: e.clientX, sy: e.clientY, moved: false }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPinMove(e: PointerEvent) {
  if (!pinDrag || !props.editable) return
  if (!pinDrag.moved && Math.abs(e.clientX - pinDrag.sx) + Math.abs(e.clientY - pinDrag.sy) < 6) return
  pinDrag.moved = true
  const f = eventToFraction(e)
  if (f) dragOverride.value = { id: pinDrag.id, x: f.x, y: f.y }
}

function onPinUp(_e: PointerEvent, h: VehicleHotspot) {
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
  const viewId = h.view_id || currentView.value?.id
  if (!viewId) return
  if (props.editable) emit('select-hotspot', { viewId, id: h.id })
  else activePinId.value = activePinId.value === h.id ? null : h.id
}

// ── Lifecycle ──
let hintTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  pos = idx.value = startIndex.value
  syncBlend()
  measure()
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    ro = new ResizeObserver(measure)
    ro.observe(rootEl.value)
  }
  loadAll()
  hintTimer = setTimeout(() => { showHint.value = false }, 4500)
})

// The editor drives the frame from its dock.
watch(() => props.index, (i) => {
  if (i == null || !sorted.value.length) return
  const next = wrapIndex(i, sorted.value.length)
  if (next === idx.value) return
  stopInertia()
  pos = idx.value = next
  syncBlend()
  activePinId.value = null
  requestDraw()
  scheduleSharpen()
})

// Frames added or removed (the editor): load the new ones, free the gone ones.
watch(() => sorted.value.map(v => v.id).join(','), () => {
  const ids = new Set(sorted.value.map(v => v.id))
  for (const [id, d] of frames) if (!ids.has(id)) { closeDrawable(d); frames.delete(id) }
  loadedIds.value = new Set([...loadedIds.value].filter(id => ids.has(id)))
  const n = sorted.value.length
  if (idx.value >= n) { idx.value = Math.max(0, n - 1); pos = idx.value }
  syncBlend()
  loadAll()
  requestDraw()
})

watch(() => props.fit, () => { zoom.value = { z: 1, x: 0, y: 0 }; requestDraw() })

onBeforeUnmount(() => {
  loadGen++
  stopInertia()
  if (zoomAnim) cancelAnimationFrame(zoomAnim)
  if (drawRaf) cancelAnimationFrame(drawRaf)
  ro?.disconnect()
  if (hintTimer) clearTimeout(hintTimer)
  if (sharpTimer) clearTimeout(sharpTimer)
  for (const d of frames.values()) closeDrawable(d)
  frames.clear()
  sharp = null
})

defineExpose({ goTo, index, zoomBy, resetZoom })
</script>

<style scoped>
.vsv {
  position: absolute; inset: 0; overflow: hidden;
  background: #0b0b0c;
  cursor: grab; touch-action: pan-y; user-select: none; -webkit-user-select: none;
  outline: none;
}
.vsv:active { cursor: grabbing; }
.vsv.is-zoomed { cursor: move; touch-action: none; }
.vsv.is-placing, .vsv.is-placing:active { cursor: crosshair; }
.vsv:focus-visible { box-shadow: inset 0 0 0 3px #fff; }
.vsv__backdrop {
  position: absolute; inset: -40px; background-size: cover; background-position: center;
  filter: blur(28px) brightness(0.55) saturate(1.1); pointer-events: none;
}
.vsv__poster {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center; pointer-events: none;
}
.vsv__poster.is-contain { object-fit: contain; }
.vsv__canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
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

.vsv__zoom {
  position: absolute; right: 12px; transform: translateY(50%); z-index: 3;
  display: flex; flex-direction: column; gap: 6px;
}
.vsv__zbtn {
  width: 44px; height: 44px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.16);
  background: rgba(0,0,0,0.6); color: #fff; display: grid; place-items: center; cursor: pointer;
}
.vsv__zbtn:disabled { opacity: 0.4; cursor: default; }
.vsv__zbtn:not(:disabled):active { background: rgba(0,0,0,0.85); }
.vsv__zbtn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

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
/* Turn track: 44px tall hit area, thin visible rail. */
.vsv__scrub {
  -webkit-appearance: none; appearance: none; width: min(260px, 60vw); height: 44px; margin: 0;
  background: transparent; cursor: pointer; touch-action: none;
}
.vsv__scrub::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.3); }
.vsv__scrub::-moz-range-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.3); }
.vsv__scrub::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 18px; margin-top: -7px; border-radius: 50%;
  background: #fff; border: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.5);
}
.vsv__scrub::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
.vsv__scrub:focus-visible { outline: 2px solid #fff; outline-offset: 2px; border-radius: 8px; }
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
