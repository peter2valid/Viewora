import type { SceneMedia, TourScene, Settings360 } from '~/domain/scene'

export function mediaToScene(
  media: SceneMedia,
  settings: Settings360 | null
): TourScene {
  return {
    id: media.id,
    imageUrl: media.public_url,
    hotspots: settings?.hotspots_json ?? [],
    settings: {
      hfov_default: settings?.hfov_default ?? 90,
      pitch_default: settings?.pitch_default ?? 0,
      yaw_default: settings?.yaw_default ?? 0,
      auto_rotate_enabled: settings?.auto_rotate_enabled ?? false,
    },
  }
}

export function bytesToMb(bytes: number): string {
  return (bytes / 1_048_576).toFixed(1)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
