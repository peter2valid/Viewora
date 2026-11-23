<template>
  <div class="jy-root">
    <div v-if="loading" class="jy-center"><span class="jy-spin" /></div>

    <div v-else-if="loadError" class="jy-center">
      <p class="jy-title">Couldn't load your journeys</p>
      <p v-if="loadError !== true" class="jy-muted">{{ loadError }}</p>
      <button class="jy-btn" @click="init">Try again</button>
    </div>

    <div v-else-if="!enabled" class="jy-center">
      <p class="jy-title">Patient journeys are almost ready</p>
      <p class="jy-muted">They need one database update before journeys can be saved. Please contact Viewora support.</p>
    </div>

    <div v-else-if="!scenes.length" class="jy-center">
      <p class="jy-title">Add your 360° photos first</p>
      <p class="jy-muted">A journey walks patients through your photos. Upload them in the 360° Tour tab, link the rooms, then come back here.</p>
      <button class="jy-btn jy-btn--primary" @click="emit('fix-link', '')">Go to 360° Tour</button>
    </div>

    <!-- No journey yet: start from a common visit -->
    <div v-else-if="!journeys.length" class="jy-center">
      <p class="jy-title">Show patients what their visit looks like</p>
      <p class="jy-muted jy-lead">
        A journey plays by itself: it walks through your hospital from one step to the next and explains what happens at each one.
        Pick the kind of visit to start with. You can rename and change every step.
      </p>
      <div class="jy-starters">
        <button v-for="t in STARTERS" :key="t.title" class="jy-starter" :disabled="creating" @click="createJourney(t)">
          <span class="jy-starter__title">{{ t.title }}</span>
          <span class="jy-starter__steps">{{ t.steps.length ? t.steps.join(' → ') : 'Start with an empty list' }}</span>
        </button>
      </div>
    </div>

    <div v-else class="jy-layout">
      <!-- ── Left: the journey and its steps ── -->
      <aside class="jy-side">
        <div class="jy-tabs" role="tablist" aria-label="Journeys">
          <button
            v-for="(j, i) in journeys" :key="j.id"
            role="tab" class="jy-tab" :class="{ 'jy-tab--on': i === current }" :aria-selected="i === current"
            @click="selectJourney(i)"
          >{{ j.title || 'Untitled' }}</button>
          <button class="jy-tab jy-tab--add" :disabled="creating" title="Add another journey" @click="showStarters = !showStarters">+ New</button>
        </div>
        <div v-if="showStarters" class="jy-starters jy-starters--small">
          <button v-for="t in STARTERS" :key="t.title" class="jy-starter" :disabled="creating" @click="createJourney(t)">
            <span class="jy-starter__title">{{ t.title }}</span>
          </button>
        </div>

        <template v-if="journey">
          <label class="jy-label" for="jy-title">Journey name</label>
          <input id="jy-title" v-model="journey.title" class="jy-input" maxlength="80" placeholder="e.g. Outpatient visit" @input="saveSoon" />

          <div class="jy-live">
            <button
              type="button" class="jy-switch" :class="{ 'jy-switch--on': journey.is_published }"
              role="switch" :aria-checked="journey.is_published" @click="togglePublished"
            ><span /></button>
            <div>
              <p class="jy-live__title">{{ journey.is_published ? 'Shown on your tour' : 'Not shown yet' }}</p>
              <p class="jy-muted">{{ journey.is_published ? 'Visitors see “Start the visit” when the tour is published.' : 'Turn on when it’s ready for patients.' }}</p>
            </div>
          </div>

          <p class="jy-label">Steps <span class="jy-muted">· about {{ minutes }} min</span></p>
          <ol class="jy-steps">
            <template v-for="(s, i) in journey.steps" :key="s.id">
              <li>
                <button class="jy-step" :class="{ 'jy-step--on': i === selected, 'jy-step--todo': !s.scene_id }" @click="selectStep(i)">
                  <span class="jy-step__n">{{ i + 1 }}</span>
                  <span class="jy-step__thumb" :style="thumbStyle(s.scene_id)">
                    <svg v-if="!s.scene_id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  </span>
                  <span class="jy-step__text">
                    <span class="jy-step__title">{{ s.title || `Step ${i + 1}` }}</span>
                    <span class="jy-step__meta">{{ stepMeta(s) }}</span>
                  </span>
                </button>
              </li>
              <li v-if="i < journey.steps.length - 1" class="jy-link" :class="`jy-link--${links[i]?.kind}`">
                <template v-if="links[i]?.kind === 'gap'">
                  <span>Not connected: there's no way to walk here.</span>
                  <button class="jy-linkbtn" @click="emit('fix-link', s.scene_id!)">Fix the link</button>
                </template>
                <template v-else-if="links[i]?.kind === 'walk'">walks through {{ links[i]!.rooms }} {{ links[i]!.rooms === 1 ? 'room' : 'rooms' }}</template>
                <template v-else-if="links[i]?.kind === 'same'">same photo</template>
                <template v-else>↓</template>
              </li>
            </template>
          </ol>
          <button class="jy-btn jy-btn--wide" @click="addStep()">+ Add a step</button>

          <ul v-if="checks.length" class="jy-checks">
            <li v-for="c in checks" :key="c">{{ c }}</li>
          </ul>

          <!-- Voice: one recording per line, made in one go when you're done writing. -->
          <div class="jy-voice">
            <p class="jy-label">Voice</p>
            <div class="jy-voices" role="radiogroup" aria-label="Who reads this journey">
              <div
                v-for="v in JOURNEY_VOICES" :key="v.id" class="jy-voicepick"
                :class="{ 'jy-voicepick--on': journey.narration_voice === v.id }"
              >
                <button
                  class="jy-voicepick__main" role="radio" :aria-checked="journey.narration_voice === v.id"
                  :disabled="voiceBusy || voiceSaving || !voiceEnabled" @click="setVoice(v.id)"
                >
                  <span class="jy-voicepick__dot" aria-hidden="true" />
                  <span><b>{{ v.name }}</b><small>{{ v.about }}</small></span>
                </button>
                <button
                  class="jy-hear" :class="{ 'jy-hear--on': sampling === v.id }"
                  :aria-label="sampling === v.id ? 'Stop' : `Hear ${v.name}`" :title="sampling === v.id ? 'Stop' : `Hear ${v.name}`"
                  @click="sample(v.id)"
                >{{ sampling === v.id ? '■' : '▶' }}</button>
              </div>
            </div>
            <p class="jy-muted">{{ voiceText }}</p>
            <div v-if="voiceBusy" class="jy-voice__bar" aria-hidden="true"><i :style="{ width: voicePct + '%' }" /></div>
            <button
              class="jy-btn jy-btn--wide" :disabled="!voiceStats.need || voiceBusy || !voiceEnabled"
              @click="generateVoice()"
            >{{ voiceBusy ? 'Recording…' : voiceStats.need ? `Generate voice (${voiceStats.need} ${voiceStats.need === 1 ? 'line' : 'lines'})` : 'Every line has a voice' }}</button>
          </div>

          <div class="jy-side__foot">
            <span class="jy-muted">{{ saveLabel }}</span>
            <button class="jy-linkbtn jy-linkbtn--danger" @click="deleteJourney">Delete this journey</button>
          </div>
        </template>
      </aside>

      <!-- ── Right: the live preview and the selected step ── -->
      <section class="jy-main">
        <div class="jy-preview">
          <ClientOnly>
            <PsvViewer
              v-if="previewTour"
              ref="viewerRef"
              :tour="previewTour"
              hide-own-chrome
              hide-intro
              journey-preview
              :journey-command="command"
              @journey-chapter="onChapter"
            />
          </ClientOnly>
          <!-- Phone check: what an upright phone shows of this view, the visit's box shaded -->
          <div v-if="phoneOn && phoneWin" class="jy-phone" aria-hidden="true" :style="phoneWin">
            <span class="jy-phone__tag">Phone</span>
            <span class="jy-phone__box" :style="{ top: phoneBoxTop }"><span>Visit box</span></span>
          </div>
          <!-- Phone view: save the framing to a line without scrolling down to Facing.
               ‹ › pick the line (the preview stays where it is). -->
          <div v-if="phoneOn && !placing && step && activeK >= 0 && phoneWin" class="jy-phonesave" :style="{ maxWidth: `calc(${phoneWin.left} - 24px)` }">
            <button type="button" class="jy-phonesave__nav" :disabled="activeK <= 0" aria-label="Previous line" @click="markLine(activeK - 1)">‹</button>
            <span class="jy-phonesave__line" :title="step.sentences[activeK]?.text || ''">Line {{ activeK + 1 }}/{{ step.sentences.length }}</span>
            <button type="button" class="jy-phonesave__nav" :disabled="activeK >= step.sentences.length - 1" aria-label="Next line" @click="markLine(activeK + 1)">›</button>
            <button type="button" class="jy-btn jy-btn--primary jy-phonesave__go" :disabled="!previewReady" @click="setLineView(activeK)">
              {{ lineView(activeK) ? 'Update' : 'Use this view' }}<span class="jy-phonesave__for"> for line {{ activeK + 1 }}</span>
            </button>
          </div>
          <button
            v-if="!placing" type="button" class="jy-phonebtn" :class="{ 'is-on': phoneOn }" :aria-pressed="phoneOn"
            title="Show what a phone held upright sees of this view" @click="togglePhone"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>
            Phone view
          </button>
          <div v-if="!placing" class="jy-preview__bar">
            <button class="jy-btn jy-btn--primary" :disabled="!playable" @click="playAll">▶ Play the whole visit</button>
          </div>
          <div v-else class="jy-placebar" role="status">
            <span>📍 Drag the marker onto the spot, or click where it should go.</span>
            <button class="jy-btn jy-btn--primary" @click="finishPlacing">Done</button>
          </div>
        </div>

        <div v-if="step" class="jy-card">
          <div class="jy-card__head">
            <span class="jy-card__n">Step {{ selected + 1 }}</span>
            <input v-model="step.title" class="jy-input jy-input--title" maxlength="80" placeholder="Name this step, e.g. Reception" aria-label="Step name" @input="saveSoon" />
            <button class="jy-btn jy-btn--icon" title="Move up" :disabled="selected === 0" @click="moveStep(-1)">↑</button>
            <button class="jy-btn jy-btn--icon" title="Move down" :disabled="selected >= journey!.steps.length - 1" @click="moveStep(1)">↓</button>
            <button class="jy-btn jy-btn--icon" title="Remove this step" @click="removeStep">✕</button>
          </div>
          <div v-if="!step.title.trim()" class="jy-chips">
            <button v-for="n in nameIdeas" :key="n" class="jy-chip" @click="step.title = n; saveNow()">{{ n }}</button>
          </div>

          <div class="jy-field jy-field--photo">
            <p class="jy-label">Photo</p>
            <button class="jy-photo" @click="pickerOpen = true">
              <span class="jy-photo__thumb" :style="thumbStyle(step.scene_id)" />
              <span>{{ step.scene_id ? sceneName(step.scene_id) : 'Choose the photo for this step' }}</span>
            </button>
          </div>

          <div class="jy-lines__head">
            <p class="jy-label">What happens here?</p>
            <p class="jy-label jy-lines__facing">Facing</p>
          </div>
          <p class="jy-muted jy-hint">
            One idea per line, read out and shown as a caption. Beside each line, choose what the patient looks at:
            turn the preview (scroll or pinch to zoom in), then press <b>Use this view</b>.
          </p>
          <div v-for="(t, k) in step.sentences" :key="t.id" class="jy-sentence" :class="{ 'jy-sentence--on': activeLineId === t.id }">
            <div class="jy-sentence__side">
              <button
                type="button" class="jy-sentence__n" :aria-pressed="activeLineId === t.id"
                :title="`Show what line ${k + 1} faces`" :aria-label="`Line ${k + 1}: show what it faces in the preview`"
                @click="selectLine(k)"
              >{{ k + 1 }}</button>
              <button
                v-if="freshAudio(t)" class="jy-hear" :class="{ 'jy-hear--on': hearing === t.id }"
                :title="hearing === t.id ? 'Stop' : 'Hear this line'" :aria-label="hearing === t.id ? 'Stop' : `Hear line ${k + 1}`"
                @click="hear(t)"
              >{{ hearing === t.id ? '■' : '▶' }}</button>
              <span v-else-if="t.audio" class="jy-hear jy-hear--stale" title="Edited since it was recorded: Generate voice records it again">●</span>
            </div>
            <textarea
              v-model="t.text" class="jy-input jy-textarea" rows="2" maxlength="400"
              :placeholder="t.spotlight ? 'Optional: a few words before it opens (the spotlight reads its own text)' : k === 0 ? promptFor(step.title) : 'Anything else they should know?'"
              @focus="selectLine(k)"
              @input="saveSoon"
              @keydown.enter.exact.prevent="addSentence(k + 1)"
            />
            <div class="jy-look" :class="{ 'jy-look--set': !!lineView(k) }" @click.capture="markLine(k)">
              <button
                class="jy-look__view" :style="lookStyle(lineView(k))" :disabled="!lineView(k)"
                :title="lineView(k) ? 'Show this view in the preview' : ''" :aria-label="`Facing for line ${k + 1}`"
                @click="showLineView(k)"
              >
                <span v-if="!lineView(k)" class="jy-look__empty">{{ k === 0 ? 'The way they walk in' : `Same as line ${k}` }}</span>
                <span v-else-if="lineView(k)!.zoom" class="jy-look__tag">Zoomed in</span>
                <span v-if="t.pin && lineView(k) && spotStyle(k)" class="jy-look__spot" :style="spotStyle(k)!" aria-hidden="true" />
              </button>
              <div class="jy-look__btns">
                <button class="jy-linkbtn" :disabled="!previewReady" @click="setLineView(k)">{{ lineView(k) ? 'Update' : 'Use this view' }}</button>
                <button v-if="lineView(k)" class="jy-linkbtn jy-linkbtn--muted" @click="clearLineView(k)">Clear</button>
              </div>
              <!-- Mark a spot: a pulsing marker, placed by dragging it in the preview -->
              <template v-if="step.scene_id && !t.hotspot_id && !t.spotlight">
                <div v-if="placing === t.id" class="jy-spotrow">
                  <span class="jy-spotrow__now">Placing in the preview…</span>
                  <button class="jy-linkbtn" @click="finishPlacing">Done</button>
                </div>
                <div v-else-if="t.pin" class="jy-spotrow">
                  <span class="jy-spotrow__on">📍 Spot marked</span>
                  <button class="jy-linkbtn" :disabled="!previewReady" @click="placeLineSpot(k)">Move</button>
                  <button class="jy-linkbtn jy-linkbtn--muted" @click="removeLinePin(k)">Remove</button>
                </div>
                <button
                  v-else class="jy-linkbtn jy-spotadd" :disabled="!previewReady"
                  title="Show a pulsing marker on something while this line is read: drag it onto the spot in the preview"
                  @click="placeLineSpot(k)"
                >📍 Mark a spot</button>
                <input
                  v-if="t.pin" v-model="t.pin.label" class="jy-input jy-spotname" maxlength="40"
                  placeholder="Name it (optional)" :aria-label="`Name of the marked spot, line ${k + 1}`"
                  @input="onSpotName(t)"
                >
              </template>
              <!-- What opens with the line: one of the photo's info cards, or a spotlight
                   (it plays by itself after the line, then the visit carries on). -->
              <select
                v-if="infoSpots.length || stepSpots.length" class="jy-select" :class="{ 'jy-select--spot': !!t.spotlight }"
                :value="t.spotlight ? `s:${t.spotlight}` : t.hotspot_id ? `h:${t.hotspot_id}` : ''" :aria-label="`What opens with line ${k + 1}`"
                title="Open an info card while the line is read, or play a spotlight after it"
                @change="setLineShows(k, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">Nothing opens</option>
                <optgroup v-if="stepSpots.length" label="Spotlights (play by themselves)">
                  <option v-for="o in stepSpots" :key="o.key" :value="`s:${o.key}`">✦ Spotlight: {{ o.title }}</option>
                </optgroup>
                <optgroup v-if="infoSpots.length" label="Info cards">
                  <option v-for="h in infoSpots" :key="h.id" :value="`h:${h.id}`">Show “{{ h.label }}”</option>
                </optgroup>
              </select>
              <p v-if="t.spotlight" class="jy-spotnote">Opens after this line, reads its own text, then the visit carries on.</p>
            </div>
            <button class="jy-btn jy-btn--icon" title="Remove this line" @click="removeSentence(k)">✕</button>
          </div>
          <div v-for="o in unusedSpots" :key="o.key" class="jy-spotsuggest">
            <span>✦ This photo has a spotlight: <b>{{ o.title }}</b></span>
            <button class="jy-linkbtn" @click="addSpotLine(o.key)">Add it to this step</button>
          </div>
          <button class="jy-btn" @click="addSentence(step.sentences.length)">+ Add a line</button>

          <div class="jy-card__foot">
            <button class="jy-btn" :disabled="!step.scene_id" @click="playStep(true)">▶ Play this step</button>
            <button class="jy-btn" :disabled="!step.scene_id" @click="playStep(false)">▶ Play from here</button>
          </div>
        </div>
        <div v-else class="jy-card jy-card--empty">
          <p class="jy-muted">Add a step on the left to start.</p>
        </div>
      </section>
    </div>

    <!-- Photo picker -->
    <!-- Photo picker: look around the photo big, flick through the strip, pick. -->
    <Teleport to="body">
    <div v-if="pickerOpen" class="jy-modal" role="dialog" aria-modal="true" @click.self="closePicker">
      <div class="jy-modal__box jy-modal__box--picker">
        <div class="jy-modal__head">
          <p class="jy-title jy-title--small">Choose the photo for “{{ step?.title || `Step ${selected + 1}` }}”</p>
          <input v-model="pickerSearch" class="jy-input" type="search" placeholder="Search photo names…" aria-label="Search photo names" />
          <button class="jy-btn jy-btn--icon" title="Close" @click="closePicker">✕</button>
        </div>

        <RoomSphere v-if="pickScene" class="jy-stage" :image-url="sceneImage(pickScene)" :reset-key="pickScene.id">
          <button class="jy-stage__arrow jy-stage__arrow--left" title="Previous photo" aria-label="Previous photo" @click="pickStep(-1)">‹</button>
          <button class="jy-stage__arrow jy-stage__arrow--right" title="Next photo" aria-label="Next photo" @click="pickStep(1)">›</button>
          <span class="jy-stage__hint">Drag to look around</span>
        </RoomSphere>
        <div v-else class="jy-stage jy-stage--empty">No photos match “{{ pickerSearch }}”</div>

        <div ref="stripEl" class="jy-strip">
          <button
            v-for="(sc, i) in pickerScenes" :key="sc.id"
            class="jy-pick" :class="{ 'jy-pick--on': i === pickIndex }"
            :title="sc.name || 'Untitled photo'"
            @click="pickIndex = i" @dblclick="choosePhoto(sc.id)"
          >
            <span class="jy-pick__thumb" :style="thumbStyle(sc.id)">
              <span v-if="usedIn.get(sc.id)" class="jy-pick__used">{{ usedIn.get(sc.id) }}</span>
            </span>
            <span class="jy-pick__name">{{ sc.name || 'Untitled photo' }}</span>
          </button>
        </div>

        <div class="jy-modal__foot">
          <p class="jy-modal__name">
            {{ pickScene?.name || '' }}
            <span v-if="pickScene" class="jy-muted">{{ pickIndex + 1 }} / {{ pickerScenes.length }}</span>
          </p>
          <button class="jy-btn" @click="closePicker">Cancel</button>
          <button class="jy-btn jy-btn--primary" :disabled="!pickScene" @click="pickScene && choosePhoto(pickScene.id)">✓ Use this photo</button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
