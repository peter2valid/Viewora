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
    console.log('[DEBUG] user.value inside useSpaces:', user.value)
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

  const renameSpace = async (id: string, title: string) => {
    pending.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('spaces')
        .update({ title })
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      const idx = spaces.value.findIndex(s => s.id === id)
      if (idx !== -1) spaces.value[idx] = data
      if (currentSpace.value?.id === id) currentSpace.value = data
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      pending.value = false
    }
  }

  const deleteSpace = async (id: string) => {
    pending.value = true
    error.value = null
    try {
      const { error: err } = await supabase
        .from('spaces')
        .delete()
        .eq('id', id)

      if (err) throw err
      spaces.value = spaces.value.filter(s => s.id !== id)
    } catch (err: any) {
      error.value = err.message
    } finally {
      pending.value = false
    }
  }

  const togglePublish = async (space: Space) => {
    pending.value = true
    error.value = null
    try {
      const updates: Partial<Space> = { is_published: !space.is_published }
      if (!space.is_published && !space.slug) {
        const base = space.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        updates.slug = `${base}-${Math.random().toString(36).substring(2, 7)}`
      }
      const { data, error: err } = await supabase
        .from('spaces')
        .update(updates)
        .eq('id', space.id)
        .select()
        .single()
      if (err) throw err
      const idx = spaces.value.findIndex(s => s.id === space.id)
      if (idx !== -1) spaces.value[idx] = data
      if (currentSpace.value?.id === space.id) currentSpace.value = data
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
    renameSpace,
    deleteSpace,
    togglePublish,
    publishSpace
  }
}
