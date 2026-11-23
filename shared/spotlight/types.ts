// Object Spotlight: the per-scene data written by scripts/spotlight/ (offline,
// on a dev machine) and served as a static file: /spotlight/<sceneId>.json.
// Angles are radians in PSV's convention (yaw 0 = centre of the photo).

export interface SpotlightObject {
  id: string
  /** Short tag over the title, e.g. "Seating". */
  label: string
  /** Where the camera ends up: the object centred at this zoom level (0-100). */
  yaw: number
  pitch: number
  zoom: number
  /** The object's outline as [yaw, pitch] pairs (from SAM, simplified to ~20-60 points). */
  polygon: Array<[number, number]>
  title: string
  lines: string[]
  /** Recorded voice (Kokoro, same voices as patient journeys). Optional: without it the text runs on a reading time. */
  voiceSrc?: string
  /** No hint ring on the object (it is still opened by a tap or by zooming in on it). */
  hint?: boolean
  /** Where the hint ring sits when the owner moved it (editor), e.g. off a hotspot. Absent: at yaw / pitch. */
  ring?: { yaw: number; pitch: number }
  /**
   * Reserved for the 3D render (Notes/3d-render-spotlight.md): a GLB shown as a
   * hologram beside the panel. Ignored for now.
   */
  model?: { src: string; bytes?: number; scale?: number } | null
}

export interface SpotlightScene {
  v: 1
  scene: string
  objects: SpotlightObject[]
}

/** Why a spotlight closed. Only 'close', 'tap' and 'done' turn the camera back. */
export type SpotlightEndReason = 'close' | 'tap' | 'done' | 'moved' | 'hidden' | 'scene' | 'cancelled'

export interface SpotlightRun {
  dismiss: (reason: SpotlightEndReason) => void
  /**
   * A tap on the view while it's open. On a phone the first tap folds the
   * panel into a small label (the outline stays, so the object can be seen);
   * the next one closes it. Elsewhere a tap closes it.
   */
  tap: () => void
}