// Patient journeys: build a guided visit as steps ("Reception") and lines of
// narration, and see it play in the real viewer. The walks between steps,
// arrival direction and timing are worked out (shared/utils/journey.ts);
// nothing here asks for angles or durations.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApiFetch } from '~/composables/useApiFetch'
import PsvViewer from '~/components/viewer/PsvViewer.vue'
import RoomSphere from '~/features/editor/components/RoomSphere.vue'
import type { JourneyCommand } from '~/components/viewer/JourneyPlayer.vue'
import { compileJourney, freshAudio, JOURNEY_VOICES, DEFAULT_JOURNEY_VOICE, type JourneyVoice, journeyMinutes, newLocalId, normalizeLine, type JourneyDocSentence, type JourneyDocStep, type JourneyDocView } from '~/shared/utils/journey'
import { buildSceneGraph, buildVenueFloors, scenePath } from '~/shared/utils/venue'
import { createSerialWrites } from '~/shared/utils/editorWrites'
import { useEditorSpotlights } from '~/features/editor/composables/useEditorSpotlights'
import { phoneWindow } from '~/shared/utils/phoneFrame'

const props = defineProps<{ spaceId: string }>()
const emit = defineEmits<{ (e: 'fix-link', sceneId: string): void }>()

interface JourneyRow { id: string; title: string; steps: JourneyDocStep[]; is_published: boolean; narration_voice: JourneyVoice }

