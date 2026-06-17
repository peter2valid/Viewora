import { Viewer } from '@photo-sphere-viewer/core'
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin'
import { SettingsPlugin } from '@photo-sphere-viewer/settings-plugin'
import { StereoPlugin } from '@photo-sphere-viewer/stereo-plugin'
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin'
import { EquirectangularTilesAdapter } from '@photo-sphere-viewer/equirectangular-tiles-adapter'
import {
  KtxEquirectangularTilesAdapter,
  initKtx2Loader,
  detectKtx2GpuSupport,
} from './KtxEquirectangularTilesAdapter'
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
  markerRoundingObserver?: { disconnect: () => void }
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
  }

  const connection = nav.connection || nav.mozConnection || nav.webkitConnection
  const saveData = !!connection?.saveData
  const effectiveType = connection?.effectiveType || ''
  const slowConnection =
    effectiveType === 'slow-2g' || effectiveType === '2g' ||
    (typeof connection?.downlink === 'number' && connection.downlink < 1.2)

  // Only data-saver mode or a genuinely unusable connection gets lite tiles.
  // Hardware (RAM, cores, GPU) is no longer a factor — full tiles load
  // progressively so even slow devices see something immediately.
  if (saveData || slowConnection) return 'lite'

  return 'full'
}


// ── Tile fetch throttle ───────────────────────────────────────────────────────
// Without throttling, all 32 tile fetches complete at roughly the same time
// and PSV uploads them all to the GPU in one frame — viewer freezes and the
// image flashes from blur to sharp all at once.
// 8 concurrent tile fetches — matches PSV v5.13.2 maintainer default (#1605)
// Original value was 4; raised after confirming safety for 32 × 4096×2048 medium tiles
let _tileThrottleInstalled = false

function installTileFetchThrottle(): void {
  if (_tileThrottleInstalled || typeof window === 'undefined') return
  _tileThrottleInstalled = true
  const orig = window.fetch.bind(window)
  let active = 0
  const queue: Array<() => void> = []
  function next() {
    while (active < 8 && queue.length > 0) { active++; queue.shift()!() }
  }
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    if (!/\/tiles(?:_medium(?:_ktx2)?)?\/\d+_\d+\.(?:webp|ktx2)/.test(url)) return orig(input, init)
    return new Promise<Response>((resolve, reject) => {
      queue.push(() => orig(input, init)
        .then(r  => { active--; next(); resolve(r) })
        .catch(e => { active--; next(); reject(e) }))
      next()
    })
  }) as typeof fetch
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

// ── Tile prefetcher ───────────────────────────────────────────────────────
// Warms the browser cache for a scene's tiles before the user navigates to it.
// Uses low-priority fetch so it never competes with the active scene's rendering.
// Only one prefetch runs at a time — a new call cancels the previous one.
let _prefetchController: AbortController | null = null

export function prefetchSceneTiles(scene: TourScene, performanceMode: 'lite' | 'full'): void {
  if (typeof window === 'undefined') return
  if (!scene.tilesReady) return

  const useMedium = performanceMode === 'lite' && canUseMediumTiles(scene)
  const manifest  = useMedium ? scene.tileMediumManifestUrl : scene.tileManifestUrl
  const cols      = useMedium ? scene.tileMediumCols! : scene.tileCols!
  const rows      = useMedium ? scene.tileMediumRows! : scene.tileRows!
  if (!manifest || !cols || !rows) return

  // Cancel any in-flight prefetch so we don't pile up requests
  _prefetchController?.abort()
  _prefetchController = new AbortController()
  const signal = _prefetchController.signal

  // Build tile order: centre-out spiral so the most visible tiles load first.
  // The equirectangular centre (col≈cols/2, row≈rows/2) maps to the viewer's
  // default forward-facing position, which is what the user sees on entry.
  const midC = Math.floor(cols / 2)
  const midR = Math.floor(rows / 2)
  const order: Array<[number, number]> = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      order.push([c, r])
    }
  }
  order.sort(([c1, r1], [c2, r2]) =>
    (Math.abs(c1 - midC) + Math.abs(r1 - midR)) -
    (Math.abs(c2 - midC) + Math.abs(r2 - midR))
  )

  // Fire requests sequentially so we don't flood the connection
  ;(async () => {
    for (const [col, row] of order) {
      if (signal.aborted) break
      const url = `${manifest}/${col}_${row}.webp`
      try {
        await fetch(url, { signal, priority: 'low' as any, credentials: 'omit' })
      } catch {
        // abort or network error — stop quietly
        break
      }
    }
  })()
}

