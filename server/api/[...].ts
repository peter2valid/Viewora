export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const target = (config.apiBaseUrl as string) || (config.public.apiBaseUrl as string)

  // If no external API base URL is set, we can't proxy.
  if (!target) {
    throw createError({
      statusCode: 500,
      statusMessage: 'API base URL not configured. Set NUXT_API_BASE_URL or NUXT_PUBLIC_API_BASE_URL.'
    })
  }

  // Get the path without the /api prefix
  const path = event.path.replace(/^\/api/, '')
  const method = event.method
  const headers = getHeaders(event)
  const body = method !== 'GET' && method !== 'HEAD' ? await readBody(event).catch(() => undefined) : undefined

  const forwardedHeaders: Record<string, string> = {}
  const allowList = ['authorization', 'content-type', 'accept', 'x-request-id']
  for (const key of allowList) {
    const value = headers[key]
    if (typeof value === 'string' && value.length > 0) {
      forwardedHeaders[key] = value
    }
  }

  // Forward real client IP so backend rate limiting works correctly.
  // Vercel sets x-forwarded-for; fall back to x-real-ip.
  const clientIp = headers['x-forwarded-for'] || headers['x-real-ip']
  if (typeof clientIp === 'string' && clientIp.length > 0) {
    // x-forwarded-for can be a comma-separated list; take the first (original client)
    forwardedHeaders['x-forwarded-for'] = clientIp.split(',')[0].trim()
  }

  try {
    return await $fetch(`${target.replace(/\/$/, '')}${path}`, {
      method,
      headers: forwardedHeaders,
      body
    })
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.response?._data?.statusMessage || error.response?._data?.message || error.response?._data?.error?.message || error.message,
      data: error.response?._data
    })
  }
})
