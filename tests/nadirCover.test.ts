// Run with: tsx --test tests/nadirCover.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { coverRect, resolveNadirCover, suggestFit, DEFAULT_NADIR_COVER, NADIR_SIZE_MAX } from '../shared/utils/viewerAdapters/nadirCover.ts'

const base = { ...DEFAULT_NADIR_COVER, url: 'https://media.example/logo.png' }

test('off, missing image or hidden scene: no cover', () => {
  assert.equal(resolveNadirCover(null, 'a'), null)
  assert.equal(resolveNadirCover({ ...base, enabled: false }, 'a'), null)
  assert.equal(resolveNadirCover({ ...base, url: '' }, 'a'), null)
  assert.equal(resolveNadirCover({ ...base, hidden_scene_ids: ['a'] }, 'a'), null)
})

test('one switch covers every other scene', () => {
  const s = { ...base, hidden_scene_ids: ['a'] }
  for (const id of ['b', 'c', 'd']) assert.equal(resolveNadirCover(s, id)?.url, base.url)
})

test('chosen scenes only: just those, never scenes added later', () => {
  const s = { ...base, mode: 'some' as const, scene_ids: ['a', 'c'], hidden_scene_ids: ['a'] }
  assert.ok(resolveNadirCover(s, 'a'))
  assert.equal(resolveNadirCover(s, 'b'), null)
  assert.ok(resolveNadirCover(s, 'c'))
  assert.equal(resolveNadirCover(s, 'new-scene'), null)
  assert.equal(resolveNadirCover({ ...s, scene_ids: [] }, 'a'), null)
})

test('older saves without a mode mean every scene', () => {
  const { mode, scene_ids, ...old } = base
  assert.ok(resolveNadirCover(old, 'new-scene'))
})

test('bad values are clamped or dropped', () => {
  const c = resolveNadirCover({ ...base, size: 400, bg: 'red', fit: 'x' as any }, 'a')!
  assert.equal(c.size, NADIR_SIZE_MAX)
  assert.equal(c.bg, null)
  assert.equal(c.fit, 'fill')
})

test('square fills, wide fits', () => {
  assert.equal(suggestFit(1000, 1000), 'fill')
  assert.equal(suggestFit(1200, 400), 'fit')
  assert.equal(suggestFit(300, 900), 'fit')
})

test('fill covers the whole circle, centred', () => {
  const r = coverRect(2000, 1000, 1024, 'fill')
  assert.equal(r.h, 1024)
  assert.equal(r.w, 2048)
  assert.equal(r.x, -512)
})

test('fit keeps every corner of the image inside the circle', () => {
  for (const [w, h] of [[1000, 1000], [3000, 1000], [500, 1500]]) {
    const r = coverRect(w, h, 1024, 'fit')
    const half = Math.hypot(r.w / 2, r.h / 2)
    assert.ok(half <= 512, `${w}x${h}: corner at ${half}`)
    assert.ok(Math.abs(r.w / r.h - w / h) < 1e-9, 'proportions kept')
    assert.ok(Math.abs(r.x + r.w / 2 - 512) < 1e-9 && Math.abs(r.y + r.h / 2 - 512) < 1e-9, 'centred')
  }
})
