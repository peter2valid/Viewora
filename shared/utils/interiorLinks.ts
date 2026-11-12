// "See interior" badges: a scene link with linkStyle 'interior' leads inside an
// object, e.g. a car in a showroom. The viewer draws it as a badge on the car
// (not a floor arrow) and, while the visitor is inside, offers one tap back out.

import type { Hotspot } from '~/domain/hotspot'

type LinkLike = Pick<Hotspot, 'type' | 'linkStyle' | 'targetSceneId'> & { yaw?: number }

export function isInteriorLink(h: Pick<Hotspot, 'type' | 'linkStyle'> | null | undefined): boolean {
  return !!h && h.type === 'scene_link' && h.linkStyle === 'interior'
}

export type InteriorHome = {
  /** The scene with the badge (the showroom spot next to the car). */
  homeSceneId: string
  /** Where the badge sits in that scene, to face the car on the way back. */
  badgeYaw: number
}

/**
 * Which scenes are inside a car, and where each one's way out leads.
 *
 * Inside: the target of an interior badge, plus scenes it reaches with ordinary
 * arrows (front seat ⇄ rear seat). Outside: every scene reachable by ordinary
 * arrows from a scene that has a badge (the showroom floor). Outside wins, so
 * an arrow from the car back to the showroom doesn't pull the showroom inside,
 * and a car linked from the floor with a plain arrow too is never "inside".
 */
export function interiorScenes(hotspotsByScene: Record<string, LinkLike[]>): Record<string, InteriorHome> {
  const walkLinks = (id: string) =>
    (hotspotsByScene[id] ?? [])
      .filter(h => h.type === 'scene_link' && h.targetSceneId && !isInteriorLink(h))
      .map(h => h.targetSceneId!)

  const badges: Array<{ from: string; to: string; yaw: number }> = []
  for (const [from, list] of Object.entries(hotspotsByScene)) {
    for (const h of list ?? []) {
      if (isInteriorLink(h) && h.targetSceneId && h.targetSceneId !== from) {
        badges.push({ from, to: h.targetSceneId, yaw: Number(h.yaw) || 0 })
      }
    }
  }
  if (!badges.length) return {}

  const outside = new Set<string>()
  const queue = [...new Set(badges.map(b => b.from))]
  while (queue.length) {
    const id = queue.pop()!
    if (outside.has(id)) continue
    outside.add(id)
    for (const next of walkLinks(id)) if (!outside.has(next)) queue.push(next)
  }

  const result: Record<string, InteriorHome> = {}
  for (const b of badges) {
    if (outside.has(b.to) || result[b.to]) continue
    const home: InteriorHome = { homeSceneId: b.from, badgeYaw: b.yaw }
    const stack = [b.to]
    while (stack.length) {
      const id = stack.pop()!
      if (outside.has(id) || result[id]) continue
      result[id] = home
      for (const next of walkLinks(id)) stack.push(next)
    }
  }
  return result
}
