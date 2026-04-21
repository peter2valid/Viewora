export interface SceneMedia {
  id: string
  media_type: 'panorama' | 'gallery' | 'car_spin'
  storage_key: string
  public_url: string
  width: number | null
  height: number | null
  file_size_bytes: number | null
  sort_order: number
  is_primary: boolean
  processing_status: 'pending' | 'processing' | 'ready' | 'error'
  processed_at: string | null
  processing_error: string | null
  created_at: string
  updated_at: string
}

export interface Settings360 {
  id: string
  panorama_media_id: string | null
  hfov_default: number
  pitch_default: number
  yaw_default: number
  auto_rotate_enabled: boolean
  hotspots_json: Hotspot360[] | null
}

export interface Hotspot360 {
  id: string
  yaw: number
  pitch: number
  type: 'info' | 'link' | 'scene'
  label?: string
  url?: string
  scene_id?: string
}

export interface TourScene {
  id: string
  imageUrl: string
  title?: string
  hotspots: Hotspot360[]
  settings: Pick<Settings360, 'hfov_default' | 'pitch_default' | 'yaw_default' | 'auto_rotate_enabled'>
}