const { apiFetch } = useApiFetch()
const serial = createSerialWrites()
// The tour's Object Spotlights: listed per photo for the lines, and registered
// so the preview can play them like the tour does.
const spotlights = useEditorSpotlights(() => props.spaceId)

const loading = ref(true)
const loadError = ref<boolean | string>(false)
const enabled = ref(true)
const creating = ref(false)
const tour = ref<any>(null)
const journeys = ref<JourneyRow[]>([])
const current = ref(0)
const selected = ref(0)
const showStarters = ref(false)
const pickerOpen = ref(false)
const pickerSearch = ref('')
const saving = ref(false)
const dirty = ref(false)
const saveFailed = ref(false)
const viewerRef = ref<InstanceType<typeof PsvViewer> | null>(null)
const command = ref<JourneyCommand | null>(null)
let nonce = 0

// ── Starting points: the usual hospital visits, as step names only ─────────
const STARTERS = [
  { title: 'Outpatient visit', steps: ['Arrival', 'Reception & registration', 'Triage', 'Waiting area', 'Consultation', 'Laboratory', 'Pharmacy', 'Payment', 'Exit'] },
  { title: 'Lab tests only', steps: ['Arrival', 'Reception', 'Laboratory', 'Payment', 'Exit'] },
  { title: 'Maternity admission', steps: ['Arrival', 'Admissions desk', 'Maternity ward', 'Delivery room', 'Postnatal care', 'Discharge'] },
  { title: 'Blank journey', steps: [] as string[] },
]
const NAME_IDEAS = ['Arrival', 'Parking', 'Reception', 'Registration', 'Triage', 'Waiting area', 'Consultation', 'Laboratory', 'X-ray & imaging', 'Pharmacy', 'Payment', 'Ward', 'Exit']

/** The question that gets a good first line out of a non-writer. */
function promptFor(title: string): string {
  const t = title.toLowerCase()
  if (/arriv|park|entr|gate/.test(t)) return 'Where do patients come in? Where can they park?'
  if (/recept|regist|admission|desk/.test(t)) return 'What should patients bring, and who do they speak to?'
  if (/triage/.test(t)) return 'What does the nurse check here?'
  if (/wait/.test(t)) return 'Where do they wait, and roughly for how long?'
  if (/consult|doctor|clinic/.test(t)) return 'Who will they see, and what happens in the room?'
  if (/lab|test|sample/.test(t)) return 'What tests happen here? Any preparation, like fasting?'
  if (/x-ray|imaging|scan|radiolog/.test(t)) return 'What happens during the scan? How long does it take?'
  if (/pharm/.test(t)) return 'How do they collect their medicine?'
  if (/pay|bill|cash/.test(t)) return 'How can they pay? Cash, M-Pesa, insurance?'
  if (/ward|room|deliver|maternity|postnatal/.test(t)) return 'What is this room like, and who looks after them here?'
  if (/exit|discharge|leav/.test(t)) return 'Where do they leave, and what happens next?'
  return 'What happens here? Say it the way you would explain it to a patient.'
}

// ── Data ───────────────────────────────────────────────────────────────────
const scenes = computed<any[]>(() => (tour.value?.scenes ?? []).filter((s: any) => s?.id))
const sceneIds = computed(() => new Set(scenes.value.map(s => s.id)))
const sceneById = computed(() => new Map(scenes.value.map(s => [s.id, s])))
const journey = computed<JourneyRow | null>(() => journeys.value[current.value] ?? null)
const step = computed<JourneyDocStep | null>(() => journey.value?.steps[selected.value] ?? null)

const usedNames = computed(() => new Set((journey.value?.steps ?? []).map(s => s.title.trim().toLowerCase())))
const nameIdeas = computed(() => NAME_IDEAS.filter(n => !usedNames.value.has(n.toLowerCase())).slice(0, 8))

/** The tour as the viewer gets it, carrying the journey being edited. */
const previewTour = computed(() => {
  if (!tour.value) return null
  return { ...tour.value, journey: undefined, journeys: journey.value ? [{ title: journey.value.title, steps: journey.value.steps }] : [] }
})
const compiled = computed(() => journey.value ? compileJourney(journey.value, sceneIds.value) : null)
const playable = computed(() => !!compiled.value)
const minutes = computed(() => compiled.value ? journeyMinutes(compiled.value) : 0)
const previewReady = ref(false)

