<template>
  <Transition name="glass-dock">
    <div
      v-if="visible && (items.length || showAdd)"
      ref="dockEl"
      class="glass-dock pointer-events-auto fixed left-1/2 -translate-x-1/2 z-30"
      :class="[glassClass, paddedClass]"
      :style="{
        bottom: `${bottomPx}px`,
        maxWidth: `calc(100vw - ${edgeInsetPx * 2}px)`,
      }"
      role="navigation"
      aria-label="Scene navigation"
      @pointermove="onPointerMove"
      @pointerleave="onPointerLeave"
    >
      <div class="glass-dock__strip" :style="{ maxWidth: `min(${maxStripVw}vw, ${maxStripPx}px)` }">
        <button
          v-for="(item, idx) in items"
          :key="item.id"
          class="glass-dock__item"
          data-dock-item="true"
          :class="item.id === activeId ? 'glass-dock__item--active' : ''"
          :aria-current="item.id === activeId ? 'true' : 'false'"
          :aria-label="item.ariaLabel || item.label"
          :style="itemStyle(idx)"
          @click="emit('select', item.id)"
        >
          <span class="glass-dock__thumb">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.label"
              class="glass-dock__thumbImg"
              draggable="false"
            />
            <span v-else class="glass-dock__thumbFallback" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </span>
          </span>

          <span class="glass-dock__label" :title="item.label">
            {{ item.label }}
          </span>

          <span v-if="item.badge === 'loading'" class="glass-dock__badge" aria-hidden="true" />
        </button>
      </div>

      <span v-if="showAdd" class="glass-dock__divider" aria-hidden="true" />

      <button
        v-if="showAdd"
        class="glass-dock__item glass-dock__item--add"
        :disabled="addDisabled"
        :style="addStyle"
        aria-label="Add scene"
        @click="emit('add')"
      >
        <span class="glass-dock__thumb glass-dock__thumb--dashed">
          <svg
            v-if="!addDisabled"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="glass-dock__addIcon"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span v-else class="glass-dock__spinner" aria-hidden="true" />
        </span>
        <span class="glass-dock__label">{{ addDisabled ? 'Adding…' : 'Scene' }}</span>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'

type DockItem = {
  id: string
  label: string
  imageUrl?: string | null
  ariaLabel?: string
  badge?: 'loading' | null
}

const props = withDefaults(defineProps<{
  items: DockItem[]
  activeId?: string
  showAdd?: boolean
  addDisabled?: boolean
  glassClass?: string
  bottomPx?: number
  edgeInsetPx?: number
  maxStripVw?: number
  maxStripPx?: number
  maxScale?: number
  sigmaPx?: number
  liftPx?: number
}>(), {
  activeId: '',
  showAdd: false,
  addDisabled: false,
  glassClass: 'dock-glass',
  bottomPx: 20,
  edgeInsetPx: 20,
  maxStripVw: 74,
  maxStripPx: 820,
  maxScale: 1.55,
  sigmaPx: 86,
  liftPx: 12,
})

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'add'): void
}>()

const visible = ref(false)
onMounted(() => { visible.value = true })

const dockEl = ref<HTMLElement | null>(null)

const paddedClass = computed(() => 'glass-dock--padded')

const prefersReducedMotion = ref(false)
let mediaQuery: MediaQueryList | null = null
function updateReducedMotion() {
  prefersReducedMotion.value = Boolean(mediaQuery?.matches)
}

onMounted(() => {
  mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null
  updateReducedMotion()
  mediaQuery?.addEventListener?.('change', updateReducedMotion)
})
onBeforeUnmount(() => {
  mediaQuery?.removeEventListener?.('change', updateReducedMotion)
})

// --- Magnification math -------------------------------------------------------
// Gaussian falloff: scale = 1 + A * exp(-(d^2)/(2*sigma^2))
// This yields smooth, perfectly symmetric scaling around the pointer.
const pointerX = ref<number | null>(null)
let rafId: number | null = null

const scales = ref<number[]>([])
const lifts = ref<number[]>([])
const shifts = ref<number[]>([])

function ensureArrays() {
  const n = props.items.length
  if (scales.value.length !== n) scales.value = Array.from({ length: n }, () => 1)
  if (lifts.value.length !== n) lifts.value = Array.from({ length: n }, () => 0)
  if (shifts.value.length !== n) shifts.value = Array.from({ length: n }, () => 0)
}

function scheduleRecalc() {
  if (rafId != null) return
  rafId = window.requestAnimationFrame(() => {
    rafId = null
    recalc()
  })
}

