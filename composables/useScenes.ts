/**
 * composables/useScenes.ts
 * All data access goes through /api/spaces/:id/scenes and /api/scenes/* routes.
 */

export interface Scene {
  id: string
  space_id: string
  name: string
  image_path: string | null   // R2 object key
  order_index: number
  created_at: string
}

export const useScenes = () => {
  const { apiFetch } = useApiFetch()

  const scenes = ref<Scene[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  const fetchScenes = async (spaceId: string) => {
    pending.value = true
    error.value = null
    try {
      scenes.value = await apiFetch<Scene[]>(`/api/spaces/${spaceId}/scenes`)
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
    } finally {
      pending.value = false
    }
  }

  const createScene = async (spaceId: string, name: string, imagePath: string) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Scene>(`/api/spaces/${spaceId}/scenes`, {
        method: 'POST',
        body: { name, image_path: imagePath },
      })
      scenes.value.push(data)
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  const deleteScene = async (id: string) => {
    pending.value = true
    error.value = null
    try {
      await apiFetch(`/api/scenes/${id}`, { method: 'DELETE' })
      scenes.value = scenes.value.filter(s => s.id !== id)
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
    } finally {
      pending.value = false
    }
  }

  return { scenes, pending, error, fetchScenes, createScene, deleteScene }
}
