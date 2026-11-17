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
          <div class="jy-preview__bar">
            <button class="jy-btn jy-btn--primary" :disabled="!playable" @click="playAll">▶ Play the whole visit</button>
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

          <div class="jy-row">
            <div class="jy-field">
              <p class="jy-label">Photo</p>
              <button class="jy-photo" @click="pickerOpen = true">
                <span class="jy-photo__thumb" :style="thumbStyle(step.scene_id)" />
                <span>{{ step.scene_id ? sceneName(step.scene_id) : 'Choose the photo for this step' }}</span>
              </button>
            </div>
            <div class="jy-field">
              <p class="jy-label">Facing</p>
              <p class="jy-muted jy-facing">
                {{ step.view ? (step.view.zoom ? 'Faces and zooms in on the view you set.' : 'Faces the direction you set.') : 'Faces the way patients walk in.' }}
                Turn the preview to what patients should look at (scroll or pinch to zoom in), then:
              </p>
              <div class="jy-facing__btns">
                <button class="jy-btn" :disabled="!previewReady" @click="useCurrentView">Use this view</button>
                <button v-if="step.view" class="jy-linkbtn" @click="step.view = null; saveNow()">Reset</button>
              </div>
            </div>
          </div>

          <p class="jy-label">What happens here?</p>
          <p class="jy-muted jy-hint">One idea per line. Each line is read out and shown as a caption while the patient looks around.</p>
          <div v-for="(t, k) in step.sentences" :key="t.id" class="jy-sentence">
            <span class="jy-sentence__n">{{ k + 1 }}</span>
            <textarea
              v-model="t.text" class="jy-input jy-textarea" rows="2" maxlength="400"
              :placeholder="k === 0 ? promptFor(step.title) : 'Anything else they should know?'"
              @input="saveSoon"
              @keydown.enter.exact.prevent="addSentence(k + 1)"
            />
            <button class="jy-btn jy-btn--icon" title="Remove this line" @click="removeSentence(k)">✕</button>
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
    <div v-if="pickerOpen" class="jy-modal" @click.self="pickerOpen = false">
      <div class="jy-modal__box">
        <div class="jy-modal__head">
          <p class="jy-title jy-title--small">Choose the photo for “{{ step?.title || `Step ${selected + 1}` }}”</p>
          <input v-model="pickerSearch" class="jy-input" type="search" placeholder="Search photo names…" aria-label="Search photo names" />
          <button class="jy-btn jy-btn--icon" title="Close" @click="pickerOpen = false">✕</button>
        </div>
        <div class="jy-grid">
          <button
            v-for="sc in pickerScenes" :key="sc.id"
            class="jy-pick" :class="{ 'jy-pick--on': sc.id === step?.scene_id }"
            @click="choosePhoto(sc.id)"
          >
            <span class="jy-pick__thumb" :style="thumbStyle(sc.id)" />
            <span class="jy-pick__name">{{ sc.name || 'Untitled photo' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Patient journeys: build a guided visit as steps ("Reception") and lines of
// narration, and see it play in the real viewer. The walks between steps,
// arrival direction and timing are worked out (shared/utils/journey.ts);
// nothing here asks for angles or durations.
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApiFetch } from '~/composables/useApiFetch'
import PsvViewer from '~/components/viewer/PsvViewer.vue'
import type { JourneyCommand } from '~/components/viewer/JourneyPlayer.vue'
import { compileJourney, journeyMinutes, newLocalId, type JourneyDocStep } from '~/shared/utils/journey'
import { buildSceneGraph, buildVenueFloors, scenePath } from '~/shared/utils/venue'
import { createSerialWrites } from '~/shared/utils/editorWrites'

const props = defineProps<{ spaceId: string }>()
const emit = defineEmits<{ (e: 'fix-link', sceneId: string): void }>()

interface JourneyRow { id: string; title: string; steps: JourneyDocStep[]; is_published: boolean }

const { apiFetch } = useApiFetch()
const serial = createSerialWrites()

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
    steps: (Array.isArray(r.steps) ? r.steps : []).map((s: any) => ({
      id: s.id || newLocalId(),
      title: s.title ?? '',
      scene_id: s.scene_id ?? null,
      view: s.view ?? null,
      sentences: (Array.isArray(s.sentences) ? s.sentences : []).map((x: any) => ({ id: x.id || newLocalId(), text: x.text ?? '' })),
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
  const body = { title: j.title.trim() || 'Patient visit', steps: JSON.parse(JSON.stringify(j.steps)), is_published: j.is_published }
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
function togglePublished() {
  if (!journey.value) return
  if (!journey.value.is_published && !playable.value) {
    toast.error('Give at least one step a photo first.')
    return
  }
  journey.value.is_published = !journey.value.is_published
  saveNow()
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
  if (step.value.scene_id !== sceneId) step.value.view = null // a direction only means something in its own photo
  step.value.scene_id = sceneId
  pickerOpen.value = false
  pickerSearch.value = ''
  saveNow()
  void (viewerRef.value as any)?.showScene?.(sceneId, null)
}
function useCurrentView() {
  const v = (viewerRef.value as any)?.getView?.()
  if (!v || !step.value) return
  const switched = step.value.scene_id && step.value.scene_id !== v.sceneId
  step.value.scene_id = v.sceneId
  // Keep the zoom only when it is a real close-up, so "wide" stays wide.
  step.value.view = { yaw: v.yaw, pitch: v.pitch, ...(v.zoom >= 5 ? { zoom: v.zoom } : {}) }
  saveNow()
  const how = step.value.view.zoom ? 'facing and zoomed in like this' : 'facing this way'
  toast.success(switched ? `This step now uses “${sceneName(v.sceneId)}”, ${how}.` : `Patients will see this step ${how}.`)
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
  command.value = { journey: 0, chapter: chapterOf(selected.value), only, nonce: ++nonce }
}
function playAll() {
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
.jy-root * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.18) transparent; }
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
.jy-card { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; border-radius: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
.jy-card--empty { flex: none; padding: 32px; text-align: center; }
.jy-card__head { display: flex; align-items: center; gap: 8px; }
.jy-card__n { flex: none; font-size: 12px; font-weight: 800; color: #fb7185; text-transform: uppercase; letter-spacing: 0.04em; }
.jy-card__foot { display: flex; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
.jy-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.jy-chip { height: 26px; padding: 0 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 700; cursor: pointer; }
.jy-chip:hover { background: rgba(255,255,255,0.12); color: #fff; }
.jy-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.jy-field { min-width: 0; }
.jy-photo { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px; border-radius: 12px; border: 1px dashed rgba(255,255,255,0.25); background: rgba(255,255,255,0.03); color: #fff; font-size: 13px; font-weight: 700; text-align: left; cursor: pointer; }
.jy-photo:hover { background: rgba(255,255,255,0.08); }
.jy-photo__thumb { flex: none; width: 88px; height: 44px; border-radius: 8px; background: #1f2430 center / cover; }
.jy-facing { margin-bottom: 6px; }
.jy-facing__btns { display: flex; align-items: center; gap: 10px; }
.jy-hint { margin: -2px 0 8px; }
.jy-sentence { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
.jy-sentence__n { flex: none; width: 22px; height: 22px; margin-top: 9px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,0.08); font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.7); }

.jy-modal { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; padding: 24px; background: rgba(0,0,0,0.6); }
.jy-modal__box { width: min(960px, 100%); max-height: 86vh; display: flex; flex-direction: column; border-radius: 18px; background: #12151c; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
.jy-modal__head { display: flex; align-items: center; gap: 10px; padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.jy-modal__head .jy-input { width: 240px; }
.jy-grid { overflow-y: auto; padding: 14px; display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
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
  .jy-row { grid-template-columns: 1fr; }
  .jy-preview { height: 42vh; }
}
@media (max-width: 640px) {
  .jy-root { padding-top: 104px; }
}
</style>
