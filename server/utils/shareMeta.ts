// Loads a share page's preview details from the API and builds the crawler page (see sharePreview.ts).
// Used by the edge-cached route (server/routes/share-preview) and the in-function fallback middleware.
import type { H3Event } from 'h3'
import { previewHtml, shareRoute, type ShareMeta } from './sharePreview'

const TIMEOUT_MS = 3000

/** The crawler page for a share path, or null when the API is slow, failing or has no such tour. */
export async function sharePreviewFor(event: H3Event, path: string): Promise<string | null> {
  const route = shareRoute(path)
  if (!route) return null
  const config = useRuntimeConfig(event)
  const api = String(config.apiBaseUrl || config.public.apiBaseUrl || '').replace(/\/$/, '')
  if (!api) return null
  try {
    const res = await $fetch<any>(`${api}/p/${route.slug}/share`, { timeout: TIMEOUT_MS })
    const meta: ShareMeta | undefined = res?.data ?? res
    if (!meta?.title) return null
    const appUrl = String(config.public.appUrl || 'https://app.viewora.software')
    return previewHtml(meta, route.kind, path, appUrl)
  } catch {
    return null
  }
}
