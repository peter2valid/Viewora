import { Viewer } from '@photo-sphere-viewer/core'
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin'
import { SettingsPlugin } from '@photo-sphere-viewer/settings-plugin'
import { StereoPlugin } from '@photo-sphere-viewer/stereo-plugin'
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin'
import { MapPlugin } from '@photo-sphere-viewer/map-plugin'
import { EquirectangularTilesAdapter } from '@photo-sphere-viewer/equirectangular-tiles-adapter'
import '@photo-sphere-viewer/virtual-tour-plugin/index.css'
import '@photo-sphere-viewer/settings-plugin/index.css'
import '@photo-sphere-viewer/map-plugin/index.css'

import type { TourScene } from '~/domain/scene'
import type { Hotspot } from '~/domain/hotspot'
import { HOTSPOT_ICONS_BY_KEY, TYPE_DEFAULT_ICON } from '~/shared/utils/hotspotIcons'

/** Master Handle: Unified state for a single viewer instance */
export interface PsvViewerHandle {
  viewer: any
  markers: any
  markerSignatures: Map<string, string>
  isEditing: boolean
  cleanup?: () => void
}

export interface PsvClickPayload {
  yaw: number
  pitch: number
  screenX: number
  screenY: number
}

export type ViewerPerformanceMode = 'auto' | 'full' | 'lite'

export function detectViewerPerformanceMode(): Exclude<ViewerPerformanceMode, 'auto'> {
  if (typeof window === 'undefined') return 'full'

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string; downlink?: number }
    mozConnection?: { saveData?: boolean; effectiveType?: string; downlink?: number }
    webkitConnection?: { saveData?: boolean; effectiveType?: string; downlink?: number }
    deviceMemory?: number
    hardwareConcurrency?: number
  }

  const connection = nav.connection || nav.mozConnection || nav.webkitConnection
  const saveData = !!connection?.saveData
  const effectiveType = connection?.effectiveType || ''
  const slowConnection = effectiveType === 'slow-2g' || effectiveType === '2g' || (typeof connection?.downlink === 'number' && connection.downlink < 1.2)
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 4
  const lowCores = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false
  const mobileViewport = window.innerWidth < 1024

  if (mobileViewport && (coarsePointer || navigator.maxTouchPoints > 0)) return 'lite'
  if (saveData || slowConnection) return 'lite'
  if (reducedMotion && (lowMemory || lowCores)) return 'lite'
  if (lowMemory && lowCores) return 'lite'

  return 'full'
}

