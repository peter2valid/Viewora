import { ref, computed, watch, type Ref, type ComputedRef, type WritableComputedRef } from 'vue'
import { mapDbHotspot, type EditorHotspot } from '~/features/editor/mappers'
import { isLocalSceneId } from '~/features/editor/composables/useEditorUpload'
import type { LandKind, SphericalPoint } from '~/domain/hotspot'
import { angularDistance, isOnGround, pathAnchor, sphericalCentroid, subdivideBlock } from '~/shared/utils/viewerAdapters/landMarkers'
import {
  HOTSPOT_LABEL_MAX,
  LAND_DEFAULT_LABEL,
  buildContent,
  buildHotspotPayload,
  defaultLabel,
  draftFromHotspot,
  emptyDraft,
  type EditDraft,
  type HotspotType,
} from '~/features/editor/hotspotPayload'

type SceneChip = { id: string; label: string; ready: boolean; imageUrl?: string | null }

type EditorStore = {
  mode: string
  selectedHotspotId: string | null
  setMode: (mode: any) => void
  setPanel: (panel: any) => void
  selectHotspot: (id: string | null) => void
}

// 'surface' = the original 4-corner video mapping; 'plot' = an open-ended land
// boundary (3–64 points) that the user closes themselves.
type TraceMode = 'surface' | 'plot' | 'zone' | 'road'

const MAX_PLOT_POINTS = 64
// Clicks this close (≈1.2°) to an existing plot corner snap onto it, so
// neighbouring plots share exact boundary points instead of overlapping/gapping.
const SNAP_RADIUS_RAD = 0.021