// ── Marker pixel-rounding ─────────────────────────────────────────────────────
// PSV MarkersPlugin updates each marker's CSS transform on every render frame
// with raw floating-point values (e.g. translate3d(234.7px, 189.3px, 0px)).
// During autorotate these values oscillate by sub-pixel amounts per frame,
// which the browser renders as a high-frequency "shiver" on the marker elements.
// Rounding x/y to whole integers before the browser paints eliminates the jitter.

// Runs every RAF *after* PSV has set marker transforms for the frame.
// Rounds any fractional px values to whole integers, eliminating sub-pixel
// oscillation regardless of which translate format PSV uses.
function installMarkerRounding(container: HTMLElement): { disconnect: () => void } {
  let active = true
  let rafId = 0

  function tick() {
    const markers = container.querySelectorAll<HTMLElement>('.psv-marker')
    for (let i = 0; i < markers.length; i++) {
      const el = markers[i]
      // PSV v5 uses the CSS individual 'translate' property, not style.transform
      const t = el.style.translate
      if (t && t.includes('.')) {
        const rounded = t.replace(/(-?[\d]+\.[\d]+)px/g, (_, n) => `${Math.round(parseFloat(n))}px`)
        if (rounded !== t) el.style.translate = rounded
      }
    }
    if (active) rafId = requestAnimationFrame(tick)
  }

  rafId = requestAnimationFrame(tick)
  return { disconnect: () => { active = false; cancelAnimationFrame(rafId) } }
}

// ─── Plain-DOM Hotspot Builders (no Shadow DOM / no Custom Elements) ────────
// These create standard divs that PSV MarkersPlugin handles reliably
// across all browsers without any WebComponent registration fragility.

