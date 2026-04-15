<template>
  <div class="tour-root" @mousemove="onActivity" @touchstart="onActivity">

    <!-- ── Panorama engine ───────────────────────────────── -->
    <ClientOnly>
      <ViewerView360Viewer
        ref="engine"
        :image-url="activeScene?.raw_image_url ?? ''"
        :initial-yaw="activeScene?.initial_yaw ?? 0"
        :initial-pitch="activeScene?.initial_pitch ?? 0"
        :hotspots="activeSceneHotspots"
        :auto-rotate="autoRotateEnabled"
        :is-editing="editMode"
        @loaded="onViewerLoaded"
        @error="onViewerError"
        @add-hotspot="onAddHotspot"
        @hotspot-click="onHotspotClick"
        @remove-hotspot="onRemoveHotspot"
      />
    </ClientOnly>

    <!-- ── Vignette — darkens edges during scene transitions ─── -->
    <Transition name="vignette">
      <div v-if="isTransitioning" class="tour-vignette" aria-hidden="true" />
    </Transition>

    <!-- ── Loading overlay — shown until Pannellum fires loaded ─ -->
    <Transition name="fade">
      <div v-if="!isLoaded" class="tour-loading">
        <div
          v-if="coverImage"
          class="tour-loading-bg"
          :style="{ backgroundImage: `url(${coverImage})` }"
        />
        <div class="tour-loading-scrim" />
        <div class="tour-loading-bar" />
        <span class="tour-loading-label">Loading tour…</span>
      </div>
    </Transition>

    <!-- ── Error state ────────────────────────────────────── -->
    <div v-if="viewerError" class="tour-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="tour-error-icon">
        <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01"/>
      </svg>
      <p>Interactive viewer unavailable</p>
      <button class="tour-error-retry" @click="retryViewer">Retry</button>
    </div>

    <!-- ── UI Chrome — hidden until loaded ───────────────── -->
    <template v-if="isLoaded && !viewerError">

      <!-- Top-left: space title + branding (fades after 4s) -->
      <Transition name="fade">
        <div v-if="showTitle" class="tour-title-bar" aria-label="Space title">
          <div class="tour-title-dot" />
          <div>
            <p class="tour-title-label">{{ tour.space.title }}</p>
            <p v-if="activeScene" class="tour-scene-name">{{ activeScene.name }}</p>
          </div>
        </div>
      </Transition>

      <!-- Bottom-right: controls cluster -->
      <div class="tour-controls" role="toolbar" aria-label="Viewer controls">
        <!-- Edit Mode Toggle -->
        <button
          class="tour-ctrl-btn"
          :class="{ 'active bg-emerald-500/20 border-emerald-500/40 text-emerald-400': editMode }"
          title="Toggle edit mode"
          @click="editMode = !editMode"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M16.5 2.5a2.121 2.121 0 0 1 3 3L10 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        <button
          class="tour-ctrl-btn"
          :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
          :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          @click="toggleFullscreen"
        >
          <svg v-if="!isFullscreen" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4"/>
          </svg>
          <svg v-else viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M7 3v4H3M17 7h-4V3M3 13h4v4M13 17v-4h4"/>
          </svg>
        </button>

        <button
          class="tour-ctrl-btn"
          title="Share tour"
          aria-label="Share tour"
          @click="shareSheetOpen = true"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="15" cy="4" r="2"/><circle cx="5" cy="10" r="2"/><circle cx="15" cy="16" r="2"/>
            <path d="M7 10.9l6 3.2M13 5.1L7 8.3"/>
          </svg>
        </button>
      </div>

      <!-- Bottom-left: scene strip (only when > 1 scene) -->
      <div v-if="readyScenes.length > 1" class="tour-scene-strip" role="navigation" aria-label="Scenes">
        <button
          v-for="scene in readyScenes"
          :key="scene.id"
          :class="['tour-scene-thumb', { active: scene.id === activeSceneId }]"
          :title="scene.name"
          :aria-label="`Go to ${scene.name}`"
          :aria-pressed="scene.id === activeSceneId"
          @click="navigateToScene(scene.id)"
        >
          <img
            v-if="scene.thumbnail_url"
            :src="scene.thumbnail_url"
            :alt="scene.name"
            class="tour-scene-thumb-img"
            loading="lazy"
          />
          <div v-else class="tour-scene-thumb-fallback">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="5" width="16" height="10" rx="2"/>
              <circle cx="10" cy="10" r="3"/>
            </svg>
          </div>
          <span class="tour-scene-thumb-name">{{ scene.name }}</span>
        </button>
      </div>

    </template>

    <!-- ── Info hotspot popup ─────────────────────────────── -->
    <Transition name="popup">
      <div
        v-if="activeHotspot && activeHotspot.type === 'info'"
        class="tour-hotspot-popup"
        role="dialog"
        :aria-label="activeHotspot.label || 'Information'"
      >
        <button class="tour-popup-close" aria-label="Close" @click="activeHotspot = null">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4l8 8M12 4l-8 8"/>
          </svg>
        </button>
        <p v-if="activeHotspot.label" class="tour-popup-title">{{ activeHotspot.label }}</p>
        <p v-if="activeHotspot.content?.text" class="tour-popup-body">{{ activeHotspot.content.text }}</p>
        <img
          v-if="activeHotspot.content?.image_url"
          :src="activeHotspot.content.image_url"
          :alt="activeHotspot.label || ''"
          class="tour-popup-image"
        />
        <a
          v-if="activeHotspot.content?.url"
          :href="activeHotspot.content.url"
          target="_blank"
          rel="noopener noreferrer"
          class="tour-popup-cta"
        >
          {{ activeHotspot.content.button_label || 'Learn more' }}
        </a>
      </div>
    </Transition>

    <!-- ── Share sheet ──────────────────────────────────── -->
    <Transition name="sheet">
      <div v-if="shareSheetOpen" class="tour-sheet-backdrop" @click.self="shareSheetOpen = false">
        <div class="tour-sheet" role="dialog" aria-label="Share tour">
          <div class="tour-sheet-header">
            <p class="tour-sheet-title">Share this tour</p>
            <button class="tour-sheet-close" aria-label="Close share sheet" @click="shareSheetOpen = false">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4l8 8M12 4l-8 8"/>
              </svg>
            </button>
          </div>

          <div class="tour-sheet-url-row">
            <input :value="shareUrl" readonly class="tour-sheet-url-input" aria-label="Share link" />
            <button class="tour-sheet-copy-btn" @click="copyLink">
              {{ linkCopied ? 'Copied!' : 'Copy' }}
            </button>
          </div>

          <div class="tour-sheet-channels">
            <button class="tour-channel-btn" @click="shareVia('whatsapp')">
              <svg viewBox="0 0 24 24" fill="currentColor" class="tour-channel-icon"><path d="M20.52 3.48A11.9 11.9 0 0012 0C5.37 0 0 5.37 0 12a11.9 11.9 0 001.68 6.15L0 24l6.02-1.58A11.9 11.9 0 0012 24c6.63 0 12-5.37 12-12 0-3.19-1.25-6.22-3.48-8.52zm-8.52 18.4a9.8 9.8 0 01-5.03-1.38l-.36-.21-3.57.94.95-3.49-.24-.38A9.8 9.8 0 012.2 12c0-5.43 4.41-9.84 9.84-9.84 2.62 0 5.09 1.02 6.94 2.88a9.82 9.82 0 012.86 6.97c0 5.43-4.41 9.87-9.84 9.87zm5.4-7.37c-.29-.15-1.73-.85-2-.95s-.46-.15-.65.15-.75.95-.92 1.14-.34.23-.63.08a8 8 0 01-2.36-1.46 8.86 8.86 0 01-1.63-2.03c-.17-.3 0-.46.13-.6.12-.13.29-.34.44-.51s.19-.3.29-.5.05-.37-.03-.51c-.08-.15-.65-1.57-.89-2.15-.23-.56-.47-.48-.65-.49-.17 0-.37-.01-.57-.01s-.51.08-.78.37c-.27.29-1.02 1-1.02 2.43s1.04 2.82 1.19 3.01c.14.19 2.05 3.14 4.97 4.4.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.11.55-.08 1.73-.71 1.97-1.39.25-.68.25-1.27.17-1.39-.08-.12-.28-.2-.57-.34z"/></svg>
              WhatsApp
            </button>
            <button class="tour-channel-btn" @click="shareVia('x')">
              <svg viewBox="0 0 24 24" fill="currentColor" class="tour-channel-icon"><path d="M18.9 1.15h3.45l-7.54 8.62 8.87 11.73H17l-5.45-7.12-6.2 7.12H1.9l8.07-9.22L1.4 1.15h7.13l4.92 6.51 5.45-6.51zm-1.2 18.24h1.91L6.45 3.1H4.4l13.3 16.29z"/></svg>
              X / Twitter
            </button>
            <button class="tour-channel-btn" @click="copyEmbedCode">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="tour-channel-icon"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              {{ embedCopied ? 'Copied!' : 'Copy embed' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ── Types ──────────────────────────────────────────────────────

interface Hotspot {
  id: string
  type: 'info' | 'scene_link' | 'url'
  yaw: number
  pitch: number
  label?: string | null
  target_scene_id?: string | null
  content?: {
    text?: string
    image_url?: string
    url?: string
    button_label?: string
  } | null
}

interface Scene {
  id: string
  name: string
  order_index: number
  raw_image_url?: string | null
  tile_manifest_url?: string | null
  thumbnail_url?: string | null
  status: string
  initial_yaw?: number
  initial_pitch?: number
  hotspots?: Hotspot[]
}

interface Space {
  id: string
  title: string
  slug?: string | null
  cover_image_url?: string | null
  property_360_settings?: Array<{ auto_rotate_enabled?: boolean }> | null
}

interface TourData {
  space: Space
  scenes: Scene[]
}

// ── Props ──────────────────────────────────────────────────────

const props = defineProps<{
  tour: TourData
  shareUrl?: string
}>()

// ── Setup ──────────────────────────────────────────────────────

const { apiFetch } = useApiFetch()

// ── Refs ───────────────────────────────────────────────────────

const engine = ref<any>(null)
const isLoaded = ref(false)
const viewerError = ref('')
const isTransitioning = ref(false)
const activeSceneId = ref('')
const activeHotspot = ref<Hotspot | null>(null)
const showTitle = ref(true)
const shareSheetOpen = ref(false)
const linkCopied = ref(false)
const embedCopied = ref(false)
const isFullscreen = ref(false)
const editMode = ref(false)
const localHotspotsMap = ref<Record<string, Hotspot[]>>({})
const addingHotspot = ref(false)
const deletingHotspotsMap = ref<Record<string, boolean>>({})
let titleTimer: ReturnType<typeof setTimeout> | null = null
let activityTimer: ReturnType<typeof setTimeout> | null = null

// ── Computed ───────────────────────────────────────────────────

// Only scenes that have a panorama image ready to display
const readyScenes = computed(() =>
  props.tour.scenes.filter(s => s.raw_image_url)
)

const activeScene = computed(() =>
  readyScenes.value.find(s => s.id === activeSceneId.value) ?? readyScenes.value[0]
)

const activeSceneHotspots = computed(() => {
  if (!activeSceneId.value) return []
  return localHotspotsMap.value[activeSceneId.value] ?? []
})

// Cover image for the loading blur background
const coverImage = computed(() =>
  readyScenes.value[0]?.thumbnail_url
  ?? readyScenes.value[0]?.raw_image_url
  ?? props.tour.space.cover_image_url
  ?? null
)

const autoRotateEnabled = computed(() =>
  Boolean(props.tour.space.property_360_settings?.[0]?.auto_rotate_enabled)
)

const embedCode = computed(() => {
  const url = props.shareUrl ?? ''
  const embedUrl = url.replace('/p/', '/embed/')
  return `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" allow="accelerometer; gyroscope; fullscreen" loading="lazy" allowfullscreen></iframe>`
})

// ── Lifecycle ──────────────────────────────────────────────────

onMounted(() => {
  // Initialize local hotspots map with data from props
  props.tour.scenes.forEach(scene => {
    localHotspotsMap.value[scene.id] = [...(scene.hotspots ?? [])]
  })

  if (readyScenes.value.length) {
    activeSceneId.value = readyScenes.value[0].id
  }
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  clearTimers()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

// ── Event handlers ─────────────────────────────────────────────

function onViewerLoaded() {
  isLoaded.value = true
  // Fade out title after 4s
  titleTimer = setTimeout(() => { showTitle.value = false }, 4000)
}

function onViewerError(err: unknown) {
  viewerError.value = err instanceof Error ? err.message : 'Viewer failed to initialize.'
}

async function onAddHotspot({ yaw, pitch }: { yaw: number; pitch: number }) {
  if (!activeSceneId.value || addingHotspot.value) return

  addingHotspot.value = true

  const sceneId = activeSceneId.value
  const body = {
    type: 'info' as const,
    yaw,
    pitch,
    label: 'New Info Point',
    content: { text: 'Describe this point of interest...' },
  }

  // Optimistic: show the hotspot immediately without waiting for the API round-trip.
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const optimistic = { ...body, id: tempId, _pending: true }
  if (!localHotspotsMap.value[sceneId]) {
    localHotspotsMap.value[sceneId] = []
  }
  localHotspotsMap.value[sceneId].push(optimistic)

  try {
    const { data } = await apiFetch<any>(`/scenes/${sceneId}/hotspots`, {
      method: 'POST',
      body,
    })

    if (data?.hotspot) {
      // Replace temp entry with the confirmed DB record.
      localHotspotsMap.value[sceneId] = localHotspotsMap.value[sceneId]
        .filter((h: any) => h.id !== tempId)
        .concat([data.hotspot])
      activeHotspot.value = data.hotspot
    }
  } catch (err) {
    // Rollback the optimistic entry.
    localHotspotsMap.value[sceneId] = localHotspotsMap.value[sceneId].filter(
      (h: any) => h.id !== tempId
    )
    console.error('Failed to save hotspot:', err)
  } finally {
    addingHotspot.value = false
  }
}

async function onRemoveHotspot(id: string) {
  if (!activeSceneId.value || deletingHotspotsMap.value[id]) return

  const sceneId = activeSceneId.value

  // Pending optimistic hotspot — cancel locally, no API call needed.
  const isPending = (localHotspotsMap.value[sceneId] ?? []).some(
    (h: any) => h.id === id && h._pending === true
  )
  if (isPending) {
    localHotspotsMap.value[sceneId] = localHotspotsMap.value[sceneId].filter((h: any) => h.id !== id)
    return
  }

  deletingHotspotsMap.value = { ...deletingHotspotsMap.value, [id]: true }
  try {
    await apiFetch(`/hotspots/${id}`, { method: 'DELETE' })

    localHotspotsMap.value[sceneId] = localHotspotsMap.value[sceneId].filter((h: any) => h.id !== id)
    if (activeHotspot.value?.id === id) {
      activeHotspot.value = null
    }
  } catch (err) {
    console.error('Failed to delete hotspot:', err)
  } finally {
    const next = { ...deletingHotspotsMap.value }
    delete next[id]
    deletingHotspotsMap.value = next
  }
}

async function fetchHotspots(sceneId: string) {
  try {
    const { data } = await apiFetch<any>(`/scenes/${sceneId}/hotspots`)
    if (data?.hotspots) {
      localHotspotsMap.value[sceneId] = data.hotspots
    }
  } catch (err) {
    console.error(`Failed to fetch hotspots for scene ${sceneId}:`, err)
  }
}

function onHotspotClick(id: string) {
  const hs = activeSceneHotspots.value.find(h => h.id === id)
  if (!hs) return

  if (hs.type === 'scene_link' && hs.target_scene_id) {
    navigateToScene(hs.target_scene_id)
    return
  }
  if (hs.type === 'url' && hs.content?.url) {
    window.open(hs.content.url, '_blank', 'noopener,noreferrer')
    return
  }
  if (hs.type === 'info') {
    activeHotspot.value = activeHotspot.value?.id === hs.id ? null : hs
  }
}

function onActivity() {
  showTitle.value = true
  if (activityTimer) clearTimeout(activityTimer)
  activityTimer = setTimeout(() => { showTitle.value = false }, 4000)
}

function onFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

// ── Scene navigation ───────────────────────────────────────────

function navigateToScene(sceneId: string) {
  if (sceneId === activeSceneId.value) return
  const scene = readyScenes.value.find(s => s.id === sceneId)
  if (!scene?.raw_image_url) return

  isTransitioning.value = true
  activeHotspot.value = null

  // Load the new panorama (keeps WebGL context alive, no full reinit)
  void engine.value?.loadPanorama(
    scene.raw_image_url,
    scene.initial_yaw ?? 0,
    scene.initial_pitch ?? 0,
  )

  // Update UI state immediately — we know the target scene
  activeSceneId.value = sceneId
  showTitle.value = true
  clearTimeout(titleTimer!)
  titleTimer = setTimeout(() => { showTitle.value = false }, 4000)

  // Only fetch fresh hotspots if this scene wasn't pre-loaded from tour data
  if (!localHotspotsMap.value[sceneId]) {
    void fetchHotspots(sceneId)
  }

  setTimeout(() => { isTransitioning.value = false }, 900)
}

function retryViewer() {
  viewerError.value = ''
  isLoaded.value = false
  void engine.value?.initViewer?.()
}

// ── Fullscreen ────────────────────────────────────────────────

function toggleFullscreen() {
  const el = document.documentElement
  if (!document.fullscreenElement) {
    el.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

// ── Share ─────────────────────────────────────────────────────

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.shareUrl ?? window.location.href)
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
  } catch {}
}

async function copyEmbedCode() {
  try {
    await navigator.clipboard.writeText(embedCode.value)
    embedCopied.value = true
    setTimeout(() => { embedCopied.value = false }, 2000)
  } catch {}
}

function shareVia(channel: 'whatsapp' | 'x') {
  const url = props.shareUrl ?? window.location.href
  const title = props.tour.space.title
  const targets = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} — ${url}`)}`,
  }
  window.open(targets[channel], '_blank', 'noopener,noreferrer')
}

// ── Helpers ────────────────────────────────────────────────────

function clearTimers() {
  if (titleTimer) clearTimeout(titleTimer)
  if (activityTimer) clearTimeout(activityTimer)
}
</script>

<style scoped>
/* ── Root ──────────────────────────────────────────────────── */
.tour-root {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
  user-select: none;
}

/* ── Vignette overlay ─────────────────────────────────────── */
.tour-vignette {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%);
  pointer-events: none;
}

