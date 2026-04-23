import { ref } from 'vue'

export interface SceneRow {
  id: string
  space_id: string
  name: string
  order_index: number
  raw_image_url: string | null
  tile_manifest_url: string | null
  thumbnail_url: string | null
  status: 'pending' | 'processing' | 'ready' | 'failed'
  initial_yaw: number
  initial_pitch: number
  hotspots?: any[]
  created_at?: string
  updated_at?: string
}

export interface CreateScenePayload {
  name?: string
  raw_image_url: string
  order_index?: number
  initial_yaw?: number
  initial_pitch?: number
}

export interface UpdateScenePayload {
  name?: string
  order_index?: number
  initial_yaw?: number
  initial_pitch?: number
}

export function useScenes(spaceId: string) {
  const { apiFetch } = useApiFetch()
  const scenes = ref<SceneRow[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchScenes() {
    loading.value = true
    error.value = null
    try {
      const result = await apiFetch<{ scenes: SceneRow[] }>(`/spaces/${spaceId}/scenes`)
      scenes.value = result.scenes ?? []
    } catch (err: any) {
      error.value = err?.data?.statusMessage ?? 'Failed to load scenes'
    } finally {
      loading.value = false
    }
  }

  async function createScene(payload: CreateScenePayload): Promise<SceneRow | null> {
    try {
      const result = await apiFetch<{ scene: SceneRow }>(`/spaces/${spaceId}/scenes`, {
        method: 'POST',
        body: payload,
      })
      scenes.value.push(result.scene)
      return result.scene
    } catch (err: any) {
      error.value = err?.data?.statusMessage ?? 'Failed to create scene'
      return null
    }
  }

  async function updateScene(sceneId: string, patch: UpdateScenePayload): Promise<SceneRow | null> {
    try {
      const result = await apiFetch<{ scene: SceneRow }>(`/scenes/${sceneId}`, {
        method: 'PATCH',
        body: patch,
      })
      const idx = scenes.value.findIndex(s => s.id === sceneId)
      if (idx !== -1) scenes.value[idx] = result.scene
      return result.scene
    } catch (err: any) {
      error.value = err?.data?.statusMessage ?? 'Failed to update scene'
      return null
    }
  }

  async function deleteScene(sceneId: string): Promise<boolean> {
    try {
      await apiFetch(`/scenes/${sceneId}`, { method: 'DELETE' })
      scenes.value = scenes.value.filter(s => s.id !== sceneId)
      return true
    } catch (err: any) {
      error.value = err?.data?.statusMessage ?? 'Failed to delete scene'
      return false
    }
  }

  function updateSceneLocally(sceneId: string, patch: Partial<SceneRow>) {
    const idx = scenes.value.findIndex(s => s.id === sceneId)
    if (idx !== -1) scenes.value[idx] = { ...scenes.value[idx], ...patch }
  }

  return {
    scenes,
    loading,
    error,
    fetchScenes,
    createScene,
    updateScene,
    deleteScene,
    updateSceneLocally,
  }
}