// ── Phone check: the part of the preview an upright phone shows ──
// (shared/utils/phoneFrame: on a phone the visit zooms out to keep the width
// and frames the view above its box; this draws where that lands).
const PHONE_KEY = 'vw-journey-phone-view'
const phoneOn = ref(false)
const phoneWin = ref<Record<string, string> | null>(null)
const phoneBoxTop = ref('75%')
let phoneTimer: ReturnType<typeof setInterval> | null = null
function measurePhone() {
  const f = (viewerRef.value as any)?.getFov?.()
  if (!f || f.playing || !Number.isFinite(f.minFov) || !Number.isFinite(f.maxFov)) { phoneWin.value = null; return }
  const w = phoneWindow(f.vfov, f.aspect, f.zoom, f)
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`
  phoneWin.value = { left: pct(w.left), width: pct(w.right - w.left), top: pct(w.top), height: pct(w.bottom - w.top) }
  phoneBoxTop.value = pct((w.barTop - w.top) / (w.bottom - w.top))
}
function setPhone(on: boolean) {
  phoneOn.value = on
  try { localStorage.setItem(PHONE_KEY, on ? '1' : '0') } catch { /* private mode */ }
  if (phoneTimer) { clearInterval(phoneTimer); phoneTimer = null }
  if (on) { measurePhone(); phoneTimer = setInterval(measurePhone, 250) } // follows zooming
}
function togglePhone() { setPhone(!phoneOn.value) }
onMounted(() => { try { if (localStorage.getItem(PHONE_KEY) === '1') setPhone(true) } catch { /* private mode */ } })
onBeforeUnmount(() => { if (phoneTimer) clearInterval(phoneTimer) })

/** The walk between each step and the next, as the visit will take it. */
const links = computed(() => {
  const steps = journey.value?.steps ?? []
  const sg = buildSceneGraph(scenes.value)
  const floors = buildVenueFloors(tour.value?.floor_plans)
  return steps.slice(0, -1).map((s, i) => {
    const a = s.scene_id, b = steps[i + 1]?.scene_id
    if (!a || !b || !sceneIds.value.has(a) || !sceneIds.value.has(b)) return { kind: 'unknown' as const, rooms: 0 }
    if (a === b) return { kind: 'same' as const, rooms: 0 }
    const path = scenePath(sg, floors, a, b)
    return path.length ? { kind: 'walk' as const, rooms: path.length - 1 } : { kind: 'gap' as const, rooms: 0 }
  })
})

/** What still needs doing before patients see it, in plain words. */
const checks = computed(() => {
  const steps = journey.value?.steps ?? []
  const out: string[] = []
  const noPhoto = steps.filter(s => !s.scene_id || !sceneIds.value.has(s.scene_id)).length
  const quiet = steps.filter(s => !s.sentences.some(x => x.text.trim())).length
  const gaps = links.value.filter(l => l.kind === 'gap').length
  if (!steps.length) out.push('Add the first step of the visit.')
  if (noPhoto) out.push(`${noPhoto} ${noPhoto === 1 ? 'step has' : 'steps have'} no photo yet (left out of the visit).`)
  if (quiet) out.push(`${quiet} ${quiet === 1 ? 'step has' : 'steps have'} nothing to say yet.`)
  if (gaps) out.push(`${gaps} ${gaps === 1 ? 'step can’t' : 'steps can’t'} be walked to. Use “Fix the link”.`)
  return out
})

function stepMeta(s: JourneyDocStep) {
  if (!s.scene_id) return 'Choose a photo'
  const n = s.sentences.filter(x => x.text.trim()).length
  return `${sceneName(s.scene_id)} · ${n ? `${n} ${n === 1 ? 'line' : 'lines'}` : 'nothing to say yet'}`
}
function sceneName(id: string) { return sceneById.value.get(id)?.name || 'Untitled photo' }
function thumbStyle(id: string | null) {
  const url = id ? sceneById.value.get(id)?.thumbnail_url : null
  return url ? { backgroundImage: `url('${url}')` } : {}
}
const pickerScenes = computed(() => {
  const q = pickerSearch.value.trim().toLowerCase()
  return q ? scenes.value.filter(s => (s.name || '').toLowerCase().includes(q)) : scenes.value
})
const pickIndex = ref(0)
const pickScene = computed(() => pickerScenes.value[pickIndex.value] ?? null)
const stripEl = ref<HTMLElement | null>(null)
/** The panorama for the big look-around view (a small one, like the hotspot editor). */
function sceneImage(sc: any): string | null { return sc?.thumbnail_url || sc?.raw_image_url || null }
/** Which steps of this journey already use each photo: "Step 2", "Steps 1, 3". */
const usedIn = computed(() => {
  const m = new Map<string, number[]>()
  journey.value?.steps.forEach((s, i) => { if (s.scene_id) m.set(s.scene_id, [...(m.get(s.scene_id) ?? []), i + 1]) })
  return new Map([...m].map(([id, n]) => [id, `${n.length > 1 ? 'Steps' : 'Step'} ${n.join(', ')}`]))
})
// Open on this step's photo, else the one the step before it uses (likely next door).
watch(pickerOpen, (open) => {
  if (!open) return
  pickerSearch.value = ''
  const steps = journey.value?.steps ?? []
  const near = step.value?.scene_id ?? steps.slice(0, selected.value).reverse().find(s => s.scene_id)?.scene_id
  pickIndex.value = Math.max(0, scenes.value.findIndex(s => s.id === near))
  void nextTick(scrollStrip)
})
watch(pickerSearch, () => { pickIndex.value = 0 })
watch(pickIndex, () => void nextTick(scrollStrip))
function scrollStrip() {
  const el = stripEl.value?.children[pickIndex.value] as HTMLElement | undefined
  el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
}
function pickStep(dir: 1 | -1) {
  const n = pickerScenes.value.length
  if (n) pickIndex.value = (pickIndex.value + dir + n) % n
}
function closePicker() { pickerOpen.value = false }
function onPickerKey(e: KeyboardEvent) {
  if (!pickerOpen.value || (e.target as HTMLElement)?.tagName === 'INPUT' && e.key !== 'Escape' && e.key !== 'Enter') return
  if (e.key === 'Escape') closePicker()
  else if (e.key === 'ArrowLeft') pickStep(-1)
  else if (e.key === 'ArrowRight') pickStep(1)
  else if (e.key === 'Enter' && pickScene.value) choosePhoto(pickScene.value.id)
  else return
  e.preventDefault()
}
onMounted(() => window.addEventListener('keydown', onPickerKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onPickerKey)
  stopVoicePoll()
  hearClip?.pause()
  stopSample()
})

// ── Loading ────────────────────────────────────────────────────────────────
async function init() {
  loading.value = true
  loadError.value = false
  try {
    // Say which call failed and why, so a report can be acted on.
    const why = (what: string) => (e: any) => {
      const status = e?.response?.status ?? e?.statusCode
      const msg = e?.data?.statusMessage || e?.statusMessage || e?.message || 'no response'
      throw new Error(`${what}: ${status ? status + ' ' : ''}${msg}`)
    }
    const [t, j]: any[] = await Promise.all([
      apiFetch(`/p/preview/${props.spaceId}`).catch(why('Tour')),
      apiFetch(`/spaces/${props.spaceId}/journeys`).catch(why('Journeys')),
    ])
    tour.value = t?.tour ?? t?.data?.tour ?? null
    enabled.value = j?.enabled !== false
    journeys.value = (j?.journeys ?? []).map(normalise)
    current.value = 0
    selected.value = 0
  } catch (e: any) {
    loadError.value = e?.message || true
  } finally {
    loading.value = false
  }
}
onMounted(init)

function normalise(r: any): JourneyRow {
  return {
    id: r.id,
    title: r.title ?? '',
    is_published: !!r.is_published,
    narration_voice: JOURNEY_VOICES.some(v => v.id === r.narration_voice) ? r.narration_voice : DEFAULT_JOURNEY_VOICE,
    steps: (Array.isArray(r.steps) ? r.steps : []).map((s: any) => ({
      id: s.id || newLocalId(),
      title: s.title ?? '',
      scene_id: s.scene_id ?? null,
      view: s.view ?? null,
      sentences: (Array.isArray(s.sentences) ? s.sentences : []).map((x: any) => ({
        id: x.id || newLocalId(), text: x.text ?? '',
        ...(x.view ? { view: x.view } : {}),
        ...(x.hotspot_id ? { hotspot_id: x.hotspot_id } : {}),
        ...(x.spotlight ? { spotlight: x.spotlight } : {}),
        ...(x.pin ? { pin: {
          label: String(x.pin.label ?? ''),
          ...(typeof x.pin.yaw === 'number' && typeof x.pin.pitch === 'number' ? { yaw: x.pin.yaw, pitch: x.pin.pitch } : {}),
        } } : {}),
        ...(x.audio ? { audio: x.audio } : {}),
      })),
    })),
  }
}

// ── Saving: the whole journey at once, latest edit wins ───────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null
function saveSoon() {
  dirty.value = true
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNow, 700)
}
function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  const j = journey.value
  if (!j) return
  dirty.value = true
  saving.value = true
  const v = ++saveVersion
  // Recordings are looked up by the API, never saved inside the journey.
  const steps = JSON.parse(JSON.stringify(j.steps, (k, v) => k === 'audio' ? undefined : v))
  const body = { title: j.title.trim() || 'Patient visit', steps, is_published: j.is_published }
  serial.patch(j.id, body, b => apiFetch(`/journeys/${j.id}`, { method: 'PUT', body: b }))
    .then(() => { saveFailed.value = false })
    .catch((e: any) => {
      saveFailed.value = true
      toast.error(e?.data?.statusMessage || 'Could not save the journey. Check your connection.')
    })
    // Only the newest save says "saved": an older one finishing means nothing.
    .finally(() => { if (v === saveVersion) { saving.value = false; dirty.value = false } })
}
let saveVersion = 0
const saveLabel = computed(() => saveFailed.value ? 'Not saved' : saving.value || dirty.value ? 'Saving…' : 'All changes saved')

// ── Journeys ───────────────────────────────────────────────────────────────
async function createJourney(t: { title: string; steps: string[] }) {
  if (creating.value) return
  creating.value = true
  try {
    const steps: JourneyDocStep[] = t.steps.map(title => ({ id: newLocalId(), title, scene_id: null, view: null, sentences: [{ id: newLocalId(), text: '' }] }))
    const res: any = await apiFetch(`/spaces/${props.spaceId}/journeys`, {
      method: 'POST',
      body: { title: t.steps.length ? t.title : 'Patient visit', steps },
    })
    journeys.value.push(normalise(res.journey))
    current.value = journeys.value.length - 1
    selected.value = 0
    showStarters.value = false
    if (!steps.length) addStep()
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Could not create the journey')
  } finally {
    creating.value = false
  }
}
function selectJourney(i: number) {
  current.value = i
  selected.value = 0
  showStarters.value = false
}

// ── Voice (recorded narration) ─────────────────────────────────────────────
// Nothing is recorded while you write. "Generate voice" records every line
// that's new or changed, in one go (one wake-up of the voice service), and
// leaves lines that already have a voice alone.
interface VoiceJob { id: string; status: 'queued' | 'running' | 'done' | 'failed'; total: number; done_count: number; error?: string | null; created_at?: string }
const voiceJob = ref<VoiceJob | null>(null)
const voiceEnabled = ref(true)
const voiceWorker = ref(true)
const voiceBusy = computed(() => voiceJob.value?.status === 'queued' || voiceJob.value?.status === 'running')
const voicePct = computed(() => {
  const j = voiceJob.value
  return j && j.total ? Math.round((100 * j.done_count) / j.total) : 4
})
const voiceStats = computed(() => {
  const all = new Map<string, boolean>()
  for (const st of journey.value?.steps ?? []) {
    for (const x of st.sentences) {
      const text = normalizeLine(x.text)
      if (text) all.set(text, (all.get(text) ?? false) || !!freshAudio(x))
    }
  }
  const lines = all.size
  const voiced = [...all.values()].filter(Boolean).length
  return { lines, voiced, need: lines - voiced }
})
const voiceText = computed(() => {
  const st = voiceStats.value
  const j = voiceJob.value
  if (!voiceEnabled.value) return 'Recorded voices need one database update before they can be made.'
  if (j?.status === 'queued' && !voiceWorker.value) return 'Waiting: the voice service isn’t set up on the server yet.'
  if (j?.status === 'queued' && j.created_at && Date.now() - Date.parse(j.created_at) > 3 * 60_000) {
    return 'The voice service hasn’t started after 3 minutes. Your lines are saved and will be recorded when it does; if this keeps happening, the voice service needs checking on the server.'
  }
  if (j?.status === 'queued') return 'Starting the voice service… this can take a minute.'
  if (j?.status === 'running') return `Recording ${Math.min(j.done_count + 1, j.total)} of ${j.total} ${j.total === 1 ? 'line' : 'lines'}… you can keep working.`
  if (j?.status === 'failed' && st.need) return `Recording stopped (${j.error || 'unknown error'}). Try again.`
  if (!st.lines) return 'Write what happens at each step; then give it a voice here.'
  if (!st.need) return `All ${st.lines} ${st.lines === 1 ? 'line has' : 'lines have'} a voice.`
  return `${st.need} of ${st.lines} ${st.lines === 1 ? 'line needs' : 'lines need'} a voice. Until then they show as captions only.`
})

let voicePoll: ReturnType<typeof setInterval> | null = null
let voicePollMs = 0
function stopVoicePoll() { if (voicePoll) { clearInterval(voicePoll); voicePoll = null; voicePollMs = 0 } }
/** Every 3 s while recording; once a minute while the server has no voice
 *  service (nothing can change until it's set up, so don't load the API). */
const voicePollEvery = () => (voiceWorker.value ? 3000 : 60_000)

async function generateVoice(quiet = false) {
  const j = journey.value
  if (!j) return
  saveNow() // the worker reads the saved journey: send the latest text first
  try {
    const res: any = await serial.run(j.id, () => apiFetch(`/journeys/${j.id}/narration`, { method: 'POST', body: {} }))
    voiceWorker.value = res?.worker !== false
    if (!res?.job) {
      // Already recorded (e.g. the same sentence in another journey): just bring the files in.
      await refreshAudio(j.id)
      if (!quiet) toast.success('Every line already has a voice.')
      return
    }
    voiceJob.value = res.job
    watchVoice(j.id)
  } catch (e: any) {
    if (e?.response?.status === 503 || e?.statusCode === 503) voiceEnabled.value = false
    else if (!quiet) toast.error(e?.data?.statusMessage || 'Could not start recording.')
  }
}

function watchVoice(journeyId: string) {
  stopVoicePoll()
  voicePollMs = voicePollEvery()
  voicePoll = setInterval(() => {
    if (document.hidden) return // tab in the background: skip this check
    void checkVoice(journeyId)
  }, voicePollMs)
}

async function checkVoice(journeyId: string) {
  try {
    const res: any = await apiFetch(`/journeys/${journeyId}/narration`)
    if (journey.value?.id !== journeyId) return stopVoicePoll()
    voiceEnabled.value = res?.enabled !== false
    voiceWorker.value = res?.worker !== false
    const before = voiceJob.value?.status
    const doneBefore = voiceJob.value?.done_count ?? 0
    voiceJob.value = res?.job ?? null
    if (voiceBusy.value) {
      if (!voicePoll || voicePollMs !== voicePollEvery()) watchVoice(journeyId)
      // A line just finished: bring it in, so its ▶ works before the rest are done.
      if ((res?.job?.done_count ?? 0) > doneBefore) await refreshAudio(journeyId)
      return
    }
    stopVoicePoll()
    if (before && before !== 'done' && res?.job?.status === 'done') {
      await refreshAudio(journeyId)
      toast.success('Voice ready. Press ▶ on a line to hear it.')
    }
  } catch { /* try again on the next tick */ }
}

/** Bring in the new recordings without touching anything being edited. */
async function refreshAudio(journeyId: string) {
  const res: any = await apiFetch(`/spaces/${props.spaceId}/journeys`)
  const fresh = (res?.journeys ?? []).find((r: any) => r.id === journeyId)
  const mine = journeys.value.find(r => r.id === journeyId)
  if (!fresh || !mine) return
  const byId = new Map<string, any>()
  for (const st of fresh.steps ?? []) for (const x of st.sentences ?? []) if (x?.id) byId.set(x.id, x.audio ?? null)
  for (const st of mine.steps) for (const x of st.sentences) {
    const a = byId.get(x.id)
    // The API is the truth: a line it has no recording for (e.g. after a voice change) has none here.
    if (a) x.audio = a
    else delete x.audio
  }
}

// ── Voice picker ───────────────────────────────────────────────────────────
// Changing the voice keeps the old recordings (switching back reuses them);
// lines just need "Generate voice" again in the new one.
const voiceSaving = ref(false)
async function setVoice(v: JourneyVoice) {
  const j = journey.value
  if (!j || j.narration_voice === v || voiceBusy.value || voiceSaving.value) return
  const before = j.narration_voice
  j.narration_voice = v
  voiceSaving.value = true
  stopSample()
  try {
    await serial.run(j.id, () => apiFetch(`/journeys/${j.id}`, { method: 'PUT', body: { narration_voice: v } }))
    await refreshAudio(j.id)
  } catch (e: any) {
    j.narration_voice = before
    if (e?.response?.status === 503 || e?.statusCode === 503) voiceEnabled.value = false
    else toast.error(e?.data?.statusMessage || 'Could not change the voice.')
  } finally {
    voiceSaving.value = false
  }
}

// Hear a short sample of each voice before choosing.
const sampling = ref<string | null>(null)
let sampleClip: HTMLAudioElement | null = null
function stopSample() { sampleClip?.pause(); sampling.value = null }
function sample(v: string) {
  if (sampling.value === v) return stopSample()
  stopSample()
  hearClip?.pause(); hearing.value = null
  sampleClip = new Audio(`/voices/${v}.mp3`)
  sampling.value = v
  sampleClip.onended = () => { if (sampling.value === v) sampling.value = null }
  sampleClip.play().catch(() => { sampling.value = null })
}

// Placing a spot ends when another step or journey is shown, or Escape is pressed.
watch(() => [journey.value?.id, step.value?.id], () => finishPlacing())
function onPlacingKey(e: KeyboardEvent) { if (e.key === 'Escape') finishPlacing() }
onMounted(() => window.addEventListener('keydown', onPlacingKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onPlacingKey))

// Status of the journey on screen (a recording may already be running).
watch(() => journey.value?.id, (id) => {
  stopVoicePoll()
  voiceJob.value = null
  if (id) void checkVoice(id)
})

// ▶ on a line: hear its recording in the editor.
const hearing = ref<string | null>(null)
let hearClip: HTMLAudioElement | null = null
function hear(t: JourneyDocSentence) {
  const a = freshAudio(t)
  if (!a) return
  if (hearing.value === t.id) { hearClip?.pause(); hearing.value = null; return }
  hearClip?.pause()
  stopSample()
  hearClip = new Audio(a.url)
  hearing.value = t.id
  hearClip.onended = () => { if (hearing.value === t.id) hearing.value = null }
  hearClip.play().catch(() => { hearing.value = null; toast.error('Could not play this recording.') })
}

// Spotlights in this step's photo (made in Spotlight Studio), and the ones no line plays yet.
const stepSpots = computed(() => spotlights.forScene(step.value?.scene_id)
  .map(r => ({ key: r.object_key, title: String(r.data?.title || r.object_key) })))
const unusedSpots = computed(() => {
  const used = new Set((step.value?.sentences ?? []).map(x => x.spotlight).filter(Boolean))
  return stepSpots.value.filter(o => !used.has(o.key))
})
// Info hotspots in this step's photo, for "Show … while this line is read".
const infoSpots = computed(() => {
  const sc = step.value?.scene_id ? sceneById.value.get(step.value.scene_id) : null
  return (sc?.hotspots ?? [])
    .filter((h: any) => h?.type === 'info' && h.id)
    .map((h: any) => ({ id: h.id as string, label: String(h.label || h.title || 'Info point') }))
})
// ── Mark a spot ───────────────────────────────────────────────────────────
// A pulsing marker shown while the line is read. "Mark a spot" / "Move" turn
// the preview to where the line is said and show the marker there: drag it
// onto the spot (or click the photo). Its position saves as it moves.
const placing = ref<string | null>(null)
/** Where the camera points while line k is read: its own view, else the last one before it. */
function facingFor(k: number): JourneyDocView | null {
  const s = step.value
  if (!s) return null
  for (let i = k; i > 0; i--) if (s.sentences[i]?.view) return s.sentences[i]!.view!
  return s.view ?? null
}
async function placeLineSpot(k: number) {
  const s = step.value
  const x = s?.sentences[k]
  const viewer = viewerRef.value as any
  if (!s || !x || !s.scene_id || !viewer?.placeSpot) return
  finishPlacing()
  await viewer.showScene?.(s.scene_id, facingFor(k))
  if (step.value !== s) return
  if (!x.pin) x.pin = { label: '' }
  const pin = x.pin
  const at = typeof pin.yaw === 'number' && typeof pin.pitch === 'number' ? { yaw: pin.yaw, pitch: pin.pitch } : null
  const ok = viewer.placeSpot(at, pin.label?.trim() || undefined, (p: { yaw: number; pitch: number }) => {
    pin.yaw = p.yaw
    pin.pitch = p.pitch
    saveSoon()
  })
  if (!ok) return
  placing.value = x.id
  if (!at) {
    // New: starts in the middle of the view; saved there until it's moved.
    const v = viewer.getView?.()
    if (v) { pin.yaw = v.yaw; pin.pitch = v.pitch }
    saveNow()
  }
}
function finishPlacing() {
  if (!placing.value) return
  placing.value = null
  ;(viewerRef.value as any)?.endSpotPlacing?.()
}
function removeLinePin(k: number) {
  const x = step.value?.sentences[k]
  if (!x) return
  if (placing.value === x.id) finishPlacing()
  delete x.pin
  saveNow()
}
/** Renaming while placing: show the new name on the marker straight away. */
function onSpotName(t: JourneyDocSentence) {
  saveSoon()
  if (placing.value !== t.id || !t.pin || typeof document === 'undefined') return
  const spot = document.querySelector<HTMLElement>('.jy-spot--edit')
  if (!spot) return
  const name = t.pin.label?.trim() ?? ''
  let label = spot.querySelector<HTMLElement>('.jy-spot__label')
  if (!name) { label?.remove(); return }
  if (!label) { label = document.createElement('span'); label.className = 'jy-spot__label'; spot.appendChild(label) }
  label.textContent = name
}
/** The marked spot on a line's thumbnail (null when it's outside the picture). */
function spotStyle(k: number): Record<string, string> | null {
  const v = lineView(k)
  const pin = step.value?.sentences[k]?.pin
  if (!v || !pin) return null
  if (typeof pin.yaw !== 'number' || typeof pin.pitch !== 'number') return { left: '50%', top: '50%' }
  const vfov = 90 - 60 * Math.min(100, Math.max(0, v.zoom ?? 0)) / 100
  const hfov = Math.min(300, vfov * (LOOK_W / LOOK_H))
  const bgW = LOOK_W * 360 / hfov
  const bgH = bgW / 2
  const tau = Math.PI * 2
  let dx = ((pin.yaw - v.yaw) / tau) * bgW
  dx = ((dx % bgW) + bgW + bgW / 2) % bgW - bgW / 2 // the short way round
  const cy = (0.5 - v.pitch / Math.PI) * bgH
  const y0 = Math.min(0, Math.max(LOOK_H - bgH, LOOK_H / 2 - cy))
  const x = LOOK_W / 2 + dx
  const y = y0 + (0.5 - pin.pitch / Math.PI) * bgH
  if (x < 0 || x > LOOK_W || y < 0 || y > LOOK_H) return null
  return { left: `${x}px`, top: `${y}px` }
}
/** What opens with line k: "h:<hotspot id>", "s:<spotlight key>", or "" for nothing. */
function setLineShows(k: number, value: string) {
  const x = step.value?.sentences[k]
  if (!x) return
  delete x.hotspot_id
  delete x.spotlight
  if (value.startsWith('h:')) x.hotspot_id = value.slice(2)
  else if (value.startsWith('s:')) {
    x.spotlight = value.slice(2)
    if (placing.value === x.id) finishPlacing()
    delete x.pin // the spotlight marks its object itself
  }
  saveNow()
}
/** A new line that plays the spotlight (added from the photo's suggestions). */
function addSpotLine(key: string) {
  const s = step.value
  if (!s) return
  s.sentences.push({ id: newLocalId(), text: '', spotlight: key })
  saveNow()
}
function togglePublished() {
  if (!journey.value) return
  if (!journey.value.is_published && !playable.value) {
    toast.error('Give at least one step a photo first.')
    return
  }
  journey.value.is_published = !journey.value.is_published
  saveNow()
  // Going live: record whatever still needs a voice, in the same one batch.
  if (journey.value.is_published && voiceStats.value.need && voiceEnabled.value && !voiceBusy.value) void generateVoice(true)
}
async function deleteJourney() {
  const j = journey.value
  if (!j || !confirm(`Delete “${j.title || 'this journey'}”? This can't be undone.`)) return
  try {
    await serial.run(j.id, () => apiFetch(`/journeys/${j.id}`, { method: 'DELETE' }))
    journeys.value.splice(current.value, 1)
    current.value = Math.max(0, current.value - 1)
    selected.value = 0
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Could not delete the journey')
  }
}

