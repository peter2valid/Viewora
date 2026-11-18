// Run with: tsx --test tests/embedPolicy.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanOrigins, withFrameAncestors } from '../shared/utils/embedPolicy.ts'

const CSP = "default-src 'self'; img-src 'self' data:; frame-src 'self'"

test('no partner sites: the CSP is unchanged', () => {
  assert.equal(withFrameAncestors(CSP, [], 'https://app.viewora.software'), CSP)
})

test('partner sites become frame-ancestors, and Viewora can still frame itself', () => {
  const out = withFrameAncestors(CSP, ['https://cars.example.co.ke'], 'https://app.viewora.software')
  assert.match(out, /frame-ancestors 'self' https:\/\/app\.viewora\.software https:\/\/cars\.example\.co\.ke$/)
  assert.match(out, /^default-src 'self'; img-src 'self' data:; frame-src 'self'; /)
})

test('an existing frame-ancestors rule is replaced, not doubled', () => {
  const out = withFrameAncestors(`${CSP}; frame-ancestors *`, ['https://a.co.ke'], 'https://app.viewora.software')
  assert.equal(out.match(/frame-ancestors/g)!.length, 1)
  assert.doesNotMatch(out, /frame-ancestors \*/)
})

test('anything that is not a clean origin is dropped', () => {
  assert.deepEqual(cleanOrigins([
    'https://ok.co.ke', 'https://ok.co.ke', 'http://localhost:3000',
    "https://evil.com; script-src *", 'http://plain-http.com', 'https://x.com/path', '*', 42,
  ]), ['https://ok.co.ke', 'http://localhost:3000'])
  assert.deepEqual(cleanOrigins('nope'), [])
})
