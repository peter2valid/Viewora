<template>
  <div class="editor-shell">

    <!-- Hidden file input — triggered by ViewerCanvas "Choose File" (empty state) -->
    <input
      ref="canvasFileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handlePanoramaUpload"
    />

    <!-- Hidden file input — triggered by SceneDock Add Scene -->
    <input
      ref="addSceneFileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleAddSceneFileChange"
    />

    <!-- ── Full-viewport viewer ── -->
    <ViewerCanvas
      :active-scene="activeViewerScene"
      :space-type="space?.space_type"
      :hotspots="activeSceneHotspots"
      @error="showToast($event.message, 'error')"
      @add-hotspot="handleViewerAddHotspot"
      @hotspot-click="handleHotspotClick"
      @request-upload="handleViewerCanvasUpload"
    />

    <!-- ── Floating panels (position:fixed, above viewer) ── -->
    <TopBar
      :space-name="space?.title || 'Edit Tour'"
      :is-published="Boolean(space?.is_published)"
      :slug="space?.slug"
      :scene-count="sceneChips.length"
      :hotspot-count="hotspotCount"
      :publishing="publishing"
      :has-processing-media="hasProcessingMedia"
      :is-processing-stuck="isProcessingStuck"
      :processing-elapsed-seconds="processingElapsedSeconds"
      @toggle-publish="handleTogglePublish"
    />

    <LeftToolbar />

    <SceneDock
      :scenes="sceneChips"
      :active-scene-id="selectedSceneId"
      :has-panorama="hasPanorama"
      :add-scene-pending="addScenePending"
      @select-scene="selectScene"
      @add-scene="handleAddScene"
    />

    <!-- Toast + Share modal teleported to body -->
    <Teleport to="body">
      <Transition name="fade-smooth">
        <div
          v-if="toast"
          class="editor-toast"
          :class="toast.type === 'error' ? 'editor-toast--error' : 'editor-toast--success'"
        >
          <div class="editor-toast__dot"></div>
          <span class="editor-toast__msg">{{ toast.message }}</span>
        </div>
      </Transition>

      <Transition name="share-modal">
        <div v-if="showShareModal" class="share-overlay" @click.self="showShareModal = false">
          <div class="share-modal" role="dialog" aria-modal="true" aria-label="Share your tour">
            <div class="share-modal__header">
              <div class="share-modal__icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h2 class="share-modal__title">Your tour is live!</h2>
                <p class="share-modal__sub">Share this link with your clients</p>
              </div>
              <button class="share-modal__close" @click="showShareModal = false">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="share-modal__url-row">
              <span class="share-modal__url">{{ publicUrl }}</span>
              <button class="share-modal__copy" @click="copyPublicUrl">
                <template v-if="urlCopied">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  Copied!
                </template>
                <template v-else>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </template>
              </button>
            </div>

            <div class="share-modal__actions">
              <a
                :href="`https://wa.me/?text=${encodeURIComponent('Check out my virtual tour: ' + publicUrl)}`"
                target="_blank"
                rel="noopener noreferrer"
                class="share-modal__whatsapp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                Share on WhatsApp
              </a>
              <button class="share-modal__done" @click="showShareModal = false">Keep editing</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useSupabaseClient } from '#imports'
import { usePlanStore } from '~/stores/plan'
import { useApiFetch } from '~/composables/useApiFetch'
import { mapDbHotspot, mapDbHotspots, type EditorHotspot } from '~/features/editor/mappers'
import { useEditorStore } from '~/features/editor/store/useEditorStore'
import ViewerCanvas from '~/features/editor/components/ViewerCanvas.vue'
import TopBar from '~/features/editor/components/TopBar.vue'
import LeftToolbar from '~/features/editor/components/LeftToolbar.vue'
import SceneDock from '~/features/editor/components/SceneDock.vue'

const editorStore = useEditorStore()

const props = defineProps<{
  spaceId: string
}>()

const { apiFetch } = useApiFetch()
const supabase = useSupabaseClient()
const planStore = usePlanStore()

