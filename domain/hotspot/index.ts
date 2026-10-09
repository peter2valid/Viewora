export type LandKind = 'plot' | 'beacon' | 'road' | 'zone'
export type PlotStatus = 'available' | 'reserved' | 'sold'
export type SphericalPoint = { yaw: number; pitch: number }

export interface Hotspot {
  id: string
  yaw: number
  pitch: number
  type: 'info' | 'url' | 'scene_link' | 'video' | 'youtube'
  label?: string
  url?: string
  targetSceneId?: string
  description?: string
  icon?: string | null
  labelColor?: string
  labelBold?: boolean
  scale?: number
  hoverScale?: number
  strokeScale?: number
  corners?: Array<{ yaw: number; pitch: number }>
  imageUrl?: string
  // Land listings — stored on `info` hotspots under content.kind
  kind?: LandKind
  points?: SphericalPoint[]
  plotStatus?: PlotStatus
  plotPrice?: string
  plotSize?: string
  /** Road arrows: width multiplier for the ground-painted arrow. */
  arrowWidth?: number
}

export interface HotspotCreatePayload {
  yaw: number
  pitch: number
  type: Hotspot['type']
  label?: string
  url?: string
  targetSceneId?: string
}
