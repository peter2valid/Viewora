import { Viewer } from '@photo-sphere-viewer/core'
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin'
import { SettingsPlugin } from '@photo-sphere-viewer/settings-plugin'
import { StereoPlugin } from '@photo-sphere-viewer/stereo-plugin'
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin'
import { EquirectangularTilesAdapter } from '@photo-sphere-viewer/equirectangular-tiles-adapter'
import '@photo-sphere-viewer/virtual-tour-plugin/index.css'
import '@photo-sphere-viewer/settings-plugin/index.css'

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

function isPowerOfTwo(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0
}

function canUseTiledPanorama(scene: TourScene): boolean {
  return !!scene.tileManifestUrl
    && !!scene.tileCols
    && !!scene.tileRows
    && scene.tilesReady === true
    && (scene.width || 0) > 4096
    && isPowerOfTwo(scene.tileCols)
    && isPowerOfTwo(scene.tileRows)
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
    <span class="vhs-nav__label">${label}</span>
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

/** Returns the PSV panorama config — tiles only when ALL of: url, cols, rows, tilesReady */
function buildPanorama(scene: TourScene) {
  const hasTiles = canUseTiledPanorama(scene)

  if (hasTiles) {
    return {
      width:   scene.width || 12288,
      cols:    scene.tileCols!,
      rows:    scene.tileRows!,
      baseUrl: scene.imageUrl,
      tileUrl: (col: number, row: number) =>
        `${scene.tileManifestUrl}/${col}_${row}.webp`,
    }
  }

  // VirtualTour always uses the tiles adapter, so normalize single images to a 1x1 tile set.
  // Use 8192 as the default width — modern panoramas are commonly 6000–8000px and PSV uses
  // this value for internal texture mapping; 4096 causes blurring on high-res sources.
  return {
    width: scene.width || 8192,
    cols: 1,
    rows: 1,
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

  const plugins: any[] = [
    [MarkersPlugin, { clickEventOnMarker: false }],
  ]

  plugins.push([SettingsPlugin, {}])
  plugins.push([GyroscopePlugin, { touchmove: isTouchDevice, absolutePosition: true }])
  plugins.push([AutorotatePlugin, {
    autorotateSpeed: '2rpm',
    autorotatePitch: scene.settings.pitch_default ?? 0,
    autostartDelay: 3000,
    autostartOnIdle: false,
  }])
  plugins.push([StereoPlugin, {}])

  // Prevent looking at poles — keeps the tour feeling grounded
  

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
    if (!isEditing) {
      if (scene.settings.auto_rotate_enabled) {
        viewer.getPlugin(AutorotatePlugin)?.start?.()
      }
      viewer.animate({
        yaw: scene.settings.yaw_default,
        pitch: scene.settings.pitch_default,
        zoom: 50,
        fisheye: 0,
      }, 2000)
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
      transition: { speed: 1000, rotation: true, effect: 'black' },
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

// ── VirtualTourPlugin integration ─────────────────────────────────────────────
// Used by the public viewer to get stable native multi-scene navigation.
// The editor keeps the MarkersPlugin-only approach for per-hotspot editing.

/** Build VirtualTourNode[] from all scenes + their resolved hotspots */
function buildTourNodes(scenes: TourScene[], hotspotsByScene: Record<string, Hotspot[]>): any[] {
  return scenes.map(scene => {
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
        const hScaledSize = Math.round(hBaseSize * hScale)
        return {
          id: h.id,
          position: { yaw: h.yaw, pitch: isNav ? -0.8 : h.pitch }, // Force nav marker to floor level
          element: el,
          // Info card height must be 'auto' — hardcoding 300 clips cards with images/long text.
          // Nav arrows are fixed-size so they remain consistent regardless of label length.
          size: isNav ? { width: 60, height: 80 } : { width: 240, height: 'auto' as any },
          anchor: isNav ? 'bottom center' : 'bottom center',
          scale: isNav ? [0.5, 1.3] : [0.7, 1.0], // size varies with zoom like Google Maps
          hoverScale: isNav ? Number(h.hoverScale || 1.3) : 1,
          data: { type: h.type, targetSceneId: h.targetSceneId, url: h.url },
        }
      })

    return {
      id: scene.id,
      panorama: buildPanorama(scene),
      name: scene.title,
      thumbnail: scene.imageUrl,
      links,
      markers,
    }
  })
}

export interface VirtualTourInitOptions {
  onReady?: () => void
  onError?: (err: Error) => void
  onNodeChanged?: (nodeId: string) => void
  onMarkerClick?: (hotspotId: string, type: string, url?: string) => void
  autoRotate?: boolean
  performanceMode?: ViewerPerformanceMode
  loadingImg?: string
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
    autoRotate, 
    performanceMode = 'auto',
    loadingImg = '/images/viewora-logo.png'
  } = options

  const startScene = scenes.find(s => s.id === startNodeId) || scenes[0]
  if (!startScene) throw new Error('No scenes to display')

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  const resolvedPerformanceMode = performanceMode === 'auto' ? detectViewerPerformanceMode() : performanceMode
  const isLiteMode = resolvedPerformanceMode === 'lite'

  const nodes = buildTourNodes(scenes, hotspotsByScene)

  // Plugin order matters — VirtualTour must be last (depends on MarkersPlugin)
  const plugins: any[] = [
    [MarkersPlugin, {}],
    [SettingsPlugin, {}],
  ]

  plugins.push([AutorotatePlugin, {
    autorotateSpeed: '2rpm',
    autorotatePitch: 0,
    autostartDelay: 2000,
    autostartOnIdle: !!autoRotate,
  }])

  plugins.push([GyroscopePlugin, { touchmove: isTouchDevice, absolutePosition: true }])
  plugins.push([StereoPlugin])
  

  // VirtualTourPlugin must be added last — it depends on MarkersPlugin being registered
  plugins.push([VirtualTourPlugin, {
    dataMode: 'client',
    positionMode: 'manual',
    renderMode: '3d', // 3d mode natively renders floor arrows for the links
    nodes,
    startNodeId,
    preload: false,
    transitionOptions: {
      showLoader: true,
      speed: '20rpm',
      effect: 'fade',
      rotation: true,
    },
    showLinkTooltip: false,
  }])

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
    plugins,
  })

  const markers: any = viewer.getPlugin(MarkersPlugin)
  const virtualTour: any = viewer.getPlugin(VirtualTourPlugin)
  const settings: any = viewer.getPlugin(SettingsPlugin)
  const gyroscope: any = !isLiteMode ? viewer.getPlugin(GyroscopePlugin) : null
  const stereo: any = !isLiteMode ? viewer.getPlugin(StereoPlugin) : null
  const autorotate: any = autoRotate && !isLiteMode ? viewer.getPlugin(AutorotatePlugin) : null

  // ── Wire Settings panel toggles ────────────────────────────
  if (settings) {
    if (autorotate) {
      settings.addSetting({
        id: 'autorotate',
        type: 'toggle',
        label: 'Auto-rotate',
        active: () => autorotate.isEnabled(),
        toggle: () => autorotate.toggle(),
      })
    }
    if (gyroscope) {
      settings.addSetting({
        id: 'gyroscope',
        type: 'toggle',
        label: 'Gyroscope',
        active: () => gyroscope.isEnabled(),
        toggle: () => gyroscope.toggle(),
      })
    }
    if (stereo) {
      settings.addSetting({
        id: 'stereo',
        type: 'toggle',
        label: 'VR mode',
        active: () => stereo.isEnabled(),
        toggle: () => stereo.toggle(),
      })
    }
  }

  const cleanupFns: Array<() => void> = []

  viewer.addEventListener('ready', () => onReady?.(), { once: true })
  viewer.addEventListener('panorama-error', (e: any) => {
    onError?.(e.error instanceof Error ? e.error : new Error('Panorama load failed'))
  })

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
