import { computed, ref } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSceneUpload } from '~/features/editor/composables/useSceneUpload'
import {
  validateVehicleViewFile, resizeVehiclePhoto, sortByAngle,
  type VehicleView, type VehicleHotspot, type VehicleHotspotKind, type VehicleSpin,
} from '~/shared/utils/vehicleViews'

export interface AngleSuggestion { id: string; angle: number | null; label: string | null }
export interface HotspotSuggestion { kind: 'feature' | 'damage'; x: number; y: number; title: string; body: string | null }
export type HotspotDraft = { kind: VehicleHotspotKind; x: number; y: number; title: string; body?: string | null; url?: string | null }

/**
 * Exterior spins, photos and hotspots for one car: load, upload, reorder by angle, pin, AI help.
 * `views` is the photos of the spin being edited (`activeSpinId`); `allViews` holds every spin's.
 */
export function useVehicleViews(spaceId: string) {
  const { apiFetch } = useApiFetch()
  const { uploadFile } = useSceneUpload(spaceId)
  const allViews = ref<VehicleView[]>([])
  const spins = ref<VehicleSpin[]>([])
  /** False until the database has the spins table: the editor then offers one spin only. */
  const spinsReady = ref(false)
  const activeSpinId = ref<string | null>(null)
  const views = computed(() => allViews.value.filter(v => (v.spin_id ?? spins.value[0]?.id) === activeSpinId.value))
  const activeSpin = computed(() => spins.value.find(s => s.id === activeSpinId.value) ?? null)
  const frameCounts = computed(() => {
    const out: Record<string, number> = {}
    for (const v of allViews.value) {
      const id = v.spin_id ?? spins.value[0]?.id ?? ''
      out[id] = (out[id] ?? 0) + 1
    }
    return out
  })
  const loading = ref(false)
  const loaded = ref(false)

  const unwrap = <T = any>(v: any): T => (v && v.data !== undefined ? v.data : v)

  function setViews(list: VehicleView[]) {
    allViews.value = sortByAngle(list.map(v => ({ ...v, hotspots: v.hotspots ?? [] })))
  }

  async function load() {
    loading.value = true
    try {
      const res = unwrap<any>(await apiFetch(`/spaces/${spaceId}/vehicle-views`))
      spins.value = res?.vehicle_spins ?? []
      spinsReady.value = !!res?.spins_ready
      setViews(res?.vehicle_views ?? [])
      if (!spins.value.some(s => s.id === activeSpinId.value)) activeSpinId.value = spins.value[0]?.id ?? null
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  function selectSpin(id: string) {
    if (spins.value.some(s => s.id === id)) activeSpinId.value = id
  }

  // ── Spins ──
  /** A new spin; with `row_of` it is another camera height of that spin. */
  async function addSpin(title: string, height?: { row_of: string; elevation: number }): Promise<VehicleSpin> {
    const res = unwrap<any>(await apiFetch(`/spaces/${spaceId}/vehicle-spins`, { method: 'POST', body: { title, ...(height ?? {}) } }))
    const spin: VehicleSpin | undefined = res?.vehicle_spin
    if (!spin?.id) throw new Error('Could not add the spin')
    spins.value = [...spins.value, spin]
    activeSpinId.value = spin.id
    return spin
  }

  async function updateSpin(id: string, patch: { title?: string; start_angle?: number }) {
    const before = spins.value
    spins.value = spins.value.map(s => (s.id === id ? { ...s, ...patch } : s))
    try {
      const res = unwrap<any>(await apiFetch(`/vehicle-spins/${id}`, { method: 'PATCH', body: patch }))
      if (res?.vehicle_spin) spins.value = spins.value.map(s => (s.id === id ? res.vehicle_spin : s))
    } catch (e) {
      spins.value = before
      throw e
    }
  }

  /** Deletes a spin with its photos and hotspots, then the photo files. */
  async function removeSpin(id: string) {
    const res = unwrap<any>(await apiFetch(`/vehicle-spins/${id}`, { method: 'DELETE' }))
    for (const mediaId of res?.media_ids ?? []) apiFetch(`/uploads/${mediaId}`, { method: 'DELETE' }).catch(() => {})
    // Its camera-height rows were deleted with it.
    const gone = new Set([id, ...spins.value.filter(s => s.row_of === id).map(s => s.id)])
    spins.value = spins.value.filter(s => !gone.has(s.id))
    allViews.value = allViews.value.filter(v => !gone.has(v.spin_id ?? ''))
    if (activeSpinId.value && gone.has(activeSpinId.value)) activeSpinId.value = spins.value[0]?.id ?? null
  }

  /** Throws with a user-facing message on validation or upload failure. */
  async function addView(file: File, angle: number, label?: string): Promise<VehicleView> {
    const invalid = validateVehicleViewFile(file)
    if (invalid) throw new Error(invalid)

    // Resize first: a raw phone photo is 5-10 MB, which is slow for buyers on mobile data.
    const prepared = await resizeVehiclePhoto(file)

    const record: any = unwrap(await uploadFile(prepared.file, 'vehicle_view'))
    if (!record?.public_url) throw new Error('Upload failed')
    const res = unwrap<any>(await apiFetch(`/spaces/${spaceId}/vehicle-views`, {
      method: 'POST',
      body: { spin_id: activeSpinId.value, image_url: record.public_url, media_id: record.id ?? null, angle, label: label ?? null, width: prepared.width, height: prepared.height },
    }))
    const created: VehicleView | undefined = res?.vehicle_view
    if (!created?.id) throw new Error('Could not save the car photo')
    setViews([...allViews.value, { ...created, spin_id: created.spin_id ?? activeSpinId.value, hotspots: [] }])
    return created
  }

  async function removeView(id: string) {
    const v = allViews.value.find(x => x.id === id)
    await apiFetch(`/vehicle-views/${id}`, { method: 'DELETE' })
    if (v?.media_id) apiFetch(`/uploads/${v.media_id}`, { method: 'DELETE' }).catch(() => {})
    allViews.value = allViews.value.filter(x => x.id !== id)
  }

  /** Replace the photo at a slot: upload the new one, move the pins across, then drop the old one. */
  async function replaceView(id: string, file: File) {
    const old = allViews.value.find(x => x.id === id)
    if (!old) return
    const created = await addView(file, old.angle, old.label ?? undefined)
    // Pins belong to what is in the photo; if the new shot is framed alike they still land right.
    for (const h of old.hotspots ?? []) {
      await createHotspot(created.id, { kind: h.kind, x: h.x, y: h.y, title: h.title, body: h.body, url: h.url }).catch(() => {})
    }
    await removeView(id)
  }

  /** Change several photos' angles in one write (swap two, or accept an AI sort). */
  async function applyAngles(items: Array<{ id: string; angle: number; label?: string | null }>) {
    const before = allViews.value
    // Show the new order straight away; the server answer then replaces it.
    const byId = new Map(items.map(i => [i.id, i]))
    setViews(before.map((v) => {
      const it = byId.get(v.id)
      if (!it) return v
      return { ...v, angle: it.angle, label: 'label' in it ? (it.label ?? null) : v.label }
    }))
    try {
      const res = unwrap<any>(await apiFetch(`/spaces/${spaceId}/vehicle-views/angles`, { method: 'PUT', body: { items } }))
      if (res?.vehicle_views) setViews(res.vehicle_views)
    } catch (e) {
      allViews.value = before
      throw e
    }
  }

  async function renameView(id: string, label: string | null) {
    const res = unwrap<any>(await apiFetch(`/vehicle-views/${id}`, { method: 'PATCH', body: { label } }))
    const updated: VehicleView | undefined = res?.vehicle_view
    if (updated) allViews.value = allViews.value.map(v => (v.id === id ? { ...v, label: updated.label } : v))
  }

  // ── Hotspots ──────────────────────────────────────────────
  function patchHotspots(viewId: string, fn: (list: VehicleHotspot[]) => VehicleHotspot[]) {
    allViews.value = allViews.value.map(v => (v.id === viewId ? { ...v, hotspots: fn(v.hotspots ?? []) } : v))
  }

  async function createHotspot(viewId: string, draft: HotspotDraft): Promise<VehicleHotspot> {
    const res = unwrap<any>(await apiFetch(`/vehicle-views/${viewId}/hotspots`, { method: 'POST', body: draft }))
    const h: VehicleHotspot | undefined = res?.hotspot
    if (!h?.id) throw new Error('Could not save the hotspot')
    patchHotspots(viewId, list => [...list, h])
    return h
  }

  async function updateHotspot(viewId: string, id: string, patch: Partial<HotspotDraft>) {
    // Optimistic: pins follow the pointer instantly; roll back if the save fails.
    const prev = allViews.value.find(v => v.id === viewId)?.hotspots ?? []
    patchHotspots(viewId, list => list.map(h => (h.id === id ? { ...h, ...patch } : h)))
    try {
      const res = unwrap<any>(await apiFetch(`/vehicle-hotspots/${id}`, { method: 'PATCH', body: patch }))
      if (res?.hotspot) patchHotspots(viewId, list => list.map(h => (h.id === id ? res.hotspot : h)))
    } catch (e) {
      patchHotspots(viewId, () => prev)
      throw e
    }
  }

  async function deleteHotspot(viewId: string, id: string) {
    const prev = allViews.value.find(v => v.id === viewId)?.hotspots ?? []
    patchHotspots(viewId, list => list.filter(h => h.id !== id))
    try {
      await apiFetch(`/vehicle-hotspots/${id}`, { method: 'DELETE' })
    } catch (e) {
      patchHotspots(viewId, () => prev)
      throw e
    }
  }

  // ── AI (suggestions only; the owner accepts before anything is saved) ──
  async function aiSortSuggestions(): Promise<AngleSuggestion[]> {
    // One spin at a time: frames of different spins share angles.
    const res = unwrap<any>(await apiFetch(`/spaces/${spaceId}/vehicle-views/ai-sort`, { method: 'POST', body: { spin_id: activeSpinId.value } }))
    return res?.suggestions ?? []
  }

  async function aiHotspotSuggestions(viewId: string): Promise<HotspotSuggestion[]> {
    const res = unwrap<any>(await apiFetch(`/vehicle-views/${viewId}/ai-hotspots`, { method: 'POST' }))
    return res?.suggestions ?? []
  }

  return {
    views, allViews, loading, loaded, load,
    spins, spinsReady, activeSpinId, activeSpin, frameCounts, selectSpin, addSpin, updateSpin, removeSpin,
    addView, removeView, replaceView, applyAngles, renameView,
    createHotspot, updateHotspot, deleteHotspot,
    aiSortSuggestions, aiHotspotSuggestions,
  }
}
