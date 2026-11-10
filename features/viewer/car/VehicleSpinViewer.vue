<template>
  <div
    ref="rootEl"
    class="vsv"
    :class="{ 'is-placing': placing, 'is-edit': editable, 'is-zoomed': zoomed, 'has-timeline': showTimeline, 'is-short': short, 'is-heights': verticalHeights }"
    role="group"
    tabindex="0"
    :aria-roledescription="smooth ? '360° view' : undefined"
    :aria-label="`Exterior view, ${currentLabel}. Drag or use the arrow keys to rotate the car; plus and minus zoom.`"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @wheel="onWheel"
    @keydown.left.prevent="step(-1)"
    @keydown.right.prevent="step(1)"
    @keydown.up="onHeightKey($event, -1)"
    @keydown.down="onHeightKey($event, 1)"
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

    <!-- Ground ring: the "360°" floor line of a product spin. Its dot is where the car's nose points. -->
    <svg v-if="ring" class="vsv__ring" :class="{ 'is-on': ringOn }" :style="ring.style" viewBox="0 0 200 30" aria-hidden="true">
      <path d="M119.1 21.8 A96 10 0 1 0 80.9 21.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      <text x="100" y="25.5" text-anchor="middle" class="vsv__ring-t">360°</text>
      <circle :cx="ring.dot.x" :cy="ring.dot.y" r="3.4" class="vsv__ring-dot" />
    </svg>

    <!-- Pins of the photo on screen. Positioned against where the photo is actually drawn (zoom included). -->
    <div v-if="pins.length" class="vsv__pins">
      <button
        v-for="p in pins"
        :key="p.h.id"
        type="button"
        class="vsv__pin"
        :class="[`vsv__pin--${p.h.kind}`, { 'is-selected': (editable ? selectedHotspotId : activePinId) === p.h.id, 'is-hidden': !p.visible, 'is-pulse': !editable && p.alpha === 1 }]"
        :style="{ left: p.left + 'px', top: p.top + 'px', opacity: p.visible ? p.alpha : 0 }"
        :aria-label="`${p.h.title}, ${hotspotKindLabel(p.h.kind)}`"
        :aria-expanded="!editable ? activePinId === p.h.id : undefined"
        :tabindex="p.visible ? 0 : -1"
        @pointerdown.stop="onPinDown($event, p.h)"
        @pointermove.stop="onPinMove($event)"
        @pointerup.stop="onPinUp($event, p.h)"
        @pointercancel.stop="onPinCancel"
        @keydown.enter.stop.prevent="selectPin(p.h)"
        @keydown.space.stop.prevent="selectPin(p.h)"
      >
        <svg v-if="p.h.kind === 'damage'" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4M12 17.2v.1"/></svg>
        <svg v-else-if="p.h.kind === 'link'" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>
        <svg v-else-if="p.h.kind === 'info'" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M12 11v6M12 7.2v.1"/></svg>
        <svg v-else viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>
      </button>
    </div>

    <!-- Popover for a tapped pin, anchored to it (the editor shows these in its side panel instead). -->
    <div
      v-if="!editable && activePin && popover"
      class="vsv__pop"
      :class="`is-${popover.side}`"
      :style="{ left: popover.left + 'px', top: popover.top + 'px', '--arrow-x': popover.arrow + 'px' }"
      role="dialog"
      :aria-label="activePin.title"
      @pointerdown.stop
    >
      <button type="button" class="vsv__pop-close" aria-label="Close" @click="activePinId = null">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <p class="vsv__pop-kind" :class="`is-${activePin.kind}`">{{ hotspotKindLabel(activePin.kind) }}</p>
      <p class="vsv__pop-title">{{ activePin.title }}</p>
      <p v-if="activePin.body" class="vsv__pop-body">{{ activePin.body }}</p>
      <a v-if="activePin.url" :href="activePin.url" class="vsv__pop-cta" target="_blank" rel="noopener noreferrer">Learn more</a>
    </div>

    <!-- Loading, then "this turns": the 360° badge in the middle until the first touch. -->
    <div v-if="showBadge" class="vsv__badge" aria-hidden="true">
      <svg viewBox="0 0 64 40" width="64" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <text x="32" y="19" text-anchor="middle" fill="currentColor" stroke="none" font-size="15" font-weight="800" font-family="system-ui, sans-serif">360°</text>
        <path d="M10 22c-4 2-6 4-6 6 0 5 12 8 28 8 6 0 11-.4 15.5-1.3" />
        <path d="m43 31 5 3.6-5 3.4" />
        <path d="M54 22c4 2 6 4 6 6 0 1.6-1.2 3-3.4 4.2" />
      </svg>
      <span v-if="loading" class="vsv__badge-pct">{{ loadPct }}%</span>
    </div>

    <!-- First-use hints, like a product viewer: what you can do here. Gone at the first touch. -->
    <div v-if="showHints" class="vsv__hints" aria-hidden="true">
      <span v-for="h in hints" :key="h.key" class="vsv__hint">
        <svg v-if="h.key === 'drag'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/></svg>
        <svg v-else-if="h.key === 'swipe'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4M6 8l-4 4 4 4M8 12h8"/></svg>
        <svg v-else-if="h.key === 'height'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 6 4-4 4 4M8 18l4 4 4-4M12 2v20"/></svg>
        <svg v-else-if="h.key === 'pinch'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l4 4M18 6l-4 4M6 18l4-4M18 18l-4-4"/><circle cx="12" cy="12" r="2"/></svg>
        <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 9 5 12 1.8-5.2L21 14Z"/><path d="M7.2 2.2 8 5.1M5.1 8l-2.9-.8M14 4.1 12 6M6 12l-1.9 2"/></svg>
        {{ h.label }}
      </span>
    </div>

    <!-- Zoom: one button until zoomed, then out / in / whole car. Pinch, ctrl+wheel and double-tap do the same. -->
    <div v-if="zoomable && sorted.length && !hideZoom" class="vsv__zoom" :class="{ 'is-open': zoomed }" :style="{ bottom: zoomBottom }" @pointerdown.stop>
      <template v-if="zoomed">
        <button type="button" class="vsv__zbtn" aria-label="Zoom out" @click="zoomBy(1 / 1.6)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>
        </button>
        <button type="button" class="vsv__zbtn" aria-label="Zoom in" :disabled="zoom.z >= ZOOM_MAX - 0.01" @click="zoomBy(1.6)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <span class="vsv__zsep" aria-hidden="true" />
        <button type="button" class="vsv__zbtn" aria-label="Show the whole car" @click="resetZoom(true)">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
      </template>
      <button v-else type="button" class="vsv__zbtn" aria-label="Zoom in" @click="zoomBy(1.6)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.6-4.6M10.5 7.5v6M7.5 10.5h6"/></svg>
      </button>
    </div>

    <!-- Camera heights (a spin shot at several heights): higher / lower at the same angle. -->
    <div v-if="rowList && !editable" class="vsv__heights" role="group" aria-label="Camera height" @pointerdown.stop>
      <button type="button" class="vsv__hbtn" aria-label="Camera higher" :disabled="rowIdx <= 0" @click="setRow(rowIdx - 1)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>
      </button>
      <button
        v-for="(r, i) in rowList"
        :key="r.id"
        type="button"
        class="vsv__hdot"
        :class="{ 'is-on': i === rowIdx }"
        :aria-label="`${heightLabel(r.elevation)}${r.title ? `, ${r.title}` : ''}`"
        :aria-pressed="i === rowIdx"
        @click="setRow(i)"
      >
        <span class="vsv__htip" aria-hidden="true">{{ heightLabel(r.elevation) }}</span>
      </button>
      <button type="button" class="vsv__hbtn" aria-label="Camera lower" :disabled="rowIdx >= rowList.length - 1" @click="setRow(rowIdx + 1)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
    </div>

    <!-- Inside someone else's page the wheel scrolls their page; say how to zoom instead. -->
    <p v-if="toast" class="vsv__toast" role="status">{{ toast }}</p>

    <!-- Turn track with a mark per hotspot: tap a mark and the car turns to it and opens it. -->
    <div v-if="showTimeline" class="vsv__tl" @pointerdown.stop>
      <span v-if="!short" class="vsv__tl-label">{{ currentLabel }}</span>
      <div class="vsv__tl-row">
        <button
          v-if="!editable"
          type="button"
          class="vsv__tl-play"
          :aria-label="playing ? 'Stop turning' : 'Turn the car by itself'"
          :aria-pressed="playing"
          @click="togglePlay"
        >
          <svg v-if="playing" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.9l11.4-7.2a1 1 0 0 0 0-1.8L8.5 3.9A1 1 0 0 0 7 4.8Z"/></svg>
        </button>
        <div class="vsv__tl-track">
          <input
            class="vsv__scrub"
            type="range"
            min="0"
            :max="sorted.length - 1"
            step="1"
            :value="index"
            aria-label="Turn the car"
            :aria-valuetext="currentLabel"
            @input="goTo(Number(($event.target as HTMLInputElement).value), true)"
          />
          <button
            v-for="m in marks"
            :key="m.id"
            type="button"
            class="vsv__tl-dot"
            :class="[`is-${m.kind}`, { 'is-on': activePinId === m.id }]"
            :style="{ left: `calc(9px + (100% - 18px) * ${m.at})` }"
            :aria-label="`${m.title}, ${hotspotKindLabel(m.kind)}`"
            @click="openMark(m)"
          >
            <span class="vsv__tl-tip" aria-hidden="true">{{ m.title }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- A few photos (not a spin): one dot per photo. -->
    <div v-else-if="sorted.length > 1 && !hideBar && !smooth" class="vsv__ui">
      <div class="vsv__bar">
        <span class="vsv__label">{{ currentLabel }}</span>
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

    <!-- Spoken updates for screen readers (zoom, hotspots, turning by itself). -->
    <p class="vsv__sr" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  sortByAngle, viewLabel, wrapIndex, fitRect, pointToFraction, hotspotKindLabel, isSpinSet,
  resolveFit, clampZoom, zoomAt, zoomForward, zoomInverse, spinLoadOrder, indexNearestAngle,
  ringPoint, timelineMarks, spinHints, heightLabel, crispBlend,
  ZOOM_MAX, ZOOM_MIN,
  type VehicleView, type VehicleHotspot, type ZoomState, type TimelineMark, type VehicleSpinRow,
} from '~/shared/utils/vehicleViews'

