// Run with: tsx --test tests/journeyAreas.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { routeJourney, tourAreas, type JourneyDoc } from '../shared/utils/journey.ts'

const scenes = [
  { id: 'gate', name: 'IMG 001', thumbnail_url: 'g.jpg' },
  { id: 'desk', name: 'IMG 002', thumbnail_url: 'd.jpg' },
  { id: 'lab', name: 'Lab photo', thumbnail_url: null },
  { id: 'pay', name: 'IMG 004' },
]
const V = (yaw: number) => ({ yaw, pitch: 0 })

const outpatient: JourneyDoc = {
  id: 'j1',
  title: 'Outpatient',
  steps: [
    { id: '1', title: 'Main entrance', scene_id: 'gate', sentences: [{ id: 'a', text: 'Welcome.' }] },
    { id: '2', title: 'Reception', scene_id: 'desk', view: V(1), sentences: [{ id: 'b', text: 'Register at the front desk.' }, { id: 'c', text: 'Take a number.', view: V(2) }] },
    { id: '3', title: '', scene_id: 'lab', sentences: [] },
    // Back at reception to pay: same photo, a second step.
    { id: '4', title: 'Pay at reception', scene_id: 'desk', view: V(3), sentences: [{ id: 'd', text: 'Pay at the cashier window.' }, { id: 'e', text: '  register at the   FRONT desk. ' }] },
  ],
}
const labOnly: JourneyDoc = {
  id: 'j2',
  title: 'Lab only',
  steps: [
    { id: '1', title: 'Front desk', scene_id: 'desk', sentences: [{ id: 'f', text: 'Register at the front desk.' }, { id: 'g', text: '', hotspot_id: 'h1' }] },
    { id: '2', title: 'Gone photo', scene_id: 'deleted', sentences: [{ id: 'h', text: 'x' }] },
  ],
}

test('each photo is listed once, in the order patients meet it', () => {
  const areas = tourAreas({ journeys: [outpatient, labOnly] }, scenes)
  assert.deepEqual(areas.map(a => a.sceneId), ['gate', 'desk', 'lab'])
  assert.deepEqual(areas.map(a => a.uses), [1, 3, 1])
})

test("an area is named after its first step, or the photo's name", () => {
  const areas = tourAreas({ journeys: [outpatient, labOnly] }, scenes)
  assert.deepEqual(areas.map(a => a.title), ['Main entrance', 'Reception', 'Lab photo'])
  assert.equal(areas[0]!.thumb, 'g.jpg')
  assert.equal(areas[2]!.thumb, '')
})

test("an area's guide says every line from every step there, each once", () => {
  const desk = tourAreas({ journeys: [outpatient, labOnly] }, scenes).find(a => a.sceneId === 'desk')!
  const g = desk.guide!
  assert.equal(g.kind, 'area')
  assert.equal(g.sceneId, 'desk')
  assert.equal(g.chapters.length, 1)
  const c = g.chapters[0]!
  // Arrives facing the first step's view.
  assert.deepEqual(c.view, { yaw: (1 * 180) / Math.PI, pitch: 0 })
  assert.deepEqual(c.actions, [
    { say: 'Register at the front desk.' },
    { look: { yaw: (2 * 180) / Math.PI, pitch: 0 }, reframe: true },
    { say: 'Take a number.' },
    // The pay step's line 1 turns back to that step's view first.
    { look: { yaw: (3 * 180) / Math.PI, pitch: 0 }, reframe: true },
    { say: 'Pay at the cashier window.' },
    // The repeated line (other spacing/case) is left out; the card line stays.
    { card: 'h1', hold: 4000 },
  ])
})

test('an area with nothing said has no guide (choosing it just goes there)', () => {
  const lab = tourAreas({ journeys: [outpatient] }, scenes).find(a => a.sceneId === 'lab')!
  assert.equal(lab.guide, null)
})

test('no journeys, no areas', () => {
  assert.deepEqual(tourAreas({}, scenes), [])
  assert.deepEqual(tourAreas({ journeys: [{ title: 'x', steps: [] }] }, scenes), [])
})

test('directions: one chapter per room, names the areas passed', () => {
  const names = new Map([['gate', 'Main entrance'], ['lab', 'Laboratory']])
  const j = routeJourney(['gate', 'corridor', 'lab'], id => names.get(id) ?? null)!
  assert.equal(j.kind, 'route')
  assert.equal(j.sceneId, 'lab')
  assert.equal(j.title, 'To Laboratory')
  assert.deepEqual(j.chapters.map(c => c.scene), ['gate', 'corridor', 'lab'])
  assert.deepEqual(j.chapters.map(c => c.title), ['Main entrance', 'On the way', 'Laboratory'])
  assert.deepEqual(j.chapters[1]!.actions, [{ walk: 'corridor' }])
  assert.deepEqual(j.chapters[2]!.actions[0], { walk: 'lab' })
  assert.match((j.chapters[2]!.actions[1] as any).say, /arrived at Laboratory/)
  assert.equal(routeJourney(['gate'], () => null), null)
})

test('compiled visits carry their id for analytics', async () => {
  const { compileJourney } = await import('../shared/utils/journey.ts')
  const j = compileJourney(outpatient, new Set(scenes.map(s => s.id)))!
  assert.equal(j.id, 'j1')
  assert.equal(j.kind, 'visit')
})
