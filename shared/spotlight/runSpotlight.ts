// Object Spotlight, the effect (a lazy chunk: imported by ./index.ts the first
// time a visitor opens an object, so GSAP never weighs on the tour's first load).
//
//   camera eases to the object (PSV animate) → the rest of the scene dims →
//   the outline traces the object → a leader line draws out to a small panel →
//   title and lines type in, finishing with the voice → it closes on a tap,
//   ✕, Esc, any drag or zoom, a scene change or the tab going hidden.
//
// Frame-rate rules (the panorama must not lose a frame):
// - The overlay is built ONCE after the camera lands: the outline is projected
//   to the screen a single time. Nothing follows the view; a drag or zoom closes it.
// - Only opacity and transform are animated, plus stroke-dashoffset on SVGs
//   no bigger than the object (the full-screen dim layer only fades).
// - No filters, blurs or box-shadows. The glow is a wider faint stroke.
// - will-change only while something is moving. One timeline per spotlight,
//   killed on close; every listener is removed on close.
import { gsap } from 'gsap'
import { cameraMoveMs } from '~/shared/utils/viewerAdapters/psvAdapter'
import type { SpotlightEndReason, SpotlightObject, SpotlightRun } from './types'
import './spotlight.css'

export interface RunOptions {
  voice: HTMLAudioElement | null
  lite: boolean
  onEnd: (reason: SpotlightEndReason) => void
  /**
   * Pixels at the bottom of the view covered by something that stays up (a
   * guided visit's bar): the object is framed in the view above it, and the
   * panel never goes under it.
   */
  bottomInset?: number
}

const SVGNS = 'http://www.w3.org/2000/svg'
/** Seconds the finished panel stays up after the voice ends, then it closes itself. */
const LINGER_S = 4
/** Extra seconds when the visitor has folded the panel to look at the object. */
const MINI_LINGER_S = 6
/** Waiting longer than this for the voice's length: go on with a reading time. */
const VOICE_WAIT_MS = 1500
/** Typing never runs faster than this (characters a second). */
const MAX_CPS = 60
/** A drag or zoom smaller than this is PSV settling, not the visitor. */
const MOVE_EPS = 0.002
const ZOOM_EPS = 0.5

/**
 * The pitch to aim at so obj sits in the middle of the view above a covered
 * band of `inset` px (the camera looks a little lower, the object rides up).
 */
function framedPitch(viewer: any, obj: SpotlightObject, inset: number, zoom: number): number {
  const h: number = viewer.state?.size?.height || viewer.container?.clientHeight || 0
  if (!inset || !h) return obj.pitch
  let vfov = 60
  try { vfov = viewer.dataHelper.zoomLevelToFov(zoom) } catch { /* default */ }
  const shift = ((Math.min(inset, h * 0.6) / 2) / h) * (vfov * Math.PI / 180)
  return Math.max(-Math.PI / 2, Math.min(Math.PI / 2, obj.pitch - shift))
}

/**
 * The zoom to land at: the one saved for the object, or wider if the object
 * wouldn't fit the view at it. Studio picks the zoom on a wide screen; a phone
 * held upright shows less than half that width, and the object's edges ended
 * up off screen. Both directions are checked, with some room round it (and
 * only the part of the view above a covered band counts).
 */
