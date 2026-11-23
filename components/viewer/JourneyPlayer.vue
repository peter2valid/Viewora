<template>
  <div v-if="state !== 'idle'" class="jp" :class="{ 'jp--intro': state === 'intro' }" aria-live="polite" @click.stop @pointerdown.stop>
    <!-- Before it starts: one tap (browsers only allow sound after one) -->
    <div v-if="state === 'intro' && journeys.length > 1" class="jp-intro">
      <p class="jp-intro__eyebrow">Guided visits</p>
      <h2 class="jp-intro__title">What brings you here?</h2>
      <p class="jp-intro__sub">Pick a visit and we'll walk you through it, step by step.</p>
      <div class="jp-choices">
        <button v-for="(j, i) in journeys" :key="i" type="button" class="jp-choice" @click="leftAt(i) ? continueVisit(i) : start(i)">
          <span class="jp-choice__text">
            <span class="jp-choice__title">{{ j.title }}</span>
            <span v-if="leftAt(i)" class="jp-choice__meta jp-choice__meta--resume">Continue · {{ leftAtLabel(i) }}</span>
            <span class="jp-choice__meta">{{ j.chapters.length }} {{ j.chapters.length === 1 ? 'step' : 'steps' }} · about {{ minutesOf(j) }} min</span>
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
      <button type="button" class="jp-link" @click="explore">Explore on my own</button>
    </div>
    <div v-else-if="state === 'intro'" class="jp-intro">
      <p class="jp-intro__eyebrow">Guided visit · about {{ minutesOf(journey) }} min</p>
      <h2 class="jp-intro__title">{{ journey.title }}</h2>
      <p v-if="journey.subtitle" class="jp-intro__sub">{{ journey.subtitle }}</p>
      <ol class="jp-intro__steps">
        <li v-for="(c, i) in journey.chapters" :key="i"><span>{{ i + 1 }}</span>{{ c.title }}</li>
      </ol>
      <template v-if="leftAt(ji)">
        <button type="button" class="jp-btn jp-btn--primary jp-btn--resume" @click="continueVisit(ji)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
          <span class="jp-resume">
            <span>Continue where you left off</span>
            <small>{{ leftAtLabel(ji) }}</small>
          </span>
        </button>
        <button type="button" class="jp-btn jp-btn--ghost jp-btn--again" @click="start(ji)">Start from the beginning</button>
      </template>
      <button v-else type="button" class="jp-btn jp-btn--primary" @click="start(0)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        Start the visit
      </button>
      <button type="button" class="jp-link" @click="explore">Explore on my own</button>
    </div>

    <!-- Playing / paused / finished -->
    <div v-else ref="barEl" class="jp-bar" :class="{ 'jp-bar--spot': spotOn }">
      <div class="jp-bar__head">
        <span class="jp-bar__step">{{ stepLabel }}</span>
        <span class="jp-bar__title">{{ kind === 'area' || (state === 'done' && stopAfter === null) ? journey.title : journey.chapters[chapter]?.title }}</span>
        <button type="button" class="jp-x" aria-label="End the visit" title="End the visit" @click="end">×</button>
      </div>

      <p class="jp-caption" :class="{ 'jp-caption--off': !captionsOn && state === 'playing' }">
        <template v-if="state === 'paused' && pausedByUser">You're looking around. The visit carries on from here when you're ready.</template>
        <template v-else-if="state === 'done' && stopAfter !== null">End of this step.</template>
        <template v-else-if="state === 'done' && kind === 'area'">That's {{ journey.title }}. Pick another area, or look around.</template>
        <template v-else-if="state === 'done' && kind === 'route'">You're here. Look around, or pick another area.</template>
        <template v-else-if="state === 'done'">Thanks for visiting. Look around as long as you like.</template>
        <template v-else-if="captionsOn">{{ caption || ' ' }}</template>
      </p>

      <!-- One segment per line of this step, filling as it's said (like a status clip) -->
      <!-- ‹ › skip line by line within this step (the buttons below skip steps) -->
      <div class="jp-seek">
        <button
          v-if="segFills.length > 1" type="button" class="jp-chev" aria-label="Previous line" title="Previous line"
          :disabled="lineNow <= 0" @click="goLine(lineNow - 1)"
        ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>
        <div class="jp-progress" aria-hidden="true">
          <i v-for="(f, n) in segFills" :key="`${chapter}:${n}`"><b :style="{ transform: `scaleX(${f})` }" /></i>
        </div>
        <button
          v-if="segFills.length > 1" type="button" class="jp-chev" aria-label="Next line" title="Next line"
          :disabled="lineNow >= segFills.length - 1" @click="goLine(lineNow + 1)"
        ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
      </div>

      <div class="jp-controls">
        <template v-if="state === 'done'">
          <button v-if="kind !== 'route'" type="button" class="jp-btn jp-btn--ghost" @click="goChapter(stopAfter ?? 0, stopAfter !== null)">Watch again</button>
          <button type="button" class="jp-btn" @click="explore">Explore on my own</button>
        </template>
        <template v-else>
          <button v-if="journey.chapters.length > 1" type="button" class="jp-icon" aria-label="Previous step" title="Previous step" :disabled="chapter === 0" @click="goChapter(chapter - 1, stopAfter !== null)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6v12L9.5 12z"/></svg>
          </button>
          <button v-if="state === 'paused'" type="button" class="jp-btn jp-btn--primary jp-btn--play" @click="resume">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <span class="jp-btn__label">{{ pausedByUser ? 'Resume visit' : 'Play' }}</span>
          </button>
          <button v-else type="button" class="jp-btn jp-btn--play" @click="pause(false)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
            <span class="jp-btn__label">Pause</span>
          </button>
          <button v-if="journey.chapters.length > 1" type="button" class="jp-icon" aria-label="Next step" title="Next step" :disabled="chapter >= journey.chapters.length - 1" @click="goChapter(chapter + 1, stopAfter !== null)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4 18V6l10.5 6z"/></svg>
          </button>
          <button type="button" class="jp-icon jp-icon--cc" :class="{ 'is-on': captionsOn }" :aria-pressed="captionsOn" :aria-label="captionsOn ? 'Hide captions' : 'Show captions'" :title="captionsOn ? 'Hide captions' : 'Show captions'" @click="toggleCaptions">CC</button>
          <button type="button" class="jp-icon" :aria-label="muted ? 'Sound on' : 'Sound off'" :title="muted ? 'Sound on' : 'Sound off'" @click="toggleMute">
            <svg v-if="!muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/></svg>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Plays a Journey (shared/utils/journey.ts): walks, turns, cards and