const props = withDefaults(defineProps<{
  views: VehicleView[]
  /**
   * The same spin at several camera heights (the main one first). With two or more, dragging up
   * and down (or the up / down keys) changes height at the same angle. `views` is then ignored.
   */
  rows?: VehicleSpinRow[] | null
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
  zoomBottom: '50%', zoomable: true, autoplay: true, startAngle: 0, rows: null,
})

const emit = defineEmits<{
  (e: 'update:index', index: number): void
  (e: 'place', payload: { viewId: string; x: number; y: number }): void
  (e: 'select-hotspot', payload: { viewId: string; id: string }): void
  (e: 'move-hotspot', payload: { viewId: string; id: string; x: number; y: number }): void
  (e: 'zoom', zoomed: boolean): void
  /** A hotspot's popover opened or closed: a host can clear its own controls out of the way. */
  (e: 'popover', open: boolean): void
}>()

// ── Camera heights ──
/** Heights, highest first; null for an ordinary single-height spin. */
const rowList = computed<VehicleSpinRow[] | null>(() => {
  const r = (props.rows ?? []).filter(x => x.views?.length)
  return r.length > 1 ? [...r].sort((a, b) => b.elevation - a.elevation) : null
})
const rowIdx = ref(0)
function mainRowIndex() {
  const list = rowList.value
  if (!list) return 0
  const i = list.findIndex(r => r.id === props.rows?.[0]?.id)
  return i >= 0 ? i : 0
}
rowIdx.value = mainRowIndex()
const activeViews = computed(() => (rowList.value ? rowList.value[Math.min(rowIdx.value, rowList.value.length - 1)].views : props.views))
/** Every frame of every height (for freeing frames that are gone, and fading between heights). */
const allViews = computed(() => (rowList.value ? rowList.value.flatMap(r => r.views) : props.views))
const allById = computed(() => new Map(allViews.value.map(v => [v.id, v])))
const sorted = computed(() => sortByAngle(activeViews.value))
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

