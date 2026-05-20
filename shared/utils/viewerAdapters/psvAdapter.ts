import { Viewer } from '@photo-sphere-viewer/core'
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin'
import { CompassPlugin } from '@photo-sphere-viewer/compass-plugin'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin'
import { SettingsPlugin } from '@photo-sphere-viewer/settings-plugin'
import { StereoPlugin } from '@photo-sphere-viewer/stereo-plugin'
import { VisibleRangePlugin } from '@photo-sphere-viewer/visible-range-plugin'
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

/** 
 * Custom WebComponent for Hotspots 
 * This allows us to have floating 3D cards directly above the hotspot 
 * without using the clunky right-side panel.
 */
if (typeof window !== 'undefined' && window.customElements && !window.customElements.get('viewora-hotspot')) {
  class VieworaHotspot extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
      return ['label', 'description', 'icon-url', 'type', 'active', 'image-url'];
    }

    attributeChangedCallback() {
      this.render();
    }

    updateMarker(properties: any) {
      // Optional: Handle scale based on distance/zoom if needed
    }

    render() {
      const type = this.getAttribute('type') || 'info';
      const label = this.getAttribute('label') || '';
      const desc = this.getAttribute('description') || '';
      const iconUrl = this.getAttribute('icon-url') || '';
      const imageUrl = this.getAttribute('image-url') || '';
      const isActive = this.getAttribute('active') === 'true';

      // ── LOGIC 1: NAVIGATION (MOVE) ──────────────────────────
      // Navigation must be stable, fast, and icon-based.
      if (type === 'scene_link' || type === 'nav') {
        this.shadowRoot!.innerHTML = `
          <style>
            :host {
              display: block;
              width: 50px;
              height: 50px;
            }
            .nav-container {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              cursor: pointer;
              transition: transform 0.2s ease;
              pointer-events: none;
            }
            .nav-container:hover { transform: scale(1.2); }
            .nav-icon {
              width: 100%;
              height: 100%;
              object-fit: contain;
              filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            }
            .pulse {
              position: absolute;
              inset: -15%;
              border-radius: 50%;
              border: 3px solid rgba(99, 102, 241, 0.6);
              animation: nav-pulse 2s ease-out infinite;
            }
            @keyframes nav-pulse {
              0% { transform: scale(1); opacity: 0.8; }
              100% { transform: scale(1.6); opacity: 0; }
            }
          </style>
          <div class="nav-container">
            <div class="pulse"></div>
            <img src="${iconUrl || '/hotspot-icons/nav-up.png'}" class="nav-icon">
          </div>
        `;
        return;
      }

      // ── LOGIC 2: INFO (BIG CARD) ────────────────────────────
      const iconUrl2 = this.getAttribute('icon-url') || '';
      this.shadowRoot!.innerHTML = `
        <style>
          :host {
            display: block;
            width: 260px;
            pointer-events: none;
          }
          .card-container {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: translateY(-20px);
            pointer-events: auto;
          }
          .card {
            width: 100%;
            background: rgba(12, 14, 22, 0.97);
            backdrop-filter: blur(24px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
            opacity: ${isActive ? '1' : '0.12'};
            transform: scale(${isActive ? '1' : '0.78'}) translateY(${isActive ? '0' : '24px'});
            transition: all 0.45s cubic-bezier(0.23, 1, 0.32, 1);
            color: white;
          }
          .img-header {
            width: 100%;
            height: 130px;
            background: url('${imageUrl}') center/cover no-repeat;
            background-color: rgba(255,255,255,0.04);
          }
          .icon-strip {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 14px 16px 0;
          }
          .icon-wrap {
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background: rgba(99,102,241,0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .icon-wrap img { width: 18px; height: 18px; object-fit: contain; }
          .type-label {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgba(99,102,241,0.8);
          }
          .padding { padding: 10px 16px 16px; }
          .title { font-size: 15px; font-weight: 800; margin: 0 0 5px 0; line-height: 1.3; letter-spacing: -0.01em; }
          .desc { font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.6; margin: 0; }
          .anchor {
            width: 10px;
            height: 10px;
            background: rgba(255,255,255,0.9);
            border-radius: 50%;
            margin-top: 10px;
            box-shadow: 0 0 16px rgba(255,255,255,0.6);
          }
        </style>
        <div class="card-container">
          <div class="card">
            ${imageUrl ? `<div class="img-header"></div>` : ''}
            ${iconUrl2 ? `<div class="icon-strip"><div class="icon-wrap"><img src="${iconUrl2}" /></div><span class="type-label">Info</span></div>` : ''}
            <div class="padding">
              <h3 class="title">${label || 'Information'}</h3>
              ${desc ? `<p class="desc">${desc}</p>` : ''}
            </div>
          </div>
          <div class="anchor"></div>
        </div>
      `;
    }
  }
  window.customElements.define('viewora-hotspot', VieworaHotspot);
}

