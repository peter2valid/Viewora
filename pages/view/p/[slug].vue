<template>
  <div class="detail">
    <div v-if="pending" class="detail__state">
      <p class="detail__state-text">Loading…</p>
    </div>

    <div v-else-if="fetchError" class="detail__state">
      <p class="detail__state-text">{{ fetchError }}</p>
      <NuxtLink to="/view" class="detail__state-link">Back to listings</NuxtLink>
    </div>

    <div v-else-if="state === 'empty'" class="detail__state">
      <p class="detail__state-text">This tour is published, but no renderable photos are available yet.</p>
      <NuxtLink to="/view" class="detail__state-link">Back to listings</NuxtLink>
    </div>

    <template v-else-if="space">
      <div class="stage" :class="{ 'stage--full': fullscreen }">
        <div ref="viewerPaneEl" class="viewer-pane" :class="{ 'is-resizing': isResizing }" :style="viewerPaneStyle">
          <ViewerPsvViewer
            v-if="isPanorama"
            ref="psvViewerRef"
            :tour="tourData"
            :hide-own-chrome="true"
            :hide-nav-arrows="fullscreen && !dockCollapsed"
            class="pano pano--psv"
            @scene-changed="onViewerSceneChanged"
          />
          <div
            v-else
            ref="panoEl"
            class="pano"
            :style="{ backgroundImage: heroImage ? `url('${heroImage}')` : 'none' }"
            role="img"
            :aria-label="`${space.title} preview, drag to look around`"
          />
          <div class="pano__scrim" />

          <div class="topbar">
            <NuxtLink to="/view" class="iconbtn" aria-label="Back to listings">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </NuxtLink>
            <div class="topbar__right">
              <span v-if="heroItems.length > 0" class="trustbadge">
                <span class="trustbadge__dot" />
                <template v-if="isPanorama">360° · {{ heroItems.length }} {{ heroItems.length === 1 ? 'Room' : 'Rooms' }}</template>
                <template v-else>{{ heroItems.length }} {{ heroItems.length === 1 ? 'Photo' : 'Photos' }}</template>
              </span>
              <button class="themebtn" type="button" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
                {{ isDark ? 'Light' : 'Dark' }}
              </button>
              <!-- Same top-right icon-rail placement app.viewora.software's
                   own viewer uses for its Fullscreen control, rather than a
                   bottom-right float — which collided with the scene dock
                   once both were on screen at mobile fullscreen sizes. -->
              <button class="iconbtn" type="button" :aria-label="fullscreen ? 'Show property details' : 'View fullscreen'" @click="toggleFullscreen">
                <svg v-if="!fullscreen" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/></svg>
                <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V3h5M21 8V3h-5M21 16v5h-5M3 16v5h5"/></svg>
              </button>
              <button class="iconbtn" :class="{ 'iconbtn--saved': saved }" :disabled="savePending" aria-label="Save listing" @click="toggleSave">
                <svg viewBox="0 0 24 24" width="18" height="18" :fill="saved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
              </button>
            </div>
          </div>

          <!-- Only shown fullscreen — at the split-screen sizes the strip of
               large thumbnail cards overwhelmed the pane. The room list
               inside the sheet below still covers scene-switching there.
               Starts collapsed, same default as app.viewora.software's own
               dock (dockCollapsed in components/viewer/PsvViewer.vue) —
               opening it hides the in-panorama walk-through arrows via
               hide-nav-arrows above, so the two don't overlap. -->
          <UiGlassDock
            v-if="heroItems.length > 1 && fullscreen"
            v-model:collapsed="dockCollapsed"
            :items="dockItems"
            :active-id="activeDockId"
            :sortable="false"
            :show-controls="false"
            :bottom-px="20"
            :edge-inset-px="16"
            glass-class="dock-glass-superdark"
            @select="onDockSelect"
          />
        </div>

        <!-- Drag to resize the split — not locked to a fixed ratio. -->
        <div
          v-if="!fullscreen"
          class="resizer"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize viewer"
          @mousedown="onResizeStart"
          @touchstart="onResizeStart"
        >
          <span class="resizer__grip" />
        </div>

        <div v-show="!fullscreen" ref="sheetEl" class="sheet">
          <div class="sheet__header">
            <div class="sheet__eyebrow-row">
              <span class="sheet__tag">{{ statusLabel }}</span>
              <span v-if="space.location_text" class="sheet__location">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>
                {{ space.location_text }}
              </span>
            </div>
            <div class="sheet__pricerow">
              <div>
                <p class="sheet__price">{{ priceText }} <small>{{ space.title }}</small></p>
                <p v-if="facts" class="sheet__facts">{{ facts }}</p>
              </div>
              <a v-if="space.phone" class="btn btn--whatsapp" :href="whatsapp" target="_blank" rel="noopener">
                <WhatsappIcon />
                Chat
              </a>
            </div>
          </div>

          <div class="sheet__scroll">
            <template v-if="keyFacts.length > 0">
              <p class="sheet__section-label">Key Facts</p>
              <div class="factgrid">
                <div v-for="f in keyFacts" :key="f.label" class="factcard">
                  <b>{{ f.value }}</b>
                  <span>{{ f.label }}</span>
                </div>
              </div>
            </template>

            <template v-if="space.amenities && space.amenities.length > 0">
              <p class="sheet__section-label">Features &amp; Amenities</p>
              <div class="amenities">
                <span v-for="a in space.amenities" :key="a" class="amenity">{{ a }}</span>
              </div>
            </template>

            <template v-if="space.description">
              <p class="sheet__section-label">About</p>
              <p class="sheet__desc">{{ space.description }}</p>
            </template>

            <template v-if="heroItems.length > 0">
              <p class="sheet__section-label">
                {{ isPanorama ? 'Walk Through' : 'Photos' }}
                <span class="sheet__section-count">
                  {{ heroItems.length }} {{ isPanorama ? (heroItems.length === 1 ? 'room' : 'rooms') : (heroItems.length === 1 ? 'photo' : 'photos') }}
                </span>
              </p>
              <div class="roomlist">
                <button
                  v-for="(item, i) in heroItems"
                  :key="item.id"
                  class="roomrow"
                  :class="{ 'roomrow--active': i === activeIndex }"
                  @click="setActiveRoom(i)"
                >
                  <img :src="item.thumbnail_url" alt="" loading="lazy" />
                  <span>
                    <span class="roomrow__index">{{ String(i + 1).padStart(2, '0') }}</span>
                    <span class="roomrow__name">{{ item.name }}</span>
                  </span>
                </button>
              </div>

              <a v-if="isPanorama" class="btn btn--ghost btn--full" :href="fullTourUrl">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 5 3 12l6 7M15 5l6 7-6 7"/></svg>
                Step inside the full 360° tour
              </a>
            </template>

            <p class="sheet__section-label">Listed By</p>
            <div class="ownercard">
              <div class="ownercard__avatar">PO</div>
              <div class="ownercard__body">
                <p class="ownercard__name">Property Owner</p>
                <p class="ownercard__meta">Contact via WhatsApp below</p>
              </div>
            </div>

            <div v-if="space.phone" class="sheet__cta">
              <p>Questions about this listing? Reach out directly on WhatsApp.</p>
              <a class="btn btn--whatsapp" :href="whatsapp" target="_blank" rel="noopener">
                <WhatsappIcon />
                Chat on WhatsApp
              </a>
              <p class="sheet__phone">+{{ space.phone }}</p>
            </div>
          </div>
        </div>

        <UiNavDock v-if="!fullscreen" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, h } from 'vue'
