// Turns one walk-around video of a car into evenly spaced still frames, in the browser.
// No server work: the video is read with a <video> element and each frame is drawn to a canvas.

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

/**
 * Reads `count` frames from the video. Calls onProgress(done, count).
 * Throws with a user-facing message when the video is unusable.
 */
export async function extractSpinFrames(
  file: File,
  count: number,
  onProgress?: (done: number, total: number) => void,
  signal?: { cancelled: boolean },
): Promise<ExtractedFrame[]> {
  const invalid = validateSpinVideo(file)
  if (invalid) throw new Error(invalid)

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
    if (!video.videoWidth || !video.videoHeight) throw new Error('This video has no picture we can read. Try recording it again.')

    const scale = Math.min(1, FRAME_LONG_EDGE / Math.max(video.videoWidth, video.videoHeight))
    const w = Math.round(video.videoWidth * scale)
    const h = Math.round(video.videoHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Your browser cannot read frames from video. Try Chrome or Safari.')

    const out: ExtractedFrame[] = []
    const times = frameTimes(duration, count)
    for (let i = 0; i < times.length; i++) {
      if (signal?.cancelled) throw new Error('Cancelled')
      video.currentTime = times[i]
      await waitFor(video, 'seeked', 15000)
      ctx.drawImage(video, 0, 0, w, h)
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', FRAME_QUALITY))
      if (!blob) throw new Error('Could not save a frame from the video.')
      out.push({ index: i, file: new File([blob], `spin-${String(i + 1).padStart(2, '0')}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }) })
      onProgress?.(i + 1, times.length)
    }
    return out
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}
