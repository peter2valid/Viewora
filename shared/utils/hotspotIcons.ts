export interface HotspotIconDef {
  key: string
  label: string
  svg: string
}

const A = 'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"'

export const HOTSPOT_ICON_DEFS: HotspotIconDef[] = [
  {
    key: 'info',
    label: 'Info',
    svg: `<svg viewBox="0 0 24 24" ${A}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  },
  {
    key: 'arrow',
    label: 'Arrow',
    svg: `<svg viewBox="0 0 24 24" ${A}><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
  },
  {
    key: 'external',
    label: 'Link',
    svg: `<svg viewBox="0 0 24 24" ${A}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  },
  {
    key: 'star',
    label: 'Star',
    svg: `<svg viewBox="0 0 24 24" ${A}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  },
  {
    key: 'camera',
    label: 'Camera',
    svg: `<svg viewBox="0 0 24 24" ${A}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  },
  {
    key: 'home',
    label: 'Home',
    svg: `<svg viewBox="0 0 24 24" ${A}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
  {
    key: 'pin',
    label: 'Pin',
    svg: `<svg viewBox="0 0 24 24" ${A}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  },
  {
    key: 'eye',
    label: 'View',
    svg: `<svg viewBox="0 0 24 24" ${A}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  },
  {
    key: 'chat',
    label: 'Note',
    svg: `<svg viewBox="0 0 24 24" ${A}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  },
  {
    key: 'zap',
    label: 'Feature',
    svg: `<svg viewBox="0 0 24 24" ${A}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  },
  {
    key: 'flag',
    label: 'Flag',
    svg: `<svg viewBox="0 0 24 24" ${A}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  },
  {
    key: 'tag',
    label: 'Tag',
    svg: `<svg viewBox="0 0 24 24" ${A}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none"/></svg>`,
  },
]

export const HOTSPOT_ICONS_BY_KEY: Record<string, string> = Object.fromEntries(
  HOTSPOT_ICON_DEFS.map((d) => [d.key, d.svg])
)

export const TYPE_DEFAULT_ICON: Record<string, string> = {
  info: 'info',
  scene_link: 'arrow',
  url: 'external',
}
