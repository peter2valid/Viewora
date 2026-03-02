/**
 * composables/useHotspots.ts
 * All data access goes through /api/scenes/:id/hotspots and /api/hotspots/* routes.
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

  const createHotspot = async (payload: {
    scene_id: string
    yaw: number
    pitch: number
    type?: string
    target_scene_id?: string | null
    label?: string | null
  }) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Hotspot>(`/api/scenes/${payload.scene_id}/hotspots`, {
        method: 'POST',
        body: {
          yaw: payload.yaw,
          pitch: payload.pitch,
          type: payload.type ?? 'info',
          payload: {
            target_scene_id: payload.target_scene_id ?? null,
            label: payload.label ?? null,
          },
        },
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
