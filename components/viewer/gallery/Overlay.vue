<template>
  <Teleport to="body">
    <div class="overlay" :class="{ 'overlay--lightbox': mode === 'lightbox' }" role="dialog" aria-modal="true" :aria-label="`${title} photos`">
      <header class="overlay__header">
        <button type="button" class="overlay__closebtn" @click="onClose">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          <span v-if="mode === 'grid'">Close</span>
        </button>
        <span v-if="mode === 'grid'" class="overlay__title">{{ photos.length }} Photos</span>
        <div class="overlay__actions">
          <NuxtLink v-if="mode === 'grid' && ownerEditHref" :to="ownerEditHref" class="overlay__editlink">Edit photos</NuxtLink>
          <button type="button" class="overlay__iconbtn" aria-label="Share listing" @click="$emit('share')">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.5 15.4 6.5M8.6 13.5l6.8 4" /></svg>
          </button>
          <button type="button" class="overlay__iconbtn" :class="{ 'overlay__iconbtn--saved': saved }" :disabled="savePending" aria-label="Save listing" @click="$emit('toggle-save')">
            <svg viewBox="0 0 24 24" width="17" height="17" :fill="saved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
          </button>
        </div>
      </header>

      <div v-if="mode === 'grid'" ref="gridEl" class="overlay__grid">
        <button
          v-for="(p, i) in photos"
          :key="p.id"
          type="button"
          :class="['grid__item', `grid__item--${gridRoles[i]}`]"
          :data-index="i"
          @click="openLightbox(i)"
        >
          <img :src="p.thumbnail_url" :alt="p.name" loading="lazy" />
        </button>
      </div>

      <div v-else class="overlay__lightbox">
        <div ref="lbTrackEl" class="lightbox__track" @scroll="onLbScroll">
          <div v-for="p in photos" :key="p.id" class="lightbox__slide">
            <img :src="p.thumbnail_url" :alt="p.name" />
          </div>
        </div>
        <template v-if="photos.length > 1">
          <button v-show="lightboxIndex > 0" class="overlay__nav overlay__nav--prev" type="button" aria-label="Previous photo" @click="goLightbox(lightboxIndex - 1)">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button v-show="lightboxIndex < photos.length - 1" class="overlay__nav overlay__nav--next" type="button" aria-label="Next photo" @click="goLightbox(lightboxIndex + 1)">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </template>
        <div class="lightbox__counter">Showing {{ lightboxIndex + 1 }}/{{ photos.length }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  photos: Array<{ id: string; name: string; thumbnail_url: string }>
  initialIndex: number
  title: string
  isOwner: boolean
  ownerEditHref: string | null
  saved: boolean
  savePending: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'toggle-save'): void
  (e: 'share'): void
}>()

const mode = ref<'grid' | 'lightbox'>('grid')
const lightboxIndex = ref(0)
const gridEl = ref<HTMLElement | null>(null)
const lbTrackEl = ref<HTMLElement | null>(null)

// Repeating 4-photo rhythm — full-width shot, then a tall "big" tile paired
// with two stacked smaller ones beside it — matching the curated collage
// look real-estate listings use (as opposed to a plain uniform grid).
// Only applied to complete groups of 4; a leftover tail falls back to a
// single full-width shot (tail of 1) or plain squares (tail of 2-3) so a
// "big" tile is never left without both of its stacked partners.
const gridRoles = computed(() => {
  const total = props.photos.length
  return props.photos.map((_p, i) => {
    const cycle = i % 4
    const blockStart = i - cycle
    if (blockStart + 4 <= total) {
      return (['wide', 'big', 'top', 'bottom'] as const)[cycle]
    }
    const tailLength = total - blockStart
    return tailLength === 1 ? 'wide' : 'square'
  })
})

function onClose() {
  if (mode.value === 'lightbox') mode.value = 'grid'
  else emit('close')
}

async function openLightbox(i: number) {
  lightboxIndex.value = i
  mode.value = 'lightbox'
  await nextTick()
  const el = lbTrackEl.value
  if (el) el.scrollTo({ left: i * el.clientWidth })
}

let lbScrollRaf: number | null = null
function onLbScroll() {
  if (lbScrollRaf != null) return
  lbScrollRaf = requestAnimationFrame(() => {
    lbScrollRaf = null
    const el = lbTrackEl.value
    if (!el || el.clientWidth === 0) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    if (next !== lightboxIndex.value && next >= 0 && next < props.photos.length) lightboxIndex.value = next
  })
}
function goLightbox(i: number) {
  const el = lbTrackEl.value
  if (!el) return
  el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') onClose()
  if (mode.value === 'lightbox') {
    if (e.key === 'ArrowLeft' && lightboxIndex.value > 0) goLightbox(lightboxIndex.value - 1)
    if (e.key === 'ArrowRight' && lightboxIndex.value < props.photos.length - 1) goLightbox(lightboxIndex.value + 1)
  }
}

