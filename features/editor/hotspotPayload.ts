// Pure hotspot ⇄ API payload helpers, shared by the hotspot editor and the
// "sync hotspots placed before the upload finished" path in useEditorUpload.
// Keeping one builder means a hotspot placed during an upload is saved with
// the same fields (icon, colours, land data…) as one placed afterwards.

import type { EditorHotspot } from '~/features/editor/mappers'
import type { LandKind, PlotStatus, SphericalPoint } from '~/domain/hotspot'

export type HotspotType = 'info' | 'scene_link' | 'url' | 'video' | 'youtube'

export type EditDraft = {
  label: string
  description: string
  url: string
  targetSceneId: string
  type: HotspotType
  icon: string | null
  labelColor: string
  labelBold: boolean
  scale: number
  hoverScale: number
  strokeScale: number
  corners?: Array<{ yaw: number; pitch: number }>
  imageUrl?: string
  kind?: LandKind
  points?: SphericalPoint[]
  plotStatus?: PlotStatus
  plotPrice?: string
  plotSize?: string
  arrowWidth?: number
}

// Must match the backend limits in routes/hotspots.ts — longer values were
// accepted by the inputs and then rejected by the API with a generic error.
export const HOTSPOT_LABEL_MAX = 60
export const HOTSPOT_TEXT_MAX = 500

export const LAND_DEFAULT_LABEL: Record<LandKind, string> = {
  plot: 'Plot',
  beacon: 'Beacon',
  road: 'Access road',
  zone: 'Phase 1',
}

export function emptyDraft(type: HotspotType = 'info'): EditDraft {
  return { label: '', description: '', url: '', targetSceneId: '', type, icon: '', labelColor: '', labelBold: false, scale: 1, hoverScale: 1.3, strokeScale: 1, imageUrl: '' }
}

export function draftFromHotspot(h: EditorHotspot, targetSceneId = h.targetSceneId || ''): EditDraft {
  return {
    label: h.label || '',
    description: h.description || '',
    url: h.url || '',
    targetSceneId,
    type: (h.type as HotspotType) || 'info',
    icon: h.icon || '',
    labelColor: h.labelColor || '',
    labelBold: h.labelBold ?? false,
    scale: h.scale || 1,
    hoverScale: h.hoverScale || 1.3,
    strokeScale: h.strokeScale || 1,
    corners: h.corners,
    imageUrl: h.imageUrl || '',
    kind: h.kind,
    points: h.points,
    plotStatus: h.plotStatus,
    plotPrice: h.plotPrice || '',
    plotSize: h.plotSize || '',
    arrowWidth: h.arrowWidth,
  }
}

export function defaultLabel(d: Pick<EditDraft, 'kind' | 'type'>): string {
  if (d.kind) return LAND_DEFAULT_LABEL[d.kind]
  return d.type === 'scene_link' ? 'Go to next room' : 'Info hotspot'
}

export function buildContent(d: EditDraft): Record<string, any> {
  const content: Record<string, any> = {}
  if (d.type === 'info') content.text = d.description.trim().slice(0, HOTSPOT_TEXT_MAX)
  else if (d.type === 'url') { content.url = d.url.trim(); content.button_label = 'Open link' }
  else if (d.type === 'video' || d.type === 'youtube') content.url = d.url.trim()

  if (d.kind) {
    content.kind = d.kind
    if (d.kind === 'road' && d.url.trim()) content.url = d.url.trim()
    if (d.kind === 'road' && d.points && d.points.length >= 2) {
      content.points = d.points
      content.arrow_width = Math.round((d.arrowWidth ?? 1) * 100) / 100
    }
    if (d.kind === 'zone') content.points = d.points
    if (d.kind === 'plot') {
      content.points = d.points
      content.plot_status = d.plotStatus || 'available'
      content.plot_price = d.plotPrice?.trim() || undefined
      content.plot_size = d.plotSize?.trim() || undefined
    }
  }

  return {
    ...content,
    icon: d.icon || undefined,
    label_color: d.labelColor || undefined,
    label_bold: d.labelBold || undefined,
    scale: Number(d.scale || 1),
    hoverScale: Number(d.hoverScale || 1.3),
    strokeScale: Number(d.strokeScale || 1),
    corners: d.corners?.length === 4 ? d.corners : undefined,
    image_url: d.imageUrl || undefined,
  }
}

export function buildHotspotPayload(d: EditDraft, pos: { yaw: number; pitch: number }) {
  const payload: any = {
    type: d.type,
    yaw: pos.yaw,
    pitch: pos.pitch,
    label: d.label.trim().slice(0, HOTSPOT_LABEL_MAX) || defaultLabel(d),
    content: buildContent(d),
  }
  if (d.type === 'scene_link') payload.target_scene_id = d.targetSceneId
  return payload
}

/** Full create payload for an editor hotspot (used for pending-upload sync). */
export function hotspotToPayload(h: EditorHotspot) {
  return buildHotspotPayload(draftFromHotspot(h), { yaw: h.yaw, pitch: h.pitch })
}
