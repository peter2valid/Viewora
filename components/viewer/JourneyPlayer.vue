<template>
  <div v-if="state !== 'idle'" class="jp" :class="{ 'jp--intro': state === 'intro' }" aria-live="polite" @click.stop @pointerdown.stop>
    <!-- Before it starts: one tap (browsers only allow sound after one) -->
    <div v-if="state === 'intro' && journeys.length > 1" class="jp-intro">
      <p class="jp-intro__eyebrow">Guided visits</p>
      <h2 class="jp-intro__title">What brings you here?</h2>
      <p class="jp-intro__sub">Pick a visit and we'll walk you through it, step by step.</p>
      <div class="jp-choices">
        <button v-for="(j, i) in journeys" :key="i" type="button" class="jp-choice" @click="start(i)">
          <span class="jp-choice__text">
            <span class="jp-choice__title">{{ j.title }}</span>
            <span class="jp-choice__meta">{{ j.chapters.length }} {{ j.chapters.length === 1 ? 'step' : 'steps' }} · about {{ minutesOf(j) }} min</span>
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
      <button type="button" class="jp-link" @click="emit('end')">Explore on my own</button>
    </div>
    <div v-else-if="state === 'intro'" class="jp-intro">
      <p class="jp-intro__eyebrow">Guided visit · about {{ minutesOf(journey) }} min</p>
      <h2 class="jp-intro__title">{{ journey.title }}</h2>
      <p v-if="journey.subtitle" class="jp-intro__sub">{{ journey.subtitle }}</p>
      <ol class="jp-intro__steps">
        <li v-for="(c, i) in journey.chapters" :key="i"><span>{{ i + 1 }}</span>{{ c.title }}</li>
      </ol>
      <button type="button" class="jp-btn jp-btn--primary" @click="start(0)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        Start the visit
      </button>
      <button type="button" class="jp-link" @click="emit('end')">Explore on my own</button>
    </div>

    <!-- Playing / paused / finished -->
    <div v-else class="jp-bar">
      <div class="jp-bar__head">
        <span class="jp-bar__step">{{ state === 'done' && stopAfter === null ? 'Visit complete' : `Step ${chapter + 1} of ${journey.chapters.length}` }}</span>
        <span class="jp-bar__title">{{ state === 'done' && stopAfter === null ? journey.title : journey.chapters[chapter]?.title }}</span>
        <button type="button" class="jp-x" aria-label="End the visit" title="End the visit" @click="end">×</button>
      </div>

      <p class="jp-caption">
        <template v-if="state === 'paused' && pausedByUser">You're looking around. The visit carries on from here when you're ready.</template>
        <template v-else-if="state === 'done' && stopAfter !== null">End of this step.</template>
        <template v-else-if="state === 'done'">Thanks for visiting. Look around as long as you like.</template>
        <template v-else>{{ caption || ' ' }}</template>
      </p>

      <div class="jp-progress" aria-hidden="true">
        <i v-for="(c, i) in journey.chapters" :key="i" :class="{ 'is-done': i < chapter || state === 'done', 'is-now': i === chapter && state !== 'done' }" @click="goChapter(i, stopAfter !== null)" />
      </div>

      <div class="jp-controls">
        <template v-if="state === 'done'">
          <button type="button" class="jp-btn jp-btn--ghost" @click="goChapter(stopAfter ?? 0, stopAfter !== null)">Watch again</button>
          <button type="button" class="jp-btn" @click="end">Explore on my own</button>
        </template>
        <template v-else>
          <button type="button" class="jp-icon" aria-label="Previous step" title="Previous step" :disabled="chapter === 0" @click="goChapter(chapter - 1, stopAfter !== null)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM20 6v12L9.5 12z"/></svg>
          </button>
          <button v-if="state === 'paused'" type="button" class="jp-btn jp-btn--primary jp-btn--play" @click="resume">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            {{ pausedByUser ? 'Resume visit' : 'Play' }}
          </button>
          <button v-else type="button" class="jp-btn jp-btn--play" @click="pause(false)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
            Pause
          </button>
          <button type="button" class="jp-icon" aria-label="Next step" title="Next step" :disabled="chapter >= journey.chapters.length - 1" @click="goChapter(chapter + 1, stopAfter !== null)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4 18V6l10.5 6z"/></svg>
          </button>
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
// starts it over. Dragging the view pauses; Resume carries on from there.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { deg, journeyMinutes, speakMs, type Journey, type JourneyAction, type JourneyView } from '~/shared/utils/journey'

