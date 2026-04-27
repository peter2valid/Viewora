export const SPACE_TYPES = [
  'residential',
  'commercial',
  'hospitality',
  'education',
  'automotive',
  'other',
] as const

export const MEDIA_TYPES = ['panorama', 'gallery', 'car_spin'] as const

export const PSV_DEFAULTS = {
  hfov: 90,
  pitch: 0,
  yaw: 0,
  autoRotateSpeed: '2rpm',
} as const

export const CAR_SPIN_DEFAULTS = {
  autoplay: false,
  autoplaySpeed: 10,
  dragSpeed: 150,
  fullscreen: true,
  magnifier: 0,
} as const

// Image constraints enforced at upload time (client) and validated on complete (backend).
// Panoramas must be equirectangular (2:1 ratio). Max resolution prevents OOM in PSV.
export const IMAGE_LIMITS = {
  MAX_FILE_SIZE_BYTES: 250 * 1024 * 1024,   // 250 MB
  MAX_WIDTH_PX: 12288,
  MAX_HEIGHT_PX: 6144,
  PREFERRED_FORMATS: ['image/webp', 'image/avif', 'image/jpeg', 'image/png'] as const,
} as const

export const PANORAMA_MIN_WIDTH = 1000
export const UPLOAD_MAX_SIZE_MB = 250