function fitZoom(viewer: any, obj: SpotlightObject, inset: number): number {
  const size = viewer.state?.size
  const w: number = size?.width || viewer.container?.clientWidth || 0
  const h: number = (size?.height || viewer.container?.clientHeight || 0) - Math.min(inset, (size?.height || 0) * 0.6)
  const minFov: number = viewer.config?.minFov
  const maxFov: number = viewer.config?.maxFov
  if (!w || !h || !Number.isFinite(minFov) || !Number.isFinite(maxFov) || maxFov <= minFov || !obj.polygon?.length) return obj.zoom
  // The object's angular size round its centre (yaw unwrapped).
  let yMin = 0, yMax = 0, pMin = Infinity, pMax = -Infinity
  for (const [yaw, pitch] of obj.polygon) {
    const dy = Math.atan2(Math.sin(yaw - obj.yaw), Math.cos(yaw - obj.yaw))
    yMin = Math.min(yMin, dy); yMax = Math.max(yMax, dy)
    pMin = Math.min(pMin, pitch); pMax = Math.max(pMax, pitch)
  }
  // Half-angles it needs either side of the centre, plus room for the brackets
  // (on a phone the panel sits above or below, so height gets more room).
  const ROOM_X = 1.18, ROOM_Y = w < h ? 1.9 : 1.3
  const halfX = Math.max(-yMin, yMax) * ROOM_X
  const halfY = Math.max(obj.pitch - pMin, pMax - obj.pitch) * ROOM_Y
  // Vertical fov (degrees) that shows those: PSV's fov is vertical.
  const needX = 2 * Math.atan(Math.tan(Math.min(halfX, 1.45)) * (h / w))
  const needY = 2 * Math.min(halfY, 1.45)
  const need = Math.min(maxFov, Math.max(needX, needY) * 180 / Math.PI)
  const level = ((maxFov - need) / (maxFov - minFov)) * 100
  return Math.max(0, Math.min(obj.zoom, level))
}

// Open spotlights and their listeners, for the leak check (window.__vwSpotlight()).
let liveRuns = 0
let liveListeners = 0
if (typeof window !== 'undefined') {
  ;(window as any).__vwSpotlight = () => ({
    runs: liveRuns,
    listeners: liveListeners,
    gsapChildren: gsap.globalTimeline.getChildren(true, true, true).length,
    overlays: document.querySelectorAll('.vw-spot').length,
  })
}

// GSAP's one-time setup (its CSS and attribute plugins, first-call paths)
// runs soon after this module loads (usually on hover), in an idle moment of
// its own, instead of on the frame the dim starts. A throwaway timeline on
// detached elements, gone at once. (Run inside the module load, it made that
// task twice as long.)
function warmGsap() {
  try {
    const el = document.createElement('div')
    const path = document.createElementNS(SVGNS, 'path')
    const t = gsap.timeline({ paused: true })
    t.fromTo(el, { opacity: 0, x: 1 }, { opacity: 1, x: 0, duration: 1 })
    t.fromTo(path, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1 })
    t.progress(1).kill()
  } catch { /* only a warm-up */ }
}
if (typeof window !== 'undefined') {
  const ric = (window as any).requestIdleCallback as ((cb: () => void, o?: { timeout: number }) => number) | undefined
  if (ric) ric(warmGsap, { timeout: 400 })
  else setTimeout(warmGsap, 60)
}

function readingSeconds(obj: SpotlightObject): number {
  const words = [obj.title, ...obj.lines].join(' ').split(/\s+/).filter(Boolean).length
  return Math.min(16, Math.max(3.5, words / 2.6 + 1))
}

function voiceSeconds(a: HTMLAudioElement | null): Promise<number | null> {
  if (!a) return Promise.resolve(null)
  const ok = () => Number.isFinite(a.duration) && a.duration > 0
  if (ok()) return Promise.resolve(a.duration)
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(t)
      a.removeEventListener('loadedmetadata', done)
      a.removeEventListener('error', done)
      resolve(ok() ? a.duration : null)
    }
    const t = setTimeout(done, VOICE_WAIT_MS)
    a.addEventListener('loadedmetadata', done)
    a.addEventListener('error', done)
  })
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVGNS, tag)
  for (const k in attrs) el.setAttribute(k, String(attrs[k]))
  return el
}

const fmt = (n: number) => Math.round(n * 10) / 10

function perimeter(pts: Array<{ x: number; y: number }>, closed: boolean): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y)
  if (closed && pts.length > 2) len += Math.hypot(pts[0]!.x - pts[pts.length - 1]!.x, pts[0]!.y - pts[pts.length - 1]!.y)
  return Math.ceil(len) + 2
}

/** A line of text that types in place: the hidden full copy holds the box at its final size. */
function typedLine(cls: string, text: string): { el: HTMLElement; node: Text; text: string } {
  const el = document.createElement('p')
  el.className = cls
  const ghost = document.createElement('span')
  ghost.className = 'vw-spot__ghost'
  ghost.textContent = text
  const typed = document.createElement('span')
  typed.className = 'vw-spot__typed'
  typed.setAttribute('aria-hidden', 'true')
  const node = document.createTextNode('')
  typed.appendChild(node)
  el.append(ghost, typed)
  return { el, node, text }
}

