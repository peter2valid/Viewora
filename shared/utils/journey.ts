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
  /**
   * Narrate a line (caption + voice). The next action waits for it.
   * audio: the line's recording (MP3); ms: its length. Without audio the
   * caption shows for a reading time instead.
   */
  | { say: string; audio?: string; ms?: number; pin?: JourneyPin }
  /** Open an info hotspot's card, narrate, then close it. */
  | { card: string; say?: string; hold?: number; audio?: string; ms?: number }
  | { wait: number }

/** A pulsing marker shown while a line is read ("Parking"). Degrees, like views. */
export interface JourneyPin { yaw: number; pitch: number; label?: string }

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
  /** visit: a whole guided visit · area: one area's guide · route: directions. */
  kind?: 'visit' | 'area' | 'route'
  /** The saved journey's id (visits), for analytics. */
  id?: string
  /** The area's photo (area guides) or the destination (routes), for analytics. */
  sceneId?: string
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
      if ('say' in a && a.say) ms += ('ms' in a && a.ms) ? a.ms : speakMs(a.say)
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
/** A line's recording, added by the API (never saved in the journey itself). */
export interface JourneyDocAudio {
  url: string
  duration_ms: number
  /** What was recorded; when the line's text differs, the recording is out of date. */
  text: string
}
export interface JourneyDocSentence {
  id: string
  text: string
  /** Where to look while this line is read (lines 2+; line 1 uses the step's view). Absent = keep looking. */
  view?: JourneyDocView | null
  /** An info hotspot (in this step's photo) whose card opens while the line is read. */
  hotspot_id?: string | null
  /**
   * Mark the spot: a pulsing marker while the line is read. yaw / pitch
   * (radians) = where it was placed; absent = the middle of the line's view.
   */
  pin?: { label?: string; yaw?: number; pitch?: number } | null
  audio?: JourneyDocAudio | null
}

/** What is actually said: trimmed, runs of whitespace as one space (as the API hashes it). */
export function normalizeLine(text: string): string {
  return String(text ?? '').trim().replace(/\s+/g, ' ')
}

/** The line's recording, only if it still matches what the line says. */
export function freshAudio(x: JourneyDocSentence): JourneyDocAudio | null {
  const a = x.audio
  return a && a.url && a.text === normalizeLine(x.text) ? a : null
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
    // Where the camera points while each line is read: a marked spot sits there.
    let facing: JourneyDocView | null = s.view ?? null
    ;(s.sentences ?? []).forEach((x, k) => {
      const text = normalizeLine(x.text ?? '')
      const a = freshAudio(x)
      const voice = a ? { audio: a.url, ms: a.duration_ms } : {}
      if (x.hotspot_id) {
        // Opening the card turns the camera to the hotspot itself: no separate look.
        actions.push(text ? { card: x.hotspot_id, say: text, ...voice } : { card: x.hotspot_id, hold: 4000 })
        if (text) said++
        return
      }
      if (k > 0 && x.view) { actions.push({ look: toView(x.view), reframe: true }); facing = x.view }
      const at = x.pin && typeof x.pin.yaw === 'number' && typeof x.pin.pitch === 'number' ? { yaw: x.pin.yaw, pitch: x.pin.pitch } : facing
      const pin = x.pin && at ? { pin: { yaw: toDeg(at.yaw), pitch: toDeg(at.pitch), ...(x.pin.label?.trim() ? { label: x.pin.label.trim() } : {}) } } : {}
      if (text) { actions.push({ say: text, ...voice, ...pin }); said++ }
    })
    if (!said) actions.push({ wait: QUIET_STEP_MS })
    return { title: s.title.trim() || `Step ${i + 1}`, scene: s.scene_id!, ...(view ? { view } : {}), actions }
  })
  return { title: doc.title.trim() || 'Guided visit', chapters, kind: 'visit', ...(doc.id ? { id: doc.id } : {}) }
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

// ── Areas: each photo used by a visit, listed once ──────────────────────────
// The same photo can be a step in several visits (Reception in "Outpatient"
// and in "Lab test"), or twice in one (check in, then pay). Patients see it
// once in the side list, and choosing it plays everything said there: every
// line from every step on that photo, each line once.

export interface TourArea {
  sceneId: string
  /** The first step's title on that photo ("Reception"); the photo's own name when steps have none. */
  title: string
  thumb: string
  /** Its guide; null when no step on it says anything yet (choosing it just goes there). */
  guide: Journey | null
  /** How many steps across the visits use this photo. */
  uses: number
}

function linesKey(x: JourneyDocSentence): string {
  const t = normalizeLine(x.text ?? '').toLowerCase()
  return t ? `t:${t}` : x.hotspot_id ? `h:${x.hotspot_id}` : ''
}