// ── Steps ──────────────────────────────────────────────────────────────────
// ── The line being worked on ─────────────────────────────────────────────
// Like the steps on the left: the chosen line is marked red, and the preview
// shows what it faces (its own view, or the one it carries on from). The
// Facing column marks its line without moving the preview, so "Use this view"
// and "Update" still take whatever the preview is showing.
const activeLineId = ref<string | null>(null)
/** The selected line's place in the step (-1: none). */
const activeK = computed(() => step.value?.sentences.findIndex(x => x.id === activeLineId.value) ?? -1)
function markLine(k: number) {
  const id = step.value?.sentences[k]?.id
  if (id) activeLineId.value = id
}
function selectLine(k: number) {
  const s = step.value
  const x = s?.sentences[k]
  if (!s || !x || activeLineId.value === x.id || placing.value) return
  activeLineId.value = x.id
  if (s.scene_id) void (viewerRef.value as any)?.showScene?.(s.scene_id, facingFor(k))
}
// A step opens on its line 1 (the preview already shows the step's view).
watch(() => step.value?.id, () => { activeLineId.value = step.value?.sentences[0]?.id ?? null }, { immediate: true })

function selectStep(i: number) {
  selected.value = i
  const s = journey.value?.steps[i]
  if (s?.scene_id) void (viewerRef.value as any)?.showScene?.(s.scene_id, s.view ?? null)
}
function addStep() {
  const j = journey.value
  if (!j) return
  j.steps.push({ id: newLocalId(), title: '', scene_id: null, view: null, sentences: [{ id: newLocalId(), text: '' }] })
  selected.value = j.steps.length - 1
  saveNow()
  pickerOpen.value = true // a step needs a place before anything else
}
function removeStep() {
  const j = journey.value
  if (!j || !step.value) return
  const hasText = step.value.sentences.some(x => x.text.trim())
  if (hasText && !confirm(`Remove “${step.value.title || `Step ${selected.value + 1}`}” and its narration?`)) return
  j.steps.splice(selected.value, 1)
  selected.value = Math.max(0, Math.min(selected.value, j.steps.length - 1))
  saveNow()
}
function moveStep(d: number) {
  const j = journey.value
  const to = selected.value + d
  if (!j || to < 0 || to >= j.steps.length) return
  const [s] = j.steps.splice(selected.value, 1)
  j.steps.splice(to, 0, s!)
  selected.value = to
  saveNow()
}
function choosePhoto(sceneId: string) {
  if (!step.value) return
  if (step.value.scene_id !== sceneId) clearViews(step.value) // a direction only means something in its own photo
  step.value.scene_id = sceneId
  pickerOpen.value = false
  pickerSearch.value = ''
  saveNow()
  void (viewerRef.value as any)?.showScene?.(sceneId, null)
}
// ── Facing, one per line ───────────────────────────────────────────────────
// Line 1's facing is the step's own view (where the patient arrives looking);
// later lines may each look somewhere else in the same photo.
function clearViews(s: JourneyDocStep) {
  s.view = null
  // Directions and info cards only mean something in their own photo.
  for (const x of s.sentences) { delete x.view; delete x.hotspot_id; delete x.pin; delete x.spotlight }
}
function lineView(k: number): JourneyDocView | null {
  const s = step.value
  if (!s) return null
  return (k === 0 ? s.view : s.sentences[k]?.view) ?? null
}
function setLineView(k: number) {
  const v = (viewerRef.value as any)?.getView?.()
  const s = step.value
  if (!v || !s) return
  // Keep the zoom only when it is a real close-up, so "wide" stays wide.
  const view: JourneyDocView = { yaw: v.yaw, pitch: v.pitch, ...(v.zoom >= 5 ? { zoom: v.zoom } : {}) }
  const how = view.zoom ? 'looks and zooms in here' : 'looks here'
  if (k === 0) {
    // The preview may be on another photo (walked there): line 1 can switch the step to it.
    const switched = s.scene_id && s.scene_id !== v.sceneId
    if (switched) clearViews(s)
    s.scene_id = v.sceneId
    s.view = view
    toast.success(switched ? `This step now uses “${sceneName(v.sceneId)}”; line 1 ${how}.` : `On arrival and during line 1, the patient ${how}.`)
  } else {
    if (s.scene_id !== v.sceneId) {
      toast.error('The preview is on another photo. Showing this step’s photo: turn it, then press Use this view again.')
      if (s.scene_id) void (viewerRef.value as any)?.showScene?.(s.scene_id, s.view ?? null)
      return
    }
    s.sentences[k]!.view = view
    toast.success(`During line ${k + 1}, the patient ${how}.`)
  }
  saveNow()
}
function clearLineView(k: number) {
  const s = step.value
  if (!s) return
  if (k === 0) s.view = null
  else delete s.sentences[k]!.view
  saveNow()
}
function showLineView(k: number) {
  const v = lineView(k)
  if (v && step.value?.scene_id) void (viewerRef.value as any)?.showScene?.(step.value.scene_id, v)
}
/**
 * A small window onto the photo at a view: the step's equirectangular
 * thumbnail, scaled to the view's field of view and centred on its direction.
 * Flat, not a true perspective, but it shows at a glance what the line faces.
 */