export interface JourneyApi {
  /** Walk to a scene through the tour's links. Resolves on arrival (or when stopped). */
  walkTo(sceneId: string, stopped: () => boolean, direct?: boolean): Promise<void>
  /** Straight to a scene (used by Next / Back), facing `view`. */
  jumpTo(sceneId: string, view?: { yaw: number; pitch: number }): Promise<void>
  look(to: { yaw: number; pitch: number; zoom?: number }, ms: number): Promise<void>
  /** One slow eased turn of the whole room, ending where it started. */
  lookAround(ms: number, stopped: () => boolean): Promise<void>
  stopCamera(): void
  openCard(hotspotId: string): Promise<void>
  closeCard(): void
  /** The element the visitor drags; pressing on it pauses the visit. */
  container(): HTMLElement | null
}

/** The editor's preview: play from a step, or just that step. */
export interface JourneyCommand { journey: number; chapter: number; only?: boolean; nonce: number }

const props = defineProps<{
  journeys: Journey[]
  api: JourneyApi
  /** Editor preview: no start card; it waits for `command`. */
  preview?: boolean
  command?: JourneyCommand | null
}>()
const emit = defineEmits<{ (e: 'end'): void; (e: 'state', s: string): void; (e: 'chapter', i: number): void }>()

const state = ref<'idle' | 'intro' | 'playing' | 'paused' | 'done'>(props.preview ? 'idle' : 'intro')
const ji = ref(0)
const journey = computed<Journey>(() => props.journeys[ji.value] ?? props.journeys[0]!)
/** Set when only one step is being played (editor "Play this step"). */
const stopAfter = ref<number | null>(null)
const chapter = ref(0)
const action = ref(0)
const caption = ref('')
const muted = ref(false)
const pausedByUser = ref(false)
const minutesOf = (j: Journey) => journeyMinutes(j)
watch(chapter, (i) => emit('chapter', i))

/** Each run gets a number; anything from an older run sees it is stopped. */
let run = 0

function setState(s: typeof state.value) {
  state.value = s
  emit('state', s)
}

// ── Narration ──────────────────────────────────────────────────────────────
// Prototype voice: the browser's own text-to-speech. A real journey would
// carry recorded audio per line; the caption and timing work the same way.
const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
let voice: SpeechSynthesisVoice | null = null
function pickVoice() {
  const all = synth?.getVoices?.() ?? []
  voice = all.find(v => /en[-_]GB/i.test(v.lang)) ?? all.find(v => /^en/i.test(v.lang)) ?? null
}

function say(text: string, stopped: () => boolean): Promise<void> {
  caption.value = text
  return new Promise((resolve) => {
    let finished = false
    const finish = () => { if (finished) return; finished = true; clearInterval(poll); clearTimeout(timer); resolve() }
    // Stop promptly when paused, whichever way the line is being timed.
    const poll = setInterval(() => { if (stopped()) { synth?.cancel(); finish() } }, 100)
    const fallbackMs = speakMs(text)
    let timer: ReturnType<typeof setTimeout>
    if (!muted.value && synth && voice) {
      const u = new SpeechSynthesisUtterance(text)
      u.voice = voice
      u.lang = voice.lang
      u.rate = 0.95
      u.onend = finish
      u.onerror = finish
      synth.cancel()
      synth.speak(u)
      // Some engines never fire onend: don't hang the visit on them.
      timer = setTimeout(finish, fallbackMs * 2 + 3000)
    } else {
      timer = setTimeout(finish, fallbackMs)
    }
  })
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
    await Promise.all([
      props.api.walkTo(a.walk, stopped, a.direct),
      a.say ? say(a.say, stopped) : Promise.resolve(),
    ])
    if (a.face && !stopped()) await props.api.look(view(a.face), 900)
  } else if ('look' in a) {
    await props.api.look(view(a.look), a.ms ?? 1500)
  } else if ('around' in a) {
    await Promise.all([
      props.api.lookAround(a.around, stopped),
      a.say ? say(a.say, stopped) : Promise.resolve(),
    ])
  } else if ('card' in a) {
    await props.api.openCard(a.card)
    if (a.say) await say(a.say, stopped)
    else await sleep(a.hold ?? 4000, stopped)
    if (!stopped()) {
      props.api.closeCard()
      await sleep(900, stopped) // let the camera settle back before moving on
    }
  } else if ('say' in a) {
    await say(a.say, stopped)
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
  }
  if (stopped()) return
  caption.value = ''
  setState('done')
}