import { useAsyncData, useHead, useRoute, useSeoMeta, useSupabaseUser, createError } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { useAnonymousAuth } from '~/composables/useAnonymousAuth'
import { formatPrice, factsLine, whatsappUrl } from '~/utils/listingDisplay'

const { apiFetch } = useApiFetch()
const { ensureSession } = useAnonymousAuth()
const { isDark, toggle: toggleTheme, init: initTheme } = useTheme()
onMounted(initTheme)
const supabaseUser = useSupabaseUser()
const route = useRoute()
const slug = route.params.slug as string

const pending = ref(true)
const fetchError = ref('')
const state = ref<'loading' | 'ready' | 'empty' | 'error'>('loading')
const space = ref<any>(null)
const rooms = ref<Array<{ id: string; name: string; thumbnail_url: string }>>([])
const photos = ref<Array<{ id: string; name: string; thumbnail_url: string }>>([])
// Raw { space, scenes } payload, passed straight through to ViewerPsvViewer
// (same shape it already consumes on pages/p/[slug].vue) when the listing
// has real 360 scenes.
const tourData = ref<any>(null)

const { data: tourPayload, error: tourError } = await useAsyncData(
  `view-tour:${slug}`,
  () => apiFetch<any>(`/p/${encodeURIComponent(slug)}`),
  { server: true, lazy: false },
)

