<template>
  <div class="h-full flex flex-col">

    <!-- Minimal header: title + publish action -->
    <header class="flex items-center justify-between mb-4 px-1">
      <div class="flex items-center gap-3">
        <NuxtLink to="/app/spaces" class="text-dim hover:text-main transition-colors text-sm font-semibold">← Tours</NuxtLink>
        <h1 class="text-lg font-bold text-main truncate max-w-xs">{{ space?.title || 'Edit Tour' }}</h1>
        <span v-if="space?.is_published" class="px-2 py-0.5 rounded bg-emerald-500 text-bg text-[10px] font-bold uppercase tracking-widest">Live</span>
      </div>
      <div class="flex items-center gap-3">
        <a v-if="space?.is_published && space.slug" :href="`/p/${space.slug}`" target="_blank" class="btn btn-secondary shadow-sm">View Live</a>
        <button class="btn btn-primary" @click="handleTogglePublish" :disabled="publishing">
          <div v-if="publishing" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          {{ space?.is_published ? 'Unpublish' : 'Publish Tour' }}
        </button>
      </div>
    </header>

    <!-- Processing status (minimal inline banner) -->
    <Transition name="fade-smooth">
      <div
        v-if="hasProcessingMedia"
        class="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
        :class="isProcessingStuck ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-sky-50 border-sky-200 text-sky-800'"
      >
        <div class="w-3 h-3 border-2 rounded-full animate-spin flex-shrink-0" :class="isProcessingStuck ? 'border-amber-300 border-t-amber-700' : 'border-sky-300 border-t-sky-700'"></div>
        <span v-if="isProcessingStuck">Processing is taking longer than expected. Working in background.</span>
        <span v-else>Processing in background...</span>
        <span class="ml-auto text-xs font-semibold">{{ processingElapsedSeconds }}s</span>
      </div>
    </Transition>

    <!-- Main editor area -->
    <div class="flex-1 flex flex-col min-h-0 gap-3">

      <!-- Viewer toolbar -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div :class="['px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md', panorama?.processing_status === 'ready' ? 'bg-emerald-500/90 text-bg border-emerald-400' : 'bg-surface/80 text-dim border-border']">
            {{ panoramaStatusLabel }}
          </div>
          <span class="text-sm font-bold text-main">{{ activeScene?.name || 'Untitled Scene' }}</span>
        </div>
        <label class="btn btn-secondary !px-4 !py-2.5 !rounded-xl cursor-pointer">
          <input type="file" accept="image/*" class="hidden" @change="handlePanoramaUpload" />
          Swap Panorama
        </label>
      </div>

      <!-- Panorama viewer container -->
      <div class="relative rounded-2xl overflow-hidden aspect-[2/1] bg-surface-alt group/viewer">

        <!-- ViewerShell: routes to PSV (panorama) or car-spin viewer based on space type -->
        <ViewerShell
          v-if="hasPanorama && activePanoramaSrc"
          class="absolute inset-0 w-full h-full"
          :active-scene="activeViewerScene"
          :space-type="space?.space_type"
          :hotspots="activeSceneHotspots"
          :is-editing="inlineEditMode"
          @add-hotspot="handleViewerAddHotspot"
          @hotspot-click="handleHotspotClick"
        />

        <!-- Placeholder shown before any panorama is uploaded -->
        <div v-if="!hasPanorama" class="absolute inset-0">
          <img :src="placeholderPanoramaUrl" class="w-full h-full object-cover opacity-85" />
          <div class="absolute inset-0 bg-gradient-to-br from-zinc-950/30 via-transparent to-zinc-950/40"></div>
        </div>

        <!-- Processing status badge -->
        <div class="absolute top-3 left-3 z-10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider" :class="statusBadgeClass(panorama?.processing_status)">
          {{ panoramaStatusLabel }}
        </div>

        <!-- Completion FX badge -->
        <div v-if="panorama && completionFxMap[panorama.id]" class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg success-pulse transition-opacity duration-500" :class="completionFxMap[panorama.id] === 'exit' ? 'opacity-0' : 'opacity-100'">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>

        <!-- Remove panorama button -->
        <div v-if="hasPanorama" class="absolute bottom-6 inset-x-0 flex justify-center z-10 pointer-events-none">
          <button
            class="btn btn-secondary !px-5 !py-2.5 !rounded-xl backdrop-blur-md shadow-2xl pointer-events-auto border-main/20 hover:bg-rose-500 hover:text-bg hover:border-rose-500"
            @click.stop="confirmDeleteMedia(panorama!.id)"
          >
            Remove Panorama
          </button>
        </div>

        <!-- Empty state guide -->
        <div v-if="!hasPanorama" class="absolute inset-x-0 bottom-0 p-5 z-10">
          <div class="rounded-xl border border-white/15 bg-black/35 backdrop-blur-sm p-4 text-white">
            <p class="text-sm font-semibold">Step 1: Upload your first 360 image</p>
            <p class="text-xs text-white/75 mt-1">Choose a high-resolution equirectangular panorama (2:1) to start your interactive tour instantly.</p>
          </div>
        </div>
      </div>

      <!-- Upload progress (in-flight panorama uploads only) -->
      <div v-if="panoramaLocalUploads.length" class="space-y-2">
        <div v-for="item in panoramaLocalUploads" :key="item.id" class="p-3 bg-surface-alt rounded-lg border border-border">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-semibold text-main truncate">{{ item.fileName }}</p>
            <span class="text-[11px] text-dim">{{ localStateLabel(item.state) }}</span>
          </div>
          <div class="h-1.5 bg-surface border border-border rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" :class="item.state === 'failed' ? 'bg-rose-500 w-full' : 'bg-main w-1/2 animate-pulse'"></div>
          </div>
          <p v-if="item.error" class="text-[10px] font-bold text-rose-500 mt-1">{{ item.error }}</p>
        </div>
      </div>

      <!-- Processing failure + retry -->
      <div v-if="panorama?.processing_status === 'failed'" class="flex items-center gap-3">
        <p class="text-xs text-rose-600">Panorama processing failed.</p>
        <button
          class="px-3 py-1.5 rounded bg-amber-500 text-white text-xs font-semibold"
          :disabled="Boolean(retryingMediaMap[panorama.id])"
          @click="handleRetryMedia(panorama.id)"
        >
          {{ retryingMediaMap[panorama.id] ? 'Retrying...' : 'Retry processing' }}
        </button>
      </div>

      <!-- Scene selector strip -->
      <div v-if="sceneChips.length" class="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          v-for="scene in sceneChips"
          :key="scene.id"
          class="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition-all duration-300 whitespace-nowrap"
          :class="selectedSceneId === scene.id
            ? 'bg-main text-bg border-main shadow-md'
            : scene.ready
              ? 'bg-surface border-border text-main hover:bg-surface-alt'
              : 'bg-surface-alt border-border text-dim/50 opacity-50'"
          @click="selectScene(scene.id)"
        >
          {{ scene.label }}
        </button>
        <button
          class="flex-shrink-0 px-3 py-2 rounded-xl border-2 border-dashed border-border text-dim hover:text-main hover:border-main/30 transition-all text-xs"
          :disabled="!hasPanorama || addScenePending"
          @click="handleAddScene"
        >
          {{ addScenePending ? '...' : '+ Add Scene' }}
        </button>
      </div>

      <!-- Hotspot editor panel -->
      <Transition name="fade-smooth">
        <div v-if="editingHotspotId" class="card-glass p-6 shadow-xl border-main/20">
          <div class="flex items-center justify-between gap-3 mb-5">
            <p class="text-sm font-bold text-main uppercase tracking-widest">Edit Hotspot</p>
            <button class="text-[10px] font-bold uppercase tracking-widest text-dim hover:text-main transition-colors" @click="closeHotspotEditor">Close</button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Label</label>
              <input v-model="hotspotEditForm.title" type="text" class="input-glass w-full px-4 py-3 text-sm font-bold" placeholder="Spot name" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Type</label>
              <select v-model="hotspotEditForm.type" class="input-glass w-full px-4 py-3 text-sm font-bold">
                <option value="info">Information</option>
                <option value="scene_link">Portal</option>
                <option value="url">External</option>
              </select>
            </div>
          </div>

          <div class="mt-4 space-y-1.5">
            <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Description</label>
            <textarea v-model="hotspotEditForm.description" rows="2" class="input-glass w-full px-4 py-3 text-sm font-bold resize-none" placeholder="Describe this point of interest..."></textarea>
          </div>

          <div v-if="hotspotEditForm.type === 'scene_link'" class="mt-4 space-y-1.5">
            <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Destination Portal</label>
            <select v-model="hotspotEditForm.targetSceneId" class="input-glass w-full px-4 py-3 text-sm font-bold">
              <option value="">Next Sequential</option>
              <option v-for="scene in sceneChips" :key="scene.id" :value="scene.id">{{ scene.label }}</option>
            </select>
          </div>

          <div v-if="hotspotEditForm.type === 'url'" class="mt-4 space-y-1.5">
            <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1">URL</label>
            <input v-model="hotspotEditForm.link" type="url" class="input-glass w-full px-4 py-3 text-sm font-bold" placeholder="https://" />
          </div>

          <div class="mt-6 flex flex-wrap gap-3">
            <button class="btn btn-primary !px-8 !py-3 !rounded-xl text-xs" @click="saveHotspotEdits">Update Hotspot</button>
            <button class="btn btn-secondary !px-6 !py-3 !rounded-xl text-xs text-rose-500 hover:bg-rose-500/10 border-rose-500/20" @click="deleteEditingHotspot">Delete</button>
          </div>
        </div>
      </Transition>

    </div>

    <!-- Toast notification -->
    <Teleport to="body">
      <Transition name="fade-smooth">
        <div
          v-if="toast"
          class="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-4 card-glass border-main/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[400] animate-in slide-in-from-bottom-5 fade-in duration-500"
        >
          <div
            class="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"
            :class="toast.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'"
          ></div>
          <span class="text-xs font-bold text-main tracking-tight">{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { definePageMeta, useSeoMeta, useSupabaseClient, useRoute } from '#imports'
import { usePlanStore } from '~/stores/plan'
import { useApiFetch } from '~/composables/useApiFetch'
import ViewerShell from '~/features/viewer/ViewerShell.vue'

definePageMeta({ layout: 'editor', middleware: 'auth' })
useSeoMeta({ title: 'Edit Tour | Viewora' })

const route = useRoute()
const spaceId = route.params.id as string
const { apiFetch } = useApiFetch()
const supabase = useSupabaseClient()
const planStore = usePlanStore()

const space = ref<any>(null)
const media = ref<any[]>([])
const publishing = ref(false)
const deletingMedia = ref(false)
const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
const heartbeatTimer = ref<ReturnType<typeof setInterval> | null>(null)
const retryingMediaMap = ref<Record<string, boolean>>({})
const completionFxMap = ref<Record<string, 'enter' | 'exit'>>({})
const processingStartedAt = ref<number | null>(null)
const nowTick = ref(Date.now())
const localPanoramaPreviewUrl = ref<string | null>(null)
const placeholderPanoramaUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800" viewBox="0 0 1600 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23111627"/><stop offset="55%" stop-color="%231f2a44"/><stop offset="100%" stop-color="%232a4365"/></linearGradient></defs><rect width="1600" height="800" fill="url(%23g)"/><circle cx="1220" cy="230" r="180" fill="rgba(255,255,255,0.08)"/><circle cx="360" cy="600" r="260" fill="rgba(255,255,255,0.06)"/><g fill="none" stroke="rgba(255,255,255,0.35)"><path d="M0 540h1600"/><path d="M0 480h1600"/></g><text x="120" y="170" fill="rgba(255,255,255,0.88)" font-family="Arial" font-size="48" font-weight="700">Viewora 360 Tour Preview</text><text x="120" y="235" fill="rgba(255,255,255,0.7)" font-family="Arial" font-size="28">Upload your panorama to replace this placeholder instantly.</text></svg>'
const addScenePending = ref(false)
const addingHotspot = ref(false)
const deletingHotspotsMap = ref<Record<string, boolean>>({})
let ensureScenePromise: Promise<string | null> | null = null
const scenes = ref<any[]>([])
const selectedSceneId = ref('')
const hotspotsByScene = ref<Record<string, any[]>>({})
const inlineEditMode = ref(false)
const hotspotDraftType = ref<'info' | 'scene_link' | 'url'>('info')
const hotspotTargetSceneId = ref('')
const isSceneTransitioning = ref(false)
const editingHotspotId = ref<string | null>(null)
const editingHotspotSceneId = ref<string | null>(null)
const hotspotEditForm = ref({
  type: 'info' as 'info' | 'scene_link' | 'url',
  title: '',
  description: '',
  link: '',
  targetSceneId: '',
})
const analyticsSummary = ref<any[]>([])
const sceneRealtimeChannels = ref<any[]>([])
let sceneRealtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null

// ── Realtime sync guards ──────────────────────────────────────
let isMounted = false
let fetchScenesVersion = 0
let fetchScenesController: AbortController | null = null

type LocalUploadState = 'local_select' | 'signing' | 'uploading' | 'registering' | 'failed'
type LocalUploadItem = {
  id: string
  mediaType: string
  fileName: string
  state: LocalUploadState
  error?: string
}
const localUploads = ref<LocalUploadItem[]>([])

const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}

