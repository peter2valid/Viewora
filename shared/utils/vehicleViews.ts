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
  /** The spin (walk around the car) this photo belongs to. */
  spin_id?: string | null
  hotspots?: VehicleHotspot[]
}

/** One walk around the car: "Exterior", "Roof down", "Doors open"... */
export interface VehicleSpin {
  id: string
  title: string
  /** Degrees around the car of the frame buyers see first. */
  start_angle: number
  order_index?: number
  /** Set when this spin is a camera-height row of another spin (same look, camera higher or lower). */
  row_of?: string | null
  /** Camera height in degrees: 0 eye level, positive higher, negative lower. */
  elevation?: number
}

/** One camera height of a spin, as the public payload nests it. */
export interface VehicleSpinRow { id: string; title: string; elevation: number; start_angle?: number; views: VehicleView[] }

/** A spin with its photos (and any other camera heights), as the public tour payload sends it. */
export interface VehicleSpinSet extends VehicleSpin { views: VehicleView[]; rows?: VehicleSpinRow[] }

/** Camera heights an owner can add to a spin. */
export const SPIN_HEIGHTS = [
  { elevation: 30, label: 'Higher', hint: 'Camera held high, looking down at the roof and bonnet', suffix: 'high' },
  { elevation: -15, label: 'Lower', hint: 'Camera near the ground: wheels, sills, the car’s stance', suffix: 'low' },
] as const

/** Every camera height of a spin: the main one first (the viewer opens on it), then its rows. */
export function spinRows(spin: VehicleSpinSet): VehicleSpinRow[] {
  const main: VehicleSpinRow = { id: spin.id, title: spin.title, elevation: spin.elevation ?? 0, start_angle: spin.start_angle, views: spin.views }
  return [main, ...(spin.rows ?? []).filter(r => r.views.length)]
}

/** Name of a camera height for buyers. */
export function heightLabel(elevation: number): string {
  if (elevation >= 45) return 'From above'
  if (elevation >= 10) return 'High'
  if (elevation <= -10) return 'Low'
  return 'Eye level'
}

export const VEHICLE_MAX_SPINS = 6
/** One-tap names for a car's extra spins. */
export const SPIN_PRESETS = ['Roof down', 'Doors open', 'Bonnet open', 'Lights on', 'Night', 'Close-up']

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
  /** A photo that opens from the pin (the engine under the bonnet, the tyre tread). */
  image_url?: string | null
  /**
   * Smooth spins: where the pin sits on each frame (frame id → [x, y]), found by following the part
   * from frame to frame. A frame left out is one where the part is out of sight. `fixed`: frames the
   * seller corrected by hand.
   */
  track?: { pts: Record<string, [number, number]>; fixed?: string[]; v?: number } | null
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

// ── Viewer geometry: fit, zoom and load order ──────────────────────────────

/**
 * `auto` fills the box (cover) when that crops little, and otherwise shows the whole car
 * (contain) over a blurred copy, the way CloudPano does on a portrait phone.
 */
export const AUTO_COVER_MAX_CROP = 0.2

export function resolveFit(
  fit: 'cover' | 'contain' | 'auto',
  box: { w: number; h: number },
  img: { w: number; h: number },
): 'cover' | 'contain' {
  if (fit !== 'auto') return fit
  if (!box.w || !box.h || !img.w || !img.h) return 'contain'
  const boxRatio = box.w / box.h
  const imgRatio = img.w / img.h
  const kept = Math.min(boxRatio / imgRatio, imgRatio / boxRatio)
  return 1 - kept <= AUTO_COVER_MAX_CROP ? 'cover' : 'contain'
}

export interface ZoomState { z: number; x: number; y: number }

export const ZOOM_MIN = 1
export const ZOOM_MAX = 4

/** Box point -> screen point under zoom `s`, scaling about the box centre then panning. */
export function zoomForward(p: { x: number; y: number }, box: { w: number; h: number }, s: ZoomState) {
  const cx = box.w / 2
  const cy = box.h / 2
  return { x: (p.x - cx) * s.z + cx + s.x, y: (p.y - cy) * s.z + cy + s.y }
}

