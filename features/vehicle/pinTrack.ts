/**
 * Follows a pin on a car from frame to frame of a smooth spin, so it stays on the bonnet as the car
 * turns and disappears when the bonnet goes out of sight.
 *
 * Plain template matching: a small square of the picture around the pin is looked for in the next
 * frame, near where it was (normalised cross-correlation, so light changes between frames do not
 * matter). Each frame is a few degrees from the last, so the part has moved only a little. When the
 * best match is poor, or the part no longer looks like it did where the seller put the pin, the part
 * has turned away: the track stops there.
 *
 * Runs once in the seller's browser when a pin is placed or moved. Buyers only read the result.
 * No DOM here (the editor turns frames into GrayFrame), so it is tested with made-up pictures.
 */

/** A frame as luminance, 0-255, row by row. */
export interface GrayFrame { w: number; h: number; px: Uint8Array | Uint8ClampedArray }

/** Where the pin sits on a frame, as fractions of the frame's width and height. */
export type PinPos = [number, number]

export interface TrackOptions {
  /** Each frame's index in the spin, walked in angle order. */
  cyclic?: boolean
  /** Best match below this: the part is lost (moved behind the car, or out of the picture). */
  minScore?: number
  /** Match against how the part looked where the pin was placed, below this: it has turned away. */
  minScoreFromStart?: number
  /** Seller corrections: frame index → position. The track passes through them. */
  anchors?: Map<number, PinPos>
  /** Patch half-sizes to try, in pixels of a TRACK_WIDTH-wide frame (tuning and tests). */
  radii?: number[]
}

export const TRACK_WIDTH = 480
// Tuned on a real 64-frame walk-round (a white SUV in a car park): a pin on the grille is followed
// for about 60 degrees either way, one on a headlight from the side view round to the front.
const MIN_SCORE = 0.5
const MIN_SCORE_FROM_START = 0.1
/** Patch half-sizes tried, smallest first; a patch with too little detail grows. Big enough to take
 *  in an edge or a badge next to a repeating pattern such as a grille mesh. */
const PATCH_RADII = [20, 28, 36]
const MIN_PATCH_SD = 7
/** How close to the picture's edge a tracked point may go (fraction of the side). */
const EDGE = 0.02

interface Template { r: number; s1: Float32Array; s2: Float32Array }

/** Mean and spread of the square of half-size r at (cx, cy), every `stride` pixels; null if it leaves the frame. */
function grab(f: GrayFrame, cx: number, cy: number, r: number, stride: number): Float32Array | null {
  if (cx - r < 0 || cy - r < 0 || cx + r >= f.w || cy + r >= f.h) return null
  const side = Math.floor((2 * r) / stride) + 1
  const out = new Float32Array(side * side)
  let k = 0
  for (let y = cy - r; y <= cy + r; y += stride) {
    const row = y * f.w
    for (let x = cx - r; x <= cx + r; x += stride) out[k++] = f.px[row + x]
  }
  return out
}

/** Zero mean, unit length: the dot product of two of these is their correlation (-1..1). */
function normalise(v: Float32Array): { v: Float32Array; sd: number } {
  let mean = 0
  for (let i = 0; i < v.length; i++) mean += v[i]
  mean /= v.length
  let ss = 0
  for (let i = 0; i < v.length; i++) { const d = v[i] - mean; v[i] = d; ss += d * d }
  const norm = Math.sqrt(ss)
  if (norm > 0) for (let i = 0; i < v.length; i++) v[i] /= norm
  return { v, sd: Math.sqrt(ss / v.length) }
}

/** The square around (cx, cy) as a template; null when it leaves the frame or (at the largest size) has no detail. */
export function templateAt(f: GrayFrame, cx: number, cy: number, radii = PATCH_RADII): Template | null {
  const x = Math.round(cx)
  const y = Math.round(cy)
  for (let i = 0; i < radii.length; i++) {
    const r = radii[i]
    const w1 = grab(f, x, y, r, 1)
    if (!w1) return null
    const n1 = normalise(w1)
    if (n1.sd < MIN_PATCH_SD && i < radii.length - 1) continue
    if (n1.sd < 1) return null // a flat colour: nothing to follow
    return { r, s1: n1.v, s2: normalise(grab(f, x, y, r, 2)!).v }
  }
  return null
}

function scoreAt(f: GrayFrame, t: Template, cx: number, cy: number, stride: 1 | 2): number {
  const w = grab(f, cx, cy, t.r, stride)
  if (!w) return -1
  const { v, sd } = normalise(w)
  if (sd < 1) return -1
  const tv = stride === 1 ? t.s1 : t.s2
  let dot = 0
  for (let i = 0; i < v.length; i++) dot += v[i] * tv[i]
  return dot
}

/** Best place for the template within `radius` pixels of (px, py): every position scored on half the
 *  template's pixels, the best few on all of them, then sub-pixel. */
export function matchNear(f: GrayFrame, t: Template, px: number, py: number, radius: number): { x: number; y: number; score: number } {
  const cx = Math.round(px)
  const cy = Math.round(py)
  let best = { x: cx, y: cy, score: -2 }
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const s = scoreAt(f, t, cx + dx, cy + dy, 2)
      if (s > best.score) best = { x: cx + dx, y: cy + dy, score: s }
    }
  }
  const c = best
  best = { ...c, score: -2 }
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const s = scoreAt(f, t, c.x + dx, c.y + dy, 1)
      if (s > best.score) best = { x: c.x + dx, y: c.y + dy, score: s }
    }
  }
  // Sub-pixel: the top of a parabola through the scores either side.
  const sub = (a: number, b: number, m: number) => {
    const den = a - 2 * m + b
    return den < 0 ? Math.max(-0.5, Math.min(0.5, (a - b) / (2 * den))) : 0
  }
  const ox = sub(scoreAt(f, t, best.x - 1, best.y, 1), scoreAt(f, t, best.x + 1, best.y, 1), best.score)
  const oy = sub(scoreAt(f, t, best.x, best.y - 1, 1), scoreAt(f, t, best.x, best.y + 1, 1), best.score)
  return { x: best.x + ox, y: best.y + oy, score: best.score }
}