// narration in order, with nobody pressing anything after "Start".
//
// Every action can be run again from its beginning (walk = "be in that room",
// card = "this card open"), so Pause just stops the current action and Resume
// starts it over, except a line of narration, which carries on mid-sentence.
// Dragging the view pauses; Resume carries on from there.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { deg, journeyMinutes, speakMs, type Journey, type JourneyAction, type JourneyView } from '~/shared/utils/journey'
import { runLine } from '~/shared/utils/lineClock'

export interface JourneyApi {
  /** Walk to a scene through the tour's links. Resolves on arrival (or when stopped). */
  walkTo(sceneId: string, stopped: () => boolean, direct?: boolean): Promise<void>
  /** Straight to a scene (used by Next / Back), facing `view` at its zoom (wide when none). */
  jumpTo(sceneId: string, view?: { yaw: number; pitch: number; zoom?: number }): Promise<void>
  /** Zoom back out to the normal wide view, keeping the direction. No-op when already wide. */
  widen(ms: number): Promise<void>
  look(to: { yaw: number; pitch: number; zoom?: number }, ms: number): Promise<void>
  /** One slow eased turn of the whole room, ending where it started. */
  lookAround(ms: number, stopped: () => boolean): Promise<void>
  stopCamera(): void
  openCard(hotspotId: string): Promise<void>
  closeCard(): void
  /** A pulsing marker at a spot (radians) while a line is read; hidePin takes it away. */
  showPin?(pin: { yaw: number; pitch: number; label?: string }): void
  hidePin?(): void
  /**
   * Opens one of this room's Object Spotlights (its key) with no tap, using
   * `voice` (the visit's own audio element, already allowed to play) for its
   * recording. Resolves once it has closed; stopSpotlight closes it early.
   */
  /** bottomInset: px of the view the visit's bar covers (the spotlight keeps clear of it). */
  /** Resolves when it has closed, with how ('moved': the visitor took the camera). */
  playSpotlight?(key: string, voice: HTMLAudioElement | null, bottomInset?: number): Promise<string | undefined>
  stopSpotlight?(): void
  /** The element the visitor drags; pressing on it pauses the visit. */
  container(): HTMLElement | null
}

/**
 * Play something now. The editor's preview: from a step of `journey`, or just
 * that step. The tour: `adhoc` = an area's guide or directions, played
 * straight away (no start card).
 */
export interface JourneyCommand { journey: number; chapter: number; only?: boolean; nonce: number; adhoc?: Journey | null }

