// Land listing markers: plot boundaries, survey beacons and access roads.
//
// All three are stored as ordinary `info` hotspots with `content.kind` set, so
// they reuse the .vhs-info activation/card machinery (toggleHotspotActive,
// focusHotspot, card click isolation) and older viewers degrade to a plain
// info pin instead of breaking.
//
// A plot renders as two PSV markers: the label pill (id = hotspot id, carries
// data-vhs-id so editor drag/menu work unchanged) and a polygon
// (id = `${id}${PLOT_POLY_SUFFIX}`). Clicks on the polygon are mapped back to
// the hotspot id by toHotspotId().

import type { Hotspot, PlotStatus, SphericalPoint } from '~/domain/hotspot'

export const PLOT_POLY_SUFFIX = '__plot'

export const PLOT_STATUS_META: Record<PlotStatus, { label: string; color: string; fill: string }> = {
  available: { label: 'Available', color: '#22c55e', fill: 'rgba(34, 197, 94, 0.22)' },
  reserved:  { label: 'Reserved',  color: '#f59e0b', fill: 'rgba(245, 158, 11, 0.24)' },
  sold:      { label: 'Sold',      color: '#ef4444', fill: 'rgba(239, 68, 68, 0.20)' },
}

export function isPlot(h: Hotspot): boolean {
  return h.kind === 'plot' && Array.isArray(h.points) && h.points.length >= 3
}

export function isLandMarker(h: Hotspot): boolean {
  return h.kind === 'plot' || h.kind === 'beacon' || h.kind === 'road'
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

export function buildPlotPolygonMarker(h: Hotspot) {
  const meta = PLOT_STATUS_META[plotStatus(h)]
  return {
    id: `${h.id}${PLOT_POLY_SUFFIX}`,
    polygon: h.points!.map(p => ({ yaw: p.yaw, pitch: p.pitch })),
    svgStyle: {
      fill: meta.fill,
      stroke: meta.color,
      strokeWidth: '2.5px',
      strokeLinejoin: 'round',
      cursor: 'pointer',
    },
    data: { type: 'info', hotspotId: h.id, kind: 'plot' },
  }
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

  wrap.innerHTML = `
    <div class="vhs-land__pill">
      <span class="vhs-land__dot"></span>
      <span class="vhs-land__pill-text">${label}</span>
      ${status !== 'available' ? `<span class="vhs-land__pill-status">${meta.label}</span>` : ''}
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

/** Element for the pin/label marker of any land hotspot. */
export function buildLandMarkerEl(h: Hotspot, isEditing = false): HTMLElement {
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
