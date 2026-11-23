// Run with: tsx --test tests/phoneFrame.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { framedView, keepWidthZoom, phoneWindow, zoomToFov } from '../shared/utils/phoneFrame.ts'

const fovs = { minFov: 30, maxFov: 90 }
const laptop = { w: 1440, h: 900, cover: 0, ...fovs }
const phone = { w: 390, h: 844, cover: 230, ...fovs }

test('a laptop with nothing over the view keeps the view as framed', () => {
  assert.deepEqual(framedView({ yaw: 1, pitch: -0.2, zoom: 40 }, laptop), { yaw: 1, pitch: -0.2, zoom: 40 })
})

test('a phone zooms out to keep the framed width, never past the widest', () => {
  const z = keepWidthZoom(60, { ...phone, cover: 0 })
  assert.ok(z < 60, `zoomed out (${z})`)
  assert.equal(keepWidthZoom(0, { ...phone, cover: 0 }), 0)
  // and never closer than asked
  assert.ok(keepWidthZoom(100, { ...phone, cover: 0 }) <= 100)
})

test('with the visit box at the bottom, the camera looks lower so the spot rides up into the clear part', () => {
  const f = framedView({ yaw: 0, pitch: 0, zoom: 0 }, phone)
  assert.ok(f.pitch < 0)
  // The spot ends up at the middle of the part above the box: c × half-height above the centre.
  const half = (zoomToFov(f.zoom, fovs) * Math.PI) / 360
  const c = phone.cover / phone.h
  assert.ok(Math.abs(Math.tan(-f.pitch) - c * Math.tan(half)) < 1e-9)
  // Same yaw; a laptop with a box (the bar on a big screen) shifts less.
  assert.equal(f.yaw, 0)
  const l = framedView({ yaw: 0, pitch: 0, zoom: 0 }, { ...laptop, cover: 160 })
  assert.ok(l.pitch < 0 && l.pitch > f.pitch)
})

test("the editor's phone window sits inside a wide preview, with the box at its bottom", () => {
  const w = phoneWindow(60, 2.5, 20, fovs)
  assert.ok(w.left > 0 && w.right < 1 && w.left < 0.5 && w.right > 0.5)
  assert.ok(w.top < 0.5 && w.barTop > 0.5 && w.bottom > w.barTop)
  assert.ok(Math.abs((w.top + w.barTop) / 2 - 0.5) < 1e-9, 'the framed middle is the middle of the clear part')
})
