// How long a journey line lasts, followed by its own clock.
//
// With a recording, the audio element *is* the clock: the line ends when the
// clip ends, and pausing, resuming or seeking the clip moves the visit with it
// (no setTimeout guessing). Without one, a reading-time timer that pauses with
// the visit. If a clip stops advancing (blocked autoplay, network gone), the
// line carries on from where the clip got to on the timer, so a visit never
// hangs on a broken file.

export interface ClipLike {
  currentTime: number
  readonly duration: number
  readonly ended: boolean
  play(): Promise<void> | void
  pause(): void
}

export interface LineOptions {
  /** The line's recording, already pointing at its file; null/undefined = timed by `ms`. */
  clip?: ClipLike | null
  /** Expected length in ms: the recording's length, or the reading time. */
  ms: number
  /** How much of the line was already heard (resuming after a pause). */
  from?: number
  stopped: () => boolean
  now?: () => number
  /** Ticker: calls fn regularly until the returned function is called. */
  every?: (fn: () => void) => () => void
  /** A clip that doesn't move for this long is given up on (timer takes over). */
  stallMs?: number
}

export interface LineResult {
  /** true = heard to the end; false = stopped part-way. */
  finished: boolean
  /** ms heard so far: pass back as `from` to resume there. */
  at: number
}

const defaultEvery = (fn: () => void) => {
  const t = setInterval(fn, 50)
  return () => clearInterval(t)
}

export function runLine(o: LineOptions): Promise<LineResult> {
  const now = o.now ?? (() => Date.now())
  const every = o.every ?? defaultEvery
  const stallMs = o.stallMs ?? 6000
  const total = Math.max(0, o.ms)
  const from = Math.min(Math.max(0, o.from ?? 0), total)

  return new Promise((resolve) => {
    let clip = o.clip ?? null
    // Timer mode: elapsed = base + (now - startedAt).
    let base = from
    let startedAt = now()
    let lastPos = from
    let lastMoveAt = now()
    let done = false

    const finish = (r: LineResult) => {
      if (done) return
      done = true
      cancel()
      resolve(r)
    }
    const toTimer = (atMs: number) => {
      try { clip?.pause() } catch { /* ignore */ }
      clip = null
      base = atMs
      startedAt = now()
    }

    if (clip) {
      try {
        if (from > 0) clip.currentTime = from / 1000
        const p = clip.play()
        if (p && typeof (p as Promise<void>).catch === 'function') {
          // Autoplay refused or the file won't load: time the line instead.
          (p as Promise<void>).catch(() => { if (!done && clip) toTimer(clip.currentTime * 1000) })
        }
      } catch {
        toTimer(from)
      }
    }

    const cancel = every(() => {
      if (done) return
      if (clip) {
        const pos = clip.currentTime * 1000
        if (o.stopped()) { try { clip.pause() } catch { /* ignore */ } return finish({ finished: false, at: pos }) }
        const end = Number.isFinite(clip.duration) && clip.duration > 0 ? clip.duration * 1000 : total
        if (clip.ended || pos >= end - 30) return finish({ finished: true, at: end })
        if (pos !== lastPos) { lastPos = pos; lastMoveAt = now() }
        else if (now() - lastMoveAt > stallMs) toTimer(pos)
        return
      }
      const at = base + (now() - startedAt)
      if (o.stopped()) return finish({ finished: false, at: Math.min(at, total) })
      if (at >= total) finish({ finished: true, at: total })
    })
  })
}
