// Floor-plan minimap for the public viewer, on top of PSV's MapPlugin.
//
// VirtualTourPlugin only knows one map image, so it is told to keep its hands
// off the hotspots (nodes have map: false, see initVirtualTourViewer) and this
// module keeps the MapPlugin in step with the tour instead:
//   - on every node change: show that scene's floor, put the position pin and
//     direction cone on it (rotated by the scene's north offset), and list the
//     other scenes on that floor as clickable hotspots;
//   - a hotspot click hands the scene id back to the host, which navigates
//     through its normal scene-loading path;
//   - showFloor() lets a floor switcher browse another floor (the pin is hidden
//     there because the viewer isn't on it).

import type { PsvViewerHandle } from './psvAdapter'
import { isPlaced, pinToPixels } from '~/shared/utils/floorPlan'

const HOTSPOT_PREFIX = 'floor-scene:'
const PIN_SIZE = 35
const CONE_SIZE = 40

export interface FloorMapPin { sceneId: string; name: string; plan_x: number; plan_y: number; northOffset: number }
export interface FloorMapFloor { id: string; name: string; imageUrl: string; width: number; height: number; pins: FloorMapPin[] }

/**
 * Floors that have at least one placed scene, in floor order. Scenes are the
 * raw public-API rows (floor_plan_id / plan_x / plan_y / north_offset).
 */
export function buildFloorMapFloors(floorPlans: any[] | null | undefined, scenes: any[] | null | undefined): FloorMapFloor[] {
  if (!Array.isArray(floorPlans) || !Array.isArray(scenes)) return []
  return floorPlans
    .filter(f => f?.id && f.image_url && f.width && f.height)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map(f => ({
      id: f.id,
      name: f.name || 'Floor plan',
      imageUrl: f.image_url,
      width: f.width,
      height: f.height,
      pins: scenes
        .filter(s => s?.id && isPlaced(s) && s.floor_plan_id === f.id)
        .map((s, i) => ({
          sceneId: s.id,
          name: (s.name || '').trim() || `View ${i + 1}`,
          plan_x: s.plan_x,
          plan_y: s.plan_y,
          northOffset: Number(s.north_offset ?? 0) || 0,
        })),
    }))
    .filter(f => f.pins.length > 0)
}

/**
 * Zoom (percent) at which the whole of `floor` fits a map of `sizePx`, so the
 * other rooms' hotspots stay in view wherever the pin is.
 */
function fitZoom(floor: FloorMapFloor, sizePx: number): number {
  return (100 * sizePx * 0.9) / Math.max(floor.width, floor.height)
}

/**
 * Zoom (percent) at which the whole of `floor` fills a `width` x `height` box
 * with room left for the map's own buttons. Used for the expanded map, which
 * covers the whole viewer. (The map is static, so the plan is never drawn
 * rotated.)
 */
function fitBoxZoom(floor: FloorMapFloor, width: number, height: number): number {
  return 100 * Math.min((width * 0.9) / floor.width, (height * 0.82) / floor.height)
}

/** MapPlugin options, verified against @photo-sphere-viewer/map-plugin 5.14.1. */
export function floorMapPluginConfig(floors: FloorMapFloor[], opts: { compact: boolean }): Record<string, any> {
  const sizePx = opts.compact ? 140 : 200
  const zoom = floors[0] ? fitZoom(floors[0], sizePx) : 100
  return {
    size: `${sizePx}px`,
    // Top left belongs to the tour's branding, the right edge to the control
    // rail; PsvViewer.vue lifts it above the bottom-left CTA button.
    position: 'bottom left',
    shape: 'square',
    // Keep the plan upright; the cone turns instead.
    static: true,
    defaultZoom: zoom,
    minZoom: Math.min(20, zoom / 3),
    maxZoom: 200,
    pinSize: PIN_SIZE,
    coneSize: CONE_SIZE,
    spotStyle: {
      size: 12,
      color: '#ffffff',
      borderSize: 3,
      borderColor: '#2563eb',
      hoverSize: 16,
      hoverColor: '#2563eb',
      hoverBorderSize: 3,
      hoverBorderColor: '#ffffff',
    },
    minimizeOnHotspotClick: true,
  }
}

export interface FloorPlanMapController {
  /** Show another floor (floor switcher). */
  showFloor: (floorId: string) => void
  setVisible: (visible: boolean) => void
  destroy: () => void
}

