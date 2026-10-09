// Land listing markers: plot boundaries, estate/phase outlines, survey
// beacons and access roads (with optional ground-painted arrows).
//
// All of them are stored as ordinary `info` hotspots with `content.kind` set,
// so they reuse the .vhs-info activation/card machinery (toggleHotspotActive,
// focusHotspot, card click isolation) and older viewers degrade to a plain
// info pin instead of breaking.
//
// Shaped kinds render as two PSV markers: the label pill (id = hotspot id,
// carries data-vhs-id so editor drag/menu work unchanged) and a polygon
// (id = `${id}${PLOT_POLY_SUFFIX}`). Clicks on the polygon are mapped back to
// the hotspot id by toHotspotId().

import type { Hotspot, PlotStatus, SphericalPoint } from '~/domain/hotspot'

export const PLOT_POLY_SUFFIX = '__plot'

// `color` = status dot / card accent; `fill` = polygon fill. Outlines are
// white for every status (the "painted line" look land buyers expect from
// aerial plot maps), and taken plots are filled so availability reads at a glance.
export const PLOT_STATUS_META: Record<PlotStatus, { label: string; color: string; fill: string }> = {
  available: { label: 'Available', color: '#22c55e', fill: 'rgba(255, 255, 255, 0.08)' },
  reserved:  { label: 'Reserved',  color: '#f59e0b', fill: 'rgba(245, 158, 11, 0.40)' },
  sold:      { label: 'Sold',      color: '#ef4444', fill: 'rgba(234, 88, 12, 0.48)' },
}

export function isPlot(h: Hotspot): boolean {
  return h.kind === 'plot' && Array.isArray(h.points) && h.points.length >= 3
}

export function isLandMarker(h: Hotspot): boolean {
  return h.kind === 'plot' || h.kind === 'beacon' || h.kind === 'road' || h.kind === 'zone'
}

export function plotStatus(h: Hotspot): PlotStatus {
  return h.plotStatus && h.plotStatus in PLOT_STATUS_META ? h.plotStatus : 'available'
}

/** Polygon marker ids map back to the hotspot that owns them. */
export function toHotspotId(markerId: string): string {
  return markerId.endsWith(PLOT_POLY_SUFFIX) ? markerId.slice(0, -PLOT_POLY_SUFFIX.length) : markerId
}

/**
 * Label anchor for a plot: the spherical centroid of its vertices, so the pill
 * sits inside the boundary even when the polygon crosses yaw 0/2π.
 */
export function sphericalCentroid(points: SphericalPoint[]): SphericalPoint {
  let x = 0, y = 0, z = 0
  for (const p of points) {
    const c = Math.cos(p.pitch)
    x += c * Math.sin(p.yaw)
    y += Math.sin(p.pitch)
    z += c * Math.cos(p.yaw)
  }
  const yaw = Math.atan2(x, z)
  const pitch = Math.atan2(y, Math.hypot(x, z))
  return { yaw: yaw < 0 ? yaw + Math.PI * 2 : yaw, pitch }
}

/** Great-circle angle between two directions, in radians. */
export function angularDistance(a: SphericalPoint, b: SphericalPoint): number {
  const s = Math.sin(a.pitch) * Math.sin(b.pitch)
    + Math.cos(a.pitch) * Math.cos(b.pitch) * Math.cos(a.yaw - b.yaw)
  return Math.acos(Math.min(1, Math.max(-1, s)))
}

// ── Ground plane ────────────────────────────────────────────────────────────
// Anything below the horizon is treated as a point on flat ground, in units of
// the camera height (camera at y = 1). Shapes built there — perspective-correct
// plot grids, road arrows with a real width — project back onto the panorama
// and taper with distance exactly like paint on the ground. The camera height
// itself is never needed: it cancels out.

type GroundPoint = { x: number; z: number }

/** Minimum angle below the horizon for a click to count as "on the ground" (~0.6°). */
const MIN_GROUND_PITCH = 0.01

export function isOnGround(p: SphericalPoint): boolean {
  return p.pitch < -MIN_GROUND_PITCH
}

function toGround(p: SphericalPoint): GroundPoint {
  const d = 1 / Math.tan(-p.pitch)
  return { x: d * Math.sin(p.yaw), z: d * Math.cos(p.yaw) }
}

function fromGround(g: GroundPoint): SphericalPoint {
  const yaw = Math.atan2(g.x, g.z)
  return { yaw: yaw < 0 ? yaw + Math.PI * 2 : yaw, pitch: -Math.atan2(1, Math.hypot(g.x, g.z)) }
}