function buildNavMarkerEl(hotspot: Hotspot): HTMLElement {
  const label = esc(hotspot.label || 'Move to next scene')
  const scale = Number(hotspot.scale || 1)
  const wrap = document.createElement('div')
  wrap.className = 'vhs-nav'
  wrap.setAttribute('data-vhs-type', 'scene_link')
  wrap.setAttribute('data-vhs-id', hotspot.id)
  // Combine floor-perspective tilt with any per-hotspot scale
  const scaleStr = scale !== 1 ? ` scale(${scale})` : ''
  wrap.style.transform = `perspective(120px) rotateX(52deg)${scaleStr}`
  wrap.style.transformOrigin = 'center bottom'
  wrap.innerHTML = `
    <svg class="vhs-nav__floor-arrow" viewBox="0 0 72 40" fill="none" aria-label="${label}" role="img">
      <path d="M8 34 L36 6 L64 34" stroke="rgba(0,0,0,0.35)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8 34 L36 6 L64 34" stroke="rgba(255,255,255,0.95)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
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
  const labelColor = hotspot.labelColor || '#ffffff'
  const labelFontWeight = hotspot.labelBold ? '800' : '600'

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

  const labelShadow = labelColor === '#000000'
    ? '0 1px 4px rgba(255,255,255,0.5)'
    : '0 1px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)'

  wrap.innerHTML = `
    <div class="vhs-info__trigger">
      <div class="vhs-info__pin-ring" style="--vhs-color:${meta.color}"></div>
      ${iconUrl
        ? `<img class="vhs-info__trigger-icon" src="${iconUrl}" alt="" draggable="false" />`
        : `<div class="vhs-info__pin-dot" style="background:${meta.color}"></div>`
      }
    </div>
    <span class="vhs-info__hover-label" style="color:${labelColor};font-weight:${labelFontWeight};text-shadow:${labelShadow}">${label}</span>
    <div class="vhs-info__card">
      ${imageUrl ? `<div class="vhs-info__img" style="background-image:url('${imageUrl}')"></div>` : ''}
      <div class="vhs-info__body">
        <div class="vhs-info__header">
          ${iconUrl ? `<img class="vhs-info__icon" src="${iconUrl}" alt="" />` : ''}
          <span class="vhs-info__tag" style="color:${meta.color}">${meta.tag}</span>
        </div>
        <p class="vhs-info__title" style="font-weight:${labelFontWeight}">${label}</p>
        ${desc ? `<p class="vhs-info__desc">${desc}</p>` : ''}
        ${url ? `<a class="vhs-info__link" href="${url}" target="_blank" rel="noopener noreferrer" style="color:${meta.color}">Open link ↗</a>` : ''}
      </div>
    </div>
  `

  // Prevent touches/clicks on the card body from reaching PSV's event system.
  // PSV uses mousedown/touchstart on its container to detect "did the user press
  // here?" — if the card receives those events first and we stop propagation, PSV
  // never marks a press as started, so it never fires a ClickEvent or
  // select-marker for card interactions. This keeps the card visible while the
  // user reads it; only clicking the trigger pin or the panorama background
  // (outside the marker) dismisses the card.
  // Stop native 'click' from bubbling out of the marker on mouse devices.
  // PSV calls preventDefault() on touchend which suppresses the synthetic click on
  // touch — so this is only needed for mouse. Without it, every mouse click on the
  // marker (trigger or card) bubbles to the root @click handler and dismisses the card.
  wrap.addEventListener('click', (e: Event) => e.stopPropagation())

  const card = wrap.querySelector('.vhs-info__card') as HTMLElement | null
  if (card) {
    const stop = (e: Event) => e.stopPropagation()
    card.addEventListener('mousedown', stop)
    card.addEventListener('touchstart', stop, { passive: true })
  }

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
function buildPanorama(scene: TourScene, performanceMode: 'lite' | 'full' = 'full', useKtx2 = false) {
  // Priority 1a: KTX2 medium tiles — GPU-compressed upload, stays compressed in VRAM.
  // Only used when GPU supports compressed textures AND KTX2 tiles were generated.
  if (useKtx2 && scene.tileMediumKtx2ManifestUrl && canUseMediumTiles(scene)) {
    return {
      width:   4096,
      cols:    scene.tileMediumCols!,
      rows:    scene.tileMediumRows!,
      baseUrl: scene.imageUrl,
      tileUrl: (col: number, row: number) =>
        `${scene.tileMediumKtx2ManifestUrl}/${col}_${row}.ktx2`,
    }
  }

  // Priority 1b: WebP medium tiles — the correct choice for ALL devices regardless of
  // hardware class. Even flagship phones bottleneck on GPU VRAM and draw calls,
  // not pixel count. 32 tiles at 4096×2048 gives 2× thumbnail quality with no
  // freeze risk. Full-res tiles (288+) are never served — GPU floods on all devices.
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

  // Priority 2: legacy full tiles — only reached for old scenes processed before
  // the medium tile pipeline existed. These scenes have no medium tiles yet.
  // Only served in full mode (desktop); phones stay on thumbnail to avoid
  // the 288-tile GPU flood risk on older scene data.
  if (performanceMode === 'full' && canUseTiledPanorama(scene)) {
    return {
      width:   scene.width || 12288,
      cols:    scene.tileCols!,
      rows:    scene.tileRows!,
      baseUrl: scene.imageUrl,
      tileUrl: (col: number, row: number) =>
        `${scene.tileManifestUrl}/${col}_${row}.webp`,
    }
  }

  // Priority 3: thumbnail only — scene not yet processed, or phone with no
  // medium tiles. Instant render, no bandwidth waste.
  return {
    width:   2048,
    cols:    1,
    rows:    1,
    baseUrl: scene.imageUrl,
    tileUrl: () => scene.imageUrl,
  }
}

// PSV_FIX_1524: canvas pixel-read stall on Firefox strict mode — covered by PSV v5.11.5.
// Viewora does not read canvas pixels in the loading pipeline; captureScreenshot() calls
// canvas.toDataURL() only on explicit user action, not during viewer init or tile loading.
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

  installTileFetchThrottle()
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
    adapter: [EquirectangularTilesAdapter, { resolution: 64, baseBlur: false, antialias: false }] as any,
    panorama: buildPanorama(scene),
    defaultYaw: scene.settings.yaw_default,
    defaultPitch: scene.settings.pitch_default,
    defaultZoomLvl: 0,
    loadingTxt: 'Loading...',
    loadingImg,
    navbar: false,
    touchmoveTwoFingers: false,
    fisheye: false,
    plugins,
    rendererParameters: {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
      precision: 'highp',
    },
    moveInertia: 0.6,
  })

  // Cap at 2× for all devices — matches native Retina resolution without
  // the 4× pixel count of 3× DPR screens. Previous 1.5 cap caused visible
  // softness on Retina laptops (2× DPR rendered at only 75% of native).
  viewer.renderer.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Warn if device MAX_TEXTURE_SIZE < 4096 — medium tiles would render black.
  // 99% of devices support 4096 but rare low-end Android GPUs may not.
  const gl = viewer.renderer.renderer.getContext()
  const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  if (maxTexSize < 4096) {
    console.warn(`[Viewora] MAX_TEXTURE_SIZE=${maxTexSize} — medium tiles (4096px) may render black on this device`)
  }

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

  const markerRoundingObserver = installMarkerRounding(container)

  return {
    viewer,
    markers,
    markerSignatures: new Map<string, string>(),
    isEditing,
    markerRoundingObserver,
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
      zoom: 0,
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

      const markerSize = isNav ? { width: 72, height: 40 } : { width: 40, height: 40 }
      handle.markers.addMarker({
        id: hotspot.id,
        position: { yaw: hotspot.yaw, pitch: hotspot.pitch },
        element: el,
        size: markerSize,
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
  try { handle.markerRoundingObserver?.disconnect() } catch { /* noop */ }
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
  useKtx2 = false,
): any[] {
  const nodes = scenes.map(scene => {
    const hotspots = hotspotsByScene[scene.id] ?? []

    // Deduplicate scene_link targets — VT Plugin uses these for its 3D floor arrows.
    const uniqueLinksMap = new Map<string, any>()
    hotspots.forEach(h => {
      if (h.type === 'scene_link' && h.targetSceneId) {
        if (!uniqueLinksMap.has(h.targetSceneId)) {
          const targetScene = scenes.find(s => s.id === h.targetSceneId)
          uniqueLinksMap.set(h.targetSceneId, {
            nodeId: h.targetSceneId,
            label: targetScene?.title || 'Next Scene',
            position: { yaw: h.yaw, pitch: -1.3 }, // Forced to floor level (≈-75°) for painted-on-floor look
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
        const hMarkerSize = isNav ? { width: 72, height: 40 } : { width: 40, height: 40 }
        return {
          id: h.id,
          position: { yaw: h.yaw, pitch: h.pitch },
          element: el,
          size: hMarkerSize,
          anchor: 'center center',
          hoverScale: isNav ? Number(h.hoverScale || 1.3) : 1,
          data: { type: h.type, targetSceneId: h.targetSceneId, url: h.url },
        }
      })

    return {
      id: scene.id,
      panorama: buildPanorama(scene, performanceMode, useKtx2),
      name: scene.title,
      thumbnail: scene.imageUrl,
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
            position: { yaw: 0, pitch: -1.3 },
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
  onBackgroundClick?: () => void
  onAutorotateChange?: (enabled: boolean) => void
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
    onBackgroundClick,
    onAutorotateChange,
    autoRotate,
    performanceMode = 'auto',
    loadingImg = '/images/viewora-logo.png',
  } = options

  installTileFetchThrottle()
  const startScene = scenes.find(s => s.id === startNodeId) || scenes[0]
  if (!startScene) throw new Error('No scenes to display')

  const resolvedPerformanceMode = performanceMode === 'auto' ? detectViewerPerformanceMode() : performanceMode
  const isLiteMode = resolvedPerformanceMode === 'lite'

  const ktx2Available = detectKtx2GpuSupport() && scenes.some(s => !!s.tileMediumKtx2ManifestUrl)
  if (ktx2Available) {
    console.debug('[Viewora] KTX2 tiles available and GPU support detected — using compressed path')
  }

  const nodes = buildTourNodes(scenes, hotspotsByScene, resolvedPerformanceMode, ktx2Available)

  // Plugin order matters — VirtualTour must be last (depends on MarkersPlugin)
  const plugins: any[] = [
    [MarkersPlugin, { clickEventOnMarker: false }],
  ]

  plugins.push([AutorotatePlugin, {
    autorotateSpeed: '0.5rpm',
    autorotatePitch: 0,
    autostartDelay: 8000,
    autostartOnIdle: true,
  }])

  // GyroscopePlugin MUST be registered for StereoPlugin (VR mode) to work,
  // even on devices without a physical gyroscope (like desktops).
  // We keep it disabled by default; the UI controls whether it starts.
  plugins.push([GyroscopePlugin, { touchmove: false }])
  plugins.push([StereoPlugin])

  // Small tours (≤6 scenes) benefit from preload:true — panorama configs are pre-built
  // so navigation has zero setup overhead. Larger tours skip this to avoid a slow
  // initial load while all nodes are initialised simultaneously.
  const usePreload = scenes.length <= 6

  // On lite mode or low-DPR devices, skip the fade — compositing two WebGL frames at
  // different opacities doubles GPU work and causes jitter on budget phones.
  // Full mode and higher-end devices keep the fade for a polished aesthetic.
  const useFade = !isLiteMode && window.devicePixelRatio >= 2

  // VirtualTourPlugin must be added last — it depends on MarkersPlugin being registered
  plugins.push([VirtualTourPlugin, {
    dataMode: 'client',
    positionMode: 'manual',
    renderMode: '3d',
    nodes,
    startNodeId,
    preload: usePreload,
    transitionOptions: {
      showLoader: true,
      speed: '2rpm',
      effect: 'fade',
      // rotation: false — do NOT pan the camera to the floor arrow before transitioning.
      // With rotation:true, PSV rotated down to pitch=-0.8 (the link position) before the
      // fade, making it look like the camera dove at the floor. The smart entry direction
      // feature already handles the correct orientation after arrival.
      rotation: false,
      transition: { speed: 600, effect: 'fade', rotation: false },
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

  const adapterClass = ktx2Available ? KtxEquirectangularTilesAdapter : EquirectangularTilesAdapter
  const viewer: any = new Viewer({
    container,
    adapter: [adapterClass, { resolution: 64, baseBlur: false, antialias: false }] as any,
    defaultYaw: startScene.settings.yaw_default,
    defaultPitch: startScene.settings.pitch_default,
    defaultZoomLvl: 0,
    loadingTxt: 'Loading...',
    loadingImg,
    navbar: false,
    touchmoveTwoFingers: false,
    fisheye: false,
    // 1.5× speed makes a full 360° orbit achievable in ~2.5 finger-swipes on mobile.
    moveSpeed: 1.5,
    // Reduced to 0.6 per RC-3 (was 0.72)
    moveInertia: 0.6,
    plugins,
    rendererParameters: {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
      precision: 'highp',
    },
  })

  // Cap at 2× for all devices — matches native Retina resolution without
  // the 4× pixel count of 3× DPR screens.
  viewer.renderer.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Warn if device MAX_TEXTURE_SIZE < 4096 — medium tiles would render black.
  const gl = viewer.renderer.renderer.getContext()
  const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  if (maxTexSize < 4096) {
    console.warn(`[Viewora] MAX_TEXTURE_SIZE=${maxTexSize} — medium tiles (4096px) may render black on this device`)
  }

  if (ktx2Available) {
    initKtx2Loader(viewer.renderer.renderer)
  }

  const markers: any = viewer.getPlugin(MarkersPlugin)
  const virtualTour: any = viewer.getPlugin(VirtualTourPlugin)

  const cleanupFns: Array<() => void> = []

  viewer.addEventListener('ready', () => {
    onReady?.()

    // ── Smart Focus on Load ────────────────────────────────────────────────
    // Automatically point the camera at the first valid hotspot (nav or info)
    // so the user immediately sees interactive content.
    const firstNode = nodes[0]
    const firstHotspots = firstNode?.markers || []
    if (firstHotspots.length > 0) {
      // Prioritize navigation or info hotspots over others
      const targetHs = firstHotspots.find((h: any) => h.data?.type === 'scene_link' || h.data?.type === 'info') 
        || firstHotspots[0]

      if (targetHs && targetHs.position) {
        // Delay until tiles have had time to upload to GPU — reduces jitter from
        // camera animation competing with texture uploads on scene entry.
        setTimeout(() => {
          try {
            viewer.animate({
              yaw: targetHs.position.yaw,
              pitch: targetHs.position.pitch ?? 0,
              speed: '2rpm'
            }).catch(() => {})
          } catch { /* noop */ }
        }, 800)
      }
    }

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

  const handleNodeChanged = (e: any) => {
    onNodeChanged?.(e.node.id)

    // Prefetch tiles for all scenes reachable from the new node so the next
    // navigation feels instant. We schedule this after a short delay so the
    // current scene's own tile loading settles first.
    setTimeout(() => {
      const currentScene = scenes.find(s => s.id === e.node.id)
      if (!currentScene) return
      const hotspots = hotspotsByScene[currentScene.id] ?? []
      const linkedIds = [...new Set(
        hotspots
          .filter(h => h.type === 'scene_link' && h.targetSceneId)
          .map(h => h.targetSceneId!)
      )]
      for (const id of linkedIds) {
        const target = scenes.find(s => s.id === id)
        if (target) {
          // Preload thumbnail into browser memory so GPU upload is instant when
          // the fade transition completes and PSV needs the texture.
          const img = new Image()
          img.src = target.imageUrl
          prefetchSceneTiles(target, resolvedPerformanceMode)
        }
      }
    }, 1500)
  }
  virtualTour.addEventListener('node-changed', handleNodeChanged)
  cleanupFns.push(() => virtualTour.removeEventListener('node-changed', handleNodeChanged))

  // Attach pointerenter (desktop) + touchstart (mobile) to nav hotspot elements
  // for an earlier prefetch trigger — fires as soon as the user moves toward or
  // touches a hotspot, giving a head start before the click/tap is confirmed.
  const attachHotspotPrefetch = (node: any) => {
    for (const marker of (node.markers || [])) {
      const el: HTMLElement | undefined = marker.element
      if (!el || marker.data?.type !== 'scene_link') continue
      const targetId = marker.data?.targetSceneId
      const target = targetId ? scenes.find(s => s.id === targetId) : null
      if (!target) continue
      const prefetch = () => {
        // Decode thumbnail into browser memory immediately on hover/touch so
        // the GPU upload is instant when the fade transition completes.
        const img = new Image()
        img.src = target.imageUrl
        prefetchSceneTiles(target, resolvedPerformanceMode)
      }
      el.addEventListener('pointerenter', prefetch, { passive: true })
      el.addEventListener('touchstart',   prefetch, { passive: true })
    }
  }

  // Also attach to VirtualTourPlugin's native floor arrow links (.psv-virtual-tour-link).
  // PSV stores the link data on the element as element.tourLink = { nodeId, ... }.
  // These arrows render after node-changed so we query the DOM after a short delay.
  const attachArrowPrefetch = () => {
    const container = viewer.container as HTMLElement
    container.querySelectorAll<HTMLElement>('.psv-virtual-tour-link').forEach(el => {
      if ((el as any).__prefetchAttached) return
      ;(el as any).__prefetchAttached = true
      const nodeId: string | undefined = (el as any).tourLink?.nodeId
      const target = nodeId ? scenes.find(s => s.id === nodeId) : null
      if (!target) return
      const prefetch = () => prefetchSceneTiles(target, resolvedPerformanceMode)
      el.addEventListener('pointerenter', prefetch, { passive: true })
      el.addEventListener('touchstart',   prefetch, { passive: true })
    })
  }

  // Wire up the initial node and each subsequent node as the user navigates
  if (nodes[0]) attachHotspotPrefetch(nodes[0])
  virtualTour.addEventListener('node-changed', (e: any) => {
    const node = nodes.find((n: any) => n.id === e.node.id)
    if (node) attachHotspotPrefetch(node)
    // Arrow links render slightly after node-changed fires
    setTimeout(attachArrowPrefetch, 300)
  })
  // Also wire up arrows on initial load
  viewer.addEventListener('ready', () => setTimeout(attachArrowPrefetch, 300), { once: true })

  const handleMarkerSelect = (e: any) => {
    // Read type from data attribute (plain-DOM builders) or fallback to marker.data
    const el: HTMLElement | null = e.marker?.element?.querySelector?.('[data-vhs-type]') || null
    const type = el?.getAttribute('data-vhs-type') || e.marker?.config?.data?.type || 'info'
    const url = el?.getAttribute('data-vhs-url') || e.marker?.config?.data?.url || ''
    onMarkerClick?.(e.marker.id, type, url)
  }
  markers.addEventListener('select-marker', handleMarkerSelect)
  cleanupFns.push(() => markers.removeEventListener('select-marker', handleMarkerSelect))

  // PSV fires its internal 'click' event only for background clicks (not marker clicks,
  // since clickEventOnMarker:false causes PSV to stopImmediatePropagation on marker hits).
  // This is the correct hook for dismissing the info card on canvas background clicks.
  if (onBackgroundClick) {
    const handleBgClick = () => onBackgroundClick()
    viewer.addEventListener('click', handleBgClick)
    cleanupFns.push(() => viewer.removeEventListener('click', handleBgClick))
  }

  const markerRoundingObserver = installMarkerRounding(container)

  return {
    viewer,
    markers,
    markerSignatures: new Map(),
    isEditing: false,
    markerRoundingObserver,
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