/* ── Loading overlay ──────────────────────────────────────── */
.tour-loading {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
}

.tour-loading-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(20px) brightness(0.4);
  transform: scale(1.1);
}

.tour-loading-scrim {
  position: absolute;
  inset: 0;
  background: rgba(10,10,10,0.5);
}

.tour-loading-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 2px;
  width: 40%;
  background: #00dc82;
  border-radius: 0 2px 2px 0;
  animation: load-bar 1.8s ease-in-out infinite;
}

.tour-loading-label {
  position: relative;
  z-index: 1;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.45);
}

@keyframes load-bar {
  0%   { width: 0%; left: 0; }
  50%  { width: 60%; left: 20%; }
  100% { width: 0%; left: 100%; }
}

/* ── Error ────────────────────────────────────────────────── */
.tour-error {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(10,10,10,0.9);
  color: rgba(255,255,255,0.7);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
}

.tour-error-icon {
  width: 36px;
  height: 36px;
  color: rgba(255,255,255,0.3);
}

.tour-error-retry {
  margin-top: 4px;
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms;
}
.tour-error-retry:hover { background: rgba(255,255,255,0.08); }

/* ── Title bar ────────────────────────────────────────────── */
.tour-title-bar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 12px;
  background: rgba(10,10,10,0.65);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  pointer-events: none;
}

