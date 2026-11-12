// Link previews for chat apps and social sites.
//
// WhatsApp, Facebook, X, Telegram and friends fetch a shared link to read its og: tags, and give up
// after a few seconds. A full tour page waits on the tour API (2-11 s on a cold start), so previews
// came out blank. Their crawlers get this instead: a tiny page with only the tags, built from the
// API's cached preview details (GET /p/:slug/share). People and search engines get the full page.
// Pure functions here (tested); the request handling is in server/middleware/share-preview.ts.

export interface ShareMeta {
  slug: string
  title: string
  vehicle: string | null
  description: string | null
  image: { url: string; width: number; height: number } | null
  white_label: boolean
  space_type: string | null
}

/** Link-preview crawlers. Search engines are left out on purpose: they index the full page. */
const PREVIEW_BOTS = /facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|skypeuripreview|pinterest|redditbot|embedly|iframely|vkshare|viber|snapchat|mastodon|bluesky|bitlybot|tumblr|outbrain|google-pagerenderer/i

export function isPreviewBot(ua: string | undefined | null): boolean {
  return !!ua && PREVIEW_BOTS.test(ua)
}

export type ShareRoute = 'spin' | 'embed' | 'p' | 'view'

/** Which share page a path is, and its slug; null for anything else. */
export function shareRoute(path: string): { kind: ShareRoute; slug: string } | null {
  const m = path.split('?')[0].match(/^\/(spin|embed|p|view\/p)\/([a-z0-9-]{3,120})\/?$/)
  if (!m) return null
  return { kind: m[1] === 'view/p' ? 'view' : (m[1] as ShareRoute), slug: m[2] }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The preview page: og/twitter tags only, plus a plain link for anyone who lands on it. */
export function previewHtml(meta: ShareMeta, kind: ShareRoute, path: string, appUrl: string): string {
  const base = appUrl.replace(/\/+$/, '')
  const name = (kind === 'spin' && meta.vehicle) || meta.title
  const title = meta.white_label ? name : `${name} — Viewora`
  const description = kind === 'spin'
    ? (meta.description || 'Turn the car all the way round, inside and out.')
    : (meta.description || (meta.white_label ? 'Explore it in 360°.' : 'Explore it in 360° on Viewora.'))
  const url = `${base}${path.split('?')[0].replace(/\/$/, '')}`
  const img = meta.image
  const tags: Array<[string, string, string]> = [
    ['property', 'og:type', 'website'],
    ['property', 'og:url', url],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['name', 'twitter:card', img ? 'summary_large_image' : 'summary'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
  ]
  if (!meta.white_label) tags.push(['property', 'og:site_name', 'Viewora'])
  if (img) {
    tags.push(['property', 'og:image', img.url], ['property', 'og:image:secure_url', img.url], ['name', 'twitter:image', img.url], ['property', 'og:image:alt', name])
    if (img.width > 0 && img.height > 0) {
      tags.push(['property', 'og:image:type', 'image/jpeg'], ['property', 'og:image:width', String(img.width)], ['property', 'og:image:height', String(img.height)])
    }
  }
  const metaTags = tags.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${esc(value)}">`).join('\n')
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
${metaTags}
</head><body><a href="${esc(url)}">${esc(title)}</a></body></html>`
}
