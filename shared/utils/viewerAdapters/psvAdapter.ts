// PSV Adapter — isolates Photo Sphere Viewer from all business logic.
// Uses dynamic imports so PSV is never loaded during SSR (DOM required).

import type { TourScene } from '~/domain/scene'
import type { Hotspot } from '~/domain/hotspot'

// Internal viewer and plugin instances typed as `any` — the Viewer class
// has protected internal methods (init, __setSize) that cause TS assignment
// errors when using the named import type. The adapter is the sole consumer
// of these handles, so typing them strictly here adds no safety benefit.
export interface PsvViewerHandle {
  viewer: any
  markers: any
  /** Hotspot signature cache for diff-sync updates */
  markerSignatures: Map<string, string>
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
  ].join('|')
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
): Promise<PsvViewerHandle> {
  const [{ Viewer }, { MarkersPlugin }] = await Promise.all([
    import('@photo-sphere-viewer/core'),
    import('@photo-sphere-viewer/markers-plugin'),
  ])

  // Cast to any: Viewer's protected methods (init, __setSize) prevent direct type
  // assignment, and getPlugin's generic constraint doesn't accept PluginConstructor
  // for dynamically-imported classes. The handle is any-typed by design.
  const viewer: any = new Viewer({
    container,
    panorama: scene.imageUrl,
    defaultYaw: scene.settings.yaw_default,
    defaultPitch: scene.settings.pitch_default,
    navbar: false,
    // Mobile UX: allow single-finger navigation for better accessibility.
    touchmoveTwoFingers: false,
    plugins: [[MarkersPlugin, {}]],
  })

  const markers: any = viewer.getPlugin(MarkersPlugin)

  // PSV v5: 'ready' fires once the first panorama has loaded
  viewer.addEventListener('ready', () => onReady?.(), { once: true })

  // PSV v5: 'panorama-error' fires when a panorama fails to load
  viewer.addEventListener('panorama-error', (e: any) => {
    const err = e.error instanceof Error ? e.error : new Error('Panorama load failed')
    onError?.(err)
  })

  // WebGL context loss can happen on some GPUs / drivers.
  // We listen on the underlying canvas element (when available) and surface an actionable error.
  const cleanupFns: Array<() => void> = []
  const bindWebglContextHandlers = () => {
    try {
      const canvas = container.querySelector('canvas')
      if (!canvas) return
      const onLost = (ev: Event) => {
        ev.preventDefault?.()
        onError?.(new Error('WebGL context lost. Try reloading the page or using a smaller panorama.'))
      }
      const onRestored = () => {
        // PSV should recover internally; if it doesn’t, the UI error message guides the user.
      }
      canvas.addEventListener('webglcontextlost', onLost, false)
      canvas.addEventListener('webglcontextrestored', onRestored, false)
      cleanupFns.push(() => {
        canvas.removeEventListener('webglcontextlost', onLost, false)
        canvas.removeEventListener('webglcontextrestored', onRestored, false)
      })
    } catch {
      // ignore
    }
  }
  // Try immediately and also after ready (canvas can be created lazily).
  bindWebglContextHandlers()
  viewer.addEventListener('ready', () => bindWebglContextHandlers(), { once: true })

  // Viewer click — used in editor mode to place hotspots
  viewer.addEventListener('click', (e: any) => {
    if (e.data?.rightclick) return
    onClick?.({ yaw: e.data.yaw, pitch: e.data.pitch })
  })

  // Marker click
  markers.addEventListener('select-marker', (e: any) => {
    onMarkerClick?.(e.marker.id)
  })

  return {
    viewer,
    markers,
    markerSignatures: new Map<string, string>(),
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
  await handle.viewer.setPanorama(scene.imageUrl, {
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
 * This forces a “no-op” micro-animate to trigger a render, if supported.
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
  } catch {
    // ignore
  }
}

/** Adds a single hotspot marker. */
export function addHotspot(handle: PsvViewerHandle | null, hotspot: Hotspot): void {
  if (!handle?.markers) return
  // Use tooltip.content as plain text (not HTML) to prevent stored XSS via hotspot labels.
  // PSV treats { content } as a plain-text tooltip; the string-form `tooltip` is rendered as HTML.
  const tooltipConfig = hotspot.label
    ? { content: hotspot.label, className: 'psv-tooltip--plain' }
    : undefined
  handle.markers.addMarker({
    id: hotspot.id,
    position: { yaw: hotspot.yaw, pitch: hotspot.pitch },
    tooltip: tooltipConfig,
    className: `psv-hs psv-hs--${hotspot.type}`,
    html: '<div class="psv-hotspot-pin"></div>',
  })
}

/** Removes a marker by id. Safe to call for non-existent ids. */
export function removeHotspot(handle: PsvViewerHandle | null, id: string): void {
  if (!handle?.markers) return
  try { handle.markers.removeMarker(id) } catch { /* already gone */ }
  handle.markerSignatures?.delete(id)
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
