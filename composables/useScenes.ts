import { ref } from 'vue'

export interface Scene {
  id: string
  space_id: string
  image_path: string | null
  name: string
  order_index: number
  created_at: string
}

export const useScenes = () => {
  const supabase = useSupabaseClient()
  const scenes = ref<Scene[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  const fetchScenes = async (spaceId: string) => {
    pending.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('scenes')
        .select('*')
        .eq('space_id', spaceId)
        .order('order_index', { ascending: true })

      if (err) throw err
      scenes.value = data || []
    } catch (err: any) {
      error.value = err.message
    } finally {
      pending.value = false
    }
  }

  const createScene = async (spaceId: string, name: string, imagePath: string) => {
    pending.value = true
    error.value = null
    try {
      const orderIndex = scenes.value.length
      const { data, error: err } = await supabase
        .from('scenes')
        .insert({
          space_id: spaceId,
          name,
          image_path: imagePath,
          order_index: orderIndex
        })
        .select()
        .single()

      if (err) throw err
      scenes.value.push(data)
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      pending.value = false
    }
  }

  const deleteScene = async (id: string) => {
    pending.value = true
    error.value = null
    try {
      const { error: err } = await supabase
        .from('scenes')
        .delete()
        .eq('id', id)

      if (err) throw err
      scenes.value = scenes.value.filter(s => s.id !== id)
    } catch (err: any) {
      error.value = err.message
    } finally {
      pending.value = false
    }
  }

  return {
    scenes,
    pending,
    error,
    fetchScenes,
    createScene,
    deleteScene
  }
}
