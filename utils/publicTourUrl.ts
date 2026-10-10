// A listing's public link. Always on app.viewora.software and always
// /p/<slug>, so every share button, the dashboard, the publish redirect and
// QR codes hand out one predictable address.
//
// (It used to send photo-only listings — and, from the Details tab, any
// listing with gallery photos — to view.viewora.software, a domain that was
// never wired up in DNS, so those links were dead.)
//
// /p/<slug> works for every kind of listing: 360 tours and aerial plot maps
// render there directly, and photo-only listings are forwarded by that page to
// the gallery listing page (/view/p/<slug>) on the same domain.
export const PUBLIC_APP_ORIGIN = 'https://app.viewora.software'

export function resolvePublicTourUrl(
  space: { slug?: string | null; id: string },
  // Kept for call-site compatibility; the destination no longer depends on it.
  _context?: 'tour' | 'details',
): string {
  return `${PUBLIC_APP_ORIGIN}/p/${space.slug || space.id}`
}
