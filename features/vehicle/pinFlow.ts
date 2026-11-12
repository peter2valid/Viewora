/**
 * One step of following a pin between two frames: optical flow on the detail around it.
 *
 * A pin on a car usually sits on a plain panel (a white bonnet) with nothing to latch on to, and
 * a hand-held walk-round also moves closer and further and tilts. So instead of looking for the
 * patch under the pin, we follow the detailed points around it (badge, grille, headlight edges,
 * panel gaps) with pyramidal Lucas–Kanade, keep the ones that track back to where they started,
 * and fit the local motion (an affine map: move, scale, tilt, squash) with RANSAC, trusting points
 * near the pin most. The pin moves with that map. When most of the nearby detail can no longer be
 * found, the part has gone out of sight.
 *
 * No DOM; tested with made-up pictures and tuned on a real walk-round.
 */
import type { GrayFrame } from './pinTrack'

export interface Level { w: number; h: number; img: Float32Array; gx: Float32Array; gy: Float32Array }
export type Pyramid = Level[]

/** A 2-D affine map: x' = a·x + b·y + tx, y' = c·x + d·y + ty. */
export interface Affine { a: number; b: number; c: number; d: number; tx: number; ty: number }

const LEVELS = 3
const WIN = 7                // LK window half-size (15 × 15)
const LK_ITERS = 12
const FB_MAX = 0.8           // px at full size: forward then back must return this close
const RANSAC_ITERS = 160
const INLIER_PX = 1.5
const MAX_FEATURES = 90
const MIN_DIST = 5

function level(w: number, h: number, img: Float32Array): Level {
  const gx = new Float32Array(w * h)
  const gy = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      gx[i] = (img[i + 1] - img[i - 1]) / 2
      gy[i] = (img[i + w] - img[i - w]) / 2
    }
  }
  return { w, h, img, gx, gy }
}

export function pyramid(f: GrayFrame): Pyramid {
  const base = new Float32Array(f.w * f.h)
  for (let i = 0; i < base.length; i++) base[i] = f.px[i]
  const out: Pyramid = [level(f.w, f.h, base)]
  for (let l = 1; l < LEVELS; l++) {
    const p = out[l - 1]
    const w = Math.floor(p.w / 2)
    const h = Math.floor(p.h / 2)
    if (w < 24 || h < 24) break
    const img = new Float32Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = 2 * y * p.w + 2 * x
        img[y * w + x] = (p.img[i] + p.img[i + 1] + p.img[i + p.w] + p.img[i + p.w + 1]) / 4
      }
    }
    out.push(level(w, h, img))
  }
  return out
}

function sample(a: Float32Array, w: number, x: number, y: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const i = y0 * w + x0
  return (a[i] * (1 - fx) + a[i + 1] * fx) * (1 - fy) + (a[i + w] * (1 - fx) + a[i + w + 1] * fx) * fy
}

/** Corners worth following within `r` px of (cx, cy): strongest first, at least MIN_DIST apart. */
export function corners(l: Level, cx: number, cy: number, r: number): Array<{ x: number; y: number }> {
  const cand: Array<{ x: number; y: number; s: number }> = []
  const m = WIN + 2
  let best = 0
  const x0 = Math.max(m, Math.round(cx - r))
  const x1 = Math.min(l.w - m - 1, Math.round(cx + r))
  const y0 = Math.max(m, Math.round(cy - r))
  const y1 = Math.min(l.h - m - 1, Math.round(cy + r))
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue
      let sxx = 0, sxy = 0, syy = 0
      for (let v = -2; v <= 2; v++) {
        for (let u = -2; u <= 2; u++) {
          const i = (y + v) * l.w + x + u
          const gx = l.gx[i]
          const gy = l.gy[i]
          sxx += gx * gx; sxy += gx * gy; syy += gy * gy
        }
      }
      const s = (sxx + syy) / 2 - Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy)
      if (s > best) best = s
      cand.push({ x, y, s })
    }
  }
  // Weak texture (a plain panel, sensor noise) is not worth following.
  const floor = Math.max(best * 0.04, 25 * 6)
  cand.sort((p, q) => q.s - p.s)
  const out: Array<{ x: number; y: number }> = []
  for (const c of cand) {
    if (c.s < floor) break
    if (out.some(o => (o.x - c.x) ** 2 + (o.y - c.y) ** 2 < MIN_DIST * MIN_DIST)) continue
    out.push({ x: c.x, y: c.y })
    if (out.length >= MAX_FEATURES) break
  }
  return out
}

