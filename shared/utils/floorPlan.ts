// Floor plans: one uploaded plan image per floor, with scenes pinned on it.
// Pins are stored as fractions (0–1) of the plan image's width / height so
// they survive the image being resized; pixels only exist at the viewer edge.

export interface FloorPlan {
  id: string
  name: string
  image_url: string
  media_id?: string | null
  width: number | null
  height: number | null
  order_index: number
}

/** A scene's position on a floor plan (null fields = not placed). */
export interface ScenePlanPin {
  floor_plan_id: string | null
  plan_x: number | null
  plan_y: number | null
  north_offset?: number | null
}

export const FLOOR_PLAN_MAX_BYTES = 15 * 1048576
export const FLOOR_PLAN_TYPES = ['image/png', 'image/jpeg']
export const MAX_FLOOR_PLANS = 10

/** Returns a user-facing error, or null when the file can be uploaded. */
export function validateFloorPlanFile(file: File): string | null {
  if (!FLOOR_PLAN_TYPES.includes(file.type)) return `${file.name} isn't a PNG or JPG`
  if (file.size > FLOOR_PLAN_MAX_BYTES) return `${file.name} is larger than ${FLOOR_PLAN_MAX_BYTES / 1048576} MB`
  return null
}

export function isPlaced(pin: Partial<ScenePlanPin> | null | undefined): boolean {
  return !!pin?.floor_plan_id && typeof pin.plan_x === 'number' && typeof pin.plan_y === 'number'
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

/** Fractional pin → pixel position on the plan image (what MapPlugin expects). */
export function pinToPixels(pin: { plan_x: number; plan_y: number }, plan: { width: number; height: number }): { x: number; y: number } {
  return { x: pin.plan_x * plan.width, y: pin.plan_y * plan.height }
}