/** What visitors do, for the owner's dashboard (visit_events). Never sent from the editor's preview. */
export interface JourneyTrack { event: 'visit_start' | 'step_reached' | 'visit_complete' | 'visit_exit' | 'area_complete' | 'route_arrive'; journeyId?: string; sceneId?: string; step?: number; value?: number }

const props = defineProps<{
  journeys: Journey[]
  api: JourneyApi
  /** Editor preview: no start card; it waits for `command`. */
  preview?: boolean
  command?: JourneyCommand | null
}>()
const emit = defineEmits<{ (e: 'end'): void; (e: 'explore'): void; (e: 'state', s: string): void; (e: 'chapter', i: number): void; (e: 'track', t: JourneyTrack): void }>()

const state = ref<'idle' | 'intro' | 'playing' | 'paused' | 'done'>(props.preview ? 'idle' : 'intro')
const ji = ref(0)
/** An area's guide or directions, played instead of a visit until the next Start. */
const adhoc = ref<Journey | null>(null)
const journey = computed<Journey>(() => adhoc.value ?? props.journeys[ji.value] ?? props.journeys[0]!)
const kind = computed(() => journey.value.kind ?? 'visit')
const stepLabel = computed(() => {
  const finished = state.value === 'done' && stopAfter.value === null
  if (kind.value === 'area') return finished ? 'Area guide · done' : 'Area guide'
  if (kind.value === 'route') return finished ? 'Arrived' : `Directions · ${chapter.value + 1} of ${journey.value.chapters.length}`
  return finished ? 'Visit complete' : `Step ${chapter.value + 1} of ${journey.value.chapters.length}`
})
/** Set when only one step is being played (editor "Play this step"). */
const stopAfter = ref<number | null>(null)
const chapter = ref(0)
const action = ref(0)
const caption = ref('')
const muted = ref(false)
const pausedByUser = ref(false)
/** A spotlight is playing as part of the visit: the bar folds down to its controls. */
const spotOn = ref(false)
const barEl = ref<HTMLElement | null>(null)
/** How much of the view's bottom the bar covers, plus a little air (read once, before the effect). */
function barInset(): number {
  const bar = barEl.value
  const view = props.api.container()
  if (!bar || !view) return 0
  const b = bar.getBoundingClientRect(), v = view.getBoundingClientRect()
  return Math.max(0, Math.round(v.bottom - b.top + 12))
}
const minutesOf = (j: Journey) => journeyMinutes(j)

// ── Progress: one segment per line of the step on screen ──────────────────
// Like a status clip: the line being said fills its segment as the voice goes,
// lines already said are full, and the next step starts a fresh set.
/** How far the line being said has got (0–1). */
const lineFrac = ref(0)
// A spotlight counts as a line too: it gets its own segment, filled as it reads.
const speaks = (a: JourneyAction | undefined) => !!a && (('say' in a && !!a.say) || 'spot' in a)
/** Where each segment's line sits in this step's actions. */
const segAt = computed<number[]>(() => {
  const acts = journey.value.chapters[chapter.value]?.actions ?? []
  const idx = acts.map((a, i) => (speaks(a) ? i : -1)).filter(i => i >= 0)
  return idx.length ? idx : [Math.max(0, acts.length - 1)] // a quiet step: one segment
})
/** The line on screen (or coming up next); past the end once the step is done. */
const lineNow = computed(() => {
  if (state.value === 'done') return segAt.value.length
  const n = segAt.value.findIndex(i => i >= action.value)
  return n < 0 ? segAt.value.length - 1 : n
})
const segFills = computed<number[]>(() => {
  const acts = journey.value.chapters[chapter.value]?.actions ?? []
  const idx = segAt.value
  if (state.value === 'done') return idx.map(() => 1)
  return idx.map((i) => {
    if (action.value > i) return 1
    if (action.value < i) return 0
    return speaks(acts[i]) ? Math.min(1, Math.max(0, lineFrac.value)) : 0
  })
})
watch(chapter, (i) => emit('chapter', i))

