<template>
  <div
    ref="rootEl"
    class="ct"
    :class="{ 'is-compact': compact, 'is-narrow': narrow, 'is-embed': embed }"
    :style="{ '--ct-top': topOffset, '--ct-bottom': bottomOffset }"
    @keydown.esc="ribbonOpen = false"
  >
    <div v-if="!items.length" class="ct__empty">This car has no photos yet.</div>

    <!-- Stage: one of a spin, the interior 360 viewer, or a detail photo. -->
    <VehicleSpinViewer
      v-if="active?.kind === 'spin'"
      :key="active.id"
      class="ct__layer"
      :views="active.spin!.views"
      :start-angle="active.spin!.start_angle"
      :hide-zoom="compact || (narrow && ribbonOpen)"
      :zoom-bottom="zoomBottom"
    />
    <!-- Mounted the first time the interior is opened, then kept: going back inside is instant. -->
    <div v-if="panoMounted" v-show="active?.kind === 'pano'" class="ct__layer">
      <ViewerPsvViewer
        ref="psvRef"
        :tour="tour"
        :share-url="shareUrl"
        :is-embed="embed"
        :hide-own-chrome="true"
        :hide-nav-arrows="ribbonOpen"
        class="ct__psv"
        @scene-changed="onSceneChanged"
        @loaded="onPanoLoaded"
      />
    </div>
    <VehicleSpinViewer
      v-if="active?.kind === 'photo'"
      :key="active.id"
      class="ct__layer"
      :views="[photoAsView(active)]"
      :autoplay="false"
      fit="contain"
      hide-bar
      :hide-zoom="compact || (narrow && ribbonOpen)"
      :zoom-bottom="zoomBottom"
    />
    <div class="ct__fade" :class="{ 'is-on': fading }" aria-hidden="true" />

    <!-- Exterior / Interior / Details: jump to the first view of each. -->
    <div v-if="groups.length > 1" class="ct__groups" role="tablist" aria-label="Part of the car">
      <button
        v-for="g in groups"
        :key="g.key"
        type="button"
        role="tab"
        class="ct__group"
        :class="{ 'is-on': active?.group === g.key }"
        :aria-selected="active?.group === g.key"
        @click="goGroup(g.key)"
      >{{ g.label }}</button>
    </div>

    <!-- Several spins (roof up, roof down): switch between them without leaving the exterior. -->
    <div v-if="active?.group === 'exterior' && spinItems.length > 1" class="ct__spins" role="tablist" aria-label="Spins">
      <button
        v-for="it in spinItems"
        :key="it.id"
        type="button"
        role="tab"
        class="ct__chip"
        :class="{ 'is-on': active.id === it.id }"
        :aria-selected="active.id === it.id"
        @click="go(it)"
      >{{ it.title }}</button>
    </div>

    <!-- Walk in / walk out, where the eye already is. -->
    <button v-if="stepTarget" type="button" class="ct__step" @click="go(stepTarget.item)">
      <template v-if="stepTarget.inside">
        {{ compact ? 'Inside' : 'Step inside' }}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
      </template>
      <template v-else>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>
        {{ compact ? 'Outside' : 'Back outside' }}
      </template>
    </button>

    <!-- Previous / next close-up. -->
    <template v-if="active?.kind === 'photo' && photoItems.length > 1">
      <button type="button" class="ct__nav ct__nav--prev" aria-label="Previous photo" @click="stepPhoto(-1)">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button type="button" class="ct__nav ct__nav--next" aria-label="Next photo" @click="stepPhoto(1)">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </template>

    <!-- Every view in one strip, grouped. Starts closed, so the car has the whole screen. -->
    <button
      v-if="items.length > 1 && !ribbonOpen"
      type="button"
      class="ct__ribbon-btn"
      :aria-label="`All views, ${items.length}. Now showing ${active?.title}`"
      aria-haspopup="true"
      @click="ribbonOpen = true"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
      <span class="ct__ribbon-btn-t">{{ active?.title }}</span>
      <span class="ct__ribbon-btn-n">{{ activeIndex + 1 }}/{{ items.length }}</span>
    </button>
    <nav v-if="ribbonOpen" class="ct__ribbon" aria-label="All views">
      <div ref="stripEl" class="ct__strip">
        <template v-for="g in groups" :key="g.key">
          <span class="ct__strip-label">{{ g.label }}</span>
          <button
            v-for="it in items.filter(x => x.group === g.key)"
            :key="it.id"
            type="button"
            class="ct__thumb"
            :class="{ 'is-on': active?.id === it.id }"
            :aria-current="active?.id === it.id ? 'true' : undefined"
            :data-id="it.id"
            @click="go(it)"
          >
            <img :src="it.thumb" alt="" loading="lazy" decoding="async" draggable="false" />
            <span v-if="it.kind === 'spin'" class="ct__thumb-badge" aria-hidden="true">360° spin</span>
            <span v-else-if="it.kind === 'pano'" class="ct__thumb-badge" aria-hidden="true">360°</span>
            <span class="ct__thumb-t">{{ it.title }}</span>
          </button>
        </template>
      </div>
      <button type="button" class="ct__ribbon-close" aria-label="Close all views" @click="ribbonOpen = false">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useImage } from '#imports'
