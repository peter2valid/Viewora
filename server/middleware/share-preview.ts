// Link-preview crawlers get the og: tags in milliseconds (see server/utils/sharePreview.ts).
// Anything that goes wrong falls through to the normal page, which carries the same tags.
import { isPreviewBot, previewHtml, shareRoute, type ShareMeta } from '../utils/sharePreview'

const TIMEOUT_MS = 3000

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  const route = shareRoute(event.path)
  if (!route || !isPreviewBot(getRequestHeader(event, 'user-agent'))) return

  const config = useRuntimeConfig()
  const api = String(config.apiBaseUrl || config.public.apiBaseUrl || '').replace(/\/$/, '')
  if (!api) return
  try {
    const res = await $fetch<any>(`${api}/p/${route.slug}/share`, { timeout: TIMEOUT_MS })
    const meta: ShareMeta | undefined = res?.data ?? res
    if (!meta?.title) return
    const appUrl = String(config.public.appUrl || 'https://app.viewora.software')
    setResponseHeaders(event, {
      'Content-Type': 'text/html; charset=utf-8',
      // Never cached at the edge: the same address serves people the full page.
      'Cache-Control': 'private, no-store',
    })
    return previewHtml(meta, route.kind, event.path, appUrl)
  } catch {
    // Slow or failing API: let the full page answer.
  }
})