if (tourError.value) {
  const status = (tourError.value as any)?.response?.status ?? (tourError.value as any)?.status ?? 500
  if (status === 404) {
    throw createError({ statusCode: 404, statusMessage: 'Listing not found', fatal: true })
  }
  fetchError.value = 'This listing is unavailable right now.'
  state.value = 'error'
} else if (tourPayload.value) {
  const tour = tourPayload.value?.tour ?? tourPayload.value
  tourData.value = tour
  space.value = tour?.space ?? null
  rooms.value = (tour?.scenes ?? [])
    .filter((s: any) => s.thumbnail_url)
    .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((s: any) => ({ id: s.id, name: s.name || 'Room', thumbnail_url: s.thumbnail_url }))
  // Gallery-only listings (no 360° scene) still deserve a working detail
  // screen — previously any listing without a scene fell straight to the
  // "empty" state even when real photos existed.
  photos.value = (tour?.gallery ?? [])
    .map((g: any, i: number) => ({ id: g.id, name: `Photo ${i + 1}`, thumbnail_url: g.url }))
  state.value = (rooms.value.length > 0 || photos.value.length > 0) ? 'ready' : 'empty'
}
pending.value = false

const activeIndex = ref(0)
// Real 360° scenes take priority when both exist; photos are the fallback
// hero source for listings that only have gallery photos.
const isPanorama = computed(() => rooms.value.length > 0)
const heroItems = computed(() => (isPanorama.value ? rooms.value : photos.value))
// Only meaningful for the flat-photo fallback below — the real panorama
// viewer renders its own canvas, it doesn't use a background image.
const heroImage = computed(() => (isPanorama.value ? null : heroItems.value[activeIndex.value]?.thumbnail_url || null))

const psvViewerRef = ref<any>(null)

// Google Maps-style split: the viewer pane and the details pane are two
// fixed, non-overlapping regions (see .viewer-pane / .sheet below) — tapping
// this expands the viewer pane to fill the screen and hides the details
// pane, rather than dragging one over the other.
const fullscreen = ref(false)
function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && fullscreen.value) fullscreen.value = false
}

// Same scene-switcher UI as app.viewora.software's standalone tour page
// (components/ui/GlassDock.vue, glass-class="dock-glass-superdark") instead
// of a bespoke pill row, so the two products look and feel like one thing.
const dockItems = computed(() =>
  heroItems.value.map((item) => ({ id: item.id, label: item.name, imageUrl: item.thumbnail_url })),
)
const activeDockId = computed(() => heroItems.value[activeIndex.value]?.id ?? '')
// Starts collapsed, matching PsvViewer's own internal dock default — avoids
// popping open over an in-panorama nav arrow the instant fullscreen opens.
const dockCollapsed = ref(true)
function onDockSelect(id: string) {
  const idx = heroItems.value.findIndex((item) => item.id === id)
  if (idx !== -1) setActiveRoom(idx)
}

// ── Drag to resize the viewer pane / details sheet split ────────────────
// Not locked to a fixed ratio (Google Maps-style: the boundary between the
// map/Street View pane and the details panel is user-draggable). Sets an
// explicit pixel height on .viewer-pane once the user drags; until then it
// falls back to the CSS default (42vh mobile / 54vh desktop).
const viewerPaneEl = ref<HTMLElement | null>(null)
const viewerHeightPx = ref<number | null>(null)
// Fullscreen always wins over a manually dragged height — .stage--full's
// CSS rule handles that, an inline style here would fight it.
const viewerPaneStyle = computed(() =>
  !fullscreen.value && viewerHeightPx.value != null ? { height: `${viewerHeightPx.value}px` } : {},
)

const RESIZE_MIN_PX = 160
const RESIZE_BOTTOM_RESERVE_PX = 180 // keeps the sheet's price/CTA header grabbable

function clampViewerHeight(px: number): number {
  const max = window.innerHeight - RESIZE_BOTTOM_RESERVE_PX
  return Math.min(Math.max(px, RESIZE_MIN_PX), Math.max(max, RESIZE_MIN_PX))
}

