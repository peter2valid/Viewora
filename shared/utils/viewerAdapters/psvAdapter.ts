// PSV Adapter — isolates Photo Sphere Viewer from all business logic.
// Uses dynamic imports so PSV is never loaded during SSR (DOM required).

import type { TourScene } from '~/domain/scene'
import type { Hotspot } from '~/domain/hotspot'
import { HOTSPOT_ICONS_BY_KEY, TYPE_DEFAULT_ICON } from '~/shared/utils/hotspotIcons'

// Internal viewer and plugin instances typed as `any` — the Viewer class
// has protected internal methods (init, __setSize) that cause TS assignment
// errors when using the named import type. The adapter is the sole consumer
// of these handles, so typing them strictly here adds no safety benefit.
export interface PsvViewerHandle {
  viewer: any
  markers: any
  /** Hotspot signature cache for diff-sync updates */
  markerSignatures: Map<string, string>
  /** When true, hotspot clicks open the editor panel rather than the content panel */
  isEditing: boolean
  /** Optional cleanup for DOM-level listeners (e.g. WebGL context loss) */
  cleanup?: () => void
}

export interface PsvClickPayload {
  yaw: number
  pitch: number
}

export function sceneToViewerConfig(scene: TourScene) {
  return {
    panorama: scene.imageUrl,
    defaultYaw: scene.settings.yaw_default,
    defaultPitch: scene.settings.pitch_default,
  }
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
    hs.scale ?? 1,
    hs.hoverScale ?? 1.3,
  ].join('|')
}