// ── Analytics: a visit's start, each step reached, and how it ended ────────
// One "run" per Start / area / directions; Watch again starts a new one.
let tracked: { journey: Journey; at: number; steps: Set<number>; ended: boolean } | null = null
function track(t: JourneyTrack) { if (!props.preview) emit('track', t) }
function beginTracking() {
  tracked = { journey: journey.value, at: Date.now(), steps: new Set(), ended: false }
  if (kind.value === 'visit' && journey.value.id) track({ event: 'visit_start', journeyId: journey.value.id })
}
function trackStep(i: number) {
  const t = tracked
  if (!t || t.journey !== journey.value || t.steps.has(i) || stopAfter.value !== null) return
  t.steps.add(i)
  if (kind.value === 'visit' && t.journey.id) track({ event: 'step_reached', journeyId: t.journey.id, step: i })
}
function trackEnd(finished: boolean) {
  const t = tracked
  if (!t || t.ended || t.journey !== journey.value) return
  t.ended = true
  const j = t.journey
  if (j.kind === 'area' && finished && j.sceneId) track({ event: 'area_complete', sceneId: j.sceneId })
  else if (j.kind === 'route' && finished && j.sceneId) track({ event: 'route_arrive', sceneId: j.sceneId })
  else if ((j.kind ?? 'visit') === 'visit' && j.id) {
    if (finished) track({ event: 'visit_complete', journeyId: j.id, value: Date.now() - t.at })
    else track({ event: 'visit_exit', journeyId: j.id, step: Math.max(0, ...t.steps) })
  }
}

/** Each run gets a number; anything from an older run sees it is stopped. */
let run = 0

function setState(s: typeof state.value) {
  state.value = s
  emit('state', s)
}

// ── Narration ──────────────────────────────────────────────────────────────
// Each line plays its own recording (made once by the TTS worker, served from
// R2) through one <audio> element. The clip is the clock: the visit moves on
// when it ends, and Pause/Resume pick it up mid-sentence. A line without a
// recording shows its caption for a reading time.
let clip: HTMLAudioElement | null = null
let unlocked = false
// A moment of silence, played on the visitor's first tap so iOS lets this
// element play later lines by itself (Safari only allows sound after a tap).
const SILENCE = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='
function unlockAudio() {
  // Once is enough, and never over a line that's loaded (e.g. paused mid-sentence).
  if (!clip || unlocked || (clip.getAttribute('src') && clip.getAttribute('src') !== SILENCE)) return
  unlocked = true
  try {
    clip.src = SILENCE
    const p = clip.play()
    // Only a refusal means "still locked". AbortError just means the first line
    // took over the element before the silence finished, which is fine.
    if (p) p.catch((e: any) => { if (e?.name === 'NotAllowedError') unlocked = false })
  } catch { unlocked = false }
}

/** Where a paused line got to, so Resume carries on mid-sentence. */
let resumeAt: { key: string; at: number } | null = null
const lineKey = () => `${ji.value}:${chapter.value}:${action.value}`

async function say(text: string, stopped: () => boolean, audio?: string, ms?: number): Promise<void> {
  lineFrac.value = 0
  caption.value = text
  const key = lineKey()
  const from = resumeAt?.key === key ? resumeAt.at : 0
  resumeAt = null
  let use: HTMLAudioElement | null = null
  if (audio && clip) {
    if (clip.getAttribute('src') !== audio) clip.src = audio
    clip.muted = muted.value
    use = clip
  }
  preloadAhead()
  const r = await runLine({
    clip: use, ms: ms ?? speakMs(text), from, stopped,
    onProgress: (at, of) => { if (!stopped()) lineFrac.value = of > 0 ? at / of : 0 },
  })
  if (!r.finished) resumeAt = { key, at: r.at }
}

// Fetch the next couple of recordings ahead of time (they're cached for good).
const preloaded = new Map<string, HTMLAudioElement>()
function preloadAhead() {
  if (typeof Audio === 'undefined') return
  const want: string[] = []
  const chapters = journey.value.chapters
  for (let c = chapter.value, a = action.value + 1; c < chapters.length && want.length < 2; c++, a = 0) {
    for (const act of chapters[c]!.actions.slice(a)) {
      if ('audio' in act && act.audio) want.push(act.audio)
      if (want.length >= 2) break
    }
  }
  for (const url of want) {
    if (preloaded.has(url)) continue
    const el = new Audio()
    el.preload = 'auto'
    el.src = url
    preloaded.set(url, el)
  }
  while (preloaded.size > 4) {
    const [url, el] = preloaded.entries().next().value!
    el.removeAttribute('src')
    preloaded.delete(url)
  }
}

const CAPTIONS_KEY = 'viewora:journey-captions'
const captionsOn = ref(true)
function toggleCaptions() {
  captionsOn.value = !captionsOn.value
  try { localStorage.setItem(CAPTIONS_KEY, captionsOn.value ? '1' : '0') } catch { /* private mode */ }
}

