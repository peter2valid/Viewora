// Run with: tsx --test tests/journeySpotlight.test.ts
// A visit line can play one of the room's Object Spotlights: the line (if any)
// is said, then the spotlight opens by itself, reads, and the visit carries on.
import test from 'node:test'
import assert from 'node:assert/strict'
import { compileAreaGuide, compileJourney, journeyMinutes, type JourneyDoc } from '../shared/utils/journey.ts'

const R = (d: number) => (d * Math.PI) / 180
const doc: JourneyDoc = {
  title: 'Outpatient',
  steps: [{
    id: 's1', title: 'Waiting area', scene_id: 'lobby', view: { yaw: R(10), pitch: 0 },
    sentences: [
      { id: 'a', text: 'Take a seat here.' },
      { id: 'b', text: 'These are the chairs.', spotlight: 'black-chairs', view: { yaw: R(40), pitch: R(-15) }, pin: { label: 'x' } },
      { id: 'c', text: '', spotlight: 'reception-desk' },
      { id: 'd', text: 'Then the nurse calls you.' },
    ],
  }],
}

test('a spotlight line becomes one spot action, in order, with its lead-in turn', () => {
  const acts = compileJourney(doc, new Set(['lobby']))!.chapters[0]!.actions as any[]
  assert.deepEqual(acts.map(a => Object.keys(a).sort().join(',')), [
    'say',            // line 1
    'look,reframe',   // line 2 turns to its own view first
    'say,spot',       // ...is said, then the chairs' spotlight plays
    'spot',           // line 3: just the desk's spotlight, nothing said
    'say',            // line 4: the visit carries on
  ])
  assert.equal(acts[2].spot, 'black-chairs')
  assert.equal(acts[2].say, 'These are the chairs.')
  assert.equal(acts[3].spot, 'reception-desk')
  assert.equal(acts[2].pin, undefined, 'a spotlight marks its object itself: no pin')
})

test('a step whose only line is a spotlight is not a quiet step', () => {
  const j = compileJourney({ title: 'x', steps: [{ id: 's', title: 'Desk', scene_id: 'lobby', sentences: [{ id: 'a', text: '', spotlight: 'desk' }] }] }, new Set(['lobby']))!
  assert.deepEqual(j.chapters[0]!.actions, [{ spot: 'desk' }])
})

test('spotlights count toward the running time (about 16 s each)', () => {
  const spots = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, text: '', spotlight: `thing-${i}` }))
  const j = compileJourney({ title: 'x', steps: [{ id: 's', title: 'Lobby', scene_id: 'lobby', sentences: spots }] }, new Set(['lobby']))!
  assert.equal(journeyMinutes(j), 2) // 8 × 16 s
})

test("an area's guide keeps each spotlight once, even when two visits use it", () => {
  const twice: JourneyDoc[] = [doc, { title: 'Lab', steps: [{ ...doc.steps[0]!, id: 's2' }] }]
  const g = compileAreaGuide(twice, 'lobby', 'Waiting area', new Set(['lobby']))!
  const spots = g.chapters[0]!.actions.filter((a: any) => 'spot' in a).map((a: any) => a.spot)
  assert.deepEqual(spots, ['black-chairs', 'reception-desk'])
})