/** Screen point -> box point (the inverse of zoomForward), for taps and pin drags while zoomed. */
export function zoomInverse(p: { x: number; y: number }, box: { w: number; h: number }, s: ZoomState) {
  const cx = box.w / 2
  const cy = box.h / 2
  return { x: (p.x - cx - s.x) / s.z + cx, y: (p.y - cy - s.y) / s.z + cy }
}

/** Keeps the zoomed photo covering the box: no dragging it off into empty space. */
export function clampZoom(s: ZoomState, box: { w: number; h: number }, rect: { x: number; y: number; w: number; h: number }): ZoomState {
  const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s.z))
  const axis = (pan: number, lo: number, size: number, boxSize: number) => {
    const c = boxSize / 2
    const left = (lo - c) * z + c
    const right = (lo + size - c) * z + c
    if (size * z <= boxSize) return 0 // smaller than the box: stay centred
    return Math.min(-left, Math.max(boxSize - right, pan))
  }
  return { z, x: axis(s.x, rect.x, rect.w, box.w), y: axis(s.y, rect.y, rect.h, box.h) }
}

/** Zoom to `z` keeping the photo point under (sx, sy) where it is. */
export function zoomAt(s: ZoomState, z: number, sx: number, sy: number, box: { w: number; h: number }): ZoomState {
  const cx = box.w / 2
  const cy = box.h / 2
  const k = z / s.z
  return { z, x: sx - cx - (sx - cx - s.x) * k, y: sy - cy - (sy - cy - s.y) * k }
}

/**
 * Order to fetch spin frames in: the start frame, then evenly spread frames, then the gaps
 * between them. The car can be turned all the way round early, getting smoother as the rest arrive.
 */
export function spinLoadOrder(n: number, start = 0): number[] {
  if (n <= 0) return []
  const out: number[] = []
  const seen = new Set<number>()
  let stride = 1
  while (stride * 2 <= n) stride *= 2
  for (; stride >= 1; stride = Math.floor(stride / 2)) {
    for (let k = 0; k < n; k += stride) {
      const i = wrapIndex(start + k, n)
      if (!seen.has(i)) { seen.add(i); out.push(i) }
    }
    if (stride === 1) break
  }
  return out
}

/** Index of the frame closest to an angle, for a spin's chosen first view. */
export function indexNearestAngle(views: Array<{ angle: number }>, angle: number): number {
  let best = 0
  let bestDist = 361
  views.forEach((v, i) => {
    const d = Math.abs(v.angle - angle) % 360
    const dist = Math.min(d, 360 - d)
    if (dist < bestDist) { best = i; bestDist = dist }
  })
  return best
}

// ── Spin viewer chrome (the look of a classic product-360 viewer) ──

export interface TimelineMark {
  id: string
  /** Frame index (into the angle-sorted list) the hotspot sits on. */
  index: number
  /** 0-1 along the turn track. */
  at: number
  title: string
  kind: VehicleHotspotKind
}

/** One mark per hotspot on the turn track, at the frame it was pinned on. */
export function timelineMarks(sorted: VehicleView[]): TimelineMark[] {
  const n = sorted.length
  if (n < 2) return []
  const out: TimelineMark[] = []
  sorted.forEach((v, i) => {
    for (const h of v.hotspots ?? []) out.push({ id: h.id, index: i, at: i / (n - 1), title: h.title, kind: h.kind })
  })
  return out
}

/**
 * How much of the next frame to show at a point between two frames (0..1 → 0..1). The first and
 * last part of each step show one sharp frame; the middle `width` dissolves smoothly between them.
 * width 1 is the plain linear mix.
 */
export function crispBlend(f: number, width = 0.4): number {
  if (!(f > 0)) return 0
  if (f >= 1) return 1
  const w = Math.min(1, Math.max(0.01, width))
  const t = Math.min(1, Math.max(0, (f - (0.5 - w / 2)) / w))
  return t * t * (3 - 2 * t)
}
