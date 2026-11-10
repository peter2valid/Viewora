// Turns one walk-around video of a car into evenly spaced still frames, in the browser.
// No server work: the video is read with a <video> element and each frame is drawn to a canvas.
// When the car can be found in the frames, each one is then re-cut from the full-size video so the
// car keeps one place and one size all the way round (see spinStabilize.ts).

import { planStabilization, type Box } from './spinStabilize'
import { preloadCarDetector, DETECT_EDGE, type CarDetector } from './carDetector'

export const SPIN_MAX_VIDEO_BYTES = 600 * 1024 * 1024
export const SPIN_MIN_SECONDS = 6
export const SPIN_MAX_SECONDS = 120
// Full HD frames: sharp at full screen and still crisp when the buyer zooms in a little.
const FRAME_LONG_EDGE = 1920
const FRAME_QUALITY = 0.82

export interface ExtractedFrame { file: File; index: number }

function waitFor(el: HTMLVideoElement, event: string, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { cleanup(); reject(new Error('The video took too long to read. Try a shorter clip.')) }, ms)
    const ok = () => { cleanup(); resolve() }
    const bad = () => { cleanup(); reject(new Error('This video could not be read. Record it again, or try a different one.')) }
    function cleanup() { clearTimeout(t); el.removeEventListener(event, ok); el.removeEventListener('error', bad) }
    el.addEventListener(event, ok, { once: true })
    el.addEventListener('error', bad, { once: true })
  })
}

/** Seeks and waits until the new picture is decoded (not just "seeked"). */
async function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  const seeked = waitFor(video, 'seeked', 15000)
  video.currentTime = t
  await seeked
  // "seeked" can arrive before the picture is decoded; wait for it (a blank frame is also re-read below).
  if (video.readyState < 2) await waitFor(video, 'canplay', 15000).catch(() => {})
}

function drawFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, w: number, h: number) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(video, 0, 0, w, h)
}

/** True when the frame is (almost) all black: the decoder had nothing to give yet. One row through the middle is enough. */
function isBlank(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const row = ctx.getImageData(0, Math.floor(h / 2), w, 1).data
  for (let k = 0; k < row.length; k += 4) if (row[k] > 8 || row[k + 1] > 8 || row[k + 2] > 8) return false
  return true
}

/** Why a video can't be used, or null when it looks fine (checked before any frames are read). */
export function validateSpinVideo(file: File): string | null {
  if (!file.type.startsWith('video/')) return `${file.name} isn't a video`
  if (file.size > SPIN_MAX_VIDEO_BYTES) return `${file.name} is larger than ${SPIN_MAX_VIDEO_BYTES / 1048576} MB`
  return null
}

/** Times (seconds) to sample: n frames evenly across one lap. The last frame is not the first again, so the lap closes cleanly. */
export function frameTimes(duration: number, count: number): number[] {
  const usable = Math.max(0, duration - 0.15)
  return Array.from({ length: count }, (_, i) => Math.min(usable, (i / count) * usable))
}

export type SpinPhase = 'reading' | 'preparing' | 'finding' | 'centring' | 'saving'

/** How long to wait for the car finder to download after the frames are read, before giving up on centring. */
const FINDER_WAIT_MS = 90000

/** What we learnt about the recording, for the owner. */
export interface SpinReport {
  /** Frames were re-cut so the car keeps one place and size. */
  centred: boolean
  /** Share of frames where the car was found (0..1), or null when the finder could not run. */
  carFound: number | null
  /** How much bigger the car looked at its closest than at its furthest, as recorded (0.35 = 35%). */
  sizeChange: number | null
  duration: number
  /** Short side of the video in pixels (1080 for Full HD). */
  shortEdge: number
  /** The car finder could not be loaded (offline, very slow connection, old browser). */
  finderMissing?: boolean
  /** Share of frames where the car did not fit in the picture. */
  carClipped?: number
  tips: string[]
}

/** Plain advice from the recording (the spin is made anyway). */
export function spinTips(r: Omit<SpinReport, 'tips'>): string[] {
  const tips: string[] = []
  if (r.finderMissing) tips.push('We could not load the car finder (slow or no connection), so the car was not centred. Run it again on a better connection to centre it.')
  const clipped = r.carClipped ?? 0
  const notFound = r.carFound != null && r.carFound < 0.6
  // Name the real reason it was left as recorded: a cut-off car (over 20% of frames, the planner's
  // limit) or a car that was hardly found (e.g. a video of something else, with a car passing by).
  if (clipped > 0.2) tips.push(`The car did not fit in the picture in ${Math.round(clipped * 100)}% of the frames${r.centred ? '' : ', so it was left as recorded'}. Hold the phone sideways and stay far enough back to see the whole car.`)
  else if (notFound) tips.push('We could not find the car in many frames, so it was left as recorded. Keep the whole car in the picture as you walk.')
  else if (clipped > 0.1) tips.push(`The car did not fit in the picture in ${Math.round(clipped * 100)}% of the frames. Hold the phone sideways and stay far enough back to see the whole car.`)
  // Its size only means something when we actually followed the car.
  if (!notFound && r.sizeChange != null && r.sizeChange > 0.25) {
    tips.push(r.centred
      ? 'You were closer to the car on some sides. We evened out its size; keeping the same distance all the way round gives an even sharper spin.'
      : 'You were closer to the car on some sides, so it grows and shrinks as it turns. Keep the same distance all the way round.')
  }
  if (r.duration < 15) tips.push(`You walked round quickly (${Math.round(r.duration)} s). 20 to 40 seconds gives smoother, sharper turns.`)
  if (r.shortEdge < 720) tips.push(`This video is low resolution (${r.shortEdge}p). Record in 1080p or 4K for a sharper car.`)
  return tips
}

