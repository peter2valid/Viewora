// Run with: tsx --test tests/carTour.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCarTourItems, spinsFromTour, vehicleName } from '../shared/utils/carTour.ts'

const v = (id: string, angle: number) => ({ id, image_url: `https://m/${id}.jpg`, label: null, angle })

test('a car tour lists spins, then interior 360s, then named detail photos', () => {
  const items = buildCarTourItems({
    vehicle_spins: [
      { id: 'a', title: 'Roof up', start_angle: 90, views: [v('f0', 0), v('f90', 90), v('f180', 180)] },
      { id: 'b', title: 'Roof down', start_angle: 0, views: [v('g0', 0)] },
      { id: 'c', title: 'Empty', start_angle: 0, views: [] },
    ],
    scenes: [
      { id: 's2', name: 'Rear seats', thumbnail_url: 't2', order_index: 2 },
      { id: 's1', name: 'Driver seat', thumbnail_url: 't1', order_index: 1 },
      { id: 's3', name: 'Not processed yet', thumbnail_url: null, order_index: 3 },
    ],
    gallery: [{ id: 'p1', url: 'u1', caption: 'Wheels' }, { id: 'p2', url: 'u2', caption: null }],
  })
  assert.deepEqual(items.map(i => `${i.group}:${i.title}`), [
    'exterior:Roof up', 'exterior:Roof down', 'interior:Driver seat', 'interior:Rear seats', 'details:Wheels', 'details:Detail 2',
  ])
  // A spin's thumbnail is the frame buyers start on.
  assert.equal(items[0].thumb, 'https://m/f90.jpg')
  assert.equal(items[2].sceneId, 's1')
})

test('older payloads with one flat list still give one Exterior spin', () => {
  const spins = spinsFromTour({ vehicle_views: [v('x', 0), v('y', 45)] })
  assert.equal(spins.length, 1)
  assert.equal(spins[0].title, 'Exterior')
  assert.equal(spins[0].views.length, 2)
  assert.deepEqual(buildCarTourItems({}), [])
})

test('vehicleName: year, make, model and trim; empty without make or model', () => {
  assert.equal(vehicleName({ vehicle_year: 2021, vehicle_make: 'Porsche', vehicle_model: '911', vehicle_trim: 'Carrera Cabriolet' }), '2021 Porsche 911 Carrera Cabriolet')
  assert.equal(vehicleName({ vehicle_year: 2021 }), '')
  assert.equal(vehicleName(null), '')
})
