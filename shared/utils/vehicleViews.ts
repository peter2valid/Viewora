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
  hotspots?: VehicleHotspot[]
}

export interface VehicleSlot {
  key: string
  angle: number
  label: string
  hint: string
}

// 72: room for a 64-frame spin (CloudPano-level smoothness) with a few spare.
export const VEHICLE_MAX_VIEWS = 72
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
  let bestDist = 361
  for (const s of VEHICLE_SLOTS) {
    const delta = (((angle - s.angle) % 360) + 360) % 360
    const dist = Math.min(delta, 360 - delta)
    if (dist < bestDist) { best = s; bestDist = dist }
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

/** Long edge of an uploaded car photo. Plenty for a full-width phone screen at 2x, and ~10x lighter than a raw 12 MP shot. */
export const VEHICLE_VIEW_MAX_EDGE = 2000
const VEHICLE_VIEW_QUALITY = 0.85
const SKIP_RESIZE_BYTES = 1.2 * 1024 * 1024

/**
 * Downscales a car photo in the browser before upload and bakes in the phone's
 * rotation (EXIF), re-encoding as JPEG. Small photos are left untouched. If the
 * browser can't do it, the original file is uploaded as is.
 */
export async function resizeVehiclePhoto(file: File): Promise<{ file: File; width: number; height: number }> {
  const original = async () => ({ file, ...(await readImageSize(file)) })
  try {
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return await original()
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const longEdge = Math.max(bmp.width, bmp.height)
    if (longEdge <= VEHICLE_VIEW_MAX_EDGE && file.size <= SKIP_RESIZE_BYTES && file.type === 'image/jpeg') {
      const out = { file, width: bmp.width, height: bmp.height }
      bmp.close?.()
      return out
    }
    const scale = Math.min(1, VEHICLE_VIEW_MAX_EDGE / longEdge)
    const width = Math.max(1, Math.round(bmp.width * scale))
    const height = Math.max(1, Math.round(bmp.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) { bmp.close?.(); return await original() }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bmp, 0, 0, width, height)
    bmp.close?.()
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', VEHICLE_VIEW_QUALITY))
    // Keep the original if re-encoding somehow made it bigger and it was already small enough.
    if (!blob || (scale === 1 && blob.size >= file.size)) return await original()
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return { file: new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }), width, height }
  } catch {
    return await original()
  }
}

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this image')) }
    img.src = url
  })
}

// ── Hotspots: pins on a single exterior photo ──────────────────────────────

export type VehicleHotspotKind = 'feature' | 'damage' | 'info' | 'link'

export interface VehicleHotspot {
  id: string
  view_id: string
  kind: VehicleHotspotKind
  /** Fractions (0-1) of the photo's width / height, so a pin stays on the same spot at any size. */
  x: number
  y: number
  title: string
  body?: string | null
  url?: string | null
}

export const HOTSPOT_KINDS: Array<{ kind: VehicleHotspotKind; label: string; hint: string }> = [
  { kind: 'feature', label: 'Feature', hint: 'Alloy wheels, roof rails, LED lights' },
  { kind: 'damage', label: 'Mark or damage', hint: 'A scratch or dent. Being upfront builds trust' },
  { kind: 'info', label: 'Note', hint: 'Anything else a buyer should know' },
  { kind: 'link', label: 'Link', hint: 'Opens a web page, such as a video or inspection report' },
]

export const MAX_HOTSPOTS_PER_VIEW = 20

export function hotspotKindLabel(kind: VehicleHotspotKind): string {
  return HOTSPOT_KINDS.find(k => k.kind === kind)?.label ?? 'Note'
}

/**
 * Where the photo is drawn inside its box, for `cover` (fills the box, crops the
 * overflow: the public viewer) or `contain` (whole photo visible: the editor).
 * Pins are placed against this rectangle, not the box.
 */
export function fitRect(
  box: { w: number; h: number },
  img: { w: number; h: number },
  fit: 'cover' | 'contain',
): { x: number; y: number; w: number; h: number } {
  const s = fit === 'contain' ? Math.min(box.w / img.w, box.h / img.h) : Math.max(box.w / img.w, box.h / img.h)
  const w = img.w * s
  const h = img.h * s
  return { x: (box.w - w) / 2, y: (box.h - h) / 2, w, h }
}

/** A point in the box -> fractions of the photo, or null when it falls outside the photo. */
export function pointToFraction(
  px: number, py: number,
  rect: { x: number; y: number; w: number; h: number },
): { x: number; y: number } | null {
  if (rect.w <= 0 || rect.h <= 0) return null
  const x = (px - rect.x) / rect.w
  const y = (py - rect.y) / rect.h
  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  return { x, y }
}

/** Angles after swapping two photos' places (drag one onto another). */
export function swapAngles(
  a: { id: string; angle: number },
  b: { id: string; angle: number },
): Array<{ id: string; angle: number }> {
  return [{ id: a.id, angle: b.angle }, { id: b.id, angle: a.angle }]
}

/** Which main slots have no photo and which angles have more than one, for gentle guidance in the editor. */
export function slotGaps(views: Array<{ angle: number }>): { missing: VehicleSlot[]; duplicates: number[] } {
  const counts = new Map<number, number>()
  for (const v of views) counts.set(v.angle, (counts.get(v.angle) ?? 0) + 1)
  return {
    missing: VEHICLE_SLOTS.filter(s => !counts.has(s.angle)),
    duplicates: [...counts.entries()].filter(([, n]) => n > 1).map(([a]) => a).sort((x, y) => x - y),
  }
}

// ── Smooth spin sets ───────────────────────────────────────────────────────
// A handful of photos steps from side to side. With this many frames or more the
// viewer blends neighbours, so the car turns smoothly under a finger.

/** Frames needed before the set is treated as a smooth spin rather than a few angles. */
export const SPIN_MIN_FRAMES = 12

export function isSpinSet(frameCount: number): boolean {
  return frameCount >= SPIN_MIN_FRAMES
}

/**
 * Angles for n frames shot in one walk around the car, starting at the front.
 * `rightFirst`: the first side you pass is the car's right side (angles rise 0 -> 90 -> 180...).
 * Otherwise the left side comes first (0 -> 270 -> 180...). Rounded to whole degrees.
 */
export function spinAngles(n: number, rightFirst: boolean): number[] {
  const step = 360 / n
  return Array.from({ length: n }, (_, i) => {
    const a = Math.round(i * step)
    return rightFirst ? a % 360 : (360 - a) % 360
  })
}

/** Largest gap (degrees) between neighbouring frames, going round the car. */
export function maxGapDegrees(angles: number[]): number {
  if (angles.length < 2) return 360
  const s = [...angles].sort((a, b) => a - b)
  let gap = 0
  for (let i = 0; i < s.length; i++) {
    const next = i === s.length - 1 ? s[0] + 360 : s[i + 1]
    gap = Math.max(gap, next - s[i])
  }
  return gap
}
