// Floor tabs for the public viewer's scene dock. On a tour with floor plans
// the dock shows one floor's scenes at a time; scenes that aren't placed on
// any plan share an "Other" tab. Fewer than two tabs means there's nothing to
// switch between, so the dock stays exactly as it was (no tabs, every scene).

import type { FloorMapFloor } from './viewerAdapters/floorPlanMap'

export const OTHER_FLOOR_ID = '__other'

export interface DockFloor { id: string; name: string; sceneIds: string[] }

/**
 * `floors` = buildFloorMapFloors() output (floor order, placed scenes only);
 * `sceneIds` = every tour scene in tour order — each tab keeps that order.
 */
export function buildDockFloors(floors: FloorMapFloor[], sceneIds: string[]): DockFloor[] {
  const floorOf = new Map<string, string>()
  for (const f of floors) for (const p of f.pins) if (!floorOf.has(p.sceneId)) floorOf.set(p.sceneId, f.id)

  const tabs: DockFloor[] = floors
    .map(f => ({ id: f.id, name: f.name, sceneIds: sceneIds.filter(id => floorOf.get(id) === f.id) }))
    .filter(t => t.sceneIds.length > 0)
  const other = sceneIds.filter(id => !floorOf.has(id))
  if (other.length) tabs.push({ id: OTHER_FLOOR_ID, name: 'Other', sceneIds: other })

  return tabs.length >= 2 ? tabs : []
}

/** The tab a scene belongs to, or null when there are no tabs. */
export function dockFloorOf(tabs: DockFloor[], sceneId: string): string | null {
  return tabs.find(t => t.sceneIds.includes(sceneId))?.id ?? null
}

// ── Showroom | Interiors ─────────────────────────────────────────────────────
// A showroom with "See interior" badges on 20+ cars would bury the walkthrough
// under 40+ seat views. The dock splits them: the walkthrough (as floor tabs
// when there are floor plans, else one "Showroom" tab) and an "Interiors" tab.

export const SHOWROOM_TAB_ID = '__showroom'
export const INTERIORS_TAB_ID = '__interiors'

/** `tabs` = buildDockFloors() output; `sceneIds` = every scene in tour order. */
export function withInteriorsTab(tabs: DockFloor[], sceneIds: string[], isInterior: (id: string) => boolean): DockFloor[] {
  const interiors = sceneIds.filter(isInterior)
  const outside = sceneIds.filter(id => !isInterior(id))
  if (!interiors.length || !outside.length) return tabs
  const walk = tabs
    .map(t => ({ ...t, sceneIds: t.sceneIds.filter(id => !isInterior(id)) }))
    .filter(t => t.sceneIds.length > 0)
  return [
    ...(walk.length ? walk : [{ id: SHOWROOM_TAB_ID, name: 'Showroom', sceneIds: outside }]),
    { id: INTERIORS_TAB_ID, name: 'Interiors', sceneIds: interiors },
  ]
}
