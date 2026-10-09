// Geometry for aerial maps (flat drone photos). Points are normalised to the
// image: x, y in 0..1. Anything needing real proportions works in pixel space
// (x·W, y·H) so non-square photos don't distort shapes.

export type AerialPoint = { x: number; y: number }
export type AerialShapeKind = 'plot' | 'zone' | 'road' | 'beacon'
export type AerialPlotStatus = 'available' | 'reserved' | 'sold'

export interface AerialShape {
  id: string
  kind: AerialShapeKind
  label?: string
  text?: string
  points: AerialPoint[]
  status?: AerialPlotStatus
  price?: string
  size?: string
  url?: string
  arrow_width?: number
}

export interface AerialMap {
  id: string
  title: string
  image_url: string
  width: number | null
  height: number | null
  order_index: number
  shapes: AerialShape[]
  media_id?: string | null
}

export function newShapeId(): string {
  return `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/** Area-weighted centroid (falls back to the vertex mean for degenerate shapes). */
export function polygonCentroid(pts: AerialPoint[], W = 1, H = 1): AerialPoint {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length]
    const x0 = p.x * W, y0 = p.y * H, x1 = q.x * W, y1 = q.y * H
    const cross = x0 * y1 - x1 * y0
    a += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross
  }
  if (Math.abs(a) < 1e-9) {
    const n = pts.length || 1
    return { x: pts.reduce((s, p) => s + p.x, 0) / n, y: pts.reduce((s, p) => s + p.y, 0) / n }
  }
  a *= 0.5
  return { x: cx / (6 * a) / W, y: cy / (6 * a) / H }
}

/** Midpoint along a path, by length — where a road's label sits. */
export function pathMidpoint(pts: AerialPoint[], W = 1, H = 1): AerialPoint {
  if (pts.length < 2) return pts[0] ?? { x: 0.5, y: 0.5 }
  const seg = pts.slice(1).map((p, i) => Math.hypot((p.x - pts[i].x) * W, (p.y - pts[i].y) * H))
  let half = seg.reduce((s, l) => s + l, 0) / 2
  for (let i = 0; i < seg.length; i++) {
    if (half <= seg[i]) {
      const t = seg[i] ? half / seg[i] : 0
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t }
    }
    half -= seg[i]
  }
  return pts[pts.length - 1]
}

export function shapeAnchor(s: AerialShape, W = 1, H = 1): AerialPoint {
  if (s.kind === 'road') return pathMidpoint(s.points, W, H)
  if (s.kind === 'beacon') return s.points[0]
  return polygonCentroid(s.points, W, H)
}

/**
 * Projective map from the unit square onto a quad (corners in drawing order:
 * 0→1 is "across", 0→3 is "rows"). For an angled drone photo of flat ground
 * this is exact: plots further away come out smaller, like the real ones.
 */
function unitSquareToQuad(q: AerialPoint[]) {
  const [p0, p1, p2, p3] = q
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y
  let a: number, b: number, d: number, e: number, g: number, h: number
  const den = dx1 * dy2 - dx2 * dy1
  if (Math.abs(dx3) < 1e-12 && Math.abs(dy3) < 1e-12 || Math.abs(den) < 1e-12) {
    g = 0; h = 0
    a = p1.x - p0.x; b = p3.x - p0.x; d = p1.y - p0.y; e = p3.y - p0.y
  } else {
    g = (dx3 * dy2 - dx2 * dy3) / den
    h = (dx1 * dy3 - dx3 * dy1) / den
    a = p1.x - p0.x + g * p1.x; b = p3.x - p0.x + h * p3.x
    d = p1.y - p0.y + g * p1.y; e = p3.y - p0.y + h * p3.y
  }
  return (u: number, v: number): AerialPoint => {
    const w = g * u + h * v + 1
    return { x: (a * u + b * v + p0.x) / w, y: (d * u + e * v + p0.y) / w }
  }
}

/** Splits a 4-corner block into rows × cols plots with perspective. */
export function subdivideQuad(corners: AerialPoint[], rows: number, cols: number): AerialPoint[][] {
  const f = unitSquareToQuad(corners)
  const cells: AerialPoint[][] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push([f(c / cols, r / rows), f((c + 1) / cols, r / rows), f((c + 1) / cols, (r + 1) / rows), f(c / cols, (r + 1) / rows)])
    }
  }
  return cells
}

/** Arrow outline along a path (last point = tip), width relative to the photo. */
export function arrowOutline(path: AerialPoint[], W: number, H: number, widthScale = 1): AerialPoint[] | null {
  if (path.length < 2 || !W || !H) return null
  const px = path.map(p => ({ x: p.x * W, y: p.y * H }))
  const w = 0.018 * Math.max(W, H) * Math.max(0.1, widthScale)
  const n = px.length
  const tip = px[n - 1], prev = px[n - 2]
  const len = Math.hypot(tip.x - prev.x, tip.y - prev.y) || 1
  const t = { x: (tip.x - prev.x) / len, y: (tip.y - prev.y) / len }
  const headLen = Math.min(w * 2.4, len * 0.8)
  const base = { x: tip.x - t.x * headLen, y: tip.y - t.y * headLen }
  const shaft = [...px.slice(0, -1), base]
  const normal = (i: number) => {
    const a = shaft[Math.max(0, i - 1)], b = shaft[Math.min(shaft.length - 1, i + 1)]
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1
    return { x: -dy / l, y: dx / l }
  }
  const left: AerialPoint[] = [], right: AerialPoint[] = []
  shaft.forEach((p, i) => {
    const nrm = normal(i)
    left.push({ x: p.x + nrm.x * w / 2, y: p.y + nrm.y * w / 2 })
    right.push({ x: p.x - nrm.x * w / 2, y: p.y - nrm.y * w / 2 })
  })
  const hn = { x: -t.y, y: t.x }, hw = w * 2.2
  const out = [
    ...left,
    { x: base.x + hn.x * hw / 2, y: base.y + hn.y * hw / 2 },
    tip,
    { x: base.x - hn.x * hw / 2, y: base.y - hn.y * hw / 2 },
    ...right.reverse(),
  ]
  return out.map(p => ({ x: p.x / W, y: p.y / H }))
}

/** Next "Plot N" number across all maps, so labels stay unique. */
export function nextPlotNumber(maps: AerialMap[], extra: AerialShape[] = []): number {
  const nums = [...maps.flatMap(m => m.shapes), ...extra]
    .filter(s => s.kind === 'plot')
    .map(s => Number(/(\d+)\s*$/.exec(s.label || '')?.[1] ?? 0))
  return Math.max(0, ...nums) + 1
}

export const AERIAL_STATUS: Record<AerialPlotStatus, { label: string; color: string; fill: string }> = {
  available: { label: 'Available', color: '#22c55e', fill: 'rgba(255, 255, 255, 0.10)' },
  reserved:  { label: 'Reserved',  color: '#f59e0b', fill: 'rgba(245, 158, 11, 0.42)' },
  sold:      { label: 'Sold',      color: '#ef4444', fill: 'rgba(234, 88, 12, 0.50)' },
}

/**
 * Downscales a drone photo for upload: ≤ 6000px on the long side (the media
 * pipeline rejects > 12288×6144, and 48 MP originals are 15–25 MB), JPEG 0.9,
 * EXIF orientation applied. Returns the file plus its final pixel size.
 */
export async function prepareAerialPhoto(file: File, maxSide = 6000): Promise<{ file: File; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const w0 = img.naturalWidth, h0 = img.naturalHeight
    const scale = Math.min(1, maxSide / Math.max(w0, h0))
    if (scale === 1 && file.type === 'image/jpeg' && file.size < 12 * 1024 * 1024) {
      return { file, width: w0, height: h0 }
    }
    const w = Math.round(w0 * scale), h = Math.round(h0 * scale)
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob>((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Could not prepare photo')), 'image/jpeg', 0.9))
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return { file: new File([blob], name, { type: 'image/jpeg' }), width: w, height: h }
  } finally {
    URL.revokeObjectURL(url)
  }
}
