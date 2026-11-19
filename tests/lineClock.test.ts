// Run with: tsx --test tests/lineClock.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { runLine, type ClipLike } from '../shared/utils/lineClock.ts'

// A hand-cranked clock and ticker: each crank moves time on and runs one tick.
function harness() {
  let t = 0
  let fn: (() => void) | null = null
  return {
    now: () => t,
    every: (f: () => void) => { fn = f; return () => { fn = null } },
    async crank(ms: number, clip?: FakeClip) {
      t += ms
      clip?.advance(ms)
      fn?.()
      await new Promise(r => setImmediate(r))
    },
  }
}

class FakeClip implements ClipLike {
  currentTime = 0
  ended = false
  playing = false
  stuck = false
  constructor(public duration: number, private refuse = false) {}
  play() { if (this.refuse) return Promise.reject(new Error('NotAllowedError')); this.playing = true; return Promise.resolve() }
  pause() { this.playing = false }
  advance(ms: number) {
    if (!this.playing || this.stuck) return
    this.currentTime = Math.min(this.duration, this.currentTime + ms / 1000)
    if (this.currentTime >= this.duration) { this.ended = true; this.playing = false }
  }
}

test('a recorded line lasts as long as its clip', async () => {
  const h = harness(); const clip = new FakeClip(2)
  let r: any = null
  runLine({ clip, ms: 2000, stopped: () => false, now: h.now, every: h.every }).then(x => { r = x })
  await h.crank(0, clip)
  for (let i = 0; i < 19; i++) await h.crank(100, clip)
  assert.equal(r, null) // 1.9 s in: still talking
  await h.crank(100, clip); await h.crank(0, clip)
  assert.deepEqual(r, { finished: true, at: 2000 })
})

test('pause stops the clip where it is; resume carries on from there', async () => {
  const h = harness(); const clip = new FakeClip(3)
  let stop = false
  let r: any = null
  runLine({ clip, ms: 3000, stopped: () => stop, now: h.now, every: h.every }).then(x => { r = x })
  for (let i = 0; i < 12; i++) await h.crank(100, clip)
  stop = true; await h.crank(0, clip)
  assert.equal(r.finished, false)
  assert.ok(Math.abs(r.at - 1200) < 1, `paused at ${r.at}`)
  assert.equal(clip.playing, false)

  // Resume the same line from where it stopped: 1.8 s left.
  const h2 = harness(); let r2: any = null
  runLine({ clip, ms: 3000, from: r.at, stopped: () => false, now: h2.now, every: h2.every }).then(x => { r2 = x })
  assert.ok(Math.abs(clip.currentTime - 1.2) < 1e-9)
  for (let i = 0; i < 17; i++) await h2.crank(100, clip)
  assert.equal(r2, null)
  await h2.crank(100, clip); await h2.crank(0, clip)
  assert.equal(r2?.finished, true)
})

test('seeking the clip forward ends the line sooner (timing follows the audio)', async () => {
  const h = harness(); const clip = new FakeClip(10)
  let r: any = null
  runLine({ clip, ms: 10000, stopped: () => false, now: h.now, every: h.every }).then(x => { r = x })
  await h.crank(500, clip)
  clip.currentTime = 9.8 // someone dragged the clip near its end
  await h.crank(300, clip); await h.crank(0, clip)
  assert.equal(r?.finished, true)
  assert.ok(h.now() < 1000)
})

test('no recording: a reading-time timer that pauses and resumes', async () => {
  const h = harness()
  let stop = false; let r: any = null
  runLine({ ms: 2000, stopped: () => stop, now: h.now, every: h.every }).then(x => { r = x })
  await h.crank(1500)
  stop = true; await h.crank(10)
  assert.deepEqual(r, { finished: false, at: 1510 })
  let r2: any = null
  runLine({ ms: 2000, from: r.at, stopped: () => false, now: h.now, every: h.every }).then(x => { r2 = x })
  await h.crank(400); assert.equal(r2, null)
  await h.crank(100); assert.deepEqual(r2, { finished: true, at: 2000 })
})

test('blocked autoplay falls back to the timer, so the visit never hangs', async () => {
  const h = harness(); const clip = new FakeClip(2, true)
  let r: any = null
  runLine({ clip, ms: 2000, stopped: () => false, now: h.now, every: h.every }).then(x => { r = x })
  await h.crank(0, clip) // play() rejection lands
  await h.crank(1900); assert.equal(r, null)
  await h.crank(200); assert.equal(r?.finished, true)
})

test('a clip that stops moving (network gone) hands over to the timer from where it got to', async () => {
  const h = harness(); const clip = new FakeClip(5)
  let r: any = null
  runLine({ clip, ms: 5000, stallMs: 1000, stopped: () => false, now: h.now, every: h.every }).then(x => { r = x })
  for (let i = 0; i < 10; i++) await h.crank(100, clip) // 1 s heard
  clip.stuck = true
  for (let i = 0; i < 12; i++) await h.crank(100, clip) // stalls, timer takes over at ~1 s
  assert.equal(r, null)
  for (let i = 0; i < 40; i++) await h.crank(100, clip)
  assert.equal(r?.finished, true)
  assert.ok(h.now() >= 5000 && h.now() <= 6400, `ended at ${h.now()}`)
})

test('reports how far the line has got, for the progress bar', async () => {
  const h = harness()
  const seen: number[] = []
  const done = runLine({ ms: 1000, stopped: () => false, now: h.now, every: h.every, onProgress: (at, of) => seen.push(at / of) })
  await h.crank(250); await h.crank(250); await h.crank(600)
  await done
  assert.equal(seen[0], 0, 'starts empty')
  assert.deepEqual(seen.slice(1, 3), [0.25, 0.5])
  assert.equal(seen.at(-1), 1, 'ends full, never past it')
})

test('progress follows the recording, and resumes where it paused', async () => {
  const h = harness()
  const clip = new FakeClip(2)
  const seen: number[] = []
  const done = runLine({ clip, ms: 2000, from: 500, stopped: () => false, now: h.now, every: h.every, onProgress: (at, of) => seen.push(at / of) })
  assert.equal(seen[0], 0.25, 'a resumed line starts part-filled')
  await h.crank(500, clip)
  assert.equal(seen.at(-1), 0.5)
  await h.crank(1100, clip)
  await done
})