const LOOK_W = 168
const LOOK_H = 78
function lookStyle(v: JourneyDocView | null) {
  const url = step.value?.scene_id ? sceneById.value.get(step.value.scene_id)?.thumbnail_url : null
  if (!v || !url) return {}
  const vfov = 90 - 60 * Math.min(100, Math.max(0, v.zoom ?? 0)) / 100 // PSV: 90° wide → 30° fully zoomed
  const hfov = Math.min(300, vfov * (LOOK_W / LOOK_H))
  const bgW = LOOK_W * 360 / hfov
  const bgH = bgW / 2
  const tau = Math.PI * 2
  const cx = (((0.5 + v.yaw / tau) % 1) + 1) % 1 * bgW
  const cy = (0.5 - v.pitch / Math.PI) * bgH
  const y = Math.min(0, Math.max(LOOK_H - bgH, LOOK_H / 2 - cy))
  return {
    backgroundImage: `url('${url}')`,
    backgroundSize: `${bgW}px ${bgH}px`,
    backgroundPosition: `${LOOK_W / 2 - cx}px ${y}px`,
  }
}

// ── Lines of narration ─────────────────────────────────────────────────────
function addSentence(at: number) {
  if (!step.value) return
  step.value.sentences.splice(at, 0, { id: newLocalId(), text: '' })
  saveSoon()
  setTimeout(() => {
    const boxes = document.querySelectorAll<HTMLTextAreaElement>('.jy-textarea')
    boxes[at]?.focus()
  }, 30)
}
function removeSentence(k: number) {
  if (!step.value) return
  step.value.sentences.splice(k, 1)
  if (!step.value.sentences.length) step.value.sentences.push({ id: newLocalId(), text: '' })
  saveNow()
}