const sleep = (ms: number, stopped: () => boolean) => new Promise<void>((resolve) => {
  const end = Date.now() + ms
  const t = setInterval(() => { if (stopped() || Date.now() >= end) { clearInterval(t); resolve() } }, 50)
})

const view = (v: JourneyView) => ({ yaw: deg(v.yaw), pitch: deg(v.pitch ?? 0), ...(v.zoom != null ? { zoom: v.zoom } : {}) })

// ── Running ────────────────────────────────────────────────────────────────
async function exec(a: JourneyAction, stopped: () => boolean) {
  if ('walk' in a) {
    props.api.closeCard()
    if (!a.say) caption.value = '' // last line is done; don't leave it up while walking
    // Step back from a close-up before moving on, like looking up before walking.
    await props.api.widen(800)
    if (stopped()) return
    await Promise.all([
      props.api.walkTo(a.walk, stopped, a.direct),
      a.say ? say(a.say, stopped) : Promise.resolve(),
    ])
    // Turn to what this step is about, then lean in when it was set zoomed.
    if (a.face && !stopped()) {
      const f = view(a.face)
      await props.api.look({ yaw: f.yaw, pitch: f.pitch }, 900)
      if (f.zoom && !stopped()) await props.api.look(f, 1100)
    }
  } else if ('look' in a) {
    const v = view(a.look)
    if (a.reframe) {
      // Zoom out, turn, zoom in: the same move as between steps, within one photo.
      await props.api.widen(700)
      if (!stopped()) await props.api.look({ yaw: v.yaw, pitch: v.pitch }, a.ms ?? 1000)
      if (v.zoom && !stopped()) await props.api.look(v, 1000)
    } else {
      await props.api.look(v, a.ms ?? 1500)
    }
  } else if ('around' in a) {
    await Promise.all([
      props.api.lookAround(a.around, stopped),
      a.say ? say(a.say, stopped) : Promise.resolve(),
    ])
  } else if ('card' in a) {
    await props.api.openCard(a.card)
    if (a.say) await say(a.say, stopped, a.audio, a.ms)
    else await sleep(a.hold ?? 4000, stopped)
    if (!stopped()) {
      props.api.closeCard()
      await sleep(900, stopped) // let the camera settle back before moving on
    }
  } else if ('spot' in a) {
    if (a.say) await say(a.say, stopped, a.audio, a.ms)
    if (stopped() || !props.api.playSpotlight) return
    caption.value = ''
    lineFrac.value = 0
    // The bar folds to its controls (the spotlight's own panel has the words),
    // and the spotlight is told how much of the view the bar still covers.
    spotOn.value = true
    await nextTick()
    const inset = barInset()
    // Its recording plays through the visit's own element (sound is allowed on
    // it), so the segment fills from that clip as the spotlight reads.
    const el = clip
    const tick = () => { if (el && el.duration > 0 && !stopped()) lineFrac.value = Math.min(1, el.currentTime / el.duration) }
    el?.addEventListener('timeupdate', tick)
    if (el) el.muted = muted.value
    let why: string | undefined
    try { why = await props.api.playSpotlight(a.spot, el, inset) }
    finally { el?.removeEventListener('timeupdate', tick); spotOn.value = false }
    // Dragged the view away: the visitor is looking around, so the visit waits
    // (the spotlight plays again on Resume).
    if (why === 'moved' && !stopped()) { pause(true); return }
    if (!stopped()) await sleep(500, stopped) // a breath before the visit carries on
  } else if ('say' in a) {
    if (a.pin) props.api.showPin?.({ yaw: deg(a.pin.yaw), pitch: deg(a.pin.pitch), label: a.pin.label })
    await say(a.say, stopped, a.audio, a.ms)
    if (a.pin && !stopped()) props.api.hidePin?.()
  } else if ('wait' in a) {
    await sleep(a.wait, stopped)
  }
}

async function play() {
  const me = ++run
  const stopped = () => me !== run
  setState('playing')
  pausedByUser.value = false
  while (!stopped()) {
    const c = journey.value.chapters[chapter.value]
    if (!c) break
    trackStep(chapter.value)
    const a = c.actions[action.value]
    if (!a) {
      if (stopAfter.value === chapter.value) break
      if (chapter.value >= journey.value.chapters.length - 1) break
      chapter.value++
      action.value = 0
      continue
    }
    try { await exec(a, stopped) } catch { /* a failed step shouldn't end the visit */ }
    if (stopped()) return
    action.value++
    lineFrac.value = 0
  }
  if (stopped()) return
  caption.value = ''
  if (stopAfter.value === null) trackEnd(true)
  setState('done')
}

