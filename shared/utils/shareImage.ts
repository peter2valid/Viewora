// The picture a shared link shows (WhatsApp, Facebook, X, LinkedIn…).
//
// The API returns tour.share_image: a 1200×630 JPEG made once per listing and
// cached on the media CDN, so crawlers get it instantly. Until it exists (the
// first render of a new listing) pages fall back to the listing's own photos;
// for a car that is the front exterior frame, the same one the API uses.

export type ShareImage = { url: string; width?: number; height?: number }

const isHttp = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\//.test(u)

/** A car's exterior frame nearest the spin's start angle (what the spin opens on). */
export function carFrontFrame(tour: any): string | null {
  const spin = tour?.vehicle_spins?.[0]
  const views: any[] = spin?.views ?? tour?.vehicle_views ?? []
  if (!views.length) return null
  const start = Number(spin?.start_angle ?? 0)
  const gap = (a: number) => { const d = Math.abs(((a - start) % 360 + 360) % 360); return Math.min(d, 360 - d) }
  const front = [...views].sort((a, b) => gap(Number(a.angle ?? 0)) - gap(Number(b.angle ?? 0)))[0]
  return isHttp(front?.image_url) ? front.image_url : null
}

/** The ready-made 1200×630 preview, when the API has one. */
export function readyShareImage(tour: any): ShareImage | null {
  const s = tour?.share_image
  return s && isHttp(s.url) ? { url: s.url, width: s.width ?? 1200, height: s.height ?? 630 } : null
}

/** Best picture to share a listing with: the ready preview, else a raw photo (size unknown). */
export function tourShareImage(tour: any): ShareImage | null {
  const ready = readyShareImage(tour)
  if (ready) return ready
  const raw = [carFrontFrame(tour), tour?.space?.cover_image_url, tour?.scenes?.[0]?.thumbnail_url, tour?.gallery?.[0]?.url].find(isHttp)
  return raw ? { url: raw } : null
}