// ── Chrome: badge, hints, ring, timeline, popover, spoken updates ──
const isTouch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
/** Up/down drags change height; on a touch screen only when the viewer fills most of it (no page to scroll). */
const verticalHeights = computed(() => !!rowList.value && !props.editable
  && (!isTouch || (typeof window !== 'undefined' && box.value.h > window.innerHeight * 0.7)))
const hints = computed(() => spinHints(isTouch, props.zoomable, verticalHeights.value))
/** The middle "360°" badge goes at the first touch, or when the car starts turning by itself. */
const badgeGone = ref(false)
const showBadge = computed(() => smooth.value && !props.editable && !badgeGone.value)
const showHints = computed(() => showHint.value && painted.value && sorted.value.length > 1 && !props.editable && !activePinId.value && !zoomed.value)
const showTimeline = computed(() => smooth.value && !props.hideBar && sorted.value.length > 1)
/** A short box (a listing card): the timeline loses its label and the ring is left out. */
const short = computed(() => box.value.h > 0 && box.value.h < 460)
const marks = computed<TimelineMark[]>(() => (props.editable ? [] : timelineMarks(sorted.value)))

const ring = computed(() => {
  const v = currentView.value
  if (!smooth.value || props.editable || zoomed.value || !v || !box.value.w || short.value) return null
  const r = rectOf(v)
  // A flat floor line across the lower part of what is on screen (or of the photo, when it is
  // shown whole), sitting just above the turn track.
  const visW = Math.min(box.value.w, r.w)
  const w = Math.min(visW * 0.66, 640)
  const h = (w * 30) / 200
  const photoBottom = Math.min(box.value.h, r.y + r.h)
  const bottom = Math.min(photoBottom - 12, box.value.h - (showTimeline.value ? 100 : 24))
  return {
    dot: ringPoint(v.angle),
    style: { left: `${box.value.w / 2 - w / 2}px`, top: `${bottom - h}px`, width: `${w}px`, height: `${h}px` },
  }
})
/** The ring shows while the car turns (and on the first screen), then fades away. */
const ringOn = ref(true)
let ringTimer: ReturnType<typeof setTimeout> | undefined
function ringPing() {
  ringOn.value = true
  if (ringTimer) clearTimeout(ringTimer)
  ringTimer = setTimeout(() => { ringOn.value = playing.value || showBadge.value }, 1400)
}

const announcement = ref('')
function announce(msg: string) {
  // The same words twice in a row are not re-read by most screen readers: toggle a trailing space.
  announcement.value = announcement.value === msg ? `${msg} ` : msg
}

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 1600)
}

