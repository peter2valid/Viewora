import { ref } from 'vue'

export interface Space {
  id: string
  owner_id: string
  title: string
  description: string | null
  is_published: boolean
  slug: string | null
  created_at: string
}

export const useSpaces = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const spaces = ref<Space[]>([])
  const currentSpace = ref<Space | null>(null)
  const pending = ref(false)
  const error = ref<string | null>(null)

  const fetchSpaces = async () => {
    if (!user.value) return
    pending.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('spaces')
        .select('*')
        .eq('owner_id', user.value.id)
        .order('created_at', { ascending: false })

      if (err) throw err
      spaces.value = data || []
    } catch (err: any) {
      error.value = err.message
    } finally {
      pending.value = false
    }
  }

  const fetchSpace = async (id: string) => {
    pending.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', id)
        .single()

      if (err) throw err
      currentSpace.value = data
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      pending.value = false
    }
  }

  const createSpace = async (payload: { title: string, description?: string }) => {
    if (!user.value) return null
    pending.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('spaces')
        .insert({
          owner_id: user.value.id,
          title: payload.title,
          description: payload.description,
        })
        .select()
        .single()

      if (err) throw err
      spaces.value.unshift(data)
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      pending.value = false
    }
  }

  const publishSpace = async (id: string, slug: string) => {
    pending.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('spaces')
        .update({ is_published: true, slug })
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      if (currentSpace.value?.id === id) {
        currentSpace.value = data
      }
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      pending.value = false
    }
  }

  return {
    spaces,
    currentSpace,
    pending,
    error,
    fetchSpaces,
    fetchSpace,
    createSpace,
    publishSpace
  }
}
