// Object Spotlight, the part that ships with the tour. It stays small: it
// knows which scenes have spotlight data (scenes.generated.ts), fetches a
// scene's JSON only when that scene opens, and listens for the visitor
// opening an object (a tap on it, its hint ring, or zooming in on it). The
// effect itself (GSAP and the overlay) is a separate chunk, imported the first
// time a spotlight opens: ./runSpotlight.ts.
//
// Data and script: scripts/spotlight/README.md. 3D plans: Notes/3d-render-spotlight.md.
import type { PsvViewerHandle } from '~/shared/utils/viewerAdapters/psvAdapter'
import { SPOTLIGHT_SCENES } from './scenes.generated'
import type { SpotlightEndReason, SpotlightObject, SpotlightRun, SpotlightScene } from './types'

export type { SpotlightObject, SpotlightScene } from './types'

export interface SpotlightHost {
  /** Something else owns the camera (a scene change, an info card, a guided visit, VR...). */
  isBlocked: () => boolean
  /** A spotlight opened / closed: hold and restore autorotate. */
  onStart: () => void
  onEnd: () => void
  /** Viewer in lite mode (weak device or slow network). */
  lite: () => boolean
}

export interface SpotlightController {
  /** The open scene changed (closes a spotlight and loads that scene's objects, if it has any). */
  setScene: (sceneId: string) => void
  /** The pointer is over an object, or a spotlight is open: the floor cursor stands aside. */
  claimsPointer: () => boolean
  destroy: () => void
}

const HINT_PREFIX = 'vw-spot-'
/** Zooming in to within this many zoom levels of an object's own zoom opens it. */
const ZOOM_SLACK = 15
/** Wait for the zoom to stop before deciding. */
const ZOOM_SETTLE_MS = 320

/** Parsed scene files, kept for the visit (a revisit costs nothing). */
const sceneCache = new Map<string, Promise<SpotlightScene | null>>()

/**
 * Lite spotlight (no scan line or glow, shorter): few cores or little memory.
 * ?spotlight=lite / ?spotlight=full overrides, for testing.
 */
export function spotlightWeakDevice(): boolean {
  if (typeof window === 'undefined') return false
  const force = new URLSearchParams(window.location.search).get('spotlight')
  if (force === 'lite') return true
  if (force === 'full') return false
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency || 0
  const mem = nav.deviceMemory ?? 8
  return (cores > 0 && cores <= 4) || mem <= 4 || document.documentElement.classList.contains('device-tier-low')
}

export function hasSpotlights(sceneId: string): boolean {
  return SPOTLIGHT_SCENES.has(sceneId)
}

/**
 * The effect's code: fetched on the first open, or a moment earlier when the
 * pointer reaches an object or its ring (so the click doesn't wait for it).
 */
let effect: Promise<typeof import('./runSpotlight')> | null = null
function loadEffect() {
  if (!effect) {
    effect = import('./runSpotlight')
    effect.catch(() => { effect = null }) // offline: try again next time
  }
  return effect
}