/** Popover beside its pin: above it when there is room, else below; kept inside the viewer. */
const popover = computed(() => {
  const id = activePinId.value
  const p = id ? pins.value.find(x => x.h.id === id) : null
  if (!p || !p.visible) return null
  const W = Math.min(300, box.value.w - 24)
  const left = Math.max(12, Math.min(box.value.w - W - 12, p.left - W / 2))
  const side = p.top >= box.value.h - p.top ? 'above' : 'below'
  return { left, top: side === 'above' ? p.top - 22 : p.top + 22, side, arrow: Math.max(18, Math.min(W - 18, p.left - left)) }
})

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
const loading = computed(() => sorted.value.length > 1 && loadedCount.value < sorted.value.length)
const loadPct = computed(() => Math.round((100 * loadedCount.value) / Math.max(1, sorted.value.length)))
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
  const n = allViews.value.length
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
  const here = sorted.value[idx.value]?.angle ?? props.startAngle
  const order = spinLoadOrder(list.length, list.length ? indexNearestAngle(list, here) : 0).map(i => list[i])
  // Then the other heights, nearest the current angle first, so moving up or down is instant.
  if (rowList.value && !props.editable) {
    for (const r of rowList.value) {
      if (r.views === activeViews.value) continue
      const rs = sortByAngle(r.views)
      order.push(...spinLoadOrder(rs.length, indexNearestAngle(rs, here)).map(i => rs[i]))
    }
  }
  const todo = order.filter(v => !frames.has(v.id))
  let next = 0
  const worker = async () => {
    while (next < todo.length && gen === loadGen) {
      const v = todo[next++]
      try {
        const d = await decodeFrame(v)
        if (gen !== loadGen || !allById.value.has(v.id)) { closeDrawable(d); continue }
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
    // A short dissolve in the middle of each step instead of a 50/50 mix all the way: neighbouring
    // frames are a few degrees apart, so mixing them for long shows two cars (a blurred double image).
    const a = crispBlend(blend.alpha)
    if (nd && a > 0.001 && base.v.id === list[blend.base].id) paint(nd, nextV, a)
  }
  if (fade) {
    // The outgoing photo fades away over the new one (a few photos, or a change of camera height).
    const k = (performance.now() - fade.t0) / FADE_MS
    const from = allById.value.get(fade.fromId)
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
watch(activePinId, (id) => {
  emit('popover', !!id)
  const h = id ? activePin.value : null
  if (h) announce(`${hotspotKindLabel(h.kind)}: ${h.title}${h.body ? `. ${h.body}` : ''}`)
})
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
watch(zoomed, (z) => {
  emit('zoom', z)
  if (!z) sharp = null
  announce(z ? 'Zoomed in. Drag to look around; press 0 to see the whole car.' : 'Zoomed out')
})
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
  badgeGone.value = true
  const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom.value.z * factor))
  animateZoom(zoomAt(zoom.value, z, sx, sy, box.value))
}

function resetZoom(animated = false) {
  if (animated) animateZoom({ z: 1, x: 0, y: 0 })
  else setZoom({ z: 1, x: 0, y: 0 })
}

// Wheel zoom inside a tour; inside someone else's page (an iframe) only with ctrl or a trackpad pinch,
// so scrolling past an embedded car never gets trapped.
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
const inIframe = typeof window !== 'undefined' && (() => { try { return window.self !== window.top } catch { return true } })()
function onWheel(e: WheelEvent) {
  if (!props.zoomable || !sorted.value.length) return
  if (inIframe && !e.ctrlKey && !e.metaKey) {
    if (Math.abs(e.deltaY) > 4) showToast(`Use ${isMac ? '⌘' : 'ctrl'} + scroll to zoom`)
    return
  }
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
    ringPing()
    scheduleSharpen()
  }
  requestDraw()
}

function stopInertia() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  if (playing.value) playing.value = false
}

