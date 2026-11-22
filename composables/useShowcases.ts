export type ShowcaseTour = {
  id: string
  title: string
  slug: string | null
  cover_image_url: string | null
  is_published: boolean
  visibility: string | null
  space_type?: string | null
  position: number
}

export type Showcase = {
  id: string
  title: string
  slug: string
  description: string | null
  cover_image: string | null
  is_published: boolean
  created_at: string
  updated_at: string
  tour_count?: number
  tours?: ShowcaseTour[]
}

export function useShowcases() {
  const { apiFetch } = useApiFetch()
  const showcases = useState<Showcase[]>('viewora-showcases', () => [])
  const pending = useState('viewora-showcases-pending', () => false)
  const loaded = useState('viewora-showcases-loaded', () => false)

  async function fetchShowcases(force = false) {
    if (loaded.value && !force) return showcases.value
    pending.value = true
    try {
      const response = await apiFetch<{ showcases: Showcase[] }>('/collections')
      showcases.value = response.showcases || []
      loaded.value = true
      return showcases.value
    } finally {
      pending.value = false
    }
  }

  async function fetchShowcase(id: string) {
    return apiFetch<Showcase>(`/collections/${id}`)
  }

  async function createShowcase(payload: { title: string; description?: string | null; property_ids: string[]; is_published?: boolean }) {
    const created = await apiFetch<Showcase>('/collections', { method: 'POST', body: payload })
    showcases.value.unshift(created)
    loaded.value = true
    return created
  }

  async function updateShowcase(id: string, payload: Partial<{ title: string; description: string | null; property_ids: string[]; is_published: boolean }>) {
    const updated = await apiFetch<Showcase>(`/collections/${id}`, { method: 'PATCH', body: payload })
    const index = showcases.value.findIndex((showcase) => showcase.id === id)
    if (index >= 0) showcases.value[index] = { ...showcases.value[index], ...updated }
    return updated
  }

  async function deleteShowcase(id: string) {
    await apiFetch(`/collections/${id}`, { method: 'DELETE' })
    showcases.value = showcases.value.filter((showcase) => showcase.id !== id)
  }

  function resetShowcases() {
    showcases.value = []
    loaded.value = false
  }

  return { showcases, pending, fetchShowcases, fetchShowcase, createShowcase, updateShowcase, deleteShowcase, resetShowcases }
}
