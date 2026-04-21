export interface Hotspot {
  id: string
  yaw: number
  pitch: number
  type: 'info' | 'link' | 'scene'
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
