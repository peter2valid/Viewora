// Run with: node --test tests/vehicleViews.test.ts   (Node 22.6+ strips the types itself)
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  fitRect, pointToFraction, swapAngles, slotGaps, nearestSlot, sortByAngle, wrapIndex, viewLabel,
  spinAngles, isSpinSet, maxGapDegrees, ringPoint, timelineMarks, spinHints,
} from '../shared/utils/vehicleViews.ts'

test('fitRect cover crops the long side and stays centred', () => {
  // 4:3 photo in a wide 16:9 box: width fills, height overflows.
  const r = fitRect({ w: 1600, h: 900 }, { w: 400, h: 300 }, 'cover')
  assert.equal(r.w, 1600)
  assert.equal(r.h, 1200)
  assert.equal(r.x, 0)
  assert.equal(r.y, -150)
})

test('fitRect contain shows the whole photo with bars', () => {
  const r = fitRect({ w: 1600, h: 900 }, { w: 400, h: 300 }, 'contain')
  assert.equal(r.h, 900)
  assert.equal(r.w, 1200)
  assert.equal(r.x, 200)
  assert.equal(r.y, 0)
})

test('pointToFraction maps the box to the photo and rejects points outside it', () => {
  const rect = fitRect({ w: 1600, h: 900 }, { w: 400, h: 300 }, 'contain')
  assert.deepEqual(pointToFraction(800, 450, rect), { x: 0.5, y: 0.5 })
  assert.equal(pointToFraction(100, 450, rect), null) // in the left bar
  const cover = fitRect({ w: 1600, h: 900 }, { w: 400, h: 300 }, 'cover')
  assert.equal(pointToFraction(800, 10, cover)?.y, (10 + 150) / 1200) // cropped area is still addressable
})

test('a pin round-trips between contain and cover', () => {
  const pin = { x: 0.3, y: 0.7 }
  const box = { w: 360, h: 300 }
  const img = { w: 2000, h: 1500 }
  for (const fit of ['contain', 'cover'] as const) {
    const r = fitRect(box, img, fit)
    const back = pointToFraction(r.x + pin.x * r.w, r.y + pin.y * r.h, { ...r })
    assert.ok(back && Math.abs(back.x - pin.x) < 1e-9 && Math.abs(back.y - pin.y) < 1e-9)
  }
})

test('swapAngles exchanges two photos', () => {
  assert.deepEqual(swapAngles({ id: 'a', angle: 0 }, { id: 'b', angle: 90 }), [{ id: 'a', angle: 90 }, { id: 'b', angle: 0 }])
})

test('slotGaps reports missing main angles and shared angles', () => {
  const g = slotGaps([{ angle: 0 }, { angle: 0 }, { angle: 90 }, { angle: 60 }])
  assert.equal(g.missing.length, 6)
  assert.deepEqual(g.duplicates, [0])
})

test('nearestSlot and labels follow the angle', () => {
  assert.equal(nearestSlot(10).label, 'Front')
  assert.equal(nearestSlot(350).label, 'Front')
  assert.equal(nearestSlot(100).label, 'Right side')
  assert.equal(viewLabel({ label: null, angle: 180 }), 'Rear')
  assert.equal(viewLabel({ label: 'Boot', angle: 180 }), 'Boot')
})

test('sortByAngle is walk-around order and does not mutate', () => {
  const input = [{ angle: 270 }, { angle: 0 }, { angle: 90 }]
  assert.deepEqual(sortByAngle(input).map(v => v.angle), [0, 90, 270])
  assert.deepEqual(input.map(v => v.angle), [270, 0, 90])
})

test('wrapIndex wraps both ways', () => {
  assert.equal(wrapIndex(-1, 8), 7)
  assert.equal(wrapIndex(8, 8), 0)
  assert.equal(wrapIndex(3, 0), 0)
})

test('spinAngles spaces frames evenly, in the direction walked', () => {
  const right = spinAngles(24, true)
  assert.equal(right.length, 24)
  assert.equal(right[0], 0)
  assert.equal(right[6], 90) // a quarter lap: the car's right side
  assert.equal(right[23], 345)
  const left = spinAngles(24, false)
  assert.equal(left[0], 0)
  assert.equal(left[6], 270) // walked to the left first
  assert.equal(new Set(left).size, 24) // no two frames share an angle
})

test('spin sets are 12+ frames and report their largest gap', () => {
  assert.equal(isSpinSet(8), false)
  assert.equal(isSpinSet(12), true)
  assert.equal(maxGapDegrees(spinAngles(36, true)), 10)
  assert.equal(maxGapDegrees([0, 90, 180, 270]), 90)
  assert.equal(maxGapDegrees([0, 10, 20]), 340) // a partial set leaves a big hole
})