const isResizing = ref(false)
let resizeStartY = 0
let resizeStartHeight = 0
// The panorama is a WebGL canvas that resizes+re-renders on every container
// size change — applying every raw pointermove directly fired more resizes
// than the GPU could keep up with, so the image visibly lagged/jumped
// during the drag. Batching to one update per animation frame caps it to
// what the browser can actually paint.
let pendingHeight: number | null = null
let resizeRaf: number | null = null

function onResizeStart(e: MouseEvent | TouchEvent) {
  if (!viewerPaneEl.value) return
  isResizing.value = true
  resizeStartY = 'touches' in e ? e.touches[0].clientY : e.clientY
  resizeStartHeight = viewerPaneEl.value.getBoundingClientRect().height
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeEnd)
  window.addEventListener('touchmove', onResizeMove, { passive: false })
  window.addEventListener('touchend', onResizeEnd)
}
function onResizeMove(e: MouseEvent | TouchEvent) {
  if (!isResizing.value) return
  if ('touches' in e) e.preventDefault()
  const y = 'touches' in e ? e.touches[0].clientY : e.clientY
  pendingHeight = clampViewerHeight(resizeStartHeight + (y - resizeStartY))
  if (resizeRaf == null) {
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null
      if (pendingHeight != null) viewerHeightPx.value = pendingHeight
    })
  }
}
function onResizeEnd() {
  isResizing.value = false
  if (resizeRaf != null) { cancelAnimationFrame(resizeRaf); resizeRaf = null }
  if (pendingHeight != null) { viewerHeightPx.value = pendingHeight; pendingHeight = null }
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeEnd)
  window.removeEventListener('touchmove', onResizeMove)
  window.removeEventListener('touchend', onResizeEnd)
}
function onWindowResize() {
  if (viewerHeightPx.value != null) viewerHeightPx.value = clampViewerHeight(viewerHeightPx.value)
}

function setActiveRoom(i: number) {
  activeIndex.value = i
  if (isPanorama.value) {
    const targetId = rooms.value[i]?.id
    if (targetId) psvViewerRef.value?.goToScene(targetId)
  } else if (panoEl.value) {
    panoEl.value.style.backgroundPositionX = '0px'
  }
}

// Keeps our room rail/list highlight in sync if the scene changes by any
// means other than tapping our own UI (e.g. a future in-viewer hotspot jump).
function onViewerSceneChanged(sceneId: string) {
  const idx = rooms.value.findIndex((r) => r.id === sceneId)
  if (idx !== -1) activeIndex.value = idx
}

const priceText = computed(() => formatPrice(space.value?.price_kes))
const facts = computed(() => (space.value ? factsLine(space.value) : ''))
const whatsapp = computed(() => whatsappUrl(space.value?.phone, space.value?.title || 'this listing'))
const fullTourUrl = computed(() => `/p/${space.value?.slug || slug}`)

const STATUS_LABELS: Record<string, string> = { available: 'Available', sold: 'Sold', rented: 'Rented' }
const statusLabel = computed(() => STATUS_LABELS[space.value?.listing_status] || 'Available')

const keyFacts = computed(() => {
  const s = space.value
  if (!s) return []
  if (s.space_type === 'residential') {
    const out = []
    if (s.bedrooms) out.push({ value: String(s.bedrooms), label: 'Bedrooms' })
    if (s.bathrooms) out.push({ value: String(s.bathrooms), label: 'Bathrooms' })
    if (s.area_sqm) out.push({ value: `${s.area_sqm} m²`, label: 'Floor Area' })
    return out
  }
  if (s.space_type === 'automotive') {
    const out = []
    if (s.vehicle_year) out.push({ value: String(s.vehicle_year), label: 'Year' })
    if (s.vehicle_mileage_km != null) out.push({ value: `${s.vehicle_mileage_km.toLocaleString('en-KE')} km`, label: 'Mileage' })
    if (s.vehicle_transmission) out.push({ value: s.vehicle_transmission[0].toUpperCase() + s.vehicle_transmission.slice(1), label: 'Transmission' })
    if (s.vehicle_fuel_type) out.push({ value: s.vehicle_fuel_type[0].toUpperCase() + s.vehicle_fuel_type.slice(1), label: 'Fuel' })
    return out
  }
  if (s.area_sqm) return [{ value: `${s.area_sqm} m²`, label: 'Floor Area' }]
  return []
})

const saved = ref(false)
const savePending = ref(false)

