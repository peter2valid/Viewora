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
