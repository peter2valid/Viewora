import test from 'node:test'
import assert from 'node:assert/strict'
import { trackCar, fillGaps, smoothLoop, planStabilization, type Box } from '../shared/utils/spinStabilize.ts'
import { crispBlend } from '../shared/utils/vehicleViews.ts'
import { spinTips, sameThumb } from '../shared/utils/videoFrames.ts'

/** A car walked round by hand: it bobs, drifts and grows/shrinks; a parked car sits far behind. */
function walk(n: number, opts: { missing?: number[]; decoy?: boolean } = {}): Box[][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const h = 0.42 + 0.08 * Math.cos(a) // closer at the front, further at the back
    const w = h * (1.6 + 0.9 * Math.abs(Math.sin(a))) // longer from the side
    const cx = 0.5 + 0.05 * Math.sin(a * 3)
    const cy = 0.5 + 0.03 * Math.cos(a * 2)
    const list: Box[] = []
    if (!opts.missing?.includes(i)) list.push({ x: cx - w / 2, y: cy - h / 2, w, h, score: i < 4 ? 0.08 : 0.8 })
    // A small car in the background, confidently detected, wandering across the frame.
    if (opts.decoy) list.push({ x: 0.1 + (i % 10) * 0.07, y: 0.3, w: 0.04, h: 0.04, score: 0.9 })
    return list
  })
}

test('trackCar follows the big car round the loop, not a confident little car behind it', () => {
  const t = trackCar(walk(64, { decoy: true }))
  assert.equal(t.length, 64)
  for (const p of t) assert.ok(p.h > 0.3, `followed the decoy (h=${p.h})`)
})

test('trackCar fills frames where the car was not found from its neighbours', () => {
  const t = trackCar(walk(32, { missing: [0, 1, 2, 31] }))
  assert.equal(t.length, 32)
  assert.equal(t.filter(p => !p.seen).length, 4)
  // A filled frame sits between its neighbours.
  assert.ok(Math.abs(t[1].h - (t[30].h + t[3].h) / 2) < 0.05)
})

test('fillGaps wraps round the loop', () => {
  const p = { cx: 0.5, cy: 0.5, w: 0.5, h: 0.4, seen: true }
  const out = fillGaps([null, { ...p, h: 0.4 }, null, { ...p, h: 0.6 }])
  assert.equal(out[2].h, 0.5)
  assert.equal(out[0].h, 0.5) // between frame 3 (0.6) and frame 1 (0.4), across the end of the lap
})

test('smoothLoop keeps a constant and evens out jitter', () => {
  assert.deepEqual(smoothLoop([1, 1, 1, 1, 1], 1.5).map(v => +v.toFixed(6)), [1, 1, 1, 1, 1])
  const jitter = Array.from({ length: 40 }, (_, i) => 0.5 + (i % 2 ? 0.02 : -0.02))
  const s = smoothLoop(jitter, 1.5)
  assert.ok(Math.max(...s) - Math.min(...s) < 0.01)
})

test('planStabilization puts the car at one size and centre in every frame', () => {
  const cands = walk(64)
  const plan = planStabilization(cands, { maxZoom: 1.6, sigma: 0 })
  assert.equal(plan.usable, true)
  assert.equal(plan.crops.length, 64)
  const sizes: number[] = []
  plan.crops.forEach((k, i) => {
    assert.ok(k.x >= 0 && k.y >= 0 && k.x + k.w <= 1 + 1e-9 && k.y + k.h <= 1 + 1e-9, 'crop inside the frame')
    assert.ok(k.w >= 1 / 1.6 - 1e-9 && k.w <= 1)
    const b = cands[i][0]
    sizes.push(b.h / k.h)
  })
  // As recorded the car's height varies by ~40%; after, by a few percent at most.
  assert.ok(Math.max(...sizes) / Math.min(...sizes) < 1.05, `sizes ${Math.min(...sizes)}..${Math.max(...sizes)}`)
  assert.ok(plan.driftAfter < plan.driftBefore / 2)
})

test('planStabilization leaves the video as recorded when the car is rarely found', () => {
  const plan = planStabilization(walk(20, { missing: Array.from({ length: 14 }, (_, i) => i + 3) }))
  assert.equal(plan.usable, false)
  assert.ok(plan.crops.every(k => k.x === 0 && k.y === 0 && k.w === 1 && k.h === 1))
})

test('planStabilization with no detections at all is not usable', () => {
  const plan = planStabilization(Array.from({ length: 10 }, () => []))
  assert.equal(plan.usable, false)
})

test('crispBlend shows one sharp frame at each end of a step and dissolves in the middle', () => {
  assert.equal(crispBlend(0), 0)
  assert.equal(crispBlend(0.25), 0)
  assert.equal(crispBlend(0.5), 0.5)
  assert.equal(crispBlend(0.75), 1)
  assert.equal(crispBlend(1), 1)
  let prev = 0
  for (let f = 0; f <= 1; f += 0.01) { const a = crispBlend(f); assert.ok(a >= prev - 1e-9); prev = a }
  assert.ok(Math.abs(crispBlend(0.3, 1) - 0.216) < 1e-3) // width 1: a plain smooth mix
})

test('spinTips gives plain advice only when it applies', () => {
  const good = { centred: true, carFound: 0.97, sizeChange: 0.1, duration: 30, shortEdge: 2160 }
  assert.deepEqual(spinTips(good), [])
  const tips = spinTips({ centred: false, carFound: 0.3, sizeChange: 0.4, duration: 9, shortEdge: 480 })
  assert.equal(tips.length, 4)
  assert.match(tips.join(' '), /whole car/)
  assert.match(tips.join(' '), /same distance/)
  assert.match(tips.join(' '), /quickly \(9 s\)/)
  assert.match(tips.join(' '), /480p/)
})

test('sameThumb spots a repeated frame but not a moved one', () => {
  const a = Array.from({ length: 100 }, (_, i) => (i * 7) % 255)
  assert.equal(sameThumb(a, a.map(v => v + (v % 3 === 0 ? 1 : 0))), true)
  assert.equal(sameThumb(a, a.map(v => (v + 20) % 255)), false)
})
