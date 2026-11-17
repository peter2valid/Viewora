// Run with: tsx --test tests/walkHeading.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { normYaw, planWalk, type WalkContext } from '../shared/utils/walkHeading.ts'

const deg = (d: number) => normYaw((d * Math.PI) / 180)
const close = (actual: number | null, expectedDeg: number) => {
  assert.notEqual(actual, null)
  const diff = Math.abs(normYaw(actual! - deg(expectedDeg) + Math.PI) - Math.PI)
  assert.ok(diff < 1e-9, `expected ${expectedDeg}°, got ${(actual! * 180) / Math.PI}°`)
}
const link = (yawDeg: number, targetSceneId: string) => ({ type: 'scene_link', yaw: deg(yawDeg), targetSceneId })

test('arrives facing away from the arrow that leads back, whatever way the camera pointed', () => {
  // Room B was shot with the camera turned 130° compared with room A.
  const ctx: WalkContext = {
    scenes: [{ id: 'A' }, { id: 'B' }],
    plans: [],
    linksByScene: { A: [link(40, 'B')], B: [link(350, 'A')] },
  }
  const r = planWalk(ctx, 'A', 'B', deg(40))
  close(r.travelYaw, 40)
  close(r.arriveYaw, 170)
  assert.equal(r.source, 'back-link')
})

test('carries the compass heading across when there is no arrow back', () => {
  const ctx: WalkContext = {
    scenes: [{ id: 'A', north_offset: 10 }, { id: 'B', north_offset: 250 }],
    plans: [],
    linksByScene: { A: [link(80, 'B')] },
  }
  // Walking at plan bearing 90° (80 + 10); B's centre faces 250°, so 90° is yaw -160° = 200°.
  const r = planWalk(ctx, 'A', 'B', deg(80))
  close(r.arriveYaw, 200)
  assert.equal(r.source, 'compass')
})

test('uses the pin positions when only the next room has a facing direction', () => {
  const ctx: WalkContext = {
    scenes: [
      { id: 'A', floor_plan_id: 'f', plan_x: 0.2, plan_y: 0.5 },
      { id: 'B', floor_plan_id: 'f', plan_x: 0.6, plan_y: 0.5, north_offset: 45 },
    ],
    plans: [{ id: 'f', width: 1000, height: 500 }],
    linksByScene: {},
  }
  // B lies due right (bearing 90°) on the plan.
  const r = planWalk(ctx, 'A', 'B')
  close(r.arriveYaw, 45)
  assert.equal(r.source, 'plan')
  assert.equal(r.travelYaw, null)
})

test('a jump from the scene list turns toward the room using the plan', () => {
  const ctx: WalkContext = {
    scenes: [
      { id: 'A', floor_plan_id: 'f', plan_x: 0.5, plan_y: 0.8, north_offset: 0 },
      { id: 'B', floor_plan_id: 'f', plan_x: 0.5, plan_y: 0.2, north_offset: 180 },
    ],
    plans: [{ id: 'f', width: 800, height: 800 }],
    linksByScene: {},
  }
  const r = planWalk(ctx, 'A', 'B')
  close(r.travelYaw, 0) // B is straight up the plan, A's centre faces up
  close(r.arriveYaw, 180) // B's centre faces down the plan, so "up" is behind it
  assert.equal(r.source, 'compass')
})

test('falls back to the start view when the tour gives nothing to go on', () => {
  const ctx: WalkContext = { scenes: [{ id: 'A' }, { id: 'B' }], plans: [], linksByScene: { A: [link(10, 'B')] } }
  const r = planWalk(ctx, 'A', 'B', deg(10))
  assert.equal(r.arriveYaw, null)
  assert.equal(r.source, 'start-view')
  close(r.travelYaw, 10)
})

test('longer moves on the plan take a longer step, within limits', () => {
  const ctx: WalkContext = {
    scenes: [
      { id: 'A', floor_plan_id: 'f', plan_x: 0.1, plan_y: 0.5 },
      { id: 'B', floor_plan_id: 'f', plan_x: 0.2, plan_y: 0.5 },
      { id: 'C', floor_plan_id: 'f', plan_x: 0.3, plan_y: 0.5 },
      { id: 'D', floor_plan_id: 'f', plan_x: 0.9, plan_y: 0.5 },
    ],
    plans: [{ id: 'f', width: 1000, height: 1000 }],
    linksByScene: { A: [link(90, 'B')], B: [link(90, 'C')], C: [link(90, 'D')] },
  }
  assert.equal(planWalk(ctx, 'A', 'B').stepScale, 1)
  assert.equal(planWalk(ctx, 'C', 'D').stepScale, 1.35)
  assert.equal(planWalk({ ...ctx, scenes: [{ id: 'A' }, { id: 'B' }] }, 'A', 'B').stepScale, 1)
})

test('a room with no facing direction set is measured from its arrows and pins', () => {
  // B's camera was turned so that its arrow to C (due right on the plan) sits at yaw 30°:
  // B's centre therefore faces 60° on the plan.
  const ctx: WalkContext = {
    scenes: [
      { id: 'A', floor_plan_id: 'f', plan_x: 0.5, plan_y: 0.9, north_offset: 0 },
      { id: 'B', floor_plan_id: 'f', plan_x: 0.5, plan_y: 0.5 },
      { id: 'C', floor_plan_id: 'f', plan_x: 0.9, plan_y: 0.5 },
    ],
    plans: [{ id: 'f', width: 1000, height: 1000 }],
    linksByScene: { A: [link(0, 'B')], B: [link(30, 'C')] },
  }
  // Walking up the plan (bearing 0°) into B means yaw -60° = 300° there.
  const r = planWalk(ctx, 'A', 'B', deg(0))
  close(r.arriveYaw, 300)
  assert.equal(r.source, 'compass')
})

test('stepping out of a car by an arrow faces the car, with no step', () => {
  const ctx: WalkContext = {
    scenes: [{ id: 'seat' }, { id: 'showroom' }],
    plans: [],
    linksByScene: {
      seat: [link(200, 'showroom')],
      showroom: [{ ...link(75, 'seat'), linkStyle: 'interior' }],
    },
  }
  const r = planWalk(ctx, 'seat', 'showroom', deg(200))
  close(r.arriveYaw, 75)
  assert.equal(r.step, false)
  assert.equal(planWalk(ctx, 'showroom', 'seat', deg(75)).step, true)
})