/** Centralized Signature: Every visual property must be represented here */
function esc(s: string): string {
  if (!s) return ''
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

function hotspotSignature(hs: Hotspot): string {
  return [
    hs.yaw,
    hs.pitch,
    hs.type,
    hs.label ?? '',
    hs.url ?? '',
    hs.targetSceneId ?? '',
    hs.description ?? '',
    hs.icon ?? '',
    Number(hs.scale || 1).toFixed(2),
    Number(hs.hoverScale || 1.3).toFixed(2),
    JSON.stringify(hs.corners || []),
    hs.imageUrl ?? '',
  ].join('|')
}

function canUseTiledPanorama(scene: TourScene): boolean {
  return !!scene.tileManifestUrl
    && !!scene.tileCols
    && !!scene.tileRows
    && scene.tilesReady === true
}

function canUseMediumTiles(scene: TourScene): boolean {
  return !!scene.tileMediumManifestUrl
    && !!scene.tileMediumCols
    && !!scene.tileMediumRows
    && scene.tilesReady === true
}

// ─── Plain-DOM Hotspot Builders (no Shadow DOM / no Custom Elements) ────────
// These create standard divs that PSV MarkersPlugin handles reliably
// across all browsers without any WebComponent registration fragility.

function buildNavMarkerEl(hotspot: Hotspot): HTMLElement {
  const iconUrl = HOTSPOT_ICONS_BY_KEY[hotspot.icon || ''] || HOTSPOT_ICONS_BY_KEY['nav-up'] || ''
  const label = esc(hotspot.label || 'Move to next scene')
  const scale = Number(hotspot.scale || 1)
  const wrap = document.createElement('div')
  wrap.className = 'vhs-nav'
  wrap.setAttribute('data-vhs-type', 'scene_link')
  wrap.setAttribute('data-vhs-id', hotspot.id)
  if (scale !== 1) {
    wrap.style.transform = `scale(${scale})`
    wrap.style.transformOrigin = 'center center'
  }
  wrap.innerHTML = `
    <div class="vhs-nav__pulse"></div>
    ${iconUrl
      ? `<img class="vhs-nav__icon" src="${iconUrl}" alt="${label}" draggable="false" />`
      : `<div class="vhs-nav__arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </div>`}
  `
  return wrap
}

function buildInfoMarkerEl(hotspot: Hotspot): HTMLElement {
  const iconUrl = HOTSPOT_ICONS_BY_KEY[hotspot.icon || ''] || ''
  const label = esc(hotspot.label || 'Point of Interest')
  const desc = esc(hotspot.description || '')
  const imageUrl = hotspot.imageUrl ? esc(hotspot.imageUrl) : ''
  const url = hotspot.url ? esc(hotspot.url) : ''
  const scale = Number(hotspot.scale || 1)

  const typeMap: Record<string, { tag: string; color: string }> = {
    info:    { tag: 'Info',    color: '#6366f1' },
    url:     { tag: 'Link',   color: '#10b981' },
    video:   { tag: 'Video',  color: '#ef4444' },
    youtube: { tag: 'YouTube',color: '#ef4444' },
  }
  const meta = typeMap[hotspot.type] ?? typeMap['info']

  const wrap = document.createElement('div')
  wrap.className = 'vhs-info'
  wrap.setAttribute('data-vhs-type', hotspot.type)
  wrap.setAttribute('data-vhs-id', hotspot.id)
  if (url) wrap.setAttribute('data-vhs-url', url)
  if (scale !== 1) {
    wrap.style.transform = `scale(${scale})`
    wrap.style.transformOrigin = 'center center'
  }

  wrap.innerHTML = `
    <div class="vhs-info__trigger">
      <div class="vhs-info__pin-ring" style="--vhs-color:${meta.color}"></div>
      ${iconUrl
        ? `<img class="vhs-info__trigger-icon" src="${iconUrl}" alt="" draggable="false" />`
        : `<div class="vhs-info__pin-dot" style="background:${meta.color}"></div>`
      }
    </div>
    <span class="vhs-info__hover-label">${label}</span>
    <div class="vhs-info__card">
      ${imageUrl ? `<div class="vhs-info__img" style="background-image:url('${imageUrl}')"></div>` : ''}
      <div class="vhs-info__body">
        <div class="vhs-info__header">
          ${iconUrl ? `<img class="vhs-info__icon" src="${iconUrl}" alt="" />` : ''}
          <span class="vhs-info__tag" style="color:${meta.color}">${meta.tag}</span>
        </div>
        <p class="vhs-info__title">${label}</p>
        ${desc ? `<p class="vhs-info__desc">${desc}</p>` : ''}
        ${url ? `<a class="vhs-info__link" href="${url}" target="_blank" rel="noopener noreferrer" style="color:${meta.color}">Open link ↗</a>` : ''}
      </div>
    </div>
  `
  return wrap
}


export function getHotspotScreenPos(
  handle: PsvViewerHandle | null,
  yaw: number,
  pitch: number,
): { x: number; y: number } | null {
  if (!handle?.viewer) return null
  try {
    return handle.viewer.dataHelper.sphericalCoordsToViewerCoords({ yaw, pitch })
  } catch {
    return null
  }
}

export interface InitViewerOptions {
  onReady?: () => void
  onError?: (err: Error) => void
  onClick?: (payload: PsvClickPayload) => void
  onMarkerClick?: (id: string) => void
  isEditing?: boolean
  onMarkerEnter?: (id: string) => void
  onMarkerLeave?: (id: string) => void
  performanceMode?: ViewerPerformanceMode
  loadingImg?: string
}

/**
 * Returns the PSV EquirectangularTilesAdapter panorama config.
 * performanceMode drives which tile set is selected:
 *   'full' → full-resolution tiles (desktop)
 *   'lite' → medium tiles when available (4096×2048), else thumbnail-only
 * In both cases the baseUrl (thumbnail) is shown instantly while tiles stream in.
 */
function buildPanorama(scene: TourScene, performanceMode: 'lite' | 'full' = 'full') {
  // Lite / mobile: serve medium tiles — far fewer tiles, much less bandwidth
  if (performanceMode === 'lite') {
    if (canUseMediumTiles(scene)) {
      return {
        width:   4096,
        cols:    scene.tileMediumCols!,
        rows:    scene.tileMediumRows!,
        baseUrl: scene.imageUrl,
        tileUrl: (col: number, row: number) =>
          `${scene.tileMediumManifestUrl}/${col}_${row}.webp`,
      }
    }
    // Medium tiles not yet generated: thumbnail-only (1×1) for instant render
    return {
      width:   2048,
      cols:    1,
      rows:    1,
      baseUrl: scene.imageUrl,
      tileUrl: () => scene.imageUrl,
    }
  }

  // Full mode: use the complete tile grid
  if (canUseTiledPanorama(scene)) {
    return {
      width:   scene.width || 12288,
      cols:    scene.tileCols!,
      rows:    scene.tileRows!,
      baseUrl: scene.imageUrl,
      tileUrl: (col: number, row: number) =>
        `${scene.tileManifestUrl}/${col}_${row}.webp`,
    }
  }

  // No tiles yet — fall back to raw image as single tile (correct sphere mapping)
  if (scene.rawImageUrl && scene.width) {
    return {
      width:   scene.width,
      cols:    1,
      rows:    1,
      baseUrl: scene.imageUrl,
      tileUrl: () => scene.rawImageUrl!,
    }
  }

  // Last resort: thumbnail only
  return {
    width:   2048,
    cols:    1,
    rows:    1,
    baseUrl: scene.imageUrl,
    tileUrl: () => scene.imageUrl,
  }
}

export async function initViewer(
  container: HTMLElement,
  scene: TourScene,
  options: InitViewerOptions = {},
): Promise<PsvViewerHandle> {
  const { 
    onReady, 
    onError, 
    onClick, 
    onMarkerClick, 
    isEditing = false, 
    onMarkerEnter, 
    onMarkerLeave, 
    performanceMode = 'auto',
    loadingImg = '/images/viewora-logo.png'
  } = options

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  const hasTiles =
    canUseTiledPanorama(scene)

  const resolvedPerformanceMode = performanceMode === 'auto' ? detectViewerPerformanceMode() : performanceMode
  const isLiteMode = resolvedPerformanceMode === 'lite'

  const startAutorotate = (viewerInstance: any) => {
    try {
      viewerInstance.getPlugin(AutorotatePlugin)?.start?.()
    } catch {
      // noop
    }
  }

  const plugins: any[] = [
    [MarkersPlugin, { clickEventOnMarker: false }],
  ]

  plugins.push([SettingsPlugin, {}])
  plugins.push([GyroscopePlugin, { touchmove: isTouchDevice, absolutePosition: true }])
  plugins.push([AutorotatePlugin, {
    autorotateSpeed: '0.5rpm',
    autorotatePitch: scene.settings.pitch_default ?? 0,
    autostartDelay: 8000,
    autostartOnIdle: true,
  }])
  plugins.push([StereoPlugin, {}])

  patchGyroscopeSmoothing()

  const viewer: any = new Viewer({
    container,
    adapter: [EquirectangularTilesAdapter, {}] as any,
    panorama: buildPanorama(scene),
    defaultYaw: scene.settings.yaw_default,
    defaultPitch: scene.settings.pitch_default,
    loadingTxt: 'Loading...',
    loadingImg,
    navbar: false,
    touchmoveTwoFingers: false,
    fisheye: false,
    plugins,
  })

  const markers: any = viewer.getPlugin(MarkersPlugin)

  viewer.addEventListener('ready', () => {
    onReady?.()
    if (!isEditing && scene.settings.auto_rotate_enabled) {
      startAutorotate(viewer)
    }
  }, { once: true })

  viewer.addEventListener('panorama-error', (e: any) => {
    onError?.(e.error instanceof Error ? e.error : new Error('Panorama load failed'))
  })

  const cleanupFns: Array<() => void> = []

  const handleClick = (e: any) => {
    if (e.data?.rightclick) return
    let screenX = 0
    let screenY = 0
    try {
      const pos = viewer.dataHelper.sphericalCoordsToViewerCoords({ yaw: e.data.yaw, pitch: e.data.pitch })
      if (pos) { screenX = pos.x; screenY = pos.y }
    } catch { /* noop */ }
    onClick?.({ yaw: e.data.yaw, pitch: e.data.pitch, screenX, screenY })
  }
  viewer.addEventListener('click', handleClick)
  cleanupFns.push(() => viewer.removeEventListener('click', handleClick))

  const handleMarkerSelect = (e: any) => onMarkerClick?.(e.marker.id)
  markers.addEventListener('select-marker', handleMarkerSelect)
  cleanupFns.push(() => markers.removeEventListener('select-marker', handleMarkerSelect))

  if (onMarkerEnter) {
    const handleEnter = (e: any) => onMarkerEnter(e.marker.id)
    markers.addEventListener('enter-marker', handleEnter)
    cleanupFns.push(() => markers.removeEventListener('enter-marker', handleEnter))
  }

  if (onMarkerLeave) {
    const handleLeave = (e: any) => onMarkerLeave(e.marker.id)
    markers.addEventListener('leave-marker', handleLeave)
    cleanupFns.push(() => markers.removeEventListener('leave-marker', handleLeave))
  }

  return {
    viewer,
    markers,
    markerSignatures: new Map<string, string>(),
    isEditing,
    cleanup: () => { for (const fn of cleanupFns) fn() },
  }
}

export async function loadScene(handle: PsvViewerHandle | null, scene: TourScene, hotspots?: Hotspot[]): Promise<void> {
  if (!handle?.viewer) throw new Error('Viewer handle is invalid')
  if (!scene?.imageUrl) throw new Error('Scene image URL is required')

  try {
    handle.markers.clearMarkers()
    handle.markerSignatures.clear()

    await handle.viewer.setPanorama(buildPanorama(scene), {
      showLoader: false,
      position: { yaw: scene.settings.yaw_default, pitch: scene.settings.pitch_default },
      transition: { speed: 800, rotation: false, effect: 'fade' },
    })

    // Enforce hotspots after panorama is set
    if (hotspots?.length) {
      syncHotspots(handle, hotspots, true)
    }
  } catch (err) {
    // Clean up on error
    try { handle.markers.clearMarkers() } catch { /* noop */ }
    throw err
  }
}

export function addHotspot(handle: PsvViewerHandle | null, hotspot: Hotspot): void {
  if (!handle?.markers || !hotspot || !hotspot.id) return

  try {
    // Validate hotspot data
    if (typeof hotspot.yaw !== 'number' || typeof hotspot.pitch !== 'number') {
      console.error('Invalid hotspot coordinates:', hotspot)
      return
    }

    const isLayerType = hotspot.type === 'video' || hotspot.type === 'youtube'
    const hasCorners = Array.isArray(hotspot.corners) && hotspot.corners.length === 4

    const scale       = Number(hotspot.scale || 1)
    const hoverAmount = Number(hotspot.hoverScale || 1.3)

    if (!isLayerType) {
      const labelText = hotspot.label || (hotspot.type === 'scene_link' ? 'Go to scene' : undefined)
      const hoverAmount = Number(hotspot.hoverScale || 1.3)
      const isNav = hotspot.type === 'scene_link'

      const el = isNav ? buildNavMarkerEl(hotspot) : buildInfoMarkerEl(hotspot)

      const baseSize = isNav ? 52 : 40
      const scaledSize = Math.round(baseSize * scale)
      handle.markers.addMarker({
        id: hotspot.id,
        position: { yaw: hotspot.yaw, pitch: hotspot.pitch },
        element: el,
        size: { width: scaledSize, height: scaledSize },
        anchor: 'center center',
        tooltip: labelText && isNav ? { content: labelText, position: 'top center', trigger: 'hover' } : undefined,
        hoverScale: isNav ? hoverAmount : 1,
      })
      return
    }

    if (isLayerType && hotspot.url) {
      const videoBaseSize = scale * 640
      const ratio         = 360 / 640
      const position      = hasCorners ? hotspot.corners : { yaw: hotspot.yaw, pitch: hotspot.pitch }
      const size          = hasCorners ? undefined : { width: videoBaseSize, height: videoBaseSize * ratio }

      const container = document.createElement('div')
      container.className = `psv-hs-spatial-container ${handle.isEditing ? 'psv-hs-spatial--editable' : ''}`
      container.setAttribute('data-vhs-id', hotspot.id)
      container.style.width    = '100%'
      container.style.height   = '100%'
      container.style.position = 'relative'

      let contentElement: HTMLElement

      if (hotspot.type === 'video') {
        const video      = document.createElement('video')
        video.src        = hotspot.url
        video.autoplay   = true
        video.muted      = true
        video.loop       = true
        video.style.width      = '100%'
        video.style.height     = '100%'
        video.style.objectFit  = 'cover'
        contentElement = video
      } else {
        const videoId = hotspot.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]{11})/)?.[1] ?? hotspot.url

        const iframe        = document.createElement('iframe')
        iframe.src          = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`
        iframe.frameBorder  = '0'
        iframe.allow        = 'autoplay; encrypted-media'
        iframe.style.width          = '100%'
        iframe.style.height         = '100%'
        iframe.style.pointerEvents  = handle.isEditing ? 'none' : 'auto'
        contentElement = iframe
      }

      container.appendChild(contentElement)

      if (handle.isEditing) {
        const overlay       = document.createElement('div')
        overlay.className   = 'psv-hs-spatial-overlay'
        // Show a simple label in the spatial overlay for video markers while editing
        const labelText = esc(hotspot.label || hotspot.type || '3D Element')
        overlay.innerHTML = `<span style="font-size:11px;font-weight:700;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.9);background:rgba(0,0,0,0.5);padding:3px 8px;border-radius:6px;">${labelText}</span>`
        if (hasCorners) overlay.classList.add('psv-hs-spatial-overlay--mapped')
        container.appendChild(overlay)
      }

      handle.markers.addMarker({
        id: hotspot.id,
        elementLayer: container,
        position,
        size,
        anchor: 'center center',
        tooltip: handle.isEditing ? { content: hotspot.label || '3D Element', position: 'top center', trigger: 'hover' } : undefined,
      })
    }
  } catch (err) {
    console.error(`Error adding hotspot ${hotspot?.id}:`, err)
  }
}

