<template>
  <div class="pg" role="dialog" aria-modal="true" :aria-label="`${title} photos`" @click.stop>
    <!-- Soft, blurred copy of the current photo fills the edges, so a portrait
         photo on a wide screen never sits in a hard black box. -->
    <div class="pg__ambient" aria-hidden="true">
      <img v-if="photos[index]" :key="photos[index].id" :src="thumb(photos[index].url)" alt="" />
    </div>

    <div class="pg__stage">
      <div ref="trackEl" class="pg__track" tabindex="-1" @scroll.passive="onScroll">
        <div v-for="(p, i) in photos" :key="p.id" class="pg__slide">
          <img
            v-if="Math.abs(i - index) <= 2"
            :src="large(p.url)"
            :alt="p.caption || `${title} photo ${i + 1}`"
            :loading="Math.abs(i - index) <= 1 ? 'eager' : 'lazy'"
            decoding="async"
            draggable="false"
            @click="onSlideClick"
          />
        </div>
      </div>

      <template v-if="photos.length > 1">
        <button v-show="index > 0" type="button" class="pg__nav pg__nav--prev" aria-label="Previous photo" @click="go(index - 1)">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <button v-show="index < photos.length - 1" type="button" class="pg__nav pg__nav--next" aria-label="Next photo" @click="go(index + 1)">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </template>
    </div>

    <div class="pg__footer">
      <p class="pg__caption">
        <span v-if="photos[index]?.caption" class="pg__caption-text">{{ photos[index].caption }}</span>
        <span class="pg__counter">{{ index + 1 }} / {{ photos.length }}</span>
      </p>
      <div v-if="photos.length > 1" ref="stripEl" class="pg__strip" role="tablist" aria-label="Photos">
        <button
          v-for="(p, i) in photos"
          :key="p.id"
          type="button"
          role="tab"
          class="pg__thumb"
          :class="{ 'pg__thumb--on': i === index }"
          :aria-selected="i === index"
          :aria-label="`Photo ${i + 1}`"
          @click="go(i)"
        >
          <img :src="thumb(p.url)" alt="" loading="lazy" decoding="async" draggable="false" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useImage } from '#imports'

export type GalleryPhoto = { id: string; url: string; caption?: string | null }

const props = defineProps<{
  photos: GalleryPhoto[]
  title: string
  startIndex?: number
}>()
const emit = defineEmits<{ close: []; view: [index: number] }>()

const img = useImage()
// Phone photos arrive as 4–12 MB originals; resize through the image CDN
// (same helper the panorama loader uses) and fall back to the original.
function large(url: string) {
  try { return img(url, { width: 2048, quality: 80, format: 'webp' }) || url } catch { return url }
}
function thumb(url: string) {
  try { return img(url, { width: 240, quality: 60, format: 'webp' }) || url } catch { return url }
}

const index = ref(Math.min(Math.max(props.startIndex ?? 0, 0), Math.max(props.photos.length - 1, 0)))
const trackEl = ref<HTMLElement>()
const stripEl = ref<HTMLElement>()

function go(i: number, smooth = true) {
  if (i < 0 || i >= props.photos.length || !trackEl.value) return
  index.value = i
  // Ignore the in-between positions of this scroll, so the counter and
  // thumbnails jump straight to the target instead of ticking through.
  seekTarget = i
  clearTimeout(seekTimer)
  seekTimer = setTimeout(() => { seekTarget = -1 }, 900)
  trackEl.value.scrollTo({ left: i * trackEl.value.clientWidth, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' })
}

// Native scroll-snap does the swiping; this only keeps the index in sync.
let scrollRaf = 0
let seekTarget = -1
let seekTimer: ReturnType<typeof setTimeout> | undefined
function onScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    const el = trackEl.value
    if (!el || !el.clientWidth) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (seekTarget >= 0) {
      if (i === seekTarget) { seekTarget = -1; clearTimeout(seekTimer) }
      return
    }
    if (i !== index.value && i >= 0 && i < props.photos.length) index.value = i
  })
}

// Tap the right or left third of a photo to step (handy on touch, no aiming at arrows).
function onSlideClick(e: MouseEvent) {
  const w = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = (e.clientX - w.left) / w.width
  if (x > 0.66) go(index.value + 1)
  else if (x < 0.33) go(index.value - 1)
}

