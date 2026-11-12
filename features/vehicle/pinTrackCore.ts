// Shared by the tracking worker and the main-thread fallback: frame loading and one tracking run.
import { trackPin, TRACK_WIDTH, type GrayFrame, type PinPos } from './pinTrack'

export interface TrackRequest {
  /** The spin's frames in angle order. */
  urls: string[]
  /** Frame the pin was placed on. */
  start: number
  pos: PinPos
  cyclic: boolean
  /** Seller corrections: [frame index, position]. */
  anchors: Array<[number, PinPos]>
}

const cache = new Map<string, Promise<GrayFrame>>()
const MAX_CACHED = 240

/** A frame as luminance, TRACK_WIDTH wide. Needs the media host to allow cross-origin reads. */
export function loadGray(url: string): Promise<GrayFrame> {
  const hit = cache.get(url)
  if (hit) return hit
  const p = (async () => {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) throw new Error(`Frame did not load (${res.status})`)
    const bmp = await createImageBitmap(await res.blob())
    const w = Math.min(TRACK_WIDTH, bmp.width)
    const h = Math.max(1, Math.round((bmp.height * w) / bmp.width))
    const make = (cw: number, ch: number): OffscreenCanvas | HTMLCanvasElement => typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(cw, ch)
      : Object.assign(document.createElement('canvas'), { width: cw, height: ch })
    // Shrink by halves: one big drawImage step skips most pixels and leaves sparkle that the
    // tracker mistakes for detail (it followed 4 frames instead of 15 on a 1080p walk-round).
    let src: CanvasImageSource = bmp
    let sw = bmp.width
    let sh = bmp.height
    while (sw / 2 >= w * 1.0001) {
      const nw = Math.max(w, Math.round(sw / 2))
      const nh = Math.max(h, Math.round(sh / 2))
      const step = make(nw, nh)
      const sctx = step.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null
      if (!sctx) break
      sctx.imageSmoothingEnabled = true
      sctx.imageSmoothingQuality = 'high'
      sctx.drawImage(src, 0, 0, nw, nh)
      src = step
      sw = nw
      sh = nh
    }
    const canvas = make(w, h)
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null
    if (!ctx) throw new Error('No canvas')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(src, 0, 0, w, h)
    bmp.close?.()
    const rgba = ctx.getImageData(0, 0, w, h).data
    const px = new Uint8Array(w * h)
    for (let i = 0, j = 0; i < px.length; i++, j += 4) px[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8
    return { w, h, px }
  })()
  p.catch(() => cache.delete(url))
  cache.set(url, p)
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string)
  return p
}

/** Loads the frames (a few at a time) and follows the pin. Answers [frame index, position] pairs. */
export async function runTrack(req: TrackRequest, load: (url: string) => Promise<GrayFrame>): Promise<Array<[number, PinPos]>> {
  const frames: GrayFrame[] = new Array(req.urls.length)
  let next = 0
  const worker = async () => {
    while (next < req.urls.length) {
      const i = next++
      frames[i] = await load(req.urls[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, req.urls.length) }, worker))
  const out = trackPin(frames, req.start, req.pos, { cyclic: req.cyclic, anchors: new Map(req.anchors) })
  return [...out.entries()]
}
