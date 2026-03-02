/**
 * composables/useApiFetch.ts
 *
 * Thin wrapper around $fetch that automatically attaches the Supabase JWT as
 * an Authorization header.  All composables use this instead of raw $fetch so
 * server routes can verify the caller's identity via requireUser().
 */
export const useApiFetch = () => {
  const session = useSupabaseSession()

  function apiFetch<T = unknown>(
    url: string,
    options: Parameters<typeof $fetch>[1] = {},
  ): Promise<T> {
    const token = session.value?.access_token
    return $fetch<T>(url, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    })
  }

  return { apiFetch }
}
