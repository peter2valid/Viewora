// Follows a car pin through a spin: in a worker when the browser can (the editor never stalls),
// otherwise on the page. The result is where the pin sits on each frame, keyed by frame id.
import { isClosedLoop, type PinPos } from './pinTrack'
import { loadGray, runTrack, type TrackRequest } from './pinTrackCore'

export interface PinTrack { pts: Record<string, PinPos>; fixed?: string[] }

let worker: Worker | null = null
let seq = 0
const waiting = new Map<number, { resolve: (v: Array<[number, PinPos]>) => void; reject: (e: Error) => void }>()

function getWorker(): Worker | null {
  if (worker) return worker
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return null
  try {
    worker = new Worker(new URL('./pinTrack.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ id: number; pts?: Array<[number, PinPos]>; error?: string }>) => {
      const w = waiting.get(e.data.id)
      if (!w) return
      waiting.delete(e.data.id)
      if (e.data.error) w.reject(new Error(e.data.error))
      else w.resolve(e.data.pts ?? [])
    }
    worker.onerror = () => {
      for (const w of waiting.values()) w.reject(new Error('The pin could not be followed'))
      waiting.clear()
      worker?.terminate()
      worker = null
    }
    return worker
  } catch {
    return null
  }
}

function run(req: TrackRequest): Promise<Array<[number, PinPos]>> {
  const w = getWorker()
  if (!w) return runTrack(req, loadGray)
  const id = ++seq
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject })
    w.postMessage({ id, ...req })
  })
}

const round = (v: number) => Math.round(v * 10000) / 10000

/**
 * Where a pin sits on every frame of `frames` (angle order) it can be followed to.
 * `fixed`: frames the seller corrected, with where they put it.
 */
export async function followPin(
  frames: Array<{ id: string; image_url: string; angle: number }>,
  startId: string,
  pos: PinPos,
  fixed: Record<string, PinPos> = {},
): Promise<PinTrack> {
  const start = frames.findIndex(f => f.id === startId)
  if (start < 0) throw new Error('The pin\'s frame is not in this spin')
  const index = new Map(frames.map((f, i) => [f.id, i]))
  const anchors: Array<[number, PinPos]> = []
  for (const [id, p] of Object.entries(fixed)) {
    const i = index.get(id)
    if (i !== undefined && i !== start) anchors.push([i, p])
  }
  const pts = await run({
    urls: frames.map(f => f.image_url),
    start,
    pos,
    cyclic: isClosedLoop(frames.map(f => f.angle)),
    anchors,
  })
  const out: Record<string, PinPos> = {}
  for (const [i, p] of pts) out[frames[i].id] = [round(p[0]), round(p[1])]
  const kept = Object.keys(fixed).filter(id => id in out && id !== startId)
  return kept.length ? { pts: out, fixed: kept } : { pts: out }
}
