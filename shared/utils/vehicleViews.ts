// Single-vehicle exterior: normal photos taken around the car, stepped through
// as the visitor drags. See viewora-backend migration-vehicle-views.sql.

export interface VehicleView {
  id: string
  image_url: string
  label: string | null
  /** Degrees around the car: 0 front, 90 right side, 180 rear, 270 left side. */
  angle: number
  width?: number | null
  height?: number | null
  order_index?: number
  media_id?: string | null
}

export interface VehicleSlot {
  key: string
  angle: number
  label: string
  hint: string
}

export const VEHICLE_MAX_VIEWS = 36
export const VEHICLE_VIEW_MAX_BYTES = 25 * 1024 * 1024
export const VEHICLE_VIEW_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** The eight shots a phone shoot realistically gives, in walk-around order. */
export const VEHICLE_SLOTS: VehicleSlot[] = [
  { key: 'front', angle: 0, label: 'Front', hint: 'Stand square to the grille, car fills the frame' },
  { key: 'front-right', angle: 45, label: 'Front right', hint: 'Corner of the front bumper and the right side' },
  { key: 'right', angle: 90, label: 'Right side', hint: 'Straight on, whole side in frame' },
  { key: 'rear-right', angle: 135, label: 'Rear right', hint: 'Corner of the rear bumper and the right side' },
  { key: 'rear', angle: 180, label: 'Rear', hint: 'Square to the boot, number plate visible' },
  { key: 'rear-left', angle: 225, label: 'Rear left', hint: 'Corner of the rear bumper and the left side' },
  { key: 'left', angle: 270, label: 'Left side', hint: 'Straight on, whole side in frame' },
  { key: 'front-left', angle: 315, label: 'Front left', hint: 'Corner of the front bumper and the left side' },
]

export function validateVehicleViewFile(file: File): string | null {
  if (!VEHICLE_VIEW_TYPES.includes(file.type)) return `${file.name} isn't a JPG, PNG or WebP photo`
  if (file.size > VEHICLE_VIEW_MAX_BYTES) return `${file.name} is larger than ${VEHICLE_VIEW_MAX_BYTES / 1048576} MB`
  return null
}

/** Views in walk-around order (by angle), so dragging always turns the car smoothly. */
export function sortByAngle<T extends { angle: number }>(views: T[]): T[] {
  return [...views].sort((a, b) => a.angle - b.angle)
}

/** The slot a view sits closest to, for labelling when the owner gave no label. */
export function nearestSlot(angle: number): VehicleSlot {
  let best = VEHICLE_SLOTS[0]
  let bestDiff = 361
  for (const s of VEHICLE_SLOTS) {
    const d = Math.abs(((angle - s.angle + 540) % 360) - 180)
    const diff = 180 - d
    if (diff < bestDiff) { best = s; bestDiff = diff }
  }
  return best
}

export function viewLabel(v: Pick<VehicleView, 'label' | 'angle'>): string {
  return v.label || nearestSlot(v.angle).label
}

/** Wrap an index into [0, n). */
export function wrapIndex(i: number, n: number): number {
  if (n <= 0) return 0
  return ((i % n) + n) % n
}
