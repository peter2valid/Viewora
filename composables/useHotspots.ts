/**
 * composables/useHotspots.ts  (Cloudflare D1 backed — no Supabase DB calls)
 */

export interface Hotspot {
  id: string
  scene_id: string
  type: string
  yaw: number
  pitch: number
  payload: Record<string, unknown>
  created_at: string
}

export const useHotspots = () => {
  const { apiFetch } = useApiFetch()

  const hotspots = ref<Hotspot[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  const fetchHotspots = async (sceneId: string) => {
    pending.value = true
    error.value = null
    try {
      hotspots.value = await apiFetch<Hotspot[]>(`/api/scenes/${sceneId}/hotspots`)
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
    } finally {
      pending.value = false
    }
  }

  const createHotspot = async (
    sceneId: string,
    yaw: number,
    pitch: number,
    type = 'info',
    payload: Record<string, unknown> = {},
  ) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Hotspot>(`/api/scenes/${sceneId}/hotspots`, {
        method: 'POST',
        body: { yaw, pitch, type, payload },
      })
      hotspots.value.push(data)
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  const deleteHotspot = async (id: string) => {
    pending.value = true
    error.value = null
    try {
      await apiFetch(`/api/hotspots/${id}`, { method: 'DELETE' })
      hotspots.value = hotspots.value.filter(h => h.id !== id)
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
    } finally {
      pending.value = false
    }
  }

  return { hotspots, pending, error, fetchHotspots, createHotspot, deleteHotspot }
}
