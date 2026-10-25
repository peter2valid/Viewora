export interface HotspotIconDef {
  key: string
  label: string
  group: 'info' | 'video' | 'camera' | 'star' | 'nav'
  url: string
  /** Kept so saved hotspots still resolve, but no longer offered in the pickers. */
  legacy?: boolean
}

export const HOTSPOT_ICON_DEFS: HotspotIconDef[] = [
  // ── Info ──────────────────────────────────────────────────
  { key: 'info-outline',       label: 'Info Outline',    group: 'info',   url: '/hotspot-icons/info-outline.png' },
  { key: 'info-solid',         label: 'Info Solid',      group: 'info',   url: '/hotspot-icons/info-solid.png' },
  { key: 'info-bubble-outline',label: 'Info Bubble',     group: 'info',   url: '/hotspot-icons/info-bubble-outline.png' },
  { key: 'info-3d-light',      label: 'Info 3D Light',   group: 'info',   url: '/hotspot-icons/info-3d-light.png' },
  { key: 'info-3d-grey',       label: 'Info 3D Grey',    group: 'info',   url: '/hotspot-icons/info-3d-grey.png' },
  { key: 'info-bubble-3d',     label: 'Bubble 3D',       group: 'info',   url: '/hotspot-icons/info-bubble-3d.png' },

  // ── Video ─────────────────────────────────────────────────
  { key: 'video-solid',        label: 'Video Solid',     group: 'video',  url: '/hotspot-icons/video-solid.png' },
  { key: 'video-outline',      label: 'Video Outline',   group: 'video',  url: '/hotspot-icons/video-outline.png' },
  { key: 'video-3d-grey',      label: 'Video 3D Grey',   group: 'video',  url: '/hotspot-icons/video-3d-grey.png' },
  { key: 'video-3d-light',     label: 'Video 3D Light',  group: 'video',  url: '/hotspot-icons/video-3d-light.png' },

  // ── Camera ────────────────────────────────────────────────
  { key: 'camera-solid',       label: 'Camera Solid',    group: 'camera', url: '/hotspot-icons/camera-solid.png' },
  { key: 'camera-outline',     label: 'Camera Outline',  group: 'camera', url: '/hotspot-icons/camera-outline.png' },
  { key: 'camera-3d-grey',     label: 'Camera 3D Grey',  group: 'camera', url: '/hotspot-icons/camera-3d-grey.png' },
  { key: 'camera-3d-light',    label: 'Camera 3D Light', group: 'camera', url: '/hotspot-icons/camera-3d-light.png' },

  // ── Stars ─────────────────────────────────────────────────
  { key: 'star-red',           label: 'Star Red',        group: 'star',   url: '/hotspot-icons/star-red.png' },
  { key: 'star-yellow',        label: 'Star Yellow',     group: 'star',   url: '/hotspot-icons/star-yellow.png' },
  { key: 'star-blue',          label: 'Star Blue',       group: 'star',   url: '/hotspot-icons/star-blue.png' },
  { key: 'star-green',         label: 'Star Green',      group: 'star',   url: '/hotspot-icons/star-green.png' },

  // ── Navigation (scene links) ──────────────────────────────
  // Drawn as a disc on the floor with a pin or arrow standing on it (floorCursor.ts).
  { key: 'nav-floor-pin',      label: 'Floor Pin',       group: 'nav',    url: '/hotspot-icons/nav-floor-pin.svg' },
  { key: 'nav-floor-up',       label: 'Floor Up',        group: 'nav',    url: '/hotspot-icons/nav-floor-up.svg' },
  { key: 'nav-floor-down',     label: 'Floor Down',      group: 'nav',    url: '/hotspot-icons/nav-floor-down.svg' },
  // Older nav icons: drawn as the Floor Pin since floor navigation became the default.
  { key: 'nav-up',             label: 'Arrow (White)',   group: 'nav',    url: '/hotspot-icons/nav-floor-white.svg', legacy: true },
  { key: 'nav-up-white',       label: 'Arrow (Black)',   group: 'nav',    url: '/hotspot-icons/nav-floor-black.svg', legacy: true },
  { key: 'nav-sphere',         label: 'Sphere',          group: 'nav',    url: '/hotspot-icons/nav-sphere.png', legacy: true },
  { key: 'nav-portal',         label: 'Portal',          group: 'nav',    url: '/hotspot-icons/nav-portal.svg', legacy: true },
]

/** Icons offered in the pickers. */
export const PICKER_ICON_DEFS = HOTSPOT_ICON_DEFS.filter(d => !d.legacy)

export const FLOOR_PIN_ICON = 'nav-floor-pin'
export const FLOOR_UP_ICON = 'nav-floor-up'
export const FLOOR_DOWN_ICON = 'nav-floor-down'

/** What stands on a navigation hotspot's floor disc. */
export type FloorGlyph = 'pin' | 'up' | 'down'

export function isFloorIcon(icon: string | null | undefined): boolean {
  return icon === FLOOR_PIN_ICON || icon === FLOOR_UP_ICON || icon === FLOOR_DOWN_ICON
}

/** Older and missing nav icons get the pin. */
export function floorGlyph(icon: string | null | undefined): FloorGlyph {
  return icon === FLOOR_UP_ICON ? 'up' : icon === FLOOR_DOWN_ICON ? 'down' : 'pin'
}

/** The picker entry a navigation hotspot shows as selected. */
export function navPickerIcon(icon: string | null | undefined): string {
  return isFloorIcon(icon) ? icon! : FLOOR_PIN_ICON
}

export const HOTSPOT_ICONS_BY_KEY: Record<string, string> = Object.fromEntries(
  HOTSPOT_ICON_DEFS.map((d) => [d.key, d.url])
)

export const TYPE_DEFAULT_ICON: Record<string, string> = {
  info:       'info-3d-light',
  scene_link: FLOOR_PIN_ICON,
  url:        'info-3d-light',
  video:      'video-3d-light',
  youtube:    'video-3d-light',
}

export const ICON_GROUPS: Array<{ label: string; key: HotspotIconDef['group'] }> = [
  { label: 'Info',       key: 'info' },
  { label: 'Video',      key: 'video' },
  { label: 'Camera',     key: 'camera' },
  { label: 'Stars',      key: 'star' },
  { label: 'Navigation', key: 'nav' },
]
