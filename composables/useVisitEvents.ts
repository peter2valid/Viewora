// What visitors do inside a tour with guided visits, for the owner's dashboard
// (POST /analytics/events → visit_events, migration-visit-events.sql).
//
// Anonymous: a random visitor id kept in this browser (so returning visitors
// count once) and a random id for this page load. Events are queued and sent
// in small batches; when the page is hidden or closed, what's left goes with
// navigator.sendBeacon as text/plain (a JSON type would need a CORS preflight,
// which a beacon can't make). Nothing here may ever break the tour: every
// failure is silent.

export type VisitEvent =
  | 'tour_open' | 'session_end' | 'scene_view'
  | 'visit_start' | 'step_reached' | 'visit_complete' | 'visit_exit'
  | 'area_open' | 'area_complete' | 'route_start' | 'route_arrive'

export interface VisitEventData {
  journeyId?: string
  sceneId?: string
  step?: number
  value?: number
  meta?: { device?: 'phone' | 'tablet' | 'desktop'; from?: string }
}

const VISITOR_KEY = 'viewora:visitor'
const FLUSH_MS = 15000
const MAX_BATCH = 50
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function randomId(): string {
  try { return crypto.randomUUID().replace(/-/g, '') } catch { /* old browser */ }
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('')
}

function visitorId(): string {
  try {
    const v = localStorage.getItem(VISITOR_KEY)
    if (v && /^[\w-]{8,64}$/.test(v)) return v
    const id = randomId()
    localStorage.setItem(VISITOR_KEY, id)
    return id
  } catch {
    return randomId() // private mode: counted per page load
  }
}

export function deviceKind(): 'phone' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const short = Math.min(window.screen?.width ?? 1024, window.screen?.height ?? 768)
  if (coarse && short < 600) return 'phone'
  if (coarse) return 'tablet'
  return 'desktop'
}

/** Drops ids the API would reject (a whole batch fails on one bad row). */
function clean(e: VisitEventData): VisitEventData {
  const out: VisitEventData = {}
  if (e.journeyId && UUID.test(e.journeyId)) out.journeyId = e.journeyId
  if (e.sceneId && UUID.test(e.sceneId)) out.sceneId = e.sceneId
  if (typeof e.step === 'number' && e.step >= 0) out.step = Math.min(1000, Math.round(e.step))
  if (typeof e.value === 'number' && e.value >= 0) out.value = Math.min(86_400_000, Math.round(e.value))
  if (e.meta) {
    const m: VisitEventData['meta'] = {}
    if (e.meta.device) m.device = e.meta.device
    if (e.meta.from && UUID.test(e.meta.from)) m.from = e.meta.from
    if (m.device || m.from) out.meta = m
  }
  return out
}

export function createVisitEvents(spaceId: string, apiBase: string) {
  const sessionId = randomId()
  const visitor = visitorId()
  const url = `${apiBase.replace(/\/$/, '')}/analytics/events`
  let queue: ({ event: VisitEvent } & VisitEventData)[] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let visibleSince = Date.now()
  let visibleMs = 0
  let ended = false

  function send(beacon: boolean) {
    while (queue.length) {
      const events = queue.splice(0, MAX_BATCH)
      const body = JSON.stringify({ spaceId, visitorId: visitor, sessionId, events })
      try {
        if (beacon && navigator.sendBeacon?.(url, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) continue
        void fetch(url, { method: 'POST', body, headers: { 'content-type': 'text/plain;charset=UTF-8' }, keepalive: true, mode: 'cors', credentials: 'omit' }).catch(() => {})
      } catch { /* never break the tour */ }
    }
  }

  function track(event: VisitEvent, data: VisitEventData = {}) {
    if (ended && event !== 'session_end') return
    queue.push({ event, ...clean(data) })
    if (queue.length >= 20) send(false)
  }

  // Time on the tour counts only while it's on screen.
  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      visibleMs += Date.now() - visibleSince
      // A phone may never fire pagehide: report the time so far now, and
      // again (larger) if they come back and leave later. The dashboard takes
      // the median per session row, so send it only on the final hide.
      send(true)
    } else {
      visibleSince = Date.now()
    }
  }
  function onPageHide() {
    if (ended) return
    if (document.visibilityState !== 'hidden') visibleMs += Date.now() - visibleSince
    ended = true
    queue.push({ event: 'session_end', value: Math.min(86_400_000, visibleMs) })
    send(true)
  }

  function start() {
    if (typeof window === 'undefined' || timer) return
    track('tour_open', { meta: { device: deviceKind() } })
    timer = setInterval(() => send(false), FLUSH_MS)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
  }

  function stop() {
    onPageHide()
    if (timer) clearInterval(timer)
    timer = null
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onPageHide)
  }

  return { start, stop, track }
}