.tour-title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00dc82;
  box-shadow: 0 0 8px rgba(0, 220, 130, 0.6);
  flex-shrink: 0;
}

.tour-title-label {
  font-size: 13px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  color: #f5f5f5;
  line-height: 1.2;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tour-scene-name {
  font-size: 10px;
  font-weight: 500;
  color: rgba(255,255,255,0.5);
  line-height: 1;
  margin-top: 2px;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Controls cluster ─────────────────────────────────────── */
.tour-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tour-ctrl-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(10,10,10,0.65);
  backdrop-filter: blur(12px);
  color: rgba(255,255,255,0.75);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms, color 150ms;
}

.tour-ctrl-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.tour-ctrl-btn svg {
  width: 18px;
  height: 18px;
}

/* ── Scene strip ──────────────────────────────────────────── */
.tour-scene-strip {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 30;
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.tour-scene-thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  border: none;
  background: none;
  padding: 0;
  outline: none;
}

.tour-scene-thumb-img,
.tour-scene-thumb-fallback {
  width: 64px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  border: 1.5px solid rgba(255,255,255,0.1);
  transition: border-color 150ms, transform 150ms;
  overflow: hidden;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.3);
}

.tour-scene-thumb-fallback svg {
  width: 20px;
  height: 20px;
}

