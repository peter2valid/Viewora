export type { Space, SpaceWithMedia } from '~/domain/space'
export type { SceneMedia, Settings360, Hotspot360, TourScene } from '~/domain/scene'
export type { Hotspot, HotspotCreatePayload } from '~/domain/hotspot'
export type { CarSpinConfig, CarSpinMedia } from '~/domain/car'

export interface TourData {
  space: import('~/domain/space').Space
  scenes: import('~/domain/scene').TourScene[]
  settings?: import('~/domain/scene').Settings360 | null
}

export interface ApiError {
  statusMessage: string
  statusCode?: number
}
