// "See interior" badges: a scene link with linkStyle 'interior' leads inside an
// object, e.g. a car in a showroom. The viewer draws it as a badge on the car
// (not a floor arrow) and, while the visitor is inside, offers one tap back out.

import type { Hotspot } from '~/domain/hotspot'

type LinkLike = Pick<Hotspot, 'type' | 'linkStyle' | 'targetSceneId'> & { yaw?: number; label?: string }

export function isInteriorLink(h: Pick<Hotspot, 'type' | 'linkStyle'> | null | undefined): boolean {
  return !!h && h.type === 'scene_link' && h.linkStyle === 'interior'
}

export type InteriorHome = {
  /** The scene with the badge (the showroom spot next to the car). */
  homeSceneId: string
  /** Where the badge sits in that scene, to face the car on the way back. */
  badgeYaw: number
  /** The scene the badge opens (the car's first interior view). */
  entrySceneId: string
  /** The badge's text, e.g. "See interior · Land Cruiser 300". */
  badgeLabel: string
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

  const badges: Array<{ from: string; to: string; yaw: number; label: string }> = []
  for (const [from, list] of Object.entries(hotspotsByScene)) {
    for (const h of list ?? []) {
      if (isInteriorLink(h) && h.targetSceneId && h.targetSceneId !== from) {
        badges.push({ from, to: h.targetSceneId, yaw: Number(h.yaw) || 0, label: h.label ?? '' })
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
    const home: InteriorHome = { homeSceneId: b.from, badgeYaw: b.yaw, entrySceneId: b.to, badgeLabel: b.label }
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

/** "See interior · Land Cruiser 300" → "Land Cruiser 300"; nothing left → "". */
export function carNameFromBadge(label: string | null | undefined): string {
  return (label ?? '')
    .replace(/^\s*(see|view|open)?\s*(the\s+)?interior\b\s*/i, '')
    .replace(/^[\s·:|\-–—]+/, '')
    .trim()
}

/**
 * Dock folder name per interior scene: one folder per car, named from its
 * badge, else from the car's first interior scene. Two cars with the same
 * name get "(2)", "(3)"… so their seats never land in one folder.
 */
export function interiorFolders(
  homes: Record<string, InteriorHome>,
  sceneName: (id: string) => string,
): Record<string, string> {
  const nameOfEntry = new Map<string, string>()
  const used = new Map<string, number>()
  const out: Record<string, string> = {}
  for (const [sceneId, home] of Object.entries(homes)) {
    let name = nameOfEntry.get(home.entrySceneId)
    if (!name) {
      const base = carNameFromBadge(home.badgeLabel) || sceneName(home.entrySceneId) || 'Car'
      const n = (used.get(base) ?? 0) + 1
      used.set(base, n)
      name = n === 1 ? base : `${base} (${n})`
      nameOfEntry.set(home.entrySceneId, name)
    }
    out[sceneId] = name
  }
  return out
}

type FolderScene = { id: string; name?: string | null; group_name?: string | null }

/**
 * The folder every scene shows under, in the editor and the viewer alike.
 *
 * A car is its own folder, whatever it's called: two cars named "Toyota RAV4"
 * show as "Toyota RAV4" and "Toyota RAV4 (2)", never as one folder of both.
 * A car's name is the category set on its views (the first one, in tour
 * order), else its badge's car name, else its first interior scene's name.
 * Cars claim names first, in tour order; other scenes keep their hand-set
 * category, numbered only if a car already holds that name.
 * `scenes` must be in tour order. null = no folder.
 */
export function sceneFolders(scenes: FolderScene[], homes: Record<string, InteriorHome>): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  const used = new Set<string>()
  const claim = (base: string) => {
    let name = base
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} (${n})`
    used.add(name.toLowerCase())
    return name
  }
  const set = (s: FolderScene | undefined) => (s?.group_name ?? '').trim()
  const byId = new Map(scenes.map(s => [s.id, s]))

  const cars = new Map<string, string[]>()
  for (const s of scenes) {
    const entry = homes[s.id]?.entrySceneId
    if (!entry) continue
    const ids = cars.get(entry)
    if (ids) ids.push(s.id)
    else cars.set(entry, [s.id])
  }
  for (const [entry, ids] of cars) {
    const base = ids.map(id => set(byId.get(id))).find(Boolean)
      || carNameFromBadge(homes[ids[0]]?.badgeLabel)
      || (byId.get(entry)?.name ?? '').trim()
      || 'Car'
    const name = claim(base)
    for (const id of ids) out[id] = name
  }

  const shown = new Map<string, string>()
  for (const s of scenes) {
    if (homes[s.id]) continue
    const g = set(s)
    if (!g) { out[s.id] = null; continue }
    let name = shown.get(g)
    if (!name) { name = used.has(g.toLowerCase()) ? claim(g) : g; shown.set(g, name) }
    out[s.id] = name
  }
  return out
}
