// Turns an ordinary photo (drone or phone) into a 2:1 equirectangular image
// the 360 viewer can display, entirely in the browser — no service, no cost.
//
// Honesty first: nothing is invented. The real photo is reprojected onto the
// sphere exactly where the camera was pointing (using the drone's gimbal pitch
// when the file has it), and everything outside the photo is a heavily blurred,
// darkened wash of the photo's own colours, so the viewer reads as "a photo
// floating in a 360 space" rather than fake scenery. AI outpainting was ruled
// out deliberately: on land listings it would hallucinate fences, trees and
// neighbouring plots, which is a misrepresentation risk for the seller.
//
//   normal photo (aspect < 1.9)    → rectilinear projection, FOV from EXIF
//   wide strip  (aspect > 2.15)    → cylindrical projection (phone/drone pano)
//   already 2:1 (1.9 – 2.15)       → left untouched

export interface PanoramaConversion {
  file: File
  /** Degrees, for scenes.initial_pitch — so the viewer opens facing the photo. */
  initialPitchDeg: number
  sourceKind: 'photo' | 'strip'
  horizontalFovDeg: number
}

// ≤ 16,777,216 px keeps us under iOS Safari's canvas area limit.
const OUT_W = 5760
const OUT_H = 2880
const DEFAULT_HFOV_DEG = 70       // typical drone / phone main camera
const STRIP_VFOV_DEG = 62         // phone panorama strips are shot in portrait
const EDGE_FEATHER = 0.075        // fraction of the photo faded into the backdrop (wider = softer seam)

export function isEquirectangular(width: number, height: number): boolean {
  const r = width / height
  return r >= 1.9 && r <= 2.15
}

export async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const img = await loadImage(file)
    const size = { width: img.naturalWidth, height: img.naturalHeight }
    URL.revokeObjectURL(img.src)
    return size
  } catch {
    return null
  }
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read this image'))
    img.src = URL.createObjectURL(file)
  })
}

// ── Camera metadata (EXIF 35mm focal length + DJI XMP gimbal pitch) ──────────

interface CameraMeta { focal35?: number; gimbalPitchDeg?: number }

async function readCameraMeta(file: File): Promise<CameraMeta> {
  const meta: CameraMeta = {}
  try {
    const head = await file.slice(0, 512 * 1024).arrayBuffer()
    meta.focal35 = readExifFocal35(new DataView(head)) ?? undefined
    // XMP is plain text inside the JPEG. DJI writes e.g. drone-dji:GimbalPitchDegree="-30.0"
    const text = new TextDecoder('latin1').decode(head)
    const m = text.match(/GimbalPitchDegree(?:="|>)\s*([-+]?\d+(?:\.\d+)?)/)
    if (m) meta.gimbalPitchDeg = Number(m[1])
  } catch { /* metadata is optional */ }
  return meta
}

function readExifFocal35(view: DataView): number | null {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null
  let offset = 2
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset)
    const size = view.getUint16(offset + 2)
    if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) { // "Exif"
      const tiff = offset + 10
      const little = view.getUint16(tiff) === 0x4949
      const u16 = (o: number) => view.getUint16(o, little)
      const u32 = (o: number) => view.getUint32(o, little)
      const findTag = (ifd: number, tag: number): number | null => {
        if (ifd + 2 > view.byteLength) return null
        const count = u16(ifd)
        for (let i = 0; i < count; i++) {
          const entry = ifd + 2 + i * 12
          if (entry + 12 > view.byteLength) return null
          if (u16(entry) === tag) return entry
        }
        return null
      }
      const ifd0 = tiff + u32(tiff + 4)
      const exifPtr = findTag(ifd0, 0x8769)
      if (exifPtr == null) return null
      const exifIfd = tiff + u32(exifPtr + 8)
      const focal = findTag(exifIfd, 0xa405) // FocalLengthIn35mmFilm (SHORT)
      if (focal == null) return null
      const value = u16(focal + 8)
      return value > 0 ? value : null
    }
    if ((marker & 0xff00) !== 0xff00 || size < 2) return null
    offset += 2 + size
  }
  return null
}

// ── Conversion ───────────────────────────────────────────────────────────────