/** Pyramidal Lucas–Kanade: where (x, y) in `A` went in `B`, starting from the guess (gx, gy). */
export function lk(A: Pyramid, B: Pyramid, x: number, y: number, gx = 0, gy = 0): { x: number; y: number } | null {
  const top = Math.min(A.length, B.length) - 1
  let dx = gx / 2 ** top
  let dy = gy / 2 ** top
  const n = (2 * WIN + 1) ** 2
  const I = new Float32Array(n)
  const IX = new Float32Array(n)
  const IY = new Float32Array(n)
  for (let L = top; L >= 0; L--) {
    const a = A[L]
    const b = B[L]
    const s = 2 ** L
    const px = x / s
    const py = y / s
    if (px - WIN < 1 || py - WIN < 1 || px + WIN >= a.w - 2 || py + WIN >= a.h - 2) return null
    let gxx = 0, gxy = 0, gyy = 0, k = 0
    for (let v = -WIN; v <= WIN; v++) {
      for (let u = -WIN; u <= WIN; u++, k++) {
        I[k] = sample(a.img, a.w, px + u, py + v)
        const ix = sample(a.gx, a.w, px + u, py + v)
        const iy = sample(a.gy, a.w, px + u, py + v)
        IX[k] = ix; IY[k] = iy
        gxx += ix * ix; gxy += ix * iy; gyy += iy * iy
      }
    }
    const det = gxx * gyy - gxy * gxy
    if (det < 1e-3 * n) return null
    let vx = 0, vy = 0
    for (let it = 0; it < LK_ITERS; it++) {
      const qx = px + dx + vx
      const qy = py + dy + vy
      if (qx - WIN < 1 || qy - WIN < 1 || qx + WIN >= b.w - 2 || qy + WIN >= b.h - 2) return null
      let bx = 0, by = 0
      k = 0
      for (let v = -WIN; v <= WIN; v++) {
        for (let u = -WIN; u <= WIN; u++, k++) {
          const e = I[k] - sample(b.img, b.w, qx + u, qy + v)
          bx += e * IX[k]; by += e * IY[k]
        }
      }
      const nx = (gyy * bx - gxy * by) / det
      const ny = (gxx * by - gxy * bx) / det
      vx += nx; vy += ny
      if (nx * nx + ny * ny < 1e-4) break
    }
    dx += vx; dy += vy
    if (L > 0) { dx *= 2; dy *= 2 }
  }
  return { x: x + dx, y: y + dy }
}

/** Weighted least-squares affine through point pairs. */
function fitAffine(src: Float64Array, dst: Float64Array, w: Float64Array, idx: number[]): Affine | null {
  // Normal equations for [a b tx] and [c d ty] share the same 3×3 matrix.
  let sxx = 0, sxy = 0, sx = 0, syy = 0, sy = 0, s1 = 0
  let ux = 0, uy = 0, u1 = 0, vx = 0, vy = 0, v1 = 0
  for (const i of idx) {
    const x = src[2 * i], y = src[2 * i + 1], X = dst[2 * i], Y = dst[2 * i + 1], k = w[i]
    sxx += k * x * x; sxy += k * x * y; sx += k * x; syy += k * y * y; sy += k * y; s1 += k
    ux += k * x * X; uy += k * y * X; u1 += k * X
    vx += k * x * Y; vy += k * y * Y; v1 += k * Y
  }
  const M = [sxx, sxy, sx, sxy, syy, sy, sx, sy, s1]
  const det = M[0] * (M[4] * M[8] - M[5] * M[7]) - M[1] * (M[3] * M[8] - M[5] * M[6]) + M[2] * (M[3] * M[7] - M[4] * M[6])
  if (Math.abs(det) < 1e-9) return null
  const solve = (r0: number, r1: number, r2: number) => {
    const d0 = r0 * (M[4] * M[8] - M[5] * M[7]) - M[1] * (r1 * M[8] - M[5] * r2) + M[2] * (r1 * M[7] - M[4] * r2)
    const d1 = M[0] * (r1 * M[8] - M[5] * r2) - r0 * (M[3] * M[8] - M[5] * M[6]) + M[2] * (M[3] * r2 - r1 * M[6])
    const d2 = M[0] * (M[4] * r2 - r1 * M[7]) - M[1] * (M[3] * r2 - r1 * M[6]) + r0 * (M[3] * M[7] - M[4] * M[6])
    return [d0 / det, d1 / det, d2 / det]
  }
  const [a, b, tx] = solve(ux, uy, u1)
  const [c, d, ty] = solve(vx, vy, v1)
  return { a, b, c, d, tx, ty }
}