import VehicleSpinViewer from '~/features/viewer/car/VehicleSpinViewer.vue'
import { buildCarTourItems, CAR_GROUP_LABELS, type CarTourItem, type CarGroup } from '~/shared/utils/carTour'
import type { VehicleView } from '~/shared/utils/vehicleViews'

const props = withDefaults(defineProps<{
  /** The public tour payload (space, scenes, gallery, vehicle_spins). */
  tour: any
  embed?: boolean
  shareUrl?: string
  /** Room the host page needs at the top (its own bar), so the controls sit below it. */
  topOffset?: string
  bottomOffset?: string
}>(), { embed: false, shareUrl: undefined, topOffset: '16px', bottomOffset: '16px' })

const emit = defineEmits<{ (e: 'item-change', item: CarTourItem): void }>()

const img = useImage()
const thumbOf = (url: string) => (url ? img(url, { width: 240, format: 'webp', quality: 72 }) : '')
const items = computed(() => buildCarTourItems(props.tour, thumbOf))
const groups = computed(() => (['exterior', 'interior', 'details'] as CarGroup[])
  .filter(g => items.value.some(i => i.group === g))
  .map(g => ({ key: g, label: CAR_GROUP_LABELS[g] })))
const spinItems = computed(() => items.value.filter(i => i.kind === 'spin'))
const photoItems = computed(() => items.value.filter(i => i.kind === 'photo'))

const activeId = ref<string | null>(items.value[0]?.id ?? null)
const active = computed(() => items.value.find(i => i.id === activeId.value) ?? items.value[0] ?? null)
const activeIndex = computed(() => Math.max(0, items.value.findIndex(i => i.id === active.value?.id)))
watch(active, (it) => { if (it) emit('item-change', it) }, { immediate: true })

// Small boxes (a listing page's split view): fewer buttons, shorter words. Pinch and wheel still zoom.
const rootEl = ref<HTMLElement | null>(null)
const compact = ref(false)
// Phone width: the top row only has room for the Exterior / Interior / Details switch.
const narrow = ref(false)
let ro: ResizeObserver | undefined
onMounted(() => {
  const measure = () => {
    const w = rootEl.value?.clientWidth ?? 999
    compact.value = (rootEl.value?.clientHeight ?? 999) < 460 || w < 360
    narrow.value = w < 600
  }
  measure()
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) { ro = new ResizeObserver(measure); ro.observe(rootEl.value) }
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => { ro?.disconnect(); window.removeEventListener('keydown', onKey); if (fadeTimer) clearTimeout(fadeTimer) })