// ── Turning by itself: one lap when loaded, or on and on with the play button ──
const playing = ref(false)
const LAP_MS = 9000
function play() {
  stopInertia()
  const n = sorted.value.length
  if (n < 2) return
  playing.value = true
  badgeGone.value = true
  let prev = performance.now()
  const tick = (t: number) => {
    const dt = t - prev
    prev = t
    setPos(pos + (n * dt) / LAP_MS)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}
function togglePlay() {
  autoplayed = true
  showHint.value = false
  if (playing.value) { stopInertia(); setPos(Math.round(pos)); announce('Stopped') } else { play(); announce('Turning') }
}

/** Turn the short way round to a frame, then (optionally) run something there. */
function turnTo(i: number, then?: () => void) {
  stopInertia()
  const n = sorted.value.length
  let diff = i - wrapIndex(Math.round(pos), n)
  if (diff > n / 2) diff -= n
  if (diff < -n / 2) diff += n
  const from = pos
  const to = Math.round(pos) + diff
  if (reduceMotion || !diff) { setPos(to); then?.(); return }
  const t0 = performance.now()
  const ms = Math.min(900, 260 + Math.abs(diff) * 18)
  const tick = (t: number) => {
    const k = Math.min(1, (t - t0) / ms)
    setPos(from + (to - from) * (1 - Math.pow(1 - k, 3)))
    if (k < 1) raf = requestAnimationFrame(tick)
    else { raf = 0; then?.() }
  }
  raf = requestAnimationFrame(tick)
}

function openMark(m: TimelineMark) {
  autoplayed = true
  showHint.value = false
  badgeGone.value = true
  if (zoomed.value) resetZoom(true)
  turnTo(m.index, () => { activePinId.value = m.id })
}

// One slow lap when a smooth set has fully loaded, so it is obvious the car turns. Any touch stops it.
let autoplayed = false
function startAutoplay() {
  const n = sorted.value.length
  const from = pos
  const t0 = performance.now()
  const DURATION_MS = 7000
  playing.value = true
  badgeGone.value = true
  const tick = (t: number) => {
    const k = Math.min(1, (t - t0) / DURATION_MS)
    const eased = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k)
    setPos(from + n * eased)
    if (k < 1) raf = requestAnimationFrame(tick)
    else { raf = 0; playing.value = false; setPos(Math.round(pos)) }
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
let dragAxis: 'x' | 'y' | null = null
let dragStartRow = 0

function localXY(e: PointerEvent) {
  const b = rootEl.value!.getBoundingClientRect()
  return { x: e.clientX - b.left, y: e.clientY - b.top }
}

function onDown(e: PointerEvent) {
  if (sorted.value.length < 1) return
  stopInertia()
  autoplayed = true
  showHint.value = false
  badgeGone.value = true
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
  dragAxis = null
  dragStartRow = rowIdx.value
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
  // With camera heights, a mostly vertical drag changes height instead of turning the car.
  if (verticalHeights.value && dragAxis === null && moved > 8) {
    dragAxis = Math.abs(e.clientY - downY) > Math.abs(e.clientX - downX) * 1.2 ? 'y' : 'x'
  }
  if (dragAxis === 'y') {
    // Pulling down lifts the camera (you see more of the roof), like tilting the car towards you.
    const stepPx = Math.max(48, Math.min(90, box.value.h / 6))
    setRow(dragStartRow - Math.round((e.clientY - downY) / stepPx))
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
  if (panning || dragAxis === 'y') return

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
  badgeGone.value = true
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
  badgeGone.value = true
  autoplayed = true
  setPos(Math.round(pos) + dir)
  announce(currentLabel.value)
}

// ── Camera height: same angle, another row ──
function setRow(r: number) {
  const list = rowList.value
  if (!list) return
  const next = Math.max(0, Math.min(list.length - 1, r))
  if (next === rowIdx.value) return
  const from = currentView.value
  if (from && !reduceMotion) fade = { fromId: from.id, t0: performance.now() }
  rowIdx.value = next
  const i = indexNearestAngle(sorted.value, from?.angle ?? 0)
  pos = idx.value = i
  syncBlend()
  activePinId.value = null
  emit('update:index', i)
  badgeGone.value = true
  showHint.value = false
  if (zoomed.value) resetZoom()
  requestDraw()
  announce(`${heightLabel(list[next].elevation)} view`)
}
function onHeightKey(e: KeyboardEvent, dir: number) {
  if (!rowList.value || props.editable) return
  e.preventDefault()
  stopInertia()
  setRow(rowIdx.value + dir)
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

// ── Memory: a spin out of sight (scrolled away, tab in the background) gives its frames back ──
// After a short grace period every decoded frame but the one on screen is freed; they reload,
// nearest first, when the viewer is seen again. Phones keep far less memory this way.
const RELEASE_AFTER_MS = 15000
let io: IntersectionObserver | undefined
let onScreen = true
let releaseTimer: ReturnType<typeof setTimeout> | undefined
let released = false
function visibilityChanged() {
  const seen = onScreen && (typeof document === 'undefined' || document.visibilityState !== 'hidden')
  if (seen) {
    if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = undefined }
    if (released) { released = false; loadAll() }
    return
  }
  if (releaseTimer || released || props.editable) return
  releaseTimer = setTimeout(() => { releaseTimer = undefined; releaseFrames() }, RELEASE_AFTER_MS)
}
function releaseFrames() {
  stopInertia()
  loadGen++
  const keep = currentView.value?.id
  for (const [id, d] of frames) if (id !== keep) { closeDrawable(d); frames.delete(id) }
  loadedIds.value = new Set(keep && frames.has(keep) ? [keep] : [])
  sharp = null
  released = true
}
function onDocVisibility() { visibilityChanged() }

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
  hintTimer = setTimeout(() => { showHint.value = false }, 6000)
  if (typeof IntersectionObserver !== 'undefined' && rootEl.value) {
    io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? true
      visibilityChanged()
    }, { rootMargin: '200px' })
    io.observe(rootEl.value)
  }
  document.addEventListener('visibilitychange', onDocVisibility)
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

// Frames gone for good (the editor deleted them): free them. Frames of the other heights stay.
watch(() => allViews.value.map(v => v.id).join(','), () => {
  const ids = new Set(allViews.value.map(v => v.id))
  for (const [id, d] of frames) if (!ids.has(id)) { closeDrawable(d); frames.delete(id) }
  loadedIds.value = new Set([...loadedIds.value].filter(id => ids.has(id)))
})
// Frames added, or another height on screen: load what is missing, nearest first.
watch(() => sorted.value.map(v => v.id).join(','), () => {
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
  io?.disconnect()
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onDocVisibility)
  if (releaseTimer) clearTimeout(releaseTimer)
  if (toastTimer) clearTimeout(toastTimer)
  if (ringTimer) clearTimeout(ringTimer)
  if (hintTimer) clearTimeout(hintTimer)
  if (sharpTimer) clearTimeout(sharpTimer)
  for (const d of frames.values()) closeDrawable(d)
  frames.clear()
  sharp = null
})