// Only check saved state if a session already exists (persisted anon or
// real) — don't mint a new anonymous user just to look, only when someone
// actually taps Save. Watched rather than a one-shot onMounted check:
// on a fresh page load, the Supabase module restores the session from its
// cookie asynchronously, so supabaseUser.value is still null at mount time
// even for a returning saver — a plain onMounted read raced that restore
// and silently never re-checked.
let checkedSavedFor: string | null = null
watch(supabaseUser, async (u) => {
  if (!u || !space.value?.id || checkedSavedFor === space.value.id) return
  checkedSavedFor = space.value.id
  try {
    const result = await apiFetch<{ saved: boolean }>(`/saved/${space.value.id}`)
    saved.value = result.saved
  } catch {
    // Non-critical — the button just starts unsaved.
  }
}, { immediate: true })

async function toggleSave() {
  if (savePending.value || !space.value?.id) return
  savePending.value = true
  const next = !saved.value
  try {
    await ensureSession()
    const result = await apiFetch<{ saved: boolean }>(`/saved/${space.value.id}`, {
      method: next ? 'POST' : 'DELETE',
    })
    saved.value = result.saved
  } catch {
    // Leave saved state unchanged on failure rather than lying about it.
  }
  savePending.value = false
}

// ── Drag-to-pan on the flat-photo fallback hero ──────────────────────────
// Real 360° scenes (ViewerPsvViewer) handle their own pan/zoom gestures —
// this is only for listings with gallery photos and no scene data.
const panoEl = ref<HTMLElement | null>(null)
const sheetEl = ref<HTMLElement | null>(null)

let cleanupFns: Array<() => void> = []

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  cleanupFns.push(() => window.removeEventListener('keydown', onKeydown))

  window.addEventListener('resize', onWindowResize)
  cleanupFns.push(() => window.removeEventListener('resize', onWindowResize))

  const pano = panoEl.value
  if (!pano) return

  let panoDragging = false, startX = 0, startPos = 0
  const posX = () => parseFloat(getComputedStyle(pano).backgroundPositionX) || 0
  const panoDown = (x: number) => { panoDragging = true; startX = x; startPos = posX() }
  const panoMove = (x: number) => { if (panoDragging) pano.style.backgroundPositionX = `${startPos + (x - startX)}px` }
  const panoUp = () => { panoDragging = false }
  const onPanoMouseDown = (e: MouseEvent) => panoDown(e.clientX)
  const onPanoMouseMove = (e: MouseEvent) => panoMove(e.clientX)
  const onPanoTouchStart = (e: TouchEvent) => panoDown(e.touches[0].clientX)
  const onPanoTouchMove = (e: TouchEvent) => panoMove(e.touches[0].clientX)
  pano.addEventListener('mousedown', onPanoMouseDown)
  window.addEventListener('mousemove', onPanoMouseMove)
  window.addEventListener('mouseup', panoUp)
  pano.addEventListener('touchstart', onPanoTouchStart, { passive: true })
  pano.addEventListener('touchmove', onPanoTouchMove, { passive: true })
  pano.addEventListener('touchend', panoUp)
  cleanupFns.push(
    () => pano.removeEventListener('mousedown', onPanoMouseDown),
    () => window.removeEventListener('mousemove', onPanoMouseMove),
    () => window.removeEventListener('mouseup', panoUp),
    () => pano.removeEventListener('touchstart', onPanoTouchStart),
    () => pano.removeEventListener('touchmove', onPanoTouchMove),
    () => pano.removeEventListener('touchend', panoUp),
  )
})

onBeforeUnmount(() => {
  onResizeEnd()
  cleanupFns.forEach((fn) => fn())
})

// ── Inline nav/icon components — matches pages/view/index.vue's approach ──
const WhatsappIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' }, [
  h('path', { d: 'M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2m0 18.1a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.18 8.18 0 0 1-1.26-4.4c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.27-8.24 8.27m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.36-.77-1.86-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28' }),
])
// Fonts scoped to this page only, matching pages/view/index.vue
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&family=IBM+Plex+Mono:wght@500&display=swap',
    },
  ],
})

const seoTitle = computed(() => space.value ? `${space.value.title} — View on Viewora` : 'Listing — Viewora')
const seoDescription = computed(() =>
  space.value?.description || `${space.value?.title || 'A property'} on Viewora — real 360° tour, chat directly with the owner on WhatsApp.`
)
useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogImage: heroImage,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: heroImage,
})
</script>

