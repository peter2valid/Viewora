// Run with: tsx --test tests/sphereDetail.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { SphereGeometry, type BufferGeometry } from 'three'
import { buildDenseSphere, disposeDenseSphere, mirrorPieceUvs } from '../shared/utils/viewerAdapters/sphereDetail.ts'

const R = 10
const SEG = 32

/** PSV 5.14.1 EquirectangularTilesAdapter.createMesh geometry, groups included. */
function psvCoarse(segments = SEG): BufferGeometry {
  const g = new SphereGeometry(R, segments, segments / 2, -Math.PI / 2).scale(-1, 1, 1).toNonIndexed()
  g.clearGroups()
  const H = segments / 2
  const nv = 2 * segments * 3 + (H - 2) * segments * 6
  let i = 0, k = 0
  for (; i < segments * 3; i += 3) g.addGroup(i, 3, k++)
  for (; i < nv - segments * 3; i += 6) g.addGroup(i, 6, k++)
  for (; i < nv; i += 3) g.addGroup(i, 3, k++)
  return g
}

/** PSV's __swapMaterial UVs for one piece: (top,bottom,left,right) of the tile. */
function psvSetPieceUvs(g: BufferGeometry, row: number, col: number, left: number, right: number, top: number, bottom: number) {
  const uv = g.getAttribute('uv')
  const k = row * SEG + col
  const s = g.groups[k]!.start
  if (row === 0) {
    uv.setXY(s, (left + right) / 2, top); uv.setXY(s + 1, left, bottom); uv.setXY(s + 2, right, bottom)
  } else if (row === SEG / 2 - 1) {
    uv.setXY(s, right, top); uv.setXY(s + 1, left, top); uv.setXY(s + 2, (left + right) / 2, bottom)
  } else {
    uv.setXY(s, right, top); uv.setXY(s + 1, left, top); uv.setXY(s + 2, right, bottom)
    uv.setXY(s + 3, left, top); uv.setXY(s + 4, left, bottom); uv.setXY(s + 5, right, bottom)
  }
}

test('detail 1 reproduces PSV\'s tile sphere exactly (positions, UVs, groups)', () => {
  const coarse = psvCoarse()
  const { geometry: dense } = buildDenseSphere(R, SEG, 1)
  const cp = coarse.getAttribute('position'), dp = dense.getAttribute('position')
  const cu = coarse.getAttribute('uv'), du = dense.getAttribute('uv')
  assert.equal(dp.count, cp.count)
  for (let i = 0; i < cp.count; i++) {
    for (const [a, b] of [[cp.getX(i), dp.getX(i)], [cp.getY(i), dp.getY(i)], [cp.getZ(i), dp.getZ(i)], [cu.getX(i), du.getX(i)], [cu.getY(i), du.getY(i)]]) {
      assert.ok(Math.abs(a! - b!) < 1e-5, `vertex ${i}: ${a} vs ${b}`)
    }
  }
  assert.deepEqual(dense.groups, coarse.groups)
})

test('detail 4 keeps 512 draw groups mapped to the same materials, on the same sphere', () => {
  const { geometry } = buildDenseSphere(R, SEG, 4)
  assert.equal(geometry.groups.length, SEG * SEG / 2)
  geometry.groups.forEach((g: { materialIndex?: number }, k: number) => assert.equal(g.materialIndex, k))
  const p = geometry.getAttribute('position')
  assert.equal(p.count, (128 * 64 * 2 - 2 * 128) * 3)
  for (let i = 0; i < p.count; i++) {
    assert.ok(Math.abs(Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) - R) < 1e-4)
  }
  // Groups cover the buffer contiguously, in order.
  let next = 0
  for (const g of geometry.groups) { assert.equal(g.start, next); next += g.count }
  assert.equal(next, p.count)
})

