// Run with: node --test tests/spinFinish.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { lookOfUrl, originalUrl, isRunning, progressText, SPIN_LOOK_OPTIONS } from '../shared/utils/spinFinish.ts'

const orig = 'https://media.viewora.software/users/u/spaces/s/vehicle/1794-ab.jpg'
const fin = `${orig}.studio-natural-v1-0a1b2c3d.jpg`

test('the look and the original are read from a frame URL', () => {
  assert.equal(lookOfUrl(orig), 'original')
  assert.equal(lookOfUrl(fin), 'natural')
  assert.equal(lookOfUrl(`${orig}.studio-vivid-v1-0a1b2c3d.jpg`), 'vivid')
  assert.equal(originalUrl(fin), orig)
  assert.equal(originalUrl(orig), orig)
  // Something that only looks similar is left alone.
  assert.equal(lookOfUrl(`${orig}.studio-neon-v1.jpg`), 'original')
})

test('progress: running states and the owner-facing line', () => {
  assert.equal(isRunning(null), false)
  assert.equal(isRunning({ state: 'queued', look: 'natural', done: 0, total: 0 }), true)
  assert.equal(isRunning({ state: 'done', look: 'natural', done: 64, total: 64 }), false)
  assert.equal(progressText({ state: 'working', look: 'natural', done: 9, total: 64 }), 'Finishing frame 10 of 64…')
  assert.equal(progressText({ state: 'working', look: 'natural', done: 64, total: 64 }), 'Finishing frame 64 of 64…')
  assert.match(progressText({ state: 'failed', look: 'vivid', done: 0, total: 0 }), /previous look/)
})

test('three looks, original first', () => {
  assert.deepEqual(SPIN_LOOK_OPTIONS.map(o => o.look), ['original', 'natural', 'vivid'])
})
