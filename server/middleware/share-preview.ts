// Fallback for link-preview crawlers that reach the function directly (local dev, or a bot the
// vercel.json rewrite missed). The fast path is vercel.json → /share-preview/..., cached at the edge.
// Anything that goes wrong falls through to the normal page, which carries the same tags.
import { isPreviewBot, shareRoute } from '../utils/sharePreview'
import { sharePreviewFor } from '../utils/shareMeta'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  if (!shareRoute(event.path) || !isPreviewBot(getRequestHeader(event, 'user-agent'))) return
  const html = await sharePreviewFor(event, event.path)
  if (!html) return
  setResponseHeaders(event, {
    'Content-Type': 'text/html; charset=utf-8',
    // Never cached at the edge: the same address serves people the full page.
    'Cache-Control': 'private, no-store',
  })
  return html
})
