// Street View-style floor cursor for the public viewer (prototype, behind the
// ?floorcursor=1 flag).
//
// A disc lies flat on the floor under the mouse. When the mouse points
// roughly toward a scene link, the disc shows an arrow turned toward that
// link and a click walks there; otherwise it's a plain ring and does nothing.
//
// There's no depth data, so the floor is assumed flat: the disc only shows
// when the mouse is below the horizon, and it is shrunk toward the horizon to
// fake distance (on the panorama sphere everything is the same distance away).
//
// Built on MarkersPlugin 5.14.1 `imageLayer` markers (3D planes with a
// yaw/pitch/roll rotation), checked against node_modules:
//   - the plane faces the camera; rotation.pitch = 90° lays it flat with the
//     texture's top pointing away from the camera, roll then turns it on the floor;
//   - VirtualTourPlugin replaces all markers on every node change, so the two
//     cursor markers are re-added whenever they've gone missing;
//   - a click on a 3D marker fires `select-marker` (psvAdapter ignores these ids).
// Mouse-only: phones and tablets have no hover, so it isn't attached there.

import type { PsvViewerHandle } from './psvAdapter'

export const FLOOR_CURSOR_PREFIX = 'floor-cursor:'
const ARROW_ID = FLOOR_CURSOR_PREFIX + 'arrow'
const RING_ID = FLOOR_CURSOR_PREFIX + 'ring'
const ARROW_IMG = '/images/floor-cursor/arrow.svg'
const RING_IMG = '/images/floor-cursor/ring.svg'

/** Marker size (MarkersPlugin units, 100 ≈ 5.7°) when looking straight down. */
const BASE_SIZE = 320
/** Smallest share of BASE_SIZE, near the horizon. */
const MIN_SCALE = 0.4
/** No floor above this pitch (radians, ≈ −6°). */
const MAX_PITCH = -0.1
/** A link counts as "ahead" when within this yaw of the mouse (radians, 70°). */
const LINK_RANGE = (70 * Math.PI) / 180

export interface FloorCursorLink { targetSceneId: string; yaw: number }

export interface FloorCursorController { destroy: () => void }

/** Smallest signed difference a − b, in (−π, π]. */
function yawDiff(a: number, b: number): number {
  let d = (a - b) % (2 * Math.PI)
  if (d > Math.PI) d -= 2 * Math.PI
  if (d <= -Math.PI) d += 2 * Math.PI
  return d
}

export function supportsFloorCursor(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
}

export function attachFloorCursor(
  handle: PsvViewerHandle,
  opts: {
    /** Scene links of the scene on screen. */
    getLinks: () => FloorCursorLink[]
    /** True while the cursor must stay hidden (scene transition, VR…). */
    isBlocked: () => boolean
    onWalk: (targetSceneId: string, yaw: number) => void
  },
): FloorCursorController | null {
  const viewer = handle.viewer
  const markers = handle.markers
  const container: HTMLElement | undefined = viewer?.container
  if (!viewer || !markers || !container) return null

  let mouse: { x: number; y: number } | null = null
  let target: FloorCursorLink | null = null
  let shown: string | null = null
  let frame = 0

  function hasMarker(id: string): boolean {
    try { return !!markers.getMarker(id) } catch { return false }
  }

  function ensureMarkers() {
    for (const [id, img] of [[ARROW_ID, ARROW_IMG], [RING_ID, RING_IMG]]) {
      if (hasMarker(id)) continue
      markers.addMarker({
        id,
        imageLayer: img,
        position: { yaw: 0, pitch: -Math.PI / 2 },
        size: { width: BASE_SIZE, height: BASE_SIZE },
        rotation: { pitch: Math.PI / 2 },
        visible: false,
        zIndex: 0,
        data: { type: 'floor-cursor' },
      })
      // A re-added marker starts hidden; forget what was on screen.
      if (shown === id) shown = null
    }
  }

  function hide() {
    target = null
    if (!shown) return
    try { markers.updateMarker({ id: shown, visible: false }) } catch { /* removed by a node change */ }
    shown = null
    container!.classList.remove('psv--floor-cursor')
  }

  function update() {
    frame = 0
    if (!mouse || opts.isBlocked()) { hide(); return }
    const pos = viewer.dataHelper.viewerCoordsToSphericalCoords(mouse)
    if (!pos || !(pos.pitch < MAX_PITCH)) { hide(); return }

    let best: FloorCursorLink | null = null
    for (const link of opts.getLinks()) {
      if (Math.abs(yawDiff(link.yaw, pos.yaw)) > LINK_RANGE) continue
      if (!best || Math.abs(yawDiff(link.yaw, pos.yaw)) < Math.abs(yawDiff(best.yaw, pos.yaw))) best = link
    }

    ensureMarkers()
    const id = best ? ARROW_ID : RING_ID
    const scale = Math.max(MIN_SCALE, Math.sin(-pos.pitch))
    const size = BASE_SIZE * scale
    markers.updateMarker({
      id,
      position: { yaw: pos.yaw, pitch: pos.pitch },
      size: { width: size, height: size },
      rotation: { pitch: Math.PI / 2, yaw: 0, roll: best ? yawDiff(best.yaw, pos.yaw) : 0 },
      visible: true,
    })
    if (shown && shown !== id) markers.updateMarker({ id: shown, visible: false })
    shown = id
    target = best
    container!.classList.toggle('psv--floor-cursor', !!best)
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(() => {
      try { update() } catch (err) { console.warn('[Viewora] Floor cursor update failed', err); hide() }
    })
  }

  // Only over the panorama itself — not over hotspots, the minimap or buttons.
  const onMouseMove = (e: MouseEvent) => {
    const overCanvas = (e.target as Element | null)?.closest?.('.psv-canvas-container')
    if (!overCanvas || e.buttons !== 0) { mouse = null; schedule(); return }
    const rect = container.getBoundingClientRect()
    mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    schedule()
  }
  const onMouseLeave = () => { mouse = null; schedule() }
  // The camera turning (drag, autorotate, keys) moves the floor under a still mouse.
  const onViewMoved = () => { if (mouse) schedule() }
  const onSelect = (e: any) => {
    if (e?.marker?.id !== ARROW_ID || !target) return
    const link = target
    hide()
    opts.onWalk(link.targetSceneId, link.yaw)
  }

  container.addEventListener('mousemove', onMouseMove, { passive: true })
  container.addEventListener('mouseleave', onMouseLeave)
  viewer.addEventListener('position-updated', onViewMoved)
  viewer.addEventListener('zoom-updated', onViewMoved)
  markers.addEventListener('select-marker', onSelect)

  return {
    destroy() {
      if (frame) cancelAnimationFrame(frame)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseleave', onMouseLeave)
      viewer.removeEventListener('position-updated', onViewMoved)
      viewer.removeEventListener('zoom-updated', onViewMoved)
      markers.removeEventListener('select-marker', onSelect)
      container.classList.remove('psv--floor-cursor')
      for (const id of [ARROW_ID, RING_ID]) {
        if (hasMarker(id)) { try { markers.removeMarker(id, false) } catch { /* noop */ } }
      }
    },
  }
}
