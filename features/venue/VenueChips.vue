<template>
  <!-- Chips scroll sideways: swipe on touch; arrows, wheel and fading
       edges on desktop (Google Maps style) so hidden chips are reachable. -->
  <div class="vch" :class="{ 'vch--l': canLeft, 'vch--r': canRight }">
    <button v-if="canLeft" type="button" class="vch__arrow vch__arrow--l" aria-label="Scroll categories left" tabindex="-1" @click="scrollBy(-1)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <div ref="rowEl" class="vch__row" role="list" @scroll.passive="updateEdges" @wheel="onWheel">
      <button
        v-for="c in categories" :key="c.name"
        type="button" role="listitem"
        class="vch__chip" :class="{ 'vch__chip--on': c.name === modelValue }"
        :aria-pressed="c.name === modelValue"
        @click="toggle(c.name, $event)"
      >{{ c.name }}<small>{{ c.count }}</small></button>
    </div>
    <button v-if="canRight" type="button" class="vch__arrow vch__arrow--r" aria-label="Scroll categories right" tabindex="-1" @click="scrollBy(1)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  categories: Array<{ name: string; count: number }>
  /** The chip that's on (tapping it again turns it off). */
  modelValue: string | null
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string | null): void }>()

function toggle(name: string, e: MouseEvent) {
  emit('update:modelValue', props.modelValue === name ? null : name)
  // Bring the tapped chip fully into view, so its neighbours show it can scroll.
  ;(e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
}

const rowEl = ref<HTMLElement | null>(null)
const canLeft = ref(false)
const canRight = ref(false)
function updateEdges() {
  const el = rowEl.value
  if (!el) return
  canLeft.value = el.scrollLeft > 2
  canRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
}
function scrollBy(dir: 1 | -1) {
  const el = rowEl.value
  if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' })
}
/** A mouse wheel scrolls the row sideways (trackpads already scroll it natively). */
function onWheel(e: WheelEvent) {
  const el = rowEl.value
  if (!el || Math.abs(e.deltaX) >= Math.abs(e.deltaY) || el.scrollWidth <= el.clientWidth) return
  e.preventDefault()
  el.scrollLeft += e.deltaY
}
let ro: ResizeObserver | null = null
watch(rowEl, el => {
  ro?.disconnect()
  if (!el) return
  ro = new ResizeObserver(updateEdges)
  ro.observe(el)
  updateEdges()
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<style scoped>
.vch { position: relative; min-width: 0; }
.vch__row { display: flex; gap: 6px; overflow-x: auto; padding: 2px 2px 4px; scrollbar-width: none; overscroll-behavior-x: contain; scroll-padding-inline: 40px; }
.vch__row::-webkit-scrollbar { display: none; }
/* Fading edge where more chips are hidden */
.vch--l .vch__row { -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 44px); mask-image: linear-gradient(90deg, transparent 0, #000 44px); }
.vch--r .vch__row { -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 44px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 44px), transparent); }
.vch--l.vch--r .vch__row { -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 44px, #000 calc(100% - 44px), transparent); mask-image: linear-gradient(90deg, transparent 0, #000 44px, #000 calc(100% - 44px), transparent); }
.vch__arrow { position: absolute; z-index: 1; top: 3px; display: none; place-items: center; width: 32px; height: 32px; padding: 0; border: 1px solid #e5e7eb; border-radius: 50%; background: #fff; color: #1f2937; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.16); }
.vch__arrow:hover { background: #f3f4f6; }
.vch__arrow--l { left: 0; }
.vch__arrow--r { right: 0; }
/* Arrows only where there's a mouse; touch screens swipe */
@media (hover: hover) and (pointer: fine) { .vch__arrow { display: grid; } }
.vch__chip { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 13px; border: 1px solid #e5e7eb; border-radius: 999px; background: #fff; color: #1f2937; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.08); white-space: nowrap; }
.vch__chip small { color: #6b7280; font-weight: 600; }
.vch__chip--on { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.vch__chip--on small { color: rgba(255,255,255,0.75); }
</style>