watch(index, async (i) => {
  emit('view', i)
  await nextTick()
  const t = stripEl.value?.children[i] as HTMLElement | undefined
  t?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
})

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Captured before the panorama's own key handlers, so arrows page photos
// instead of turning the hidden camera, and Esc goes back to 360°.
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') go(index.value + 1)
  else if (e.key === 'ArrowLeft') go(index.value - 1)
  else if (e.key === 'Escape') emit('close')
  else return
  e.preventDefault()
  e.stopImmediatePropagation()
}

// Keep the current photo in place when the window resizes or rotates.
let ro: ResizeObserver | null = null
onMounted(async () => {
  document.addEventListener('keydown', onKey, true)
  await nextTick()
  go(index.value, false)
  emit('view', index.value)
  if (trackEl.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => go(index.value, false))
    ro.observe(trackEl.value)
  }
  trackEl.value?.focus({ preventScroll: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey, true)
  ro?.disconnect()
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  clearTimeout(seekTimer)
})
</script>

<style scoped>
.pg {
  position: absolute; inset: 0; z-index: 70;
  display: flex; flex-direction: column;
  background: #07080c; color: #fff;
  overflow: hidden;
}
.pg__ambient { position: absolute; inset: 0; pointer-events: none; }
.pg__ambient img {
  width: 100%; height: 100%; object-fit: cover;
  filter: blur(40px) saturate(1.1) brightness(0.45);
  transform: scale(1.15);
  animation: pg-fade 0.4s ease;
}
@keyframes pg-fade { from { opacity: 0; } to { opacity: 1; } }

.pg__stage { position: relative; flex: 1; min-height: 0; padding-top: 72px; }
.pg__track {
  height: 100%;
  display: flex;
  overflow-x: auto; overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  outline: none;
}
.pg__track::-webkit-scrollbar { display: none; }
.pg__slide {
  flex: 0 0 100%; height: 100%;
  scroll-snap-align: center; scroll-snap-stop: always;
  display: flex; align-items: center; justify-content: center;
  padding: 8px clamp(12px, 6vw, 88px);
  box-sizing: border-box;
}
.pg__slide img {
  max-width: 100%; max-height: 100%;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  user-select: none; -webkit-user-drag: none;
  cursor: pointer;
}

.pg__nav {
  position: absolute; top: calc(50% + 36px); transform: translateY(-50%);
  width: 48px; height: 48px; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  color: #fff; cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}
.pg__nav:hover { background: rgba(255, 255, 255, 0.22); }
.pg__nav:active { transform: translateY(-50%) scale(0.94); }
.pg__nav--prev { left: 20px; }
.pg__nav--next { right: 20px; }

.pg__footer { position: relative; padding: 8px 0 max(16px, env(safe-area-inset-bottom)); }
.pg__caption {
  margin: 0 0 10px; padding: 0 16px;
  display: flex; justify-content: center; align-items: baseline; gap: 10px;
  font-size: 13px; font-weight: 600;
}
.pg__caption-text { color: #fff; }
.pg__counter { color: rgba(255, 255, 255, 0.6); font-variant-numeric: tabular-nums; }

.pg__strip {
  display: flex; gap: 8px;
  overflow-x: auto; scrollbar-width: none;
  padding: 4px max(16px, calc(50% - 430px));
  justify-content: safe center;
}
.pg__strip::-webkit-scrollbar { display: none; }
.pg__thumb {
  flex: none; width: 76px; height: 52px; padding: 0;
  border-radius: 10px; overflow: hidden;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.06);
  opacity: 0.55; cursor: pointer;
  transition: opacity 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}
.pg__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pg__thumb:hover { opacity: 0.85; }
.pg__thumb--on { opacity: 1; border-color: #fff; transform: translateY(-2px); }

@media (max-width: 640px) {
  .pg__stage { padding-top: 64px; }
  .pg__slide { padding: 4px 0; }
  .pg__slide img { border-radius: 0; box-shadow: none; }
  .pg__nav { display: none; } /* swipe and tap-to-step instead */
  .pg__thumb { width: 60px; height: 42px; border-radius: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .pg__ambient img { animation: none; }
  .pg__thumb { transition: none; }
}
</style>
