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
    'prado-front': { homeSceneId: 'floor1', badgeYaw: 1.2, entrySceneId: 'prado-front', badgeLabel: '' },
    'prado-rear': { homeSceneId: 'floor1', badgeYaw: 1.2, entrySceneId: 'prado-front', badgeLabel: '' },
    'lc-front': { homeSceneId: 'floor2', badgeYaw: -0.5, entrySceneId: 'lc-front', badgeLabel: '' },
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

import { carNameFromBadge, interiorFolders } from '../shared/utils/interiorLinks.ts'
import { withInteriorsTab, INTERIORS_TAB_ID, SHOWROOM_TAB_ID } from '../shared/utils/dockFloors.ts'

test('car name comes from the badge text', () => {
  assert.equal(carNameFromBadge('See interior · Land Cruiser 300'), 'Land Cruiser 300')
  assert.equal(carNameFromBadge('See interior: Prado'), 'Prado')
  assert.equal(carNameFromBadge('Interior - Hilux'), 'Hilux')
  assert.equal(carNameFromBadge('See interior'), '')
  assert.equal(carNameFromBadge('Prado TX'), 'Prado TX')
})

test('one folder per car; unnamed badges fall back to the scene name; duplicates are numbered', () => {
  const homes = interiorScenes({
    floor: [
      { ...badge('p1'), label: 'See interior · Prado' },
      { ...badge('l1'), label: 'See interior' },
      { ...badge('x1'), label: 'See interior · Prado' },
    ],
    p1: [walk('p2')], p2: [walk('p1')], l1: [], x1: [],
  })
  const names: Record<string, string> = { l1: 'LC300 front' }
  assert.deepEqual(interiorFolders(homes, id => names[id] ?? ''), {
    p1: 'Prado', p2: 'Prado', l1: 'LC300 front', x1: 'Prado (2)',
  })
})

test('interiors get their own dock tab', () => {
  const ids = ['a', 'b', 'p1', 'p2']
  const inside = (id: string) => id.startsWith('p')
  assert.deepEqual(withInteriorsTab([], ids, inside), [
    { id: SHOWROOM_TAB_ID, name: 'Showroom', sceneIds: ['a', 'b'] },
    { id: INTERIORS_TAB_ID, name: 'Interiors', sceneIds: ['p1', 'p2'] },
  ])
  // Floor tabs stay; interiors leave them (an "Other" tab of only interiors disappears).
  const floors = [{ id: 'g', name: 'Ground', sceneIds: ['a', 'b'] }, { id: '__other', name: 'Other', sceneIds: ['p1', 'p2'] }]
  assert.deepEqual(withInteriorsTab(floors, ids, inside).map(t => t.name), ['Ground', 'Interiors'])
  assert.deepEqual(withInteriorsTab([], ids, () => false), [])
})