.tour-scene-thumb.active .tour-scene-thumb-img,
.tour-scene-thumb.active .tour-scene-thumb-fallback {
  border-color: #00dc82;
  box-shadow: 0 0 0 2px rgba(0, 220, 130, 0.25);
}

.tour-scene-thumb:hover .tour-scene-thumb-img,
.tour-scene-thumb:hover .tour-scene-thumb-fallback {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.3);
}

.tour-scene-thumb-name {
  font-size: 9px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.45);
  white-space: nowrap;
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 150ms;
}

.tour-scene-thumb.active .tour-scene-thumb-name { color: #00dc82; }

/* ── Info hotspot popup ─────────────────────────────────── */
.tour-hotspot-popup {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  min-width: 220px;
  max-width: min(360px, calc(100vw - 40px));
  background: rgba(10,10,10,0.9);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 16px;
  backdrop-filter: blur(20px);
  color: #f5f5f5;
  font-family: 'Inter', sans-serif;
}

.tour-popup-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(255,255,255,0.08);
  border: none;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tour-popup-close svg { width: 12px; height: 12px; }
.tour-popup-close:hover { background: rgba(255,255,255,0.15); }

.tour-popup-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  padding-right: 28px;
  line-height: 1.3;
}

.tour-popup-body {
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  line-height: 1.5;
  margin-bottom: 8px;
}

