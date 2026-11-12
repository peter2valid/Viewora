// Run with: tsx --test tests/editorWrites.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { createSerialWrites, createWriteTracker, mergeById } from '../shared/utils/editorWrites.ts'

const defer = <T = any>() => {
  let resolve!: (v: T) => void
  let reject!: (e: any) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
const tick = () => new Promise(r => setTimeout(r, 0))

test('a reload that started before a write keeps the local copy', async () => {
  const w = createWriteTracker()
  const since = w.mark()                       // GET leaves
  const d = defer()
  const write = w.track('b', d.promise)        // user moves B
  assert.equal(w.isNewerThan('b', since), true)
  d.resolve()
  await write                                  // PATCH lands before the GET
  assert.equal(w.isNewerThan('b', since), true, 'still newer than the GET snapshot')
  assert.equal(w.isNewerThan('a', since), false)
  assert.equal(w.isNewerThan('b', w.mark()), false, 'a reload started after the write takes the server copy')
})

test('a write in flight when the reload started is protected after it settles', async () => {
  const w = createWriteTracker()
  const d = defer()
  const write = w.track('b', d.promise)
  const since = w.mark()
  d.resolve()
  await write
  assert.equal(w.isNewerThan('b', since), true)
})

test('own realtime echoes are recognised for a short window', async () => {
  let t = 1000
  const w = createWriteTracker({ echoWindowMs: 3000, now: () => t })
  await w.track('x', Promise.resolve())
  assert.equal(w.isOwnEcho('x'), true)
  assert.equal(w.isOwnEcho('y'), false)
  t += 3500
  assert.equal(w.isOwnEcho('x'), false)
})

test('failed writes still settle', async () => {
  const w = createWriteTracker()
  await assert.rejects(w.track('x', Promise.reject(new Error('no'))))
  assert.equal(w.busy(), false)
})

test('patches to one key run in order and queued ones are merged', async () => {
  const s = createSerialWrites()
  const sent: any[] = []
  const gates: Array<{ resolve: (v?: any) => void }> = []
  const send = (body: any) => { sent.push({ ...body }); const g = defer(); gates.push(g); return g.promise.then(() => body) }
  const p1 = s.patch('h', { yaw: 1 }, send)
  await tick()                                 // first request is on the wire
  const p2 = s.patch('h', { yaw: 2 }, send)
  const p3 = s.patch('h', { label: 'x' }, send)
  await tick()
  assert.equal(sent.length, 1, 'second request waits for the first')
  gates[0].resolve()
  await p1
  await tick()
  assert.deepEqual(sent[1], { yaw: 2, label: 'x' })
  gates[1].resolve()
  assert.deepEqual(await p2, { yaw: 2, label: 'x' })
  assert.equal(await p3, await p2)
})

test('patches made in the same tick go out as one request', async () => {
  const s = createSerialWrites()
  const sent: any[] = []
  const send = async (body: any) => { sent.push({ ...body }); return body }
  await Promise.all([s.patch('h', { yaw: 1 }, send), s.patch('h', { pitch: 2 }, send)])
  assert.deepEqual(sent, [{ yaw: 1, pitch: 2 }])
})

test('a delete is not merged into and runs after earlier patches', async () => {
  const s = createSerialWrites()
  const order: string[] = []
  const slow = defer()
  const p = s.patch('h', { yaw: 1 }, async () => { await slow.promise; order.push('patch') })
  const d = s.run('h', async () => { order.push('delete') })
  slow.resolve()
  await Promise.all([p, d])
  assert.deepEqual(order, ['patch', 'delete'])
})

test('a failed write does not block the next one', async () => {
  const s = createSerialWrites()
  await assert.rejects(s.run('k', async () => { throw new Error('x') }))
  assert.equal(await s.run('k', async () => 5), 5)
})

test('mergeById keeps newer local copies and local removals', () => {
  const server = [{ id: 'a', v: 0 }, { id: 'b', v: 0 }, { id: 'c', v: 0 }]
  const local = [{ id: 'a', v: 1 }, { id: 'b', v: 1 }, { id: 'tmp', v: 1, pending: true }, { id: 'new', v: 1 }]
  const newer = new Set(['b', 'c', 'new'])
  const out = mergeById(server, local, id => newer.has(id), (h: any) => !!h.pending)
  assert.deepEqual(out, [{ id: 'a', v: 0 }, { id: 'b', v: 1 }, { id: 'tmp', v: 1, pending: true }, { id: 'new', v: 1 }])
})
