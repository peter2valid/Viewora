export interface Hotspot {
  id: string
  yaw: number
  pitch: number
  type: 'info' | 'url' | 'scene_link' | 'video' | 'youtube'
  label?: string
  url?: string
  targetSceneId?: string
  description?: string
  icon?: string
  scale?: number
  hoverScale?: number
  corners?: Array<{ yaw: number; pitch: number }>
}

export interface HotspotCreatePayload {
  yaw: number
  pitch: number
  type: Hotspot['type']
  label?: string
  url?: string
  targetSceneId?: string
}