test('every coarse vertex of a piece lies on the dense piece with the same material', () => {
  const coarse = psvCoarse()
  const { geometry } = buildDenseSphere(R, SEG, 4)
  const cp = coarse.getAttribute('position'), dp = geometry.getAttribute('position')
  for (const k of [0, 5, 31, 32, 200, 479, 480, 511]) {
    const cg = coarse.groups[k]!, dg = geometry.groups[k]!
    for (let i = cg.start; i < cg.start + cg.count; i++) {
      let found = false
      for (let j = dg.start; j < dg.start + dg.count && !found; j++) {
        found = Math.hypot(cp.getX(i) - dp.getX(j), cp.getY(i) - dp.getY(j), cp.getZ(i) - dp.getZ(j)) < 1e-4
      }
      assert.ok(found, `group ${k} coarse vertex ${i} missing from dense piece`)
    }
  }
})

test('mirrored UVs follow the tile rectangle PSV assigned (fan and middle pieces)', () => {
  const coarse = psvCoarse()
  const dense = buildDenseSphere(R, SEG, 4)
  // A medium 8×4 tile covers 4×4 pieces; local UVs run 0..1 across the tile.
  const cases = [
    { row: 15, col: 9, left: 0.25, right: 0.5, top: 0.25, bottom: 0 },   // nadir fan
    { row: 0, col: 0, left: 0, right: 0.25, top: 1, bottom: 0.75 },       // zenith fan
    { row: 6, col: 20, left: 0, right: 0.25, top: 0.5, bottom: 0.25 },   // middle
  ]
  const uv = dense.geometry.getAttribute('uv')
  const pos = dense.geometry.getAttribute('position')
  for (const c of cases) {
    psvSetPieceUvs(coarse, c.row, c.col, c.left, c.right, c.top, c.bottom)
    mirrorPieceUvs(coarse, dense, c.row * SEG + c.col)
    const g = dense.geometry.groups[c.row * SEG + c.col]!
    for (let i = g.start; i < g.start + g.count; i++) {
      // Expected: linear in the vertex's true longitude/colatitude inside the piece.
      const y = pos.getY(i) / R
      const theta = Math.acos(Math.max(-1, Math.min(1, y)))
      const fv = theta / Math.PI * (SEG / 2) - c.row
      assert.ok(Math.abs(uv.getY(i) - (c.top + fv * (c.bottom - c.top))) < 1e-4, `v at ${i}`)
      if (Math.abs(y) < 0.9999) { // longitude is undefined at the pole vertex itself
        let phi = Math.atan2(pos.getZ(i), pos.getX(i)) + Math.PI / 2
        phi = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
        let fu = phi / (2 * Math.PI) * SEG - c.col
        if (fu < -0.5) fu += SEG
        assert.ok(Math.abs(uv.getX(i) - (c.left + fu * (c.right - c.left))) < 1e-4, `u at ${i}`)
      } else {
        assert.ok(uv.getX(i) > c.left && uv.getX(i) < c.right)
      }
    }
  }
  // Only the changed pieces are queued for upload.
  assert.equal(uv.updateRanges.length, cases.length)
})

test('rooms share one position buffer, keep their own UVs, and disposing one keeps the shared buffer', () => {
  const a = buildDenseSphere(R, SEG, 4), b = buildDenseSphere(R, SEG, 4)
  assert.equal(a.geometry.getAttribute('position'), b.geometry.getAttribute('position'))
  assert.notEqual(a.geometry.getAttribute('uv'), b.geometry.getAttribute('uv'))
  assert.equal(a.geometry.boundingSphere?.radius, R)
  // A tile on room A must not change room B.
  const coarse = psvCoarse()
  psvSetPieceUvs(coarse, 15, 9, 0.25, 0.5, 0.25, 0)
  const before = b.geometry.getAttribute('uv').array.slice()
  mirrorPieceUvs(coarse, a, 15 * SEG + 9)
  assert.deepEqual(b.geometry.getAttribute('uv').array, before)
  // three deletes the GPU buffer of every attribute still on a geometry when its
  // 'dispose' event fires; the shared positions must already be detached by then.
  let attrsAtDispose: string[] = []
  a.geometry.addEventListener('dispose', () => { attrsAtDispose = Object.keys(a.geometry.attributes) })
  disposeDenseSphere(a.geometry)
  assert.deepEqual(attrsAtDispose, ['uv'])
  assert.ok(b.geometry.getAttribute('position'))
  assert.equal(buildDenseSphere(R, SEG, 4).geometry.getAttribute('position'), b.geometry.getAttribute('position'))
})
