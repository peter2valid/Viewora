/**
 * Follows a pin on a car from frame to frame of a smooth spin, so it stays on the bonnet as the car
 * turns and disappears when the bonnet goes out of sight.
 *
 * Each step follows the detail around the pin (badge, grille, headlight and panel edges) with
 * optical flow and moves the pin with it (see pinFlow.ts), so a pin on a plain panel holds its
 * place and a hand-held walk-round that moves closer, further or tilts does not throw it off. The
 * track stops when the nearby detail can no longer be found, or when the surface has turned so far
 * that it is squashed edge-on.
 *
 * Runs once in the seller's browser when a pin is placed or moved. Buyers only read the result.
 * No DOM here (the editor turns frames into GrayFrame), so it is tested with made-up pictures and
 * was tuned on a real 63-frame walk-round of a white SUV in a car park: bonnet, wheel, rear badge.
 */

import { flowStep, pyramid, type Pyramid } from './pinFlow'

/** A frame as luminance, 0-255, row by row. */
export interface GrayFrame { w: number; h: number; px: Uint8Array | Uint8ClampedArray }

/** Where the pin sits on a frame, as fractions of the frame's width and height. */
export type PinPos = [number, number]

export interface TrackOptions {
  /** The frames make a full turn: the last one is followed on to the first. */
  cyclic?: boolean
  /** Seller corrections: frame index → position. The track passes through them. */
  anchors?: Map<number, PinPos>
}

export const TRACK_WIDTH = 480
/** Saved with each track; the editor re-follows pins made by an older tracker. */
export const TRACK_VERSION = 2
/** How close to the picture's edge a tracked point may go (fraction of the side). */
const EDGE = 0.02

const toPx = (f: GrayFrame, p: PinPos) => ({ x: p[0] * f.w, y: p[1] * f.h })
const toFrac = (f: GrayFrame, x: number, y: number): PinPos => [x / f.w, y / f.h]
const inside = (p: PinPos) => p[0] >= EDGE && p[0] <= 1 - EDGE && p[1] >= EDGE && p[1] <= 1 - EDGE

/** Share of the nearby detail (nearer counts more) that must be found again, or the part is out of sight. */
const MIN_KEPT = 0.1
/** …or a sudden fall below this share of its recent level (the part slipped out of sight in one frame). */
const KEPT_DROP = 0.3
/** The surface may squash sideways (turning away) to this share of how it looked at the pin's frame. */
const MIN_SQUASH = 0.28
/** How far round the pin to look for detail to follow, as a share of the frame's width. */
const LOOK = 0.14

interface WalkOpts { cyclic: boolean; anchors: Map<number, PinPos>; pyr: (i: number) => Pyramid }

/** Walks one way from `start` (step +1 or -1), at most `maxSteps` frames. Answers frame index → position. */
function walk(frames: GrayFrame[], start: number, pos: PinPos, step: 1 | -1, maxSteps: number, o: WalkOpts) {
  const n = frames.length
  const out = new Map<number, PinPos>()
  const at = (k: number) => (o.cyclic ? ((start + step * k) % n + n) % n : start + step * k)
  const exists = (k: number) => o.cyclic || (at(k) >= 0 && at(k) < n)

  let p = toPx(frames[start], pos)
  let prev = start
  let vx = 0
  let vy = 0
  // Local motion since the pin's frame: its sideways squash is the surface turning away.
  let C = { a: 1, b: 0, c: 0, d: 1 }
  let keptAvg = -1

  /** One step from the last frame the pin was seen on to frame i (`ahead` frames on); null when it is lost. */
  const attempt = (i: number, ahead: number) => {
    const g = frames[i]
    const r = Math.max(24, Math.round(g.w * LOOK))
    let f = flowStep(o.pyr(prev), o.pyr(i), p.x, p.y, r, vx * ahead, vy * ahead)
    // A plain panel (a white door) has little detail close by: look further out once.
    if (!f || f.inliers < 6) f = flowStep(o.pyr(prev), o.pyr(i), p.x, p.y, Math.round(r * 1.7), vx * ahead, vy * ahead, r) ?? f
    if (!f || f.kept < MIN_KEPT || f.inliers < 6 || (keptAvg > 0 && f.kept < KEPT_DROP * keptAvg)) return null
    const pos2 = toFrac(g, f.x, f.y)
    const m = f.m
    const C2 = { a: m.a * C.a + m.b * C.c, b: m.a * C.b + m.b * C.d, c: m.c * C.a + m.d * C.c, d: m.c * C.b + m.d * C.d }
    if (!inside(pos2) || Math.hypot(C2.a, C2.c) / Math.hypot(C2.b, C2.d) < MIN_SQUASH) return null
    return { f, pos2, C2, ahead }
  }

  for (let k = 1; k <= maxSteps && exists(k); k++) {
    let i = at(k)
    const anchor = o.anchors.get(i)
    if (anchor) {
      // The seller put it here: trust that, and follow on from it.
      out.set(i, anchor)
      p = toPx(frames[i], anchor)
      vx = 0; vy = 0
      C = { a: 1, b: 0, c: 0, d: 1 }
      keptAvg = -1
      prev = i
      continue
    }
    let s = attempt(i, 1)
    // A hand-held video can have one jolted or blurred frame: step over it (it stays hidden).
    if (!s && k + 1 <= maxSteps && exists(k + 1) && !o.anchors.has(at(k + 1))) {
      s = attempt(at(k + 1), 2)
      if (s) { k++; i = at(k) }
    }
    if (!s) {
      // Out of sight. A correction further on means the seller saw it again there: carry on from it.
      let next = -1
      for (let j = k + 1; j <= maxSteps && exists(j); j++) if (o.anchors.has(at(j))) { next = j; break }
      if (next < 0) break
      k = next - 1
      continue
    }
    const { f, pos2, C2 } = s
    out.set(i, pos2)
    C = C2
    keptAvg = keptAvg < 0 ? f.kept : 0.5 * keptAvg + 0.5 * f.kept
    // Damped velocity (per frame): the next frame's search starts from this move.
    vx = (0.6 * (f.x - p.x)) / s.ahead
    vy = (0.6 * (f.y - p.y)) / s.ahead
    p = { x: f.x, y: f.y }
    prev = i
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
    anchors: opts.anchors ?? new Map<number, PinPos>(),
    pyr: (() => {
      const cache = new Map<number, Pyramid>()
      return (i: number) => { let q = cache.get(i); if (!q) { q = pyramid(frames[i]); cache.set(i, q) } return q }
    })(),
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