export const applyAffine = (m: Affine, x: number, y: number) => ({ x: m.a * x + m.b * y + m.tx, y: m.c * x + m.d * y + m.ty })

export interface FlowStep {
  x: number
  y: number
  /** The local motion this step, about the pin. */
  m: Affine
  /** Share (0..1, nearer points count more) of the detail around the pin that was found again. */
  kept: number
  /** How many points agree with the motion. */
  inliers: number
}

/**
 * Moves the pin at (px, py) from frame A to frame B. Null when there is not enough detail around
 * it to follow at all. `r`: how far around the pin to look for detail, in px; `near`: the distance
 * that sets how much more nearby points count (defaults to r).
 */
export function flowStep(A: Pyramid, B: Pyramid, px: number, py: number, r: number, gx = 0, gy = 0, near = r): FlowStep | null {
  const pts = corners(A[0], px, py, r)
  if (pts.length < 6) return null
  const sigma = near / 2.5
  const weight = (x: number, y: number) => Math.exp(-((x - px) ** 2 + (y - py) ** 2) / (2 * sigma * sigma))
  const src: number[] = []
  const dst: number[] = []
  const wts: number[] = []
  let total = 0
  for (const p of pts) {
    const wt = weight(p.x, p.y)
    total += wt
    const f = lk(A, B, p.x, p.y, gx, gy)
    if (!f) continue
    const b = lk(B, A, f.x, f.y, p.x - f.x, p.y - f.y)
    if (!b || (b.x - p.x) ** 2 + (b.y - p.y) ** 2 > FB_MAX * FB_MAX) continue
    src.push(p.x, p.y); dst.push(f.x, f.y); wts.push(wt)
  }
  const n = wts.length
  if (n < 4 || total <= 0) return { x: px, y: py, m: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }, kept: 0, inliers: n }
  const S = Float64Array.from(src), D = Float64Array.from(dst), Wt = Float64Array.from(wts)

  // RANSAC: three points make a hypothesis; the one carrying the most (proximity-weighted) points wins.
  let seed = 12345
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
  let bestIdx: number[] = []
  let bestMass = -1
  const all = Array.from({ length: n }, (_, i) => i)
  const ones = new Float64Array(n).fill(1)
  const inliersOf = (m: Affine) => {
    const idx: number[] = []
    let mass = 0
    for (let i = 0; i < n; i++) {
      const q = applyAffine(m, S[2 * i], S[2 * i + 1])
      if ((q.x - D[2 * i]) ** 2 + (q.y - D[2 * i + 1]) ** 2 <= INLIER_PX * INLIER_PX) { idx.push(i); mass += Wt[i] }
    }
    return { idx, mass }
  }
  for (let it = 0; it < RANSAC_ITERS; it++) {
    const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n), k = Math.floor(rnd() * n)
    if (i === j || j === k || i === k) continue
    const m = fitAffine(S, D, ones, [i, j, k])
    if (!m) continue
    const det = m.a * m.d - m.b * m.c
    if (!(det > 0.6 && det < 1.6)) continue
    const r2 = inliersOf(m)
    if (r2.mass > bestMass) { bestMass = r2.mass; bestIdx = r2.idx }
  }
  if (bestIdx.length < 4) bestIdx = all
  // Refine on the inliers, nearer points counting more; once more with the refined set.
  let m = fitAffine(S, D, Wt, bestIdx)
  if (!m) return null
  const again = inliersOf(m)
  if (again.idx.length >= 4) m = fitAffine(S, D, Wt, again.idx) ?? m
  const fin = inliersOf(m)
  const q = applyAffine(m, px, py)
  return { x: q.x, y: q.y, m, kept: fin.mass / total, inliers: fin.idx.length }
}
