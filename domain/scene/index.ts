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
}

export interface Hotspot360 {
  id: string
  yaw: number
  pitch: number
  type: 'info' | 'url' | 'scene_link' | 'video' | 'youtube'
  label?: string
  icon?: string
  url?: string
  scene_id?: string
}

export interface TourScene {
  id: string
  imageUrl: string
  rawImageUrl?: string
  tileManifestUrl?: string
  tileCols?: number
  tileRows?: number
  tilesReady?: boolean
  tileMediumManifestUrl?: string
  tileMediumCols?: number
  tileMediumRows?: number
  tileMediumKtx2ManifestUrl?: string | null
  width?: number
  height?: number
  positionX?: number
  positionY?: number
  title?: string
  hotspots: Hotspot360[]
  settings: Pick<Settings360, 'hfov_default' | 'pitch_default' | 'yaw_default' | 'auto_rotate_enabled'>
}

/**
 * Start view for a scene, in RADIANS (what PSV expects for numeric yaw/pitch).
 *
 * Stored values are DEGREES: the editor's "Starting Yaw/Pitch" sliders save
 * degrees to property_360_settings, and scenes.initial_yaw/pitch use the same
 * ±180/±90 ranges. They used to be handed to PSV unconverted (45° → 45 rad),
 * and the public viewer never fell back to the tour setting because a scene's
 * initial_* is 0, not null. A non-zero per-scene value wins; otherwise the
 * tour-wide setting applies.
 */
export function resolveStartView(
  scene: { initial_yaw?: number | null; initial_pitch?: number | null } | null | undefined,
  tour: { yaw_default?: number | null; pitch_default?: number | null } | null | undefined,
): { yaw: number; pitch: number } {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const sceneYaw = Number(scene?.initial_yaw ?? 0)
  const scenePitch = Number(scene?.initial_pitch ?? 0)
  if (sceneYaw || scenePitch) return { yaw: toRad(sceneYaw), pitch: toRad(scenePitch) }
  return { yaw: toRad(Number(tour?.yaw_default ?? 0)), pitch: toRad(Number(tour?.pitch_default ?? 0)) }
}
