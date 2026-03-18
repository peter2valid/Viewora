/**
 * composables/useProperties.ts
 *
 * Properties are the primary business entity in Viewora.
 * A property belongs to a user and has a public page at /p/[slug].
 */

export interface Property {
  id: string
  user_id: string
  title: string
  slug: string | null
  description: string | null
  property_type: string | null
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

export const useProperties = () => {
  const { apiFetch } = useApiFetch()

  const properties = ref<Property[]>([])
  const currentProperty = ref<Property | null>(null)
  const pending = ref(false)
  const error = ref<string | null>(null)

  // ── List ──────────────────────────────────────────────────────────────────
  const fetchProperties = async () => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Property[]>('/properties')
      properties.value = data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
    } finally {
      pending.value = false
    }
  }

  // ── Single ────────────────────────────────────────────────────────────────
  const fetchProperty = async (id: string) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Property>(`/properties/${id}`)
      currentProperty.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const createProperty = async (payload: { title: string; description?: string }) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Property>('/properties', { method: 'POST', body: payload })
      properties.value.unshift(data)
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      throw e
    } finally {
      pending.value = false
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────
  const updateProperty = async (id: string, payload: Partial<Property>) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Property>(`/properties/${id}`, { method: 'PATCH', body: payload })
      const idx = properties.value.findIndex(p => p.id === id)
      if (idx !== -1) properties.value[idx] = data
      if (currentProperty.value?.id === id) currentProperty.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      throw e
    } finally {
      pending.value = false
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteProperty = async (id: string) => {
    try {
      await apiFetch(`/properties/${id}`, { method: 'DELETE' })
      properties.value = properties.value.filter(p => p.id !== id)
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      throw e
    }
  }

  // ── Publish ───────────────────────────────────────────────────────────────
  const publishProperty = async (id: string, publish: boolean, slug?: string) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Property>(`/properties/${id}/publish`, {
        method: 'POST',
        body: { publish, slug },
      })
      const idx = properties.value.findIndex(p => p.id === id)
      if (idx !== -1) properties.value[idx] = data
      if (currentProperty.value?.id === id) currentProperty.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      throw e
    } finally {
      pending.value = false
    }
  }

  return {
    properties,
    currentProperty,
    pending,
    error,
    fetchProperties,
    fetchProperty,
    createProperty,
    updateProperty,
    deleteProperty,
    publishProperty,
  }
}