// Escape user-provided strings before embedding in HTML (used for PSV content panel only).
function esc(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

function buildMarkerHtml(hotspot: Hotspot): string {
  const iconKey = hotspot.icon || TYPE_DEFAULT_ICON[hotspot.type] || 'info'
  const icon = HOTSPOT_ICONS_BY_KEY[iconKey] || HOTSPOT_ICONS_BY_KEY['info'] || ''
  
  // No more forced circle container. The icon IS the hotspot.
  const pulse = hotspot.type === 'scene_link' ? '<span class="psv-hs-pulse" aria-hidden="true"></span>' : ''
  return `<div class="psv-hs-marker psv-hs-marker--${hotspot.type}" aria-label="${esc(hotspot.label ?? hotspot.type)}">
    ${pulse}
    <div class="psv-hs-icon-wrapper">${icon}</div>
  </div>`
}

// Builds the HTML shown inside PSV's side panel for info hotspots (public viewer only).
function buildInfoContent(hotspot: Hotspot): string {
  const title = hotspot.label ? `<p class="psv-hs-panel-title">${esc(hotspot.label)}</p>` : ''
  const desc = hotspot.description ? `<p class="psv-hs-panel-desc">${esc(hotspot.description)}</p>` : ''
  if (!title && !desc) return ''
  return `<div class="psv-hs-panel">${title}${desc}</div>`
}

/**
 * Mounts PSV into `container` and returns a handle.
 * Must be called inside onMounted (client-only, DOM required).
 */
export async function initViewer(
  container: HTMLElement,
  scene: TourScene,
  onReady?: () => void,
  onError?: (err: Error) => void,
  onClick?: (payload: PsvClickPayload) => void,
  onMarkerClick?: (id: string) => void,
  isEditing = false,
): Promise<PsvViewerHandle> {
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

  // Cast to any: Viewer's protected methods (init, __setSize) prevent direct type
  // assignment, and getPlugin's generic constraint doesn't accept PluginConstructor
  // for dynamically-imported classes. The handle is any-typed by design.
  const viewer: any = new Viewer({
    container,
    adapter: useTiles ? [EquirectangularTilesAdapter, {
      showQueue: false,
      interpolation: true,
    }] : undefined,
    panorama: useTiles ? {
      width: scene.width || 12288,
      cols: 16, // Default columns for our tiling setup
      rows: 8,
      baseUrl: scene.imageUrl,
      tileUrl: (col: number, row: number) => scene.tileManifestUrl!,
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

  // PSV v5: 'ready' fires once the first panorama has loaded
  viewer.addEventListener('ready', () => {
    onReady?.()
    
    // Intro animation: Little Planet to normal view
    if (!isEditing) {
      viewer.animate({
        yaw: scene.settings.yaw_default,
        pitch: scene.settings.pitch_default,
        zoom: 50,
        fisheye: 0,
      }, 2000)
    }
  }, { once: true })

  // ... rest of the setup

  // PSV v5: 'panorama-error' fires when a panorama fails to load
  viewer.addEventListener('panorama-error', (e: any) => {
    const err = e.error instanceof Error ? e.error : new Error('Panorama load failed')
    onError?.(err)
  })

  // WebGL context loss — surface an actionable error
  const cleanupFns: Array<() => void> = []
  const bindWebglContextHandlers = () => {
    try {
      const canvas = container.querySelector('canvas')
      if (!canvas) return
      const onLost = (ev: Event) => {
        ev.preventDefault?.()
        onError?.(new Error('WebGL context lost. Try reloading the page or using a smaller panorama.'))
      }
      canvas.addEventListener('webglcontextlost', onLost, false)
      canvas.addEventListener('webglcontextrestored', () => {}, false)
      cleanupFns.push(() => canvas.removeEventListener('webglcontextlost', onLost, false))
    } catch { /* ignore */ }
  }
  bindWebglContextHandlers()
  viewer.addEventListener('ready', () => bindWebglContextHandlers(), { once: true })

  // Viewer click — used in editor mode to place hotspots
  viewer.addEventListener('click', (e: any) => {
    if (e.data?.rightclick) return
    onClick?.({ yaw: e.data.yaw, pitch: e.data.pitch })
  })

  // Marker click — always emit id; parent decides what to do
  markers.addEventListener('select-marker', (e: any) => {
    onMarkerClick?.(e.marker.id)
  })

  return {
    viewer,
    markers,
    markerSignatures: new Map<string, string>(),
    isEditing,
    cleanup: () => { for (const fn of cleanupFns) fn() },
  }
}

/**
 * Loads a new panorama scene into an existing viewer.
 * Clears all markers first to prevent stale hotspots from the previous scene.
 */
export async function loadScene(
  handle: PsvViewerHandle | null,
  scene: TourScene,
): Promise<void> {
  if (!handle?.viewer || !scene.imageUrl) return
  handle.markers.clearMarkers()
  handle.markerSignatures.clear()

  const useTiles = !!scene.tileManifestUrl
  const panorama = useTiles ? {
    width: scene.width || 12288,
    cols: 16,
    rows: 8,
    baseUrl: scene.imageUrl,
    tileUrl: (col: number, row: number) => scene.tileManifestUrl!,
  } : scene.imageUrl

  await handle.viewer.setPanorama(panorama, {
    showLoader: false,
    position: { yaw: scene.settings.yaw_default, pitch: scene.settings.pitch_default },
    transition: {
      speed: 1000,
      rotation: true,
      effect: 'black',
    },
  })
}

/**
 * Some PSV versions occasionally fail to draw markers until the camera moves.
 * This forces a "no-op" micro-animate to trigger a render, if supported.
 */
export async function nudgeRender(handle: PsvViewerHandle | null): Promise<void> {
  const viewer = handle?.viewer
  if (!viewer) return
  try {
    const pos = viewer.getPosition?.()
    const yaw = pos?.yaw ?? 0
    const pitch = pos?.pitch ?? 0
    if (typeof viewer.animate === 'function') {
      await viewer.animate({ yaw: yaw + 0.0001, pitch }, 1)
      await viewer.animate({ yaw, pitch }, 1)
    } else if (typeof viewer.rotate === 'function') {
      viewer.rotate({ yaw: yaw + 0.0001, pitch })
      viewer.rotate({ yaw, pitch })
    }
  } catch { /* ignore */ }
}

/** Adds a single hotspot marker with rich icon, hover animation, and (for info type) side-panel content. */
export function addHotspot(handle: PsvViewerHandle | null, hotspot: Hotspot): void {
  if (!handle?.markers) return

  // Standard 2D Markers (Info, Link, URL)
  if (hotspot.type === 'info' || hotspot.type === 'scene_link' || hotspot.type === 'url') {
    const labelText = hotspot.label || (hotspot.type === 'scene_link' ? 'Go to scene' : undefined)
    const tooltipConfig = labelText
      ? { content: labelText, position: 'top center' as const, trigger: 'hover' as const }
      : undefined

    const contentHtml = !handle.isEditing && hotspot.type === 'info'
      ? buildInfoContent(hotspot)
      : undefined

    // Explicitly cast to Number to prevent 'NaN' or string-concat bugs
    const scale = Number(hotspot.scale || 1)
    const baseSize = scale * 44
    const hoverAmount = Number(hotspot.hoverScale || 1.3)

    handle.markers.addMarker({
      id: hotspot.id,
      position: { yaw: hotspot.yaw, pitch: hotspot.pitch },
      html: buildMarkerHtml(hotspot),
      size: { width: baseSize, height: baseSize },
      anchor: 'center center',
      tooltip: tooltipConfig,
      ...(contentHtml ? { content: contentHtml } : {}),
      scale: { zoom: [0.7, 1.2] },
      hoverScale: hoverAmount,
    })
    return
  }

  // Spatial / 3D Layer Markers (Video, YouTube)
  if (hotspot.type === 'video' && hotspot.url) {
    const hasCorners = hotspot.corners && hotspot.corners.length === 4
    const baseSize = (hotspot.scale ?? 1) * 640
    const ratio = 360 / 640
    
    handle.markers.addMarker({
      id: hotspot.id,
      videoLayer: hotspot.url,
      position: hasCorners ? hotspot.corners : { yaw: hotspot.yaw, pitch: hotspot.pitch },
      size: hasCorners ? undefined : { width: baseSize, height: baseSize * ratio },
      anchor: 'center center',
      autoplay: true,
      muted: true,
      loop: true,
      // In editor mode, add an HTML overlay so it's clickable/selectable
      html: handle.isEditing ? buildMarkerHtml(hotspot) : undefined,
      tooltip: handle.isEditing ? { content: hotspot.label || 'Video Hotspot', position: 'top center', trigger: 'hover' } : undefined,
    })
    return
  }

  if (hotspot.type === 'youtube' && hotspot.url) {
    const hasCorners = hotspot.corners && hotspot.corners.length === 4
    
    // Extract video ID if full URL was provided, otherwise assume it's the ID
    const videoId = hotspot.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]{11})/) 
      ? hotspot.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]{11})/)![1]
      : hotspot.url

    const baseSize = (hotspot.scale ?? 1) * 640
    const ratio = 360 / 640

    // Create iframe element for cleaner embedding
    const iframe = document.createElement('iframe')
    iframe.width = '100%'
    iframe.height = '100%'
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1`
    iframe.frameBorder = '0'
    iframe.allow = 'autoplay; encrypted-media'
    iframe.style.pointerEvents = handle.isEditing ? 'none' : 'auto'

    handle.markers.addMarker({
      id: hotspot.id,
      elementLayer: iframe,
      position: hasCorners ? hotspot.corners : { yaw: hotspot.yaw, pitch: hotspot.pitch },
      size: hasCorners ? undefined : { width: baseSize, height: baseSize * ratio },
      anchor: 'center center',
      html: handle.isEditing ? buildMarkerHtml(hotspot) : undefined,
      tooltip: handle.isEditing ? { content: hotspot.label || 'YouTube Hotspot', position: 'top center', trigger: 'hover' } : undefined,
    })
    return
  }
}

/** Removes a marker by id. Safe to call for non-existent ids. */
export function removeHotspot(handle: PsvViewerHandle | null, id: string): void {
  if (!handle?.markers) return
  try { handle.markers.removeMarker(id) } catch { /* already gone */ }
  handle.markerSignatures?.delete(id)
}

/** Draws a temporary dot for tracing corners. */
export function addTracePoint(handle: PsvViewerHandle | null, id: string, pos: { yaw: number; pitch: number }): void {
  if (!handle?.markers) return
  handle.markers.addMarker({
    id,
    position: pos,
    html: '<div class="psv-hs-trace-dot"></div>',
    anchor: 'center center',
  })
}

/** Draws a temporary polygon representing the traced area. */
export function updateTracePolygon(handle: PsvViewerHandle | null, points: Array<{ yaw: number; pitch: number }>): void {
  if (!handle?.markers) return
  try { handle.markers.removeMarker('trace-poly') } catch { /* noop */ }
  
  if (points.length < 3) return

  handle.markers.addMarker({
    id: 'trace-poly',
    polyline: points,
    svgStyle: {
      fill: 'rgba(59, 130, 246, 0.3)',
      stroke: 'rgba(59, 130, 246, 0.8)',
      strokeWidth: '2px',
    },
  })
}

/** Diff-sync marker set to avoid full rebuild on every state update. */
export function syncHotspots(handle: PsvViewerHandle | null, hotspots: Hotspot[]): void {
  if (!handle?.markers) return

  const nextById = new Map<string, Hotspot>()
  for (const hs of hotspots) {
    if (!hs?.id) continue
    nextById.set(hs.id, hs)
  }

  // Remove markers that no longer exist in incoming state.
  for (const existingId of Array.from(handle.markerSignatures.keys())) {
    if (!nextById.has(existingId)) {
      removeHotspot(handle, existingId)
    }
  }

  // Add new markers and update changed markers only.
  for (const [id, hs] of nextById) {
    const nextSig = hotspotSignature(hs)
    const prevSig = handle.markerSignatures.get(id)
    if (!prevSig) {
      addHotspot(handle, hs)
      handle.markerSignatures.set(id, nextSig)
      continue
    }
    if (prevSig !== nextSig) {
      removeHotspot(handle, id)
      addHotspot(handle, hs)
      handle.markerSignatures.set(id, nextSig)
    }
  }
}

/** Destroys the viewer and releases all DOM listeners. Call in onUnmounted. */
export function destroy(handle: PsvViewerHandle | null): void {
  if (!handle?.viewer) return
  try { handle.cleanup?.() } catch { /* noop */ }
  try { handle.viewer.destroy() } catch { /* already destroyed */ }
}