function halt() {
  run++
  clip?.pause()
  props.api.stopSpotlight?.()
  props.api.stopCamera()
}

function start(i: number) {
  unlockAudio()
  trackEnd(false)
  adhoc.value = null
  ji.value = i
  stopAfter.value = null
  beginTracking()
  void goChapter(0) // straight to the first step, facing its view
}

// ── Continue where you left off ────────────────────────────────────────────
// Where a visit was left (step + line), kept for this browser session, so the
// visit's intro can offer to carry on from there instead of the first step.
type LeftAt = { chapter: number; line: number }
const LEFT_KEY = 'vw-visit-left:'
const leftKey = (j: Journey | undefined) => (j ? LEFT_KEY + (j.id || j.title) : '')
const leftTick = ref(0) // re-reads storage after a save or clear
function leftAt(i: number): LeftAt | null {
  void leftTick.value
  const j = props.journeys[i]
  if (!j || props.preview) return null
  try {
    const v = JSON.parse(sessionStorage.getItem(leftKey(j)) || 'null') as LeftAt | null
    if (!v || !j.chapters[v.chapter] || (v.chapter === 0 && v.line === 0)) return null
    return v
  } catch { return null }
}
function leftAtLabel(i: number) {
  const v = leftAt(i)!
  const j = props.journeys[i]!
  const c = j.chapters[v.chapter]!
  const lines = c.actions.filter(speaks).length || 1
  return `Step ${v.chapter + 1}: ${c.title} · line ${Math.min(v.line, lines - 1) + 1} of ${lines}`
}
function saveLeftAt(v: LeftAt | null) {
  if (props.preview || adhoc.value || kind.value !== 'visit') return
  try {
    if (v) sessionStorage.setItem(leftKey(journey.value), JSON.stringify(v))
    else sessionStorage.removeItem(leftKey(journey.value))
  } catch { /* private mode: nothing to offer later */ }
  leftTick.value++
}
// Kept up to date as the visit goes (not "Play this step" from the editor).
watch([chapter, lineNow, state], () => {
  if (stopAfter.value !== null) return
  if (state.value === 'done') saveLeftAt(null) // finished: the next one starts fresh
  else if (state.value === 'playing' || state.value === 'paused') saveLeftAt({ chapter: chapter.value, line: lineNow.value })
})

/** "Continue where you left off": the step's photo, then that line, said again from its start. */
async function continueVisit(i: number) {
  const v = leftAt(i)
  if (!v) return start(i)
  unlockAudio()
  trackEnd(false)
  adhoc.value = null
  ji.value = i
  stopAfter.value = null
  beginTracking()
  if (v.line === 0) return goChapter(v.chapter)
  const c = journey.value.chapters[v.chapter]!
  halt()
  resumeAt = null
  props.api.closeCard()
  props.api.hidePin?.()
  chapter.value = v.chapter
  action.value = 0
  lineFrac.value = 0
  caption.value = ''
  setState('playing')
  const me = run
  await props.api.jumpTo(c.scene, c.view ? view(c.view) : undefined)
  if (me === run) void goLine(Math.min(v.line, segAt.value.length - 1))
}

function pause(byUser: boolean) {
  if (state.value !== 'playing') return
  halt()
  pausedByUser.value = byUser
  setState('paused')
}

function resume() {
  if (state.value !== 'paused') return
  unlockAudio()
  void play() // the interrupted action starts over; a line picks up where it stopped
}

async function goChapter(i: number, only = false) {
  const c = journey.value.chapters[i]
  if (!c) return
  if (state.value === 'done' && i === 0 && !only) beginTracking() // Watch again
  unlockAudio() // Next, Back, Watch again: all taps
  halt()
  resumeAt = null
  stopAfter.value = only ? i : null
  props.api.closeCard()
  props.api.hidePin?.()
  lineFrac.value = 0
  chapter.value = i
  action.value = 0
  caption.value = ''
  setState('playing')
  const me = run
  await props.api.jumpTo(c.scene, c.view ? view(c.view) : undefined)
  if (me === run) void play()
}

/**
 * ‹ / ›: play line n of this step. The camera first turns to where that line
 * is said (its own turn, or the last one before it), then the visit carries
 * on from there as usual.
 */