function loadScene(sceneId: string): Promise<SpotlightScene | null> {
  let p = sceneCache.get(sceneId)
  if (!p) {
    p = fetch(`/spotlight/${encodeURIComponent(sceneId)}.json`)
      .then(r => (r.ok ? r.json() : null))
      .then((d: any) => (d && Array.isArray(d.objects) ? (d as SpotlightScene) : null))
      .catch(() => null)
    // A failed fetch may be a blip: try again next time the scene opens.
    p.then(d => { if (!d) sceneCache.delete(sceneId) })
    sceneCache.set(sceneId, p)
  }
  return p
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** An object's outline relative to its own yaw, so the 180° seam never splits it. */
interface Prepared {
  obj: SpotlightObject
  pts: Array<[number, number]>
  minX: number; maxX: number; minY: number; maxY: number
}

function prepare(obj: SpotlightObject): Prepared | null {
  if (!Array.isArray(obj.polygon) || obj.polygon.length < 3) return null
  const pts = obj.polygon.map(([y, p]) => [wrap(y - obj.yaw), p] as [number, number])
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  return { obj, pts, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

function hits(o: Prepared, yaw: number, pitch: number): boolean {
  const x = wrap(yaw - o.obj.yaw)
  const y = pitch
  if (x < o.minX || x > o.maxX || y < o.minY || y > o.maxY) return false
  let inside = false
  const pts = o.pts
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!
    const [xj, yj] = pts[j]!
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * Starts loading the voice inside the tap, and plays + pauses it at once:
 * iOS only lets an element play sound if it was first played from a tap, and
 * the real start comes later, after the effect's code has loaded.
 */
function primeVoice(src: string | undefined): HTMLAudioElement | null {
  if (!src || typeof Audio === 'undefined') return null
  const a = new Audio()
  a.preload = 'auto'
  a.setAttribute('playsinline', '')
  a.src = src
  try {
    const p = a.play()
    a.pause()
    p?.catch(() => { /* paused before it began, or not allowed without a tap */ })
  } catch { /* noop */ }
  return a
}

export function attachSpotlights(handle: PsvViewerHandle, host: SpotlightHost): SpotlightController {
  const viewer: any = handle.viewer
  const markers: any = handle.markers
  const container: HTMLElement = viewer.container

  let sceneId = ''
  let objects: Prepared[] = []
  /** Objects that may open by zooming: re-armed once the view zooms back out past them. */
  const armed = new Set<string>()
  let hintIds: string[] = []
  const hintCleanups: Array<() => void> = []
  let run: SpotlightRun | null = null
  /** The spotlight being opened (its code may still be loading). */
  let opening: object | null = null
  let zoomTimer = 0
  let pointer: { x: number; y: number } | null = null
  let destroyed = false

  const blocked = () => destroyed || !!opening || host.isBlocked()

  const warm = () => { void loadEffect() }

  function removeHints() {
    for (const c of hintCleanups.splice(0)) c()
    for (const id of hintIds) { try { markers.removeMarker(id) } catch { /* scene already cleared it */ } }
    hintIds = []
  }

  function addHints() {
    for (const o of objects) {
      if (o.obj.hint === false) continue
      const id = HINT_PREFIX + o.obj.id
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'vw-spot-hint'
      el.setAttribute('aria-label', o.obj.title)
      el.innerHTML = '<span class="vw-spot-hint__dot"></span>'
      // The panorama must not turn or click under the ring.
      const stop = (e: Event) => e.stopPropagation()
      const open = (e: Event) => { e.stopPropagation(); trigger(o) }
      el.addEventListener('pointerenter', warm)
      el.addEventListener('pointerdown', stop)
      el.addEventListener('mousedown', stop)
      el.addEventListener('touchstart', stop, { passive: true })
      el.addEventListener('click', open)
      hintCleanups.push(() => {
        el.removeEventListener('pointerenter', warm)
        el.removeEventListener('pointerdown', stop)
        el.removeEventListener('mousedown', stop)
        el.removeEventListener('touchstart', stop)
        el.removeEventListener('click', open)
      })
      try {
        markers.addMarker({ id, position: { yaw: o.obj.yaw, pitch: o.obj.pitch }, element: el, size: { width: 30, height: 30 }, anchor: 'center center', hoverScale: 1 })
        hintIds.push(id)
      } catch { /* a marker with this id is already there */ }
    }
  }

  function trigger(o: Prepared) {
    if (run || blocked()) return
    const token = {}
    opening = token
    armed.delete(o.obj.id)
    const voice = primeVoice(o.obj.voiceSrc)
    container.classList.add('vw-spot-on')
    host.onStart()
    const end = (_reason: SpotlightEndReason) => {
      if (opening === token) opening = null
      run = null
      container.classList.remove('vw-spot-on')
      host.onEnd()
    }
    loadEffect()
      .then(({ runSpotlight }) => {
        if (opening !== token || destroyed) { voice?.removeAttribute('src'); return }
        opening = null
        run = runSpotlight(viewer, o.obj, { voice, lite: host.lite(), onEnd: end })
      })
      .catch(() => {
        // The chunk didn't load (offline): nothing opened, nothing to undo.
        voice?.removeAttribute('src')
        if (opening === token) { opening = null; container.classList.remove('vw-spot-on'); host.onEnd() }
      })
  }

  function close(reason: SpotlightEndReason) {
    if (run) { run.dismiss(reason); return }
    if (opening) { opening = null; container.classList.remove('vw-spot-on'); host.onEnd() }
  }

  // A tap on the panorama: closes an open spotlight, or opens the object under it.
  // MarkersPlugin stops this event for taps on markers, so hotspots keep theirs.
  const onClick = (e: any) => {
    if (run) { run.dismiss('tap'); return }
    if (!objects.length || e?.data?.rightclick || blocked()) return
    const { yaw, pitch } = e?.data ?? {}
    if (typeof yaw !== 'number' || typeof pitch !== 'number') return
    const o = objects.find(p => hits(p, yaw, pitch))
    if (o) trigger(o)
  }

  // Zooming in on an object opens it, once the zoom stops.
  const checkZoom = () => {
    zoomTimer = 0
    if (run || !objects.length || blocked()) return
    const z = viewer.getZoomLevel?.() ?? 0
    const pos = viewer.getPosition?.()
    if (!pos) return
    for (const o of objects) {
      if (z < o.obj.zoom - ZOOM_SLACK) { armed.add(o.obj.id); continue }
      if (armed.has(o.obj.id) && hits(o, pos.yaw, pos.pitch)) { trigger(o); return }
    }
  }
  const onZoom = () => {
    if (run || opening || !objects.length) return
    if (zoomTimer) clearTimeout(zoomTimer)
    zoomTimer = window.setTimeout(checkZoom, ZOOM_SETTLE_MS)
  }

  // Mouse position only (numbers), read lazily by claimsPointer().
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    pointer = { x: e.clientX, y: e.clientY }
  }
  const onPointerLeave = () => { pointer = null }

  viewer.addEventListener('click', onClick)
  viewer.addEventListener('zoom-updated', onZoom)
  container.addEventListener('pointermove', onPointerMove, { passive: true })
  container.addEventListener('pointerleave', onPointerLeave)

  return {
    setScene(id: string) {
      if (id === sceneId) return
      close('scene')
      removeHints()
      if (zoomTimer) { clearTimeout(zoomTimer); zoomTimer = 0 }
      sceneId = id
      objects = []
      armed.clear()
      if (!id || !hasSpotlights(id)) return
      void loadScene(id).then((data) => {
        if (destroyed || sceneId !== id || !data) return
        objects = data.objects.map(prepare).filter((p): p is Prepared => !!p)
        const z = viewer.getZoomLevel?.() ?? 0
        for (const o of objects) if (z < o.obj.zoom - ZOOM_SLACK) armed.add(o.obj.id)
        addHints()
      })
    },
    claimsPointer() {
      if (run || opening) return true
      if (!pointer || !objects.length) return false
      try {
        const r = container.getBoundingClientRect()
        const p = viewer.dataHelper.viewerCoordsToSphericalCoords({ x: pointer.x - r.left, y: pointer.y - r.top })
        const over = !!p && objects.some(o => hits(o, p.yaw, p.pitch))
        if (over) warm()
        return over
      } catch {
        return false
      }
    },
    destroy() {
      if (destroyed) return
      close('scene')
      destroyed = true
      removeHints()
      if (zoomTimer) clearTimeout(zoomTimer)
      try { viewer.removeEventListener('click', onClick) } catch { /* viewer gone */ }
      try { viewer.removeEventListener('zoom-updated', onZoom) } catch { /* viewer gone */ }
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
    },
  }
}