const ribbonOpen = ref(false)
const zoomBottom = computed(() => (ribbonOpen.value ? 'calc(var(--ct-bottom) + 190px)' : '50%'))
const stripEl = ref<HTMLElement | null>(null)
watch(ribbonOpen, async (open) => {
  if (!open) return
  await nextTick()
  stripEl.value?.querySelector<HTMLElement>(`[data-id="${CSS.escape(active.value?.id ?? '')}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' })
})

// ── Moving between views: a short fade through black, like CloudPano's crossfade ──
const fading = ref(false)
let fadeTimer: ReturnType<typeof setTimeout> | undefined
const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function go(it: CarTourItem) {
  if (!it || it.id === active.value?.id) return
  const swap = () => {
    if (it.kind === 'pano') openPano(it.sceneId!)
    activeId.value = it.id
  }
  // Inside to inside is the 360 viewer's own walk: no fade.
  if (reduceMotion || (it.kind === 'pano' && active.value?.kind === 'pano')) { swap(); return }
  fading.value = true
  if (fadeTimer) clearTimeout(fadeTimer)
  fadeTimer = setTimeout(() => {
    swap()
    requestAnimationFrame(() => { fading.value = false })
  }, 170)
}

function goGroup(g: CarGroup) {
  if (active.value?.group === g) return
  const first = items.value.find(i => i.group === g)
  if (first) go(first)
}

function stepPhoto(dir: number) {
  const list = photoItems.value
  const i = list.findIndex(p => p.id === active.value?.id)
  if (i < 0) return
  go(list[(i + dir + list.length) % list.length])
}

const stepTarget = computed(() => {
  const a = active.value
  if (!a) return null
  const firstInside = items.value.find(i => i.group === 'interior')
  const firstOutside = items.value.find(i => i.group === 'exterior')
  if (a.group === 'exterior' && firstInside) return { inside: true, item: firstInside }
  if (a.group === 'interior' && firstOutside) return { inside: false, item: firstOutside }
  return null
})

function onKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  if (e.key === 'Escape' && ribbonOpen.value) ribbonOpen.value = false
  else if (active.value?.kind === 'photo' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !rootEl.value?.querySelector('.vsv:focus')) {
    stepPhoto(e.key === 'ArrowLeft' ? -1 : 1)
  }
}

// ── Interior 360 ──
const psvRef = ref<any>(null)
const panoMounted = ref(false)
let pendingScene: string | null = null
function openPano(sceneId: string) {
  pendingScene = sceneId
  if (!panoMounted.value) { panoMounted.value = true; return }
  psvRef.value?.goToScene(sceneId)
}
function onPanoLoaded() {
  if (pendingScene) psvRef.value?.goToScene(pendingScene)
}
function onSceneChanged(sceneId: string) {
  // First report from a freshly mounted viewer: it opened on its own first scene.
  if (pendingScene && sceneId !== pendingScene) { psvRef.value?.goToScene(pendingScene); return }
  pendingScene = null
  const it = items.value.find(i => i.kind === 'pano' && i.sceneId === sceneId)
  if (it && active.value?.kind === 'pano') activeId.value = it.id
}

// A detail photo shown in the spin viewer: one frame, so it gets the same zoom.
function photoAsView(it: CarTourItem): VehicleView {
  return { id: it.id, image_url: it.url!, label: it.title, angle: 0, width: null, height: null, hotspots: [] }
}

defineExpose({ go, items })
</script>

<style scoped>
.ct {
  position: absolute; inset: 0; overflow: hidden; background: #0b0b0c; color: #fff;
  --ct-top: 16px; --ct-bottom: 16px;
}
.ct__layer { position: absolute; inset: 0; }
.ct__psv { position: absolute; inset: 0; width: 100%; height: 100%; }
.ct__empty { position: absolute; inset: 0; display: grid; place-items: center; color: rgba(255,255,255,0.6); font-size: 14px; }
.ct__fade {
  position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none; z-index: 5;
  transition: opacity 200ms ease;
}
.ct__fade.is-on { opacity: 1; transition-duration: 160ms; }

.ct__groups {
  position: absolute; z-index: 21; left: 50%; top: var(--ct-top); transform: translateX(-50%);
  display: inline-flex; padding: 3px; border-radius: 999px;
  background: rgba(0,0,0,0.62); border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.ct__group {
  min-height: 40px; padding: 0 16px; border-radius: 999px; border: 0; background: transparent;
  color: rgba(255,255,255,0.78); font-size: 13px; font-weight: 700; cursor: pointer;
  transition: background 120ms, color 120ms;
}
.ct__group.is-on { background: #fff; color: #0b0b0c; }
.ct__group:focus-visible, .ct__chip:focus-visible, .ct__step:focus-visible, .ct__nav:focus-visible,
.ct__ribbon-btn:focus-visible, .ct__thumb:focus-visible, .ct__ribbon-close:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

.ct__spins {
  position: absolute; z-index: 21; left: 50%; top: calc(var(--ct-top) + 54px); transform: translateX(-50%);
  display: flex; gap: 6px; max-width: calc(100% - 32px); overflow-x: auto; scrollbar-width: none;
}
.ct__chip {
  flex: none; min-height: 36px; padding: 0 14px; border-radius: 999px; cursor: pointer;
  background: rgba(0,0,0,0.55); color: #fff; border: 1px solid rgba(255,255,255,0.2);
  font-size: 12.5px; font-weight: 700;
}
.ct__chip.is-on { background: rgba(255,255,255,0.92); color: #0b0b0c; border-color: transparent; }

.ct__step {
  position: absolute; z-index: 21; right: 16px; top: var(--ct-top);
  display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.66); color: #fff;
  font-size: 14px; font-weight: 700; cursor: pointer;
}
.ct__step:active { background: rgba(0,0,0,0.85); }
.ct.is-compact .ct__step { padding: 0 12px; font-size: 13px; }

.ct__nav {
  position: absolute; z-index: 6; top: 50%; transform: translateY(-50%);
  width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
  background: rgba(0,0,0,0.55); color: #fff; border: 1px solid rgba(255,255,255,0.16);
}
.ct__nav--prev { left: 12px; }
.ct__nav--next { right: 68px; }
.ct.is-compact .ct__nav--next { right: 12px; }

.ct__ribbon-btn {
  position: absolute; z-index: 21; left: 16px; bottom: var(--ct-bottom);
  display: inline-flex; align-items: center; gap: 8px; max-width: min(320px, calc(100% - 32px));
  min-height: 44px; padding: 0 14px; border-radius: 999px; cursor: pointer;
  background: rgba(0,0,0,0.66); color: #fff; border: 1px solid rgba(255,255,255,0.18);
  font-size: 13px; font-weight: 700;
}
.ct__ribbon-btn-t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct__ribbon-btn-n { font-size: 11.5px; opacity: 0.65; font-variant-numeric: tabular-nums; }
/* Phone width: the spin's turn bar sits bottom-centre, so the strip button (left) and the
   step-inside button (right) sit just above it, clear of the switch at the top. */
.ct.is-narrow .ct__ribbon-btn { bottom: calc(var(--ct-bottom) + 78px); max-width: 46%; }
.ct.is-narrow .ct__step { top: auto; bottom: calc(var(--ct-bottom) + 78px); padding: 0 12px; font-size: 13px; }

.ct__ribbon {
  position: absolute; z-index: 22; left: 0; right: 0; bottom: 0;
  padding: 12px var(--ct-ribbon-right, 12px) max(12px, env(safe-area-inset-bottom)) 12px;
  background: linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.55) 70%, transparent);
}
.ct__strip { display: flex; align-items: flex-end; gap: 8px; overflow-x: auto; scrollbar-width: thin; padding: 4px 2px 2px; }
.ct__strip-label {
  flex: none; align-self: center; writing-mode: vertical-rl; transform: rotate(180deg);
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.6);
  padding: 0 2px;
}
.ct__thumb {
  position: relative; flex: none; width: 124px; height: 82px; padding: 0; border-radius: 10px; overflow: hidden; cursor: pointer;
  border: 2px solid transparent; background: #1a1a1d;
}
.ct__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ct__thumb.is-on { border-color: #fff; }
.ct__thumb-badge {
  position: absolute; top: 5px; left: 5px; padding: 2px 6px; border-radius: 6px;
  background: rgba(0,0,0,0.65); font-size: 10px; font-weight: 800; color: #fff;
}
.ct__thumb-t {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 14px 6px 5px; text-align: left;
  background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
  font-size: 11.5px; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ct__ribbon-close {
  position: absolute; right: 12px; top: -48px;
  width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
  background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.18);
}
@media (prefers-reduced-motion: reduce) {
  .ct__fade, .ct__group { transition: none; }
}
</style>