export function removeHotspot(handle: PsvViewerHandle | null, id: string): void {
  if (!handle?.markers) return
  try { handle.markers.removeMarker(id) } catch { /* noop */ }
  handle.markerSignatures?.delete(id)
}

export function syncHotspots(handle: PsvViewerHandle | null, hotspots: Hotspot[], force = false): void {
  if (!handle?.markers) return

  try {
    // Validate input
    if (!Array.isArray(hotspots)) return
    
    const nextById = new Map<string, Hotspot>()
    hotspots.forEach(hs => { 
      if (hs && typeof hs === 'object' && hs.id) {
        nextById.set(hs.id, hs)
      }
    })

    // If forced, clear signatures to ensure all markers are re-added
    if (force) {
      handle.markerSignatures.clear()
    }

    // Remove hotspots that are no longer in the list
    for (const existingId of Array.from(handle.markerSignatures.keys())) {
      if (!nextById.has(existingId)) {
        removeHotspot(handle, existingId)
      }
    }

    // Add or update hotspots
    for (const [id, hs] of nextById) {
      try {
        const nextSig = hotspotSignature(hs)
        const prevSig = handle.markerSignatures.get(id)
        
        if (prevSig !== nextSig) {
          removeHotspot(handle, id)
          addHotspot(handle, hs)
          handle.markerSignatures.set(id, nextSig)
        }
      } catch (err) {
        console.error(`Error syncing hotspot ${id}:`, err)
        // Continue with next hotspot
      }
    }
  } catch (err) {
    console.error('Hotspot sync error:', err)
  }
}

