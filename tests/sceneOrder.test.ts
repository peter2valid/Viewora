import test from 'node:test'
import assert from 'node:assert/strict'
import { sortBySequenceNumber } from '../shared/utils/sceneOrder.ts'

const names = (list: string[]) => sortBySequenceNumber(list.map(name => ({ name }))).map(f => f.name)

test('orders camera files by their last number, not upload or timestamp order', () => {
  assert.deepEqual(names([
    'IMG_20261116_145546_00_038.jpg',
    'IMG_20261116_145403_00_035.jpg',
    'IMG_20261116_145513_00_037.jpg',
    'IMG_20261116_145328_00_034.jpg',
    'IMG_20261116_145442_00_036.jpg',
  ]), [
    'IMG_20261116_145328_00_034.jpg',
    'IMG_20261116_145403_00_035.jpg',
    'IMG_20261116_145442_00_036.jpg',
    'IMG_20261116_145513_00_037.jpg',
    'IMG_20261116_145546_00_038.jpg',
  ])
})

test('compares numbers as numbers', () => {
  assert.deepEqual(names(['Room 10.jpg', 'Room 9.jpg', 'Room 100.jpg']), ['Room 9.jpg', 'Room 10.jpg', 'Room 100.jpg'])
})

test('names without numbers go last, alphabetically; ties keep a stable order', () => {
  assert.deepEqual(names(['kitchen.jpg', 'b_2.jpg', 'attic.jpg', 'a_2.jpg', 'x_1.jpg']), ['x_1.jpg', 'a_2.jpg', 'b_2.jpg', 'attic.jpg', 'kitchen.jpg'])
})
