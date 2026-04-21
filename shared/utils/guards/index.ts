import type { TourScene } from '~/domain/scene'
import type { Space } from '~/domain/space'
import type { Hotspot } from '~/domain/hotspot'
import { IMAGE_LIMITS } from '~/shared/constants'

export function isTourScene(val: unknown): val is TourScene {
  return (
    typeof val === 'object' &&
    val !== null &&
    typeof (val as any).id === 'string' &&
    typeof (val as any).imageUrl === 'string' &&
    Array.isArray((val as any).hotspots)
  )
}

export function isValidHotspot(val: unknown): val is Hotspot {
  return (
    typeof val === 'object' &&
    val !== null &&
    typeof (val as any).id === 'string' &&
    typeof (val as any).yaw === 'number' &&
    typeof (val as any).pitch === 'number'
  )
}

export function isPublishedSpace(space: Space): boolean {
  return space.is_published && !!space.slug
}

export function hasMedia(space: Space & { property_media?: unknown[] }): boolean {
  return Array.isArray(space.property_media) && space.property_media.length > 0
}

/** Returns true when an image file is within the allowed dimensions and format. */
export function isValidImageFile(file: File): { valid: boolean; reason?: string } {
  if (!IMAGE_LIMITS.PREFERRED_FORMATS.includes(file.type as any)) {
    return { valid: false, reason: `Unsupported format: ${file.type}` }
  }
  if (file.size > IMAGE_LIMITS.MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: `File exceeds ${IMAGE_LIMITS.MAX_FILE_SIZE_BYTES / 1_048_576} MB limit` }
  }
  return { valid: true }
}

/** Checks image element dimensions against the enforced max. */
export function isWithinDimensionLimits(width: number, height: number): boolean {
  return width <= IMAGE_LIMITS.MAX_WIDTH_PX && height <= IMAGE_LIMITS.MAX_HEIGHT_PX
}

/** Safe array filter: removes any hotspot entries that fail shape validation. */
export function safeHotspots(raw: unknown[]): Hotspot[] {
  return raw.filter(isValidHotspot)
}
