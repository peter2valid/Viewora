// Street View-style floor navigation for the public viewer on mouse devices
// (prototype, behind the ?floorcursor=1 flag).
//
//   - Every navigation hotspot (scene link) is drawn as a disc lying flat on
//     the floor, with an upright location pin standing on it so it can be
//     spotted from afar; its usual DOM chevron is hidden. Phones keep the chevrons.
//   - A cursor disc lies on the floor under the mouse. It picks the hotspot
//     nearest to that floor spot, turns its arrow toward it, outlines it and
//     shows its room name; a click walks there. With no hotspot in that
//     direction it's a plain ring and a click does nothing.
//
// There's no depth data, so the floor is assumed flat with the camera one
// unit above it: a point at pitch p (below the horizon) is 1/tan(−p) away.
// The cursor only shows below the horizon; hotspots placed higher (e.g. on a
// door frame) are dropped to SPOT_MAX_PITCH in the same direction. Discs are
// shrunk toward the horizon to fake distance (on the panorama sphere
// everything is the same distance away).
//
// Built on MarkersPlugin 5.14.1 `imageLayer` markers (3D planes with a
// yaw/pitch/roll rotation), checked against node_modules:
//   - the plane faces the camera; rotation.pitch = 90° lays it flat with the
//     texture's top pointing away from the camera, roll then turns it on the floor;
//   - VirtualTourPlugin replaces all markers just before `node-changed`, so the
//     discs are rebuilt and the chevrons re-hidden on every node change;
//   - a click on a 3D marker fires `select-marker` (psvAdapter ignores these ids).

import type { PsvViewerHandle } from './psvAdapter'

export const FLOOR_CURSOR_PREFIX = 'floor-cursor:'
const ARROW_ID = FLOOR_CURSOR_PREFIX + 'arrow'
const RING_ID = FLOOR_CURSOR_PREFIX + 'ring'
const HIGHLIGHT_ID = FLOOR_CURSOR_PREFIX + 'highlight'
const SPOT_PREFIX = FLOOR_CURSOR_PREFIX + 'spot:'
const PIN_PREFIX = FLOOR_CURSOR_PREFIX + 'pin:'
const IMG = '/images/floor-cursor/'

/** Cursor size (MarkersPlugin units, 100 ≈ 5.7°) when looking straight down. */
const BASE_SIZE = 320
/** Hotspot discs are a little smaller than the cursor. */
const SPOT_SIZE = 260
/** Smallest share of the size, near the horizon. */
const MIN_SCALE = 0.4
/** No floor above this pitch (radians, ≈ −6°). */
const MAX_PITCH = -0.1
/** Hotspot discs sit at least this far below the horizon (radians, ≈ −8°). */
const SPOT_MAX_PITCH = -0.14
/** Only hotspots within this yaw of the mouse are candidates (75°). */
const LINK_RANGE = (75 * Math.PI) / 180
/** Pointing within this yaw of a hotspot picks it however far away it is (25°). */
const AIM_RANGE = (25 * Math.PI) / 180
/** With nothing aimed at or close by, the nearest hotspot within this yaw (90°). */
const FALLBACK_RANGE = Math.PI / 2

/** Pin standing on each hotspot disc: a screen-sized DOM marker, so it stays readable far away. */
const PIN_WIDTH = 30
const PIN_HEIGHT = 40
const PIN_HTML = `<svg width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 30 40" aria-hidden="true" style="display:block;overflow:visible;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">`
  + '<path d="M15 39C15 39 2 23.6 2 14.5a13 13 0 0 1 26 0C28 23.6 15 39 15 39Z" fill="#e53935" stroke="#fff" stroke-width="2"/>'
  + '<circle cx="15" cy="14.5" r="5.5" fill="#fff"/></svg>'

export interface FloorCursorLink {
  hotspotId: string
  targetSceneId: string
  name: string
  yaw: number
  pitch: number
}

export interface FloorCursorController { destroy: () => void }

/** Smallest signed difference a − b, in (−π, π]. */
function yawDiff(a: number, b: number): number {
  let d = (a - b) % (2 * Math.PI)
  if (d > Math.PI) d -= 2 * Math.PI
  if (d <= -Math.PI) d += 2 * Math.PI
  return d
}

/** Point on the floor (camera height 1) seen at yaw/pitch, pitch < 0. */
function floorPoint(yaw: number, pitch: number): { x: number; z: number; d: number } {
  const d = 1 / Math.tan(-pitch)
  return { x: d * Math.sin(yaw), z: d * Math.cos(yaw), d }
}