/**
 * Splits a 4-corner block into rows × cols plots, interpolated on the ground
 * plane so plots shrink correctly with distance. Corners are in drawing order;
 * rows run from edge 0→3, columns from edge 0→1. Returns null if any corner is
 * at or above the horizon (no ground position to interpolate on).
 */
export function subdivideBlock(corners: SphericalPoint[], rows: number, cols: number): SphericalPoint[][] | null {
  if (corners.length !== 4 || !corners.every(isOnGround)) return null
  const [a, b, c, d] = corners.map(toGround)
  const at = (u: number, v: number): GroundPoint => ({
    x: (1 - u) * (1 - v) * a.x + u * (1 - v) * b.x + u * v * c.x + (1 - u) * v * d.x,
    z: (1 - u) * (1 - v) * a.z + u * (1 - v) * b.z + u * v * c.z + (1 - u) * v * d.z,
  })
  const cells: SphericalPoint[][] = []
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const u0 = k / cols, u1 = (k + 1) / cols, v0 = r / rows, v1 = (r + 1) / rows
      cells.push([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)].map(fromGround))
    }
  }
  return cells
}

/** Ground midpoint of a path (by length) — where a road's label sits. */
export function pathAnchor(path: SphericalPoint[]): SphericalPoint {
  if (path.length < 2 || !path.every(isOnGround)) return sphericalCentroid(path)
  const g = path.map(toGround)
  const lens = g.slice(1).map((p, i) => Math.hypot(p.x - g[i].x, p.z - g[i].z))
  let half = lens.reduce((s, l) => s + l, 0) / 2
  for (let i = 0; i < lens.length; i++) {
    if (half <= lens[i]) {
      const t = lens[i] ? half / lens[i] : 0
      return fromGround({ x: g[i].x + (g[i + 1].x - g[i].x) * t, z: g[i].z + (g[i + 1].z - g[i].z) * t })
    }
    half -= lens[i]
  }
  return fromGround(g[g.length - 1])
}

/**
 * Arrow painted on the ground along a road path (2+ points, last = tip).
 * Width defaults to a fraction of the path's typical distance from the camera
 * and is scaled by `widthScale` (the editor's slider).
 */
export function buildArrowOutline(path: SphericalPoint[], widthScale = 1): SphericalPoint[] | null {
  if (path.length < 2 || !path.every(isOnGround)) return null
  const g = path.map(toGround)
  const meanDist = g.reduce((s, p) => s + Math.hypot(p.x, p.z), 0) / g.length
  const w = 0.045 * meanDist * Math.max(0.1, widthScale)

  const n = g.length
  const tip = g[n - 1]
  const prev = g[n - 2]
  const lastLen = Math.hypot(tip.x - prev.x, tip.z - prev.z) || 1
  const t = { x: (tip.x - prev.x) / lastLen, z: (tip.z - prev.z) / lastLen }
  const headLen = Math.min(w * 2.4, lastLen * 0.8)
  const base = { x: tip.x - t.x * headLen, z: tip.z - t.z * headLen }
  const shaft = [...g.slice(0, -1), base]

  // Per-vertex normals (averaged at joints so bends don't pinch).
  const normal = (i: number) => {
    const p0 = shaft[Math.max(0, i - 1)], p1 = shaft[Math.min(shaft.length - 1, i + 1)]
    const dx = p1.x - p0.x, dz = p1.z - p0.z
    const len = Math.hypot(dx, dz) || 1
    return { x: -dz / len, z: dx / len }
  }
  const left: GroundPoint[] = [], right: GroundPoint[] = []
  shaft.forEach((p, i) => {
    const nrm = normal(i)
    left.push({ x: p.x + nrm.x * w / 2, z: p.z + nrm.z * w / 2 })
    right.push({ x: p.x - nrm.x * w / 2, z: p.z - nrm.z * w / 2 })
  })
  const hn = { x: -t.z, z: t.x }
  const headW = w * 2.2
  const outline: GroundPoint[] = [
    ...left,
    { x: base.x + hn.x * headW / 2, z: base.z + hn.z * headW / 2 },
    tip,
    { x: base.x - hn.x * headW / 2, z: base.z - hn.z * headW / 2 },
    ...right.reverse(),
  ]
  // Keep every vertex below the horizon after offsetting.
  return outline.map(fromGround)
}

/**
 * The polygon marker for a shaped land hotspot (plot, estate outline, road
 * arrow), or null for pin-only kinds.
 */
