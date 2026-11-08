import test from 'node:test'
import assert from 'node:assert/strict'
import { frameTimes } from '../shared/utils/videoFrames.ts'

test('frameTimes samples evenly across one lap and never the very end', () => {
  const t = frameTimes(30, 24)
  assert.equal(t.length, 24)
  assert.equal(t[0], 0)
  assert.ok(t[23] < 30 - 0.15 + 1e-9)
  const steps = t.slice(1).map((v, i) => v - t[i])
  assert.ok(Math.max(...steps) - Math.min(...steps) < 1e-9) // even spacing
})
