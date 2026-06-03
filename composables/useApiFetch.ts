/**
 * composables/useApiFetch.ts
 *
 * Wraps $fetch with the Supabase JWT Authorization header.
 * When NUXT_PUBLIC_API_BASE_URL is set (pointing to the Railway Fastify backend),
 * all API calls go there. Otherwise falls back to same-origin Nitro routes (/api/*).
 *
 * On 401: refreshes the Supabase session once and retries. If the refresh also
 * fails the error is rethrown so callers / auth middleware can redirect to login.
 */
import { errorLogger } from '~/utils/errorLogger'

export const useApiFetch = () => {
  const session = useSupabaseSession()
  const supabase = useSupabaseClient()
  const config = useRuntimeConfig()

  // On the server (SSR), prefer the private server-only config which has the full
  // backend URL even when the public env var is not set. This prevents SSR data
  // fetches from resolving to a relative /api/... URL that doesn't exist on Vercel.
  const baseURL = (
    (import.meta.server ? (config as any).apiBaseUrl : null) ||
    (config.public.apiBaseUrl as string) ||
    ''
  )

  function buildUrl(url: string) {
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`
    return {
      normalizedUrl,
      fullUrl: baseURL
        ? `${baseURL.replace(/\/$/, '')}${normalizedUrl}`
        : `/api${normalizedUrl}`,
    }
  }

  function buildHeaders(token: string | undefined, extra?: HeadersInit) {
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extra ?? {}),
    }
  }

  function attachResponseHandlers(
    opts: Parameters<typeof $fetch>[1],
    normalizedUrl: string,
    method: string,
    fullUrl: string,
  ): Parameters<typeof $fetch>[1] {
    return {
      ...opts,
      onResponse({ response }) {
        if (response?._data && typeof response._data === 'object') {
          const payload = response._data as any
          if (payload.success === true && payload.data !== undefined) {
            response._data = payload.data
          }
        }
      },
      onResponseError({ response }) {
        if (response._data?.error?.message) {
          response._data.statusMessage = response._data.error.message
        }
        if (response._data?.message && !response._data?.statusMessage) {
          response._data.statusMessage = response._data.message
        }
        if (response.status !== 401) {
          errorLogger.logApiError(
            response._data?.statusMessage || response.statusText || 'Unknown API error',
            normalizedUrl,
            method,
            response.status,
            { component: 'API', metadata: { response: response._data, fullUrl } },
          )
        }
      },
    }
  }

  async function apiFetch<T = unknown>(
    url: string,
    options: Parameters<typeof $fetch>[1] = {},
  ): Promise<T> {
    const { normalizedUrl, fullUrl } = buildUrl(url)
    const method = (options.method as string) || 'GET'
    const opts = attachResponseHandlers(options, normalizedUrl, method, fullUrl)

    try {
      return await $fetch<T>(fullUrl, {
        ...opts,
        headers: buildHeaders(session.value?.access_token, options.headers as HeadersInit),
      })
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status
      if (status === 401) {
        // Token expired — ask Supabase to refresh, then retry once.
        // The Supabase JS client deduplicates concurrent refresh calls,
        // so multiple simultaneous 401s don't hammer the auth server.
        try {
          const { data, error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError && data.session) {
            session.value = data.session
            return await $fetch<T>(fullUrl, {
              ...opts,
              headers: buildHeaders(data.session.access_token, options.headers as HeadersInit),
            })
          }
        } catch {
          // refresh itself failed — fall through and rethrow original error
        }
      }

      errorLogger.logApiError(error, normalizedUrl, method, status, {
        component: 'API',
        metadata: { errorType: status === 401 ? 'auth_expired' : 'network_error', fullUrl },
      })
      throw error
    }
  }

  return { apiFetch }
}
