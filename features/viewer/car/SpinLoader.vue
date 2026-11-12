<template>
  <!-- One quiet line under the car while it loads. The car itself does the rest: the host fades
       its colour in with the same progress (see `shown`), like a photo developing. -->
  <div
    class="sl"
    :class="{ 'is-done': finishing }"
    role="progressbar"
    aria-label="Getting the car ready"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="pct"
  >
    <div class="sl__row">
      <span class="sl__msg">{{ finishing ? 'Ready. Drag to turn it' : 'Getting the car ready' }}</span>
      <span class="sl__pct">{{ pct }}%</span>
    </div>
    <span class="sl__bar" aria-hidden="true"><span class="sl__fill" :style="{ transform: `scaleX(${shown})` }" /></span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  /** Real progress, 0 to 1. */
  progress: number
  /** Everything has loaded (or given up): the bar fills and the loader goes. */
  done: boolean
}>()
const emit = defineEmits<{
  (e: 'finished'): void
  /** The progress shown, 0 to 1, in steps of 0.01: the host fades the car's colour in with it. */
  (e: 'shown', value: number): void
}>()

/**
 * What the bar shows. It runs ahead quickly at first, then slows as it nears the end and
 * creeps there until the last photo is in, so the wait feels short and it never sits at 100.
 */
const shown = ref(0)
const finishing = ref(false)
const pct = computed(() => Math.round(shown.value * 100))
let sent = -1
watch(pct, (p) => { if (p !== sent) { sent = p; emit('shown', p / 100) } }, { immediate: true })

const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
let raf = 0
let t0 = 0
let last = 0
function tick(t: number) {
  if (!t0) { t0 = t; last = t }
  const dt = Math.min(64, t - last)
  last = t
  const elapsed = (t - t0) / 1000
  // Quick lead: about 55% after 2 s and 80% after 4 s, never past 92% on its own.
  const lead = 0.92 * (1 - Math.exp(-elapsed / 2.4))
  const goal = props.done ? 1 : Math.min(0.96, Math.max(props.progress, lead))
  // Ease towards the goal: the closer it gets, the slower it moves. Finishing is quick.
  const rate = props.done ? 0.012 : 0.004
  shown.value += (goal - shown.value) * (1 - Math.exp(-rate * dt))
  if (props.done && 1 - shown.value < 0.004) {
    shown.value = 1
    finish()
    return
  }
  raf = requestAnimationFrame(tick)
}

let finishTimer: ReturnType<typeof setTimeout> | undefined
function finish() {
  if (finishing.value) return
  finishing.value = true
  finishTimer = setTimeout(() => emit('finished'), reduceMotion ? 600 : 900)
}

onMounted(() => {
  if (reduceMotion) { shown.value = props.done ? 1 : props.progress; if (props.done) finish(); return }
  raf = requestAnimationFrame(tick)
})
watch(() => [props.progress, props.done] as const, ([p, d]) => {
  if (!reduceMotion) return
  shown.value = d ? 1 : p
  if (d) finish()
})
onBeforeUnmount(() => { cancelAnimationFrame(raf); if (finishTimer) clearTimeout(finishTimer) })
</script>

<style scoped>
.sl {
  position: absolute; left: 50%; bottom: var(--vsv-overlay-bottom, 24px); transform: translateX(-50%); z-index: 4;
  width: min(calc(100% - 32px), 300px); box-sizing: border-box; padding: 10px 14px 12px; border-radius: 14px;
  background: rgba(10, 10, 12, 0.72); color: #fff; pointer-events: none;
  font-family: system-ui, -apple-system, sans-serif;
  transition: opacity 180ms ease, transform 180ms ease;
}
.sl.is-done { opacity: 0; transform: translateX(-50%) translateY(4px); transition-delay: 700ms; }
.sl__row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.sl__msg { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sl__pct { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; color: rgba(255, 255, 255, 0.7); }
.sl__bar { display: block; height: 3px; margin-top: 9px; border-radius: 2px; background: rgba(255, 255, 255, 0.16); overflow: hidden; }
.sl__fill { display: block; height: 100%; background: #fff; border-radius: 2px; transform-origin: left center; }
@media (prefers-reduced-motion: reduce) {
  .sl, .sl.is-done { transition: none; }
}
</style>
