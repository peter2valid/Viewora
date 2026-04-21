import type { TourData } from '~/shared/types'

// Thin wrapper around useApiFetch for the public tour endpoint.
// Intentionally not a composable — callers pass apiFetch in to avoid reactivity coupling.
export async function fetchTour(
  apiFetch: (url: string) => Promise<unknown>,
  slug: string
): Promise<TourData> {
  const result = await apiFetch(`/p/${encodeURIComponent(slug)}`)
  const payload = result as { tour?: TourData } | TourData
  const tourData = (payload as { tour?: TourData }).tour ?? (payload as TourData)
  if (!tourData?.space) throw new Error('Invalid tour response')
  return tourData
}
