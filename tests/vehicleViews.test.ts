// Run with: node --test tests/vehicleViews.test.ts   (Node 22.6+ strips the types itself)
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  fitRect, pointToFraction, swapAngles, slotGaps, nearestSlot, sortByAngle, wrapIndex, viewLabel,
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
