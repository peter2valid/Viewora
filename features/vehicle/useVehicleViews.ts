import { ref } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSceneUpload } from '~/features/editor/composables/useSceneUpload'
import {
  validateVehicleViewFile, resizeVehiclePhoto, sortByAngle,
  type VehicleView, type VehicleHotspot, type VehicleHotspotKind,
} from '~/shared/utils/vehicleViews'

export interface AngleSuggestion { id: string; angle: number | null; label: string | null }
export interface HotspotSuggestion { kind: 'feature' | 'damage'; x: number; y: number; title: string; body: string | null }
export type HotspotDraft = { kind: VehicleHotspotKind; x: number; y: number; title: string; body?: string | null; url?: string | null }

/** Exterior photos and their hotspots for one car: load, upload, reorder by angle, pin, AI help. */
export function useVehicleViews(spaceId: string) {
  const { apiFetch } = useApiFetch()
  const { uploadFile } = useSceneUpload(spaceId)
  const views = ref<VehicleView[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  const unwrap = <T = any>(v: any): T => (v && v.data !== undefined ? v.data : v)

  function setViews(list: VehicleView[]) {
    views.value = sortByAngle(list.map(v => ({ ...v, hotspots: v.hotspots ?? [] })))
  }

  async function load() {
    loading.value = true
    try {
      const res = unwrap<any>(await apiFetch(`/spaces/${spaceId}/vehicle-views`))
      setViews(res?.vehicle_views ?? [])
      loaded.value = true
    } finally {
      loading.value = false
    }
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
      body: { image_url: record.public_url, media_id: record.id ?? null, angle, label: label ?? null, width: prepared.width, height: prepared.height },
    }))
    const created: VehicleView | undefined = res?.vehicle_view
    if (!created?.id) throw new Error('Could not save the car photo')
    setViews([...views.value, { ...created, hotspots: [] }])
    return created
  }

  async function removeView(id: string) {
    const v = views.value.find(x => x.id === id)
    await apiFetch(`/vehicle-views/${id}`, { method: 'DELETE' })
    if (v?.media_id) apiFetch(`/uploads/${v.media_id}`, { method: 'DELETE' }).catch(() => {})
    views.value = views.value.filter(x => x.id !== id)
  }

  /** Replace the photo at a slot: upload the new one, move the pins across, then drop the old one. */
  async function replaceView(id: string, file: File) {
    const old = views.value.find(x => x.id === id)
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
    const before = views.value
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
      views.value = before
      throw e
    }
  }

  async function renameView(id: string, label: string | null) {
    const res = unwrap<any>(await apiFetch(`/vehicle-views/${id}`, { method: 'PATCH', body: { label } }))
    const updated: VehicleView | undefined = res?.vehicle_view
    if (updated) views.value = views.value.map(v => (v.id === id ? { ...v, label: updated.label } : v))
  }

  // ── Hotspots ──────────────────────────────────────────────
  function patchHotspots(viewId: string, fn: (list: VehicleHotspot[]) => VehicleHotspot[]) {
    views.value = views.value.map(v => (v.id === viewId ? { ...v, hotspots: fn(v.hotspots ?? []) } : v))
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
    const prev = views.value.find(v => v.id === viewId)?.hotspots ?? []
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
    const prev = views.value.find(v => v.id === viewId)?.hotspots ?? []
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
    const res = unwrap<any>(await apiFetch(`/spaces/${spaceId}/vehicle-views/ai-sort`, { method: 'POST' }))
    return res?.suggestions ?? []
  }

  async function aiHotspotSuggestions(viewId: string): Promise<HotspotSuggestion[]> {
    const res = unwrap<any>(await apiFetch(`/vehicle-views/${viewId}/ai-hotspots`, { method: 'POST' }))
    return res?.suggestions ?? []
  }

  return {
    views, loading, loaded, load,
    addView, removeView, replaceView, applyAngles, renameView,
    createHotspot, updateHotspot, deleteHotspot,
    aiSortSuggestions, aiHotspotSuggestions,
  }
}