export function buildShapeMarker(h: Hotspot): any | null {
  const id = `${h.id}${PLOT_POLY_SUFFIX}`
  if (h.kind === 'plot' && isPlot(h)) {
    const meta = PLOT_STATUS_META[plotStatus(h)]
    return {
      id,
      polygon: h.points!.map(p => ({ yaw: p.yaw, pitch: p.pitch })),
      svgStyle: { fill: meta.fill, stroke: 'rgba(255, 255, 255, 0.95)', strokeWidth: '3px', strokeLinejoin: 'round', cursor: 'pointer' },
      data: { type: 'info', hotspotId: h.id, kind: 'plot' },
      zIndex: 20,
    }
  }
  if (h.kind === 'zone' && Array.isArray(h.points) && h.points.length >= 3) {
    return {
      id,
      polygon: h.points.map(p => ({ yaw: p.yaw, pitch: p.pitch })),
      // Not clickable: it sits under the plots it contains. Its label pill is.
      svgStyle: { fill: 'rgba(255, 255, 255, 0.04)', stroke: 'rgba(255, 255, 255, 0.98)', strokeWidth: '5.5px', strokeLinejoin: 'round', pointerEvents: 'none' },
      data: { type: 'info', hotspotId: h.id, kind: 'zone' },
      zIndex: 10,
    }
  }
  if (h.kind === 'road' && Array.isArray(h.points) && h.points.length >= 2) {
    const outline = buildArrowOutline(h.points, h.arrowWidth ?? 1)
    if (!outline) return null
    return {
      id,
      polygon: outline,
      svgStyle: { fill: 'rgba(17, 17, 22, 0.86)', stroke: 'rgba(255, 255, 255, 0.92)', strokeWidth: '2.5px', strokeLinejoin: 'round', cursor: 'pointer' },
      data: { type: 'info', hotspotId: h.id, kind: 'road' },
      zIndex: 30,
    }
  }
  return null
}

/** Shapes in paint order: estate outlines under plots under road arrows. */
export function sortShapes<T extends { zIndex?: number }>(shapes: T[]): T[] {
  return [...shapes].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function baseWrap(h: Hotspot, modifier: string): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = `vhs-info vhs-land vhs-land--${modifier}`
  wrap.setAttribute('data-vhs-type', 'info')
  wrap.setAttribute('data-vhs-id', h.id)
  wrap.setAttribute('data-vhs-kind', modifier)
  return wrap
}

// Same isolation as buildInfoMarkerEl: card interactions must not reach PSV or
// they would dismiss the card / trigger placement in the editor.
function isolateCard(wrap: HTMLElement) {
  wrap.addEventListener('click', (e: Event) => e.stopPropagation())
  const card = wrap.querySelector('.vhs-info__card') as HTMLElement | null
  if (card) {
    const stop = (e: Event) => e.stopPropagation()
    card.addEventListener('mousedown', stop)
    card.addEventListener('touchstart', stop, { passive: true })
  }
}

export interface PlotEnquiryDetail {
  hotspotId: string
  label: string
  status: PlotStatus
  size?: string
  price?: string
}

/** Fired on window when a buyer taps "Enquire about this plot". */
export const PLOT_ENQUIRE_EVENT = 'viewora:plot-enquire'

function buildPlotLabelEl(h: Hotspot, isEditing: boolean): HTMLElement {
  const status = plotStatus(h)
  const meta = PLOT_STATUS_META[status]
  const label = esc(h.label || 'Plot')
  const size = h.plotSize ? esc(h.plotSize) : ''
  const price = h.plotPrice ? esc(h.plotPrice) : ''
  const desc = esc(h.description || '')
  const wrap = baseWrap(h, 'plot')
  wrap.style.setProperty('--vhs-color', meta.color)

  // "Plot 23" shows as a compact "23" badge — estates have dozens of plots and
  // full pills crowd the view; the fill colour already carries the status.
  const num = /^plot\s*#?\s*(\d+)$/i.exec((h.label || '').trim())?.[1]
  wrap.innerHTML = `
    <div class="vhs-land__pill${num ? ' vhs-land__pill--compact' : ''}">
      <span class="vhs-land__dot"></span>
      <span class="vhs-land__pill-text">${num ?? label}</span>
      ${status !== 'available' && !num ? `<span class="vhs-land__pill-status">${meta.label}</span>` : ''}
    </div>
    <div class="vhs-info__card vhs-land__card">
      <div class="vhs-info__body">
        <span class="vhs-land__status">${meta.label}</span>
        <p class="vhs-info__title">${label}</p>
        ${size || price ? `
          <dl class="vhs-land__facts">
            ${size ? `<div><dt>Size</dt><dd>${size}</dd></div>` : ''}
            ${price ? `<div><dt>Price</dt><dd>${price}</dd></div>` : ''}
          </dl>` : ''}
        ${desc ? `<p class="vhs-info__desc">${desc}</p>` : ''}
        ${status !== 'sold' && !isEditing ? `<button type="button" class="vhs-land__cta">Enquire about this plot</button>` : ''}
        <p class="vhs-land__note">Boundaries are indicative. Confirm on site with a licensed surveyor.</p>
      </div>
    </div>
  `
  isolateCard(wrap)

  const cta = wrap.querySelector('.vhs-land__cta')
  cta?.addEventListener('click', () => {
    const detail: PlotEnquiryDetail = {
      hotspotId: h.id,
      label: h.label || 'Plot',
      status,
      size: h.plotSize || undefined,
      price: h.plotPrice || undefined,
    }
    window.dispatchEvent(new CustomEvent(PLOT_ENQUIRE_EVENT, { detail }))
  })
  return wrap
}

