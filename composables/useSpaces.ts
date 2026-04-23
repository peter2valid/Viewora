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

  const normalizeSpace = (value: any): Space | null => {
    if (!value || typeof value !== 'object') return null
    return value as Space
  }

  const unwrapData = (value: any): any => {
    if (!value || typeof value !== 'object') return value
    if ('data' in value && value.data !== undefined) return value.data
    if ('result' in value && value.result !== undefined) return value.result
    return value
  }

  const normalizeSpaceList = (value: any): Space[] => {
    const unwrapped = unwrapData(value)
    if (Array.isArray(unwrapped)) return unwrapped.filter(Boolean) as Space[]
    if (unwrapped && typeof unwrapped === 'object') {
      if (Array.isArray((unwrapped as any).spaces)) return (unwrapped as any).spaces.filter(Boolean) as Space[]
      if (Array.isArray((unwrapped as any).items)) return (unwrapped as any).items.filter(Boolean) as Space[]
    }
    return []
  }

  // ── List ──────────────────────────────────────────────────────────────────
  const fetchSpaces = async () => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<any>('/spaces')
      spaces.value = normalizeSpaceList(data)
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      spaces.value = []
    } finally {
      pending.value = false
    }
  }

  // ── Single ────────────────────────────────────────────────────────────────
  const fetchSpace = async (id: string) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<any>(`/spaces/${id}`)
      const normalized = normalizeSpace(unwrapData(data))
      currentSpace.value = normalized
      return normalized
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const createSpace = async (payload: { title: string; space_type: Space['space_type']; description?: string; location_text?: string }) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<any>('/spaces', { method: 'POST', body: payload })
      const normalized = normalizeSpace(unwrapData(data))
      if (!Array.isArray(spaces.value)) spaces.value = []
      if (normalized) {
        spaces.value.unshift(normalized)
        return normalized
      }
      throw new Error('Invalid create space response format')
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
      const data = await apiFetch<any>(`/spaces/${id}`, { method: 'PATCH', body: payload })
      const normalized = normalizeSpace(unwrapData(data))
      if (!normalized) throw new Error('Invalid update space response format')
      const idx = spaces.value.findIndex(p => p.id === id)
      if (idx !== -1) spaces.value[idx] = normalized
      if (currentSpace.value?.id === id) currentSpace.value = normalized
      return normalized
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
      const data = await apiFetch<any>(`/spaces/${id}/publish`, {
        method: 'POST',
        body: { publish, slug },
      })
      const normalized = normalizeSpace(unwrapData(data))
      if (!normalized) throw new Error('Invalid publish space response format')
      const idx = spaces.value.findIndex(p => p.id === id)
      if (idx !== -1) spaces.value[idx] = normalized
      if (currentSpace.value?.id === id) currentSpace.value = normalized
      return normalized
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
