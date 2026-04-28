export interface HotspotIconDef {
  key: string
  label: string
  group: 'info' | 'video' | 'camera' | 'star' | 'nav'
  url: string
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
  { key: 'nav-up',             label: 'Arrow Up',        group: 'nav',    url: '/hotspot-icons/nav-up.png' },
  { key: 'nav-sphere',         label: 'Sphere',          group: 'nav',    url: '/hotspot-icons/nav-sphere.png' },
  { key: 'nav-portal',         label: 'Portal',          group: 'nav',    url: '/hotspot-icons/nav-portal.svg' },
]

export const HOTSPOT_ICONS_BY_KEY: Record<string, string> = Object.fromEntries(
  HOTSPOT_ICON_DEFS.map((d) => [d.key, d.url])
)

export const TYPE_DEFAULT_ICON: Record<string, string> = {
  info:       'info-solid',
  scene_link: 'nav-up',
  url:        'info-outline',
  video:      'video-solid',
  youtube:    'video-solid',
}

export const ICON_GROUPS: Array<{ label: string; key: HotspotIconDef['group'] }> = [
  { label: 'Info',       key: 'info' },
  { label: 'Video',      key: 'video' },
  { label: 'Camera',     key: 'camera' },
  { label: 'Stars',      key: 'star' },
  { label: 'Navigation', key: 'nav' },
]
