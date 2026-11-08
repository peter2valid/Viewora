import { ref } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSceneUpload } from '~/features/editor/composables/useSceneUpload'
import { validateVehicleViewFile, sortByAngle, type VehicleView } from '~/shared/utils/vehicleViews'

function readSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not read this image'))
    img.src = url
  })
}

/** Exterior photos for one car: list, upload at an angle, relabel, replace, delete. */
export function useVehicleViews(spaceId: string) {
  const { apiFetch } = useApiFetch()
  const { uploadFile } = useSceneUpload(spaceId)
  const views = ref<VehicleView[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      const res: any = await apiFetch(`/spaces/${spaceId}/vehicle-views`)
      views.value = sortByAngle(res?.vehicle_views ?? res?.data?.vehicle_views ?? [])
    } finally {
      loading.value = false
    }
  }

  /** Throws with a user-facing message on validation or upload failure. */
  async function addView(file: File, angle: number, label?: string): Promise<VehicleView> {
    const invalid = validateVehicleViewFile(file)
    if (invalid) throw new Error(invalid)

    const blobUrl = URL.createObjectURL(file)
    let size: { width: number; height: number }
    try { size = await readSize(blobUrl) } finally { URL.revokeObjectURL(blobUrl) }

    const record: any = await uploadFile(file, 'vehicle_view')
    if (!record?.public_url) throw new Error('Upload failed')
    const res: any = await apiFetch(`/spaces/${spaceId}/vehicle-views`, {
      method: 'POST',
      body: { image_url: record.public_url, media_id: record.id ?? null, angle, label: label ?? null, width: size.width, height: size.height },
    })
    const created: VehicleView | undefined = res?.vehicle_view ?? res?.data?.vehicle_view
    if (!created?.id) throw new Error('Could not save the car photo')
    views.value = sortByAngle([...views.value, created])
    return created
  }

  async function removeView(id: string) {
    const v = views.value.find(x => x.id === id)
    await apiFetch(`/vehicle-views/${id}`, { method: 'DELETE' })
    if (v?.media_id) apiFetch(`/uploads/${v.media_id}`, { method: 'DELETE' }).catch(() => {})
    views.value = views.value.filter(x => x.id !== id)
  }

  /** Replace the photo at a slot: upload the new one first, then drop the old. */
  async function replaceView(id: string, file: File) {
    const old = views.value.find(x => x.id === id)
    if (!old) return
    await addView(file, old.angle, old.label ?? undefined)
    await removeView(id)
  }

  async function setAngle(id: string, angle: number) {
    const res: any = await apiFetch(`/vehicle-views/${id}`, { method: 'PATCH', body: { angle } })
    const updated: VehicleView | undefined = res?.vehicle_view ?? res?.data?.vehicle_view
    if (updated) views.value = sortByAngle(views.value.map(v => (v.id === id ? updated : v)))
  }

  return { views, loading, load, addView, removeView, replaceView, setAngle }
}