.tour-popup-image {
  width: 100%;
  border-radius: 10px;
  margin-bottom: 10px;
  object-fit: cover;
  max-height: 160px;
}

.tour-popup-cta {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 8px;
  background: #00dc82;
  color: #0a0a0a;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: background 150ms;
}
.tour-popup-cta:hover { background: #00c972; }

/* ── Share sheet ─────────────────────────────────────────── */
.tour-sheet-backdrop {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.tour-sheet {
  width: 100%;
  max-width: 480px;
  background: #141414;
  border: 1px solid rgba(255,255,255,0.08);
  border-bottom: none;
  border-radius: 20px 20px 0 0;
  padding: 20px 20px 32px;
  font-family: 'Inter', sans-serif;
}

.tour-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.tour-sheet-title {
  font-size: 15px;
  font-weight: 600;
  color: #f5f5f5;
}

.tour-sheet-close {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  border: none;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tour-sheet-close svg { width: 12px; height: 12px; }

.tour-sheet-url-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tour-sheet-url-input {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  color: rgba(255,255,255,0.75);
  font-size: 13px;
  outline: none;
  font-family: 'Inter', sans-serif;
}

.tour-sheet-copy-btn {
  padding: 9px 16px;
  border-radius: 10px;
  background: #00dc82;
  color: #0a0a0a;
  font-size: 13px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background 150ms;
  font-family: 'Inter', sans-serif;
}
.tour-sheet-copy-btn:hover { background: #00c972; }

.tour-sheet-channels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tour-channel-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms;
  font-family: 'Inter', sans-serif;
}
.tour-channel-btn:hover { background: rgba(255,255,255,0.1); }

.tour-channel-icon { width: 16px; height: 16px; flex-shrink: 0; }

/* ── Transitions ──────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active   { transition: opacity 400ms ease; }
.fade-enter-from, .fade-leave-to         { opacity: 0; }

.vignette-enter-active, .vignette-leave-active { transition: opacity 250ms ease; }
.vignette-enter-from, .vignette-leave-to       { opacity: 0; }

.popup-enter-active, .popup-leave-active {
  transition: opacity 200ms ease, transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.popup-enter-from, .popup-leave-to { opacity: 0; transform: translateX(-50%) scale(0.95) translateY(8px); }

.sheet-enter-active, .sheet-leave-active { transition: opacity 200ms ease, transform 300ms cubic-bezier(0.16, 1, 0.3, 1); }
.sheet-enter-from, .sheet-leave-to       { opacity: 0; }
.sheet-enter-from .tour-sheet, .sheet-leave-to .tour-sheet { transform: translateY(100%); }

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 640px) {
  .tour-title-bar { top: 12px; left: 12px; max-width: calc(100vw - 80px); }
  .tour-controls  { bottom: 80px; right: 12px; }
  .tour-scene-strip { bottom: 12px; left: 12px; right: 60px; overflow-x: auto; padding-bottom: 4px; }
  .tour-hotspot-popup { bottom: 100px; max-width: calc(100vw - 24px); }
}

/* ── Reduced motion ──────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active, .fade-leave-active,
  .vignette-enter-active, .vignette-leave-active,
  .popup-enter-active, .popup-leave-active,
  .sheet-enter-active, .sheet-leave-active { transition-duration: 0ms !important; }
}
</style>