function sizeAt(base: number, pitch: number): number {
  return base * Math.max(MIN_SCALE, Math.sin(-pitch))
}

function spotPitch(link: FloorCursorLink): number {
  return Math.min(link.pitch, SPOT_MAX_PITCH)
}

export function supportsFloorCursor(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
}

export function attachFloorCursor(
  handle: PsvViewerHandle,
  opts: {
    /** Scene links of a scene. */
    getLinks: (sceneId: string) => FloorCursorLink[]
    /** True while the cursor must stay hidden (scene transition, VR…). */
    isBlocked: () => boolean
    onWalk: (targetSceneId: string, yaw: number) => void
  },
): FloorCursorController | null {
  const viewer = handle.viewer
  const markers = handle.markers
  const vt: any = viewer?.getPlugin?.('virtual-tour')
  const container: HTMLElement | undefined = viewer?.container
  if (!viewer || !markers || !vt || !container) return null

  let links: FloorCursorLink[] = []
  let mouse: { x: number; y: number } | null = null
  let target: FloorCursorLink | null = null
  /** Hotspot whose pin is under the mouse. */
  let pinned: FloorCursorLink | null = null
  let shown: string | null = null
  let frame = 0

  // Room name next to the mouse while a hotspot is picked.
  const label = document.createElement('div')
  label.setAttribute('aria-hidden', 'true')
  Object.assign(label.style, {
    position: 'absolute', zIndex: '90', pointerEvents: 'none', display: 'none',
    padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap',
    background: 'rgba(17, 24, 39, 0.82)', color: '#fff',
    font: '600 12px/1.4 system-ui, -apple-system, sans-serif',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  })
  container.appendChild(label)

  function hasMarker(id: string): boolean {
    try { return !!markers.getMarker(id) } catch { return false }
  }

  function addFlat(id: string, img: string, zIndex: number) {
    markers.addMarker({
      id,
      imageLayer: IMG + img,
      position: { yaw: 0, pitch: -Math.PI / 2 },
      size: { width: BASE_SIZE, height: BASE_SIZE },
      rotation: { pitch: Math.PI / 2 },
      visible: false,
      zIndex,
      data: { type: 'floor-cursor' },
    })
  }

  function ensureCursorMarkers() {
    for (const [id, img, z] of [[ARROW_ID, 'arrow.svg', 3], [RING_ID, 'ring.svg', 3], [HIGHLIGHT_ID, 'spot-active.svg', 2]] as const) {
      if (hasMarker(id)) continue
      addFlat(id, img, z)
      // A re-added marker starts hidden; forget what was on screen.
      if (shown === id) shown = null
    }
  }

  /** New scene on screen: hotspot discs instead of the chevrons. */
  function syncScene(sceneId: string | null | undefined) {
    links = sceneId ? opts.getLinks(sceneId) : []
    target = null
    pinned = null
    shown = null
    for (const link of links) {
      // The chevron (MarkersPlugin marker with the hotspot's id) stays for phones.
      if (hasMarker(link.hotspotId)) markers.updateMarker({ id: link.hotspotId, visible: false })
      const id = SPOT_PREFIX + link.hotspotId
      if (!hasMarker(id)) addFlat(id, 'spot.svg', 1)
      const pitch = spotPitch(link)
      const size = sizeAt(SPOT_SIZE, pitch)
      markers.updateMarker({
        id,
        position: { yaw: link.yaw, pitch },
        size: { width: size, height: size },
        visible: true,
        data: { type: 'floor-cursor', targetSceneId: link.targetSceneId },
      })
      const pinId = PIN_PREFIX + link.hotspotId
      if (hasMarker(pinId)) markers.updateMarker({ id: pinId, position: { yaw: link.yaw, pitch } })
      else {
        markers.addMarker({
          id: pinId,
          html: PIN_HTML,
          position: { yaw: link.yaw, pitch },
          size: { width: PIN_WIDTH, height: PIN_HEIGHT },
          anchor: 'bottom center',
          hoverScale: { amount: 1.2, duration: 150 },
          style: { cursor: 'pointer' },
          zIndex: 5,
          data: { type: 'floor-cursor', targetSceneId: link.targetSceneId },
        })
      }
    }
    ensureCursorMarkers()
    schedule()
  }

  function hideMarker(id: string | null) {
    if (!id) return
    try { markers.updateMarker({ id, visible: false }) } catch { /* removed by a node change */ }
  }

  function hide() {
    target = null
    label.style.display = 'none'
    container!.classList.remove('psv--floor-cursor')
    hideMarker(HIGHLIGHT_ID)
    if (!shown) return
    hideMarker(shown)
    shown = null
  }

  /**
   * The hotspot the mouse means: among those within LINK_RANGE of its
   * direction, the nearest on the floor. It counts if the mouse aims right at
   * it (within AIM_RANGE) or the floor spot is reasonably close to it. With
   * none of those, the nearest within FALLBACK_RANGE, so the arrow still
   * points somewhere on any floor spot facing a hotspot.
   */
  function pick(yaw: number, pitch: number): { link: FloorCursorLink; roll: number } | null {
    const m = floorPoint(yaw, pitch)
    type Hit = { link: FloorCursorLink; dist: number; dx: number; dz: number }
    let best: Hit | null = null
    let fallback: Hit | null = null
    for (const link of links) {
      const turn = Math.abs(yawDiff(link.yaw, yaw))
      if (turn > FALLBACK_RANGE) continue
      const s = floorPoint(link.yaw, spotPitch(link))
      const dx = s.x - m.x
      const dz = s.z - m.z
      const dist = Math.hypot(dx, dz)
      if (!fallback || dist < fallback.dist) fallback = { link, dist, dx, dz }
      if (turn > LINK_RANGE || (turn > AIM_RANGE && dist > Math.max(1.5, 0.75 * m.d))) continue
      if (!best || dist < best.dist) best = { link, dist, dx, dz }
    }
    best ??= fallback
    if (!best) return null
    // Arrow: from the mouse's floor spot toward the hotspot, relative to
    // "straight ahead" at that spot. On top of the disc, just point at it.
    const heading = best.dist < 0.3 ? best.link.yaw : Math.atan2(best.dx, best.dz)
    return { link: best.link, roll: yawDiff(heading, yaw) }
  }

  /** Over a pin: no floor cursor, just the outline and room name. */
  function showPinned(link: FloorCursorLink, at: { x: number; y: number }) {
    if (shown) hideMarker(shown)
    shown = null
    target = null
    highlight(link, at)
    container!.classList.remove('psv--floor-cursor')
  }

  function highlight(link: FloorCursorLink, at: { x: number; y: number }) {
    const pitch = spotPitch(link)
    const s = sizeAt(SPOT_SIZE, pitch) * 1.15
    ensureCursorMarkers()
    markers.updateMarker({
      id: HIGHLIGHT_ID,
      position: { yaw: link.yaw, pitch },
      size: { width: s, height: s },
      visible: true,
    })
    label.textContent = link.name
    label.style.left = `${at.x + 18}px`
    label.style.top = `${at.y + 18}px`
    label.style.display = 'block'
  }

  function update() {
    frame = 0
    if (pinned && pinMouse && !opts.isBlocked()) { showPinned(pinned, pinMouse); return }
    if (!mouse || opts.isBlocked()) { hide(); return }
    const pos = viewer.dataHelper.viewerCoordsToSphericalCoords(mouse)
    if (!pos || !(pos.pitch < MAX_PITCH)) { hide(); return }

    const picked = pick(pos.yaw, pos.pitch)
    ensureCursorMarkers()
    const id = picked ? ARROW_ID : RING_ID
    const size = sizeAt(BASE_SIZE, pos.pitch)
    markers.updateMarker({
      id,
      position: { yaw: pos.yaw, pitch: pos.pitch },
      size: { width: size, height: size },
      rotation: { pitch: Math.PI / 2, yaw: 0, roll: picked?.roll ?? 0 },
      visible: true,
    })
    if (shown && shown !== id) hideMarker(shown)
    shown = id
    target = picked?.link ?? null

    if (picked) highlight(picked.link, mouse)
    else {
      hideMarker(HIGHLIGHT_ID)
      label.style.display = 'none'
    }
    container!.classList.toggle('psv--floor-cursor', !!picked)
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(() => {
      try { update() } catch (err) { console.warn('[Viewora] Floor cursor update failed', err); hide() }
    })
  }

  function safely(fn: () => void) {
    try { fn() } catch (err) { console.warn('[Viewora] Floor navigation update failed', err) }
  }

  /** Last mouse position anywhere in the viewer (places the room name over a pin). */
  let pinMouse: { x: number; y: number } | null = null
  // Only over the panorama itself — not over hotspots, the minimap or buttons.
  const onMouseMove = (e: MouseEvent) => {
    const rect = container.getBoundingClientRect()
    const at = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    pinMouse = at
    const overCanvas = (e.target as Element | null)?.closest?.('.psv-canvas-container')
    mouse = overCanvas && e.buttons === 0 ? at : null
    schedule()
  }
  const onMouseLeave = () => { mouse = null; pinMouse = null; pinned = null; schedule() }
  const pinLink = (e: any) => {
    const id = String(e?.marker?.id ?? '')
    return id.startsWith(PIN_PREFIX) ? links.find(l => PIN_PREFIX + l.hotspotId === id) ?? null : null
  }
  const onEnterMarker = (e: any) => { const link = pinLink(e); if (link) { pinned = link; schedule() } }
  const onLeaveMarker = (e: any) => { if (pinLink(e)) { pinned = null; schedule() } }
  // The camera turning (drag, autorotate, keys) moves the floor under a still mouse.
  const onViewMoved = () => { if (mouse) schedule() }
  const onSelect = (e: any) => {
    const id = String(e?.marker?.id ?? '')
    if (!id.startsWith(FLOOR_CURSOR_PREFIX)) return
    // A hotspot disc or pin clicked directly, or the cursor while it points at one.
    const link = id.startsWith(SPOT_PREFIX) || id.startsWith(PIN_PREFIX)
      ? links.find(l => SPOT_PREFIX + l.hotspotId === id || PIN_PREFIX + l.hotspotId === id) ?? null
      : (id === ARROW_ID ? target : null)
    if (!link) return
    pinned = null
    hide()
    opts.onWalk(link.targetSceneId, link.yaw)
  }
  // PSV cancels every image download in flight when a panorama starts
  // loading, and the MarkersPlugin leaves that rejection unhandled. So the
  // disc images are fetched once up front (later loads come from the browser
  // cache) and discs are only built once a scene has finished loading.
  let imagesReady = false
  let destroyed = false
  const onNodeChanged = (e: any) => { if (imagesReady) safely(() => syncScene(e?.node?.id)) }
  Promise.all(['arrow.svg', 'ring.svg', 'spot.svg', 'spot-active.svg'].map(name => new Promise<void>((resolve) => {
    const im = new Image()
    im.onload = () => { (im.decode?.() ?? Promise.resolve()).catch(() => {}).finally(() => resolve()) }
    im.onerror = () => resolve()
    im.src = IMG + name
  }))).then(() => {
    if (destroyed) return
    imagesReady = true
    if (!vt.state?.loadingNode) safely(() => syncScene(vt.getCurrentNode?.()?.id))
  })

  container.addEventListener('mousemove', onMouseMove, { passive: true })
  container.addEventListener('mouseleave', onMouseLeave)
  viewer.addEventListener('position-updated', onViewMoved)
  viewer.addEventListener('zoom-updated', onViewMoved)
  markers.addEventListener('select-marker', onSelect)
  markers.addEventListener('enter-marker', onEnterMarker)
  markers.addEventListener('leave-marker', onLeaveMarker)
  vt.addEventListener('node-changed', onNodeChanged)
  container.classList.add('psv--floor-nav')

  return {
    destroy() {
      destroyed = true
      if (frame) cancelAnimationFrame(frame)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseleave', onMouseLeave)
      viewer.removeEventListener('position-updated', onViewMoved)
      viewer.removeEventListener('zoom-updated', onViewMoved)
      markers.removeEventListener('select-marker', onSelect)
      markers.removeEventListener('enter-marker', onEnterMarker)
      markers.removeEventListener('leave-marker', onLeaveMarker)
      vt.removeEventListener('node-changed', onNodeChanged)
      container.classList.remove('psv--floor-cursor', 'psv--floor-nav')
      label.remove()
      safely(() => {
        for (const link of links) {
          if (hasMarker(SPOT_PREFIX + link.hotspotId)) markers.removeMarker(SPOT_PREFIX + link.hotspotId, false)
          if (hasMarker(PIN_PREFIX + link.hotspotId)) markers.removeMarker(PIN_PREFIX + link.hotspotId, false)
          if (hasMarker(link.hotspotId)) markers.updateMarker({ id: link.hotspotId, visible: true }, false)
        }
        for (const id of [ARROW_ID, RING_ID, HIGHLIGHT_ID]) {
          if (hasMarker(id)) markers.removeMarker(id, false)
        }
      })
    },
  }
}
