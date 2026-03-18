/**
 * composables/useApiFetch.ts
 *
 * Thin wrapper around $fetch that automatically attaches the Supabase JWT as
 * an Authorization header. All API calls go to same-origin Nitro routes (/api/*).
 */
export const useApiFetch = () => {
  const session = useSupabaseSession()

  function apiFetch<T = unknown>(
    url: string,
    options: Parameters<typeof $fetch>[1] = {},
  ): Promise<T> {
    const token = session.value?.access_token

    // Ensure URL starts with /
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`

    return $fetch<T>(normalizedUrl, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    })
  }

  return { apiFetch }
}
