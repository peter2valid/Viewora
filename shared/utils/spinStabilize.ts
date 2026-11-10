// Keeps the car in the same place and at the same size in every frame of a video spin.
//
// A walk-around filmed by hand drifts: the car slides left and right, the camera bobs, and the
// car grows and shrinks as you get closer or further away. Played as a spin that reads as jumping
// between photos, and blending two neighbours shows a double image. Here we take the car's box in
// each frame (from an object detector), follow the one car all the way round, fill gaps, smooth out
// detector jitter, and work out a crop per frame that puts the car at one centre and one size.
//
// Pure maths, no DOM: the detector runs elsewhere (browser), this is unit-tested.

/** A box in fractions of the frame (0..1), with the detector's confidence. */
export interface Box { x: number; y: number; w: number; h: number; score: number }

/** The followed car in one frame: centre and size in fractions, and whether it was seen or filled in. */
export interface TrackPoint { cx: number; cy: number; w: number; h: number; seen: boolean }

/** Where to cut each output frame from its source frame, in fractions of the source (may be > 1 wide crops are clamped). */
export interface Crop { x: number; y: number; w: number; h: number }

export interface StabilizePlan {
  track: TrackPoint[]
  crops: Crop[]
  /** How much we zoom in relative to the full frame (1 = no zoom). */
  zoom: number
  /** Share of frames where the car was actually detected (the rest are filled in). */
  coverage: number
  /** How much the car moved around before and after, as a share of the frame (for the owner and for tests). */
  driftBefore: number
  driftAfter: number
  /** False when we could not follow the car well enough: use the frames as recorded. */
  usable: boolean
}

const wrap = (i: number, n: number) => ((i % n) + n) % n

/**
 * Follows one car through a loop of frames. `candidates[i]` are the boxes found in frame i.
 * `aspect` is frame width / height (boxes are fractions, so distances need it to be fair).
 */
export function trackCar(candidates: Box[][], aspect = 16 / 9): TrackPoint[] {
  const n = candidates.length
  if (!n) return []
  // Seed: the most confident box that is big and near the middle (the car being sold, not one parked behind).
  let seed = -1
  let seedBox: Box | null = null
  let seedScore = -Infinity
  candidates.forEach((list, i) => {
    for (const b of list) {
      const off = Math.hypot((b.x + b.w / 2 - 0.5) * aspect, b.y + b.h / 2 - 0.5)
      const s = b.score * 2 + b.w * b.h * 3 - off
      if (s > seedScore) { seedScore = s; seed = i; seedBox = b }
    }
  })
  const out: (TrackPoint | null)[] = new Array(n).fill(null)
  if (!seedBox) return []
  const toPoint = (b: Box): TrackPoint => ({ cx: b.x + b.w / 2, cy: b.y + b.h / 2, w: b.w, h: b.h, seen: true })
  out[seed] = toPoint(seedBox)

  // Walk both ways round from the seed. Each step accepts only a box near the last one and of a
  // similar height (a car's height in the picture changes slowly; its width changes with the angle).
  const walk = (dir: 1 | -1) => {
    let last = out[seed]!
    let gap = 0
    const res: (TrackPoint | null)[] = new Array(n).fill(null)
    for (let k = 1; k < n; k++) {
      const i = wrap(seed + dir * k, n)
      const reach = 0.18 + 0.06 * gap
      let best: TrackPoint | null = null
      let bestCost = Infinity
      for (const b of candidates[i]) {
        const p = toPoint(b)
        const d = Math.hypot((p.cx - last.cx) * aspect, p.cy - last.cy) / Math.max(last.h, 0.05)
        const sizeJump = Math.abs(Math.log(p.h / last.h))
        if (d > reach / Math.max(last.h, 0.05) || sizeJump > 0.35 + 0.1 * gap) continue
        const cost = d + sizeJump * 3 - b.score
        if (cost < bestCost) { bestCost = cost; best = p }
      }
      res[i] = best
      if (best) { last = best; gap = 0 } else gap++
    }
    return res
  }
  const fwd = walk(1)
  const back = walk(-1)
  // Each frame takes the pass that reached it sooner (fewer steps from the seed, so less chance of drifting).
  for (let i = 0; i < n; i++) {
    if (i === seed) continue
    const kf = wrap(i - seed, n)
    const kb = wrap(seed - i, n)
    out[i] = (kf <= kb ? fwd[i] ?? back[i] : back[i] ?? fwd[i]) ?? null
  }
  return fillGaps(out)
}

/** Fills frames where the car was not found by blending the nearest found frames either side (round the loop). */
export function fillGaps(points: (TrackPoint | null)[]): TrackPoint[] {
  const n = points.length
  const known = points.map((p, i) => (p ? i : -1)).filter(i => i >= 0)
  if (!known.length) return []
  return points.map((p, i) => {
    if (p) return p
    let a = i
    let b = i
    while (!points[wrap(a, n)]) a--
    while (!points[wrap(b, n)]) b++
    const pa = points[wrap(a, n)]!
    const pb = points[wrap(b, n)]!
    const t = b === a ? 0 : (i - a) / (b - a)
    const mix = (u: number, v: number) => u + (v - u) * t
    return { cx: mix(pa.cx, pb.cx), cy: mix(pa.cy, pb.cy), w: mix(pa.w, pb.w), h: mix(pa.h, pb.h), seen: false }
  })
}

