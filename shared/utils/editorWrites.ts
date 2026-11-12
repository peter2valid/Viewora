/**
 * Keeps fast editing consistent.
 *
 * The editor updates the screen straight away and saves in the background. Three
 * things used to undo or reorder that work when the user moved quickly:
 *
 *  1. Background reloads (realtime events, the upload poll, per-scene hotspot
 *     loads) replaced local state wholesale. A reload whose request left before
 *     a save landed brought back the old value: a hotspot moved, then jumped back.
 *  2. Every save of ours came back as a realtime event and triggered one of
 *     those reloads, on top of the save's own response.
 *  3. Two quick saves of the same item went out in parallel, so the server could
 *     apply them out of order and keep the older one.
 *
 * WriteTracker answers "is the copy a reload brought back older than what's on
 * screen?" (1) and "is this realtime event our own echo?" (2). SerialWrites keeps
 * one request in flight per item and folds queued patches together (3).
 */

export type WriteTracker = ReturnType<typeof createWriteTracker>

export function createWriteTracker(opts: { echoWindowMs?: number; now?: () => number } = {}) {
  const echoWindowMs = opts.echoWindowMs ?? 3000
  const now = opts.now ?? (() => Date.now())
  let epoch = 0
  const inflight = new Map<string, number>()
  const touched = new Map<string, { epoch: number; at: number }>()

  function touch(id: string) {
    touched.set(id, { epoch: ++epoch, at: now() })
    if (touched.size > 2000) {
      const cutoff = now() - echoWindowMs * 4
      for (const [k, v] of touched) if (v.at < cutoff && !inflight.has(k)) touched.delete(k)
    }
  }

  function begin(ids: string[]) {
    for (const id of ids) {
      inflight.set(id, (inflight.get(id) ?? 0) + 1)
      touch(id)
    }
  }

  function end(ids: string[]) {
    for (const id of ids) {
      const n = (inflight.get(id) ?? 1) - 1
      if (n > 0) inflight.set(id, n)
      else inflight.delete(id)
      // Stamp again on settle: a reload that started while this write was in
      // flight may hold the pre-write row even though the write is done now.
      touch(id)
    }
  }

  return {
    /** Runs `work` as a write to `ids`; reloads keep the local copy of those ids until it settles. */
    track<T>(ids: string | string[], work: Promise<T> | (() => Promise<T>)): Promise<T> {
      const list = Array.isArray(ids) ? ids.filter(Boolean) : [ids].filter(Boolean)
      begin(list)
      let p: Promise<T>
      try {
        p = typeof work === 'function' ? work() : work
      } catch (err) {
        end(list)
        return Promise.reject(err)
      }
      return p.finally(() => end(list))
    },
    /** Marks `id` as just changed locally without a request (e.g. an id swap). */
    touch,
    /**
     * After a failed write: let the next reload take the server's copy of `id`
     * again (writes still in flight keep protecting it).
     */
    forget(id: string) {
      touched.delete(id)
    },
    /** Call when a reload starts; pass the result to isNewerThan() when it lands. */
    mark(): number {
      return epoch
    },
    /** True if the local copy of `id` may be newer than a reload that started at `since`. */
    isNewerThan(id: string, since: number): boolean {
      return inflight.has(id) || (touched.get(id)?.epoch ?? -1) > since
    },
    /** True if a realtime event about `id` is most likely the echo of our own write. */
    isOwnEcho(id: string | null | undefined): boolean {
      if (!id) return false
      if (inflight.has(id)) return true
      const t = touched.get(id)
      return !!t && now() - t.at < echoWindowMs
    },
    busy(): boolean {
      return inflight.size > 0
    },
  }
}

export type SerialWrites = ReturnType<typeof createSerialWrites>

/**
 * One request at a time per key, in the order they were made. Patches queued
 * behind a running request are merged into one, so a burst of edits to the
 * same item costs at most two requests and the last edit always wins.
 */
export function createSerialWrites() {
  const tails = new Map<string, Promise<unknown>>()
  const openPatch = new Map<string, { body: Record<string, any>; promise: Promise<any> }>()

  function chain<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = tails.get(key) ?? Promise.resolve()
    const next = prev.then(fn, fn)
    const tail = next.then(() => {}, () => {})
    tails.set(key, tail)
    void tail.then(() => { if (tails.get(key) === tail) tails.delete(key) })
    return next
  }

  return {
    /** Queue any write (e.g. a DELETE) behind earlier writes to `key`. */
    run<T>(key: string, fn: () => Promise<T>): Promise<T> {
      // Nothing may merge into a patch that is ordered before this write.
      openPatch.delete(key)
      return chain(key, fn)
    },
    /**
     * Queue a partial update. If a patch to `key` is waiting (not yet sent),
     * `body` is merged into it and both callers share its result.
     */
    patch<T>(key: string, body: Record<string, any>, send: (body: Record<string, any>) => Promise<T>): Promise<T> {
      const open = openPatch.get(key)
      if (open) {
        Object.assign(open.body, body)
        return open.promise as Promise<T>
      }
      const entry = { body: { ...body }, promise: null as unknown as Promise<T> }
      openPatch.set(key, entry)
      entry.promise = chain(key, () => {
        if (openPatch.get(key) === entry) openPatch.delete(key)
        return send(entry.body)
      })
      return entry.promise
    },
    pending(key: string): boolean {
      return tails.has(key)
    },
  }
}

/**
 * Merges a list a reload brought back with the list on screen. Items with a
 * local write newer than the reload keep their local copy (or stay removed);
 * everything else takes the server's copy. Unsaved local items (`keepLocal`)
 * are carried over.
 */
export function mergeById<T extends { id: string }>(
  server: T[],
  local: T[] | undefined,
  isNewer: (id: string) => boolean,
  keepLocal: (item: T) => boolean = () => false,
  combine: (server: T, local: T) => T = (_s, l) => l,
): T[] {
  const localById = new Map((local ?? []).map(h => [h.id, h]))
  const out: T[] = []
  const seen = new Set<string>()
  for (const s of server) {
    seen.add(s.id)
    if (!isNewer(s.id)) { out.push(s); continue }
    const l = localById.get(s.id)
    if (l) out.push(combine(s, l))
    // else: removed locally and the delete is still settling — keep it removed
  }
  for (const l of local ?? []) {
    if (seen.has(l.id)) continue
    if (keepLocal(l) || isNewer(l.id)) out.push(l)
  }
  return out
}
