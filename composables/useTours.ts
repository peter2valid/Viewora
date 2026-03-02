/**
 * composables/useTours.ts  (Cloudflare D1 backed — no Supabase DB calls)
 *
 * In the new architecture a "tour" = a "space".
 * This composable is kept for backward compatibility with pages/tours/[id].vue.
 * It delegates to the same /api/spaces/* endpoints as useSpaces.
 */
import type { Space } from './useSpaces'

// Re-export Space as Tour for pages that import from here
export type Tour = Space

export const useTours = () => {
  const { apiFetch } = useApiFetch()

  const tours = ref<Tour[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function fetchTours(spaceId?: string) {
    pending.value = true
    error.value = null
    try {
      // If called with a spaceId it returns tours linked to that space
      // In the new schema a space IS the tour, so we return the single space
      if (spaceId) {
        const space = await apiFetch<Tour>(`/api/spaces/${spaceId}`)
        tours.value = [space]
      } else {
        tours.value = await apiFetch<Tour[]>('/api/spaces')
      }
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
    } finally {
      pending.value = false
    }
  }

  async function fetchTour(tourId: string): Promise<Tour> {
    return apiFetch<Tour>(`/api/spaces/${tourId}`)
  }

  async function createTour(input: { title: string; property_id?: string }): Promise<Tour> {
    const data = await apiFetch<Tour>('/api/spaces', {
      method: 'POST',
      body: { title: input.title },
    })
    tours.value.unshift(data)
    return data
  }

  async function updateTourStatus(tourId: string, status: 'draft' | 'published') {
    await apiFetch(`/api/spaces/${tourId}/publish`, {
      method: 'POST',
      body: { publish: status === 'published' },
    })
    const t = tours.value.find(t => t.id === tourId)
    if (t) t.is_published = status === 'published'
  }

  async function updateTourTitle(tourId: string, title: string) {
    await apiFetch(`/api/spaces/${tourId}`, {
      method: 'PATCH',
      body: { title },
    })
  }

  return {
    tours,
    pending,
    error,
    fetchTours,
    fetchTour,
    createTour,
    updateTourStatus,
    updateTourTitle,
  }
}