async function goLine(n: number) {
  const c = journey.value.chapters[chapter.value]
  const idx = segAt.value
  if (!c || n < 0 || n >= idx.length) return
  if (n === 0) return goChapter(chapter.value, stopAfter.value !== null) // from the top of the step
  unlockAudio()
  halt()
  resumeAt = null
  props.api.closeCard()
  props.api.hidePin?.()
  const start = idx[n - 1]! + 1 // right after the line before: includes this line's own turn
  action.value = start
  lineFrac.value = 0
  caption.value = ''
  setState('playing')
  const me = run
  const first = c.actions[start]
  // A turn, an info card or a spotlight moves the camera itself; otherwise face where the line is said.
  if (!(first && ('look' in first || 'card' in first || 'spot' in first))) {
    let face: JourneyView | undefined = c.view
    for (let i = start - 1; i >= 0; i--) {
      const a = c.actions[i]!
      if ('look' in a) { face = a.look; break }
      if ('walk' in a && a.face) { face = a.face; break }
    }
    if (face) await props.api.look(view(face), 700)
  }
  if (me === run) void play()
}

function toggleMute() {
  muted.value = !muted.value
  if (clip) clip.muted = muted.value // the line keeps its timing, just silent
}

function end() {
  if (state.value !== 'done') trackEnd(false)
  halt()
  props.api.closeCard()
  props.api.hidePin?.()
  caption.value = ''
  if (props.preview) setState('idle')
  emit('end')
}

/** "Explore on my own": end, and tell the tour the visitor wants to look around freely. */
function explore() {
  end()
  emit('explore')
}

// Each new command plays from that step (or just that step), or an area's
// guide / directions. Immediate: the tour mounts the player with one when the
// visitor picks an area after closing the visit.
let mounting = true
watch(() => props.command?.nonce, () => {
  const initial = mounting
  mounting = false
  const c = props.command
  if (!c) return
  // On mount, only an area / directions plays at once (an editor command left
  // over from before a remount must not replay).
  if (initial && !c.adhoc) return
  unlockAudio()
  // Whatever was playing ends here (a visit left for an area counts as left).
  if (state.value === 'playing' || state.value === 'paused') trackEnd(false)
  adhoc.value = c.adhoc ?? null
  if (!c.adhoc) ji.value = Math.min(Math.max(0, c.journey), props.journeys.length - 1)
  stopAfter.value = c.only ? c.chapter : null
  if (c.adhoc || c.chapter === 0) beginTracking()
  void goChapter(c.chapter, !!c.only)
}, { immediate: true })

// Dragging, scrolling or tapping the view takes the camera back: pause.
// While a spotlight plays, a tap is the spotlight's (on a phone it folds the
// panel to show the object); a drag closes it and the visit pauses then.
function onUserMove() { if (!spotOn.value) pause(true) }
let watched: HTMLElement | null = null
onMounted(() => {
  clip = new Audio()
  clip.preload = 'auto'
  clip.setAttribute('playsinline', '')
  try { captionsOn.value = localStorage.getItem(CAPTIONS_KEY) !== '0' } catch { /* private mode */ }
  watched = props.api.container()
  watched?.addEventListener('pointerdown', onUserMove, true)
  watched?.addEventListener('wheel', onUserMove, { capture: true, passive: true })
})
onBeforeUnmount(() => {
  if (state.value === 'playing' || state.value === 'paused') trackEnd(false)
  halt()
  props.api.hidePin?.()
  clip?.removeAttribute('src')
  clip = null
  for (const el of preloaded.values()) el.removeAttribute('src')
  preloaded.clear()
  watched?.removeEventListener('pointerdown', onUserMove, true)
  watched?.removeEventListener('wheel', onUserMove, true)
})
</script>

<style scoped>
.jp { position: absolute; inset: 0; z-index: 45; pointer-events: none; font-family: inherit; }
.jp > * { pointer-events: auto; }
.jp--intro { pointer-events: auto; background: rgba(10, 12, 18, 0.45); display: grid; place-items: center; padding: 16px; }

