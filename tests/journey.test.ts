// Run with: tsx --test tests/journey.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { compileJourney, journeyMinutes, tourJourneys, type JourneyDoc } from '../shared/utils/journey.ts'

const ids = new Set(['gate', 'desk', 'lab'])
const doc: JourneyDoc = {
  title: 'Lab tests only',
  steps: [
    { id: '1', title: 'Arrival', scene_id: 'gate', view: { yaw: Math.PI / 2, pitch: 0 }, sentences: [{ id: 'a', text: 'Welcome.' }] },
    { id: '2', title: '', scene_id: null, sentences: [{ id: 'b', text: 'No photo yet.' }] },
    { id: '3', title: 'Reception', scene_id: 'desk', sentences: [{ id: 'c', text: ' Bring your ID. ' }, { id: 'd', text: '   ' }, { id: 'e', text: 'Pay here.' }] },
    { id: '4', title: 'Laboratory', scene_id: 'lab', view: null, sentences: [] },
  ],
}

test('the first step is where the visit starts; later steps are walked to', () => {
  const j = compileJourney(doc, ids)!
  assert.equal(j.chapters.length, 3) // the step without a photo is left out
  assert.deepEqual(j.chapters[0]!.actions, [{ say: 'Welcome.' }])
  assert.deepEqual(j.chapters[0]!.view, { yaw: 90, pitch: 0 }) // radians from the editor → degrees for the player
  assert.deepEqual(j.chapters[1]!.actions, [{ walk: 'desk' }, { say: 'Bring your ID.' }, { say: 'Pay here.' }])
})

test('a step with nothing to say still pauses; an unnamed step gets a number', () => {
  const j = compileJourney(doc, ids)!
  assert.deepEqual(j.chapters[2]!.actions, [{ walk: 'lab' }, { wait: 3000 }])
  const unnamed = compileJourney({ title: '', steps: [{ id: 'x', title: '  ', scene_id: 'gate', sentences: [] }] }, ids)!
  assert.equal(unnamed.chapters[0]!.title, 'Step 1')
  assert.equal(unnamed.title, 'Guided visit')
})

test('a facing direction is carried onto the walk', () => {
  const j = compileJourney({ title: 't', steps: [
    { id: '1', title: 'A', scene_id: 'gate', sentences: [] },
    { id: '2', title: 'B', scene_id: 'desk', view: { yaw: Math.PI, pitch: -Math.PI / 18 }, sentences: [] },
  ] }, ids)!
  assert.deepEqual(j.chapters[1]!.actions[0], { walk: 'desk', face: { yaw: 180, pitch: -10 } })
})

test('nothing playable gives no journey; deleted photos are skipped', () => {
  assert.equal(compileJourney({ title: 't', steps: [] }, ids), null)
  assert.equal(compileJourney({ title: 't', steps: [{ id: '1', title: 'A', scene_id: 'gone', sentences: [] }] }, ids), null)
})

test('a tour lists its published journeys in order, ignoring broken ones', () => {
  const list = tourJourneys({ journeys: [doc, { title: 'broken' }, { title: 'Maternity', steps: [{ id: '1', title: 'Ward', scene_id: 'lab', sentences: [] }] }] }, ids)
  assert.deepEqual(list.map(j => j.title), ['Lab tests only', 'Maternity'])
  assert.deepEqual(tourJourneys({}, ids), [])
  assert.ok(journeyMinutes(list[0]!) >= 1)
})