function halt() {
  run++
  synth?.cancel()
  props.api.stopCamera()
}

function start(i: number) {
  pickVoice()
  ji.value = i
  stopAfter.value = null
  void goChapter(0) // straight to the first step, facing its view
}

function pause(byUser: boolean) {
  if (state.value !== 'playing') return
  halt()
  pausedByUser.value = byUser
  setState('paused')
}

function resume() {
  if (state.value !== 'paused') return
  void play() // the interrupted action starts over
}

async function goChapter(i: number, only = false) {
  const c = journey.value.chapters[i]
  if (!c) return
  halt()
  stopAfter.value = only ? i : null
  props.api.closeCard()
  chapter.value = i
  action.value = 0
  caption.value = ''
  setState('playing')
  const me = run
  await props.api.jumpTo(c.scene, c.view ? view(c.view) : undefined)
  if (me === run) void play()
}

function toggleMute() {
  muted.value = !muted.value
  if (muted.value) synth?.cancel()
}

function end() {
  halt()
  props.api.closeCard()
  caption.value = ''
  if (props.preview) setState('idle')
  emit('end')
}

// Editor preview: each new command plays from that step (or just that step).
watch(() => props.command?.nonce, () => {
  const c = props.command
  if (!c) return
  pickVoice()
  ji.value = Math.min(Math.max(0, c.journey), props.journeys.length - 1)
  void goChapter(c.chapter, !!c.only)
})

// Dragging, scrolling or tapping the view takes the camera back: pause.
function onUserMove() { pause(true) }
let watched: HTMLElement | null = null
onMounted(() => {
  pickVoice()
  synth?.addEventListener?.('voiceschanged', pickVoice)
  watched = props.api.container()
  watched?.addEventListener('pointerdown', onUserMove, true)
  watched?.addEventListener('wheel', onUserMove, { capture: true, passive: true })
})
onBeforeUnmount(() => {
  halt()
  synth?.removeEventListener?.('voiceschanged', pickVoice)
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

.jp-progress { display: flex; gap: 4px; margin: 10px 0 0; }
.jp-progress i { flex: 1; height: 5px; border-radius: 4px; background: #e5e7eb; cursor: pointer; transition: background 0.3s; }
.jp-progress i.is-done { background: #fda4af; }
.jp-progress i.is-now { background: #e11d48; }

.jp-controls { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; }
.jp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 42px; padding: 0 18px; border: 0; border-radius: 12px; background: #111827; color: #fff; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.jp-btn:hover { background: #1f2937; }
.jp-btn--primary { background: #e11d48; }
.jp-btn--primary:hover { background: #be123c; }
.jp-intro .jp-btn { width: 100%; height: 48px; font-size: 15px; }
.jp-btn--ghost { background: #f3f4f6; color: #111827; }
.jp-btn--ghost:hover { background: #e5e7eb; }
.jp-btn--play { min-width: 150px; }
.jp-icon { display: grid; place-items: center; width: 42px; height: 42px; border: 0; border-radius: 12px; background: #f3f4f6; color: #111827; cursor: pointer; }
.jp-icon:hover { background: #e5e7eb; }
.jp-icon:disabled { opacity: 0.4; cursor: default; }

@media (max-width: 480px) {
  .jp-bar { padding: 10px 12px; }
  .jp-caption { font-size: 14px; }
  .jp-btn--play { min-width: 0; flex: 1; }
}
</style>
