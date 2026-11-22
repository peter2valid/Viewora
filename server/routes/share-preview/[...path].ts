// Link previews, served from Vercel's edge cache.
//
// vercel.json rewrites crawler requests for /p/:slug, /spin/:slug, /embed/:slug and /view/p/:slug
// here. Because this address only ever serves the small tags page, the edge can cache it: WhatsApp
// gets it from the nearest edge (Cape Town for Kenya) in tens of milliseconds, with no function
// start and no API call. Stale copies are served at once while a fresh one is built behind them.
import { sharePreviewFor } from '../../utils/shareMeta'

export default defineEventHandler(async (event) => {
  const path = `/${getRouterParam(event, 'path') || ''}`
  const html = await sharePreviewFor(event, path)
  if (html) {
    setResponseHeaders(event, {
      'Content-Type': 'text/html; charset=utf-8',
      // Fresh for 10 min at the edge, then served stale (instantly) for up to a week while it refreshes.
      'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=604800',
      'X-Robots-Tag': 'noindex',
    })
    return html
  }
  // API slow or no such tour: answer with the full page, uncached, like before.
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const res = await useNitroApp().localFetch(path, { headers: { 'user-agent': 'Mozilla/5.0 (viewora share fallback)' } })
  setResponseStatus(event, res.status)
  setResponseHeader(event, 'Content-Type', res.headers.get('content-type') || 'text/html; charset=utf-8')
  return await res.text()
})
