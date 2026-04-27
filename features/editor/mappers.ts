import type { Hotspot } from '~/domain/hotspot'

export type EditorHotspot = Hotspot & {
  description?: string
  _pending?: true
}

export function mapDbHotspot(h: any): EditorHotspot {
  return {
    id: String(h?.id ?? ''),
    yaw: Number(h?.yaw ?? 0),
    pitch: Number(h?.pitch ?? 0),
    type: (h?.type ?? 'info') as Hotspot['type'],
    label: h?.label ?? undefined,
    url: h?.content?.url ?? undefined,
    targetSceneId: h?.target_scene_id ?? undefined,
    description: h?.content?.text ?? undefined,
    icon: h?.content?.icon ?? undefined,
    scale: h?.content?.scale ?? undefined,
    hoverScale: h?.content?.hoverScale ?? undefined,
  }
}

export function mapDbHotspots(input: any[]): EditorHotspot[] {
  if (!Array.isArray(input)) return []
  return input.map(mapDbHotspot).filter((h) => h.id)
}