export function addTracePoint(handle: PsvViewerHandle | null, id: string, pos: { yaw: number; pitch: number }): void {
  if (!handle?.markers) return
  handle.markers.addMarker({
    id,
    position: pos,
    html: '<div class="psv-hs-trace-dot"></div>',
    anchor: 'center center',
  })
}

export function updateTracePolygon(handle: PsvViewerHandle | null, points: Array<{ yaw: number; pitch: number }>): void {
  if (!handle?.markers) return
  try { handle.markers.removeMarker('trace-poly') } catch { /* noop */ }
  if (points.length < 3) return
  handle.markers.addMarker({
    id: 'trace-poly',
    polyline: points,
    svgStyle: { fill: 'rgba(59, 130, 246, 0.3)', stroke: 'rgba(59, 130, 246, 0.8)', strokeWidth: '2px' },
  })
}

export function toggleHotspotActive(handle: PsvViewerHandle | null, id: string, active: boolean): void {
  if (!handle?.markers) return
  try {
    const marker = handle.markers.getMarker(id)
    if (!marker?.element) return
    // Works for both plain-DOM .vhs-info elements and any fallback
    const el: HTMLElement = marker.element.querySelector?.('[data-vhs-type]') || marker.element
    if (active) {
      el.classList.add('vhs-info--active')
    } else {
      el.classList.remove('vhs-info--active')
    }
  } catch { /* marker not in scene — safe to ignore */ }
}

export async function focusHotspot(handle: PsvViewerHandle | null, id: string): Promise<void> {
  if (!handle?.viewer || !handle?.markers) return
  const marker = handle.markers.getMarker(id)
  if (!marker) return
  await handle.viewer.animate({
    yaw:   marker.config.position.yaw,
    pitch: marker.config.position.pitch,
    zoom:  70,
    speed: '4rpm',
  })
}