.jp-intro { width: min(420px, 100%); padding: 22px; border-radius: 22px; background: #fff; color: #111827; box-shadow: 0 18px 48px rgba(0,0,0,0.35); text-align: center; }
.jp-intro__eyebrow { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #e11d48; }
.jp-intro__title { margin: 6px 0 0; font-size: 22px; font-weight: 800; line-height: 1.2; }
.jp-intro__sub { margin: 6px 0 0; font-size: 14px; color: #4b5563; line-height: 1.4; }
.jp-intro__steps { list-style: none; margin: 16px 0 18px; padding: 0; display: grid; gap: 6px; text-align: left; }
.jp-intro__steps li { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; }
.jp-intro__steps span { flex-shrink: 0; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #fff1f2; color: #be123c; font-size: 12px; font-weight: 800; }
.jp-choices { display: grid; gap: 8px; margin: 16px 0 6px; }
.jp-choice { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 14px; background: #fff; color: #111827; font: inherit; text-align: left; cursor: pointer; }
.jp-choice:hover { border-color: #e11d48; background: #fff1f2; }
.jp-choice svg { flex-shrink: 0; color: #e11d48; }
.jp-choice__text { flex: 1; min-width: 0; display: grid; gap: 2px; }
.jp-choice__title { font-size: 15px; font-weight: 800; }
.jp-choice__meta { font-size: 12px; color: #6b7280; font-weight: 600; }
.jp-link { margin-top: 10px; padding: 6px; border: 0; background: none; color: #6b7280; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.jp-link:hover { color: #111827; text-decoration: underline; }

.jp-bar { position: absolute; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); width: min(520px, calc(100% - 24px)); padding: 12px 14px; border-radius: 18px; background: rgba(255, 255, 255, 0.97); color: #111827; transform: translateX(-50%); box-shadow: 0 10px 32px rgba(0,0,0,0.3); }
.jp-bar__head { display: flex; align-items: baseline; gap: 8px; }
.jp-bar__step { flex-shrink: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #e11d48; }
.jp-bar__title { flex: 1; min-width: 0; font-size: 15px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jp-x { flex-shrink: 0; align-self: center; width: 30px; height: 30px; border: 0; border-radius: 10px; background: transparent; color: #6b7280; font-size: 22px; line-height: 1; cursor: pointer; }
.jp-x:hover { background: #f3f4f6; }
.jp-caption { margin: 8px 0 0; min-height: 2.8em; font-size: 15px; line-height: 1.4; color: #1f2937; }
.jp-caption--off { min-height: 0; margin: 0; }

.jp-seek { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; }
.jp-seek .jp-progress { flex: 1; margin: 0; }
.jp-chev { flex-shrink: 0; display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 50%; background: #f3f4f6; color: #111827; cursor: pointer; }
.jp-chev:hover:not(:disabled) { background: #e5e7eb; }
.jp-chev:disabled { opacity: 0.35; cursor: default; }
.jp-progress { display: flex; gap: 4px; margin: 10px 0 0; }
.jp-progress i { flex: 1; height: 5px; border-radius: 4px; background: #e5e7eb; overflow: hidden; }
/* Scaled, not resized: the fill moves on the compositor, no layout per tick. */
.jp-progress b { display: block; height: 100%; background: #e11d48; transform-origin: left center; transition: transform 0.12s linear; }

.jp-controls { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; }
.jp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 42px; padding: 0 18px; border: 0; border-radius: 12px; background: #111827; color: #fff; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.jp-btn:hover { background: #1f2937; }
.jp-btn--primary { background: #e11d48; }
.jp-btn--primary:hover { background: #be123c; }
.jp-intro .jp-btn { width: 100%; height: 48px; font-size: 15px; }
.jp-btn--ghost { background: #f3f4f6; color: #111827; }
.jp-btn--ghost:hover { background: #e5e7eb; }
.jp-intro .jp-btn--resume { height: auto; min-height: 56px; padding: 8px 18px; }
.jp-resume { display: grid; gap: 1px; text-align: left; }
.jp-resume small { font-size: 12px; font-weight: 600; opacity: 0.9; }
.jp-intro .jp-btn--again { margin-top: 8px; height: 44px; }
.jp-choice__meta--resume { color: #e11d48; }
.jp-btn--play { min-width: 150px; }
/* If a narrow phone wraps the label, the words sit close, left-aligned
   ("Visit" right under "Resume"), next to the icon. */
.jp-btn__label { line-height: 1.1; text-align: left; }
.jp-btn--play svg { flex-shrink: 0; }
/* While a spotlight plays in the visit: no caption (its panel has the words). */
.jp-bar--spot .jp-caption { display: none; }
.jp-icon { display: grid; place-items: center; width: 42px; height: 42px; border: 0; border-radius: 12px; background: #f3f4f6; color: #111827; cursor: pointer; }
.jp-icon:hover { background: #e5e7eb; }
.jp-icon:disabled { opacity: 0.4; cursor: default; }
.jp-icon--cc { font-size: 12px; font-weight: 800; letter-spacing: 0.02em; color: #6b7280; }
.jp-icon--cc.is-on { color: #111827; box-shadow: inset 0 0 0 2px #111827; }

@media (max-width: 480px) {
  .jp-bar { padding: 10px 12px; }
  .jp-caption { font-size: 14px; }
  .jp-btn--play { min-width: 0; flex: 1; padding: 0 12px; gap: 8px; }
}
</style>
