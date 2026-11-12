// Run with: tsx --test tests/sceneGroups.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { inDockOrder } from '../shared/utils/sceneGroups.ts'

const s = (id: string, group: string | null = null) => ({ id, group })
const ids = (list: Array<{ id: string }>) => list.map(x => x.id).join(' ')

test('without categories the order is untouched', () => {
  assert.equal(ids(inDockOrder([s('a'), s('b'), s('c')])), 'a b c')
})

test('with categories, scenes sit with their category, as the dock draws them', () => {
  const scenes = [s('a', 'Bar'), s('b'), s('c', 'Garden'), s('d', 'Bar'), s('e')]
  assert.equal(ids(inDockOrder(scenes)), 'a d b e c')
})