export function runSpotlight(viewer: any, obj: SpotlightObject, opts: RunOptions): SpotlightRun {
  const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const lite = opts.lite
  const container: HTMLElement = viewer.container
  const adapter: any = viewer.adapter
  const voice = opts.voice
  const zoom0: number = viewer.getZoomLevel?.() ?? 50

  let state: 'moving' | 'open' | 'closed' = 'moving'
  let root: HTMLElement | null = null
  let tl: gsap.core.Timeline | null = null
  let linger: gsap.core.Tween | null = null
  let starter = 0
  let landed = { yaw: obj.yaw, pitch: obj.pitch, zoom: obj.zoom }
  /** Folded to a small label by a tap (phones): the outline stays, the panel waits. */
  let mini = false
  let fold: ((on: boolean) => void) | null = null
  let small = false
  /** Folded: redraw the following outline (after the view moved). */
  let trackRedraw: (() => void) | null = null
  /** When the folded view was last looked around (the auto close waits for a pause). */
  let lastLook = 0
  const awayFromLanding = () => {
    const p = viewer.getPosition?.()
    const z = viewer.getZoomLevel?.() ?? landed.zoom
    if (!p) return false
    const dy = Math.abs(Math.atan2(Math.sin(p.yaw - landed.yaw), Math.cos(p.yaw - landed.yaw)))
    return dy > MOVE_EPS || Math.abs(p.pitch - landed.pitch) > MOVE_EPS || Math.abs(z - landed.zoom) > ZOOM_EPS
  }
  const offs: Array<() => void> = []
  liveRuns++

  const on = (target: any, type: string, fn: (e: any) => void, o?: AddEventListenerOptions) => {
    target.addEventListener(type, fn, o)
    liveListeners++
    offs.push(() => { try { target.removeEventListener(type, fn, o) } catch { /* viewer gone */ } liveListeners-- })
  }

  // ── 1. Camera: PSV's own animate. Tiles swept past aren't worth loading,
  // and the sharper tiles for the zoomed view wait until the outline is drawn:
  // their uploads made the landing frames 40-150 ms at 4x CPU throttle. ──
  const inset = Math.max(0, opts.bottomInset ?? 0)
  const zoomTo = fitZoom(viewer, obj, inset)
  const to = { yaw: obj.yaw, pitch: framedPitch(viewer, obj, inset, zoomTo) }
  let tilesHeld = true
  const releaseTiles = () => { if (tilesHeld) { tilesHeld = false; adapter?.vwHoldTiles?.(false) } }
  adapter?.vwHoldTiles?.(true)
  let anim: any = null
  try {
    anim = viewer.animate({ ...to, zoom: zoomTo, speed: cameraMoveMs({ viewer } as any, to) })
  } catch { anim = null }
  const voiceLen = voiceSeconds(voice)

  Promise.resolve(anim).then(async (ok: unknown) => {
    if (state !== 'moving') return
    // Cancelled: the visitor took the camera (or PSV couldn't animate).
    if (ok !== true) { dismiss('cancelled'); return }
    const p = viewer.getPosition?.()
    landed = { yaw: p?.yaw ?? obj.yaw, pitch: p?.pitch ?? obj.pitch, zoom: viewer.getZoomLevel?.() ?? obj.zoom }
    const secs = (await voiceLen) ?? readingSeconds(obj)
    // Build in a task of its own just after a frame, not inside PSV's last
    // camera frame (which is where animate() resolves).
    await new Promise<void>(r => requestAnimationFrame(() => setTimeout(r, 0)))
    if (state !== 'moving') return
    open(secs, voice && Number.isFinite(voice.duration) ? voice : null)
  })

  // ── 2. Build the overlay once, then play it. ──
  function open(totalS: number, playVoice: HTMLAudioElement | null) {
    // PSV's own record of its size: reading clientWidth here would force a layout.
    const size = viewer.state?.size
    const w: number = size?.width || container.clientWidth
    const h: number = size?.height || container.clientHeight
    // The part of the view not covered at the bottom (the panel stays inside it).
    const hv = Math.max(h * 0.4, h - inset)
    const pts = obj.polygon
      .map(([yaw, pitch]) => { try { return viewer.dataHelper.sphericalCoordsToViewerCoords({ yaw, pitch }) } catch { return null } })
      .filter((q: any): q is { x: number; y: number } => !!q && Number.isFinite(q.x) && Number.isFinite(q.y))
    if (pts.length < 3 || !w || !h) { dismiss('cancelled'); return }

    const xs = pts.map(q => q.x)
    const ys = pts.map(q => q.y)
    const bx0 = Math.min(...xs); const bx1 = Math.max(...xs)
    const by0 = Math.min(...ys); const by1 = Math.max(...ys)
    const cy = (by0 + by1) / 2
    const pathD = (ox: number, oy: number) => 'M' + pts.map(q => `${fmt(q.x - ox)} ${fmt(q.y - oy)}`).join('L') + 'Z'

    root = document.createElement('div')
    root.className = 'vw-spot' + (lite ? ' vw-spot--lite' : '')
    small = w < 640

    // Dim layer: the whole view with the object cut out. Static; only fades.
    const dim = svg('svg', { class: 'vw-spot__dim', width: w, height: h, viewBox: `0 0 ${w} ${h}`, 'aria-hidden': 'true' })
    dim.appendChild(svg('path', { d: `M0 0H${w}V${h}H0Z` + pathD(0, 0), 'fill-rule': 'evenodd' }))

    // Outline: an SVG the size of the object (+ room for the brackets).
    const pad = 14
    const ow = Math.ceil(bx1 - bx0) + pad * 2
    const oh = Math.ceil(by1 - by0) + pad * 2
    const ox = bx0 - pad
    const oy = by0 - pad
    const outline = svg('svg', { class: 'vw-spot__outline', width: ow, height: oh, viewBox: `0 0 ${ow} ${oh}`, 'aria-hidden': 'true' })
    outline.style.transform = `translate(${fmt(ox)}px, ${fmt(oy)}px)`
    const d = pathD(ox, oy)
    const len = perimeter(pts, true)
    const line = svg('path', { d, class: 'vw-spot__line', 'stroke-dasharray': len, 'stroke-dashoffset': len })
    let glow: SVGPathElement | null = null
    let scan: SVGRectElement | null = null
    if (!lite) {
      glow = svg('path', { d, class: 'vw-spot__glow', 'stroke-dasharray': len, 'stroke-dashoffset': len })
      outline.appendChild(glow)
    }
    outline.appendChild(line)
    // Corner brackets round the object: drawn once, fade in.
    const k = Math.min(14, (ow - pad) / 4, (oh - pad) / 4)
    const L = 4; const R = ow - 4; const T = 4; const B = oh - 4
    const corners = svg('path', {
      class: 'vw-spot__corners',
      d: `M${L} ${T + k}V${T}H${L + k}M${R - k} ${T}H${R}V${T + k}M${R} ${B - k}V${B}H${R - k}M${L + k} ${B}H${L}V${B - k}`,
    })
    outline.appendChild(corners)
    if (!lite) {
      // Scan line: a bar sweeping down inside the outline, once.
      const clipId = `vw-spot-clip-${obj.id}`.replace(/[^\w-]/g, '')
      const defs = svg('defs', {})
      const clip = svg('clipPath', { id: clipId })
      clip.appendChild(svg('path', { d }))
      defs.appendChild(clip)
      outline.insertBefore(defs, outline.firstChild)
      const g = svg('g', { 'clip-path': `url(#${clipId})` })
      scan = svg('rect', { class: 'vw-spot__scan', x: 0, y: pad - 3, width: ow, height: 3 })
      g.appendChild(scan)
      outline.appendChild(g)
    }

    // Panel: fixed width. Its box is placed by a static wrapper; GSAP only
    // moves the panel inside it (so it never has to read the wrapper's position).
    const wrapEl = document.createElement('div')
    wrapEl.className = 'vw-spot__wrap'
    const panel = document.createElement('div')
    panel.className = 'vw-spot__panel'
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-label', obj.title)
    const head = document.createElement('div')
    head.className = 'vw-spot__head'
    const label = document.createElement('span')
    label.className = 'vw-spot__label'
    label.textContent = obj.label || 'Spotlight'
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'vw-spot__x'
    close.setAttribute('aria-label', 'Close')
    close.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    head.append(label, close)
    const sr = document.createElement('p')
    sr.className = 'vw-spot__sr'
    sr.textContent = [obj.title, ...obj.lines].join(' ')
    const title = typedLine('vw-spot__title', obj.title)
    const lines = obj.lines.map(t => typedLine('vw-spot__ln', t))
    panel.append(head, sr, title.el, ...lines.map(l => l.el))
    const panelW = Math.min(280, w - 32)
    wrapEl.style.width = `${panelW}px`
    wrapEl.appendChild(panel)
    // The panel's height, from the text (never measured: a read here would
    // force a layout in the middle of the effect). Errs on the tall side, so
    // the panel is never pushed off the bottom edge.
    const cpl = (px: number) => Math.max(8, Math.floor((panelW - 28) / px))
    const rows = (t: string, px: number) => Math.max(1, Math.ceil(t.length / cpl(px)))
    const ph = 22 + 26 + rows(obj.title, 8.6) * 20 + 6 + lines.reduce((n, l) => n + rows(l.text, 6.6) * 20 + 4, 0)

    // Where the panel goes: beside the object if there's room, else under or over it.
    const gap = 56
    const margin = 16
    let side: 'right' | 'left' | 'below' | 'above'
    if (bx1 + gap + panelW <= w - margin) side = 'right'
    else if (bx0 - gap - panelW >= margin) side = 'left'
    else side = (hv - by1 >= by0) ? 'below' : 'above'
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
    let px: number; let py: number
    let anchor: { x: number; y: number }
    let attach: { x: number; y: number }
    const pick = (score: (q: { x: number; y: number }) => number) => pts.reduce((best, q) => (score(q) > score(best) ? q : best), pts[0]!)
    if (side === 'right' || side === 'left') {
      px = side === 'right' ? bx1 + gap : bx0 - gap - panelW
      py = clamp(cy - ph / 2 - 24, margin, hv - ph - margin)
      anchor = side === 'right' ? pick(q => q.x - (q.y - by0) * 0.6) : pick(q => -q.x - (q.y - by0) * 0.6)
      attach = { x: side === 'right' ? px : px + panelW, y: py + 30 }
    } else {
      px = clamp((bx0 + bx1) / 2 - panelW / 2, margin, w - panelW - margin)
      py = side === 'below' ? Math.min(by1 + gap, hv - ph - margin) : Math.max(by0 - gap - ph, margin)
      anchor = side === 'below' ? pick(q => q.y) : pick(q => -q.y)
      attach = { x: clamp(anchor.x, px + 20, px + panelW - 20), y: side === 'below' ? py : py + ph }
    }
    const dir = side === 'left' ? -1 : 1
    wrapEl.style.transform = `translate(${fmt(px)}px, ${fmt(py)}px)`
    // Over the object, the leader meets the panel's bottom edge: pin the panel
    // to the bottom of a box of the estimated height so that edge is exact.
    if (side === 'above') { wrapEl.style.height = `${ph}px`; wrapEl.classList.add('vw-spot__wrap--up') }

    // Leader line: anchor → elbow → panel, in its own small SVG.
    const elbow = side === 'right' || side === 'left'
      ? { x: attach.x - dir * 22, y: attach.y }
      : { x: attach.x, y: attach.y }
    const lp = [anchor, elbow, attach]
    const lx0 = Math.min(...lp.map(q => q.x)) - 6
    const ly0 = Math.min(...lp.map(q => q.y)) - 6
    const lw = Math.ceil(Math.max(...lp.map(q => q.x)) - lx0) + 6
    const lh = Math.ceil(Math.max(...lp.map(q => q.y)) - ly0) + 6
    const leader = svg('svg', { class: 'vw-spot__leader', width: lw, height: lh, viewBox: `0 0 ${lw} ${lh}`, 'aria-hidden': 'true' })
    leader.style.transform = `translate(${fmt(lx0)}px, ${fmt(ly0)}px)`
    const llen = perimeter(lp, false)
    const lpath = svg('path', {
      d: 'M' + lp.map(q => `${fmt(q.x - lx0)} ${fmt(q.y - ly0)}`).join('L'),
      'stroke-dasharray': llen, 'stroke-dashoffset': llen,
    })
    const dot = svg('circle', { cx: fmt(anchor.x - lx0), cy: fmt(anchor.y - ly0), r: 3, opacity: 0 })
    leader.append(lpath, dot)
    root.append(dim, outline, leader, wrapEl)

    // Phones: the small label a tap folds the panel into. Tapping it opens the
    // panel again; the outline stays up the whole time.
    if (small) {
      const pill = document.createElement('button')
      pill.type = 'button'
      pill.className = 'vw-spot__pill'
      pill.style.bottom = `${Math.round(inset) + 14}px`
      pill.innerHTML = '<span class="vw-spot__pill-dot" aria-hidden="true"></span>'
      const name = document.createElement('span')
      name.className = 'vw-spot__pill-name'
      name.textContent = obj.title
      // Wider than the screen (a car park on a phone): say it can be looked along.
      if (bx0 < -4 || bx1 > w + 4) {
        const hint = document.createElement('small')
        hint.textContent = 'Drag to see all of it'
        name.append(hint)
      }
      pill.append(name)
      const more = document.createElement('span')
      more.className = 'vw-spot__pill-more'
      more.textContent = 'Read'
      pill.append(more)
      pill.setAttribute('aria-label', `${obj.title}: show the description`)
      for (const t of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) on(pill, t, (e: Event) => e.stopPropagation(), t === 'touchstart' || t === 'wheel' ? { passive: true } : undefined)
      on(pill, 'click', (e: Event) => { e.stopPropagation(); fold?.(false) })
      root.append(pill)
      // Folded, the view can be dragged and zoomed: a full-view outline then
      // follows the object (redrawn on the next frame after each move; only a
      // thin path, the dim is hidden while folded).
      const track = svg('svg', { class: 'vw-spot__track', width: w, height: h, viewBox: `0 0 ${w} ${h}`, 'aria-hidden': 'true' })
      const trackPath = svg('path', { class: 'vw-spot__line', d: '' })
      track.appendChild(trackPath)
      let trackFrame = 0
      const drawTrack = () => {
        trackFrame = 0
        if (!mini) return
        const cam = viewer.getPosition?.()
        if (!cam) return
        const dir = [Math.cos(cam.pitch) * Math.sin(cam.yaw), Math.sin(cam.pitch), Math.cos(cam.pitch) * Math.cos(cam.yaw)]
        const n = obj.polygon.length
        const pts2 = obj.polygon.map(([yaw, pitch]) => {
          const v = [Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)]
          // Points behind (or far to the side of) the camera project badly: skipped.
          if (v[0]! * dir[0]! + v[1]! * dir[1]! + v[2]! * dir[2]! < 0.15) return null
          try { const q = viewer.dataHelper.sphericalCoordsToViewerCoords({ yaw, pitch }); return Number.isFinite(q?.x) && Number.isFinite(q?.y) ? q : null } catch { return null }
        })
        let d = ''
        let at = -1
        for (let i = 0; i < n; i++) {
          const a = pts2[i], b = pts2[(i + 1) % n]
          if (!a || !b) continue
          if (at !== i) d += `M${fmt(a.x)} ${fmt(a.y)}`
          d += `L${fmt(b.x)} ${fmt(b.y)}`
          at = (i + 1) % n
        }
        trackPath.setAttribute('d', d)
      }
      trackRedraw = () => { if (mini && !trackFrame) trackFrame = requestAnimationFrame(drawTrack) }
      offs.push(() => { if (trackFrame) cancelAnimationFrame(trackFrame) })
      let returning = false
      fold = (on: boolean) => {
        if (state !== 'open' || on === mini || returning) return
        if (on) {
          mini = true
          lastLook = performance.now()
          root?.classList.add('vw-spot--mini')
          if (!track.parentNode) root?.insertBefore(track, outline)
          drawTrack()
          gsap.set(outline, { autoAlpha: 0 })
          gsap.set(track, { autoAlpha: 1 })
          // The panel, its leader and the dim step aside; the outline stays.
          gsap.to([panel, leader], { autoAlpha: 0, duration: 0.2, overwrite: 'auto' })
          gsap.to(dim, { opacity: 0, duration: 0.25, overwrite: 'auto' })
          gsap.fromTo(pill, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.2 })
          pill.focus({ preventScroll: true })
          return
        }
        // Back to the panel: first back to where it was drawn, if the view moved.
        const unfold = () => {
          returning = false
          if (state !== 'open') return
          mini = false
          root?.classList.remove('vw-spot--mini')
          gsap.set(track, { autoAlpha: 0 })
          gsap.set(outline, { autoAlpha: 1 })
          gsap.to([panel, leader], { autoAlpha: 1, duration: 0.2, overwrite: 'auto' })
          gsap.to(dim, { opacity: 1, duration: 0.25, overwrite: 'auto' })
          gsap.to(pill, { autoAlpha: 0, y: 8, duration: 0.2 })
        }
        if (awayFromLanding()) {
          returning = true
          gsap.to(pill, { autoAlpha: 0, duration: 0.15 })
          let back: any = null
          try { back = viewer.animate({ yaw: landed.yaw, pitch: landed.pitch, zoom: landed.zoom, speed: reduce ? 250 : 500 }) } catch { back = null }
          Promise.resolve(back).then(unfold, unfold)
        } else unfold()
      }
    }
    container.appendChild(root)

    // Text: one counter drives the typing (the title goes three times faster).
    const titleW = obj.title.length / 3
    const linesN = lines.reduce((n, l) => n + l.text.length, 0)
    const weight = titleW + linesN
    let shown = -1
    const showUpTo = (n: number) => {
      const c = Math.floor(n * 100) / 100
      if (c === shown) return
      shown = c
      const tc = Math.min(obj.title.length, Math.floor(Math.min(n, titleW) * 3))
      if (title.node.data.length !== tc) title.node.data = obj.title.slice(0, tc)
      let rest = Math.max(0, Math.floor(n - titleW))
      for (const l of lines) {
        const c2 = Math.min(l.text.length, rest)
        if (l.node.data.length !== c2) l.node.data = l.text.slice(0, c2)
        rest -= c2
      }
    }

    // Close controls (the panel must not turn the panorama under it).
    const stop = (e: Event) => e.stopPropagation()
    on(panel, 'pointerdown', stop)
    on(panel, 'mousedown', stop)
    on(panel, 'touchstart', stop, { passive: true })
    on(panel, 'wheel', stop, { passive: true })
    on(close, 'click', (e: Event) => { e.stopPropagation(); dismiss('close') })

    state = 'open'
    const D = lite ? 0.6 : 1
    // Done reading: it closes by itself, a little later if the visitor folded
    // it to look at the object.
    const autoClose = () => {
      if (mini) {
        const idle = (performance.now() - lastLook) / 1000
        if (idle < MINI_LINGER_S) { linger = gsap.delayedCall(MINI_LINGER_S - idle + 0.1, autoClose); return }
      }
      dismiss('done')
    }

    // The overlay goes in now (invisible) and starts moving two frames later:
    // the next frame lays it out as part of its normal rendering, and only
    // then does GSAP touch it, so its first reads find nothing to recompute
    // and the insert and the first tween never share a frame. Every tween
    // gives its start value (fromTo), so GSAP doesn't need to read them anyway.
    starter = requestAnimationFrame(() => { starter = requestAnimationFrame(start) })
    const start = () => {
      starter = 0
      if (state !== 'open') return
      if (reduce) {
        // No tracing, no typing: it's simply there, with the voice.
        gsap.set([dim, corners, leader], { opacity: 1 })
        gsap.set(panel, { opacity: 1, x: 0 })
        gsap.set([line, lpath], { attr: { 'stroke-dashoffset': 0 } })
        dot.setAttribute('opacity', '1')
        showUpTo(weight)
        releaseTiles()
        playVoice?.play().catch(() => {})
        linger = gsap.delayedCall(totalS + LINGER_S, autoClose)
        return
      }
      const typeStart = 1.15 * D
      const textEnd = Math.max(typeStart + weight / MAX_CPS, totalS)
      dim.style.willChange = 'opacity'
      panel.style.willChange = 'opacity, transform'
      tl = gsap.timeline({ onComplete: () => { linger = gsap.delayedCall(LINGER_S, autoClose) } })
      tl.fromTo(dim, { opacity: 0 }, { opacity: 1, duration: 0.45 * D, ease: 'power2.out' }, 0)
      tl.fromTo(glow ? [line, glow] : line, { attr: { 'stroke-dashoffset': len } }, { attr: { 'stroke-dashoffset': 0 }, duration: 0.9 * D, ease: 'power2.inOut' }, 0.1 * D)
      tl.fromTo(corners, { opacity: 0 }, { opacity: 1, duration: 0.3 * D }, 0.25 * D)
      if (scan) {
        // A bar sweeping down the outline (its y attribute: no SVG transform to parse).
        tl.fromTo(scan, { opacity: 0.9, attr: { y: pad - 3 } }, { attr: { y: oh - pad }, duration: 0.9, ease: 'none', immediateRender: false }, 0.3)
        tl.to(scan, { opacity: 0, duration: 0.2 }, 1.1)
      }
      tl.fromTo(leader, { opacity: 0 }, { opacity: 1, duration: 0.01, immediateRender: false }, 0.8 * D)
      tl.fromTo(lpath, { attr: { 'stroke-dashoffset': llen } }, { attr: { 'stroke-dashoffset': 0 }, duration: 0.35 * D, ease: 'power1.out' }, 0.8 * D)
      tl.fromTo(dot, { attr: { opacity: 0 } }, { attr: { opacity: 1 }, duration: 0.2 * D }, 0.8 * D)
      tl.fromTo(panel, { opacity: 0, x: dir * 10 }, { opacity: 1, x: 0, duration: 0.3 * D, ease: 'power2.out' }, 1.05 * D)
      tl.call(releaseTiles, undefined, 1.2 * D)
      tl.call(() => { dim.style.willChange = ''; panel.style.willChange = '' }, undefined, 1.4 * D)
      const counter = { n: 0 }
      tl.fromTo(counter, { n: 0 }, { n: weight, duration: textEnd - typeStart, ease: 'none', onUpdate: () => showUpTo(counter.n) }, typeStart)
      playVoice?.play().catch(() => { /* no sound allowed: the text still runs */ })
    }

    // Anything the visitor does to the view closes it (nothing tracks the view).
    // Folded on a phone, looking around is allowed: the outline follows.
    const moved = () => {
      if (mini) { lastLook = performance.now(); trackRedraw?.(); return }
      if (awayFromLanding()) dismiss('moved')
    }
    on(viewer, 'position-updated', moved)
    on(viewer, 'zoom-updated', moved)
    on(viewer, 'size-updated', () => dismiss('moved'))
    on(document, 'visibilitychange', () => { if (document.hidden) dismiss('hidden') })
    on(window, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss('close') })
  }

  // ── 3. Close: kill the timeline, fade out, hand the camera back. ──
  function dismiss(reason: SpotlightEndReason) {
    if (state === 'closed') return
    const wasOpen = state === 'open'
    if (state === 'moving') {
      try { anim?.cancel?.() } catch { /* finished */ }
    }
    releaseTiles()
    state = 'closed'
    liveRuns--
    for (const off of offs.splice(0)) off()
    if (starter) { cancelAnimationFrame(starter); starter = 0 }
    tl?.kill(); tl = null
    linger?.kill(); linger = null
    if (voice) { voice.pause(); voice.removeAttribute('src'); voice.load() }

    const el = root
    root = null
    if (el) {
      const instant = reduce || reason === 'hidden' || reason === 'scene' || reason === 'cancelled'
      if (instant) el.remove()
      else {
        el.style.willChange = 'opacity'
        gsap.to(el, { opacity: 0, duration: 0.25, ease: 'power1.out', onComplete: () => el.remove() })
      }
    }
    // Back out to the zoom the visitor had, still facing the object.
    if (wasOpen && (reason === 'close' || reason === 'tap' || reason === 'done') && zoom0 < landed.zoom - ZOOM_EPS) {
      try { viewer.animate({ yaw: landed.yaw, pitch: landed.pitch, zoom: zoom0, speed: reduce ? 250 : 600 }) } catch { /* noop */ }
    }
    opts.onEnd(reason)
  }

  /** A tap on the view: on a phone, fold first, close on the next one. */
  function tap() {
    if (state === 'open' && small && fold && !mini) { fold(true); return }
    dismiss('tap')
  }

  return { dismiss, tap }
}