defineExpose({ goTo, index, zoomBy, resetZoom, play, togglePlay })
</script>

<style scoped>
.vsv {
  /* Theme (a product-360 viewer's dark theme). A host page can override any of these. */
  --vsv-btn-bg: rgba(40, 40, 45, 0.9);
  --vsv-btn-bg-hover: rgba(60, 60, 66, 0.96);
  --vsv-icon: #e0e0e0;
  --vsv-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  --vsv-brand: #00aaff;
  --vsv-focus: #4db8ff;
  --vsv-damage: #ffb020;
  --vsv-marker-size: 24px;
  --vsv-marker-bg: rgba(0, 0, 0, 0.6);
  --vsv-marker-fg: #fff;
  --vsv-marker-ring: rgba(255, 255, 255, 0.6);
  --vsv-pulse: rgba(255, 255, 255, 0.28);
  --vsv-pop-bg: #1a1a1a;
  --vsv-pop-fg: #f0f0f0;
  --vsv-pop-border: rgba(255, 255, 255, 0.1);
  --vsv-cta-bg: #fff;
  --vsv-cta-fg: #111;
  --vsv-badge-bg: rgba(255, 255, 255, 0.15);
  --vsv-toast-bg: rgba(0, 0, 0, 0.7);
  --vsv-track: rgba(255, 255, 255, 0.4);
  --vsv-ring: rgba(255, 255, 255, 0.55);
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
/* Product-viewer markers: a 24px dot with a soft pulse, inside a 44px hit area. */
.vsv__pin {
  position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; padding: 0;
  display: grid; place-items: center; border: 0; background: transparent; cursor: pointer;
  pointer-events: auto; touch-action: none; color: var(--vsv-marker-fg);
}
.vsv__pin::before {
  content: ''; position: absolute; width: var(--vsv-marker-size); height: var(--vsv-marker-size); border-radius: 50%;
  background: var(--vsv-marker-bg); border: 2px solid var(--vsv-marker-ring); box-shadow: var(--vsv-shadow);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  transition: transform 150ms ease, background 150ms ease;
}
.vsv__pin.is-pulse::after {
  content: ''; position: absolute; width: var(--vsv-marker-size); height: var(--vsv-marker-size); border-radius: 50%;
  background: var(--vsv-pulse); animation: vsv-pulse 1.8s ease-out infinite; pointer-events: none;
}
@keyframes vsv-pulse { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.9); opacity: 0; } }
.vsv__pin > svg { position: relative; z-index: 1; }
.vsv__pin--damage { color: #1a1205; }
.vsv__pin--damage::before { background: var(--vsv-damage); border-color: rgba(255,255,255,0.85); }
.vsv.is-edit .vsv__pin { cursor: move; }
.vsv__pin:hover::before { transform: scale(1.12); }
.vsv__pin.is-selected::before { background: var(--vsv-brand); border-color: #fff; transform: scale(1.12); }
.vsv__pin:focus-visible::before { outline: 2px solid var(--vsv-focus); outline-offset: 3px; }
.vsv__pin.is-hidden { opacity: 0; pointer-events: none; }

.vsv__pop {
  position: absolute; z-index: 6; width: min(300px, calc(100% - 24px)); box-sizing: border-box;
  padding: 16px 44px 16px 16px; border-radius: 12px; cursor: default;
  background: var(--vsv-pop-bg); color: var(--vsv-pop-fg); border: 1px solid var(--vsv-pop-border);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  animation: vsv-pop-in 160ms ease-out;
}
.vsv__pop.is-above { transform: translateY(-100%); }
.vsv__pop::after {
  content: ''; position: absolute; left: var(--arrow-x); width: 12px; height: 12px; margin-left: -6px;
  background: var(--vsv-pop-bg); border: 1px solid var(--vsv-pop-border); transform: rotate(45deg);
}
.vsv__pop.is-above::after { bottom: -7px; border-top: 0; border-left: 0; }
.vsv__pop.is-below::after { top: -7px; border-bottom: 0; border-right: 0; }
@keyframes vsv-pop-in { from { opacity: 0; } to { opacity: 1; } }
.vsv__pop-close {
  position: absolute; top: 2px; right: 2px; width: 44px; height: 44px; border: 0; background: transparent;
  color: inherit; opacity: 0.6; display: grid; place-items: center; cursor: pointer;
}
.vsv__pop-close:hover { opacity: 1; }
.vsv__pop-kind { margin: 0 0 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.6; }
.vsv__pop-kind.is-damage { color: var(--vsv-damage); opacity: 1; }
.vsv__pop-title { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.3; }
.vsv__pop-body { margin: 6px 0 0; font-size: 14px; line-height: 1.5; opacity: 0.75; }
.vsv__pop-cta {
  display: inline-flex; align-items: center; min-height: 40px; margin-top: 12px; padding: 0 16px; border-radius: 8px;
  background: var(--vsv-cta-bg); color: var(--vsv-cta-fg); font-size: 14px; font-weight: 600; text-decoration: none;
}
.vsv__pop-cta:focus-visible, .vsv__pop-close:focus-visible { outline: 2px solid var(--vsv-focus); outline-offset: 2px; }

/* The "360°" badge: frosted, centred, gone at the first touch. */
.vsv__badge {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 4;
  min-width: 100px; padding: 12px 16px; border-radius: 16px; box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; gap: 2px; pointer-events: none;
  background: var(--vsv-badge-bg); color: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.12);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.35));
}
.vsv__badge-pct { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; opacity: 0.9; }