// ── Preview ────────────────────────────────────────────────────────────────
/** Position of a step among the ones that play (steps without a photo are skipped). */
function chapterOf(i: number) {
  return (journey.value?.steps ?? []).slice(0, i).filter(s => s.scene_id && sceneIds.value.has(s.scene_id)).length
}
function playStep(only: boolean) {
  if (!step.value?.scene_id) return
  finishPlacing()
  command.value = { journey: 0, chapter: chapterOf(selected.value), only, nonce: ++nonce }
}
function playAll() {
  finishPlacing()
  command.value = { journey: 0, chapter: 0, only: false, nonce: ++nonce }
}
/** Follow the visit in the list while it plays. */
function onChapter(c: number) {
  const steps = journey.value?.steps ?? []
  let n = -1
  for (let i = 0; i < steps.length; i++) {
    if (steps[i]!.scene_id && sceneIds.value.has(steps[i]!.scene_id!)) n++
    if (n === c) { selected.value = i; return }
  }
}
// The viewer is ready once it can report a view; "Use this view" waits for it.
watch(viewerRef, (v) => {
  if (!v) return
  const t = setInterval(() => {
    if ((viewerRef.value as any)?.getView?.()) { previewReady.value = true; clearInterval(t) }
  }, 300)
})
</script>

<style scoped>
.jy-root { position: fixed; inset: 0; padding-top: 130px; background: #0b0d12; color: #fff; overflow: hidden; }
.jy-root *, .jy-modal * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.18) transparent; }
.jy-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; }
.jy-title { font-size: 20px; font-weight: 800; }
.jy-title--small { font-size: 15px; flex: 1; text-align: left; }
.jy-muted { color: rgba(255,255,255,0.55); font-size: 12px; line-height: 1.5; }
.jy-lead { max-width: 520px; font-size: 13.5px; }
.jy-spin { width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.15); border-top-color: #fff; animation: jy-rot 0.8s linear infinite; }
@keyframes jy-rot { to { transform: rotate(360deg); } }

