import { ref } from 'vue'

export interface Hotspot {
  id: string
  scene_id: string
  type: string
  yaw: number
  pitch: number
  payload: any
  created_at: string
}

export const useHotspots = () => {
  const supabase = useSupabaseClient()
  const hotspots = ref<Hotspot[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  const fetchHotspots = async (sceneId: string) => {
    pending.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('hotspots')
        .select('*')
        .eq('scene_id', sceneId)

      if (err) throw err
      hotspots.value = data || []
    } catch (err: any) {
      error.value = err.message
    } finally {
      pending.value = false
    }
  }

  const createHotspot = async (sceneId: string, yaw: number, pitch: number, type = 'info', payload = {}) => {
    pending.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('hotspots')
        .insert({
          scene_id: sceneId,
          yaw,
          pitch,
          type,
          payload
        })
        .select()
        .single()

      if (err) throw err
      hotspots.value.push(data)
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      pending.value = false
    }
  }

  const deleteHotspot = async (id: string) => {
    pending.value = true
    error.value = null
    try {
      const { error: err } = await supabase
        .from('hotspots')
        .delete()
        .eq('id', id)

      if (err) throw err
      hotspots.value = hotspots.value.filter(h => h.id !== id)
    } catch (err: any) {
      error.value = err.message
    } finally {
      pending.value = false
    }
  }

  return {
    hotspots,
    pending,
    error,
    fetchHotspots,
    createHotspot,
    deleteHotspot
  }
}
