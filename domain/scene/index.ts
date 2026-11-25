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
  /** Tripod cover for the whole tour (null/absent: off). */
  nadir_cover?: import('../../shared/utils/viewerAdapters/nadirCover').NadirCoverSettings | null
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
  /** Tripod cover for this scene (null: none here). See resolveNadirCover(). */
  nadirCover?: import('../../shared/utils/viewerAdapters/nadirCover').NadirCover | null
}

/** An arrow as the public tour (snake_case) or the editor (camelCase) carries it. Yaw/pitch in radians. */
export type StartArrow = {
  type?: string | null
  yaw?: number | null
  pitch?: number | null
  target_scene_id?: string | null
  targetSceneId?: string | null
}

/**
 * Start view for a scene, in RADIANS (what PSV expects for numeric yaw/pitch).
 *
 * Stored values are DEGREES: the editor's "Starting Yaw/Pitch" sliders save
 * degrees to property_360_settings, and scenes.initial_yaw/pitch use the same
 * ±180/±90 ranges. They used to be handed to PSV unconverted (45° → 45 rad),
 * and the public viewer never fell back to the tour setting because a scene's
 * initial_* is 0, not null.
 *
 * Order: a non-zero per-scene value, then the tour-wide setting, then — when
 * neither was ever set — face the scene's way forward: its arrow to the next
 * scene in order (`nextSceneId`), else its first arrow. Without that, a scene
 * nobody set opens at the camera's raw front, which can put the only arrow
 * behind the visitor (Kings Boma "Outside Premise": arrow at ~105°, opened at 0°).
 */
export function resolveStartView(
  scene: { initial_yaw?: number | null; initial_pitch?: number | null; hotspots?: StartArrow[] | null } | null | undefined,
  tour: { yaw_default?: number | null; pitch_default?: number | null } | null | undefined,
  opts: { arrows?: StartArrow[] | null; nextSceneId?: string | null } = {},
): { yaw: number; pitch: number } {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const sceneYaw = Number(scene?.initial_yaw ?? 0)
  const scenePitch = Number(scene?.initial_pitch ?? 0)
  if (sceneYaw || scenePitch) return { yaw: toRad(sceneYaw), pitch: toRad(scenePitch) }
  const tourYaw = Number(tour?.yaw_default ?? 0)
  const tourPitch = Number(tour?.pitch_default ?? 0)
  if (tourYaw || tourPitch) return { yaw: toRad(tourYaw), pitch: toRad(tourPitch) }
  const arrow = forwardArrow(opts.arrows ?? scene?.hotspots, opts.nextSceneId)
  if (arrow) {
    // Half the arrow's tilt: a stair arrow 25° up still sits in view, the horizon stays level-ish.
    const pitch = Math.max(-0.35, Math.min(0.35, Number(arrow.pitch ?? 0) / 2))
    return { yaw: Number(arrow.yaw), pitch }
  }
  return { yaw: 0, pitch: 0 }
}

/** The arrow a visitor most likely wants first: to the next scene in order, else the first arrow. */
export function forwardArrow(arrows: StartArrow[] | null | undefined, nextSceneId?: string | null): StartArrow | null {
  if (!Array.isArray(arrows)) return null
  const links = arrows.filter(h =>
    h?.type === 'scene_link' && Number.isFinite(Number(h.yaw)) && (h.target_scene_id || h.targetSceneId))
  if (!links.length) return null
  if (nextSceneId) {
    const next = links.find(h => (h.target_scene_id ?? h.targetSceneId) === nextSceneId)
    if (next) return next
  }
  return links[0]
}