export function nudgeRender(handle: PsvViewerHandle | null): void {
  const v = handle?.viewer
  if (!v) return
  try {
    const pos = v.getPosition?.()
    if (pos) v.rotate({ yaw: pos.yaw + 0.0001, pitch: pos.pitch })
  } catch { /* noop */ }
}

export function destroy(handle: PsvViewerHandle | null): void {
  if (!handle?.viewer) return
  try { handle.cleanup?.() } catch { /* noop */ }
  try { handle.viewer.destroy() } catch { /* noop */ }
}

// ── Gyroscope smoothing ───────────────────────────────────────────────────────
// PSV's GyroscopePlugin feeds raw DeviceOrientationEvent alpha/beta/gamma values
// directly into the camera, causing the view to "dance" from sensor noise even
// when the phone is stationary.
//
// Fix: intercept window.addEventListener calls for 'deviceorientation' and wrap
// each registered handler with an EMA low-pass filter + dead zone. PSV then
// receives pre-smoothed values and the view stays stable.
//
// Params:
//   GYRO_EMA  — EMA weight for each new reading (0 = frozen, 1 = raw).
//               0.12 keeps ~88% of the previous smoothed value each sample.
//   GYRO_DEAD — movement below this many degrees is suppressed entirely.

const GYRO_EMA  = 0.12   // exponential moving average factor
const GYRO_DEAD = 0.20   // degrees — dead zone below which events are dropped
let _gyroPatched = false
const _wrappedHandlers = new WeakMap<object | Function, EventListenerOrEventListenerObject>()

function _smoothedGyroHandler(
  original: EventListenerOrEventListenerObject,
): EventListenerOrEventListenerObject {
  let smooth = { alpha: 0, beta: 0, gamma: 0 }
  let prev   = { alpha: 0, beta: 0, gamma: 0 }
  let seeded = false

  return (e: Event) => {
    const ev = e as DeviceOrientationEvent
    const { alpha, beta, gamma } = ev
    if (alpha === null || beta === null || gamma === null) {
      typeof original === 'function' ? original(e) : original.handleEvent(e)
      return
    }

    if (!seeded) {
      smooth = { alpha: alpha!, beta: beta!, gamma: gamma! }
      prev   = { ...smooth }
      seeded = true
      return  // seed only — skip first sample
    }

    // Alpha wraps at 0/360 — handle the discontinuity
    let da = alpha! - smooth.alpha
    if (da >  180) da -= 360
    if (da < -180) da += 360

    smooth.alpha = smooth.alpha + da                       * GYRO_EMA
    smooth.beta  = smooth.beta  + (beta!  - smooth.beta)  * GYRO_EMA
    smooth.gamma = smooth.gamma + (gamma! - smooth.gamma) * GYRO_EMA

    // Dead zone — suppress jitter below threshold
    if (
      Math.abs(smooth.alpha - prev.alpha) < GYRO_DEAD &&
      Math.abs(smooth.beta  - prev.beta)  < GYRO_DEAD &&
      Math.abs(smooth.gamma - prev.gamma) < GYRO_DEAD
    ) return

    prev = { ...smooth }

    // Dispatch a synthetic event carrying the smoothed values
    try {
      const filtered = new DeviceOrientationEvent(ev.type, {
        alpha:    smooth.alpha,
        beta:     smooth.beta,
        gamma:    smooth.gamma,
        absolute: ev.absolute,
      })
      typeof original === 'function' ? original(filtered) : original.handleEvent(filtered)
    } catch {
      // Synthetic event not supported — fall back to raw
      typeof original === 'function' ? original(e) : original.handleEvent(e)
    }
  }
}

/**
 * Monkey-patches window.addEventListener/removeEventListener so that every
 * future 'deviceorientation' subscriber (including PSV's GyroscopePlugin)
 * automatically receives EMA-smoothed + dead-zone-filtered values.
 * Safe to call multiple times — the patch is applied exactly once.
 */
function patchGyroscopeSmoothing() {
  if (_gyroPatched || typeof window === 'undefined') return
  _gyroPatched = true

  const origAdd    = window.addEventListener.bind(window)
  const origRemove = window.removeEventListener.bind(window)

  ;(window as any).addEventListener = function (
    type: string, listener: any, options?: any,
  ) {
    if (type === 'deviceorientation' && listener != null) {
      if (!_wrappedHandlers.has(listener)) {
        _wrappedHandlers.set(listener, _smoothedGyroHandler(listener))
      }
      return origAdd(type, _wrappedHandlers.get(listener)!, options)
    }
    return origAdd(type, listener, options)
  }

  ;(window as any).removeEventListener = function (
    type: string, listener: any, options?: any,
  ) {
    if (type === 'deviceorientation' && listener != null) {
      const wrapped = _wrappedHandlers.get(listener)
      if (wrapped) return origRemove(type, wrapped, options)
    }
    return origRemove(type, listener, options)
  }
}

// ── VirtualTourPlugin integration ─────────────────────────────────────────────
// Used by the public viewer to get stable native multi-scene navigation.
// The editor keeps the MarkersPlugin-only approach for per-hotspot editing.

