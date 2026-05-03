import { ref, computed, watch, type Ref, type ComputedRef, type WritableComputedRef } from 'vue'
import { mapDbHotspot, type EditorHotspot } from '~/features/editor/mappers'
import { isLocalSceneId } from '~/features/editor/composables/useEditorUpload'

type HotspotType = 'info' | 'scene_link' | 'url' | 'video' | 'youtube'

type SceneChip = { id: string; label: string; ready: boolean }

type EditorStore = {
  mode: string
  selectedHotspotId: string | null
  setMode: (mode: any) => void
  setPanel: (panel: any) => void
  selectHotspot: (id: string | null) => void
}

type EditDraft = {
  label: string
  description: string
  url: string
  targetSceneId: string
  type: HotspotType
  icon: string
  scale: number
  hoverScale: number
  corners?: Array<{ yaw: number; pitch: number }>
}

export function useHotspotEditor(
  apiFetch: (url: string, opts?: any) => Promise<any>,
  editorStore: EditorStore,
  inlineEditMode: WritableComputedRef<boolean>,
  selectedSceneId: Ref<string>,
  hotspotsByScene: Ref<Record<string, EditorHotspot[]>>,
  sceneChips: ComputedRef<SceneChip[]>,
  showToast: (msg: string, type?: 'success' | 'error') => void,
  fetchHotspots: (sceneId: string) => Promise<void>,
) {
  const editDraft = ref<EditDraft>({ label: '', description: '', url: '', targetSceneId: '', type: 'info', icon: '', scale: 1, hoverScale: 1.3 })
  const savingHotspot = ref(false)
  const addingHotspot = ref(false)
  const deletingHotspot = ref(false)
  const quickEditHotspotId = ref<string | null>(null)
  const quickEditScreenPos = ref({ x: 0, y: 0 })
  const repositioningHotspotId = ref<string | null>(null)
  const hotspotDraftType = ref<HotspotType>('info')
  const showTypePicker = ref(false)
  const isTracing = ref(false)
  const tracePoints = ref<Array<{ yaw: number; pitch: number }>>([])

  type DeleteCandidate = EditorHotspot & { sceneId: string }
  const deleteCandidate = ref<DeleteCandidate | null>(null)

  const activeSceneHotspots = computed(() => hotspotsByScene.value[selectedSceneId.value] ?? [])

  const hotspotCount = computed(() =>
    Object.values(hotspotsByScene.value).reduce((sum, items) => sum + items.length, 0)
  )

  const activeSceneHotspotsWithPreview = computed(() => {
    const hotspots = activeSceneHotspots.value
    const selectedId = editorStore.selectedHotspotId
    if (!selectedId) return hotspots
    return hotspots.map(h => {
      if (h.id !== selectedId) return h
      const d = editDraft.value
      return { ...h, label: d.label, description: d.description, url: d.url, targetSceneId: d.targetSceneId, type: d.type as any, icon: d.icon, scale: d.scale, hoverScale: d.hoverScale, corners: d.corners }
    })
  })

  const otherScenesForHotspot = computed(() =>
    sceneChips.value.filter(s => s.id !== selectedSceneId.value && s.ready).map(s => ({ id: s.id, label: s.label }))
  )

  watch(inlineEditMode, (editing) => {
    if (!editing) deleteCandidate.value = null
  })

  watch(deleteCandidate, (candidate) => {
    if (!candidate) return
    const validTargetId = sceneChips.value.some(s => s.id === candidate.targetSceneId && s.id !== candidate.sceneId)
      ? (candidate.targetSceneId || '')
      : sceneChips.value.find(s => s.id !== candidate.sceneId)?.id || ''
    editDraft.value = {
      label: candidate.label || '',
      description: candidate.description || '',
      url: candidate.url || '',
      targetSceneId: validTargetId,
      type: (candidate.type as HotspotType) || 'info',
      icon: candidate.icon || '',
      scale: 1,
      hoverScale: 1.3,
    }
  })

  watch(isTracing, () => {
    // reserved for future side-effects on tracing mode toggle
  })

  function startTracing() {
    isTracing.value = true
    tracePoints.value = []
    showToast('Click 4 corners in the room to pin video', 'success')
  }

  function handleUpdateTrace(payload: { yaw: number; pitch: number }) {
    if (!isTracing.value) return
    tracePoints.value.push(payload)
    if (tracePoints.value.length === 4) {
      editDraft.value.corners = [...tracePoints.value]
      isTracing.value = false
      tracePoints.value = []
      showToast('Spatial mapping complete', 'success')
    } else {
      showToast(`Point ${tracePoints.value.length}/4 captured`, 'success')
    }
  }

  function resolveTargetSceneId(currentSceneId: string): string | null {
    const ordered = sceneChips.value.map(s => s.id)
    if (ordered.length < 2) return null
    const idx = ordered.findIndex(id => id === currentSceneId)
    if (idx === -1) return ordered[0]
    const next = ordered[(idx + 1) % ordered.length]
    return next === currentSceneId ? null : next
  }

  function buildHotspotPayload(d: EditDraft, hs: EditorHotspot) {
    const payload: any = {
      type: d.type,
      yaw: hs.yaw,
      pitch: hs.pitch,
      label: d.label.trim() || (d.type === 'scene_link' ? 'Go to next room' : 'Info hotspot'),
    }
    if (d.type === 'info') payload.content = { text: d.description.trim() || '' }
    else if (d.type === 'url') payload.content = { url: d.url.trim(), button_label: 'Open link' }
    else if (d.type === 'video' || d.type === 'youtube') payload.content = { url: d.url.trim() }
    else if (d.type === 'scene_link') payload.target_scene_id = d.targetSceneId
    if (d.icon) payload.content = { ...(payload.content ?? {}), icon: d.icon }
    if (d.scale !== 1) payload.content = { ...(payload.content ?? {}), scale: Number(d.scale) }
    if (d.hoverScale !== 1.3) payload.content = { ...(payload.content ?? {}), hoverScale: Number(d.hoverScale) }
    if (d.corners?.length === 4) payload.content = { ...(payload.content ?? {}), corners: d.corners }
    return payload
  }

  function unwrap<T = any>(value: any): T {
    if (value && typeof value === 'object' && 'data' in value && value.data !== undefined) return value.data as T
    return value as T
  }

  function toArray<T = any>(value: any, key: string): T[] {
    if (Array.isArray(value)) return value as T[]
    if (value && typeof value === 'object' && Array.isArray(value[key])) return value[key] as T[]
    return []
  }

  function onOpenTypePicker() { showTypePicker.value = true }

  function onTypePicked(userType: 'move' | 'info' | 'media' | 'link') {
    showTypePicker.value = false
    const typeMap = { move: 'scene_link', info: 'info', media: 'video', link: 'url' } as const
    hotspotDraftType.value = typeMap[userType]
    editorStore.setMode('hotspot')
  }

  function onCancelPlacement() { editorStore.setMode('view') }

  function onQuickEditCancel() {
    const id = quickEditHotspotId.value
    quickEditHotspotId.value = null
    if (id) {
      const sceneId = selectedSceneId.value
      const hs = (hotspotsByScene.value[sceneId] ?? []).find(h => h.id === id)
      if (hs?._pending) {
        hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id) }
      }
    }
    editorStore.selectHotspot(null)
  }

  async function handleViewerAddHotspot({ yaw, pitch, screenX, screenY }: { yaw: number; pitch: number; screenX: number; screenY: number }) {
    if (repositioningHotspotId.value) {
      await repositionHotspot(repositioningHotspotId.value, yaw, pitch)
      return
    }
    if (addingHotspot.value) return

    const sceneId = selectedSceneId.value
    if (!sceneId) { showToast('Create or upload a scene first.', 'error'); return }

    const type = hotspotDraftType.value
    const targetSceneId = type === 'scene_link' ? (resolveTargetSceneId(sceneId) ?? '') : ''
    if (type === 'scene_link' && !targetSceneId) { showToast('Add another scene first, then place a scene-link hotspot.', 'error'); return }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const optimisticEntry: EditorHotspot = { id: tempId, yaw, pitch, type, label: type === 'scene_link' ? 'Go to next room' : '', url: '', targetSceneId, description: '', _pending: true }
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []), optimisticEntry] }

    editDraft.value = { label: optimisticEntry.label || '', description: '', url: '', targetSceneId, type, icon: '', scale: 1, hoverScale: 1.3 }
    editorStore.selectHotspot(tempId)
    quickEditHotspotId.value = tempId
    quickEditScreenPos.value = { x: screenX, y: screenY }
    editorStore.setMode('view')
  }

  async function onQuickEditDone() {
    const id = quickEditHotspotId.value
    quickEditHotspotId.value = null
    if (!id) return
    const sceneId = selectedSceneId.value

    if (isLocalSceneId(sceneId)) {
      const d = editDraft.value
      hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map(h => h.id === id ? { ...h, ...d, _pending: true } : h) }
      showToast('Hotspot saved locally. It will sync when upload completes.')
      editorStore.selectHotspot(null)
      return
    }

    const hs = (hotspotsByScene.value[sceneId] ?? []).find(h => h.id === id)
    if (!hs) return
    const beforeCount = hotspotCount.value
    addingHotspot.value = true
    try {
      const response = await apiFetch(`/scenes/${sceneId}/hotspots`, { method: 'POST', body: buildHotspotPayload(editDraft.value, hs) })
      const created = unwrap<any>(response)?.hotspot || response?.hotspot
      if (created) {
        const mapped = mapDbHotspot(created)
        hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id).concat([mapped]) }
        showToast(beforeCount === 0 ? 'Your tour is now interactive' : 'Hotspot added')
      }
    } catch (e: any) {
      hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id) }
      showToast(e?.data?.statusMessage || 'Could not add hotspot. Try again.', 'error')
    } finally {
      addingHotspot.value = false
      editorStore.selectHotspot(null)
    }
  }

  async function onQuickEditMore() {
    const id = quickEditHotspotId.value
    quickEditHotspotId.value = null
    if (!id) return
    const sceneId = selectedSceneId.value

    if (isLocalSceneId(sceneId)) {
      const d = editDraft.value
      hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map(h => h.id === id ? { ...h, ...d, _pending: true } : h) }
      editorStore.selectHotspot(id)
      editorStore.setPanel('hotspots')
      return
    }

    const hs = (hotspotsByScene.value[sceneId] ?? []).find(h => h.id === id)
    if (!hs) return
    addingHotspot.value = true
    try {
      const response = await apiFetch(`/scenes/${sceneId}/hotspots`, { method: 'POST', body: buildHotspotPayload(editDraft.value, hs) })
      const created = unwrap<any>(response)?.hotspot || response?.hotspot
      if (created) {
        const mapped = mapDbHotspot(created)
        hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id).concat([mapped]) }
        selectHotspot(mapped.id)
        editorStore.setPanel('hotspots')
      }
    } catch (e: any) {
      hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id) }
      showToast(e?.data?.statusMessage || 'Could not add hotspot. Try again.', 'error')
      editorStore.selectHotspot(null)
    } finally {
      addingHotspot.value = false
    }
  }

  function handleHotspotClick(id: string, isPreviewMode: boolean, selectSceneFn: (id: string) => void) {
    if (!isPreviewMode) return
    const hotspot = activeSceneHotspots.value.find(h => h.id === id)
    if (!hotspot) return
    if (hotspot.type === 'scene_link' && hotspot.targetSceneId) {
      selectSceneFn(hotspot.targetSceneId)
      showToast('Moved to linked scene')
    } else if (hotspot.type === 'url' && hotspot.url) {
      window.open(hotspot.url, '_blank', 'noopener,noreferrer')
    }
  }

  function handleHotspotEdit(id: string) {
    selectHotspot(id)
    editorStore.setPanel('hotspots')
    editorStore.setMode('view')
  }

  async function deleteHotspot(id: string) {
    if (!id || deletingHotspot.value) return
    const sceneId = selectedSceneId.value
    deletingHotspot.value = true
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id) }
    editorStore.selectHotspot(null)
    try {
      await apiFetch(`/hotspots/${id}`, { method: 'DELETE' })
      showToast('Hotspot deleted')
    } catch (e: any) {
      await fetchHotspots(sceneId)
      showToast(e?.data?.statusMessage || 'Failed to delete hotspot', 'error')
    } finally {
      deletingHotspot.value = false
    }
  }

  function handleHotspotReposition(id: string) {
    repositioningHotspotId.value = id
    editorStore.setMode('hotspot')
    showToast('Click anywhere to reposition the hotspot')
  }

  async function repositionHotspot(id: string, yaw: number, pitch: number) {
    const sceneId = selectedSceneId.value
    repositioningHotspotId.value = null
    editorStore.setMode('view')
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map(h => h.id === id ? { ...h, yaw, pitch } : h) }
    try {
      await apiFetch(`/hotspots/${id}`, { method: 'PATCH', body: { yaw, pitch } })
      showToast('Hotspot repositioned')
    } catch (e: any) {
      await fetchHotspots(sceneId)
      showToast(e?.data?.statusMessage || 'Failed to reposition hotspot', 'error')
    }
  }

  function selectHotspot(id: string | null) {
    editorStore.selectHotspot(id)
    if (!id) return
    const hotspot = activeSceneHotspots.value.find(h => h.id === id)
    if (hotspot) {
      editDraft.value = {
        label: hotspot.label || '',
        description: hotspot.description || '',
        url: hotspot.url || '',
        targetSceneId: hotspot.targetSceneId || '',
        type: (hotspot.type as HotspotType) || 'info',
        icon: hotspot.icon || '',
        scale: hotspot.scale || 1,
        hoverScale: hotspot.hoverScale || 1.3,
        corners: hotspot.corners,
      }
    }
  }

  function patchHotspotDraft(patch: Partial<EditDraft>) { editDraft.value = { ...editDraft.value, ...patch } }

  function closeHotspotPanel() {
    editorStore.setPanel(null)
    editorStore.setMode('view')
    editorStore.selectHotspot(null)
  }

  function confirmDeleteHotspot() {
    const id = editorStore.selectedHotspotId
    if (id) deleteHotspot(id)
  }

  async function saveHotspotEdit() {
    const id = editorStore.selectedHotspotId
    if (!id || savingHotspot.value) return
    savingHotspot.value = true
    const sceneId = selectedSceneId.value
    const d = editDraft.value
    const newType = d.type
    const patch: any = {}

    patch.label = d.label.trim() || (newType === 'scene_link' ? 'Go to next room' : 'Info hotspot')
    if (newType === 'info') patch.content = { text: d.description.trim() || 'Point of interest' }
    else if (newType === 'url') patch.content = { url: d.url.trim(), button_label: 'Open link' }
    else if (newType === 'video' || newType === 'youtube') patch.content = { url: d.url.trim() }
    else if (newType === 'scene_link' && d.targetSceneId) patch.target_scene_id = d.targetSceneId
    if (d.icon) patch.content = { ...(patch.content ?? {}), icon: d.icon }
    if (d.scale !== 1) patch.content = { ...(patch.content ?? {}), scale: Number(d.scale) }
    if (d.hoverScale !== 1.3) patch.content = { ...(patch.content ?? {}), hoverScale: Number(d.hoverScale) }
    if (d.corners) patch.content = { ...(patch.content ?? {}), corners: d.corners }
    patch.type = newType

    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map(h =>
        h.id !== id ? h : { ...h, type: newType, label: patch.label, description: patch.content?.text, url: patch.content?.url, targetSceneId: patch.target_scene_id, icon: d.icon || undefined, scale: Number(d.scale), hoverScale: Number(d.hoverScale), corners: d.corners }
      ),
    }

    try {
      const res = await apiFetch(`/hotspots/${id}`, { method: 'PATCH', body: patch })
      const updated = unwrap<any>(res)?.hotspot || res?.hotspot
      if (updated) {
        const mapped = mapDbHotspot(updated)
        hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map(h => h.id === id ? mapped : h) }
      }
      showToast('Hotspot updated')
    } catch (e: any) {
      await fetchHotspots(sceneId)
      showToast(e?.data?.statusMessage || 'Failed to update hotspot', 'error')
    } finally {
      savingHotspot.value = false
    }
  }

  return {
    editDraft,
    savingHotspot,
    addingHotspot,
    deletingHotspot,
    quickEditHotspotId,
    quickEditScreenPos,
    repositioningHotspotId,
    hotspotDraftType,
    showTypePicker,
    isTracing,
    tracePoints,
    deleteCandidate,
    inlineEditMode,
    activeSceneHotspots,
    hotspotCount,
    activeSceneHotspotsWithPreview,
    otherScenesForHotspot,
    startTracing,
    handleUpdateTrace,
    onOpenTypePicker,
    onTypePicked,
    onCancelPlacement,
    onQuickEditCancel,
    handleViewerAddHotspot,
    onQuickEditDone,
    onQuickEditMore,
    handleHotspotClick,
    handleHotspotEdit,
    deleteHotspot,
    handleHotspotReposition,
    selectHotspot,
    patchHotspotDraft,
    closeHotspotPanel,
    confirmDeleteHotspot,
    saveHotspotEdit,
  }
}
