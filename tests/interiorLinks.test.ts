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

import { sceneFolders } from '../shared/utils/interiorLinks.ts'

test('each car is its own folder; a shared name gets (2) instead of merging', () => {
  const homes = interiorScenes({
    floor: [{ ...badge('a1'), label: 'See interior' }, { ...badge('b1'), label: 'See interior' }, { ...badge('c1'), label: 'See interior · Prado' }],
    a1: [walk('a2')], a2: [walk('a1')], b1: [walk('b2')], b2: [walk('b1')], c1: [],
  })
  const scenes = [
    { id: 'floor', name: 'Bay 1', group_name: null },
    { id: 'a1', name: 'Front', group_name: 'Toyota RAV4' }, { id: 'a2', name: 'Rear', group_name: 'Toyota RAV4' },
    // Second RAV4: only its front was named; the rear follows its car.
    { id: 'b1', name: 'Front', group_name: 'Toyota RAV4' }, { id: 'b2', name: 'Rear', group_name: null },
    { id: 'c1', name: 'IMG 055', group_name: null },
  ]
  assert.deepEqual(sceneFolders(scenes, homes), {
    floor: null, a1: 'Toyota RAV4', a2: 'Toyota RAV4', b1: 'Toyota RAV4 (2)', b2: 'Toyota RAV4 (2)', c1: 'Prado',
  })
})

test('unnamed car falls back to its first scene; hand-set categories elsewhere still group', () => {
  const homes = interiorScenes({ floor: [{ ...badge('x1'), label: 'See interior' }], x1: [], k1: [], k2: [] })
  const scenes = [
    { id: 'k1', name: 'Kitchen A', group_name: 'Kitchen' }, { id: 'k2', name: 'Kitchen B', group_name: 'Kitchen' },
    { id: 'floor', name: 'Bay', group_name: 'IMG 055' },
    { id: 'x1', name: 'IMG 055', group_name: null },
  ]
  // The car claims its name first; the showroom scene that happens to share it is numbered.
  assert.deepEqual(sceneFolders(scenes, homes), { k1: 'Kitchen', k2: 'Kitchen', floor: 'IMG 055 (2)', x1: 'IMG 055' })
})
