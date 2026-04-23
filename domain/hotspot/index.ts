export interface Hotspot {
  id: string
  yaw: number
  pitch: number
  type: 'info' | 'url' | 'scene_link'
  label?: string
  url?: string
  targetSceneId?: string
}

export interface HotspotCreatePayload {
  yaw: number
  pitch: number
  type: Hotspot['type']
  label?: string
  url?: string
  targetSceneId?: string
}