.vsv__ring {
  position: absolute; z-index: 1; color: var(--vsv-ring); pointer-events: none; overflow: visible;
  opacity: 0; transition: opacity 600ms ease; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
}
.vsv__ring.is-on { opacity: 1; transition-duration: 150ms; }
.vsv__ring-t { font: 700 6.5px system-ui, -apple-system, sans-serif; fill: currentColor; }
.vsv__ring-dot { fill: var(--vsv-brand); stroke: #fff; stroke-width: 1.4; }

.vsv__hints {
  position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 5;
  display: flex; gap: 20px; padding: 10px 20px; border-radius: 20px; pointer-events: none;
  background: var(--vsv-btn-bg); color: var(--vsv-icon); box-shadow: var(--vsv-shadow);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  font: 500 13px system-ui, -apple-system, sans-serif; white-space: nowrap;
  animation: vsv-fade-in 300ms ease;
}
.vsv.has-timeline .vsv__hints { bottom: var(--vsv-hints-bottom, 104px); }
.vsv.is-short .vsv__tl { padding-top: 14px; }
.vsv__hint { display: inline-flex; align-items: center; gap: 8px; }
@keyframes vsv-fade-in { from { opacity: 0; } to { opacity: 1; } }

.vsv__zoom {
  position: absolute; right: 12px; transform: translateY(50%); z-index: 5;
  display: flex; align-items: center; gap: 4px; padding: 4px; border-radius: 10px;
  background: var(--vsv-btn-bg); box-shadow: var(--vsv-shadow);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.vsv__zbtn {
  width: 40px; height: 40px; border-radius: 7px; border: 0; padding: 0;
  background: transparent; color: var(--vsv-icon); display: grid; place-items: center; cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}
.vsv__zbtn:hover:not(:disabled) { background: var(--vsv-btn-bg-hover); color: #fff; }
.vsv__zbtn:disabled { opacity: 0.3; cursor: default; }
.vsv__zbtn:focus-visible { outline: 2px solid var(--vsv-focus); outline-offset: -2px; }
.vsv__zsep { width: 1px; align-self: stretch; margin: 8px 0; background: rgba(255,255,255,0.18); }

.vsv.is-heights { touch-action: none; }
.vsv__heights {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%); z-index: 5;
  display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px; border-radius: 22px;
  background: var(--vsv-btn-bg); box-shadow: var(--vsv-shadow);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.vsv__hbtn {
  width: 36px; height: 36px; border-radius: 50%; border: 0; padding: 0; background: transparent; cursor: pointer;
  color: var(--vsv-icon); display: grid; place-items: center;
}
.vsv__hbtn:hover:not(:disabled) { background: var(--vsv-btn-bg-hover); color: #fff; }
.vsv__hbtn:disabled { opacity: 0.3; cursor: default; }
/* A short box (a phone listing card) keeps only the dots, so the control stays clear of the host's buttons. */
.vsv.is-short .vsv__hbtn { display: none; }
.vsv.is-short .vsv__heights { padding: 2px 0; left: 10px; }
.vsv.is-short .vsv__hdot { width: 28px; height: 24px; }
.vsv__hdot { position: relative; width: 36px; height: 22px; border: 0; padding: 0; background: transparent; cursor: pointer; }
.vsv__hdot::before {
  content: ''; position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%;
  background: rgba(255,255,255,0.4); transition: transform 150ms ease, background 150ms ease;
}
.vsv__hdot.is-on::before { background: var(--vsv-brand); box-shadow: 0 0 0 2px #fff; transform: scale(1.2); }
.vsv__hbtn:focus-visible, .vsv__hdot:focus-visible { outline: 2px solid var(--vsv-focus); outline-offset: -2px; border-radius: 12px; }
.vsv__htip {
  position: absolute; left: calc(100% + 8px); top: 50%; transform: translateY(-50%);
  padding: 4px 10px; border-radius: 6px; background: var(--vsv-pop-bg); color: var(--vsv-pop-fg);
  font-size: 12px; font-weight: 600; white-space: nowrap; pointer-events: none;
  opacity: 0; visibility: hidden; transition: opacity 0.2s ease, visibility 0.2s ease;
}
.vsv__hdot:hover .vsv__htip, .vsv__hdot:focus-visible .vsv__htip { opacity: 1; visibility: visible; }

.vsv__toast {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 7; margin: 0;
  padding: 8px 16px; border-radius: 20px; pointer-events: none;
  background: var(--vsv-toast-bg); color: #fff; font: 500 13px system-ui, -apple-system, sans-serif; white-space: nowrap;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  animation: vsv-fade-in 200ms ease;
}

/* Turn track + hotspot marks over a soft gradient, like a product viewer's timeline. */
.vsv__tl {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 4;
  /* --vsv-tl-side: room a host page keeps at each end for its own buttons. */
  /* --vsv-tl-right: extra room on the right only (a host's expand or full-screen button). */
  padding: 26px max(16px, var(--vsv-tl-side, 16px), var(--vsv-tl-right, 0px)) max(14px, env(safe-area-inset-bottom)) max(16px, var(--vsv-tl-side, 16px));
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.22) 60%, transparent 100%);
}
.vsv__tl-label { color: #fff; font-size: 12px; font-weight: 700; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.vsv__tl-row { display: flex; align-items: center; gap: 10px; width: 100%; max-width: 500px; }
.vsv__tl-play {
  flex: none; width: 36px; height: 36px; border-radius: 50%; border: 0; padding: 0; cursor: pointer;
  display: grid; place-items: center; background: var(--vsv-btn-bg); color: var(--vsv-icon); box-shadow: var(--vsv-shadow);
}
.vsv__tl-play:hover { background: var(--vsv-btn-bg-hover); color: #fff; }
.vsv__tl-play:focus-visible { outline: 2px solid var(--vsv-focus); outline-offset: 2px; }
.vsv__tl-track { position: relative; flex: 1; min-width: 0; height: 44px; }
/* The range input is the track (keyboard and screen readers get a real slider); marks sit on top. */
.vsv__scrub {
  -webkit-appearance: none; appearance: none; position: absolute; inset: 0; width: 100%; height: 44px; margin: 0;
  background: transparent; cursor: pointer; touch-action: none;
}
.vsv__scrub::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: var(--vsv-track); }
.vsv__scrub::-moz-range-track { height: 6px; border-radius: 3px; background: var(--vsv-track); }
.vsv__scrub::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 18px; margin-top: -6px; border-radius: 50%;
  background: var(--vsv-brand); border: 3px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); box-sizing: border-box;
}
.vsv__scrub::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--vsv-brand); border: 3px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); box-sizing: border-box; }
.vsv__scrub:focus-visible { outline: 2px solid var(--vsv-focus); outline-offset: 2px; border-radius: 8px; }
.vsv__tl-dot {
  position: absolute; top: 50%; z-index: 1; width: 28px; height: 28px; margin: -14px 0 0 -14px; padding: 0;
  border: 0; background: transparent; cursor: pointer;
}
.vsv__tl-dot::before {
  content: ''; position: absolute; left: 50%; top: 50%; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%;
  background: var(--vsv-marker-bg); border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  transition: transform 150ms ease;
}
.vsv__tl-dot.is-damage::before { background: var(--vsv-damage); }
.vsv__tl-dot.is-on::before, .vsv__tl-dot:hover::before { transform: scale(1.2); }
.vsv__tl-dot:focus-visible { outline: 2px solid var(--vsv-focus); outline-offset: -2px; border-radius: 50%; }
.vsv__tl-tip {
  position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  padding: 6px 12px; border-radius: 6px; background: var(--vsv-pop-bg); color: var(--vsv-pop-fg);
  font-size: 13px; font-weight: 500; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  opacity: 0; visibility: hidden; transition: opacity 0.2s ease, visibility 0.2s ease; pointer-events: none;
}
.vsv__tl-dot:hover .vsv__tl-tip, .vsv__tl-dot:focus-visible .vsv__tl-tip { opacity: 1; visibility: visible; }