function buildMarkerHtml(hotspot: Hotspot, isActive = false): string {
  // We no longer use buildMarkerHtml for the actual element, 
  // but we keep it as a fallback if needed.
  return `<viewora-hotspot 
    id="${hotspot.id}"
    label="${esc(hotspot.label || '')}" 
    description="${esc(hotspot.description || '')}" 
    icon-url="${HOTSPOT_ICONS_BY_KEY[hotspot.icon || ''] || ''}" 
    type="${hotspot.type}"
    active="${isActive}"
  ></viewora-hotspot>`
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
  const hasTiles = canUseTiledPanorama(scene)

  if (hasTiles) {
    return {
      width:   scene.width || 12288,
      cols:    scene.tileCols!,
      rows:    scene.tileRows!,
      baseUrl: scene.thumbnail_url || scene.imageUrl,
      tileUrl: (col: number, row: number) =>
        `${scene.tileManifestUrl}/${col}_${row}.webp`,
    }
  }

  // VirtualTour always uses the tiles adapter, so normalize single images to a 1x1 tile set.
  return {
    width: scene.width || 4096,
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
  const { onReady, onError, onClick, onMarkerClick, isEditing = false, onMarkerEnter, onMarkerLeave } = options

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  const hasTiles =
    canUseTiledPanorama(scene)

  const plugins: any[] = [
    [MarkersPlugin, { clickEventOnMarker: false }],
    [CompassPlugin, { size: '120px', position: 'bottom left', navigation: true }],
  ]

  if (scene.settings.auto_rotate_enabled) {
    plugins.push([AutorotatePlugin, {
      autorotateSpeed: '2rpm',
      autorotatePitch: scene.settings.pitch_default ?? 0,
      autostartDelay: 3000,
      autostartOnIdle: true,
    }])
  }

  if (isTouchDevice) {
    plugins.push([GyroscopePlugin, { touchmove: true, absolutePosition: true }])
  }

  // Prevent looking at poles — keeps the tour feeling grounded
  plugins.push([VisibleRangePlugin, { verticalRange: ['-75deg', '55deg'] }])

  const viewer: any = new Viewer({
    container,
    adapter: [EquirectangularTilesAdapter],
    panorama: buildPanorama(scene),
    defaultYaw: scene.settings.yaw_default,
    defaultPitch: scene.settings.pitch_default,
    navbar: false,
    touchmoveTwoFingers: false,
    fisheye: false,
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
      const labelText   = hotspot.label || (hotspot.type === 'scene_link' ? 'Go to scene' : undefined)
      const baseSize    = scale * 44

      // Create the custom element instance
      const el = document.createElement('viewora-hotspot');
      el.setAttribute('id', hotspot.id);
      el.setAttribute('label', hotspot.label || '');
      el.setAttribute('description', hotspot.description || '');
      el.setAttribute('type', hotspot.type);
      el.setAttribute('icon-url', HOTSPOT_ICONS_BY_KEY[hotspot.icon || ''] || HOTSPOT_ICONS_BY_KEY[hotspot.type === 'scene_link' ? 'nav-up' : 'info-3d-light'] || '');
      el.setAttribute('image-url', hotspot.imageUrl || '');
      el.setAttribute('active', 'false');

      const isNav = hotspot.type === 'scene_link';
      const markerSize = isNav ? { width: 50, height: 50 } : { width: 300, height: 400 };
      const markerAnchor = isNav ? 'center center' : 'bottom center';

      handle.markers.addMarker({
        id: hotspot.id,
        position: { yaw: hotspot.yaw, pitch: hotspot.pitch },
        element: el,
        size: markerSize,
        anchor: markerAnchor,
        tooltip: labelText ? { content: labelText, position: 'top center', trigger: 'hover' } : undefined,
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
    if (!marker || !marker.element) return
    const customEl = marker.element.querySelector('viewora-hotspot')
    if (customEl) {
      customEl.setAttribute('active', active ? 'true' : 'false')
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

    // scene_link hotspots become VirtualTour navigation links (native arrows)
    const links = hotspots
      .filter(h => h.type === 'scene_link' && h.targetSceneId)
      .map(h => ({
        nodeId: h.targetSceneId!,
        position: { yaw: h.yaw, pitch: h.pitch },
        arrowStyle: {
          element: () => {
            const el = document.createElement('viewora-hotspot')
            el.setAttribute('type', 'scene_link')
            el.setAttribute('label', h.label || '')
            el.setAttribute('icon-url',
              HOTSPOT_ICONS_BY_KEY[h.icon || ''] ||
              HOTSPOT_ICONS_BY_KEY['nav-up'] || ''
            )
            el.setAttribute('active', 'false')
            return el
          },
          size: { width: 50, height: 50 },
        },
        data: { hotspotId: h.id, label: h.label || '' },
      }))

    // All other hotspot types become MarkersPlugin markers on the node
    const markers = hotspots
      .filter(h => h.type !== 'scene_link')
      .map(h => {
        const el = document.createElement('viewora-hotspot')
        el.setAttribute('id', h.id)
        el.setAttribute('label', h.label || '')
        el.setAttribute('description', h.description || '')
        el.setAttribute('type', h.type)
        el.setAttribute('icon-url',
          HOTSPOT_ICONS_BY_KEY[h.icon || ''] ||
          HOTSPOT_ICONS_BY_KEY['info-3d-light'] || ''
        )
        el.setAttribute('image-url', h.imageUrl || '')
        el.setAttribute('active', 'false')

        return {
          id: h.id,
          position: { yaw: h.yaw, pitch: h.pitch },
          element: el,
          size: { width: 300, height: 400 },
          anchor: 'bottom center',
          hoverScale: Number(h.hoverScale || 1.3),
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
  onMarkerClick?: (hotspotId: string, type: string) => void
  autoRotate?: boolean
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
  const { onReady, onError, onNodeChanged, onMarkerClick, autoRotate } = options

  const startScene = scenes.find(s => s.id === startNodeId) || scenes[0]
  if (!startScene) throw new Error('No scenes to display')

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  const nodes = buildTourNodes(scenes, hotspotsByScene)

  // Plugin order matters — VirtualTour must be last (depends on MarkersPlugin)
  const plugins: any[] = [
    [MarkersPlugin, {}],
    [SettingsPlugin, {}],
    [CompassPlugin, { size: '120px', position: 'bottom left', navigation: false }],
  ]

  if (autoRotate) {
    plugins.push([AutorotatePlugin, {
      autorotateSpeed: '2rpm',
      autorotatePitch: 0,
      autostartDelay: 2000,
      autostartOnIdle: true,
    }])
  }

  // Always include Gyroscope — StereoPlugin (VR mode) requires it for head tracking
  plugins.push([GyroscopePlugin, { touchmove: isTouchDevice, absolutePosition: true }])
  plugins.push([StereoPlugin])
  plugins.push([VisibleRangePlugin, { verticalRange: ['-75deg', '55deg'] }])

  // VirtualTourPlugin must be added last — it depends on MarkersPlugin being registered
  plugins.push([VirtualTourPlugin, {
    dataMode: 'client',
    positionMode: 'manual',
    renderMode: 'markers',
    nodes,
    startNodeId,
    transitionOptions: {
      showLoader: true,
      speed: '20rpm',
      effect: 'black',
      rotation: true,
    },
    showLinkTooltip: false,
  }])

  const viewer: any = new Viewer({
    container,
    adapter: [EquirectangularTilesAdapter],
    defaultYaw: startScene.settings.yaw_default,
    defaultPitch: startScene.settings.pitch_default,
    navbar: false,
    touchmoveTwoFingers: false,
    fisheye: false,
    plugins,
  })

  const markers: any = viewer.getPlugin(MarkersPlugin)
  const virtualTour: any = viewer.getPlugin(VirtualTourPlugin)
  const settings: any = viewer.getPlugin(SettingsPlugin)
  const gyroscope: any = viewer.getPlugin(GyroscopePlugin)
  const stereo: any = viewer.getPlugin(StereoPlugin)
  const autorotate: any = autoRotate ? viewer.getPlugin(AutorotatePlugin) : null

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
    const type = e.marker?.element?.querySelector?.('viewora-hotspot')?.getAttribute?.('type') || 'info'
    onMarkerClick?.(e.marker.id, type)
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
export function vtGoToNode(handle: PsvViewerHandle | null, nodeId: string): void {
  if (!handle?.viewer) return
  try {
    const vt = handle.viewer.getPlugin(VirtualTourPlugin)
    vt?.setCurrentNode(nodeId)
  } catch { /* noop */ }
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
    const el = marker.element.querySelector?.('viewora-hotspot') || marker.element
    if (el) el.setAttribute('active', active ? 'true' : 'false')
  } catch { /* noop */ }
}

/** Open/close the Settings panel (public viewer gear button) */
export function openSettings(handle: PsvViewerHandle | null): void {
  if (!handle?.viewer) return
  try {
    handle.viewer.getPlugin(SettingsPlugin)?.toggleSettings()
  } catch { /* noop */ }
}
