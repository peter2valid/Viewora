<template>
  <div class="carousel">
    <div ref="trackEl" class="carousel__track" @scroll="onScroll">
      <button
        v-for="(p, i) in photos"
        :key="p.id"
        type="button"
        class="carousel__slide"
        :aria-label="`Open photo ${i + 1} of ${photos.length}`"
        @click="$emit('tap', i)"
      >
        <img :src="p.thumbnail_url" :alt="p.name" loading="lazy" draggable="false" />
      </button>
    </div>

    <template v-if="photos.length > 1">
      <button v-show="index > 0" class="carousel__nav carousel__nav--prev" type="button" aria-label="Previous photo" @click.stop="go(index - 1)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <button v-show="index < photos.length - 1" class="carousel__nav carousel__nav--next" type="button" aria-label="Next photo" @click.stop="go(index + 1)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
      </button>
    </template>

    <div v-if="photos.length > 0" class="carousel__counter">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
      {{ index + 1 }} / {{ photos.length }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps<{
  photos: Array<{ id: string; name: string; thumbnail_url: string }>
  index: number
}>()

const emit = defineEmits<{
  (e: 'update:index', value: number): void
  (e: 'tap', index: number): void
}>()

const trackEl = ref<HTMLElement | null>(null)

// Native scroll-snap drives the swipe gesture itself (touch + trackpad both
// work for free); this handler just reads where the snap landed to keep the
// counter pill and any external state (fullscreen dock highlight) in sync.
let scrollRaf: number | null = null
function onScroll() {
  if (scrollRaf != null) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = null
    const el = trackEl.value
    if (!el || el.clientWidth === 0) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    if (next !== props.index && next >= 0 && next < props.photos.length) emit('update:index', next)
  })
}

function go(i: number) {
  const el = trackEl.value
  if (!el) return
  el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
}

// External index changes (e.g. the fullscreen room dock) scroll the track
// to match, without fighting the user's own in-progress swipe.
watch(
  () => props.index,
  async (i) => {
    await nextTick()
    const el = trackEl.value
    if (!el || el.clientWidth === 0) return
    if (Math.round(el.scrollLeft / el.clientWidth) !== i) el.scrollTo({ left: i * el.clientWidth })
  },
)

onBeforeUnmount(() => {
  if (scrollRaf != null) cancelAnimationFrame(scrollRaf)
})
</script>

<style scoped>
.carousel { position: absolute; inset: 0; }
.carousel__track {
  position: absolute; inset: 0; display: flex;
  overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.carousel__track::-webkit-scrollbar { display: none; }
.carousel__slide {
  flex: 0 0 100%; scroll-snap-align: start; height: 100%;
  padding: 0; border: none; background: var(--vo-elevated); cursor: pointer;
}
.carousel__slide img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }

.carousel__nav {
  position: absolute; top: 50%; z-index: 5; transform: translateY(-50%);
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); border: none;
  color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;
  opacity: 0; pointer-events: none; transition: opacity 140ms ease;
}
.carousel__nav--prev { left: 12px; }
.carousel__nav--next { right: 12px; }
@media (hover: hover) {
  .carousel:hover .carousel__nav { opacity: 1; pointer-events: auto; }
}
.carousel__nav:focus-visible { opacity: 1; pointer-events: auto; }

.carousel__counter {
  position: absolute; left: 12px; bottom: 12px; z-index: 5;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 9px; border-radius: var(--vo-radius-pill);
  background: rgba(0, 0, 0, 0.55); color: #fff;
  font-size: 0.72rem; font-weight: 600; font-variant-numeric: tabular-nums;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .carousel__track { scroll-behavior: auto; }
}
</style>
