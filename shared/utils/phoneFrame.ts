// Framing a guided visit's views for the screen they play on.
//
// A view is chosen in the editor on a wide preview with nothing over it. On a
// phone held upright two things go wrong: the visit's box covers the bottom
// of the screen (what was framed low ends up under it), and the screen shows
// about half the width. framedView() fixes both: the camera looks a little
// lower so the framed spot sits in the middle of the part above the box, and
// on a narrow screen it zooms out (up to the widest zoom) to keep the width
// that was framed. phoneWindow() is the editor's "Phone" check: where a phone's
// view falls on the editor's preview.
//
// PSV's fov is vertical, in degrees, and its zoom level is linear in it:
// fov = maxFov + (minFov - maxFov) * level / 100.

export interface FrameEnv {
  /** The view's size in px. */
  w: number
  h: number
  /** Px at the bottom covered by the visit's box (0: none). */
  cover: number
  minFov: number
  maxFov: number
}
export interface FrameView { yaw: number; pitch: number; zoom: number }

/** The editor's preview is wide (about 2:1); the width framed there is what we keep. */
export const AUTHOR_ASPECT = 1.8
/** Only screens narrower than this (upright phones, small tablets) zoom out to keep it. */
export const NARROW_ASPECT = 1.2
/** A phone held upright, for the editor's check (CSS px; the box measured on one). */
export const PHONE = { w: 390, h: 844, coverFrac: 0.27 }

const RAD = Math.PI / 180
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const okEnv = (e: FrameEnv) => e.w > 0 && e.h > 0 && Number.isFinite(e.minFov) && Number.isFinite(e.maxFov) && e.maxFov > e.minFov

export function zoomToFov(zoom: number, e: Pick<FrameEnv, 'minFov' | 'maxFov'>): number {
  return e.maxFov + (e.minFov - e.maxFov) * clamp(zoom, 0, 100) / 100
}
export function fovToZoom(fov: number, e: Pick<FrameEnv, 'minFov' | 'maxFov'>): number {
  return clamp(((e.maxFov - fov) / (e.maxFov - e.minFov)) * 100, 0, 100)
}

/** The zoom that keeps the framed width on this screen (never closer than asked). */
export function keepWidthZoom(zoom: number, e: FrameEnv): number {
  if (!okEnv(e)) return zoom
  const aspect = e.w / e.h
  if (aspect >= NARROW_ASPECT) return zoom
  const vA = zoomToFov(zoom, e) * RAD
  const hA = 2 * Math.atan(Math.tan(vA / 2) * AUTHOR_ASPECT) // width framed in the editor
  const need = Math.min(e.maxFov * RAD, 2 * Math.atan(Math.tan(hA / 2) / aspect))
  return Math.min(zoom, fovToZoom(need / RAD, e))
}

/** Where to aim, and at what zoom, so `v` shows as framed on this screen. */
export function framedView(v: FrameView, e: FrameEnv): FrameView {
  if (!okEnv(e)) return v
  const zoom = keepWidthZoom(v.zoom, e)
  const c = clamp(e.cover, 0, e.h * 0.6) / e.h
  if (!c) return { yaw: v.yaw, pitch: v.pitch, zoom }
  const half = zoomToFov(zoom, e) * RAD / 2
  // The middle of the part above the box is c of the half-height above the screen's middle.
  const shift = Math.atan(c * Math.tan(half))
  return { yaw: v.yaw, pitch: clamp(v.pitch - shift, -Math.PI / 2, Math.PI / 2), zoom }
}

/**
 * The editor's "Phone" check: the part of the preview an upright phone shows
 * for a view framed at the preview's middle, as fractions of the preview
 * (0-1, may go past the edges). barTop: where the visit's box starts.
 * (Straight-line approximation of the projection: close enough for a guide.)
 */
export function phoneWindow(previewVfov: number, previewAspect: number, zoom: number, fovs: Pick<FrameEnv, 'minFov' | 'maxFov'>) {
  const phone: FrameEnv = { w: PHONE.w, h: PHONE.h, cover: PHONE.h * PHONE.coverFrac, ...fovs }
  const z = keepWidthZoom(zoom, phone)
  const T = Math.tan(zoomToFov(z, fovs) * RAD / 2) // phone half-height (tangent)
  const c = PHONE.coverFrac
  const tY = Math.tan(previewVfov * RAD / 2)
  const tX = tY * previewAspect
  const halfW = (T * (PHONE.w / PHONE.h)) / tX
  return {
    left: 0.5 - halfW / 2,
    right: 0.5 + halfW / 2,
    top: 0.5 - (T * (1 - c)) / tY / 2,
    barTop: 0.5 + (T * (1 - c)) / tY / 2,
    bottom: 0.5 + (T * (1 + c)) / tY / 2,
  }
}
