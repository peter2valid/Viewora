// PSV Adapter — DaVinci Edition
// A master-level abstraction isolating Photo Sphere Viewer from business logic.
// Robust, resolution-aware, and memory-safe.

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
}

/** Centralized Signature: Every visual property must be represented here */
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
  ].join('|')
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

/** Renders the hotspot as a plain PNG/SVG image — the icon IS the marker */
function buildMarkerHtml(hotspot: Hotspot): string {
  const iconKey = hotspot.icon || TYPE_DEFAULT_ICON[hotspot.type] || 'info-solid'
  const iconUrl = HOTSPOT_ICONS_BY_KEY[iconKey] || HOTSPOT_ICONS_BY_KEY['info-solid'] || ''
  const pulse = hotspot.type === 'scene_link' ? '<span class="psv-hs-pulse" aria-hidden="true"></span>' : ''
  return `<div class="psv-hs-marker" aria-label="${esc(hotspot.label ?? hotspot.type)}">${pulse}<img src="${iconUrl}" class="psv-hs-icon-img" draggable="false" alt=""></div>`
}

function buildInfoContent(hotspot: Hotspot): string {
  const title = hotspot.label ? `<p class="psv-hs-panel-title">${esc(hotspot.label)}</p>` : ''
  const desc = hotspot.description ? `<p class="psv-hs-panel-desc">${esc(hotspot.description)}</p>` : ''
  if (!title && !desc) return ''
  return `<div class="psv-hs-panel">${title}${desc}</div>`
}

/** 
 * MASTER INIT: Multi-resolution, Plugin-rich, and Hardware-accelerated.
 */
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
}