<style scoped>
.detail {
  --ground: var(--vo-page);
  --sheet: var(--vo-surface);
  --sheet-2: var(--vo-elevated);
  --ink: var(--vo-text);
  --ink-soft: var(--vo-secondary);
  --ink-faint: var(--vo-muted);
  --line: var(--vo-border);
  --accent: var(--vo-text);
  --accent-strong: var(--vo-text);
  --accent-tint: var(--vo-elevated);
  --whatsapp: var(--vo-text);
  --whatsapp-ink: var(--vo-inverse);
  --shadow-lg: rgba(0, 0, 0, 0.2);
  --scrim-top: rgba(8, 7, 6, 0.5);
  --scrim-bottom: rgba(6, 5, 4, 0.62);
  --glass-bg: rgba(7, 7, 7, 0.52);
  --glass-border: rgba(255,255,255,0.16);
  --dock-bg: rgba(255, 255, 255, 0.78);
  --dock-border: rgba(28, 29, 33, 0.06);
  --font-display: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  min-height: 100vh;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
}
 :global(.dark) .detail {
  --glass-bg: rgba(7, 7, 7, 0.62);
  --dock-bg: rgba(13, 13, 13, 0.78);
  --dock-border: rgba(255,255,255,0.08);
}

.detail__state {
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; text-align: center; padding: 24px;
}
.detail__state-text { color: var(--ink-soft); font-size: 0.9rem; max-width: 32ch; }
.detail__state-link { color: var(--accent); font-weight: 700; text-decoration: none; }

/* Google Maps-style split: .stage is a fixed-viewport flex column with two
   non-overlapping regions — .viewer-pane (top) and .sheet (bottom, the
   details panel) — so the 360°/photo controls can never collide with the
   property details. Fullscreen just grows .viewer-pane to fill .stage and
   hides .sheet, instead of dragging one region over the other. */
.stage { position: fixed; inset: 0; display: flex; flex-direction: column; }
.viewer-pane {
  position: relative; flex: 0 0 auto; overflow: hidden;
  height: 42vh; height: 42dvh;
  background: var(--sheet-2);
  transition: height 360ms cubic-bezier(.2,.8,.2,1);
}
@media (min-width: 720px) {
  .viewer-pane { height: 54vh; height: 54dvh; }
}
.stage--full .viewer-pane { height: 100vh !important; height: 100dvh !important; }
/* Dragging sets an inline height directly, so don't fight it with a
   transition meant for the fullscreen-toggle case. */
.viewer-pane.is-resizing { transition: none; }
.resizer {
  flex: 0 0 auto; height: 18px; display: flex; align-items: center; justify-content: center;
  background: var(--sheet); cursor: row-resize; touch-action: none;
}
.resizer__grip { width: 36px; height: 4px; border-radius: 999px; background: var(--line); }
.pano {
  position: absolute; inset: 0; background-color: var(--sheet-2);
  background-repeat: repeat-x; background-size: auto 100%; background-position: 0 center;
  cursor: grab; touch-action: pan-y; user-select: none;
}
.pano:active { cursor: grabbing; }
/* Real panorama viewer manages its own cursor/gesture handling — the
   grab-cursor/pan-y/no-select rules above are for the flat-photo fallback
   only and would fight ViewerPsvViewer's internal touch handling. */
.pano--psv { cursor: auto; touch-action: auto; user-select: auto; }
.pano__scrim {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, var(--scrim-top) 0%, transparent 20%, transparent 58%, var(--scrim-bottom) 100%);
  pointer-events: none;
}
.topbar {
  position: absolute; top: 0; left: 0; right: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  padding: max(16px, env(safe-area-inset-top)) 16px 12px;
}
.topbar__right { display: flex; align-items: center; gap: 8px; }
.iconbtn {
  width: 42px; height: 42px; border-radius: 999px; background: var(--glass-bg);
  backdrop-filter: blur(12px); border: 1px solid var(--glass-border); color: #fff;
  display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none;
  flex: 0 0 auto;
}
.iconbtn--saved { color: var(--accent); }
.themebtn {
  border: 1px solid var(--glass-border);
  border-radius: var(--vo-radius-sm);
  padding: 7px 9px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  color: rgba(255,255,255,0.88);
  font: 500 0.64rem var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
}
.trustbadge {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 999px;
  background: var(--glass-bg); backdrop-filter: blur(12px); border: 1px solid var(--glass-border);
  color: #fff; font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.07em; text-transform: uppercase;
}
.trustbadge__dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.82); display: inline-block; }

