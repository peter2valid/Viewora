// Run with: node --test tests/pinTrack.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { trackPin, isClosedLoop, trackFade, type GrayFrame } from '../features/vehicle/pinTrack.ts'

// Made-up spin: a still, noisy background with a textured "part" (a 70 px square) that slides
// right by `step` px a frame. From frame `goneAt` on, the part is gone (as if it turned behind the car).
function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
}
const W = 480
const H = 270
const PART = 70
function makeSpin(n: number, step: number, goneAt = Infinity, reappearAt = Infinity): GrayFrame[] {
  const bgR = rng(1)
  const bg = new Uint8Array(W * H)
  for (let i = 0; i < bg.length; i++) bg[i] = 60 + Math.floor(bgR() * 120)
  const partR = rng(7)
  const part = new Uint8Array(PART * PART)
  for (let i = 0; i < part.length; i++) part[i] = Math.floor(partR() * 255)
  const frames: GrayFrame[] = []
  for (let k = 0; k < n; k++) {
    const px = new Uint8Array(bg)
    const visible = k < goneAt || k >= reappearAt
    if (visible) {
      const x0 = 100 + k * step
      for (let y = 0; y < PART; y++) for (let x = 0; x < PART; x++) {
        const X = x0 + x
        if (X >= 0 && X < W) px[(100 + y) * W + X] = part[y * PART + x]
      }
    }
    frames.push({ w: W, h: H, px })
  }
  return frames
}
const centre = (k: number, step: number): [number, number] => [(100 + k * step + PART / 2) / W, (100 + PART / 2) / H]

test('trackPin: follows a part as it moves frame to frame', () => {
  const frames = makeSpin(10, 7)
  const out = trackPin(frames, 0, centre(0, 7), { cyclic: false })
  assert.equal(out.size, 10)
  for (const [k, p] of out) {
    const want = centre(k, 7)
    assert.ok(Math.abs(p[0] - want[0]) * W < 1.5, `frame ${k} x off by ${(p[0] - want[0]) * W}px`)
    assert.ok(Math.abs(p[1] - want[1]) * H < 1.5, `frame ${k} y`)
  }
})

test('trackPin: stops when the part goes out of sight', () => {
  const frames = makeSpin(12, 6, 6)
  const out = trackPin(frames, 0, centre(0, 6), { cyclic: false })
  assert.deepEqual([...out.keys()].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5])
})

test('trackPin: follows both ways from a frame in the middle', () => {
  const frames = makeSpin(9, 5)
  const out = trackPin(frames, 4, centre(4, 5), { cyclic: false })
  assert.equal(out.size, 9)
  assert.ok(Math.abs(out.get(0)![0] - centre(0, 5)[0]) * W < 1.5)
})

test('trackPin: a seller correction past a gap carries the track on', () => {
  const frames = makeSpin(12, 6, 5, 8)
  const out = trackPin(frames, 0, centre(0, 6), { cyclic: false, anchors: new Map([[8, centre(8, 6)]]) })
  assert.ok(!out.has(5) && !out.has(6) && !out.has(7), 'hidden while gone')
  assert.ok(out.has(8) && out.has(11), 'back from the correction on')
  assert.ok(Math.abs(out.get(11)![0] - centre(11, 6)[0]) * W < 1.5)
})

test('trackPin: a flat colour has nothing to follow, so the pin stays on its own frame', () => {
  const flat: GrayFrame[] = Array.from({ length: 5 }, () => ({ w: W, h: H, px: new Uint8Array(W * H).fill(200) }))
  const out = trackPin(flat, 2, [0.5, 0.5])
  assert.deepEqual([...out.keys()], [2])
})

test('trackPin: a full turn is shared between the two directions', () => {
  const frames = makeSpin(8, 0) // the part never moves: followed everywhere
  const out = trackPin(frames, 0, centre(0, 0), { cyclic: true })
  assert.equal(out.size, 8)
})

test('isClosedLoop: a full turn wraps, a half walk-round does not', () => {
  assert.equal(isClosedLoop(Array.from({ length: 64 }, (_, i) => i * 5.625)), true)
  assert.equal(isClosedLoop(Array.from({ length: 32 }, (_, i) => i * 5.625)), false)
  assert.equal(isClosedLoop([0, 10]), false)
})

test('trackFade: solid in the middle, fading over the last two frames before the part is gone', () => {
  const on = new Set([3, 4, 5, 6, 7, 8])
  const f = trackFade(12, i => on.has(i), true)
  assert.equal(f.get(3), 0.4)
  assert.equal(f.get(4), 0.75)
  assert.equal(f.get(5), 1)
  assert.equal(f.get(8), 0.4)
  assert.equal(f.has(2), false)
  // An arc's first and last frames are the ends of the spin, not the part leaving: no fade there.
  const all = trackFade(5, () => true, false)
  assert.deepEqual([...all.values()], [1, 1, 1, 1, 1])
})

// A textured panel drawn at any scale: smooth bumps, so it stays the same picture when resized.
function panelFrames(n: number, opts: { step: number; grow: number; plainHole?: number }): { frames: GrayFrame[]; at: (k: number) => [number, number] } {
  const cx0 = 160, cy = 135
  const tex = (u: number, v: number) => 128 + 40 * Math.sin(u * 0.21 + 1.3 * Math.sin(v * 0.07)) + 35 * Math.cos(v * 0.19 - 0.9 * Math.sin(u * 0.05)) + 20 * Math.sin((u + v) * 0.37)
  const frames: GrayFrame[] = []
  for (let k = 0; k < n; k++) {
    const s = 1 + opts.grow * k
    const cx = cx0 + opts.step * k
    const px = new Uint8Array(W * H).fill(90)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = (x - cx) / s, v = (y - cy) / s
      if (Math.abs(u) > 80 || Math.abs(v) > 80) continue
      const plain = opts.plainHole && Math.abs(u) < opts.plainHole && Math.abs(v) < opts.plainHole
      px[y * W + x] = plain ? 235 : Math.max(0, Math.min(255, Math.round(tex(u, v))))
    }
    frames.push({ w: W, h: H, px })
  }
  return { frames, at: k => [(cx0 + opts.step * k) / W, cy / H] }
}

test('trackPin: a pin on a plain patch is carried by the detail around it', () => {
  const { frames, at } = panelFrames(8, { step: 6, grow: 0, plainHole: 22 })
  const out = trackPin(frames, 0, at(0), { cyclic: false })
  assert.equal(out.size, 8)
  for (const [k, p] of out) assert.ok(Math.abs(p[0] - at(k)[0]) * W < 1.5, `frame ${k} x off by ${(p[0] - at(k)[0]) * W}px`)
})

test('trackPin: follows a part that grows as the camera comes closer', () => {
  const { frames, at } = panelFrames(8, { step: 5, grow: 0.03 })
  const out = trackPin(frames, 0, at(0), { cyclic: false })
  assert.equal(out.size, 8)
  for (const [k, p] of out) {
    assert.ok(Math.abs(p[0] - at(k)[0]) * W < 1.5, `frame ${k} x off by ${(p[0] - at(k)[0]) * W}px`)
    assert.ok(Math.abs(p[1] - at(k)[1]) * H < 1.5, `frame ${k} y`)
  }
})
