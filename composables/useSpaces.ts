/**
 * composables/useSpaces.ts
 *
 * All data access goes through /api/spaces/* server routes.
 * Server routes use Supabase Postgres (via serverDb()).
 */

export interface Space {
  id: string
  owner_id: string
  title: string
  panorama_key: string | null
  panorama_url: string | null   // presigned GET URL, only present on fetchSpace()
  is_published: boolean
  slug: string | null
  created_at: string
}

export const useSpaces = () => {
  const { apiFetch } = useApiFetch()

  const spaces = ref<Space[]>([])
  const currentSpace = ref<Space | null>(null)
  const pending = ref(false)
  const error = ref<string | null>(null)

  // ── List ──────────────────────────────────────────────────────────────────
  const fetchSpaces = async () => {
    pending.value = true
    error.value = null
    try {
      spaces.value = await apiFetch<Space[]>('/api/spaces')
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
    } finally {
      pending.value = false
    }
  }

  // ── Single ────────────────────────────────────────────────────────────────
  const fetchSpace = async (id: string) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Space>(`/api/spaces/${id}`)
      currentSpace.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const createSpace = async (payload: { title: string; description?: string }) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Space>('/api/spaces', {
        method: 'POST',
        body: payload,
      })
      spaces.value.unshift(data)
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  // ── Rename ────────────────────────────────────────────────────────────────
  const renameSpace = async (id: string, title: string) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Space>(`/api/spaces/${id}`, {
        method: 'PATCH',
        body: { title },
      })
      const idx = spaces.value.findIndex(s => s.id === id)
      if (idx !== -1) spaces.value[idx] = data
      if (currentSpace.value?.id === id) currentSpace.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteSpace = async (id: string) => {
    pending.value = true
    error.value = null
    try {
      await apiFetch(`/api/spaces/${id}`, { method: 'DELETE' })
      spaces.value = spaces.value.filter(s => s.id !== id)
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
    } finally {
      pending.value = false
    }
  }

  // ── Toggle publish ────────────────────────────────────────────────────────
  const togglePublish = async (space: Space) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Space>(`/api/spaces/${space.id}/publish`, {
        method: 'POST',
        body: { publish: !space.is_published },
      })
      const idx = spaces.value.findIndex(s => s.id === space.id)
      if (idx !== -1) spaces.value[idx] = data
      if (currentSpace.value?.id === space.id) currentSpace.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  // ── Publish with explicit slug ────────────────────────────────────────────
  const publishSpace = async (id: string, slug: string) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Space>(`/api/spaces/${id}/publish`, {
        method: 'POST',
        body: { publish: true, slug },
      })
      if (currentSpace.value?.id === id) currentSpace.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
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
    publishSpace,
  }
}
