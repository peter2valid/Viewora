// Quote PDF download. The catch-all /api proxy parses JSON, so the PDF gets
// its own pass-through that keeps the bytes and the download headers.
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token') ?? ''
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const config = useRuntimeConfig()
  const target = ((config.apiBaseUrl as string) || (config.public.apiBaseUrl as string) || '').replace(/\/$/, '')
  if (!target) throw createError({ statusCode: 500, statusMessage: 'API base URL not configured.' })

  const headers: Record<string, string> = {}
  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip')
  if (ip) headers['x-forwarded-for'] = ip.split(',')[0].trim()   // backend rate limit is per client IP

  const res = await $fetch.raw(`${target}/quote/view/${token}/pdf`, { headers, responseType: 'arrayBuffer', ignoreResponseError: true })
  if (res.status !== 200) {
    let data: any = {}
    try { data = JSON.parse(new TextDecoder().decode(res._data as ArrayBuffer)) } catch { /* not JSON: use the default message */ }
    throw createError({ statusCode: res.status, statusMessage: data?.statusMessage ?? 'This quote is not available as a PDF.' })
  }
  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': res.headers.get('content-disposition') ?? 'attachment; filename="Viewora-quote.pdf"',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
  })
  return Buffer.from(res._data as ArrayBuffer)
})
