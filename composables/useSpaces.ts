/**
 * composables/useSpaces.ts
 *
 * Spaces are the primary business entity in Viewora.
 * A space belongs to a user and has a public page at /p/[slug].
 */

export interface Space {
  id: string
  user_id: string
  title: string
  slug: string | null
  description: string | null
  space_type: string | null
  location_text: string | null
  cover_image_url: string | null
  has_360: boolean
  has_gallery: boolean
  is_published: boolean
  published_at: string | null
  visibility: 'private' | 'public'
  lead_form_enabled: boolean
  branding_enabled: boolean
  created_at: string
  updated_at: string
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
      const data = await apiFetch<Space[]>('/spaces')
      spaces.value = data
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
      const data = await apiFetch<Space>(`/spaces/${id}`)
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
      const data = await apiFetch<Space>('/spaces', { method: 'POST', body: payload })
      spaces.value.unshift(data)
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      throw e
    } finally {
      pending.value = false
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────
  const updateSpace = async (id: string, payload: Partial<Space>) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Space>(`/spaces/${id}`, { method: 'PATCH', body: payload })
      const idx = spaces.value.findIndex(p => p.id === id)
      if (idx !== -1) spaces.value[idx] = data
      if (currentSpace.value?.id === id) currentSpace.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      throw e
    } finally {
      pending.value = false
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteSpace = async (id: string) => {
    try {
      await apiFetch(`/spaces/${id}`, { method: 'DELETE' })
      spaces.value = spaces.value.filter(p => p.id !== id)
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      throw e
    }
  }

  // ── Publish ───────────────────────────────────────────────────────────────
  const publishSpace = async (id: string, publish: boolean, slug?: string) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Space>(`/spaces/${id}/publish`, {
        method: 'POST',
        body: { publish, slug },
      })
      const idx = spaces.value.findIndex(p => p.id === id)
      if (idx !== -1) spaces.value[idx] = data
      if (currentSpace.value?.id === id) currentSpace.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      throw e
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
    updateSpace,
    deleteSpace,
    publishSpace,
  }
}