const space = ref<any>(null)
const media = ref<any[]>([])
const publishing = ref(false)
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
const scenes = ref<any[]>([])
const selectedSceneId = ref('')
const hotspotsByScene = ref<Record<string, EditorHotspot[]>>({})
const deletingMedia = ref<Record<string, boolean>>({})
const hotspotDraftType = ref<'info' | 'scene_link' | 'url'>('info')
const hotspotTargetSceneId = ref('')
const sceneRealtimeChannels = ref<any[]>([])
let sceneRealtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null

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
const pollFailureCount = ref(0)

const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showShareModal = ref(false)
watch(showShareModal, (open) => open ? editorStore.openModal() : editorStore.closeModal())
const urlCopied = ref(false)

// Bridges editorStore mode ↔ ViewerCanvas isEditing prop
const inlineEditMode = computed({
  get: () => editorStore.mode === 'hotspot',
  set: (val: boolean) => editorStore.setMode(val ? 'hotspot' : 'view'),
})

function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}

async function copyPublicUrl() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    urlCopied.value = true
    setTimeout(() => { urlCopied.value = false }, 2000)
  } catch {
    showToast('Could not copy — please copy manually', 'error')
  }
}

const publicUrl = computed(() => {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/p/${space.value?.slug || space.value?.id}`
})

const panorama = computed(() => media.value.find(m => m.media_type === 'panorama'))
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

const hotspotCount = computed(() =>
  Object.values(hotspotsByScene.value).reduce((sum, items) => sum + items.length, 0)
)

const sceneChips = computed(() => {
  if (!hasPanorama.value || !scenes.value.length) return []
  return scenes.value
    .slice()
    .sort((a, b) => {
      const orderDiff = Number(a.order_index || 0) - Number(b.order_index || 0)
      if (orderDiff !== 0) return orderDiff
      return String(a.id || '').localeCompare(String(b.id || ''))
    })
    .map((s, idx) => ({ id: s.id, label: s.name || `Scene ${idx + 1}`, ready: s.status === 'ready', imageUrl: (s as any).raw_image_url || null }))
})

const hasProcessingMedia = computed(() =>
  media.value.some((m) => m.processing_status === 'pending' || m.processing_status === 'processing')
)
const processingElapsedSeconds = computed(() =>
  processingStartedAt.value ? Math.floor((nowTick.value - processingStartedAt.value) / 1000) : 0
)
const isProcessingStuck = computed(() => hasProcessingMedia.value && processingElapsedSeconds.value > 45)
const isUploading = computed(() =>
  localUploads.value.some((u) => u.mediaType === 'panorama' && u.state !== 'failed')
)

function unwrapApiData<T = any>(value: any): T {
  if (value && typeof value === 'object' && 'data' in value && value.data !== undefined) return value.data as T
  if (value && typeof value === 'object' && 'result' in value && value.result !== undefined) return value.result as T
  return value as T
}

function toArrayPayload<T = any>(value: any, key: string): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as any)[key])) return (value as any)[key] as T[]
  return []
}

watch(hasProcessingMedia, (isProcessing) => {
  if (isProcessing) {
    startPolling()
    if (!processingStartedAt.value) processingStartedAt.value = Date.now()
  } else {
    stopPolling()
    processingStartedAt.value = null
  }
}, { immediate: true })

onMounted(async () => {
  isMounted = true
  await fetchSpace(true)
  startSceneRealtime()
  heartbeatTimer.value = setInterval(() => { nowTick.value = Date.now() }, 1000)
})

onBeforeUnmount(() => {
  isMounted = false
  fetchScenesController?.abort()
  fetchScenesController = null
  stopPolling()
  stopSceneRealtime()
  clearPanoramaPreview()
  if (heartbeatTimer.value) { clearInterval(heartbeatTimer.value); heartbeatTimer.value = null }
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null }
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
    const result = await apiFetch<any>(`/spaces/${props.spaceId}/scenes`, { signal })
    if (version !== fetchScenesVersion) return

    const loadedScenes = toArrayPayload<any>(unwrapApiData<any>(result), 'scenes')
    scenes.value = loadedScenes

    const newMap: Record<string, EditorHotspot[]> = {}
    for (const scene of loadedScenes) {
      if (Array.isArray(scene.hotspots)) {
        const dbHotspots = mapDbHotspots(scene.hotspots)
        const pending = (hotspotsByScene.value[scene.id] ?? []).filter((h) => h._pending === true)
        newMap[scene.id] = pending.length ? [...dbHotspots, ...pending] : dbHotspots
      } else if (hotspotsByScene.value[scene.id] !== undefined) {
        newMap[scene.id] = hotspotsByScene.value[scene.id]
      } else {
        try {
          const hRes = await apiFetch<any>(`/scenes/${scene.id}/hotspots`, { signal })
          if (version !== fetchScenesVersion) return
          newMap[scene.id] = mapDbHotspots(toArrayPayload<any>(unwrapApiData<any>(hRes), 'hotspots'))
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
  if (sceneRealtimeRefreshTimer) clearTimeout(sceneRealtimeRefreshTimer)
  sceneRealtimeRefreshTimer = setTimeout(() => {
    if (!isMounted) return
    void fetchSpace(true, false)
  }, 200)
}

function startSceneRealtime() {
  stopSceneRealtime()
  const scenesChannel = supabase.channel(`space:${props.spaceId}:scenes`).on('postgres_changes', { event: '*', schema: 'public', table: 'scenes' }, refreshSceneGraphSoon).subscribe()
  const hotspotsChannel = supabase.channel(`space:${props.spaceId}:hotspots`).on('postgres_changes', { event: '*', schema: 'public', table: 'hotspots' }, refreshSceneGraphSoon).subscribe()
  sceneRealtimeChannels.value = [scenesChannel, hotspotsChannel]
}

function stopSceneRealtime() {
  for (const channel of sceneRealtimeChannels.value) void supabase.removeChannel(channel)
  sceneRealtimeChannels.value = []
  if (sceneRealtimeRefreshTimer) { clearTimeout(sceneRealtimeRefreshTimer); sceneRealtimeRefreshTimer = null }
}

async function fetchHotspots(sceneId: string) {
  try {
    const result = await apiFetch<any>(`/scenes/${sceneId}/hotspots`)
    const list = mapDbHotspots(toArrayPayload<any>(unwrapApiData<any>(result), 'hotspots'))
    const pending = (hotspotsByScene.value[sceneId] ?? []).filter((h) => h._pending === true)
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: pending.length ? [...list, ...pending] : list }
  } catch {
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: hotspotsByScene.value[sceneId] || [] }
  }
}

async function selectScene(sceneId: string) {
  if (sceneId === selectedSceneId.value) return
  selectedSceneId.value = sceneId
  if (!hotspotsByScene.value[sceneId]) await fetchHotspots(sceneId)
}

const ensureSceneForEditing = (() => {
  let ensureScenePromise: Promise<string | null> | null = null

  return async (): Promise<string | null> => {
    if (selectedSceneId.value) return selectedSceneId.value
    if (!panorama.value?.public_url) return null
    if (addScenePending.value) return null
    if (ensureScenePromise) return ensureScenePromise

    ensureScenePromise = (async () => {
      try {
        const createResponse = await apiFetch<any>(`/spaces/${props.spaceId}/scenes`, {
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
})()

function resolveTargetSceneId(currentSceneId: string) {
  if (hotspotTargetSceneId.value && hotspotTargetSceneId.value !== currentSceneId) return hotspotTargetSceneId.value
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
  const optimisticEntry: EditorHotspot = {
    id: tempId,
    yaw,
    pitch,
    type: hotspotDraftType.value,
    label: payload.label,
    url: payload.content?.url,
    targetSceneId: payload.target_scene_id,
    description: payload.content?.text,
    _pending: true,
  }
  hotspotsByScene.value = {
    ...hotspotsByScene.value,
    [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []), optimisticEntry],
  }

  try {
    const response = await apiFetch<any>(`/scenes/${sceneId}/hotspots`, { method: 'POST', body: payload })
    const created = unwrapApiData<any>(response)?.hotspot || response?.hotspot
    if (created) {
      const mappedCreated = mapDbHotspot(created)
      hotspotsByScene.value = {
        ...hotspotsByScene.value,
        [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter((h) => h.id !== tempId).concat([mappedCreated]),
      }
      showToast(beforeCount === 0 ? 'Your tour is now interactive' : hotspotDraftType.value === 'scene_link' ? 'Scene link hotspot added' : 'Hotspot added')
    }
  } catch (e: any) {
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter((h) => h.id !== tempId),
    }
    showToast(e?.data?.statusMessage || 'Could not add hotspot. Try again.', 'error')
  } finally {
    addingHotspot.value = false
  }
}

function handleHotspotClick(id: string) {
  const hotspot = activeSceneHotspots.value.find((h) => h.id === id)
  if (!hotspot) return
  if (hotspot.type === 'scene_link' && hotspot.targetSceneId) {
    selectScene(hotspot.targetSceneId)
    showToast('Moved to linked scene')
    return
  }
  if (hotspot.type === 'url' && hotspot.url) {
    window.open(hotspot.url, '_blank', 'noopener,noreferrer')
    return
  }
  showToast(hotspot.label || 'Hotspot selected')
}

async function handleAddScene() {
  if (addScenePending.value) return
  addSceneFileInput.value?.click()
}

function statusLabel(status?: string) {
  if (status === 'pending') return 'Queued'
  if (status === 'processing') return 'Processing'
  if (status === 'complete') return 'Complete'
  if (status === 'failed') return 'Failed'
  return 'Unknown'
}

function statusBadgeClass(status?: string) {
  if (status === 'pending') return 'canvas-badge--amber'
  if (status === 'processing') return 'canvas-badge--sky'
  if (status === 'failed') return 'canvas-badge--rose'
  return 'canvas-badge--emerald'
}

function startPolling() {
  if (pollingTimer.value) return
  pollFailureCount.value = 0
  pollingTimer.value = setInterval(async () => { await fetchSpace(true, true) }, 3000)
}

function stopPolling() {
  if (pollingTimer.value) { clearInterval(pollingTimer.value); pollingTimer.value = null }
}

function createLocalUpload(file: File, mediaType: string): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  localUploads.value.push({ id, mediaType, fileName: file.name, state: 'local_select' })
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
  if (status === 413 || message.includes('file too large')) return `Upload failed for ${fileName}. File is too large for your plan.`
  if (status === 429 || message.includes('rate')) return 'Too many upload requests. Please wait a few seconds and try again.'
  if (message.includes('storage limit')) return 'Upload failed. Storage limit reached. Please free up space or upgrade your plan.'
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) return `Network issue while uploading ${fileName}. Check your connection and retry.`
  if (message.includes('unauthorized')) return 'Upload failed due to permission mismatch. Refresh and try again.'
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

async function fetchSpace(silent = false, polling = false) {
  if (!planStore.plan) await planStore.fetchSubscriptionStatus()
  try {
    const previousStatusById = new Map(media.value.map((m: any) => [m.id, m.processing_status]))
    const data = await apiFetch<any>(`/spaces/${props.spaceId}`)
    space.value = data
    media.value = data.property_media || []

    if (!polling) await fetchScenes()

    if (!selectedSceneId.value && scenes.value.length) selectedSceneId.value = scenes.value[0].id

    for (const item of media.value) {
      const prev = previousStatusById.get(item.id)
      if ((prev === 'pending' || prev === 'processing') && item.processing_status === 'complete') {
        markRecentlyCompleted(item.id)
      }
    }
    pollFailureCount.value = 0
  } catch (e: any) {
    if (polling) {
      pollFailureCount.value += 1
      if (pollFailureCount.value >= 3) {
        stopPolling()
        showToast('Background refresh stopped after repeated errors. Reload to resume.', 'error')
      }
    }
    if (!silent) showToast('Failed to load space data', 'error')
  }
}

async function handleTogglePublish() {
  publishing.value = true
  try {
    const isLive = space.value.is_published
    const updated = await apiFetch<any>(`/spaces/${props.spaceId}/publish`, {
      method: 'POST',
      body: {
        publish: !isLive,
        slug: space.value?.slug,
        lead_form_enabled: space.value.lead_form_enabled,
        branding_enabled: space.value.branding_enabled,
      },
    })
    space.value = updated
    if (!isLive) showShareModal.value = true
    else showToast('Tour unpublished')
  } catch (e: any) {
    showToast(e.data?.statusMessage || 'Publishing failed', 'error')
  } finally {
    publishing.value = false
  }
}

async function handlePanoramaUpload(e: any) {
  const file = e.target.files[0] as File
  if (!file) return
  e.target.value = ''
  setPanoramaPreview(file)
  await uploadFile(file, 'panorama', { createSceneAfterUpload: true })
}

const canvasFileInput = ref<HTMLInputElement | null>(null)
const addSceneFileInput = ref<HTMLInputElement | null>(null)

function deriveSceneName(fileName: string, sceneNumber: number): string {
  const base = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
  if (!base) return `Scene ${sceneNumber}`
  return base.replace(/\s+/g, ' ').slice(0, 64)
}

async function createSceneWithPanorama(rawImageUrl: string, name?: string) {
  const sceneNumber = (scenes.value?.length || 0) + 1
  const response = await apiFetch<any>(`/spaces/${props.spaceId}/scenes`, {
    method: 'POST',
    body: {
      name: name || `Scene ${sceneNumber}`,
      raw_image_url: rawImageUrl,
      initial_yaw: 0,
      initial_pitch: 0,
    },
  })
  const createdScene = unwrapApiData<any>(response)?.scene || response?.scene
  if (createdScene) {
    scenes.value = [...scenes.value, createdScene]
    selectedSceneId.value = createdScene.id
    hotspotsByScene.value = { ...hotspotsByScene.value, [createdScene.id]: [] }
  }
  return createdScene || null
}

async function handleViewerCanvasUpload(file?: File) {
  if (file) { setPanoramaPreview(file); await uploadFile(file, 'panorama', { createSceneAfterUpload: true }) }
  else { canvasFileInput.value?.click() }
}

async function handleAddSceneFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  setPanoramaPreview(file)
  addScenePending.value = true
  try {
    await uploadFile(file, 'panorama', { createSceneAfterUpload: true })
  } finally {
    addScenePending.value = false
  }
}

async function uploadFile(
  file: File,
  type: string,
  options?: { createSceneAfterUpload?: boolean }
) {
  const localId = createLocalUpload(file, type)
  const sceneCountBeforeUpload = scenes.value.length
  try {
    updateLocalUpload(localId, { state: 'signing' })
    const signedPayload = unwrapApiData<any>(await apiFetch<any>('/uploads/create-signed-url', {
      method: 'POST',
      body: { spaceId: props.spaceId, mediaType: type, fileName: file.name, contentType: file.type, fileSize: file.size },
    }))

    const signedUrl = signedPayload?.signedUrl
    const objectKey = signedPayload?.objectKey
    const publicUrlVal = signedPayload?.publicUrl

    if (!signedUrl || typeof signedUrl !== 'string' || !signedUrl.startsWith('http')) {
      throw new Error('Upload signing failed: invalid signed URL returned by server')
    }
    if (!objectKey || !publicUrlVal) throw new Error('Upload signing failed: missing upload metadata from server')

    updateLocalUpload(localId, { state: 'uploading' })
    await $fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    updateLocalUpload(localId, { state: 'registering' })

    const record = unwrapApiData<any>(await apiFetch<any>('/uploads/complete', {
      method: 'POST',
      body: { spaceId: props.spaceId, mediaType: type, objectKey, publicUrl: publicUrlVal, fileSize: file.size },
    }))

    media.value.push(record)
    if (type === 'panorama') {
      const shouldCreateScene = options?.createSceneAfterUpload ?? sceneCountBeforeUpload === 0
      let createdScene: any = null
      if (shouldCreateScene && record?.public_url) {
        const sceneName = deriveSceneName(file.name, sceneCountBeforeUpload + 1)
        createdScene = await createSceneWithPanorama(record.public_url, sceneName)
      }
      clearPanoramaPreview()
      inlineEditMode.value = true
      await fetchScenes()
      if (sceneCountBeforeUpload === 0) {
        showToast('Scene ready. Click anywhere in the viewer to add your first hotspot')
      } else if (createdScene) {
        showToast(`${createdScene.name || 'Scene'} added`)
      }
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
    if (localPanoramaPreviewUrl.value) clearPanoramaPreview()
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
  if (deletingMedia.value[mediaId]) return
  deletingMedia.value = { ...deletingMedia.value, [mediaId]: true }
  const wasPanorama = media.value.find((m: any) => m.id === mediaId)?.media_type === 'panorama'
  try {
    await apiFetch(`/uploads/${mediaId}`, { method: 'DELETE' })
    media.value = media.value.filter((m: any) => m.id !== mediaId)
    if (wasPanorama) { scenes.value = []; selectedSceneId.value = ''; hotspotsByScene.value = {}; await fetchScenes() }
    showToast('Media deleted')
  } catch (err: any) {
    showToast(`Failed to delete media: ${err.data?.statusMessage || err.message}`, 'error')
  } finally {
    deletingMedia.value = { ...deletingMedia.value, [mediaId]: false }
  }
}

// Expose for new UI components that need to read/drive editor state
defineExpose({
  space,
  media,
  panorama,
  hasPanorama,
  scenes,
  sceneChips,
  selectedSceneId,
  activeScene,
  activeSceneHotspots,
  hotspotCount,
  hasProcessingMedia,
  isProcessingStuck,
  processingElapsedSeconds,
  publishing,
  inlineEditMode,
  hotspotDraftType,
  localUploads,
  completionFxMap,
  selectScene,
  handleAddScene,
  handleTogglePublish,
  handleRetryMedia,
  confirmDeleteMedia,
  showToast,
  statusLabel,
  statusBadgeClass,
})
</script>

<style scoped>
.editor-shell {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #0A0A0A;
}

/* ── Toast ─────────────────────────────────────────────────── */
.editor-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 10px;
  background: rgba(10,12,20,0.92);
  border: 1px solid rgba(255,255,255,0.08);
  z-index: 400;
  white-space: nowrap;
}
.editor-toast__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.editor-toast--success .editor-toast__dot { background: #3B82F6; }
.editor-toast--error .editor-toast__dot { background: #ef4444; }
.editor-toast__msg { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9); }

/* ── Animations ────────────────────────────────────────────── */
.fade-smooth-enter-active, .fade-smooth-leave-active { transition: all 0.25s ease; }
.fade-smooth-enter-from, .fade-smooth-leave-to { opacity: 0; transform: translateY(6px); }

/* ── Share modal ───────────────────────────────────────────── */
.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.share-modal {
  width: 100%;
  max-width: 440px;
  background: rgba(10,12,20,0.96);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 28px;
}
.share-modal__header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 22px;
}
.share-modal__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #3B82F6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.share-modal__title { font-size: 18px; font-weight: 800; color: #f8fafc; line-height: 1.2; margin-bottom: 3px; }
.share-modal__sub { font-size: 12px; color: rgba(255,255,255,0.45); font-weight: 500; }
.share-modal__close {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms, color 120ms;
  flex-shrink: 0;
}
.share-modal__close:hover { background: rgba(255,255,255,0.07); color: #fff; }
.share-modal__url-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 16px;
}
.share-modal__url {
  flex: 1;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: monospace;
}
.share-modal__copy {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.8);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms, color 120ms;
  flex-shrink: 0;
}
.share-modal__copy:hover { background: rgba(255,255,255,0.12); color: #fff; }
.share-modal__actions { display: flex; flex-direction: column; gap: 10px; }
.share-modal__whatsapp {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background 120ms, color 120ms;
}
.share-modal__whatsapp:hover { background: rgba(255,255,255,0.10); color: #fff; }
.share-modal__done {
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent;
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.share-modal__done:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); }

.share-modal-enter-active, .share-modal-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.share-modal-enter-active .share-modal, .share-modal-leave-active .share-modal {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.share-modal-enter-from { opacity: 0; }
.share-modal-enter-from .share-modal { transform: scale(0.92) translateY(12px); }
.share-modal-leave-to { opacity: 0; }
.share-modal-leave-to .share-modal { transform: scale(0.95) translateY(6px); }
</style>
