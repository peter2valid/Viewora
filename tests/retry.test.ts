import test from 'node:test'
import assert from 'node:assert/strict'
import { withRetry, isRetryableError } from '../shared/utils/retry.ts'

const noSleep = async () => {}

test('retries network errors and 5xx until it succeeds', async () => {
  let calls = 0
  const out = await withRetry(async () => {
    calls++
    if (calls === 1) throw new TypeError('fetch failed')
    if (calls === 2) throw { response: { status: 503 } }
    return 'ok'
  }, { sleep: noSleep })
  assert.equal(out, 'ok')
  assert.equal(calls, 3)
})

test('does not retry errors the user must act on (4xx)', async () => {
  let calls = 0
  await assert.rejects(withRetry(async () => { calls++; throw { statusCode: 403 } }, { sleep: noSleep }))
  assert.equal(calls, 1)
  assert.equal(isRetryableError({ status: 429 }), true)
  assert.equal(isRetryableError({ status: 400 }), false)
})

test('gives up after the last delay', async () => {
  let calls = 0
  await assert.rejects(withRetry(async () => { calls++; throw new Error('down') }, { delays: [1, 1], sleep: noSleep }))
  assert.equal(calls, 3)
})