function isTempId(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.startsWith('temp_')
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
  const { $posthog } = useNuxtApp() as any
  const editDraft = ref<EditDraft>(emptyDraft())
  const savingHotspot = ref(false)
  const addingHotspot = ref(false)
  const hotspotSaveInFlight = ref(false)
  const deletingHotspot = ref(false)
  const quickEditHotspotId = ref<string | null>(null)
  const quickEditScreenPos = ref({ x: 0, y: 0 })
  const repositioningHotspotId = ref<string | null>(null)
  const hotspotDraftType = ref<HotspotType>('info')
  const hotspotDraftKind = ref<LandKind | null>(null)
  const showTypePicker = ref(false)
  const isTracing = ref(false)
  const traceMode = ref<TraceMode>('surface')
  const tracePoints = ref<Array<{ yaw: number; pitch: number }>>([])
  // When set, finishing the trace replaces this plot's boundary instead of creating a new plot.
  const redrawPlotId = ref<string | null>(null)

  // ── Write ordering ─────────────────────────────────────────
  // A hotspot is created optimistically under a temp id; edits/moves/deletes
  // made before the POST returns used to be sent to /hotspots/temp_… (400) or,
  // for delete, let the hotspot reappear when the POST landed. Every write now
  // resolves the real id first.
  const pendingCreates = new Map<string, Promise<string | null>>()
  // Latest PATCH per hotspot — a slower, older response must not overwrite a newer edit.
  const patchSeq = new Map<string, number>()

  async function resolveRealId(id: string): Promise<string | null> {
    if (!isTempId(id)) return id
    const pending = pendingCreates.get(id)
    return pending ? await pending : null
  }

  function replaceHotspot(sceneId: string, id: string, next: EditorHotspot | null) {
    const list = hotspotsByScene.value[sceneId] ?? []
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: next ? list.map(h => h.id === id ? next : h) : list.filter(h => h.id !== id),
    }
  }

  function patchHotspotLocal(sceneId: string, id: string, patch: Partial<EditorHotspot>) {
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map(h => h.id === id ? { ...h, ...patch } : h),
    }
  }

  function sendPatch(sceneId: string, id: string, body: any, errorMsg: string) {
    const seq = (patchSeq.get(id) ?? 0) + 1
    patchSeq.set(id, seq)
    return resolveRealId(id).then(realId => {
      if (!realId) return // create failed — its own handler already rolled back
      return apiFetch(`/hotspots/${realId}`, { method: 'PATCH', body })
        .then(res => {
          if (patchSeq.get(id) !== seq) return
          const updated = unwrap<any>(res)?.hotspot || res?.hotspot
          if (updated) replaceHotspot(sceneId, realId, mapDbHotspot(updated))
        })
        .catch(e => {
          if (patchSeq.get(id) !== seq) return
          fetchHotspots(sceneId)
          showToast(e?.data?.statusMessage || e?.data?.fields?.[0]?.message || errorMsg, 'error')
        })
    })
  }

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
      return { ...h, label: d.label, description: d.description, url: d.url, targetSceneId: d.targetSceneId, type: d.type as any, icon: d.icon, labelColor: d.labelColor, labelBold: d.labelBold, scale: d.scale, hoverScale: d.hoverScale, strokeScale: d.strokeScale, corners: d.corners, imageUrl: d.imageUrl, kind: d.kind, points: d.points, plotStatus: d.plotStatus, plotPrice: d.plotPrice, plotSize: d.plotSize }
    })
  })

  const otherScenesForHotspot = computed(() =>
    sceneChips.value.filter(s => s.id !== selectedSceneId.value && s.ready).map(s => ({ id: s.id, label: s.label, imageUrl: s.imageUrl }))
  )

  const plotCount = computed(() =>
    Object.values(hotspotsByScene.value).reduce((n, list) => n + list.filter(h => h.kind === 'plot').length, 0)
  )

  const zoneCount = computed(() =>
    Object.values(hotspotsByScene.value).reduce((n, list) => n + list.filter(h => h.kind === 'zone').length, 0)
  )

  const isShapeTrace = computed(() => traceMode.value === 'plot' || traceMode.value === 'zone')

  /** True while drawing a closed shape (plot / estate) with enough points to close it. */
  const traceClosable = computed(() =>
    isTracing.value && isShapeTrace.value && tracePoints.value.length >= 3
  )

  /** True when the current drawing can be finished (shapes: 3+, road paths: 2+). */
  const traceCanFinish = computed(() =>
    isTracing.value && (traceClosable.value || (traceMode.value === 'road' && tracePoints.value.length >= 2))
  )

  watch(inlineEditMode, (editing) => {
    if (!editing) deleteCandidate.value = null
  })

  watch(deleteCandidate, (candidate) => {
    if (!candidate) return
    const validTargetId = sceneChips.value.some(s => s.id === candidate.targetSceneId && s.id !== candidate.sceneId)
      ? (candidate.targetSceneId || '')
      : sceneChips.value.find(s => s.id !== candidate.sceneId)?.id || ''
    editDraft.value = draftFromHotspot(candidate, validTargetId)
  })

  // Switching scenes mid-drawing would attach the boundary to the wrong panorama.
  watch(selectedSceneId, () => { if (isTracing.value) cancelTracing() })

  // ── Tracing ────────────────────────────────────────────────

  function startTracing() {
    traceMode.value = 'surface'
    redrawPlotId.value = null
    isTracing.value = true
    tracePoints.value = []
    showToast('Click 4 corners in the room to pin video', 'success')
  }

  /**
   * Start drawing a plot boundary, an estate/phase outline, or a road path
   * (ground arrow) — or redraw an existing one when `redrawId` is given.
   */
  function startPlotDrawing(redrawId: string | null = null, kind: 'plot' | 'zone' | 'road' = 'plot') {
    if (!selectedSceneId.value) { showToast('Upload a drone or 360 photo first.', 'error'); return }
    if (isLocalSceneId(selectedSceneId.value)) { showToast('Wait for the photo to finish uploading, then draw.', 'error'); return }
    showTypePicker.value = false
    quickEditHotspotId.value = null
    editorStore.setMode('view')
    traceMode.value = kind
    redrawPlotId.value = redrawId
    tracePoints.value = []
    isTracing.value = true
  }

  function cancelTracing() {
    isTracing.value = false
    tracePoints.value = []
    redrawPlotId.value = null
  }

  function undoTracePoint() {
    if (!isTracing.value || !tracePoints.value.length) return
    tracePoints.value = tracePoints.value.slice(0, -1)
  }

  /** Snap to an existing plot/estate corner on this scene (excluding the shape being redrawn). */
  function snapPoint(p: SphericalPoint): SphericalPoint {
    let best: SphericalPoint | null = null
    let bestDist = SNAP_RADIUS_RAD
    for (const h of activeSceneHotspots.value) {
      if ((h.kind !== 'plot' && h.kind !== 'zone') || h.id === redrawPlotId.value || !h.points) continue
      for (const v of h.points) {
        const d = angularDistance(p, v)
        if (d < bestDist) { bestDist = d; best = v }
      }
    }
    return best ? { yaw: best.yaw, pitch: best.pitch } : p
  }

  function handleUpdateTrace(payload: { yaw: number; pitch: number }) {
    if (!isTracing.value) return
    const point = { yaw: payload.yaw, pitch: payload.pitch }

    if (traceMode.value === 'surface') {
      tracePoints.value = [...tracePoints.value, point]
      if (tracePoints.value.length === 4) {
        editDraft.value.corners = [...tracePoints.value]
        isTracing.value = false
        tracePoints.value = []
        showToast('Spatial mapping complete', 'success')
      } else {
        showToast(`Point ${tracePoints.value.length}/4 captured`, 'success')
      }
      return
    }

    if (traceMode.value === 'road') {
      // The arrow is painted on the ground plane, which only exists below the horizon.
      if (!isOnGround(point)) { showToast('Click on the road surface, below the horizon.', 'error'); return }
      if (tracePoints.value.length >= MAX_PLOT_POINTS) return
      tracePoints.value = [...tracePoints.value, point]
      return
    }

    // Plot / estate: clicking back on the first corner closes the shape.
    if (tracePoints.value.length >= 3 && angularDistance(point, tracePoints.value[0]) < SNAP_RADIUS_RAD) {
      finishPlotDrawing()
      return
    }
    if (tracePoints.value.length >= MAX_PLOT_POINTS) {
      showToast(`A shape can have up to ${MAX_PLOT_POINTS} corners.`, 'error')
      return
    }
    tracePoints.value = [...tracePoints.value, snapPoint(point)]
  }

  function finishPlotDrawing() {
    if (!isTracing.value || traceMode.value === 'surface') return
    const kind = traceMode.value as 'plot' | 'zone' | 'road'
    const points = [...tracePoints.value]
    const min = kind === 'road' ? 2 : 3
    if (points.length < min) {
      showToast(kind === 'road' ? 'Click at least 2 points along the road, ending where the arrow should point.' : 'Click at least 3 corners.', 'error')
      return
    }
    const redrawId = redrawPlotId.value
    cancelTracing()

    const sceneId = selectedSceneId.value
    const anchor = kind === 'road' ? pathAnchor(points) : sphericalCentroid(points)

    if (redrawId) {
      const hs = (hotspotsByScene.value[sceneId] ?? []).find(h => h.id === redrawId)
      if (!hs) return
      const next = { ...draftFromHotspot(hs), points }
      patchHotspotLocal(sceneId, redrawId, { points, yaw: anchor.yaw, pitch: anchor.pitch })
      if (editorStore.selectedHotspotId === redrawId) editDraft.value = { ...editDraft.value, points }
      showToast(kind === 'road' ? 'Arrow updated' : 'Boundary updated')
      void sendPatch(sceneId, redrawId, { yaw: anchor.yaw, pitch: anchor.pitch, content: buildContent(next) }, 'Failed to update shape')
      return
    }

    const base = { ...emptyDraft('info'), kind, points }
    const draft: EditDraft =
      kind === 'plot' ? { ...base, label: `${LAND_DEFAULT_LABEL.plot} ${plotCount.value + 1}`, plotStatus: 'available' }
      : kind === 'zone' ? { ...base, label: `Phase ${zoneCount.value + 1}` }
      : { ...base, label: LAND_DEFAULT_LABEL.road, arrowWidth: 1 }
    const tempId = createHotspot(sceneId, anchor, draft, { openPanel: true })
    if (!tempId) return
    if (kind === 'plot') showToast(points.length === 4 ? 'Plot added. Add size and price, or split it into a grid of plots.' : 'Plot added. Add its size and price.')
    else if (kind === 'zone') showToast('Estate outline added. Give it a name.')
    else showToast('Road arrow added. Name the road and adjust the arrow width.')
  }

  // ── Grid split ─────────────────────────────────────────────

  /**
   * Replaces a 4-corner plot with rows × cols plots in one batch request. The
   * new plots inherit status/size/price and are numbered after the existing ones.
   */
  async function splitPlotIntoGrid(id: string, rows: number, cols: number) {
    const sceneId = selectedSceneId.value
    const parent = (hotspotsByScene.value[sceneId] ?? []).find(h => h.id === id)
    if (!parent || parent.kind !== 'plot' || parent.points?.length !== 4) return
    rows = Math.max(1, Math.min(30, Math.floor(rows)))
    cols = Math.max(1, Math.min(30, Math.floor(cols)))
    if (rows * cols < 2) { showToast('Choose at least 2 plots.', 'error'); return }
    if (rows * cols > 200) { showToast('Up to 200 plots at a time — split the block into smaller blocks.', 'error'); return }
    const cells = subdivideBlock(parent.points, rows, cols)
    if (!cells) { showToast('All 4 corners must be on the ground (below the horizon) to split into a grid.', 'error'); return }

    // Number new plots after the current highest "Plot N" so labels stay unique.
    const usedNumbers = Object.values(hotspotsByScene.value).flat()
      .filter(h => h.kind === 'plot' && h.id !== id)
      .map(h => Number(/(\d+)\s*$/.exec(h.label || '')?.[1] ?? 0))
    const start = Math.max(0, ...usedNumbers) + 1
    const shared = draftFromHotspot(parent)

    const drafts = cells.map((points, i) => ({
      ...shared,
      label: `${LAND_DEFAULT_LABEL.plot} ${start + i}`,
      points,
      description: '',
    }))
    const temps: EditorHotspot[] = drafts.map((d, i) => {
      const anchor = sphericalCentroid(d.points!)
      return {
        id: `temp_${Date.now()}_grid${i}`, yaw: anchor.yaw, pitch: anchor.pitch, type: 'info', kind: 'plot',
        label: d.label, points: d.points, plotStatus: d.plotStatus, plotPrice: d.plotPrice, plotSize: d.plotSize, _pending: true,
      }
    })

    // Optimistic: swap the block for its plots immediately.
    editorStore.selectHotspot(null)
    editorStore.setPanel('hotspots')
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id), ...temps],
    }
    showToast(`Creating ${temps.length} plots…`)

    try {
      const res = await apiFetch(`/scenes/${sceneId}/hotspots/batch`, {
        method: 'POST',
        body: { hotspots: drafts.map((d, i) => buildHotspotPayload(d, temps[i])) },
      })
      const rowsOut: any[] = unwrap<any>(res)?.hotspots ?? res?.hotspots ?? []
      const created = rowsOut.map(mapDbHotspot)
      const tempIds = new Set(temps.map(t => t.id))
      hotspotsByScene.value = {
        ...hotspotsByScene.value,
        [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []).filter(h => !tempIds.has(h.id)), ...created],
      }
      showToast(`${created.length} plots created`)
      $posthog?.capture('plot_grid_created', { count: created.length, rows, cols, scene_id: sceneId })
      // Only now remove the original block, so a failed batch never loses it.
      deleteHotspot(id, { silent: true })
    } catch (e: any) {
      const tempIds = new Set(temps.map(t => t.id))
      hotspotsByScene.value = {
        ...hotspotsByScene.value,
        [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []).filter(h => !tempIds.has(h.id)), parent],
      }
      showToast(e?.data?.statusMessage || e?.data?.fields?.[0]?.message || 'Could not create the plots. Try again.', 'error')
    }
  }

  function unwrap<T = any>(value: any): T {
    if (value && typeof value === 'object' && 'data' in value && value.data !== undefined) return value.data as T
    return value as T
  }

  // ── Create ─────────────────────────────────────────────────

  /**
   * Optimistically inserts a hotspot under a temp id and POSTs it. Returns the
   * temp id; later writes against it wait for the real id via resolveRealId().
   */
  function createHotspot(
    sceneId: string,
    pos: { yaw: number; pitch: number },
    d: EditDraft,
    opts: { openPanel?: boolean; existingTempId?: string } = {},
  ): string | null {
    const id = opts.existingTempId || `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const entry: EditorHotspot = {
      id, yaw: pos.yaw, pitch: pos.pitch, type: d.type, label: d.label || defaultLabel(d), url: d.url,
      targetSceneId: d.targetSceneId, description: d.description, icon: d.icon, labelColor: d.labelColor,
      labelBold: d.labelBold, scale: d.scale, hoverScale: d.hoverScale, strokeScale: d.strokeScale,
      corners: d.corners, imageUrl: d.imageUrl, kind: d.kind, points: d.points, plotStatus: d.plotStatus,
      plotPrice: d.plotPrice, plotSize: d.plotSize, _pending: true,
    }
    const exists = (hotspotsByScene.value[sceneId] ?? []).some(h => h.id === id)
    if (exists) replaceHotspot(sceneId, id, entry)
    else hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []), entry] }

    if (opts.openPanel) {
      editDraft.value = { ...d }
      editorStore.selectHotspot(id)
      editorStore.setPanel('hotspots')
    } else {
      editorStore.selectHotspot(null)
    }

    if (isLocalSceneId(sceneId)) {
      showToast('Hotspot saved locally. It will sync when upload completes.')
      return id
    }

    const beforeCount = hotspotCount.value - 1
    hotspotSaveInFlight.value = true
    const created = apiFetch(`/scenes/${sceneId}/hotspots`, { method: 'POST', body: buildHotspotPayload(d, pos) })
      .then(response => {
        const row = unwrap<any>(response)?.hotspot || response?.hotspot
        if (!row) throw new Error('Empty create response')
        const mapped = mapDbHotspot(row)
        const list = hotspotsByScene.value[sceneId] ?? []
        // A refetch that ran while this POST was in flight may already contain
        // the new row — keep that copy and just drop the temp entry.
        const alreadyFetched = list.some(h => h.id === mapped.id)
        if (list.some(h => h.id === id)) replaceHotspot(sceneId, id, alreadyFetched ? null : mapped)
        if (editorStore.selectedHotspotId === id) editorStore.selectHotspot(mapped.id)
        if (!opts.openPanel) showToast(beforeCount === 0 ? 'Your tour is now interactive' : 'Hotspot added')
        $posthog?.capture('hotspot_added', { hotspot_type: mapped.type, hotspot_kind: mapped.kind, scene_id: sceneId })
        return mapped.id
      })
      .catch(e => {
        replaceHotspot(sceneId, id, null)
        if (editorStore.selectedHotspotId === id) {
          editorStore.selectHotspot(null)
          if (opts.openPanel) editorStore.setPanel('scenes')
        }
        showToast(e?.data?.statusMessage || e?.data?.fields?.[0]?.message || 'Could not add hotspot. Try again.', 'error')
        return null
      })
      .finally(() => {
        pendingCreates.delete(id)
        hotspotSaveInFlight.value = pendingCreates.size > 0
      })
    pendingCreates.set(id, created)
    return id
  }

  // ── Placement ──────────────────────────────────────────────

  function resolveTargetSceneId(currentSceneId: string): string | null {
    const ordered = sceneChips.value.map(s => s.id)
    if (ordered.length < 2) return null
    const idx = ordered.findIndex(id => id === currentSceneId)
    if (idx === -1) return ordered[0]
    const next = ordered[(idx + 1) % ordered.length]
    return next === currentSceneId ? null : next
  }

  function onOpenTypePicker() { showTypePicker.value = true }

  function onTypePicked(userType: 'move' | 'info' | 'media' | 'link' | 'plot' | 'beacon' | 'road' | 'zone') {
    showTypePicker.value = false
    if (userType === 'plot' || userType === 'zone' || userType === 'road') { startPlotDrawing(null, userType); return }
    if (userType === 'beacon') { placeLandMarker(userType); return }
    const typeMap = { move: 'scene_link', info: 'info', media: 'video', link: 'url' } as const
    hotspotDraftType.value = typeMap[userType]
    hotspotDraftKind.value = null
    editorStore.setMode('hotspot')
  }

  function placeHotspotDirect(userType: 'info' | 'nav') {
    showTypePicker.value = false
    hotspotDraftType.value = userType === 'nav' ? 'scene_link' : 'info'
    hotspotDraftKind.value = null
    editorStore.setMode('hotspot')
  }

  /** Beacon / access-road pins: same click-to-place flow as info hotspots. */
  function placeLandMarker(kind: 'beacon' | 'road') {
    if (isTracing.value) cancelTracing()
    showTypePicker.value = false
    hotspotDraftType.value = 'info'
    hotspotDraftKind.value = kind
    editorStore.setMode('hotspot')
  }

  function onCancelPlacement() {
    hotspotDraftKind.value = null
    editorStore.setMode('view')
  }

  function onQuickEditCancel() {
    const id = quickEditHotspotId.value
    quickEditHotspotId.value = null
    if (id) {
      const sceneId = selectedSceneId.value
      const hs = (hotspotsByScene.value[sceneId] ?? []).find(h => h.id === id)
      // Only the never-submitted draft is discarded; a create already in flight is not.
      if (hs?._pending && !pendingCreates.has(id)) replaceHotspot(sceneId, id, null)
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
    const kind = hotspotDraftKind.value ?? undefined
    const targetSceneId = type === 'scene_link' ? (resolveTargetSceneId(sceneId) ?? '') : ''
    if (type === 'scene_link' && !targetSceneId) { showToast('Add another scene first, then place a scene-link hotspot.', 'error'); return }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const label = kind ? LAND_DEFAULT_LABEL[kind] : (type === 'scene_link' ? 'Go to next room' : '')
    const optimisticEntry: EditorHotspot = { id: tempId, yaw, pitch, type, kind, label, url: '', targetSceneId, description: '', _pending: true }
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []), optimisticEntry] }

    editDraft.value = { ...emptyDraft(type), label, targetSceneId, kind }
    editorStore.selectHotspot(tempId)
    quickEditHotspotId.value = tempId
    quickEditScreenPos.value = { x: screenX, y: screenY }
    hotspotDraftKind.value = null
    editorStore.setMode('view')
  }

  function submitQuickEdit(openPanel: boolean) {
    const id = quickEditHotspotId.value
    quickEditHotspotId.value = null
    if (!id) return
    const sceneId = selectedSceneId.value
    const hs = (hotspotsByScene.value[sceneId] ?? []).find(h => h.id === id)
    if (!hs) return
    const d = { ...editDraft.value }
    // Roads continue into the full panel, which is where the directions link is set.
    createHotspot(sceneId, { yaw: hs.yaw, pitch: hs.pitch }, d, { openPanel: openPanel || d.kind === 'road', existingTempId: id })
  }

  function onQuickEditDone() { submitQuickEdit(false) }
  function onQuickEditMore() { submitQuickEdit(true) }

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

  function deleteHotspot(id: string, opts: { silent?: boolean } = {}) {
    if (!id || deletingHotspot.value) return
    const sceneId = selectedSceneId.value

    replaceHotspot(sceneId, id, null)
    if (editorStore.selectedHotspotId === id) editorStore.selectHotspot(null)
    patchSeq.delete(id)
    if (!opts.silent) showToast('Hotspot deleted')

    void resolveRealId(id).then(realId => {
      if (!realId) return // never reached the server
      // The create may have landed after the optimistic removal and re-inserted
      // the row under its real id — drop it again before deleting server-side.
      replaceHotspot(sceneId, realId, null)
      return apiFetch(`/hotspots/${realId}`, { method: 'DELETE' })
        .catch(e => {
          fetchHotspots(sceneId)
          showToast(e?.data?.statusMessage || 'Failed to delete hotspot', 'error')
        })
    })
  }

  function handleHotspotReposition(id: string) {
    const hs = activeSceneHotspots.value.find(h => h.id === id)
    if (hs?.kind === 'plot' || hs?.kind === 'zone' || (hs?.kind === 'road' && (hs.points?.length ?? 0) >= 2)) {
      // A shape's position is its outline/path — "reposition" means redraw it.
      selectHotspot(id)
      startPlotDrawing(id, hs.kind)
      return
    }
    repositioningHotspotId.value = id
    editorStore.setMode('hotspot')
    showToast('Click anywhere to reposition the hotspot')
  }

  function repositionHotspot(id: string, yaw: number, pitch: number) {
    const sceneId = selectedSceneId.value
    repositioningHotspotId.value = null
    editorStore.setMode('view')

    // Use the actual dropped position for ALL hotspot types.
    // Previously scene_link was forced to -0.8 rad regardless of where the user
    // dropped it — every repositioned nav hotspot ended up near the floor.
    patchHotspotLocal(sceneId, id, { yaw, pitch })
    showToast('Hotspot repositioned')

    return sendPatch(sceneId, id, { yaw, pitch }, 'Failed to reposition hotspot')
  }

  function selectHotspot(id: string | null) {
    editorStore.selectHotspot(id)
    if (!id) return
    const hotspot = activeSceneHotspots.value.find(h => h.id === id)
    if (hotspot) editDraft.value = draftFromHotspot(hotspot)
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

  function saveHotspotEdit() {
    const id = editorStore.selectedHotspotId
    if (!id || savingHotspot.value) return
    const sceneId = selectedSceneId.value
    const d = editDraft.value
    const content = buildContent(d)
    const patch: any = {
      type: d.type,
      label: d.label.trim().slice(0, HOTSPOT_LABEL_MAX) || defaultLabel(d),
      content,
    }
    if (d.type === 'scene_link' && d.targetSceneId) patch.target_scene_id = d.targetSceneId

    patchHotspotLocal(sceneId, id, {
      type: d.type, label: patch.label, description: content.text, url: content.url, targetSceneId: patch.target_scene_id,
      icon: d.icon || undefined, labelColor: d.labelColor || undefined, labelBold: d.labelBold || undefined,
      scale: Number(d.scale), hoverScale: Number(d.hoverScale), strokeScale: Number(d.strokeScale),
      corners: d.corners, imageUrl: d.imageUrl, kind: d.kind, points: d.points, plotStatus: d.plotStatus,
      plotPrice: d.plotPrice, plotSize: d.plotSize,
    })

    showToast('Hotspot updated')

    if (isLocalSceneId(sceneId)) return // synced with the scene once its upload completes
    void sendPatch(sceneId, id, patch, 'Failed to update hotspot')
  }

  function handleHotspotDragDrop(payload: { id: string; yaw: number; pitch: number }) {
    void repositionHotspot(payload.id, payload.yaw, payload.pitch)
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
    hotspotDraftKind,
    showTypePicker,
    isTracing,
    traceMode,
    tracePoints,
    traceClosable,
    traceCanFinish,
    redrawPlotId,
    splitPlotIntoGrid,
    deleteCandidate,
    inlineEditMode,
    activeSceneHotspots,
    hotspotCount,
    activeSceneHotspotsWithPreview,
    otherScenesForHotspot,
    startTracing,
    startPlotDrawing,
    cancelTracing,
    undoTracePoint,
    finishPlotDrawing,
    handleUpdateTrace,
    placeHotspotDirect,
    placeLandMarker,
    onOpenTypePicker,
    onTypePicked,
    onCancelPlacement,
    onQuickEditCancel,
    handleViewerAddHotspot,
    handleHotspotDragDrop,
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