/** Build VirtualTourNode[] from all scenes + their resolved hotspots */
function buildTourNodes(
  scenes: TourScene[],
  hotspotsByScene: Record<string, Hotspot[]>,
  performanceMode: 'lite' | 'full' = 'full',
): any[] {
  const nodes = scenes.map(scene => {
    const hotspots = hotspotsByScene[scene.id] ?? []

    // Deduplicate scene_link targets — VT Plugin uses these for its 3D floor arrows.
    const uniqueLinksMap = new Map<string, any>()
    hotspots.forEach(h => {
      if (h.type === 'scene_link' && h.targetSceneId) {
        if (!uniqueLinksMap.has(h.targetSceneId)) {
          uniqueLinksMap.set(h.targetSceneId, {
            nodeId: h.targetSceneId,
            position: { yaw: h.yaw, pitch: -0.8 }, // Force pitch to -0.8 (Zillow-style floor level)
          })
        }
      }
    })
    const links = Array.from(uniqueLinksMap.values())

    // Render ALL hotspots as MarkersPlugin markers using plain-DOM builders.
    // scene_link → floating nav arrow (blue pulse), others → info card.
    const markers = hotspots
      .filter(h => typeof h.yaw === 'number' && typeof h.pitch === 'number')
      .map(h => {
        const isNav = h.type === 'scene_link'
        const el = isNav ? buildNavMarkerEl(h) : buildInfoMarkerEl(h)
        const hScale = Number(h.scale || 1)
        const hBaseSize = isNav ? 52 : 40
        const scaledSize = Math.round(hBaseSize * hScale)
        return {
          id: h.id,
          position: { yaw: h.yaw, pitch: h.pitch },
          element: el,
          size: { width: scaledSize, height: scaledSize },
          anchor: 'center center',
          hoverScale: isNav ? Number(h.hoverScale || 1.3) : 1,
          data: { type: h.type, targetSceneId: h.targetSceneId, url: h.url },
        }
      })

    return {
      id: scene.id,
      panorama: buildPanorama(scene, performanceMode),
      name: scene.title,
      thumbnail: scene.imageUrl,
      // Pixel coordinates on the floor plan image — only included when non-zero
      // so MapPlugin knows where to place this node's dot on the map
      map: (typeof scene.positionX === 'number' && typeof scene.positionY === 'number' &&
            (scene.positionX !== 0 || scene.positionY !== 0))
        ? { x: scene.positionX, y: scene.positionY }
        : undefined,
      links,
      markers,
    }
  })

  // ── Ensure every node has at least one incoming link ───────────────────
  // PSV warns "Node X is never linked to" when a node appears in the nodes
  // array but no other node's links array points to it. This happens when a
  // scene has no scene_link hotspots targeting it. Add a fallback link from
  // the adjacent scene so every scene is reachable via the VT plugin arrows.
  const allTargetIds = new Set(nodes.flatMap(n => (n.links ?? []).map((l: any) => l.nodeId)))
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    if (!allTargetIds.has(scene.id)) {
      // Find the nearest scene that can provide an incoming link
      const sourceIndex = i > 0 ? i - 1 : i + 1
      if (sourceIndex >= 0 && sourceIndex < scenes.length) {
        const sourceNode = nodes[sourceIndex]
        if (sourceNode && !sourceNode.links.some((l: any) => l.nodeId === scene.id)) {
          sourceNode.links.push({
            nodeId: scene.id,
            position: { yaw: 0, pitch: -0.8 },
          })
          allTargetIds.add(scene.id)
        }
      }
    }
  }

  return nodes
}

export interface VirtualTourInitOptions {
  onReady?: () => void
  onError?: (err: Error) => void
  onNodeChanged?: (nodeId: string) => void
  onMarkerClick?: (hotspotId: string, type: string, url?: string) => void
  onAutorotateChange?: (enabled: boolean) => void
  autoRotate?: boolean
  performanceMode?: ViewerPerformanceMode
  loadingImg?: string
  floorplanUrl?: string
}

/**
 * Initialize a PSV viewer with VirtualTourPlugin for the public viewer.
 * Scene navigation is handled natively by VT; info/url hotspots fire onMarkerClick.
 */