export async function convertPhotoToPanorama(file: File): Promise<PanoramaConversion> {
  const [img, meta] = await Promise.all([loadImage(file), readCameraMeta(file)])
  try {
    const srcW = img.naturalWidth
    const srcH = img.naturalHeight
    const aspect = srcW / srcH
    const sourceKind: 'photo' | 'strip' = aspect > 2.15 ? 'strip' : 'photo'

    let hfovDeg: number
    let pitchDeg = 0
    if (sourceKind === 'strip') {
      hfovDeg = Math.min(360, STRIP_VFOV_DEG * aspect)
    } else {
      // EXIF 35mm-equivalent focal length gives the true horizontal FOV of a 36mm-wide frame.
      // Portrait shots: the 36mm side is the long (vertical) one.
      const longSideFov = meta.focal35 ? 2 * Math.atan(18 / meta.focal35) : (DEFAULT_HFOV_DEG * Math.PI) / 180
      hfovDeg = aspect >= 1
        ? (longSideFov * 180) / Math.PI
        : (2 * Math.atan(Math.tan(longSideFov / 2) * aspect) * 180) / Math.PI
      pitchDeg = Math.max(-89, Math.min(30, meta.gimbalPitchDeg ?? 0))
    }

    // Downscale the source to roughly the resolution it will occupy on the sphere.
    const targetSrcW = Math.min(srcW, Math.ceil((OUT_W * hfovDeg) / 360 * 1.4), 6000)
    const scale = targetSrcW / srcW
    const sw = Math.max(1, Math.round(srcW * scale))
    const sh = Math.max(1, Math.round(srcH * scale))
    const srcCanvas = makeCanvas(sw, sh)
    const sctx = srcCanvas.getContext('2d', { willReadFrequently: true })!
    sctx.imageSmoothingQuality = 'high'
    sctx.drawImage(img, 0, 0, sw, sh)
    const src = sctx.getImageData(0, 0, sw, sh).data

    const out = makeCanvas(OUT_W, OUT_H)
    const ctx = out.getContext('2d', { willReadFrequently: true })!
    paintBackdrop(ctx, img)

    const project = sourceKind === 'strip'
      ? cylindricalProjector(hfovDeg, sw, sh)
      : rectilinearProjector(hfovDeg, pitchDeg, sw, sh)

    // Soft edge continuation: each border pixel of the photo is stretched
    // outward (clamp-to-edge) at very low resolution and faded, so the sky
    // keeps going above and the ground below instead of stopping at a hard
    // border. At this resolution no detail survives — nothing is invented.
    if (hfovDeg < 300) paintGlow(ctx, src, sw, sh, project)

    const box = boundingBox(project.bounds)
    const region = ctx.getImageData(box.x0, box.y0, box.w, box.h)
    const dst = region.data

    // Per-column / per-row trig, reused across the whole box.
    const sinLon = new Float64Array(box.w), cosLon = new Float64Array(box.w)
    for (let i = 0; i < box.w; i++) {
      const lon = ((box.x0 + i + 0.5) / OUT_W - 0.5) * 2 * Math.PI
      sinLon[i] = Math.sin(lon); cosLon[i] = Math.cos(lon)
    }
    for (let j = 0; j < box.h; j++) {
      const lat = (0.5 - (box.y0 + j + 0.5) / OUT_H) * Math.PI
      const sinLat = Math.sin(lat), cosLat = Math.cos(lat)
      for (let i = 0; i < box.w; i++) {
        const hit = project.sample(sinLat, cosLat, sinLon[i], cosLon[i], lat)
        if (!hit) continue
        const a = smooth(Math.min(hit.edge / EDGE_FEATHER, 1))
        const k = (j * box.w + i) * 4
        bilinear(src, sw, sh, hit.u, hit.v, dst, k, a)
      }
    }
    ctx.putImageData(region, box.x0, box.y0)

    const blob = await new Promise<Blob>((resolve, reject) =>
      out.toBlob(b => (b ? resolve(b) : reject(new Error('Could not encode the 360 image'))), 'image/jpeg', 0.9),
    )
    const base = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return {
      file: new File([blob], `${base}-360.jpg`, { type: 'image/jpeg', lastModified: Date.now() }),
      initialPitchDeg: Math.round(pitchDeg),
      sourceKind,
      horizontalFovDeg: Math.round(hfovDeg),
    }
  } finally {
    URL.revokeObjectURL(img.src)
  }
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/**
 * Backdrop: the photo's own average colour per row (sky → horizon → ground),
 * stretched into soft horizontal bands and darkened. Earlier versions blurred
 * the whole photo across the sphere, which smeared ghost copies of its
 * features (text, fences) all the way round. Nothing here is invented.
 */
function paintBackdrop(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const bands = makeCanvas(1, 32)
  const bctx = bands.getContext('2d')!
  bctx.imageSmoothingQuality = 'high'
  bctx.drawImage(img, 0, 0, 1, 32)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bands, 0, 0, OUT_W, OUT_H)
  const shade = ctx.createLinearGradient(0, 0, 0, OUT_H)
  shade.addColorStop(0, 'rgba(8, 10, 16, 0.55)')
  shade.addColorStop(0.5, 'rgba(8, 10, 16, 0.3)')
  shade.addColorStop(1, 'rgba(8, 10, 16, 0.6)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, OUT_W, OUT_H)
}

function paintGlow(ctx: CanvasRenderingContext2D, src: Uint8ClampedArray, sw: number, sh: number, project: Projector) {
  const GW = 72, GH = 36 // tiny on purpose: edge streaks (fences, roads) blur away
  const glow = makeCanvas(GW, GH)
  const gctx = glow.getContext('2d')!
  const img = gctx.createImageData(GW, GH)
  const d = img.data
  for (let j = 0; j < GH; j++) {
    const lat = (0.5 - (j + 0.5) / GH) * Math.PI
    const sinLat = Math.sin(lat), cosLat = Math.cos(lat)
    for (let i = 0; i < GW; i++) {
      const lon = ((i + 0.5) / GW - 0.5) * 2 * Math.PI
      const hit = project.clamped(sinLat, cosLat, Math.sin(lon), Math.cos(lon), lat)
      if (!hit) continue
      const k = (j * GW + i) * 4
      const sx = Math.min(sw - 1, Math.max(0, Math.round(hit.u)))
      const sy = Math.min(sh - 1, Math.max(0, Math.round(hit.v)))
      const s = (sy * sw + sx) * 4
      d[k] = src[s]; d[k + 1] = src[s + 1]; d[k + 2] = src[s + 2]
      // Strong next to the photo, fading out with distance from it.
      d[k + 3] = Math.round(255 * (1 - smooth(Math.min(hit.outside / 0.9, 1))))
    }
  }
  gctx.putImageData(img, 0, 0)
  // Two-step upscale = cheap, cross-browser blur.
  const mid = makeCanvas(288, 144)
  const mctx = mid.getContext('2d')!
  mctx.imageSmoothingQuality = 'high'
  mctx.drawImage(glow, 0, 0, 288, 144)
  ctx.save()
  ctx.globalAlpha = 0.6
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(mid, 0, 0, OUT_W, OUT_H)
  ctx.restore()
}

interface Hit { u: number; v: number; edge: number }
interface Projector {
  sample: (sinLat: number, cosLat: number, sinLon: number, cosLon: number, lat: number) => Hit | null
  /** Like sample, but outside the photo returns the nearest edge pixel and how far outside it is. */
  clamped: (sinLat: number, cosLat: number, sinLon: number, cosLon: number, lat: number) => { u: number; v: number; outside: number } | null
  bounds: { lonMin: number; lonMax: number; latMin: number; latMax: number }
}

function rectilinearProjector(hfovDeg: number, pitchDeg: number, sw: number, sh: number): Projector {
  const tanH = Math.tan((hfovDeg * Math.PI) / 360)
  const tanV = tanH * (sh / sw)
  const p = (pitchDeg * Math.PI) / 180
  const sinP = Math.sin(p), cosP = Math.cos(p)

  const sample: Projector['sample'] = (sinLat, cosLat, sinLon, cosLon) => {
    // World direction (x right, y up, z forward) into camera space (pitched about x).
    const dx = cosLat * sinLon, dy = sinLat, dz = cosLat * cosLon
    const cz = dy * sinP + dz * cosP
    if (cz <= 1e-6) return null
    const cy = dy * cosP - dz * sinP
    const px = dx / cz / tanH
    const py = cy / cz / tanV
    if (px < -1 || px > 1 || py < -1 || py > 1) return null
    return { u: (px + 1) * 0.5 * (sw - 1), v: (1 - py) * 0.5 * (sh - 1), edge: Math.min(1 - Math.abs(px), 1 - Math.abs(py)) }
  }
  const clamped: Projector['clamped'] = (sinLat, cosLat, sinLon, cosLon) => {
    const dx = cosLat * sinLon, dy = sinLat, dz = cosLat * cosLon
    const cz = dy * sinP + dz * cosP
    if (cz <= 0.05) return null
    const cy = dy * cosP - dz * sinP
    const px = dx / cz / tanH, py = cy / cz / tanV
    const outside = Math.max(Math.abs(px) - 1, Math.abs(py) - 1, 0)
    const cpx = Math.max(-1, Math.min(1, px)), cpy = Math.max(-1, Math.min(1, py))
    return { u: (cpx + 1) * 0.5 * (sw - 1), v: (1 - cpy) * 0.5 * (sh - 1), outside }
  }

  // Bounds: trace the photo's border onto the sphere.
  let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity
  const N = 24
  for (let i = 0; i <= N; i++) {
    for (const [px, py] of [[-1 + (2 * i) / N, -1], [-1 + (2 * i) / N, 1], [-1, -1 + (2 * i) / N], [1, -1 + (2 * i) / N]]) {
      const cx = px * tanH, cy = py * tanV, cz = 1
      const dx = cx, dy = cy * cosP + cz * sinP, dz = -cy * sinP + cz * cosP
      const lon = Math.atan2(dx, dz), lat = Math.atan2(dy, Math.hypot(dx, dz))
      lonMin = Math.min(lonMin, lon); lonMax = Math.max(lonMax, lon)
      latMin = Math.min(latMin, lat); latMax = Math.max(latMax, lat)
    }
  }
  // A view through the nadir/zenith wraps every longitude.
  if (Math.abs(p) + Math.atan(tanV) >= Math.PI / 2 - 0.01) { lonMin = -Math.PI; lonMax = Math.PI }
  if (p - Math.atan(tanV) <= -Math.PI / 2 + 0.01) latMin = -Math.PI / 2
  if (p + Math.atan(tanV) >= Math.PI / 2 - 0.01) latMax = Math.PI / 2
  return { sample, clamped, bounds: { lonMin, lonMax, latMin, latMax } }
}

function cylindricalProjector(hfovDeg: number, sw: number, sh: number): Projector {
  const hfov = (hfovDeg * Math.PI) / 180
  const halfTanV = (sh * hfov) / (2 * sw)  // tan(vfov/2) for a cylinder of this aspect
  const full = hfovDeg >= 359.5
  const sample: Projector['sample'] = (sinLat, cosLat, sinLon, cosLon, lat) => {
    const lon = Math.atan2(sinLon, cosLon)
    const x = lon / hfov
    if (x < -0.5 || x > 0.5) return null
    const y = Math.tan(lat) / halfTanV
    if (y < -1 || y > 1) return null
    const edgeX = full ? 1 : 1 - Math.abs(x) * 2
    return { u: (x + 0.5) * (sw - 1), v: (1 - y) * 0.5 * (sh - 1), edge: Math.min(edgeX, 1 - Math.abs(y)) }
  }
  const clamped: Projector['clamped'] = (sinLat, cosLat, sinLon, cosLon, lat) => {
    const lon = Math.atan2(sinLon, cosLon)
    const x = full ? lon / hfov : lon / hfov
    const y = Math.tan(Math.max(-1.45, Math.min(1.45, lat))) / halfTanV
    const outX = full ? 0 : Math.max(Math.abs(x) - 0.5, 0) * 2
    const outside = Math.max(outX, Math.abs(y) - 1, 0)
    const cx = Math.max(-0.5, Math.min(0.5, x)), cy = Math.max(-1, Math.min(1, y))
    return { u: (cx + 0.5) * (sw - 1), v: (1 - cy) * 0.5 * (sh - 1), outside }
  }
  const latMax = Math.atan(halfTanV)
  return { sample, clamped, bounds: { lonMin: -hfov / 2, lonMax: hfov / 2, latMin: -latMax, latMax } }
}

function boundingBox(b: Projector['bounds']) {
  const x0 = Math.max(0, Math.floor(((b.lonMin / (2 * Math.PI)) + 0.5) * OUT_W) - 2)
  const x1 = Math.min(OUT_W, Math.ceil(((b.lonMax / (2 * Math.PI)) + 0.5) * OUT_W) + 2)
  const y0 = Math.max(0, Math.floor((0.5 - b.latMax / Math.PI) * OUT_H) - 2)
  const y1 = Math.min(OUT_H, Math.ceil((0.5 - b.latMin / Math.PI) * OUT_H) + 2)
  return { x0, y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function bilinear(src: Uint8ClampedArray, sw: number, sh: number, u: number, v: number, dst: Uint8ClampedArray, k: number, alpha: number) {
  const x0 = Math.max(0, Math.min(sw - 1, Math.floor(u)))
  const y0 = Math.max(0, Math.min(sh - 1, Math.floor(v)))
  const x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1)
  const fx = u - x0, fy = v - y0
  const i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4, i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4
  for (let c = 0; c < 3; c++) {
    const top = src[i00 + c] + (src[i10 + c] - src[i00 + c]) * fx
    const bot = src[i01 + c] + (src[i11 + c] - src[i01 + c]) * fx
    const val = top + (bot - top) * fy
    dst[k + c] = dst[k + c] + (val - dst[k + c]) * alpha
  }
  dst[k + 3] = 255
}