/* A few photos (not a spin): a dot per photo in a frosted pill. */
.vsv__ui {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 0 16px max(18px, env(safe-area-inset-bottom));
  display: flex; flex-direction: column; align-items: center; pointer-events: none;
}
.vsv__bar {
  display: flex; flex-direction: column; align-items: center; pointer-events: auto;
  padding: 8px 10px 0; border-radius: 16px; background: var(--vsv-btn-bg); box-shadow: var(--vsv-shadow);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.vsv__dots { display: flex; align-items: center; }
.vsv__dot { position: relative; width: 28px; height: 44px; padding: 0; border: 0; background: transparent; cursor: pointer; }
.vsv__dot::after {
  content: ''; position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px;
  border-radius: 50%; background: rgba(255,255,255,0.4); transition: background 120ms, transform 120ms;
}
.vsv__dot.is-active::after { background: #fff; transform: scale(1.35); }
.vsv__dot:focus-visible { outline: 2px solid var(--vsv-focus); outline-offset: -4px; border-radius: 8px; }
.vsv__label { color: #fff; font-size: 12px; font-weight: 700; white-space: nowrap; }

.vsv__sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

@media (max-width: 480px) {
  .vsv__hints { flex-direction: column; gap: 8px; padding: 12px 16px; border-radius: 12px; font-size: 12px; }
  .vsv.has-timeline .vsv__hints { bottom: var(--vsv-hints-bottom, 98px); }
  .vsv__tl { padding: 22px max(14px, var(--vsv-tl-side, 14px), var(--vsv-tl-right, 0px)) max(12px, env(safe-area-inset-bottom)) max(14px, var(--vsv-tl-side, 14px)); }
  .vsv__dot { width: 26px; }
}
@media (prefers-reduced-motion: reduce) {
  .vsv__pin.is-pulse::after { animation: none; display: none; }
  .vsv__dot::after, .vsv__pin::before, .vsv__tl-dot::before, .vsv__pop, .vsv__hints, .vsv__toast { transition: none; animation: none; }
}
</style>