test('resolveFit: cover when it crops little, contain on a portrait phone', async () => {
  const { resolveFit } = await import('../shared/utils/vehicleViews.ts')
  assert.equal(resolveFit('auto', { w: 1600, h: 900 }, { w: 1920, h: 1080 }), 'cover')
  assert.equal(resolveFit('auto', { w: 390, h: 844 }, { w: 1920, h: 1080 }), 'contain')
  assert.equal(resolveFit('cover', { w: 390, h: 844 }, { w: 1920, h: 1080 }), 'cover')
})

test('zoomAt keeps the point under the finger still, and zoomInverse undoes zoomForward', async () => {
  const { zoomAt, zoomForward, zoomInverse } = await import('../shared/utils/vehicleViews.ts')
  const box = { w: 400, h: 300 }
  const s0 = { z: 1, x: 0, y: 0 }
  const s1 = zoomAt(s0, 2.5, 300, 100, box)
  const p = zoomInverse({ x: 300, y: 100 }, box, s0)
  const q = zoomForward(p, box, s1)
  assert.ok(Math.abs(q.x - 300) < 1e-9 && Math.abs(q.y - 100) < 1e-9)
  const back = zoomInverse(zoomForward({ x: 12, y: 34 }, box, s1), box, s1)
  assert.ok(Math.abs(back.x - 12) < 1e-9 && Math.abs(back.y - 34) < 1e-9)
})

test('clampZoom keeps the photo covering the box and recentres at 1x', async () => {
  const { clampZoom } = await import('../shared/utils/vehicleViews.ts')
  const box = { w: 400, h: 300 }
  const rect = { x: 0, y: 0, w: 400, h: 300 }
  assert.deepEqual(clampZoom({ z: 1, x: 50, y: -20 }, box, rect), { z: 1, x: 0, y: 0 })
  const s = clampZoom({ z: 2, x: 9999, y: -9999 }, box, rect)
  assert.equal(s.x, 200) // left edge pinned to the box's left edge
  assert.equal(s.y, -150)
  assert.equal(clampZoom({ z: 9, x: 0, y: 0 }, box, rect).z, 4)
})

test('spinLoadOrder covers every frame once, start first, spread before filling gaps', async () => {
  const { spinLoadOrder } = await import('../shared/utils/vehicleViews.ts')
  const o = spinLoadOrder(64, 10)
  assert.equal(o.length, 64)
  assert.equal(new Set(o).size, 64)
  assert.equal(o[0], 10)
  assert.deepEqual(o.slice(0, 2), [10, 42])
  assert.deepEqual(spinLoadOrder(5, 0).sort((a, b) => a - b), [0, 1, 2, 3, 4])
})

test('indexNearestAngle wraps round 360', async () => {
  const { indexNearestAngle } = await import('../shared/utils/vehicleViews.ts')
  assert.equal(indexNearestAngle([{ angle: 0 }, { angle: 90 }, { angle: 350 }], 352), 2)
  assert.equal(indexNearestAngle([{ angle: 0 }, { angle: 90 }, { angle: 340 }], 358), 0)
})

test('ringPoint: nose towards the camera at 0°, to the right at 90°, away at 180°', () => {
  const r0 = ringPoint(0), r90 = ringPoint(90), r180 = ringPoint(180)
  assert.equal(Math.round(r0.x), 100); assert.equal(Math.round(r0.y), 22)
  assert.equal(Math.round(r90.x), 196); assert.equal(Math.round(r90.y), 12)
  assert.equal(Math.round(r180.y), 2)
})

test('timelineMarks: one mark per hotspot at its frame, spread 0..1', () => {
  const v = (id: string, angle: number, hs: any[] = []) => ({ id, image_url: '', label: null, angle, width: 1, height: 1, order_index: 0, hotspots: hs }) as any
  const marks = timelineMarks([v('a', 0), v('b', 120, [{ id: 'h1', view_id: 'b', kind: 'damage', x: 0, y: 0, title: 'Scratch' }]), v('c', 240)])
  assert.deepEqual(marks, [{ id: 'h1', index: 1, at: 0.5, title: 'Scratch', kind: 'damage' }])
  assert.deepEqual(timelineMarks([v('a', 0, [{ id: 'x' }])]), [])
})

test('spinHints: touch says swipe and pinch, mouse says drag and double-click', () => {
  assert.deepEqual(spinHints(true, true).map(h => h.key), ['swipe', 'pinch'])
  assert.deepEqual(spinHints(false, true).map(h => h.key), ['drag', 'dblclick'])
  assert.deepEqual(spinHints(false, false).map(h => h.key), ['drag'])
})
