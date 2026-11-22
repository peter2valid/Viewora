// A .spotlight file: one object, exported by Spotlight Studio
// (scripts/spotlight/studio.py, "Save as file") for dropping into the editor
// when the Studio isn't connected to Viewora. Same fields the backend takes
// on PUT /scenes/:sceneId/spotlights/:key (viewora-backend utils/spotlights.ts).

export interface SpotlightBundle {
  kind: 'viewora-spotlight'
  v: 1
  /** The scene it was made for. */
  scene: string
  /** The object's id within the scene (lowercase, digits, dashes). */
  key: string
  /** What the tour draws: label, yaw, pitch, zoom, polygon, title, lines (radians). */
  data: Record<string, unknown>
  /** Studio's working notes, so it can be edited again. */
  source?: Record<string, unknown> | null
  /** The recorded voice, base64 MP3. */
  voice?: string | null
}

export const BUNDLE_MAX_BYTES = 3 * 1024 * 1024

/** The bundle in a file, or a message saying why it isn't one. */
export function parseBundle(text: string): SpotlightBundle | string {
  let b: any
  try { b = JSON.parse(text) } catch { return 'This is not a .spotlight file.' }
  if (!b || b.kind !== 'viewora-spotlight') return 'This is not a .spotlight file.'
  if (b.v !== 1) return 'This .spotlight file is from a newer Studio. Update the editor (reload the page).'
  if (typeof b.scene !== 'string' || !/^[0-9a-f-]{36}$/i.test(b.scene)) return 'The file has no scene.'
  if (typeof b.key !== 'string' || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(b.key)) return 'The file has no object id.'
  if (!b.data || typeof b.data !== 'object' || typeof b.data.title !== 'string') return 'The file has no spotlight in it.'
  return b as SpotlightBundle
}
