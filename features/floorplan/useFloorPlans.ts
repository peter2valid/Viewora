import { ref } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSceneUpload } from '~/features/editor/composables/useSceneUpload'
import { validateFloorPlanFile, type FloorPlan } from '~/shared/utils/floorPlan'

function readSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not read this image'))
    img.src = url
  })
}

/**
 * Floor plans for one space: list, upload (image → R2 via the shared upload
 * pipeline, then register it as a floor), rename, delete.
 */
export function useFloorPlans(spaceId: string) {
  const { apiFetch } = useApiFetch()
  const { uploadFile } = useSceneUpload(spaceId)
  const floorPlans = ref<FloorPlan[]>([])
  const loading = ref(false)
  const uploading = ref(false)

  async function load() {
    loading.value = true
    try {
      const res: any = await apiFetch(`/spaces/${spaceId}/floor-plans`)
      floorPlans.value = res?.floor_plans ?? res?.data?.floor_plans ?? []
    } finally {
      loading.value = false
    }
  }

  /** Throws with a user-facing message on validation / upload failure. */
  async function addFloorPlan(file: File, name?: string): Promise<FloorPlan> {
    const invalid = validateFloorPlanFile(file)
    if (invalid) throw new Error(invalid)

    const blobUrl = URL.createObjectURL(file)
    let size: { width: number; height: number }
    try { size = await readSize(blobUrl) } finally { URL.revokeObjectURL(blobUrl) }

    uploading.value = true
    try {
      const record: any = await uploadFile(file, 'floor_plan_image')
      if (!record?.public_url) throw new Error('Upload failed')
      const res: any = await apiFetch(`/spaces/${spaceId}/floor-plans`, {
        method: 'POST',
        body: { name, image_url: record.public_url, media_id: record.id ?? null, width: size.width, height: size.height },
      })
      const created: FloorPlan | undefined = res?.floor_plan ?? res?.data?.floor_plan
      if (!created?.id) throw new Error('Could not save the floor plan')
      floorPlans.value = [...floorPlans.value, created]
      return created
    } finally {
      uploading.value = false
    }
  }

  async function renameFloorPlan(id: string, name: string) {
    const res: any = await apiFetch(`/floor-plans/${id}`, { method: 'PATCH', body: { name } })
    const updated: FloorPlan | undefined = res?.floor_plan ?? res?.data?.floor_plan
    if (updated) floorPlans.value = floorPlans.value.map(f => (f.id === id ? updated : f))
  }

  /**
   * Put the floors in this order (ids of every floor). The new order is
   * written as order_index 0..n-1 to every floor whose index changed, which
   * also repairs duplicate indexes left behind by earlier deletes.
   */
  async function reorderFloorPlans(ids: string[]) {
    const prev = floorPlans.value
    const byId = new Map(prev.map(f => [f.id, f]))
    const next = ids.map(id => byId.get(id)).filter((f): f is FloorPlan => !!f)
    if (next.length !== prev.length) return
    const changed = next
      .map((f, i) => ({ f, i }))
      .filter(({ f, i }) => f.order_index !== i)
    if (!changed.length && next.every((f, i) => f === prev[i])) return
    floorPlans.value = next.map((f, i) => ({ ...f, order_index: i }))
    try {
      await Promise.all(changed.map(({ f, i }) =>
        apiFetch(`/floor-plans/${f.id}`, { method: 'PATCH', body: { order_index: i } })))
    } catch (e) {
      floorPlans.value = prev
      // Some writes may have landed — reload so the list matches the server.
      load().catch(() => {})
      throw e
    }
  }

  /** Move a floor one place earlier (-1) or later (+1). */
  async function moveFloorPlan(id: string, dir: -1 | 1) {
    const ids = floorPlans.value.map(f => f.id)
    const from = ids.indexOf(id)
    const to = from + dir
    if (from < 0 || to < 0 || to >= ids.length) return
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    await reorderFloorPlans(ids)
  }

  async function deleteFloorPlan(id: string) {
    const plan = floorPlans.value.find(f => f.id === id)
    await apiFetch(`/floor-plans/${id}`, { method: 'DELETE' })
    if (plan?.media_id) apiFetch(`/uploads/${plan.media_id}`, { method: 'DELETE' }).catch(() => {})
    floorPlans.value = floorPlans.value.filter(f => f.id !== id)
  }

  return { floorPlans, loading, uploading, load, addFloorPlan, renameFloorPlan, moveFloorPlan, reorderFloorPlans, deleteFloorPlan }
}
