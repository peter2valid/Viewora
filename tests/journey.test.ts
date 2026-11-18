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

test('a zoomed-in view is kept for the arrival and the step start; wide views carry no zoom', () => {
  const j = compileJourney({ title: 't', steps: [
    { id: '1', title: 'Entrance', scene_id: 'gate', view: { yaw: 0, pitch: 0, zoom: 60 }, sentences: [] },
    { id: '2', title: 'Gift shop', scene_id: 'gate', view: { yaw: Math.PI / 2, pitch: 0, zoom: 45 }, sentences: [] },
    { id: '3', title: 'Desk', scene_id: 'desk', view: { yaw: 0, pitch: 0 }, sentences: [] },
  ] }, ids)!
  assert.deepEqual(j.chapters[0]!.view, { yaw: 0, pitch: 0, zoom: 60 })
  assert.deepEqual(j.chapters[1]!.actions[0], { walk: 'gate', face: { yaw: 90, pitch: 0, zoom: 45 } })
  assert.deepEqual(j.chapters[2]!.actions[0], { walk: 'desk', face: { yaw: 0, pitch: 0 } })
})

test('a line with its own facing turns there before it is read; empty lines keep their view', () => {
  const j = compileJourney({ title: 't', steps: [
    { id: '1', title: 'Gate', scene_id: 'gate', sentences: [] },
    { id: '2', title: 'Reception', scene_id: 'desk', view: { yaw: 0, pitch: 0 }, sentences: [
      { id: 'a', text: 'This is reception.', view: { yaw: 1, pitch: 0 } }, // line 1 uses the step view
      { id: 'b', text: 'The pharmacy window is on your left.', view: { yaw: -Math.PI / 2, pitch: 0, zoom: 50 } },
      { id: 'c', text: 'Seats are behind you.' },
      { id: 'd', text: '  ', view: { yaw: Math.PI, pitch: 0 } },
    ] },
  ] }, ids)!
  assert.deepEqual(j.chapters[1]!.actions, [
    { walk: 'desk', face: { yaw: 0, pitch: 0 } },
    { say: 'This is reception.' },
    { look: { yaw: -90, pitch: 0, zoom: 50 }, reframe: true },
    { say: 'The pharmacy window is on your left.' },
    { say: 'Seats are behind you.' },
    { look: { yaw: 180, pitch: 0 }, reframe: true },
  ])
})

test('a line plays its recording only while it still says what was recorded', async () => {
  const { freshAudio } = await import('../shared/utils/journey.ts')
  const rec = { url: 'https://cdn/narration/h.mp3', duration_ms: 2400, text: 'Pay at the counter.' }
  const j = compileJourney({ title: 't', steps: [
    { id: '1', title: 'Pharmacy', scene_id: 'lab', sentences: [
      { id: 'a', text: '  Pay at the   counter. ', audio: rec },
      { id: 'b', text: 'Pay at the front counter.', audio: rec }, // edited since recording
    ] },
  ] }, ids)!
  assert.deepEqual(j.chapters[0]!.actions, [
    { say: 'Pay at the counter.', audio: rec.url, ms: 2400 },
    { say: 'Pay at the front counter.' },
  ])
  assert.equal(freshAudio({ id: 'x', text: 'Other', audio: rec }), null)
})

test('a line tied to a hotspot opens its card for the length of the line', () => {
  const rec = { url: 'u.mp3', duration_ms: 3000, text: 'The pharmacy window is ahead.' }
  const j = compileJourney({ title: 't', steps: [
    { id: '1', title: 'Pharmacy', scene_id: 'lab', sentences: [
      { id: 'a', text: 'The pharmacy window is ahead.', hotspot_id: 'h1', view: { yaw: 1, pitch: 0 }, audio: rec },
      { id: 'b', text: '', hotspot_id: 'h2' },
    ] },
  ] }, ids)!
  assert.deepEqual(j.chapters[0]!.actions, [
    { card: 'h1', say: 'The pharmacy window is ahead.', audio: 'u.mp3', ms: 3000 },
    { card: 'h2', hold: 4000 },
  ])
})