const toPx = (f: GrayFrame, p: PinPos) => ({ x: p[0] * f.w, y: p[1] * f.h })
const toFrac = (f: GrayFrame, x: number, y: number): PinPos => [x / f.w, y / f.h]
const inside = (p: PinPos) => p[0] >= EDGE && p[0] <= 1 - EDGE && p[1] >= EDGE && p[1] <= 1 - EDGE

/** Walks one way from `start` (step +1 or -1), at most `maxSteps` frames. Answers frame index → position. */
function walk(frames: GrayFrame[], start: number, pos: PinPos, step: 1 | -1, maxSteps: number, o: Required<Pick<TrackOptions, 'cyclic' | 'minScore' | 'minScoreFromStart' | 'radii'>> & { anchors: Map<number, PinPos> }) {
  const n = frames.length
  const out = new Map<number, PinPos>()
  const at = (k: number) => (o.cyclic ? ((start + step * k) % n + n) % n : start + step * k)
  const exists = (k: number) => o.cyclic || (at(k) >= 0 && at(k) < n)

  let p = toPx(frames[start], pos)
  let tpl = templateAt(frames[start], p.x, p.y, o.radii)
  const first = tpl
  if (!tpl || !first) return out
  let vx = 0
  let vy = 0

  for (let k = 1; k <= maxSteps && exists(k); k++) {
    const i = at(k)
    const g = frames[i]
    const anchor = o.anchors.get(i)
    if (anchor) {
      // The seller put it here: trust that, and follow on from it.
      const a = toPx(g, anchor)
      out.set(i, anchor)
      vx = 0; vy = 0
      p = a
      tpl = templateAt(g, a.x, a.y, o.radii) ?? tpl
      continue
    }
    const radius = Math.max(16, Math.round(g.w * 0.05))
    const m = matchNear(g, tpl, p.x + vx, p.y + vy, radius)
    const pos2 = toFrac(g, m.x, m.y)
    const fromStart = scoreAt(g, first, Math.round(m.x), Math.round(m.y), 1)
    const lost = m.score < o.minScore || fromStart < o.minScoreFromStart || !inside(pos2)
    if (lost) {
      // Out of sight. A correction further on means the seller saw it again there: carry on from it.
      let next = -1
      for (let j = k + 1; j <= maxSteps && exists(j); j++) if (o.anchors.has(at(j))) { next = j; break }
      if (next < 0) break
      k = next - 1
      continue
    }
    out.set(i, pos2)
    // Damped velocity: the next frame is predicted from this move, without overshooting on a jitter.
    vx = 0.6 * (m.x - p.x)
    vy = 0.6 * (m.y - p.y)
    p = { x: m.x, y: m.y }
    tpl = templateAt(g, m.x, m.y, o.radii) ?? tpl
  }
  return out
}

/**
 * Where a pin placed at `pos` on frame `start` sits on every frame it can be followed to, both ways.
 * Frames left out are where the part is out of sight. A closed loop is shared out so the two
 * directions never pass each other.
 */
export function trackPin(frames: GrayFrame[], start: number, pos: PinPos, opts: TrackOptions = {}): Map<number, PinPos> {
  const n = frames.length
  const o = {
    cyclic: opts.cyclic ?? true,
    minScore: opts.minScore ?? MIN_SCORE,
    minScoreFromStart: opts.minScoreFromStart ?? MIN_SCORE_FROM_START,
    anchors: opts.anchors ?? new Map<number, PinPos>(),
    radii: opts.radii ?? PATCH_RADII,
  }
  const out = new Map<number, PinPos>([[start, pos]])
  if (n < 2 || start < 0 || start >= n) return out
  const half = o.cyclic ? Math.floor((n - 1) / 2) : n
  for (const [i, p] of walk(frames, start, pos, 1, o.cyclic ? n - 1 - half : n, o)) out.set(i, p)
  for (const [i, p] of walk(frames, start, pos, -1, half, o)) if (!out.has(i)) out.set(i, p)
  return out
}

/**
 * A full turn (the last frame comes back round to the first) or an arc (a half walk-round): only a
 * full turn is followed past the last frame onto the first.
 */
export function isClosedLoop(anglesSorted: number[]): boolean {
  const n = anglesSorted.length
  if (n < 3) return false
  const gaps: number[] = []
  for (let i = 1; i < n; i++) gaps.push(anglesSorted[i] - anglesSorted[i - 1])
  const wrap = 360 - anglesSorted[n - 1] + anglesSorted[0]
  const median = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)]
  return wrap <= Math.max(3 * median, 20)
}

/**
 * How solid a followed pin is on each frame: full in the middle of its run, fading on the last two
 * frames before the part goes out of sight. `has(i)`: the pin has a position on frame i.
 */
export function trackFade(n: number, has: (i: number) => boolean, cyclic: boolean): Map<number, number> {
  const out = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    if (!has(i)) continue
    let d = 1
    for (; d <= 2; d++) {
      const a = cyclic ? (i + d) % n : i + d
      const b = cyclic ? ((i - d) % n + n) % n : i - d
      const goneA = cyclic ? !has(a) : a >= n ? false : !has(a)
      const goneB = cyclic ? !has(b) : b < 0 ? false : !has(b)
      if (goneA || goneB) break
    }
    out.set(i, d === 1 ? 0.4 : d === 2 ? 0.75 : 1)
  }
  return out
}