const publicUrl = computed(() => {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/p/${space.value?.slug || space.value?.id}`
})

const panorama = computed(() => media.value.find(m => m.media_type === 'panorama'))
const panoramaLocalUploads = computed(() => localUploads.value.filter((u) => u.mediaType === 'panorama'))
const hasPanorama = computed(() => Boolean(panorama.value || localPanoramaPreviewUrl.value))
const activeScene = computed(() => scenes.value.find((s) => s.id === selectedSceneId.value) || scenes.value[0] || null)
const activeSceneHotspots = computed(() => {
  if (!selectedSceneId.value) return []
  return hotspotsByScene.value[selectedSceneId.value] || []
})
const activePanoramaSrc = computed(() => {
  if (activeScene.value?.raw_image_url) return activeScene.value.raw_image_url
  if (localPanoramaPreviewUrl.value) return localPanoramaPreviewUrl.value
  if (panorama.value?.public_url) return panorama.value.public_url
  return placeholderPanoramaUrl
})

// TourScene shape expected by ViewerShell / PsvViewer
const activeViewerScene = computed(() => {
  const url = activePanoramaSrc.value
  if (!url || url === placeholderPanoramaUrl) return null
  const s = space.value?.property_360_settings?.[0]
  return {
    id: activeScene.value?.id ?? 'editor-scene',
    imageUrl: url,
    hotspots: activeSceneHotspots.value ?? [],
    settings: {
      hfov_default: s?.hfov_default ?? 90,
      pitch_default: s?.pitch_default ?? 0,
      yaw_default: s?.yaw_default ?? 0,
      auto_rotate_enabled: s?.auto_rotate_enabled ?? false,
    },
  }
})

const panoramaStatusLabel = computed(() => {
  if (!panorama.value) return localPanoramaPreviewUrl.value ? 'Preview' : 'Placeholder'
  return statusLabel(panorama.value.processing_status)
})

const hotspotCount = computed(() => {
  if (Object.keys(hotspotsByScene.value).length > 0) {
    return Object.values(hotspotsByScene.value).reduce((sum: number, items: any) => sum + (Array.isArray(items) ? items.length : 0), 0)
  }
  const raw = space.value?.property_360_settings?.[0]?.hotspots_json
  if (Array.isArray(raw)) return raw.length
  if (raw && typeof raw === 'object') return Object.keys(raw).length
  return 0
})

const sceneChips = computed(() => {
  if (!hasPanorama.value || !scenes.value.length) return []
  return scenes.value
    .slice()
    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
    .map((s, idx) => ({ id: s.id, label: s.name || `Scene ${idx + 1}`, ready: s.status === 'ready' || Boolean(s.raw_image_url) }))
})

const hasProcessingMedia = computed(() => media.value.some((m) => m.processing_status === 'pending' || m.processing_status === 'processing'))
const processingElapsedSeconds = computed(() => processingStartedAt.value ? Math.floor((nowTick.value - processingStartedAt.value) / 1000) : 0)
const isProcessingStuck = computed(() => hasProcessingMedia.value && processingElapsedSeconds.value > 45)

function unwrapApiData<T = any>(value: any): T {
  if (value && typeof value === 'object' && 'data' in value && value.data !== undefined) {
    return value.data as T
  }
  if (value && typeof value === 'object' && 'result' in value && value.result !== undefined) {
    return value.result as T
  }
  return value as T
}

watch(hasProcessingMedia, (isProcessing) => {
  if (isProcessing) {
    startPolling()
    if (!processingStartedAt.value) {
      processingStartedAt.value = Date.now()
    }
  } else {
    stopPolling()
    processingStartedAt.value = null
  }
}, { immediate: true })

onMounted(async () => {
  isMounted = true
  await fetchSpace(true)
  startSceneRealtime()
  heartbeatTimer.value = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  isMounted = false
  fetchScenesController?.abort()
  fetchScenesController = null
  stopPolling()
  stopSceneRealtime()
  clearPanoramaPreview()
  if (heartbeatTimer.value) {
    clearInterval(heartbeatTimer.value)
    heartbeatTimer.value = null
  }
})

function setPanoramaPreview(file: File) {
  clearPanoramaPreview()
  localPanoramaPreviewUrl.value = URL.createObjectURL(file)
}

function clearPanoramaPreview() {
  if (localPanoramaPreviewUrl.value) {
    URL.revokeObjectURL(localPanoramaPreviewUrl.value)
    localPanoramaPreviewUrl.value = null
  }
}

async function fetchScenes() {
  const version = ++fetchScenesVersion

  fetchScenesController?.abort()
  fetchScenesController = new AbortController()
  const { signal } = fetchScenesController

  try {
    const result = await apiFetch<any>(`/spaces/${spaceId}/scenes`, { signal })

    if (version !== fetchScenesVersion) return

    const loadedScenes = unwrapApiData<any>(result)?.scenes || result?.scenes || []
    scenes.value = loadedScenes

    const newMap: Record<string, any[]> = {}
    for (const scene of loadedScenes) {
      if (Array.isArray(scene.hotspots)) {
        const dbHotspots: any[] = scene.hotspots
        const pending = (hotspotsByScene.value[scene.id] ?? []).filter((h: any) => h._pending === true)
        newMap[scene.id] = pending.length ? [...dbHotspots, ...pending] : dbHotspots
      } else if (hotspotsByScene.value[scene.id] !== undefined) {
        newMap[scene.id] = hotspotsByScene.value[scene.id]
      } else {
        try {
          const hRes = await apiFetch<any>(`/scenes/${scene.id}/hotspots`, { signal })
          if (version !== fetchScenesVersion) return
          newMap[scene.id] = unwrapApiData<any>(hRes)?.hotspots ?? hRes?.hotspots ?? []
        } catch (err: any) {
          if (isAbortError(err)) return
          newMap[scene.id] = hotspotsByScene.value[scene.id] ?? []
        }
      }
    }

    hotspotsByScene.value = newMap
    fetchScenesController = null

    if (loadedScenes.length) {
      if (!selectedSceneId.value || !loadedScenes.some((s: any) => s.id === selectedSceneId.value)) {
        selectedSceneId.value = loadedScenes[0].id
      }
    } else {
      selectedSceneId.value = ''
    }
  } catch (err: any) {
    if (isAbortError(err)) return
    scenes.value = []
  }
}

function isAbortError(err: any): boolean {
  return err?.name === 'AbortError' || err?.cause?.name === 'AbortError' || err?.type === 'aborted'
}

function refreshSceneGraphSoon() {
  if (!isMounted) return
  if (sceneRealtimeRefreshTimer) {
    clearTimeout(sceneRealtimeRefreshTimer)
  }
  sceneRealtimeRefreshTimer = setTimeout(() => {
    if (!isMounted) return
    void fetchSpace(true, false)
  }, 200)
}

function startSceneRealtime() {
  stopSceneRealtime()
  const scenesChannel = supabase.channel(`space:${spaceId}:scenes`).on('postgres_changes', { event: '*', schema: 'public', table: 'scenes' }, refreshSceneGraphSoon).subscribe()
  const hotspotsChannel = supabase.channel(`space:${spaceId}:hotspots`).on('postgres_changes', { event: '*', schema: 'public', table: 'hotspots' }, refreshSceneGraphSoon).subscribe()
  sceneRealtimeChannels.value = [scenesChannel, hotspotsChannel]
}

function stopSceneRealtime() {
  for (const channel of sceneRealtimeChannels.value) {
    void supabase.removeChannel(channel)
  }
  sceneRealtimeChannels.value = []
  if (sceneRealtimeRefreshTimer) {
    clearTimeout(sceneRealtimeRefreshTimer)
    sceneRealtimeRefreshTimer = null
  }
}

async function fetchHotspots(sceneId: string) {
  try {
    const result = await apiFetch<any>(`/scenes/${sceneId}/hotspots`)
    const list = unwrapApiData<any>(result)?.hotspots || result?.hotspots || []
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: list }
  } catch {
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: hotspotsByScene.value[sceneId] || [] }
  }
}

function selectScene(sceneId: string) {
  if (sceneId === selectedSceneId.value) return
  isSceneTransitioning.value = true
  selectedSceneId.value = sceneId
  if (!hotspotsByScene.value[sceneId]) {
    void fetchHotspots(sceneId)
  }
  setTimeout(() => {
    isSceneTransitioning.value = false
  }, 650)
}

async function ensureSceneForEditing(): Promise<string | null> {
  if (selectedSceneId.value) return selectedSceneId.value
  if (!panorama.value?.public_url) return null

  if (addScenePending.value) return null

  if (ensureScenePromise) return ensureScenePromise

  ensureScenePromise = (async () => {
    try {
      const createResponse = await apiFetch<any>(`/spaces/${spaceId}/scenes`, {
        method: 'POST',
        body: {
          name: `Scene ${(scenes.value?.length || 0) + 1}`,
          raw_image_url: panorama.value!.public_url,
          initial_yaw: 0,
          initial_pitch: 0,
        },
      })
      const createdScene = unwrapApiData<any>(createResponse)?.scene || createResponse?.scene
      if (createdScene) {
        scenes.value = [...scenes.value, createdScene]
        selectedSceneId.value = createdScene.id
        hotspotsByScene.value = { ...hotspotsByScene.value, [createdScene.id]: [] }
        return createdScene.id as string
      }
      return null
    } finally {
      ensureScenePromise = null
    }
  })()

  return ensureScenePromise
}

function resolveTargetSceneId(currentSceneId: string) {
  if (hotspotTargetSceneId.value && hotspotTargetSceneId.value !== currentSceneId) {
    return hotspotTargetSceneId.value
  }
  const ordered = sceneChips.value.map((s: any) => s.id)
  if (ordered.length < 2) return null
  const idx = ordered.findIndex((id: string) => id === currentSceneId)
  if (idx === -1) return ordered[0]
  const next = ordered[(idx + 1) % ordered.length]
  return next === currentSceneId ? null : next
}

async function handleViewerAddHotspot({ yaw, pitch }: { yaw: number; pitch: number }) {
  if (addingHotspot.value) return
  addingHotspot.value = true

  const sceneId = await ensureSceneForEditing()
  if (!sceneId) {
    showToast('Create or upload a scene first.', 'error')
    addingHotspot.value = false
    return
  }

  const payload: any = {
    type: hotspotDraftType.value,
    yaw,
    pitch,
    label: hotspotDraftType.value === 'scene_link' ? 'Go to next room' : 'Info hotspot',
    content: hotspotDraftType.value === 'url'
      ? { url: publicUrl.value, button_label: 'Open link' }
      : { text: 'Point of interest' },
  }

  if (hotspotDraftType.value === 'scene_link') {
    const targetSceneId = resolveTargetSceneId(sceneId)
    if (!targetSceneId) {
      showToast('Add another scene first, then place a scene-link hotspot.', 'error')
      addingHotspot.value = false
      return
    }
    payload.target_scene_id = targetSceneId
  }

  const beforeCount = hotspotCount.value
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const optimisticEntry = { ...payload, id: tempId, _pending: true }
  hotspotsByScene.value = {
    ...hotspotsByScene.value,
    [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []), optimisticEntry],
  }

  try {
    const response = await apiFetch<any>(`/scenes/${sceneId}/hotspots`, {
      method: 'POST',
      body: payload,
    })
    const created = unwrapApiData<any>(response)?.hotspot || response?.hotspot
    if (created) {
      hotspotsByScene.value = {
        ...hotspotsByScene.value,
        [sceneId]: (hotspotsByScene.value[sceneId] ?? [])
          .filter((h: any) => h.id !== tempId)
          .concat([created]),
      }
      if (beforeCount === 0) {
        showToast('Your tour is now interactive')
      } else {
        showToast(hotspotDraftType.value === 'scene_link' ? 'Scene link hotspot added' : 'Hotspot added')
      }
    }
  } catch (e: any) {
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter((h: any) => h.id !== tempId),
    }
    showToast(e?.data?.statusMessage || 'Could not add hotspot. Try again.', 'error')
  } finally {
    addingHotspot.value = false
  }
}

async function handleViewerRemoveHotspot(hotspotId: string) {
  if (deletingHotspotsMap.value[hotspotId]) return
  const sceneId = selectedSceneId.value
  if (!sceneId) return

  const isPending = (hotspotsByScene.value[sceneId] ?? []).some(
    (h: any) => h.id === hotspotId && h._pending === true
  )
  if (isPending) {
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter((h: any) => h.id !== hotspotId),
    }
    return
  }

  deletingHotspotsMap.value = { ...deletingHotspotsMap.value, [hotspotId]: true }
  try {
    await apiFetch(`/hotspots/${hotspotId}`, { method: 'DELETE' })
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] || []).filter((h: any) => h.id !== hotspotId),
    }
    if (editingHotspotId.value === hotspotId) closeHotspotEditor()
    showToast('Hotspot deleted')
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Failed to delete hotspot', 'error')
  } finally {
    const next = { ...deletingHotspotsMap.value }
    delete next[hotspotId]
    deletingHotspotsMap.value = next
  }
}

function handleHotspotClick(id: string) {
  const hotspot = activeSceneHotspots.value.find((h: any) => h.id === id)
  if (!hotspot) return
  if (inlineEditMode.value) {
    openHotspotEditor(hotspot, selectedSceneId.value)
    return
  }
  if (hotspot.type === 'scene_link' && hotspot.target_scene_id) {
    selectScene(hotspot.target_scene_id)
    showToast('Moved to linked scene')
    return
  }
  if (hotspot.type === 'url' && hotspot.content?.url) {
    window.open(hotspot.content.url, '_blank', 'noopener,noreferrer')
    return
  }
  showToast(hotspot.label || 'Hotspot selected')
}

function openHotspotEditor(hotspot: any, sceneId: string) {
  editingHotspotId.value = hotspot.id
  editingHotspotSceneId.value = sceneId
  hotspotEditForm.value = {
    type: hotspot.type || 'info',
    title: hotspot.label || '',
    description: hotspot.content?.text || '',
    link: hotspot.content?.url || '',
    targetSceneId: hotspot.target_scene_id || '',
  }
}

function closeHotspotEditor() {
  editingHotspotId.value = null
  editingHotspotSceneId.value = null
}

async function saveHotspotEdits() {
  if (!editingHotspotId.value || !editingHotspotSceneId.value) return
  try {
    const payload: any = {
      type: hotspotEditForm.value.type,
      label: hotspotEditForm.value.title || null,
      content: hotspotEditForm.value.type === 'url'
        ? { url: hotspotEditForm.value.link, button_label: 'Open link', text: hotspotEditForm.value.description }
        : { text: hotspotEditForm.value.description },
      target_scene_id: hotspotEditForm.value.type === 'scene_link'
        ? (hotspotEditForm.value.targetSceneId || null)
        : null,
    }
    await apiFetch(`/hotspots/${editingHotspotId.value}`, {
      method: 'PATCH',
      body: payload,
    })
    const sceneId = editingHotspotSceneId.value
    await fetchHotspots(sceneId)
    showToast('Hotspot updated')
    closeHotspotEditor()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Failed to update hotspot', 'error')
  }
}

async function deleteEditingHotspot() {
  if (!editingHotspotId.value || !editingHotspotSceneId.value) return
  try {
    await apiFetch(`/hotspots/${editingHotspotId.value}`, { method: 'DELETE' })
    const sceneId = editingHotspotSceneId.value
    hotspotsByScene.value[sceneId] = (hotspotsByScene.value[sceneId] || []).filter((h) => h.id !== editingHotspotId.value)
    showToast('Hotspot deleted')
    closeHotspotEditor()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Failed to delete hotspot', 'error')
  }
}

async function handleAddScene() {
  if (!panorama.value?.public_url) {
    showToast('Upload a panorama first to create Scene 1.', 'error')
    return
  }

  addScenePending.value = true
  try {
    const sceneNumber = (scenes.value?.length || 0) + 1
    const payload = {
      name: `Scene ${sceneNumber}`,
      raw_image_url: panorama.value.public_url,
      initial_yaw: 0,
      initial_pitch: 0,
    }
    const response = await apiFetch<any>(`/spaces/${spaceId}/scenes`, {
      method: 'POST',
      body: payload,
    })
    const createdScene = unwrapApiData<any>(response)?.scene || response?.scene
    if (createdScene) {
      scenes.value = [...scenes.value, createdScene]
      selectedSceneId.value = createdScene.id
      hotspotsByScene.value = { ...hotspotsByScene.value, [createdScene.id]: [] }
      showToast(`${createdScene.name || 'Scene'} created`)
    } else {
      await fetchScenes()
      showToast('Scene created')
    }
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Could not create scene yet. Please try again.', 'error')
  } finally {
    addScenePending.value = false
  }
}

function localStateLabel(state: LocalUploadState) {
  if (state === 'local_select') return 'Selected'
  if (state === 'signing') return 'Signing...'
  if (state === 'uploading') return 'Uploading...'
  if (state === 'registering') return 'Registering...'
  return 'Failed'
}

function statusLabel(status?: string) {
  if (status === 'pending') return 'Queued'
  if (status === 'processing') return 'Processing'
  if (status === 'failed') return 'Failed'
  return 'Ready'
}

function statusBadgeClass(status?: string) {
  if (status === 'pending') return 'bg-amber-100 text-amber-700 border border-amber-200'
  if (status === 'processing') return 'bg-sky-100 text-sky-700 border border-sky-200'
  if (status === 'failed') return 'bg-rose-100 text-rose-700 border border-rose-200'
  return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
}

function startPolling() {
  if (pollingTimer.value) return
  pollingTimer.value = setInterval(async () => {
    await fetchSpace(true, true)
  }, 3000)
}

function stopPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

function createLocalUpload(file: File, mediaType: string): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  localUploads.value.push({
    id,
    mediaType,
    fileName: file.name,
    state: 'local_select',
  })
  return id
}

function updateLocalUpload(id: string, patch: Partial<LocalUploadItem>) {
  const idx = localUploads.value.findIndex((u) => u.id === id)
  if (idx === -1) return
  localUploads.value[idx] = { ...localUploads.value[idx], ...patch }
}

function removeLocalUpload(id: string) {
  localUploads.value = localUploads.value.filter((u) => u.id !== id)
}

function extractUploadErrorMessage(err: any, fileName: string) {
  const message = String(err?.data?.message || err?.data?.statusMessage || err?.message || '').toLowerCase()
  const status = Number(err?.statusCode || err?.status || err?.response?.status || 0)

  if (status === 413 || message.includes('file too large')) {
    return `Upload failed for ${fileName}. File is too large for your plan.`
  }
  if (status === 429 || message.includes('rate')) {
    return `Too many upload requests. Please wait a few seconds and try again.`
  }
  if (message.includes('storage limit')) {
    return 'Upload failed. Storage limit reached. Please free up space or upgrade your plan.'
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return `Network issue while uploading ${fileName}. Check your connection and retry.`
  }
  if (message.includes('unauthorized')) {
    return 'Upload failed due to permission mismatch. Refresh and try again.'
  }
  return `Upload failed for ${fileName}. Try again.`
}

function markRecentlyCompleted(mediaId: string) {
  setTimeout(() => {
    completionFxMap.value = { ...completionFxMap.value, [mediaId]: 'enter' }
    setTimeout(() => {
      completionFxMap.value = { ...completionFxMap.value, [mediaId]: 'exit' }
      setTimeout(() => {
        const next = { ...completionFxMap.value }
        delete next[mediaId]
        completionFxMap.value = next
      }, 500)
    }, 1700)
  }, 150)
}

// polling=true → only refresh media statuses, skip scene refetch
async function fetchSpace(silent = false, polling = false) {
  if (!planStore.plan) {
    await planStore.fetchSubscriptionStatus()
  }

  try {
    const previousStatusById = new Map(media.value.map((m: any) => [m.id, m.processing_status]))
    const data = await apiFetch<any>(`/spaces/${spaceId}`)
    space.value = data
    media.value = data.property_media || []

    if (!polling) {
      await fetchScenes()
    }

    if (!analyticsSummary.value.length) {
      try {
        const summary = await apiFetch<any>(`/analytics/summary/${spaceId}`)
        analyticsSummary.value = unwrapApiData<any>(summary) || summary || []
      } catch {
        analyticsSummary.value = []
      }
    }

    if (!selectedSceneId.value && scenes.value.length) {
      selectedSceneId.value = scenes.value[0].id
    }

    for (const item of media.value) {
      const prev = previousStatusById.get(item.id)
      if ((prev === 'pending' || prev === 'processing') && item.processing_status === 'complete') {
        markRecentlyCompleted(item.id)
      }
    }
  } catch (e: any) {
    if (!silent) {
      showToast('Failed to load space data', 'error')
    }
  }
}

async function handleTogglePublish() {
  publishing.value = true
  try {
    const isLive = space.value.is_published
    const updated = await apiFetch<any>(`/spaces/${spaceId}/publish`, {
      method: 'POST',
      body: {
        publish: !isLive,
        slug: space.value?.slug,
        lead_form_enabled: space.value.lead_form_enabled,
        branding_enabled: space.value.branding_enabled
      }
    })
    space.value = updated
    if (!isLive) {
      showToast('Your tour is LIVE. Share it now to start getting clients.')
    } else {
      showToast('Tour unpublished')
    }
  } catch (e: any) {
    showToast(e.data?.statusMessage || 'Publishing failed', 'error')
  } finally {
    publishing.value = false
  }
}

async function handlePanoramaUpload(e: any) {
  const file = e.target.files[0] as File
  if (!file) return
  setPanoramaPreview(file)
  await uploadFile(file, 'panorama')
}

async function uploadFile(file: File, type: string) {
  const localId = createLocalUpload(file, type)
  try {
    updateLocalUpload(localId, { state: 'signing' })

    const signedPayload = unwrapApiData<any>(await apiFetch<any>('/uploads/create-signed-url', {
      method: 'POST',
      body: {
        spaceId: spaceId,
        mediaType: type,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size
      }
    }))

    const signedUrl = signedPayload?.signedUrl
    const objectKey = signedPayload?.objectKey
    const publicUrl = signedPayload?.publicUrl

    if (!signedUrl || typeof signedUrl !== 'string' || !signedUrl.startsWith('http')) {
      throw new Error('Upload signing failed: invalid signed URL returned by server')
    }
    if (!objectKey || !publicUrl) {
      throw new Error('Upload signing failed: missing upload metadata from server')
    }

    updateLocalUpload(localId, { state: 'uploading' })

    await $fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    })

    updateLocalUpload(localId, { state: 'registering' })

    const record = unwrapApiData<any>(await apiFetch<any>('/uploads/complete', {
      method: 'POST',
      body: {
        spaceId: spaceId,
        mediaType: type,
        objectKey,
        publicUrl,
        fileSize: file.size
      }
    }))

    media.value.push(record)
    if (type === 'panorama') {
      clearPanoramaPreview()
      inlineEditMode.value = true
      showToast('Click anywhere in the viewer to add your first hotspot')
      await fetchScenes()
    }
    removeLocalUpload(localId)
    if (record.processing_status === 'pending' || record.processing_status === 'processing') {
      startPolling()
    } else if (record.processing_status === 'complete') {
      markRecentlyCompleted(record.id)
      showToast(`Upload complete: ${file.name}`)
    }
  } catch (err: any) {
    const humanError = extractUploadErrorMessage(err, file.name)
    updateLocalUpload(localId, { state: 'failed', error: humanError })
    if (localPanoramaPreviewUrl.value) {
      clearPanoramaPreview()
    }
    showToast(humanError, 'error')
  }
}

async function handleRetryMedia(mediaId: string) {
  retryingMediaMap.value = { ...retryingMediaMap.value, [mediaId]: true }
  try {
    await apiFetch(`/uploads/${mediaId}/retry-processing`, { method: 'POST' })
    media.value = media.value.map((m) => m.id === mediaId ? { ...m, processing_status: 'pending' } : m)
    startPolling()
    showToast('Retry queued')
  } catch (err: any) {
    showToast(`Retry failed. ${extractUploadErrorMessage(err, 'media')}`, 'error')
  } finally {
    retryingMediaMap.value = { ...retryingMediaMap.value, [mediaId]: false }
  }
}

async function confirmDeleteMedia(mediaId: string) {
  deletingMedia.value = true
  const wasPanorama = media.value.find((m: any) => m.id === mediaId)?.media_type === 'panorama'
  try {
    await apiFetch(`/uploads/${mediaId}`, { method: 'DELETE' })
    media.value = media.value.filter((m: any) => m.id !== mediaId)
    if (wasPanorama) {
      scenes.value = []
      selectedSceneId.value = ''
      hotspotsByScene.value = {}
      await fetchScenes()
    }
    showToast('Media deleted')
  } catch (err: any) {
    showToast(`Failed to delete media: ${err.data?.statusMessage || err.message}`, 'error')
  } finally {
    deletingMedia.value = false
  }
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.fade-smooth-enter-active, .fade-smooth-leave-active { transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
.fade-smooth-enter-from, .fade-smooth-leave-to { opacity: 0; transform: translateY(6px) scale(0.995); }
.success-pulse { animation: successPulse 600ms ease-out; }
@keyframes successPulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
</style>