/** One area's guide: the first step on that photo sets the arrival view; lines from all its steps, each once. */
export function compileAreaGuide(docs: JourneyDoc[], sceneId: string, title: string, sceneIds: Set<string>): Journey | null {
  const steps = docs.flatMap(d => d.steps ?? []).filter(s => s.scene_id === sceneId)
  if (!steps.length || !sceneIds.has(sceneId)) return null
  const seen = new Set<string>()
  const sentences: JourneyDocSentence[] = []
  for (const st of steps) {
    // A step's line 1 has no view of its own: it's said facing the step's view.
    // Once merged after another step's lines, it needs that view to turn back.
    ;(st.sentences ?? []).forEach((x, k) => {
      const key = linesKey(x)
      if (!key || seen.has(key)) return
      seen.add(key)
      const view = x.view ?? (k === 0 && st !== steps[0] ? st.view ?? null : null)
      sentences.push({ ...x, view })
    })
  }
  if (!sentences.length) return null
  const j = compileJourney({ title, steps: [{ id: 'area', title, scene_id: sceneId, view: steps[0]!.view ?? null, sentences }] }, sceneIds)
  return j ? { ...j, kind: 'area', sceneId, subtitle: undefined } : null
}

/** Every photo the tour's visits use, once each, in the order patients meet them. */
export function tourAreas(tour: any, scenes: { id: string; title?: string; name?: string; thumbnail_url?: string | null }[]): TourArea[] {
  const docs: JourneyDoc[] = (Array.isArray(tour?.journeys) ? tour.journeys : []).filter((d: any) => d && Array.isArray(d.steps))
  const byId = new Map(scenes.map(s => [s.id, s]))
  const sceneIds = new Set(byId.keys())
  const order: string[] = []
  const uses = new Map<string, number>()
  const named = new Map<string, string>()
  for (const d of docs) {
    for (const st of d.steps) {
      if (!st.scene_id || !byId.has(st.scene_id)) continue
      if (!uses.has(st.scene_id)) order.push(st.scene_id)
      uses.set(st.scene_id, (uses.get(st.scene_id) ?? 0) + 1)
      const t = (st.title ?? '').trim()
      if (t && !named.has(st.scene_id)) named.set(st.scene_id, t)
    }
  }
  return order.map((id) => {
    const sc = byId.get(id)!
    const title = named.get(id) || (sc.title || sc.name || '').trim() || 'Untitled area'
    return { sceneId: id, title, thumb: sc.thumbnail_url || '', guide: compileAreaGuide(docs, id, title, sceneIds), uses: uses.get(id) ?? 0 }
  })
}

// ── Directions: "I'm at A, take me to B" ────────────────────────────────────
/**
 * A walk along `path` (scene ids, from the tour's links), played like a visit:
 * one chapter per room, so the progress bar shows the way and Pause / Next work.
 * Rooms that are areas say their name as you pass; the last says you've arrived.
 */
export function routeJourney(path: string[], nameOf: (id: string) => string | null): Journey | null {
  if (path.length < 2) return null
  const to = nameOf(path.at(-1)!) ?? 'your destination'
  const from = nameOf(path[0]!) ?? 'here'
  const chapters: JourneyChapter[] = path.map((id, i) => {
    const name = nameOf(id)
    const actions: JourneyAction[] = []
    if (i > 0) actions.push({ walk: id })
    if (i === 0) actions.push({ say: `From ${from} to ${to}. Follow along, or pause to look around.`, ms: 3200 })
    else if (i === path.length - 1) actions.push({ say: `You've arrived at ${to}.`, ms: 2600 })
    else if (name) actions.push({ say: `Passing ${name}.`, ms: 1400 })
    return { title: i === 0 ? from : i === path.length - 1 ? to : (name ?? 'On the way'), scene: id, actions }
  })
  return { title: `To ${to}`, chapters, kind: 'route', sceneId: path.at(-1)! }
}

export function newLocalId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Voices a journey can be read in: exactly the ones baked into the voice worker.
 *  Same ids as viewora-backend src/utils/narration.ts and tts-worker/narration.py
 *  (tts-worker/tests/test_voices.py checks). Samples: public/voices/<id>.mp3. */
export const JOURNEY_VOICES = [
  { id: 'af_heart', name: 'Heart', about: 'Warm, calm · American · woman' },
  { id: 'af_bella', name: 'Bella', about: 'Bright, friendly · American · woman' },
  { id: 'bf_emma', name: 'Emma', about: 'Clear, gentle · British · woman' },
  { id: 'am_michael', name: 'Michael', about: 'Steady, low · American · man' },
] as const
export type JourneyVoice = typeof JOURNEY_VOICES[number]['id']
export const DEFAULT_JOURNEY_VOICE: JourneyVoice = 'af_heart'