const BEACON_SVG = `
  <svg viewBox="0 0 24 32" width="22" height="30" aria-hidden="true">
    <path d="M7 8 L17 8 L19 29 L5 29 Z" fill="#f8fafc" stroke="rgba(0,0,0,0.55)" stroke-width="1.2"/>
    <path d="M6.2 17 L17.8 17 L18.4 23 L5.6 23 Z" fill="#ef4444"/>
    <rect x="6" y="4" width="12" height="4.5" rx="1" fill="#e2e8f0" stroke="rgba(0,0,0,0.55)" stroke-width="1.2"/>
  </svg>`

function buildBeaconEl(h: Hotspot): HTMLElement {
  const label = esc(h.label || 'Beacon')
  const desc = esc(h.description || '')
  const wrap = baseWrap(h, 'beacon')
  wrap.innerHTML = `
    <div class="vhs-land__beacon">${BEACON_SVG}</div>
    <span class="vhs-info__hover-label vhs-land__beacon-label">${label}</span>
    <div class="vhs-info__card vhs-land__card">
      <div class="vhs-info__body">
        <span class="vhs-info__tag" style="color:#f87171">Survey beacon</span>
        <p class="vhs-info__title">${label}</p>
        ${desc ? `<p class="vhs-info__desc">${desc}</p>` : ''}
        <p class="vhs-land__note">Beacon positions are indicative. Verify with the official survey plan.</p>
      </div>
    </div>
  `
  isolateCard(wrap)
  return wrap
}

const ROAD_SVG = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
    <path d="M4 21 L9 3"/><path d="M20 21 L15 3"/><path d="M12 5v2M12 11v2M12 17v2"/>
  </svg>`

function buildRoadEl(h: Hotspot): HTMLElement {
  const label = esc(h.label || 'Access road')
  const desc = esc(h.description || '')
  const url = h.url ? esc(h.url) : ''
  const wrap = baseWrap(h, 'road')
  if (url) wrap.setAttribute('data-vhs-url', url)
  wrap.innerHTML = `
    <div class="vhs-land__pill vhs-land__pill--road">
      ${ROAD_SVG}
      <span class="vhs-land__pill-text">${label}</span>
    </div>
    <div class="vhs-info__card vhs-land__card">
      <div class="vhs-info__body">
        <span class="vhs-info__tag" style="color:#facc15">Access</span>
        <p class="vhs-info__title">${label}</p>
        ${desc ? `<p class="vhs-info__desc">${desc}</p>` : ''}
        ${url ? `<a class="vhs-land__cta vhs-land__cta--link" href="${url}" target="_blank" rel="noopener noreferrer">Get directions ↗</a>` : ''}
      </div>
    </div>
  `
  isolateCard(wrap)
  return wrap
}

function buildZoneEl(h: Hotspot): HTMLElement {
  const label = esc(h.label || 'Estate')
  const desc = esc(h.description || '')
  const wrap = baseWrap(h, 'zone')
  wrap.innerHTML = `
    <div class="vhs-land__pill vhs-land__pill--zone">
      <span class="vhs-land__pill-text">${label}</span>
    </div>
    ${desc ? `
    <div class="vhs-info__card vhs-land__card">
      <div class="vhs-info__body">
        <span class="vhs-info__tag" style="color:#e2e8f0">Estate</span>
        <p class="vhs-info__title">${label}</p>
        <p class="vhs-info__desc">${desc}</p>
      </div>
    </div>` : ''}
  `
  isolateCard(wrap)
  return wrap
}

/** Element for the pin/label marker of any land hotspot. */
export function buildLandMarkerEl(h: Hotspot, isEditing = false): HTMLElement {
  if (h.kind === 'zone') return buildZoneEl(h)
  if (h.kind === 'beacon') return buildBeaconEl(h)
  if (h.kind === 'road') return buildRoadEl(h)
  return buildPlotLabelEl(h, isEditing)
}

/**
 * Builds a Google Maps directions link for an access point. Free, no API key:
 * https://developers.google.com/maps/documentation/urls/get-started
 */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`
}