function recalc() {
  ensureArrays()
  if (prefersReducedMotion.value) {
    for (let i = 0; i < props.items.length; i++) {
      scales.value[i] = 1
      lifts.value[i] = 0
      shifts.value[i] = 0
    }
    return
  }

  const x = pointerX.value
  const dock = dockEl.value
  if (x == null || !dock) {
    for (let i = 0; i < props.items.length; i++) {
      scales.value[i] = 1
      lifts.value[i] = 0
      shifts.value[i] = 0
    }
    return
  }

  const strip = dock.querySelector<HTMLElement>('.glass-dock__strip')
  const buttons = dock.querySelectorAll<HTMLButtonElement>('.glass-dock__item[data-dock-item="true"]')
  if (!strip || buttons.length !== props.items.length) {
    for (let i = 0; i < props.items.length; i++) {
      scales.value[i] = 1
      lifts.value[i] = 0
      shifts.value[i] = 0
    }
    return
  }
  const sigma = Math.max(24, props.sigmaPx)
  const twoSigma2 = 2 * sigma * sigma
  const amp = Math.max(0, props.maxScale - 1)
  const gap = 10 // must match CSS gap in .glass-dock__strip
  const scrollLeft = strip.scrollLeft || 0

  const baseW: number[] = []
  const baseCenter: number[] = []
  const targetW: number[] = []
  const desiredCenter: number[] = []

  buttons.forEach((btn, idx) => {
    const r = btn.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const d = cx - x
    const g = Math.exp(-(d * d) / twoSigma2)
    const s = 1 + amp * g
    scales.value[idx] = s
    const t = amp > 0 ? (-props.liftPx * (s - 1) / amp) : 0
    lifts.value[idx] = Number.isFinite(t) ? t : 0

    const w = btn.offsetWidth
    baseW[idx] = w
    // offsetLeft is layout position within strip; subtract scrollLeft to keep math stable
    // even when the dock strip is horizontally scrolled.
    baseCenter[idx] = (btn.offsetLeft - scrollLeft) + w / 2
    targetW[idx] = w * s
  })

  // Compute where the centers *should* be if items physically expanded.
  // This creates the “push-apart” dock effect without drift/misalignment.
  const start = (buttons[0].offsetLeft - scrollLeft)
  desiredCenter[0] = start + targetW[0] / 2
  for (let i = 1; i < targetW.length; i++) {
    desiredCenter[i] = desiredCenter[i - 1] + (targetW[i - 1] / 2) + gap + (targetW[i] / 2)
  }

  for (let i = 0; i < props.items.length; i++) {
    const dx = desiredCenter[i] - baseCenter[i]
    shifts.value[i] = Number.isFinite(dx) ? dx : 0
  }
}

function onPointerMove(e: PointerEvent) {
  pointerX.value = e.clientX
  scheduleRecalc()
}

function onPointerLeave() {
  pointerX.value = null
  scheduleRecalc()
}

function itemStyle(idx: number) {
  ensureArrays()
  return {
    transform: `translate3d(${shifts.value[idx] ?? 0}px, ${lifts.value[idx] ?? 0}px, 0) scale(${scales.value[idx] ?? 1})`,
  }
}

const addStyle = computed(() => {
  // The add button should also magnify based on the nearest edge of the strip,
  // but since it sits after a divider, we keep it stable (perfect alignment).
  return { transform: 'translate3d(0,0,0) scale(1)' }
})

onBeforeUnmount(() => {
  if (rafId != null) window.cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.glass-dock-enter-active { transition: opacity 180ms ease, transform 180ms ease; }
.glass-dock-enter-from   { opacity: 0; transform: translate(-50%, 8px); }
.glass-dock-leave-active { transition: opacity 140ms ease, transform 140ms ease; }
.glass-dock-leave-to     { opacity: 0; transform: translate(-50%, 8px); }

.glass-dock {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 999px;
}

.glass-dock--padded {
  padding: 10px 12px;
}

.glass-dock__strip {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
}
.glass-dock__strip::-webkit-scrollbar { display: none; }

.glass-dock__divider {
  width: 1px;
  height: 34px;
  background: rgba(255,255,255,0.10);
  flex-shrink: 0;
}

.glass-dock__item {
  --thumb-w: 72px;
  --thumb-h: 38px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 18px;
  background: transparent;
  border: 1px solid transparent;
  color: rgba(255,255,255,0.82);
  cursor: pointer;
  flex-shrink: 0;
  transform-origin: 50% 100%;
  will-change: transform;
  transition: background 140ms ease, border-color 140ms ease, filter 140ms ease;
}

.glass-dock__item[data-dock-item="true"] {}

.glass-dock__item:hover {
  background: rgba(255,255,255,0.06);
}

.glass-dock__item--active {
  border-color: rgba(59,130,246,0.55);
  background: rgba(59,130,246,0.10);
}

.glass-dock__thumb {
  width: var(--thumb-w);
  height: var(--thumb-h);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 8px 18px rgba(0,0,0,0.25),
    inset 0 1px 0 rgba(255,255,255,0.06);
}

.glass-dock__thumb--dashed {
  background: transparent;
  border: 1px dashed rgba(255,255,255,0.22);
  box-shadow: none;
}

.glass-dock__thumbImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.glass-dock__thumbFallback {
  color: rgba(255,255,255,0.22);
}

.glass-dock__label {
  max-width: 88px;
  font-size: 9px;
  line-height: 1;
  font-weight: 700;
  color: rgba(255,255,255,0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
}

.glass-dock__item--active .glass-dock__label {
  color: rgba(255,255,255,0.92);
}

.glass-dock__badge {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(59,130,246,1);
  box-shadow: 0 0 0 2px rgba(10,12,20,0.7);
  animation: pulse 1.4s ease-in-out infinite;
}

.glass-dock__addIcon { color: rgba(148,163,184,0.9); }
.glass-dock__spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(148,163,184,0.45);
  border-top-color: transparent;
  animation: spin 0.7s linear infinite;
}

.glass-dock__item--add:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.35); }
}

@media (prefers-reduced-motion: reduce) {
  .glass-dock__item { transition: none; }
  .glass-dock__badge { animation: none; }
  .glass-dock__spinner { animation: none; }
}
</style>
