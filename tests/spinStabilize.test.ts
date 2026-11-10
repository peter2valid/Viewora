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
    const w = h * (1.3 + 0.6 * Math.abs(Math.sin(a))) // longer from the side (still inside the picture)
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
  assert.equal(tips.length, 3) // no size tip: the car was hardly followed, so its "size" means nothing
  assert.match(tips.join(' '), /whole car/)
  assert.match(tips.join(' '), /quickly \(9 s\)/)
  assert.match(tips.join(' '), /480p/)
  const uneven = spinTips({ centred: false, carFound: 0.9, sizeChange: 0.4, duration: 30, shortEdge: 1080 })
  assert.match(uneven.join(' '), /same distance all the way round/)
})

test('sameThumb spots a repeated frame but not a moved one', () => {
  const a = Array.from({ length: 100 }, (_, i) => (i * 7) % 255)
  assert.equal(sameThumb(a, a.map(v => v + (v % 3 === 0 ? 1 : 0))), true)
  assert.equal(sameThumb(a, a.map(v => (v + 20) % 255)), false)
})

test('the car finder loads the WebAssembly of the installed MediaPipe version, from our own site', async () => {
  const fs = await import('node:fs')
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const version = pkg.dependencies['@mediapipe/tasks-vision']
  assert.match(version, /^\d+\.\d+\.\d+$/, 'pin an exact version: the WebAssembly folder name depends on it')
  const src = fs.readFileSync(new URL('../shared/utils/carDetector.ts', import.meta.url), 'utf8')
  const config = fs.readFileSync(new URL('../nuxt.config.ts', import.meta.url), 'utf8')
  assert.ok(src.includes(`'/mediapipe/wasm-${version}'`), 'carDetector.ts WASM_BASE matches package.json')
  assert.ok(config.includes(`baseURL: '/mediapipe/wasm-${version}'`), 'nuxt.config.ts publicAssets matches package.json')
  assert.ok(!/https?:\/\//.test(src.split('\n').filter(l => /WASM_BASE =|MODEL_URL =/.test(l)).join('\n')), 'no third-party CDN')
  assert.ok(fs.existsSync(new URL('../public/mediapipe/efficientdet_lite0_f16_v1.tflite', import.meta.url)), 'model file shipped')
})

test('a phone held upright: the car runs off the picture on its sides, so it is left as recorded', () => {
  // Portrait frame: from the side the car is far wider than the picture, so its box is cut at both edges.
  const cands = Array.from({ length: 64 }, (_, i) => {
    const side = Math.abs(Math.sin((i / 64) * Math.PI * 2))
    const w = Math.min(1, 0.6 + side * 1.2)
    return [{ x: 0.5 - w / 2, y: 0.4, w, h: 0.25, score: 0.8 }]
  })
  const plan = planStabilization(cands, { aspect: 9 / 16 })
  assert.ok(plan.clipped > 0.2)
  assert.equal(plan.usable, false)
  assert.ok(plan.crops.every(k => k.w === 1))
})

test('a few frames where the car touches the edge take its place from their neighbours', () => {
  const cands = walk(64)
  // Frames 10-12: walked too close, the box is cut off at the left edge and looks much smaller.
  for (const i of [10, 11, 12]) { const b = cands[i][0]; cands[i] = [{ x: 0, y: b.y, w: b.x + b.w - 0.12, h: b.h * 0.92, score: 0.7 }] }
  const plan = planStabilization(cands, { sigma: 0 })
  assert.equal(plan.usable, true)
  assert.ok(plan.clipped > 0 && plan.clipped < 0.1)
  const sizes = plan.crops.map(k => k.w)
  // No sudden zoom-in on the cut-off frames.
  assert.ok(Math.abs(sizes[11] - sizes[9]) < 0.06, `${sizes[9]} vs ${sizes[11]}`)
})

test('spinTips explains a car that did not fit', () => {
  const tips = spinTips({ centred: false, carFound: 0.9, sizeChange: 0.1, duration: 30, shortEdge: 1080, carClipped: 0.4 })
  assert.match(tips[0], /did not fit in the picture in 40% of the frames, so it was left as recorded\. Hold the phone sideways/)
})

test('a video of something else (a car only passing by) is reported as not found, not as cut off', () => {
  const tips = spinTips({ centred: false, carFound: 0.4, sizeChange: 1.8, duration: 30, shortEdge: 1080, carClipped: 0.11 })
  assert.deepEqual(tips, ['We could not find the car in many frames, so it was left as recorded. Keep the whole car in the picture as you walk.'])
})

test('a few cut-off frames on a centred spin get the advice without "left as recorded"', () => {
  const tips = spinTips({ centred: true, carFound: 0.95, sizeChange: 0.1, duration: 30, shortEdge: 1080, carClipped: 0.15 })
  assert.equal(tips.length, 1)
  assert.match(tips[0], /did not fit in the picture in 15% of the frames\. Hold/)
})

test('a car that did not fit is not also reported as not found', () => {
  const tips = spinTips({ centred: false, carFound: 0.3, sizeChange: 0.1, duration: 30, shortEdge: 1080, carClipped: 0.7 })
  assert.equal(tips.length, 1)
  assert.match(tips[0], /did not fit/)
})
