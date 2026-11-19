// Run with: tsx --test tests/journeyPin.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { compileJourney, tourAreas, type JourneyDoc } from '../shared/utils/journey.ts'

const R = (d: number) => (d * Math.PI) / 180
const doc: JourneyDoc = {
  title: 'Outpatient',
  steps: [{
    id: 's1', title: 'Arriving', scene_id: 'gate', view: { yaw: R(10), pitch: 0 },
    sentences: [
      { id: 'a', text: 'Welcome.', pin: { label: ' Main entrance ' } },
      { id: 'b', text: 'Parking is on your right.', view: { yaw: R(90), pitch: R(-10), zoom: 40 }, pin: { label: '' } },
      { id: 'c', text: 'No marker here.' },
      { id: 'd', text: 'Still facing the parking.', pin: { label: 'Parking' } },
    ],
  }],
}

test('a marked line points at the middle of the view it is read facing', () => {
  const j = compileJourney(doc, new Set(['gate']))!
  const says = j.chapters[0]!.actions.filter((a: any) => 'say' in a && !('card' in a)) as any[]
  assert.deepEqual(says[0].pin, { yaw: 10, pitch: 0, label: 'Main entrance' }, 'line 1: the arrival view, label trimmed')
  assert.equal(Math.round(says[1].pin.yaw), 90)
  assert.equal(Math.round(says[1].pin.pitch), -10)
  assert.equal('label' in says[1].pin, false, 'an empty name shows no label')
  assert.equal(says[2].pin, undefined)
  assert.equal(Math.round(says[3].pin.yaw), 90, 'a line without its own view keeps the last one')
})

test('a line with an info card shows the card, not a marker', () => {
  const d: JourneyDoc = { title: 'x', steps: [{ id: 's', title: 'Desk', scene_id: 'gate', view: null, sentences: [{ id: 'a', text: 'Hi', view: { yaw: 0, pitch: 0 }, hotspot_id: 'h1', pin: {} }] }] }
  const a = compileJourney(d, new Set(['gate']))!.chapters[0]!.actions
  assert.equal(a.some((x: any) => x.pin), false)
})

test('the area guide keeps the marked spots', () => {
  const [area] = tourAreas({ journeys: [doc] }, [{ id: 'gate', name: 'Gate' }])
  const pins = area!.guide!.chapters[0]!.actions.filter((a: any) => a.pin)
  assert.equal(pins.length, 3)
})
