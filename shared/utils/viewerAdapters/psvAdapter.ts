import { Viewer } from '@photo-sphere-viewer/core'
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin'
import { CompassPlugin } from '@photo-sphere-viewer/compass-plugin'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'
import { EquirectangularTilesAdapter } from '@photo-sphere-viewer/equirectangular-tiles-adapter'

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

/** Returns the PSV panorama config — tiles only when ALL of: url, cols, rows, tilesReady */
function buildPanorama(scene: TourScene) {
  const hasTiles =
    !!scene.tileManifestUrl &&
    !!scene.tileCols &&
    !!scene.tileRows &&
    scene.tilesReady === true

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

  // Safe fallback — works for old scenes without tiles and new scenes while tiling
  return scene.imageUrl
}

export async function initViewer(
  container: HTMLElement,
  scene: TourScene,
  options: InitViewerOptions = {},
): Promise<PsvViewerHandle> {
  const { onReady, onError, onClick, onMarkerClick, isEditing = false, onMarkerEnter, onMarkerLeave } = options

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  const hasTiles =
    !!scene.tileManifestUrl &&
    !!scene.tileCols &&
    !!scene.tileRows &&
    scene.tilesReady === true

  const plugins: any[] = [
    [MarkersPlugin, { clickEventOnMarker: false }],
    [CompassPlugin, { size: '120px', position: 'bottom left', navigation: true }],
  ]
  if (isTouchDevice) {
    plugins.push([GyroscopePlugin, { touchmove: true, absolutePosition: true }])
  }

  const viewer: any = new Viewer({
    container,
    adapter: hasTiles ? [EquirectangularTilesAdapter, { showQueue: false, interpolation: true }] : undefined,
    panorama: buildPanorama(scene),
    defaultYaw: scene.settings.yaw_default,
    defaultPitch: scene.settings.pitch_default,
    navbar: false,
    touchmoveTwoFingers: false,
    fisheye: !isEditing,
    plugins,
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

export async function loadScene(handle: PsvViewerHandle | null, scene: TourScene): Promise<void> {
  if (!handle?.viewer || !scene.imageUrl) return

  handle.markers.clearMarkers()
  handle.markerSignatures.clear()

  const hasTiles =
    !!scene.tileManifestUrl &&
    !!scene.tileCols &&
    !!scene.tileRows &&
    scene.tilesReady === true

  // Swap adapter if needed when switching between tiled and non-tiled scenes
  if (hasTiles && !handle.viewer.adapter?.constructor?.name?.includes('Tiles')) {
    // PSV doesn't support live adapter swap — reinit would be needed.
    // For now fall back gracefully to full image for non-matching adapter state.
    await handle.viewer.setPanorama(scene.imageUrl, {
      showLoader: false,
      position: { yaw: scene.settings.yaw_default, pitch: scene.settings.pitch_default },
      transition: { speed: 1000, rotation: true, effect: 'black' },
    })
    return
  }

  await handle.viewer.setPanorama(buildPanorama(scene), {
    showLoader: false,
    position: { yaw: scene.settings.yaw_default, pitch: scene.settings.pitch_default },
    transition: { speed: 1000, rotation: true, effect: 'black' },
  })
}

export function addHotspot(handle: PsvViewerHandle | null, hotspot: Hotspot): void {
  if (!handle?.markers || !hotspot) return

  const isLayerType = hotspot.type === 'video' || hotspot.type === 'youtube'
  const hasCorners = Array.isArray(hotspot.corners) && hotspot.corners.length === 4

  const scale       = Number(hotspot.scale || 1)
  const hoverAmount = Number(hotspot.hoverScale || 1.3)

  if (!isLayerType) {
    const labelText   = hotspot.label || (hotspot.type === 'scene_link' ? 'Go to scene' : undefined)
    const contentHtml = !handle.isEditing && hotspot.type === 'info' ? buildInfoContent(hotspot) : undefined
    const baseSize    = scale * 44

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

  if (isLayerType && hotspot.url) {
    const videoBaseSize = scale * 640
    const ratio         = 360 / 640
    const position      = hasCorners ? hotspot.corners : { yaw: hotspot.yaw, pitch: hotspot.pitch }
    const size          = hasCorners ? undefined : { width: videoBaseSize, height: videoBaseSize * ratio }

    const container = document.createElement('div')
    container.className = `psv-hs-spatial-container ${handle.isEditing ? 'psv-hs-spatial--editable' : ''}`
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
      overlay.innerHTML   = buildMarkerHtml(hotspot)
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
}

export function removeHotspot(handle: PsvViewerHandle | null, id: string): void {
  if (!handle?.markers) return
  try { handle.markers.removeMarker(id) } catch { /* noop */ }
  handle.markerSignatures?.delete(id)
}

export function syncHotspots(handle: PsvViewerHandle | null, hotspots: Hotspot[]): void {
  if (!handle?.markers) return

  const nextById = new Map<string, Hotspot>()
  hotspots.forEach(hs => { if (hs?.id) nextById.set(hs.id, hs) })

  for (const existingId of Array.from(handle.markerSignatures.keys())) {
    if (!nextById.has(existingId)) removeHotspot(handle, existingId)
  }

  for (const [id, hs] of nextById) {
    const nextSig = hotspotSignature(hs)
    const prevSig = handle.markerSignatures.get(id)
    if (!prevSig || prevSig !== nextSig) {
      removeHotspot(handle, id)
      addHotspot(handle, hs)
      handle.markerSignatures.set(id, nextSig)
    }
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