// Grid opens straight into view — no lightbox stop-off — so it should still
// start scrolled to whichever photo the buyer was already looking at in the
// hero carousel, rather than always resetting to the top.
onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
  if (props.initialIndex > 0) {
    await nextTick()
    gridEl.value?.querySelector(`[data-index="${props.initialIndex}"]`)?.scrollIntoView({ block: 'center' })
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
  if (lbScrollRaf != null) cancelAnimationFrame(lbScrollRaf)
})
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 200;
  display: flex; flex-direction: column;
  background: var(--vo-page); color: var(--vo-text);
  font-family: var(--font-display, -apple-system, sans-serif);
}
.overlay--lightbox { background: #08080a; color: #fff; }

.overlay__header {
  flex: 0 0 auto; display: flex; align-items: center; gap: 10px;
  padding: max(14px, env(safe-area-inset-top)) 16px 12px;
  border-bottom: 1px solid var(--vo-border);
}
.overlay--lightbox .overlay__header { border-bottom-color: rgba(255, 255, 255, 0.1); }
.overlay__closebtn {
  flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 10px 0 8px; border-radius: var(--vo-radius-pill);
  background: none; border: none; color: inherit; cursor: pointer;
  font-size: 0.86rem; font-weight: 700;
}
.overlay__title { flex: 1 1 auto; text-align: center; font-size: 0.86rem; font-weight: 700; }
.overlay__actions { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; }
.overlay__editlink {
  font-size: 0.78rem; font-weight: 700; color: var(--vo-secondary);
  text-decoration: none; margin-right: 4px; white-space: nowrap;
}
.overlay__iconbtn {
  width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: none; border: 1px solid var(--vo-border); color: inherit; cursor: pointer; flex: 0 0 auto;
}
.overlay--lightbox .overlay__iconbtn { border-color: rgba(255, 255, 255, 0.2); }
.overlay__iconbtn--saved { color: var(--vo-text); }
.overlay__iconbtn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Grid — repeating rhythm of a full-width shot then a tall tile paired with
   two stacked ones beside it (see gridRoles), rather than a plain uniform
   grid — matches the curated collage look real-estate listings use. */
.overlay__grid {
  flex: 1 1 auto; overflow-y: auto; -webkit-overflow-scrolling: touch;
  display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: min-content;
  align-content: start; gap: 3px;
  padding: 3px 3px calc(24px + env(safe-area-inset-bottom));
}
.grid__item { padding: 0; border: none; background: var(--vo-elevated); cursor: pointer; aspect-ratio: 1; overflow: hidden; }
.grid__item--wide { grid-column: 1 / -1; aspect-ratio: 16 / 11; }
.grid__item--big { grid-row: span 2; aspect-ratio: unset; }
.grid__item img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Lightbox */
.overlay__lightbox { position: relative; flex: 1 1 auto; overflow: hidden; }
.lightbox__track {
  position: absolute; inset: 0; display: flex;
  overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.lightbox__track::-webkit-scrollbar { display: none; }
.lightbox__slide {
  flex: 0 0 100%; scroll-snap-align: start; height: 100%;
  display: flex; align-items: center; justify-content: center; padding: 12px;
}
.lightbox__slide img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }

.overlay__nav {
  position: absolute; top: 50%; z-index: 5; transform: translateY(-50%);
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(8px); border: none;
  color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.overlay__nav--prev { left: 14px; }
.overlay__nav--next { right: 14px; }

.lightbox__counter {
  position: absolute; left: 50%; bottom: max(20px, env(safe-area-inset-bottom)); transform: translateX(-50%);
  padding: 7px 14px; border-radius: var(--vo-radius-pill);
  background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(8px);
  color: #fff; font-size: 0.78rem; font-weight: 600; font-variant-numeric: tabular-nums;
  pointer-events: none;
}

/* Same 2-up rhythm on desktop, just centered with more breathing room —
   an edge-to-edge 2-column grid on a wide viewport makes each tile huge. */
@media (min-width: 720px) {
  .overlay__grid {
    max-width: 760px; margin: 0 auto; width: 100%;
    gap: 6px; padding: 6px 6px calc(28px + env(safe-area-inset-bottom));
  }
}
</style>
