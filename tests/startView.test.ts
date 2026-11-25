// Run with: tsx --test tests/startView.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveStartView, forwardArrow } from '../domain/scene/index.ts'

const rad = (d: number) => (d * Math.PI) / 180
const arrow = (yaw: number, target: string, pitch = 0) => ({ type: 'scene_link', yaw, pitch, target_scene_id: target })

test('a saved scene start view wins (degrees → radians)', () => {
  const v = resolveStartView({ initial_yaw: 90, initial_pitch: -10, hotspots: [arrow(1.8, 'b')] }, { yaw_default: 45 })
  assert.ok(Math.abs(v.yaw - rad(90)) < 1e-9)
  assert.ok(Math.abs(v.pitch - rad(-10)) < 1e-9)
})

test('the tour-wide start view comes next', () => {
  const v = resolveStartView({ initial_yaw: 0, initial_pitch: 0, hotspots: [arrow(1.8, 'b')] }, { yaw_default: 45, pitch_default: 0 })
  assert.ok(Math.abs(v.yaw - rad(45)) < 1e-9)
})

test('nothing set: face the arrow (Kings Boma "Outside Premise", arrow at 1.837 rad)', () => {
  const v = resolveStartView({ initial_yaw: 0, initial_pitch: 0, hotspots: [arrow(1.83727964425069, 'elev', -0.032)] }, { nadir_cover: null } as any)
  assert.equal(v.yaw, 1.83727964425069)
  assert.ok(Math.abs(v.pitch - -0.016) < 1e-9)
})

test('several arrows: the one to the next scene in order, else the first', () => {
  const hs = [{ type: 'info', yaw: 3 }, arrow(5.9, 'elev10'), arrow(2.2, 'stairs')]
  assert.equal(forwardArrow(hs, 'stairs')?.yaw, 2.2)
  assert.equal(forwardArrow(hs, 'nowhere')?.yaw, 5.9)
  assert.equal(forwardArrow(hs)?.yaw, 5.9)
})

test('editor arrows (camelCase) and steep arrows', () => {
  const v = resolveStartView({ initial_yaw: 0 }, null, { arrows: [{ type: 'scene_link', yaw: 4.9, pitch: 1.2, targetSceneId: 'up' }] })
  assert.equal(v.yaw, 4.9)
  assert.equal(v.pitch, 0.35) // tilt capped so the horizon stays in view
})

test('no arrows and nothing set: straight ahead', () => {
  assert.deepEqual(resolveStartView({ initial_yaw: 0, hotspots: [{ type: 'info', yaw: 1 }] }, null), { yaw: 0, pitch: 0 })
  assert.deepEqual(resolveStartView(null, null), { yaw: 0, pitch: 0 })
})