export async function initVirtualTourViewer(
  container: HTMLElement,
  scenes: TourScene[],
  hotspotsByScene: Record<string, Hotspot[]>,
  startNodeId: string,
  options: VirtualTourInitOptions = {},
): Promise<PsvViewerHandle> {
  const {
    onReady,
    onError,
    onNodeChanged,
    onMarkerClick,
    onAutorotateChange,
    autoRotate,
    performanceMode = 'auto',
    loadingImg = '/images/viewora-logo.png',
    floorplanUrl,
  } = options

  const startScene = scenes.find(s => s.id === startNodeId) || scenes[0]
  if (!startScene) throw new Error('No scenes to display')

  const resolvedPerformanceMode = performanceMode === 'auto' ? detectViewerPerformanceMode() : performanceMode
  const isLiteMode = resolvedPerformanceMode === 'lite'

  const nodes = buildTourNodes(scenes, hotspotsByScene, resolvedPerformanceMode)

  // Plugin order matters — VirtualTour must be last (depends on MarkersPlugin)
  const plugins: any[] = [
    [MarkersPlugin, {}],
  ]

  plugins.push([AutorotatePlugin, {
    autorotateSpeed: '0.5rpm',
    autorotatePitch: 0,
    autostartDelay: 8000,
    autostartOnIdle: true,
  }])

  // GyroscopePlugin is a hard dependency of StereoPlugin but we never start it
  // ourselves. Only register it on devices that expose DeviceOrientationEvent to
  // avoid the "orientation sensor is deprecated" console warning on desktop browsers.
  const hasMotionSensor =
    typeof window !== 'undefined' &&
    (typeof DeviceOrientationEvent !== 'undefined' || navigator.maxTouchPoints > 0)
  if (hasMotionSensor) {
    plugins.push([GyroscopePlugin, { touchmove: false }])
  }
  plugins.push([StereoPlugin])

  // MapPlugin: interactive floor plan overlay — only activated when the space has
  // a floor plan image. Tracks the active VirtualTour node automatically.
  if (floorplanUrl) {
    const startPos = (startScene.positionX || startScene.positionY)
      ? { x: startScene.positionX ?? 0, y: startScene.positionY ?? 0 }
      : undefined
    plugins.push([MapPlugin, {
      imageUrl: floorplanUrl,
      center: startPos,
      rotation: '0deg',
      size: '230px',
      position: 'bottom left',
      visibleOnLoad: true,
      minZoom: 0.5,
      maxZoom: 4,
    }])
  }

  // VirtualTourPlugin must be added last — it depends on MarkersPlugin being registered
  plugins.push([VirtualTourPlugin, {
    dataMode: 'client',
    positionMode: 'manual',
    renderMode: '3d',
    nodes,
    startNodeId,
    preload: !isLiteMode,
    transitionOptions: {
      showLoader: true,
      speed: '20rpm',
      effect: 'fade',
      // rotation: false — do NOT pan the camera to the floor arrow before transitioning.
      // With rotation:true, PSV rotated down to pitch=-0.8 (the link position) before the
      // fade, making it look like the camera dove at the floor. The smart entry direction
      // feature already handles the correct orientation after arrival.
      rotation: false,
    },
    // Show scene thumbnail card when the user hovers a floor arrow
    showLinkTooltip: true,
    getLinkTooltip: (_content: string, link: any) => {
      const target = scenes.find(s => s.id === link.nodeId)
      if (!target) return ''
      const thumb = target.imageUrl || ''
      const name  = target.title  || ''
      return `<div class="vt-link-card">${
        thumb
          ? `<img class="vt-link-card__img" src="${thumb}" alt="${name}" />`
          : ''
      }${name
          ? `<p class="vt-link-card__name">${name}</p>`
          : ''
      }</div>`
    },
  }])

  // Apply gyroscope smoothing patch before the viewer registers its
  // DeviceOrientationEvent listener so PSV receives filtered values.
  patchGyroscopeSmoothing()

  const viewer: any = new Viewer({
    container,
    adapter: [EquirectangularTilesAdapter, {}] as any,
    defaultYaw: startScene.settings.yaw_default,
    defaultPitch: startScene.settings.pitch_default,
    loadingTxt: 'Loading...',
    loadingImg,
    navbar: false,
    touchmoveTwoFingers: false,
    fisheye: false,
    // 1.5× speed makes a full 360° orbit achievable in ~2.5 finger-swipes on mobile.
    moveSpeed: 1.5,
    // Reduced from 0.88 → 0.72: shorter deceleration tail after a swipe.
    // High inertia caused the view to keep spinning after release and load
    // previously-invisible tiles at the edge, producing a jittery flash.
    moveInertia: 0.72,
    plugins,
  })

  const markers: any = viewer.getPlugin(MarkersPlugin)
  const virtualTour: any = viewer.getPlugin(VirtualTourPlugin)

  const cleanupFns: Array<() => void> = []

  viewer.addEventListener('ready', () => {
    onReady?.()
    if (!isLiteMode && autoRotate) {
      requestAnimationFrame(() => {
        try {
          viewer.getPlugin(AutorotatePlugin)?.start?.()
        } catch {
          // noop
        }
      })
    }
  }, { once: true })
  viewer.addEventListener('panorama-error', (e: any) => {
    onError?.(e.error instanceof Error ? e.error : new Error('Panorama load failed'))
  })

  const autorotatePl = viewer.getPlugin(AutorotatePlugin)
  if (autorotatePl) {
    const handleAutorotateEv = (e: any) => onAutorotateChange?.(e.autorotateEnabled ?? false)
    autorotatePl.addEventListener('autorotate', handleAutorotateEv)
    cleanupFns.push(() => autorotatePl.removeEventListener('autorotate', handleAutorotateEv))
  }

  const handleNodeChanged = (e: any) => onNodeChanged?.(e.node.id)
  virtualTour.addEventListener('node-changed', handleNodeChanged)
  cleanupFns.push(() => virtualTour.removeEventListener('node-changed', handleNodeChanged))

  const handleMarkerSelect = (e: any) => {
    // Read type from data attribute (plain-DOM builders) or fallback to marker.data
    const el: HTMLElement | null = e.marker?.element?.querySelector?.('[data-vhs-type]') || null
    const type = el?.getAttribute('data-vhs-type') || e.marker?.config?.data?.type || 'info'
    const url = el?.getAttribute('data-vhs-url') || e.marker?.config?.data?.url || ''
    onMarkerClick?.(e.marker.id, type, url)
  }
  markers.addEventListener('select-marker', handleMarkerSelect)
  cleanupFns.push(() => markers.removeEventListener('select-marker', handleMarkerSelect))

  return {
    viewer,
    markers,
    markerSignatures: new Map(),
    isEditing: false,
    cleanup: () => { for (const fn of cleanupFns) fn() },
  }
}

/** Navigate VirtualTour to a specific node (public viewer GlassDock) */
export async function vtGoToNode(handle: PsvViewerHandle | null, nodeId: string): Promise<boolean> {
  if (!handle?.viewer) return false
  try {
    const vt = handle.viewer.getPlugin(VirtualTourPlugin)
    if (!vt) return false
    return await vt.setCurrentNode(nodeId)
  } catch { return false }
}

/** Get the currently displayed VirtualTour node id */
export function vtCurrentNodeId(handle: PsvViewerHandle | null): string | null {
  if (!handle?.viewer) return null
  try {
    const vt = handle.viewer.getPlugin(VirtualTourPlugin)
    return vt?.getCurrentNode()?.id ?? null
  } catch { return null }
}