export function attachFloorPlanMap(
  handle: PsvViewerHandle,
  floors: FloorMapFloor[],
  opts: {
    compact: boolean
    onSelectScene: (sceneId: string) => void
    onFloorShown?: (floorId: string) => void
    onViewChanged?: (view: 'closed' | 'normal' | 'maximized') => void
  },
): FloorPlanMapController | null {
  const viewer = handle.viewer
  const map: any = viewer?.getPlugin?.('map')
  const vt: any = viewer?.getPlugin?.('virtual-tour')
  if (!map || !vt || !floors.length) return null

  const sizePx = opts.compact ? 140 : 200
  const floorOfScene = new Map<string, FloorMapFloor>()
  for (const f of floors) for (const p of f.pins) floorOfScene.set(p.sceneId, f)

  let shownFloorId: string | null = null
  let currentSceneId: string | null = null
  let maximized = false

  // The expanded map fills the viewer, so the minimap's zoom leaves the plan a
  // postage stamp in the middle: fit it to the screen instead, centred.
  function fitMaximized(floor: FloorMapFloor) {
    // Measure what the map grows into (100% of its parent), not the map: it
    // animates open over 0.3s, so right now it is still minimap-sized.
    const el: HTMLElement | undefined = map.component?.container?.parentElement ?? viewer.container
    const rect = el?.getBoundingClientRect?.()
    if (!rect?.width || !rect?.height) return
    map.setCenter({ x: floor.width / 2, y: floor.height / 2 })
    map.setZoom(fitBoxZoom(floor, rect.width, rect.height))
  }

  function fit(floor: FloorMapFloor) {
    if (maximized) fitMaximized(floor)
    else map.setZoom(fitZoom(floor, sizePx))
  }

  function shownFloor(): FloorMapFloor | undefined {
    return floors.find(f => f.id === shownFloorId)
  }

  function show(floor: FloorMapFloor) {
    const pin = floor.pins.find(p => p.sceneId === currentSceneId)
    const center = pin ? pinToPixels(pin, floor) : { x: floor.width / 2, y: floor.height / 2 }
    // Numbers are radians to PSV — pass degrees as a string.
    const rotation = `${pin?.northOffset ?? 0}deg`
    // Only draw "you are here" on the floor the viewer is actually on.
    map.setOptions({ pinSize: pin ? PIN_SIZE : 0, coneSize: pin ? CONE_SIZE : 0 })
    if (floor.id !== shownFloorId) {
      map.setImage(floor.imageUrl, center, rotation)
      fit(floor)
    } else {
      map.setOptions({ rotation })
      if (maximized) fitMaximized(floor)
      else map.setCenter(center)
    }
    map.setHotspots(
      floor.pins
        .filter(p => p.sceneId !== currentSceneId)
        .map(p => ({ id: HOTSPOT_PREFIX + p.sceneId, ...pinToPixels(p, floor), tooltip: p.name })),
    )
    shownFloorId = floor.id
    opts.onFloorShown?.(floor.id)
  }

  function onScene(sceneId: string | null | undefined) {
    if (!sceneId) return
    currentSceneId = sceneId
    // A scene that isn't on any plan keeps the floor in view, without a pin.
    const floor = floorOfScene.get(sceneId) ?? floors.find(f => f.id === shownFloorId) ?? floors[0]
    safely(() => show(floor))
  }

  // Runs inside the tour's own events — a minimap error must not escape.
  function safely(fn: () => void) {
    try { fn() } catch (err) { console.warn('[Viewora] Floor-plan minimap update failed', err) }
  }

  // MapPlugin 5.14.1 forgets its hotspot hit-areas on every camera move and
  // rebuilds them on the next frame, so while the view keeps moving (autorotate,
  // phone motion, the swipe hint) a tap on a hotspot finds nothing. With a
  // static map the hotspots don't depend on the camera, so redraw without
  // clearing them. Guarded: no-op if the internals differ.
  const pluginHandleEvent = map.handleEvent
  if (typeof pluginHandleEvent === 'function' && typeof map.component?.update === 'function') {
    map.handleEvent = (e: any) => {
      if (e?.type === 'position-updated') map.component.update(false)
      else pluginHandleEvent.call(map, e)
    }
  }

  const onNodeChanged = (e: any) => onScene(e?.node?.id)
  const onSelectHotspot = (e: any) => {
    const id = String(e?.hotspotId ?? '')
    if (id.startsWith(HOTSPOT_PREFIX)) opts.onSelectScene(id.slice(HOTSPOT_PREFIX.length))
  }
  const onViewChanged = (e: any) => {
    const view = e?.view
    const wasMaximized = maximized
    maximized = view === 'maximized'
    const floor = shownFloor()
    if (floor && maximized !== wasMaximized) {
      safely(() => {
        if (maximized) fitMaximized(floor)
        else { fit(floor); show(floor) } // back to the minimap's zoom, centred on the pin
      })
    }
    opts.onViewChanged?.(view)
  }
  const onResize = () => {
    const floor = shownFloor()
    if (maximized && floor) safely(() => fitMaximized(floor))
  }

  vt.addEventListener('node-changed', onNodeChanged)
  map.addEventListener('select-hotspot', onSelectHotspot)
  map.addEventListener('view-changed', onViewChanged)
  window.addEventListener('resize', onResize)
  onScene(vt.getCurrentNode?.()?.id)

  return {
    showFloor(floorId: string) {
      const floor = floors.find(f => f.id === floorId)
      if (floor) safely(() => show(floor))
    },
    setVisible(visible: boolean) {
      safely(() => { if (visible) map.show(); else map.hide() })
    },
    destroy() {
      if (map.handleEvent !== pluginHandleEvent) map.handleEvent = pluginHandleEvent
      vt.removeEventListener('node-changed', onNodeChanged)
      map.removeEventListener('select-hotspot', onSelectHotspot)
      map.removeEventListener('view-changed', onViewChanged)
      window.removeEventListener('resize', onResize)
    },
  }
}
