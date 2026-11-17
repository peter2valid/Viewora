// A Journey: a tour that plays itself, step by step, timed by its narration.
//
// It walks the visitor from stop to stop through the tour's own 360 links,
// turns the camera toward what is being talked about, opens info cards (the
// tour's own info hotspots) and closes them when the line is done, with no
// clicks needed after "Start". Made for services: a hospital visit from the
// gate to the exit, check-in at a hotel, an evening at a restaurant.
//
// Two sources: journeys built in the editor (`tour.journeys`, saved as steps
// and sentences, turned into actions by compileJourney below), and the
// hand-written prototype format (`tour.journey`, the Simba mock). Action
// angles are in degrees; the player converts them for PSV (radians, yaw 0 =
// centre of the photo, + = right).

export interface JourneyView {
  yaw: number
  pitch?: number
  /** PSV zoom level 0–100; omitted = keep the current zoom. */
  zoom?: number
}

export type JourneyAction =
  /**
   * Walk to a scene through the tour's links, one room at a time.
   * direct: one step straight there instead (no arrow needed), e.g. back to
   * the middle of the room after stepping up to a counter.
   */
  | { walk: string; say?: string; face?: JourneyView; direct?: boolean }
  /**
   * Turn the camera. `ms` = how long the turn takes. reframe: like moving
   * your eyes to something else: zoom out, turn, then zoom in to `look.zoom`.
   */
  | { look: JourneyView; ms?: number; reframe?: boolean }
  /** A slow full turn round the room, back to where it started. */
  | { around: number; say?: string }
  /** Narrate a line (caption + voice). The next action waits for it. */
  | { say: string }
  /** Open an info hotspot's card, narrate, then close it. */
  | { card: string; say?: string; hold?: number }
  | { wait: number }

export interface JourneyChapter {
  title: string
  /** Where this chapter starts, for Next / Back (the player jumps there). */
  scene: string
  view?: JourneyView
  actions: JourneyAction[]
}

export interface Journey {
  title: string
  subtitle?: string
  chapters: JourneyChapter[]
}

export function isJourney(v: any): v is Journey {
  return !!v && typeof v.title === 'string' && Array.isArray(v.chapters) && v.chapters.length > 0
    && v.chapters.every((c: any) => c && typeof c.scene === 'string' && Array.isArray(c.actions))
}

/** Drops chapters and walks that point at scenes the tour doesn't have. */
export function parseJourney(raw: unknown, sceneIds: Set<string>): Journey | null {
  if (!isJourney(raw)) return null
  const chapters = raw.chapters
    .filter(c => sceneIds.has(c.scene))
    .map(c => ({ ...c, actions: c.actions.filter(a => !('walk' in a) || sceneIds.has(a.walk)) }))
  return chapters.length ? { ...raw, chapters } : null
}

export const deg = (d: number) => (d * Math.PI) / 180

/** How long a line takes to say at a calm pace, when no voice can time it. */
export function speakMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(2200, words * 400 + 600)
}

/** Rough running time, for "about 3 min" on the start card. */
export function journeyMinutes(j: Journey): number {
  let ms = 0
  for (const c of j.chapters) {
    for (const a of c.actions) {
      if ('say' in a && a.say) ms += speakMs(a.say)
      if ('walk' in a) ms += 3000
      // A turn and its line run together: count whichever is longer.
      if ('around' in a) ms += Math.max(0, a.around - (a.say ? speakMs(a.say) : 0))
      if ('look' in a) ms += a.ms ?? 1500
      if ('card' in a && !a.say) ms += a.hold ?? 4000
      if ('wait' in a) ms += a.wait
    }
  }
  return Math.max(1, Math.round(ms / 60000))
}

// ── What the editor saves (journeys table, migration-journeys.sql) ─────────
// People build a visit as steps ("Reception") and sentences ("Register at the
// front desk"); the walks, turns and timing are worked out here, never by them.

export interface JourneyDocView { yaw: number; pitch: number; zoom?: number }
export interface JourneyDocSentence {
  id: string
  text: string
  /** Where to look while this line is read (lines 2+; line 1 uses the step's view). Absent = keep looking. */
  view?: JourneyDocView | null
}
export interface JourneyDocStep {
  id: string
  title: string
  scene_id: string | null
  /**
   * Where to face on arrival, radians as PSV reports them, and how close to
   * zoom (PSV level 0–100; absent = wide). Null = keep walking direction.
   */
  view?: JourneyDocView | null
  sentences: JourneyDocSentence[]
}
export interface JourneyDoc {
  id?: string
  title: string
  steps: JourneyDocStep[]
}

const toDeg = (r: number) => (r * 180) / Math.PI
const toView = (v: JourneyDocView): JourneyView =>
  ({ yaw: toDeg(v.yaw), pitch: toDeg(v.pitch), ...(v.zoom ? { zoom: v.zoom } : {}) })

/** A step with no narration still pauses, so the visitor can take the room in. */
const QUIET_STEP_MS = 3000

/**
 * Turns a saved journey into what the player runs. Steps without a photo, or
 * whose photo is gone, are left out. The first step is where the visit
 * starts (the player goes straight there); every later one is walked to
 * through the tour's arrows.
 */
export function compileJourney(doc: JourneyDoc, sceneIds: Set<string>): Journey | null {
  const steps = (doc.steps ?? []).filter(s => s.scene_id && sceneIds.has(s.scene_id))
  if (!steps.length) return null
  const chapters: JourneyChapter[] = steps.map((s, i) => {
    const view = s.view ? toView(s.view) : undefined
    const actions: JourneyAction[] = []
    if (i > 0) actions.push({ walk: s.scene_id!, ...(view ? { face: view } : {}) })
    // Line 1 is said facing the arrival view; a later line with its own view
    // turns there first. Empty lines are skipped, but their view still counts.
    let said = 0
    ;(s.sentences ?? []).forEach((x, k) => {
      if (k > 0 && x.view) actions.push({ look: toView(x.view), reframe: true })
      const text = (x.text ?? '').trim()
      if (text) { actions.push({ say: text }); said++ }
    })
    if (!said) actions.push({ wait: QUIET_STEP_MS })
    return { title: s.title.trim() || `Step ${i + 1}`, scene: s.scene_id!, ...(view ? { view } : {}), actions }
  })
  return { title: doc.title.trim() || 'Guided visit', chapters }
}

/** Every journey a tour carries: the saved ones, plus a hand-written prototype one. */
export function tourJourneys(tour: any, sceneIds: Set<string>): Journey[] {
  const out: Journey[] = []
  for (const doc of Array.isArray(tour?.journeys) ? tour.journeys : []) {
    const j = doc && Array.isArray(doc.steps) ? compileJourney(doc, sceneIds) : null
    if (j) out.push(j)
  }
  const proto = parseJourney(tour?.journey, sceneIds)
  if (proto) out.push(proto)
  return out
}

export function newLocalId(): string {
  return Math.random().toString(36).slice(2, 10)
}
