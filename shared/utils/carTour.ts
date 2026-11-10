// One car = one tour: exterior spins, interior 360s and named detail photos, in one list.
// Built from the public tour payload so the listing page and the embed show the same thing.
import { indexNearestAngle, sortByAngle, type VehicleSpinSet, type VehicleView } from './vehicleViews'

export type CarGroup = 'exterior' | 'interior' | 'details'
export const CAR_GROUP_LABELS: Record<CarGroup, string> = { exterior: 'Exterior', interior: 'Interior', details: 'Close-ups' }

export interface CarTourItem {
  id: string
  kind: 'spin' | 'pano' | 'photo'
  group: CarGroup
  title: string
  thumb: string
  spin?: VehicleSpinSet
  sceneId?: string
  url?: string
}

/** The car's spins from the payload; older payloads only have one flat list of photos. */
export function spinsFromTour(tour: any): VehicleSpinSet[] {
  const sets: any[] = Array.isArray(tour?.vehicle_spins) ? tour.vehicle_spins : []
  if (sets.length) {
    return sets
      .filter(s => Array.isArray(s?.views) && s.views.length > 0)
      .map(s => ({
        id: String(s.id), title: s.title || 'Exterior', start_angle: Number(s.start_angle) || 0, views: s.views as VehicleView[],
        elevation: Number(s.elevation) || 0,
        // Camera heights of this spin (same car, camera higher or lower).
        rows: (Array.isArray(s.rows) ? s.rows : [])
          .filter((r: any) => r?.id && Array.isArray(r.views) && r.views.length > 0)
          .map((r: any) => ({ id: String(r.id), title: r.title || '', elevation: Number(r.elevation) || 0, start_angle: Number(r.start_angle) || 0, views: r.views as VehicleView[] })),
      }))
  }
  const flat: VehicleView[] = Array.isArray(tour?.vehicle_views) ? tour.vehicle_views : []
  return flat.length ? [{ id: 'exterior', title: 'Exterior', start_angle: 0, views: flat }] : []
}

/**
 * Every view of the car, in tour order: spins (Exterior), 360 scenes (Interior), then gallery
 * photos (Details). `thumb` turns a full-size image URL into a small one.
 */
export function buildCarTourItems(tour: any, thumb: (url: string) => string = u => u): CarTourItem[] {
  const out: CarTourItem[] = []
  for (const s of spinsFromTour(tour)) {
    const sorted = sortByAngle(s.views)
    const first = sorted[indexNearestAngle(sorted, s.start_angle)]
    out.push({ id: `spin:${s.id}`, kind: 'spin', group: 'exterior', title: s.title, thumb: thumb(first?.image_url ?? ''), spin: s })
  }
  const scenes: any[] = (Array.isArray(tour?.scenes) ? tour.scenes : [])
    .filter((s: any) => s?.id && s.thumbnail_url)
    .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
  scenes.forEach((s, i) => {
    out.push({
      id: `pano:${s.id}`, kind: 'pano', group: 'interior',
      title: s.name || (scenes.length > 1 ? `Interior ${i + 1}` : 'Interior'),
      thumb: s.thumbnail_url, sceneId: s.id,
    })
  })
  const gallery: any[] = Array.isArray(tour?.gallery) ? tour.gallery : []
  gallery.filter(g => g?.id && g.url).forEach((g, i) => {
    out.push({
      id: `photo:${g.id}`, kind: 'photo', group: 'details',
      title: (typeof g.caption === 'string' && g.caption.trim()) || `Detail ${i + 1}`,
      thumb: thumb(g.url), url: g.url,
    })
  })
  return out
}

/** "2021 Porsche 911 Carrera Cabriolet" from the car's details; '' when none are filled. */
export function vehicleName(space: any): string {
  if (!space) return ''
  const model = [space.vehicle_make, space.vehicle_model].filter(Boolean).join(' ')
  if (!model) return ''
  return [space.vehicle_year, model, space.vehicle_trim].filter(Boolean).join(' ')
}