.jy-btn { height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.07); color: #fff; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.jy-btn:hover:not(:disabled) { background: rgba(255,255,255,0.13); }
.jy-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.jy-btn--primary { background: #e11d48; border-color: #e11d48; }
.jy-btn--primary:hover:not(:disabled) { background: #be123c; }
.jy-btn--icon { width: 36px; padding: 0; flex: none; }
.jy-btn--wide { width: 100%; margin-top: 8px; }
.jy-linkbtn { border: 0; background: none; padding: 0; color: #93c5fd; font-size: 12px; font-weight: 700; cursor: pointer; }
.jy-linkbtn--danger { color: #fca5a5; }

.jy-starters { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; width: min(760px, 100%); margin-top: 8px; }
.jy-starters--small { grid-template-columns: 1fr 1fr; width: 100%; margin: 0 0 10px; }
.jy-starter { display: grid; gap: 6px; padding: 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: #fff; text-align: left; cursor: pointer; }
.jy-starter:hover:not(:disabled) { border-color: #e11d48; background: rgba(225,29,72,0.12); }
.jy-starter__title { font-size: 14px; font-weight: 800; }
.jy-starter__steps { font-size: 11.5px; color: rgba(255,255,255,0.55); line-height: 1.45; }

.jy-layout { height: 100%; display: grid; grid-template-columns: 340px 1fr; gap: 16px; padding: 0 16px 16px; }
.jy-side { min-height: 0; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; }
/* The column scrolls; nothing in it may be squashed to fit (the journey tabs and
   "+ Add a step" were shrinking to a sliver on short screens). */
.jy-side > * { flex-shrink: 0; }
.jy-side__foot { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 16px; }

.jy-tabs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 10px; }
.jy-tab { flex: none; height: 30px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.75); font-size: 12px; font-weight: 700; cursor: pointer; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jy-tab--on { background: #fff; border-color: #fff; color: #0b0d12; }
.jy-tab--add { border-style: dashed; }

.jy-label { margin: 14px 0 6px; font-size: 11.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: rgba(255,255,255,0.7); }
.jy-input { width: 100%; height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 13.5px; outline: none; font-family: inherit; }
.jy-input:focus { border-color: rgba(96,165,250,0.7); }
.jy-input--title { font-size: 15px; font-weight: 700; }
.jy-textarea { height: auto; min-height: 56px; padding: 9px 12px; line-height: 1.45; resize: vertical; }

.jy-live { display: flex; gap: 12px; align-items: flex-start; margin-top: 12px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.04); }
.jy-live__title { font-size: 13px; font-weight: 800; }
.jy-switch { flex: none; position: relative; width: 40px; height: 24px; border-radius: 999px; border: 0; background: rgba(255,255,255,0.18); cursor: pointer; margin-top: 2px; }
.jy-switch span { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.15s; }
.jy-switch--on { background: #22c55e; }
.jy-switch--on span { transform: translateX(16px); }

.jy-steps { list-style: none; margin: 0; padding: 0; }
.jy-step { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px; border-radius: 12px; border: 2px solid transparent; background: rgba(255,255,255,0.04); color: #fff; text-align: left; cursor: pointer; }
.jy-step:hover { background: rgba(255,255,255,0.08); }
.jy-step--on { border-color: #e11d48; background: rgba(225,29,72,0.1); }
.jy-step__n { flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,0.1); font-size: 11px; font-weight: 800; }
.jy-step__thumb { flex: none; width: 64px; height: 36px; border-radius: 6px; background: #1f2430 center / cover; display: grid; place-items: center; color: rgba(255,255,255,0.5); }
.jy-step--todo .jy-step__thumb { border: 1.5px dashed rgba(255,255,255,0.3); }
.jy-step__text { min-width: 0; display: grid; gap: 2px; }
.jy-step__title { font-size: 13.5px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jy-step__meta { font-size: 11.5px; color: rgba(255,255,255,0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jy-link { display: flex; align-items: center; gap: 8px; padding: 4px 0 4px 40px; font-size: 11.5px; color: rgba(255,255,255,0.45); }
.jy-link--gap { color: #fca5a5; flex-wrap: wrap; }
.jy-checks { margin: 12px 0 0; padding: 10px 12px 10px 28px; border-radius: 10px; background: rgba(250,204,21,0.08); color: #fde68a; font-size: 12px; line-height: 1.6; }

.jy-main { min-height: 0; display: flex; flex-direction: column; gap: 12px; overflow: hidden; }
.jy-preview { position: relative; flex: none; height: min(46vh, 440px); min-height: 240px; border-radius: 16px; overflow: hidden; background: #000; }
.jy-preview__bar { position: absolute; top: 12px; right: 12px; z-index: 50; }
.jy-phonebtn { position: absolute; top: 12px; left: 12px; z-index: 50; display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border: 1px solid rgba(255,255,255,0.18); border-radius: 10px; background: rgba(10,12,18,0.72); color: #e5e7eb; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.jy-phonesave { position: absolute; left: 12px; bottom: 12px; z-index: 50; display: flex; align-items: center; gap: 6px; min-width: 0; padding: 6px; border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; background: rgba(10,12,18,0.82); }
.jy-phonesave__nav { flex-shrink: 0; width: 30px; height: 34px; border: 0; border-radius: 9px; background: rgba(255,255,255,0.08); color: #fff; font-size: 18px; line-height: 1; cursor: pointer; }
.jy-phonesave__nav:disabled { opacity: 0.3; cursor: default; }
.jy-phonesave__line { min-width: 0; display: grid; padding: 0 4px; color: #fff; font-size: 13px; font-weight: 700; white-space: nowrap; }
.jy-phonesave__go { flex-shrink: 1; min-width: 0; height: 34px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.jy-phonebtn:hover { background: rgba(10,12,18,0.9); }
.jy-phonebtn.is-on { background: #fff; color: #111827; border-color: #fff; }
/* The phone's window: everything outside it shaded; its bottom is the visit's box. */
.jy-phone { position: absolute; z-index: 40; pointer-events: none; border: 2px solid rgba(255,255,255,0.9); border-radius: 18px; box-shadow: 0 0 0 9999px rgba(5,7,12,0.55); }
.jy-phone__tag { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); padding: 2px 8px; border-radius: 999px; background: rgba(5,7,12,0.7); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; }
.jy-phone__box { position: absolute; left: 6px; right: 6px; bottom: 6px; display: grid; place-items: center; border-radius: 12px; background: rgba(255,255,255,0.82); color: #374151; font-size: 12px; font-weight: 700; }
.jy-card { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; border-radius: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
.jy-card--empty { flex: none; padding: 32px; text-align: center; }
.jy-card__head { display: flex; align-items: center; gap: 8px; }
.jy-card__n { flex: none; font-size: 12px; font-weight: 800; color: #fb7185; text-transform: uppercase; letter-spacing: 0.04em; }
.jy-card__foot { display: flex; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
.jy-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.jy-chip { height: 26px; padding: 0 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 700; cursor: pointer; }
.jy-chip:hover { background: rgba(255,255,255,0.12); color: #fff; }
.jy-field { min-width: 0; }
.jy-photo { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px; border-radius: 12px; border: 1px dashed rgba(255,255,255,0.25); background: rgba(255,255,255,0.03); color: #fff; font-size: 13px; font-weight: 700; text-align: left; cursor: pointer; }
.jy-photo:hover { background: rgba(255,255,255,0.08); }
.jy-photo__thumb { flex: none; width: 88px; height: 44px; border-radius: 8px; background: #1f2430 center / cover; }
.jy-hint { margin: -2px 0 8px; }
.jy-sentence { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
.jy-sentence__side { flex: none; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.jy-hear { width: 22px; height: 22px; padding: 0; border: 0; border-radius: 50%; display: grid; place-items: center; background: rgba(225,29,72,0.18); color: #fda4af; font-size: 9px; cursor: pointer; }
.jy-hear:hover, .jy-hear--on { background: #e11d48; color: #fff; }
.jy-hear--stale { background: none; color: #fbbf24; font-size: 10px; cursor: help; }
.jy-select { width: 100%; height: 30px; margin-top: 2px; padding: 0 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.14); background: #161a22; color: #fff; font-size: 11.5px; font-family: inherit; }
.jy-voice { margin-top: 14px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
.jy-voice .jy-label { margin-top: 0; }
.jy-voices { display: grid; gap: 6px; margin: 4px 0 10px; }
.jy-voicepick { display: flex; align-items: center; gap: 6px; padding: 2px 8px 2px 2px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); }
.jy-voicepick--on { border-color: #e11d48; background: rgba(225,29,72,0.08); }
.jy-voicepick__main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 9px; padding: 7px 6px; border: 0; background: none; color: #fff; text-align: left; font: inherit; cursor: pointer; }
.jy-voicepick__main:disabled { cursor: default; opacity: 0.75; }
.jy-voicepick__main b { display: block; font-size: 12.5px; font-weight: 600; }
.jy-voicepick__main small { display: block; font-size: 11px; color: rgba(255,255,255,0.55); }
.jy-voicepick__dot { flex: none; width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.35); }
.jy-voicepick--on .jy-voicepick__dot { border-color: #e11d48; background: radial-gradient(#e11d48 0 3px, transparent 4px); }
.jy-voice__bar { height: 5px; margin-top: 8px; border-radius: 4px; background: rgba(255,255,255,0.1); overflow: hidden; }
.jy-voice__bar i { display: block; height: 100%; background: #e11d48; transition: width 0.4s; }
.jy-sentence .jy-textarea { flex: 1; min-height: 78px; }
.jy-field--photo { margin-bottom: 16px; }
.jy-lines__head { display: flex; align-items: baseline; gap: 8px; }
.jy-lines__head .jy-label:first-child { flex: 1; }
/* Lines up over the facing boxes (box 168 + gap 8 + remove 36). */
.jy-lines__facing { width: 168px; margin-right: 44px; }
.jy-look { flex: none; width: 168px; display: flex; flex-direction: column; gap: 5px; }
.jy-look__view { position: relative; width: 168px; height: 78px; padding: 0; border-radius: 10px; border: 1px dashed rgba(255,255,255,0.25); background: rgba(255,255,255,0.03) repeat-x; color: rgba(255,255,255,0.5); font-size: 11.5px; font-weight: 600; cursor: default; overflow: hidden; }
.jy-look--set .jy-look__view { border: 1px solid rgba(255,255,255,0.2); cursor: pointer; }
.jy-look--set .jy-look__view:hover { border-color: #e11d48; }
.jy-look__empty { display: grid; place-items: center; height: 100%; padding: 0 10px; text-align: center; line-height: 1.3; }
.jy-look__tag { position: absolute; right: 5px; bottom: 5px; padding: 2px 7px; border-radius: 999px; background: rgba(12,14,22,0.75); color: #fff; font-size: 10px; font-weight: 800; }
.jy-look__btns { display: flex; gap: 12px; padding-left: 2px; }
.jy-spotadd { align-self: flex-start; padding-left: 2px; }
.jy-spotrow { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; padding-left: 2px; font-size: 12px; font-weight: 700; }
.jy-spotrow__on { color: rgba(255,255,255,0.85); }
.jy-spotrow__now { color: #fda4af; }
.jy-placebar { position: absolute; left: 12px; right: 12px; top: 12px; z-index: 50; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 8px 8px 14px; border-radius: 12px; background: rgba(12,14,20,0.85); color: #fff; font-size: 13px; font-weight: 600; backdrop-filter: blur(8px); }
.jy-spotname { height: 28px; padding: 0 8px; font-size: 12px; }
.jy-select--spot { border-color: #e53935; color: #fff; }
.jy-spotnote { margin: 2px 0 0; font-size: 11px; line-height: 1.35; color: rgba(255,255,255,0.55); }
.jy-spotsuggest { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; margin: 0 0 8px; padding: 8px 10px; border: 1px dashed rgba(229,57,53,0.6); border-radius: 10px; font-size: 12px; color: rgba(255,255,255,0.8); }
.jy-spotsuggest b { color: #fff; }
/* The marked spot on the thumbnail: the middle of the view. */
.jy-look__spot { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #e11d48; box-shadow: 0 0 0 2px #fff, 0 0 0 6px rgba(225, 29, 72, 0.35); }
.jy-linkbtn:disabled { opacity: 0.45; cursor: not-allowed; }
.jy-linkbtn--muted { color: rgba(255,255,255,0.55); }
.jy-sentence__n { flex: none; width: 22px; height: 22px; margin-top: 9px; padding: 0; border: 0; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,0.08); font: inherit; font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.7); cursor: pointer; }
.jy-sentence__n:hover { background: rgba(255,255,255,0.16); color: #fff; }
/* The line being worked on: red, like the chosen step on the left. */
.jy-sentence--on .jy-sentence__n { background: #e11d48; color: #fff; }
.jy-sentence--on .jy-textarea { border-color: #e11d48; box-shadow: 0 0 0 1px #e11d48; }
.jy-sentence--on .jy-look--set .jy-look__view { border-color: #e11d48; }

.jy-modal { position: fixed; inset: 0; z-index: 500; color: #fff; display: grid; place-items: center; padding: 24px; background: rgba(0,0,0,0.6); }
.jy-modal__box { width: min(960px, 100%); max-height: 86vh; display: flex; flex-direction: column; border-radius: 18px; background: #12151c; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
.jy-modal__head { display: flex; align-items: center; gap: 10px; padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.jy-modal__head .jy-input { width: 240px; }
.jy-modal__box--picker { width: min(1200px, 100%); max-height: 94vh; }
.jy-stage { position: relative; flex: none; height: min(56vh, 540px); margin: 14px 14px 0; border-radius: 14px; overflow: hidden; background: #000; }
.jy-stage--empty { display: grid; place-items: center; color: rgba(255,255,255,0.5); font-size: 13px; font-weight: 600; background: rgba(255,255,255,0.04); }
.jy-stage__arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.25); background: rgba(12,14,22,0.6); color: #fff; font-size: 26px; line-height: 1; cursor: pointer; }
.jy-stage__arrow:hover { background: rgba(12,14,22,0.85); }
.jy-stage__arrow--left { left: 12px; }
.jy-stage__arrow--right { right: 12px; }
.jy-stage__hint { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); padding: 4px 12px; border-radius: 999px; background: rgba(12,14,22,0.6); color: rgba(255,255,255,0.85); font-size: 11px; font-weight: 600; pointer-events: none; }
.jy-strip { flex: none; display: flex; gap: 10px; overflow-x: auto; padding: 12px 14px 6px; scroll-padding: 0 14px; }
.jy-strip .jy-pick { flex: 0 0 156px; }
.jy-pick__thumb { position: relative; }
.jy-pick__used { position: absolute; top: 5px; left: 5px; padding: 2px 7px; border-radius: 999px; background: rgba(225,29,72,0.92); color: #fff; font-size: 10.5px; font-weight: 800; }
.jy-modal__foot { display: flex; align-items: center; gap: 8px; padding: 10px 14px 14px; }
.jy-modal__name { flex: 1; min-width: 0; margin: 0; font-size: 13.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jy-modal__name .jy-muted { margin-left: 8px; font-weight: 600; }
.jy-pick { display: grid; gap: 6px; padding: 6px 6px 8px; border-radius: 12px; border: 2px solid transparent; background: rgba(255,255,255,0.04); color: #fff; text-align: left; cursor: pointer; }
.jy-pick:hover { background: rgba(255,255,255,0.09); }
.jy-pick--on { border-color: #e11d48; }
.jy-pick__thumb { aspect-ratio: 2 / 1; border-radius: 8px; background: #1f2430 center / cover; }
.jy-pick__name { font-size: 12.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 900px) {
  .jy-root { overflow-y: auto; }
  .jy-layout { display: flex; flex-direction: column-reverse; height: auto; }
  .jy-main { overflow: visible; }
  .jy-card { overflow: visible; }
  .jy-preview { height: 42vh; }
}
@media (max-width: 640px) {
  .jy-sentence { flex-wrap: wrap; }
  .jy-sentence .jy-textarea { flex: 1 1 calc(100% - 74px); }
  .jy-look { order: 3; width: auto; flex: 1 1 100%; flex-direction: row; align-items: center; gap: 12px; padding-left: 30px; }
  .jy-look__btns { flex-direction: column; gap: 6px; }
  .jy-lines__facing { display: none; }
  .jy-stage { height: min(44vh, 340px); margin: 10px 10px 0; }
  .jy-strip .jy-pick { flex-basis: 120px; }
  .jy-modal { padding: 10px; }
  .jy-modal__head { flex-wrap: wrap; }
  .jy-modal__head .jy-input { width: 100%; order: 3; }
  .jy-root { padding-top: 104px; }
}
</style>