/** True when two thumbnails are the same picture (a repeated frame), allowing for compression noise. */
export function sameThumb(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  const n = Math.min(a.length, b.length)
  if (!n) return false
  let s = 0
  for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i])
  return s / n < 0.5
}

/** A tiny greyscale copy of the current video picture, to spot repeated frames. */
function makeThumbReader() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 36
  const x = c.getContext('2d', { willReadFrequently: true })
  return (video: HTMLVideoElement): Uint8Array => {
    const g = new Uint8Array(64 * 36)
    if (!x) return g
    x.drawImage(video, 0, 0, 64, 36)
    const d = x.getImageData(0, 0, 64, 36).data
    for (let k = 0, j = 0; k < d.length; k += 4, j++) g[j] = (d[k] * 77 + d[k + 1] * 150 + d[k + 2] * 29) >> 8
    return g
  }
}

/**
 * Reads `count` frames from the video, then (when the car can be found) re-cuts each one from the
 * full-size video so the car stays centred and the same size all the way round.
 * Calls onProgress(done, total, phase). Throws with a user-facing message when the video is unusable.
 */
export async function extractSpinFrames(
  file: File,
  count: number,
  onProgress?: (done: number, total: number, phase: SpinPhase) => void,
  signal?: { cancelled: boolean },
  opts: { centre?: boolean } = {},
): Promise<{ frames: ExtractedFrame[]; report: SpinReport }> {
  const invalid = validateSpinVideo(file)
  if (invalid) throw new Error(invalid)

  // Fetch the car finder now (usually already started when the dialog opened); it downloads while
  // the frames are read.
  const detectorP = opts.centre === false ? Promise.resolve(null) : preloadCarDetector()
  let detectorReady: CarDetector | null | undefined
  detectorP.then((d) => { detectorReady = d })

  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    await waitFor(video, 'loadedmetadata', 20000)
    const duration = video.duration
    if (!Number.isFinite(duration) || duration < SPIN_MIN_SECONDS) {
      throw new Error(`The video is too short (${Number.isFinite(duration) ? Math.round(duration) : 0} s). Walk once around the car slowly: ${SPIN_MIN_SECONDS} seconds or more.`)
    }
    if (duration > SPIN_MAX_SECONDS) throw new Error(`The video is too long (${Math.round(duration)} s). Keep it under ${SPIN_MAX_SECONDS} seconds: one slow walk around the car.`)
    const VW = video.videoWidth
    const VH = video.videoHeight
    if (!VW || !VH) throw new Error('This video has no picture we can read. Try recording it again.')

    const scale = Math.min(1, FRAME_LONG_EDGE / Math.max(VW, VH))
    const w = Math.round(VW * scale)
    const h = Math.round(VH * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Your browser cannot read frames from video. Try Chrome or Safari.')
    ctx.imageSmoothingQuality = 'high'
    const thumb = makeThumbReader()

    // The first picture must be decoded before we seek: on a cold 4K HEVC file, seeking to 0 right
    // after the metadata arrives can report "seeked" with nothing decoded yet, giving a black frame 1.
    if (video.readyState < 2) await waitFor(video, 'loadeddata', 20000)

    const times = frameTimes(duration, count)
    let last: Uint8Array | null = null
    /** Seeks to frame i and paints it, re-reading a blank frame or a repeat of the frame before. */
    const readFrame = async (i: number, paint: () => void) => {
      await seekTo(video, times[i])
      paint()
      // Still blank (decoder not ready)? Nudge forward a frame and read it again.
      for (let retry = 0; retry < 3 && isBlank(ctx, w, h); retry++) {
        await seekTo(video, Math.min(duration - 0.05, times[i] + 0.04 * (retry + 1)))
        paint()
      }
      // The same picture as the frame before? Chrome's HEVC decoder sometimes answers a seek with the
      // previous picture, and the spin would stall there. Seeking away and back fixes it.
      let g = thumb(video)
      for (let retry = 0; retry < 3 && last && sameThumb(last, g); retry++) {
        await seekTo(video, Math.max(0, times[i] - 0.6))
        await seekTo(video, Math.min(duration - 0.05, times[i] + 0.001 * (retry + 1)))
        paint()
        g = thumb(video)
      }
      last = g
    }
    const toFile = async (i: number) => {
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', FRAME_QUALITY))
      if (!blob) throw new Error('Could not save a frame from the video.')
      return new File([blob], `spin-${String(i + 1).padStart(2, '0')}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
    }

    // 1. Read the frames. When we will try to centre the car, keep only a small copy of each for the
    //    car finder: saving full-size JPEGs is the slow part on a cheap phone, so each frame is saved
    //    once, at the end (centred, or as recorded if centring is not possible).
    const ds = Math.min(1, DETECT_EDGE / Math.max(VW, VH))
    const small = document.createElement('canvas')
    small.width = Math.round(VW * ds)
    small.height = Math.round(VH * ds)
    const sctx = small.getContext('2d')
    const smallBlobs: Array<Blob | null> = []
    const wantCentre = !!sctx && opts.centre !== false
    const out: ExtractedFrame[] = []
    for (let i = 0; i < times.length; i++) {
      if (signal?.cancelled) throw new Error('Cancelled')
      await readFrame(i, () => drawFrame(ctx, video, w, h))
      if (!wantCentre) out.push({ index: i, file: await toFile(i) })
      if (sctx && wantCentre) {
        sctx.drawImage(canvas, 0, 0, small.width, small.height)
        smallBlobs.push(await new Promise<Blob | null>(r => small.toBlob(r, 'image/jpeg', 0.8)))
      }
      onProgress?.(i + 1, times.length, 'reading')
    }

    const base = { duration, shortEdge: Math.min(VW, VH) }
    /**
     * The frames as recorded (read again and saved), when the car is not centred. Always
     * `return await` it: the finally block below unloads the video as soon as this function returns.
     */
    const asRecorded = async (extra: Partial<SpinReport>) => {
      if (out.length < times.length) {
        last = null
        out.length = 0
        for (let i = 0; i < times.length; i++) {
          if (signal?.cancelled) throw new Error('Cancelled')
          await readFrame(i, () => drawFrame(ctx, video, w, h))
          out.push({ index: i, file: await toFile(i) })
          onProgress?.(i + 1, times.length, 'saving')
        }
      }
      const r = { ...base, centred: false, carFound: null, sizeChange: null, ...extra }
      return { frames: out, report: { ...r, tips: spinTips(r) } }
    }
    if (!wantCentre || !sctx) return await asRecorded({})

    // 2. Find the car in each frame. Still downloading on a slow connection? Say so and wait a while
    //    (the owner can cancel); after that the spin is kept as recorded rather than lost.
    if (detectorReady === undefined) {
      const t0 = Date.now()
      while (detectorReady === undefined && Date.now() - t0 < FINDER_WAIT_MS) {
        if (signal?.cancelled) throw new Error('Cancelled')
        onProgress?.(0, 1, 'preparing')
        await new Promise(r => setTimeout(r, 250))
      }
    }
    const detector = detectorReady ?? null
    if (!detector) return await asRecorded({ finderMissing: true })
    const candidates: Box[][] = []
    for (let i = 0; i < smallBlobs.length; i++) {
      if (signal?.cancelled) throw new Error('Cancelled')
      const b = smallBlobs[i]
      let found: Box[] = []
      if (b) {
        const bmp = await createImageBitmap(b)
        sctx.drawImage(bmp, 0, 0, small.width, small.height)
        bmp.close?.()
        try { found = detector.detect(small) } catch { found = [] }
      }
      candidates.push(found)
      onProgress?.(i + 1, smallBlobs.length, 'finding')
    }

    // 3. Re-cut every frame (from the full-size video, or the copies) so the car keeps one place and
    //    size. Never zoom in so far that a frame has fewer real pixels than about 80% of what we save.
    const maxZoom = Math.min(1.6, Math.max(1, Math.max(VW, VH) / (Math.max(w, h) * 0.8)))
    const plan = planStabilization(candidates, { aspect: VW / VH, maxZoom })
    const heights = plan.track.map(p => p.h)
    const sizeChange = heights.length ? Math.max(...heights) / Math.max(0.01, Math.min(...heights)) - 1 : null
    if (!plan.usable || maxZoom <= 1.02) return await asRecorded({ carFound: plan.coverage, sizeChange, carClipped: plan.clipped })
    last = null
    for (let i = 0; i < times.length; i++) {
      if (signal?.cancelled) throw new Error('Cancelled')
      const k = plan.crops[i]
      await readFrame(i, () => {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(video, k.x * VW, k.y * VH, k.w * VW, k.h * VH, 0, 0, w, h)
      })
      out[i] = { index: i, file: await toFile(i) }
      onProgress?.(i + 1, times.length, 'centring')
    }
    const r = { ...base, centred: true, carFound: plan.coverage, sizeChange, carClipped: plan.clipped }
    return { frames: out, report: { ...r, tips: spinTips(r) } }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}