.sheet {
  flex: 1 1 auto; min-height: 0;
  background: var(--sheet); border-top: 1px solid var(--line);
  display: flex; flex-direction: column;
}
.sheet__header { flex: 0 0 auto; padding: 16px 20px 14px; border-bottom: 1px solid var(--line); }
.sheet__eyebrow-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
.sheet__tag {
  display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 0.66rem;
  font-weight: 500; letter-spacing: 0.09em; text-transform: uppercase; color: var(--accent-strong);
  background: var(--accent-tint); padding: 4px 9px; border-radius: 6px;
}
.sheet__location { display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; color: var(--ink-soft); font-weight: 600; text-align: right; }
.sheet__pricerow { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; }
.sheet__price { font-family: var(--font-mono); font-weight: 500; font-size: 1.4rem; letter-spacing: -0.01em; line-height: 1.2; display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; }
.sheet__price small { font-family: var(--font-display); font-size: 0.66rem; font-weight: 700; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.04em; }
.sheet__facts { font-size: 0.82rem; font-weight: 600; color: var(--ink-soft); margin: 6px 0 0; }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 999px;
  font-weight: 700; border: none; cursor: pointer; white-space: nowrap; text-decoration: none;
}
.btn--whatsapp { background: var(--whatsapp); color: var(--whatsapp-ink); height: 46px; padding: 0 20px; font-size: 0.88rem; border: 1px solid var(--vo-border-strong); flex: 0 0 auto; transition: filter 180ms ease; }
.btn--whatsapp:hover { filter: brightness(0.9); opacity: 1; }
.btn--ghost { background: var(--sheet-2); color: var(--ink); height: 46px; padding: 0 18px; font-size: 0.85rem; border: 1px solid var(--line); margin-top: 16px; }
.btn--full { width: 100%; }

.sheet__scroll { flex: 1 1 auto; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 20px 20px calc(120px + env(safe-area-inset-bottom)); }
.sheet__section-label {
  font-family: var(--font-mono); font-size: 0.68rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--accent-strong); margin: 26px 0 12px; display: flex; align-items: center; justify-content: space-between;
}
.sheet__section-label:first-child { margin-top: 0; }
.sheet__section-count { color: var(--ink-faint); font-weight: 500; }
.factgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; }
.factcard { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; padding: 14px 12px; border-radius: 14px; background: var(--sheet-2); border: 1px solid var(--line); }
.factcard b { font-size: 0.95rem; }
.factcard span { font-size: 0.66rem; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-mono); }
.amenities { display: flex; flex-wrap: wrap; gap: 8px; }
.amenity { display: inline-flex; align-items: center; padding: 8px 13px; border-radius: 999px; background: var(--sheet-2); border: 1px solid var(--line); font-size: 0.79rem; font-weight: 600; color: var(--ink); }
.sheet__desc { font-size: 0.88rem; line-height: 1.6; color: var(--ink-soft); margin: 0; }
.roomlist { display: flex; flex-direction: column; gap: 2px; }
.roomrow { display: flex; align-items: center; gap: 12px; padding: 10px 8px; border-radius: 12px; cursor: pointer; border: none; background: transparent; text-align: left; width: 100%; }
.roomrow--active { background: var(--accent-tint); }
.roomrow img { width: 52px; height: 52px; border-radius: 10px; object-fit: cover; flex: 0 0 auto; }
.roomrow span { display: flex; flex-direction: column; }
.roomrow__name { font-size: 0.92rem; font-weight: 700; }
.roomrow__index { font-family: var(--font-mono); font-size: 0.68rem; color: var(--ink-faint); letter-spacing: 0.04em; }
.ownercard { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 16px; background: var(--sheet-2); border: 1px solid var(--line); }
.ownercard__avatar { width: 46px; height: 46px; border-radius: 50%; flex: 0 0 auto; background: var(--ink); color: var(--vo-inverse); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; }
.ownercard__name { font-weight: 800; font-size: 0.9rem; margin: 0; }
.ownercard__meta { font-size: 0.74rem; color: var(--ink-soft); margin: 1px 0 0; }
.sheet__cta { margin-top: 26px; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 16px; border-radius: 18px; background: var(--sheet-2); text-align: center; }
.sheet__cta p { margin: 0; font-size: 0.85rem; color: var(--ink-soft); max-width: 30ch; }
.sheet__phone { font-family: var(--font-mono); font-size: 0.72rem; color: var(--ink-faint); }

</style>
