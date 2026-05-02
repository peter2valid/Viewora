import { ref, watch, type Ref } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import { mapDbHotspot, mapDbHotspots, type EditorHotspot } from '~/features/editor/mappers'

export type SceneUploadState = 'queued' | 'signing' | 'uploading' | 'registering' | 'processing' | 'ready' | 'failed'

type PersistedLocalScene = {
  id: string
  name: string
  order_index: number
  status: 'processing'
  _local: true
}

type EditorRecoverySnapshot = {
  selectedSceneId: string
  localScenes: PersistedLocalScene[]
  sceneUploadStateById: Record<string, SceneUploadState>
  scenePreviewById: Record<string, string>
}

const VALID_UPLOAD_STATES = new Set<string>(['queued', 'signing', 'uploading', 'registering', 'processing', 'ready', 'failed'])

export function isLocalSceneId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('local_scene_')
}

export function useEditorUpload(
  spaceId: string,
  uploadFile: (file: File, type: string, callbacks: { onRegister: (r: any) => Promise<void>; onError: (err: any, msg: string) => void }) => void,
  scenes: Ref<any[]>,
  selectedSceneId: Ref<string>,
  hotspotsByScene: Ref<Record<string, EditorHotspot[]>>,
  showToast: (msg: string, type?: 'success' | 'error') => void,
  fetchScenes: () => Promise<void>,
  inlineEditMode: Ref<boolean>,
) {
  const { apiFetch } = useApiFetch()

  const pendingScenePreviewById = ref<Record<string, string>>({})
  const sceneUploadStateById = ref<Record<string, SceneUploadState>>({})
  const canvasFileInput = ref<HTMLInputElement | null>(null)
  const addSceneFileInput = ref<HTMLInputElement | null>(null)

  // ── Preview URL helpers ───────────────────────────────────────

  function isBlobPreviewUrl(url: string | null | undefined): url is string {
    return typeof url === 'string' && url.startsWith('blob:')
  }

  function releasePreviewUrl(url: string | null | undefined) {
    if (typeof window === 'undefined') return
    if (!isBlobPreviewUrl(url)) return
    try { window.URL.revokeObjectURL(url) } catch { /* best-effort */ }
  }

  function replacePendingScenePreviewMap(next: Record<string, string>) {
    const nextUrls = new Set(Object.values(next))
    for (const url of Object.values(pendingScenePreviewById.value)) {
      if (!nextUrls.has(url)) releasePreviewUrl(url)
    }
    pendingScenePreviewById.value = next
  }

  function setPendingScenePreview(sceneId: string, url: string) {
    replacePendingScenePreviewMap({ ...pendingScenePreviewById.value, [sceneId]: url })
  }

  function deletePendingScenePreview(sceneId: string) {
    if (!(sceneId in pendingScenePreviewById.value)) return
    const next = { ...pendingScenePreviewById.value }
    delete next[sceneId]
    replacePendingScenePreviewMap(next)
  }

  function movePendingScenePreview(fromId: string, toId: string) {
    const preview = pendingScenePreviewById.value[fromId]
    if (!preview) return
    const next = { ...pendingScenePreviewById.value, [toId]: preview }
    delete next[fromId]
    replacePendingScenePreviewMap(next)
  }

  async function createPersistedScenePreview(file: File): Promise<string | null> {
    if (typeof window === 'undefined') return null
    const sourceUrl = window.URL.createObjectURL(file)
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('preview_load_failed'))
        img.src = sourceUrl
      })
      const maxWidth = 360
      const maxHeight = 220
      const width = image.naturalWidth || image.width || maxWidth
      const height = image.naturalHeight || image.height || maxHeight
      const scale = Math.min(1, maxWidth / width, maxHeight / height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.78)
    } catch {
      return null
    } finally {
      window.URL.revokeObjectURL(sourceUrl)
    }
  }

  // ── Upload state helpers ──────────────────────────────────────

  function setSceneUploadState(sceneId: string, state: SceneUploadState) {
    sceneUploadStateById.value = { ...sceneUploadStateById.value, [sceneId]: state }
  }

  function removeSceneUploadState(sceneId: string) {
    if (!(sceneId in sceneUploadStateById.value)) return
    const next = { ...sceneUploadStateById.value }
    delete next[sceneId]
    sceneUploadStateById.value = next
  }

  // ── Optimistic scene helpers ──────────────────────────────────

  function createOptimisticLocalScene(file: File, previewUrl?: string, options?: { select?: boolean }): string {
    const id = `local_scene_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const orderIndex = scenes.value.length
    const name = deriveSceneName(file.name, orderIndex + 1)
    scenes.value = [...scenes.value, {
      id, name, status: 'processing', order_index: orderIndex,
      raw_image_url: null, thumbnail_url: null, tile_manifest_url: null, _local: true,
    }]
    setSceneUploadState(id, 'queued')
    if (options?.select) selectedSceneId.value = id
    hotspotsByScene.value = { ...hotspotsByScene.value, [id]: hotspotsByScene.value[id] ?? [] }
    if (previewUrl) setPendingScenePreview(id, previewUrl)
    return id
  }

  function removeOptimisticLocalScene(localSceneId: string) {
    scenes.value = scenes.value.filter((s) => s.id !== localSceneId)
    const next = { ...hotspotsByScene.value }
    delete next[localSceneId]
    hotspotsByScene.value = next
    deletePendingScenePreview(localSceneId)
    removeSceneUploadState(localSceneId)
    if (selectedSceneId.value === localSceneId) {
      selectedSceneId.value = scenes.value[0]?.id || ''
    }
  }

  function mapSceneLinkTargets(fromSceneId: string, toSceneId: string) {
    const next: Record<string, EditorHotspot[]> = {}
    for (const [sceneId, list] of Object.entries(hotspotsByScene.value)) {
      next[sceneId] = (list ?? []).map((h) =>
        h.type === 'scene_link' && h.targetSceneId === fromSceneId
          ? { ...h, targetSceneId: toSceneId }
          : h
      )
    }
    hotspotsByScene.value = next
  }

  // ── Pending hotspot sync ──────────────────────────────────────

  async function syncPendingHotspotsForScene(sceneId: string) {
    const pending = (hotspotsByScene.value[sceneId] ?? []).filter((h) => h._pending)
    if (!pending.length) return
    for (const hs of pending) {
      const payload: any = {
        type: hs.type,
        yaw: hs.yaw,
        pitch: hs.pitch,
        label: hs.label || (hs.type === 'scene_link' ? 'Go to next room' : 'Info hotspot'),
      }
      if (hs.type === 'url') payload.content = { url: hs.url || '', button_label: 'Open link' }
      if (hs.type === 'info') payload.content = { text: hs.description || 'Point of interest' }
      if (hs.type === 'scene_link' && hs.targetSceneId) payload.target_scene_id = hs.targetSceneId
      try {
        const response = await apiFetch<any>(`/scenes/${sceneId}/hotspots`, { method: 'POST', body: payload })
        const created = (response as any)?.hotspot
        if (!created) continue
        const mapped = mapDbHotspot(created)
        hotspotsByScene.value = {
          ...hotspotsByScene.value,
          [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map((x) => x.id === hs.id ? mapped : x),
        }
      } catch {
        hotspotsByScene.value = {
          ...hotspotsByScene.value,
          [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map((x) => {
            if (x.id !== hs.id) return x
            const { _pending, ...rest } = x
            return rest
          }),
        }
      }
    }
  }

  // ── Scene creation ────────────────────────────────────────────

  function deriveSceneName(fileName: string, sceneNumber: number): string {
    const base = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
    if (!base) return `Scene ${sceneNumber}`
    return base.replace(/\s+/g, ' ').slice(0, 64)
  }

  async function createSceneWithPanorama(rawImageUrl: string, name?: string, localSceneId?: string) {
    const sceneNumber = (scenes.value?.length || 0) + 1
    const response = await apiFetch<any>(`/spaces/${spaceId}/scenes`, {
      method: 'POST',
      body: {
        name: name || `Scene ${sceneNumber}`,
        raw_image_url: rawImageUrl,
        initial_yaw: 0,
        initial_pitch: 0,
      },
    })
    const createdScene = (response as any)?.scene || response
    if (createdScene?.id) {
      const shouldSelectCreatedScene = localSceneId
        ? selectedSceneId.value === localSceneId
        : (!selectedSceneId.value && scenes.value.length === 0)

      if (localSceneId && isLocalSceneId(localSceneId)) {
        scenes.value = scenes.value.map((s) => s.id === localSceneId ? createdScene : s)
        if (selectedSceneId.value === localSceneId) selectedSceneId.value = createdScene.id
        const currentState = sceneUploadStateById.value[localSceneId]
        if (currentState) {
          setSceneUploadState(createdScene.id, backendSceneStatusToUploadState(createdScene.status))
          removeSceneUploadState(localSceneId)
        }
        if (hotspotsByScene.value[localSceneId]) {
          hotspotsByScene.value = { ...hotspotsByScene.value, [createdScene.id]: hotspotsByScene.value[localSceneId] }
          const next = { ...hotspotsByScene.value }
          delete next[localSceneId]
          hotspotsByScene.value = next
        } else {
          hotspotsByScene.value = { ...hotspotsByScene.value, [createdScene.id]: [] }
        }
        mapSceneLinkTargets(localSceneId, createdScene.id)
        movePendingScenePreview(localSceneId, createdScene.id)
        await syncPendingHotspotsForScene(createdScene.id)
      } else {
        scenes.value = [...scenes.value, createdScene]
        hotspotsByScene.value = { ...hotspotsByScene.value, [createdScene.id]: [] }
        setSceneUploadState(createdScene.id, backendSceneStatusToUploadState(createdScene.status))
      }

      if (shouldSelectCreatedScene) selectedSceneId.value = createdScene.id
    }
    return createdScene?.id ? createdScene : null
  }

  // ── Enqueue upload flow ───────────────────────────────────────

  async function enqueuePanoramaFiles(files: File[]) {
    if (!files.length) return
    const sceneCountBeforeUpload = scenes.value.length
    const shouldSelectFirst = !selectedSceneId.value && scenes.value.length === 0

    const queued = await Promise.all(files.map(async (file, idx) => {
      const previewUrl = URL.createObjectURL(file)
      const localSceneId = createOptimisticLocalScene(file, previewUrl, { select: shouldSelectFirst && idx === 0 })
      const persistedPreview = await createPersistedScenePreview(file)
      if (persistedPreview) setPendingScenePreview(localSceneId, persistedPreview)
      return { file, localSceneId }
    }))

    for (let idx = 0; idx < queued.length; idx++) {
      const item = queued[idx]
      setSceneUploadState(item.localSceneId, 'signing')
      uploadFile(item.file, 'panorama', {
        onRegister: async (record: any) => {
          setSceneUploadState(item.localSceneId, 'registering')
          const sceneName = deriveSceneName(item.file.name, sceneCountBeforeUpload + idx + 1)
          try {
            const createdScene = await createSceneWithPanorama(record.public_url, sceneName, item.localSceneId)
            if (createdScene) {
              inlineEditMode.value = true
              await fetchScenes()
              if (sceneCountBeforeUpload === 0 && idx === 0) {
                showToast('Scene ready. Click anywhere in the viewer to add your first hotspot')
              } else {
                showToast(`${createdScene.name || 'Scene'} added`)
              }
            }
          } catch {
            setSceneUploadState(item.localSceneId, 'failed')
            showToast(`${item.file.name} uploaded but scene creation failed. Please refresh to recover.`, 'error')
          }
        },
        onError: (err: any, humanError: string) => {
          setSceneUploadState(item.localSceneId, 'failed')
          removeOptimisticLocalScene(item.localSceneId)
          showToast(humanError, 'error')
        },
      })
    }
  }

  // ── Event handlers ────────────────────────────────────────────

  async function handlePanoramaUpload(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files || [])
    if (!files.length) return
    input.value = ''
    if (files.length > 1) showToast(`Uploading ${files.length} scenes in background...`)
    await enqueuePanoramaFiles(files)
  }

  async function handleViewerCanvasUpload(file?: File) {
    if (file) await enqueuePanoramaFiles([file])
    else canvasFileInput.value?.click()
  }

  async function handleAddSceneFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files || [])
    if (!files.length) return
    input.value = ''
    if (files.length > 1) showToast(`Adding ${files.length} scenes in background...`)
    await enqueuePanoramaFiles(files)
  }

  // ── Status helpers ────────────────────────────────────────────

  function backendSceneStatusToUploadState(status?: string | null): SceneUploadState {
    if (!status) return 'ready'
    if (status === 'ready' || status === 'complete') return 'ready'
    if (status === 'failed' || status === 'error') return 'failed'
    if (['queued', 'pending', 'processing', 'signing', 'uploading', 'registering'].includes(status)) return 'processing'
    return 'ready'
  }

  function sceneHasRenderableImage(scene: any): boolean {
    if (!scene) return false
    if (scene.id && pendingScenePreviewById.value[scene.id]) return true
    return Boolean(scene.raw_image_url || scene.thumbnail_url || scene.tile_manifest_url)
  }

  function scenePreviewUrl(scene: any): string | null {
    if (!scene) return null
    return pendingScenePreviewById.value[scene.id] || scene.thumbnail_url || scene.raw_image_url || scene.tile_manifest_url || null
  }

  // ── Session-storage recovery snapshot ────────────────────────

  function storageKey() { return `viewora:editor-recovery:${spaceId}` }

  function readRecoverySnapshot(): EditorRecoverySnapshot | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.sessionStorage.getItem(storageKey())
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<EditorRecoverySnapshot>

      const safePreviewById: Record<string, string> = {}
      if (parsed.scenePreviewById && typeof parsed.scenePreviewById === 'object') {
        for (const [id, preview] of Object.entries(parsed.scenePreviewById as Record<string, unknown>)) {
          if (!isLocalSceneId(id)) continue
          if (typeof preview !== 'string' || !preview.startsWith('data:image/') || preview.length > 600_000) continue
          safePreviewById[id] = preview
        }
      }

      const safeLocalScenes: PersistedLocalScene[] = []
      if (Array.isArray(parsed.localScenes)) {
        for (const item of parsed.localScenes) {
          if (!item || typeof item !== 'object') continue
          if (!isLocalSceneId(item.id) || item._local !== true || item.status !== 'processing' || typeof item.order_index !== 'number') continue
          safeLocalScenes.push(item as PersistedLocalScene)
        }
      }

      const safeUploadState: Record<string, SceneUploadState> = {}
      if (parsed.sceneUploadStateById && typeof parsed.sceneUploadStateById === 'object') {
        for (const [id, state] of Object.entries(parsed.sceneUploadStateById as Record<string, unknown>)) {
          if (!isLocalSceneId(id) || typeof state !== 'string' || !VALID_UPLOAD_STATES.has(state)) continue
          safeUploadState[id] = state as SceneUploadState
        }
      }

      return {
        selectedSceneId: typeof parsed.selectedSceneId === 'string' ? parsed.selectedSceneId : '',
        localScenes: safeLocalScenes,
        sceneUploadStateById: safeUploadState,
        scenePreviewById: safePreviewById,
      }
    } catch {
      return null
    }
  }

  function getLocalScenes(): PersistedLocalScene[] {
    return scenes.value.filter((s) => isLocalSceneId(s?.id)) as PersistedLocalScene[]
  }

  function writeRecoverySnapshot() {
    if (typeof window === 'undefined') return
    const localScenes = getLocalScenes()
    const activeLocalState: Record<string, SceneUploadState> = {}
    const activeLocalPreviews: Record<string, string> = {}
    for (const scene of localScenes) {
      const state = sceneUploadStateById.value[scene.id]
      if (state) activeLocalState[scene.id] = state
      const preview = pendingScenePreviewById.value[scene.id]
      if (preview && !isBlobPreviewUrl(preview)) activeLocalPreviews[scene.id] = preview
    }
    if (!localScenes.length && !Object.keys(activeLocalState).length && !Object.keys(activeLocalPreviews).length) {
      window.sessionStorage.removeItem(storageKey())
      return
    }
    const snapshot: EditorRecoverySnapshot = {
      selectedSceneId: isLocalSceneId(selectedSceneId.value) ? selectedSceneId.value : '',
      localScenes,
      sceneUploadStateById: activeLocalState,
      scenePreviewById: activeLocalPreviews,
    }
    try {
      window.sessionStorage.setItem(storageKey(), JSON.stringify(snapshot))
    } catch {
      try {
        window.sessionStorage.setItem(storageKey(), JSON.stringify({ ...snapshot, scenePreviewById: {} } satisfies EditorRecoverySnapshot))
      } catch {
        window.sessionStorage.removeItem(storageKey())
      }
    }
  }

  function hydrateRecoverySnapshot() {
    const snapshot = readRecoverySnapshot()
    if (!snapshot) return
    if (snapshot.localScenes.length) {
      const existingIds = new Set(scenes.value.map((s) => s.id))
      for (const scene of snapshot.localScenes) {
        if (!existingIds.has(scene.id)) scenes.value.push(scene)
      }
    }
    sceneUploadStateById.value = { ...sceneUploadStateById.value, ...snapshot.sceneUploadStateById }
    if (snapshot.scenePreviewById && Object.keys(snapshot.scenePreviewById).length) {
      replacePendingScenePreviewMap({ ...pendingScenePreviewById.value, ...snapshot.scenePreviewById })
    }
    if (snapshot.selectedSceneId && isLocalSceneId(snapshot.selectedSceneId)) {
      selectedSceneId.value = snapshot.selectedSceneId
    }
  }

  // Debounced snapshot write on relevant state changes
  let snapshotDebounce: ReturnType<typeof setTimeout> | null = null
  watch([scenes, sceneUploadStateById, selectedSceneId, pendingScenePreviewById], () => {
    if (snapshotDebounce) clearTimeout(snapshotDebounce)
    snapshotDebounce = setTimeout(() => {
      snapshotDebounce = null
      writeRecoverySnapshot()
    }, 300)
  }, { deep: true })

  return {
    // State
    pendingScenePreviewById,
    sceneUploadStateById,
    canvasFileInput,
    addSceneFileInput,
    // Utilities
    isLocalSceneId,
    isBlobPreviewUrl,
    backendSceneStatusToUploadState,
    sceneHasRenderableImage,
    scenePreviewUrl,
    replacePendingScenePreviewMap,
    // Scene helpers
    createOptimisticLocalScene,
    removeOptimisticLocalScene,
    setSceneUploadState,
    removeSceneUploadState,
    mapSceneLinkTargets,
    createSceneWithPanorama,
    // Handlers
    handlePanoramaUpload,
    handleViewerCanvasUpload,
    handleAddSceneFileChange,
    enqueuePanoramaFiles,
    // Recovery
    hydrateRecoverySnapshot,
  }
}
