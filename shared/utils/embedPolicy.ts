// Partner tours may only be embedded on the partner's own sites. The backend
// says which (GET /embed-policy/:slug); this turns that into a CSP
// frame-ancestors rule added to the embed page's existing CSP header.

const ORIGIN_RE = /^https:\/\/[a-z0-9.-]+(:\d{2,5})?$|^http:\/\/localhost(:\d{2,5})?$/i

/** Only well-formed origins survive, so nothing can be injected into the header. */
export function cleanOrigins(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  return [...new Set(list.filter((o): o is string => typeof o === 'string' && ORIGIN_RE.test(o.trim())).map(o => o.trim()))]
}

/**
 * Returns the CSP with a frame-ancestors rule for these origins, or the CSP
 * unchanged when there is no restriction. Viewora itself ('self' and the app
 * origin) can always frame its own embeds.
 */
export function withFrameAncestors(csp: string, origins: string[], appOrigin: string): string {
  if (!origins.length) return csp
  const kept = csp.split(';').map(d => d.trim()).filter(d => d && !/^frame-ancestors\b/i.test(d))
  const app = cleanOrigins([appOrigin])
  kept.push(['frame-ancestors', "'self'", ...app, ...origins].join(' '))
  return kept.join('; ')
}
