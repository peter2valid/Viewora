// Run with: tsx --test tests/interiorLinks.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { interiorScenes, isInteriorLink } from '../shared/utils/interiorLinks.ts'

const walk = (to: string, yaw = 0) => ({ type: 'scene_link' as const, targetSceneId: to, yaw })
const badge = (to: string, yaw = 0) => ({ type: 'scene_link' as const, targetSceneId: to, yaw, linkStyle: 'interior' as const })

test('only scene links styled interior count', () => {
  assert.equal(isInteriorLink(badge('x')), true)
  assert.equal(isInteriorLink(walk('x')), false)
  assert.equal(isInteriorLink({ type: 'info', linkStyle: 'interior' }), false)
  assert.equal(isInteriorLink(null), false)
})

test('no badges, no interiors', () => {
  assert.deepEqual(interiorScenes({ a: [walk('b')], b: [walk('a')] }), {})
})

test('front and rear seats belong to the showroom spot with the badge', () => {
  const out = interiorScenes({
    floor1: [walk('floor2'), badge('prado-front', 1.2)],
    floor2: [walk('floor1'), badge('lc-front', -0.5)],
    'prado-front': [walk('prado-rear')],
    'prado-rear': [walk('prado-front')],
    'lc-front': [],
  })
  assert.deepEqual(out, {
    'prado-front': { homeSceneId: 'floor1', badgeYaw: 1.2 },
    'prado-rear': { homeSceneId: 'floor1', badgeYaw: 1.2 },
    'lc-front': { homeSceneId: 'floor2', badgeYaw: -0.5 },
  })
})

test('an arrow from the car back to the showroom does not pull the showroom inside', () => {
  const out = interiorScenes({
    floor: [badge('front'), walk('lobby')],
    lobby: [walk('floor')],
    front: [walk('rear'), walk('floor')],
    rear: [walk('front')],
  })
  assert.deepEqual(Object.keys(out).sort(), ['front', 'rear'])
})

test('a scene also reachable by a plain arrow from the floor is not an interior', () => {
  const out = interiorScenes({
    floor: [badge('office'), walk('office')],
    office: [],
  })
  assert.deepEqual(out, {})
})
