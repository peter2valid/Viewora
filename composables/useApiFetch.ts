/**
 * composables/useApiFetch.ts
 *
 * Wraps $fetch with the Supabase JWT Authorization header.
 * When NUXT_PUBLIC_API_BASE_URL is set (pointing to the Railway Fastify backend),
 * all API calls go there. Otherwise falls back to same-origin Nitro routes (/api/*).
 */
export const useApiFetch = () => {
  const session = useSupabaseSession()
  const config = useRuntimeConfig()

  // Empty string = same-origin Nitro routes. Set NUXT_PUBLIC_API_BASE_URL for external backend.
  const baseURL = (config.public.apiBaseUrl as string) || ''

  function apiFetch<T = unknown>(
    url: string,
    options: Parameters<typeof $fetch>[1] = {},
  ): Promise<T> {
    const token = session.value?.access_token

    const normalizedUrl = url.startsWith('/') ? url : `/${url}`
    const fullUrl = baseURL ? `${baseURL.replace(/\/$/, '')}${normalizedUrl}` : normalizedUrl

    return $fetch<T>(fullUrl, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
      onResponseError({ response }) {
        // Map Fastify backend { error: { message } } standard natively into Nuxt's expectations
        if (response._data?.error?.message) {
          response._data.statusMessage = response._data.error.message;
        }
      }
    })
  }

  return { apiFetch }
}