export async function initViewer(
  container: HTMLElement,
  scene: TourScene,
  options: InitViewerOptions = {},
): Promise<PsvViewerHandle> {
  const { onReady, onError, onClick, onMarkerClick, isEditing = false, onMarkerEnter, onMarkerLeave } = options
  const [
    { Viewer },
    { MarkersPlugin },
    { CompassPlugin },
    { GyroscopePlugin },
    { EquirectangularTilesAdapter },
  ] = await Promise.all([
    import('@photo-sphere-viewer/core'),
    import('@photo-sphere-viewer/markers-plugin'),
    import('@photo-sphere-viewer/compass-plugin'),
    import('@photo-sphere-viewer/gyroscope-plugin'),
    import('@photo-sphere-viewer/equirectangular-tiles-adapter'),
  ])

  const useTiles = !!scene.tileManifestUrl

  const viewer: any = new Viewer({
    container,
    adapter: useTiles ? [EquirectangularTilesAdapter, {
      showQueue: false,
      interpolation: true,
    }] : undefined,
    panorama: useTiles ? {
      width: scene.width || 12288,
      cols: 16,
      rows: 8,
      baseUrl: scene.imageUrl, // High-speed thumbnail as base
      tileUrl: () => scene.tileManifestUrl!,
    } : scene.imageUrl,
    defaultYaw: scene.settings.yaw_default,
    defaultPitch: scene.settings.pitch_default,
    navbar: false,
    touchmoveTwoFingers: false,
    fisheye: !isEditing,
    plugins: [
      [MarkersPlugin, { clickEventOnMarker: false }],
      [CompassPlugin, { size: '120px', position: 'bottom left', navigation: true }],
      [GyroscopePlugin, { touchmove: true, absolutePosition: true }],
    ],
  })

  const markers: any = viewer.getPlugin(MarkersPlugin)

  viewer.addEventListener('ready', () => {
    onReady?.()
    if (!isEditing) {
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
  
  // Click Handlers
  const handleClick = (e: any) => {
    if (e.data?.rightclick) return
    onClick?.({ yaw: e.data.yaw, pitch: e.data.pitch })
  }
  viewer.addEventListener('click', handleClick)
  cleanupFns.push(() => viewer.removeEventListener('click', handleClick))

  // Marker Handlers
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

/** 
 * MASTER SCENE LOAD: Precise state reset 
 */
export async function loadScene(handle: PsvViewerHandle | null, scene: TourScene): Promise<void> {
  if (!handle?.viewer || !scene.imageUrl) return
  
  // 1. Wipe everything to prevent artifacts
  handle.markers.clearMarkers()
  handle.markerSignatures.clear()

  const useTiles = !!scene.tileManifestUrl
  const panorama = useTiles ? {
    width: scene.width || 12288,
    cols: 16,
    rows: 8,
    baseUrl: scene.imageUrl,
    tileUrl: () => scene.tileManifestUrl!,
  } : scene.imageUrl

  await handle.viewer.setPanorama(panorama, {
    showLoader: false,
    position: { yaw: scene.settings.yaw_default, pitch: scene.settings.pitch_default },
    transition: { speed: 1000, rotation: true, effect: 'black' },
  })
}

/** 
 * MASTER ADDER: Defensive property handling and 3D Spatial Geometry
 */
export function addHotspot(handle: PsvViewerHandle | null, hotspot: Hotspot): void {
  if (!handle?.markers || !hotspot) return

  const isLayerType = hotspot.type === 'video' || hotspot.type === 'youtube'
  const hasCorners = Array.isArray(hotspot.corners) && hotspot.corners.length === 4
  
  // Numerical Safety
  const scale = Number(hotspot.scale || 1)
  const hoverAmount = Number(hotspot.hoverScale || 1.3)

  // 1. Standard Interactive Markers (Info, Link, URL)
  if (!isLayerType) {
    const labelText = hotspot.label || (hotspot.type === 'scene_link' ? 'Go to scene' : undefined)
    const contentHtml = !handle.isEditing && hotspot.type === 'info' ? buildInfoContent(hotspot) : undefined
    const baseSize = scale * 44

    handle.markers.addMarker({
      id: hotspot.id,
      position: { yaw: hotspot.yaw, pitch: hotspot.pitch },
      html: buildMarkerHtml(hotspot),
      size: { width: baseSize, height: baseSize },
      anchor: 'center center',
      tooltip: labelText ? { content: labelText, position: 'top center', trigger: 'hover' } : undefined,
      ...(contentHtml ? { content: contentHtml } : {}),
      hoverScale: hoverAmount,
    })
    return
  }

  // 2. Spatial 3D Elements (Video, YouTube)
  if (isLayerType && hotspot.url) {
    const videoBaseSize = scale * 640
    const ratio = 360 / 640
    const position = hasCorners ? hotspot.corners : { yaw: hotspot.yaw, pitch: hotspot.pitch }
    const size = hasCorners ? undefined : { width: videoBaseSize, height: videoBaseSize * ratio }

    // DaVinci Level: Create a robust DOM wrapper that holds both the video content 
    // AND the selection UI for the editor.
    const container = document.createElement('div')
    container.className = `psv-hs-spatial-container ${handle.isEditing ? 'psv-hs-spatial--editable' : ''}`
    container.style.width = '100%'
    container.style.height = '100%'
    container.style.position = 'relative'

    let contentElement: HTMLElement

    if (hotspot.type === 'video') {
      const video = document.createElement('video')
      video.src = hotspot.url
      video.autoplay = true
      video.muted = true
      video.loop = true
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.objectFit = 'cover'
      contentElement = video
    } else {
      const videoId = hotspot.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]{11})/) 
        ? hotspot.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]{11})/)![1]
        : hotspot.url
        
      const iframe = document.createElement('iframe')
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`
      iframe.frameBorder = '0'
      iframe.allow = 'autoplay; encrypted-media'
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.pointerEvents = handle.isEditing ? 'none' : 'auto'
      contentElement = iframe
    }

    container.appendChild(contentElement)

    // Add Editor Overlay Handle
    if (handle.isEditing) {
      const overlay = document.createElement('div')
      overlay.className = 'psv-hs-spatial-overlay'
      overlay.innerHTML = buildMarkerHtml(hotspot)
      
      // If mapped to corners, make the overlay cover the whole area
      if (hasCorners) {
        overlay.classList.add('psv-hs-spatial-overlay--mapped')
      }
      
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
}

export function removeHotspot(handle: PsvViewerHandle | null, id: string): void {
  if (!handle?.markers) return
  try { handle.markers.removeMarker(id) } catch { /* noop */ }
  handle.markerSignatures?.delete(id)
}

/** 
 * MASTER SYNC: The DaVinci Diff Engine
 */
export function syncHotspots(handle: PsvViewerHandle | null, hotspots: Hotspot[]): void {
  if (!handle?.markers) return

  const nextById = new Map<string, Hotspot>()
  hotspots.forEach(hs => { if (hs?.id) nextById.set(hs.id, hs) })

  // 1. Precise Removal
  for (const existingId of Array.from(handle.markerSignatures.keys())) {
    if (!nextById.has(existingId)) {
      removeHotspot(handle, existingId)
    }
  }

  // 2. Intelligent Updates
  for (const [id, hs] of nextById) {
    const nextSig = hotspotSignature(hs)
    const prevSig = handle.markerSignatures.get(id)

    if (!prevSig || prevSig !== nextSig) {
      // Hard Reset: For maximum stability, we remove and re-add 
      // rather than using 'updateMarker' which is buggy for type changes.
      removeHotspot(handle, id)
      addHotspot(handle, hs)
      handle.markerSignatures.set(id, nextSig)
    }
  }
}

/** Tracing Feedbacks */
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