/** Toggle active state on a VT node's marker (info card show/hide) */
export function vtToggleMarkerActive(handle: PsvViewerHandle | null, markerId: string, active: boolean): void {
  if (!handle?.markers) return
  try {
    const marker = handle.markers.getMarker(markerId)
    if (!marker?.element) return
    const el: HTMLElement = marker.element.querySelector?.('[data-vhs-type]') || marker.element
    if (active) {
      el.classList.add('vhs-info--active')
    } else {
      el.classList.remove('vhs-info--active')
    }
  } catch { /* noop */ }
}

/** Open/close the Settings panel (public viewer gear button) */
export function openSettings(handle: PsvViewerHandle | null): void {
  if (!handle?.viewer) return
  try {
    handle.viewer.getPlugin(SettingsPlugin)?.toggleSettings()
  } catch { /* noop */ }
}

export function toggleStereo(handle: PsvViewerHandle | null): void {
  if (!handle?.viewer) return
  try {
    handle.viewer.getPlugin(StereoPlugin)?.toggle()
  } catch { /* noop */ }
}

export function isStereoEnabled(handle: PsvViewerHandle | null): boolean {
  if (!handle?.viewer) return false
  try {
    return !!handle.viewer.getPlugin(StereoPlugin)?.isEnabled?.()
  } catch {
    return false
  }
}

export function toggleAutorotate(handle: PsvViewerHandle | null): void {
  if (!handle?.viewer) return
  try {
    handle.viewer.getPlugin(AutorotatePlugin)?.toggle()
  } catch { /* noop */ }
}

export function isAutorotateEnabled(handle: PsvViewerHandle | null): boolean {
  if (!handle?.viewer) return false
  try {
    return !!handle.viewer.getPlugin(AutorotatePlugin)?.isEnabled?.()
  } catch {
    return false
  }
}

export interface LiveViewerSettings {
  /** Horizontal field of view in degrees (30–120) */
  hfov?: number
  /** Starting yaw in degrees (-180 to 180) */
  yaw?: number
  /** Starting pitch in degrees (-90 to 90) */
  pitch?: number
}

/**
 * Apply viewer settings immediately to a live PSV instance without requiring a page reload.
 * Called by the editor after saving tour settings to the backend.
 * `animate` controls whether the camera smoothly moves to the new yaw/pitch (default: true).
 */
export function applyLiveSettings(
  handle: PsvViewerHandle | null,
  settings: LiveViewerSettings,
  animate = true,
): void {
  if (!handle?.viewer) return
  try {
    const { hfov, yaw, pitch } = settings

    // Map hfov (horizontal field of view degrees) → PSV zoom level (0–100)
    // PSV default zoom 50 ≈ 90° HFOV. We use a simple linear approximation:
    // zoom = clamp(100 - (hfov - 30) * (100 / 90), 0, 100)
    if (typeof hfov === 'number') {
      const zoom = Math.round(Math.max(0, Math.min(100, 100 - (hfov - 30) * (100 / 90))))
      handle.viewer.zoom(zoom)
    }

    const targetYaw   = typeof yaw   === 'number' ? yaw   : undefined
    const targetPitch = typeof pitch === 'number' ? pitch : undefined

    if (targetYaw !== undefined || targetPitch !== undefined) {
      const currentPos = handle.viewer.getPosition?.()
      if (animate) {
        handle.viewer.animate({
          yaw:   targetYaw   ?? currentPos?.yaw   ?? 0,
          pitch: targetPitch ?? currentPos?.pitch ?? 0,
          speed: '3rpm',
        })
      } else {
        handle.viewer.rotate({
          yaw:   targetYaw   ?? currentPos?.yaw   ?? 0,
          pitch: targetPitch ?? currentPos?.pitch ?? 0,
        })
      }
    }
  } catch (err) {
    console.warn('[psvAdapter] applyLiveSettings failed:', err)
  }
}

export function toggleGyroscope(handle: PsvViewerHandle | null): void {
  if (!handle?.viewer) return
  try { handle.viewer.getPlugin(GyroscopePlugin)?.toggle() } catch { /* noop */ }
}

export function isGyroscopeEnabled(handle: PsvViewerHandle | null): boolean {
  if (!handle?.viewer) return false
  try { return !!handle.viewer.getPlugin(GyroscopePlugin)?.isEnabled?.() } catch { return false }
}

export function resetView(handle: PsvViewerHandle | null, yaw = 0, pitch = 0): void {
  if (!handle?.viewer) return
  try { handle.viewer.animate({ yaw, pitch, zoom: 50, speed: '1.5rpm' }) } catch { /* noop */ }
}

export function zoomIn(handle: PsvViewerHandle | null): void {
  if (!handle?.viewer) return
  try {
    const lvl = handle.viewer.getZoomLevel() as number
    handle.viewer.zoom(Math.min(100, lvl + 15))
  } catch { /* noop */ }
}

export function zoomOut(handle: PsvViewerHandle | null): void {
  if (!handle?.viewer) return
  try {
    const lvl = handle.viewer.getZoomLevel() as number
    handle.viewer.zoom(Math.max(0, lvl - 15))
  } catch { /* noop */ }
}

export function captureScreenshot(handle: PsvViewerHandle | null): string | null {
  if (!handle?.viewer) return null
  try {
    const canvas: HTMLCanvasElement | undefined =
      handle.viewer.renderer?.renderer?.domElement ??
      handle.viewer.getContainer?.()?.querySelector?.('canvas')
    if (!canvas) return null
    return canvas.toDataURL('image/jpeg', 0.92)
  } catch { return null }
}