/** Gaussian smoothing round the loop: removes the detector's frame-to-frame jitter, keeps real movement. */
export function smoothLoop(values: number[], sigma: number): number[] {
  const n = values.length
  if (n < 3 || sigma <= 0) return [...values]
  const r = Math.min(Math.floor(n / 2), Math.ceil(sigma * 3))
  const k = Array.from({ length: 2 * r + 1 }, (_, j) => Math.exp(-((j - r) ** 2) / (2 * sigma * sigma)))
  const sum = k.reduce((a, b) => a + b, 0)
  return values.map((_, i) => k.reduce((acc, kj, j) => acc + kj * values[wrap(i + j - r, n)], 0) / sum)
}

function median(v: number[]): number {
  const s = [...v].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Spread of the car's centre and size: mean distance from their average, in frame fractions. */
export function drift(points: Array<{ cx: number; cy: number; h: number }>, aspect = 16 / 9): number {
  if (!points.length) return 0
  const mx = points.reduce((a, p) => a + p.cx, 0) / points.length
  const my = points.reduce((a, p) => a + p.cy, 0) / points.length
  const mh = points.reduce((a, p) => a + p.h, 0) / points.length
  return points.reduce((a, p) => a + Math.hypot((p.cx - mx) * aspect, p.cy - my) + Math.abs(p.h - mh), 0) / points.length
}

export interface PlanOptions {
  aspect?: number
  /** Frames' smoothing, in frames (higher = steadier, slower to follow real changes). */
  sigma?: number
  /** Never zoom in more than this (each frame keeps at least 1/maxZoom of the source). */
  maxZoom?: number
  /** Share of frames that must be really seen to trust the track. */
  minCoverage?: number
  /** Extra room around the car (1 = the biggest car fills the frame height exactly as recorded). */
  margin?: number
}

/**
 * The crop for each frame. All crops have the output's shape; the car sits at the same point and at
 * the same height in every one. Crops that would run off the source are slid back inside (the car
 * is then a little off-centre in that frame, never a black edge).
 */
export function planStabilization(candidates: Box[][], opts: PlanOptions = {}): StabilizePlan {
  const aspect = opts.aspect ?? 16 / 9
  const sigma = opts.sigma ?? 1.5
  const maxZoom = opts.maxZoom ?? 1.6
  const minCoverage = opts.minCoverage ?? 0.6
  const n = candidates.length
  const identity: Crop = { x: 0, y: 0, w: 1, h: 1 }
  const raw = trackCar(candidates, aspect)
  const coverage = raw.length ? raw.filter(p => p.seen).length / n : 0
  if (raw.length !== n || coverage < minCoverage) {
    return { track: raw, crops: new Array(n).fill(identity), zoom: 1, coverage, driftBefore: drift(raw, aspect), driftAfter: drift(raw, aspect), usable: false }
  }

  // Size by height: a car is about as tall from every side, while its width changes as it turns.
  const cx = smoothLoop(raw.map(p => p.cx), sigma)
  const cy = smoothLoop(raw.map(p => p.cy), sigma)
  const h = smoothLoop(raw.map(p => p.h), sigma)
  const track = raw.map((p, i) => ({ ...p, cx: cx[i], cy: cy[i], h: h[i] }))

  // Target: the car centred across, at its usual height down the frame, and at one size: the
  // car's output height T. Frame i is cut at size h[i] / T (a share of the source), so a frame where
  // the car looks small is cut tighter. T is near the largest car height (plus a margin, so there is
  // room to centre the car without running off the picture); cuts never go below 1 / maxZoom.
  const margin = opts.margin ?? 1.12
  const sortedH = [...h].sort((a, b) => a - b)
  const T = Math.min(0.95, sortedH[Math.min(n - 1, Math.floor(n * 0.95))] * margin)
  const targetY = Math.min(0.62, Math.max(0.42, median(cy)))
  const crops: Crop[] = h.map((hi, i) => {
    const size = Math.min(1, Math.max(1 / maxZoom, hi / T))
    const x = Math.min(1 - size, Math.max(0, cx[i] - size / 2))
    const y = Math.min(1 - size, Math.max(0, cy[i] - targetY * size))
    return { x, y, w: size, h: size }
  })
  const zoomOut = 1 / median(crops.map(c => c.w))
  const after = raw.map((p, i) => ({
    cx: (p.cx - crops[i].x) / crops[i].w,
    cy: (p.cy - crops[i].y) / crops[i].h,
    h: p.h / crops[i].h,
  }))
  return { track, crops, zoom: zoomOut, coverage, driftBefore: drift(raw, aspect), driftAfter: drift(after, aspect), usable: true }
}
