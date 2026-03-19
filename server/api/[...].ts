export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const target = config.public.apiBaseUrl as string

  // If no external API base URL is set, we can't proxy.
  if (!target) {
    throw createError({
      statusCode: 500,
      statusMessage: 'API Base URL not configured'
    })
  }

  // Get the path without the /api prefix
  const path = event.path.replace(/^\/api/, '')
  const method = event.method
  const headers = getHeaders(event)
  const body = method !== 'GET' && method !== 'HEAD' ? await readBody(event).catch(() => undefined) : undefined

  try {
    return await $fetch(`${target.replace(/\/$/, '')}${path}`, {
      method,
      headers: {
        ...headers,
        host: new URL(target).host,
      },
      body
    })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.response?._data?.error?.message || error.message,
      data: error.response?._data
    })
  }
})
