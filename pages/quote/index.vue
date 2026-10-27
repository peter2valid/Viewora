<template>
  <div class="qf" :class="{ 'qf--wide': step === RESULT, 'qf--mid': step === 1 }">
    <!-- Loading and load errors -->
    <div v-if="pending" class="qf__state" aria-busy="true">
      <span class="qf__skeleton" /><span class="qf__skeleton qf__skeleton--short" />
    </div>
    <div v-else-if="!config" class="qf__state qf__state--error" role="alert">
      <p class="qf__state-title">{{ loadErrorMessage }}</p>
      <div class="qf__row">
        <QuoteButton variant="secondary" icon="refresh" @click="refresh()">{{ t('actions.retry') }}</QuoteButton>
        <QuoteButton variant="quiet" icon="brand-whatsapp" :href="helpLink">{{ t('actions.chatWhatsapp') }}</QuoteButton>
      </div>
    </div>

    <template v-else>
      <p v-if="notice" class="qf__notice" role="status">{{ notice }}</p>

      <!-- ── Steps 1 to 5 ─────────────────────────────────────── -->
      <form v-if="step < RESULT" class="qf__form" novalidate @submit.prevent="next">
        <!-- From step 2 the heading is the step name, so the bar doesn't repeat it -->
        <QuoteProgress :step="step" :total="STEPS.length" :label="step === 1 ? t('steps.industry') : undefined" />
        <h1 ref="heading" class="q-h1 qf__title" tabindex="-1">{{ stepTitle }}</h1>

        <!-- 1 Industry -->
        <template v-if="step === 1">
          <p class="q-small qf__intro">{{ t('intro') }}</p>
          <!-- Grouped, most-asked first; one radiogroup so arrow keys run through all of them -->
          <div role="radiogroup" :aria-label="t('industryQuestion')" class="qf__industries" @keydown="onRadioArrows($event, industryTiles.length, i => pickIndustry(industryTiles[i], false))">
            <div v-for="g in industryGroups" :key="g.key" class="qf__industry-group">
              <h2 v-if="g.key !== 'other'" class="qf__group-label">{{ t(`groups.${g.key}`) }}</h2>
              <div class="qf__tiles qf__tiles--industry">
                <QuoteTile
                  v-for="tile in g.tiles" :key="tile.key" size="compact"
                  :icon="INDUSTRY_ICONS[tile.key] ?? 'dots-circle-horizontal'"
                  :title="t(`industries.${tile.key}`)"
                  :sub="tile.from ? t('details.from', { amount: money(tile.from) }) : t('details.priceByHandShort')"
                  :selected="form.industry === tile.key"
                  :focusable="form.industry ? form.industry === tile.key : tile === industryTiles[0]"
                  @select="pickIndustry(tile, true)"
                />
              </div>
            </div>
          </div>
          <p v-if="errors.industry" class="qf__error" role="alert">{{ errors.industry }}</p>
        </template>

        <!-- 2 Contact -->
        <template v-else-if="step === 2">
          <fieldset class="qf__group" data-q="clientType">
            <legend class="q-h2">{{ t('clientQuestion') }}</legend>
            <div role="radiogroup" :aria-label="t('clientQuestion')" class="qf__tiles qf__tiles--2" @keydown="onRadioArrows($event, clientTypes.length, i => pickClientType(clientTypes[i], false))">
              <QuoteTile
                v-for="(c, i) in clientTypes" :key="c" size="small"
                :icon="CLIENT_TYPE_ICONS[c]" :title="clientLabel(c)"
                :selected="form.clientType === c"
                :focusable="form.clientType ? form.clientType === c : i === 0"
                @select="pickClientType(c, true)"
              />
            </div>
            <p v-if="errors.clientType" class="qf__error" role="alert">{{ errors.clientType }}</p>
          </fieldset>
          <p class="q-small" data-q="name">{{ t('contactIntro') }}</p>
          <QuoteField id="q-name" v-model="form.firstName" icon="user" :label="t('contact.firstName')" autocomplete="given-name" :error="errors.firstName" />
          <QuoteField
            id="q-phone" v-model="form.whatsapp" icon="brand-whatsapp" :label="t('contact.whatsapp')" type="tel" inputmode="tel"
            autocomplete="tel" :help="t('contact.whatsappHelp')" :error="errors.whatsapp"
            @blur="checkPhone"
          />
          <QuoteField id="q-email" v-model="form.email" icon="mail" :label="t('contact.email')" type="email" inputmode="email" autocomplete="email" :error="errors.email" />
          <div class="qf__honeypot" aria-hidden="true">
            <label for="q-website">{{ t('contact.honeypot') }}</label>
            <input id="q-website" v-model="form.website" name="website" type="text" tabindex="-1" autocomplete="off">
          </div>
          <label v-if="config.consent" class="qf__consent">
            <input v-model="form.consent" type="checkbox">
            <span class="q-small">{{ config.consent.body }}</span>
          </label>
          <p v-if="config.consent && !form.consent" class="q-small qf__hint">{{ t('contact.consentNote') }}</p>
        </template>

        <!-- 3 Details: the industry module's own questions -->
        <template v-else-if="step === 3 && module">
          <p v-if="module.resultMode === 'custom'" class="q-small">{{ t('otherNote') }}</p>
          <template v-for="q in visibleQuestions" :key="q.id">
            <fieldset v-if="q.type === 'choice' || q.type === 'boolean'" class="qf__group" :data-q="q.id">
              <legend class="q-h2">{{ questionLabel(q) }}</legend>
              <p v-if="q.help" class="q-small">{{ q.help }}</p>
              <div role="radiogroup" :aria-label="questionLabel(q)" class="qf__tiles" :class="gridFor(q)" @keydown="onRadioArrows($event, choicesFor(q).length, i => (form.details[q.id] = choicesFor(q)[i].value))">
                <QuoteTile
                  v-for="(o, i) in choicesFor(q)" :key="o.value" size="small"
                  :title="o.label"
                  :sub="o.price ? t('details.from', { amount: money(o.price) }) : undefined"
                  :selected="form.details[q.id] === o.value"
                  :focusable="form.details[q.id] ? form.details[q.id] === o.value : i === 0"
                  @select="form.details[q.id] = o.value; afterAnswer(q.id)"
                />
              </div>
              <p v-if="errors[q.id]" class="qf__error" role="alert">{{ errors[q.id] }}</p>
            </fieldset>
            <QuoteField
              v-else-if="q.type === 'number'"
              :id="`q-${q.id}`" v-model="form.details[q.id]" :icon="QUESTION_ICONS[q.id]" :label="questionLabel(q)"
              inputmode="numeric" :help="q.help" :error="errors[q.id]" :data-q="q.id"
            />
            <QuoteField
              v-else
              :id="`q-${q.id}`" v-model="form.details[q.id]" :label="questionLabel(q)" :help="questionHelp(q)" :error="errors[q.id]" :data-q="q.id"
              :multiline="q.id === 'description'" :voice="dictation.supported.value && q.id === 'description'"
              :recording="dictation.recording.value" @voice="dictate(text => (form.details[q.id] = join(form.details[q.id], text)))"
            />
          </template>
        </template>

        <!-- 4 Extras -->
        <template v-else-if="step === 4 && module">
          <p class="q-body">{{ t('extras.intro') }}</p>
          <div class="qf__chips">
            <QuoteChip
              v-for="a in module.addons" :key="a.key" :label="a.label" :price="a.percentBp ? `+${a.percentBp / 100}%` : `+${money(a.amount ?? 0)}`" :icon="ADDON_ICONS[a.key]"
              :on="!!form.addons[a.key]" @toggle="toggleAddon(a.key)"
            />
          </div>
        </template>

        <!-- 5 Where and when -->
        <template v-else-if="step === 5">
          <div class="qf__locate">
            <QuoteButton variant="secondary" icon="current-location" :loading="locating" @click="locate">{{ t('actions.useLocation') }}</QuoteButton>
            <p v-if="locating" class="q-small" role="status">{{ t('where.locating') }}</p>
            <p v-else-if="form.lat !== null" class="q-small qf__ok" role="status">
              <UiIcon name="check" :size="16" aria-hidden="true" /> {{ form.accuracy ? t('where.located', { metres: form.accuracy }) : t('where.locatedPlain') }}
            </p>
          </div>
          <QuoteField id="q-town" v-model="form.town" icon="map-pin" :label="t('where.type')" autocomplete="address-level2" :error="errors.where" />
          <fieldset class="qf__group" data-q="timing">
            <legend class="q-h2">{{ t('where.when') }}</legend>
            <div role="radiogroup" :aria-label="t('where.when')" class="qf__tiles qf__tiles--when" @keydown="onRadioArrows($event, TIMINGS.length, i => (form.timing = TIMINGS[i]))">
              <QuoteTile
                v-for="(w, i) in TIMINGS" :key="w" size="small" :title="t(`where.${TIMING_KEYS[w]}`)"
                :selected="form.timing === w" :focusable="form.timing ? form.timing === w : i === 0" @select="form.timing = w; afterAnswer('timing')"
              />
            </div>
            <p v-if="errors.timing" class="qf__error" role="alert">{{ errors.timing }}</p>
          </fieldset>
          <QuoteField
            id="q-note" v-model="form.note" data-q="note" :label="t('where.note')" :help="t('where.noteHelp')" multiline
            :voice="dictation.supported.value" :recording="dictation.recording.value"
            @voice="dictate(text => (form.note = join(form.note, text)))"
          />
        </template>

        <p v-if="dictation.recording.value" class="q-small" role="status">{{ t('voice.listening') }}</p>
        <p v-if="saveError" class="qf__error qf__error--block" role="alert">{{ saveError }}</p>

        <a :href="helpLink" class="qf__talk" @click="track('quote_whatsapp_help', { step })">
          <UiIcon name="brand-whatsapp" :size="18" aria-hidden="true" />{{ t('actions.talkInstead') }}
        </a>

        <!-- Actions, pinned to the bottom; on extras with the running total -->
        <!-- Step 1 has no Next: tapping an industry moves on -->
        <div v-if="step > 1" class="qf__actions">
          <div v-if="step === 4" class="qf__running" aria-live="polite">
            <span class="q-small">{{ module?.resultMode === 'custom' ? t('result.customRunning') : t('result.beforeTravel') }}</span>
            <span v-if="module?.resultMode !== 'custom'" class="qf__running-total q-num">{{ preview === null ? '…' : money(preview) }}</span>
          </div>
          <div class="qf__buttons">
            <QuoteButton v-if="step > 1" variant="secondary" icon="arrow-left" :disabled="saving" @click="back">{{ t('actions.back') }}</QuoteButton>
            <QuoteButton type="submit" :loading="saving" class="qf__next">{{ step === 5 ? t('actions.seePrice') : t('actions.next') }}</QuoteButton>
          </div>
        </div>

      </form>

      <!-- ── Result ───────────────────────────────────────────── -->
      <section v-else-if="result" class="qf__result" aria-labelledby="q-result-title">
        <h1 id="q-result-title" ref="heading" class="q-h1" tabindex="-1">{{ resultTitle }}</h1>

        <template v-if="result.mode === 'custom'">
          <p class="q-body">{{ t('result.custom') }}</p>
          <QuoteAnswers class="qf__narrow" :answers="echo" @edit="goTo" />
          <div class="qf__narrow qf__stack">
            <QuoteButton block icon="brand-whatsapp" :href="helpLink">{{ t('actions.chatWhatsapp') }}</QuoteButton>
            <QuoteButton block variant="quiet" icon="refresh" @click="startOver">{{ t('actions.startOver') }}</QuoteButton>
          </div>
        </template>

        <template v-else>
          <p v-if="result.mode === 'range'" class="q-body">{{ t('result.estimate') }}</p>
          <QuoteOptions v-model="tier" :options="result.options" :currency="result.currency" :deposit-bp="config.settings.depositBp" />
          <!-- The one action, kept within thumb reach on phones -->
          <div class="qf__book">
            <p v-if="pickedOption" class="qf__book-summary q-num">
              <span class="q-small">{{ t(`tiers.${pickedOption.tier}`) }}</span>
              <strong>{{ money(pickedOption.total) }}</strong>
            </p>
            <QuoteButton class="qf__book-btn" icon="brand-whatsapp" :href="bookLink" @click="track('quote_book_clicked', { industry: form.industry, tier })">{{ t('actions.bookWhatsapp') }}</QuoteButton>
          </div>
          <div class="qf__fine q-small">
            <p>{{ t('result.paymentLater') }}</p>
            <p v-if="!result.travelConfirmed">{{ t('result.travelUnconfirmed') }}</p>
            <p>{{ t('result.validity', { days: config.settings.quoteValidityDays }) }} {{ result.vat.charged ? t('result.vatIncluded', { rate: result.vat.rateBp / 100 }) : t('result.vatExcluded') }}</p>
            <p>{{ t('result.included') }}</p>
          </div>
          <QuoteAnswers class="qf__narrow" :answers="echo" @edit="goTo" />
          <QuoteButton class="qf__again" variant="quiet" icon="refresh" @click="startOver">{{ t('actions.startOver') }}</QuoteButton>
        </template>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { normalisePhoneHint } from '~/features/quote/phoneHint'
import { onRadioArrows } from '~/features/quote/keyboard'
import {
  ADDON_ICONS, CLIENT_TYPE_ICONS, CLIENT_TYPES_BY_INDUSTRY, DEFAULT_CLIENT_TYPES, INDUSTRY_GROUPS, INDUSTRY_ICONS, PLANNED_INDUSTRIES, QUESTION_ICONS, STEPS,
} from '~/features/quote/presentation'
import type { QuoteOptionView } from '~/components/quote/QuoteOptions.vue'
import type { IconName } from '~/types/icon'

definePageMeta({ layout: 'quote' })
useSeoMeta({ title: 'Get your 360° tour price | Viewora Capture', robots: 'noindex, nofollow' })

const runtime = useRuntimeConfig().public
if (!runtime.quoteEngine) throw createError({ statusCode: 404, statusMessage: 'Not found' })

// ── Types: what GET /quote/config sends ────────────────────────────────
interface QOption { value: string; label: string; price: number | null }
interface QQuestion {
  id: string; type: 'choice' | 'number' | 'text' | 'boolean'; label: string; help?: string
  options?: QOption[]; min?: number; max?: number; default?: string | number | boolean; required?: boolean
  showIf?: { question: string; in: string[] }; clientTypes?: string[]
}
interface QModule {
  key: string; version: number; label: string; resultMode: 'instant' | 'range' | 'custom'; from: number | null
  questions: QQuestion[]; addons: Array<{ key: string; label: string; unit: string; amount: number | null; percentBp?: number }>
}
interface QConfig {
  rateTableVersion: number
  settings: { depositBp: number; vat: { enabled: boolean; rateBp: number }; includedHostingMonths: number; quoteValidityDays: number }
  consent: { id: string; body: string } | null
  modules: QModule[]
}
interface QResult {
  mode: 'instant' | 'range' | 'custom'; currency: 'KES' | 'USD'; vat: { charged: boolean; rateBp: number }
  travelConfirmed: boolean; options: QuoteOptionView[]
}

const { t } = useQuoteStrings()
const { track } = useAnalytics()
const route = useRoute()
const router = useRouter()

const RESULT = STEPS.length + 1
const CLIENT_TYPES = ['owner', 'agent', 'developer', 'manager', 'marketer', 'other'] as const
const TIMINGS = ['this_week', 'this_month', 'planning'] as const
const TIMING_KEYS: Record<string, string> = { this_week: 'thisWeek', this_month: 'thisMonth', planning: 'planning' }
const TOKEN_KEY = 'vo-quote-token'
const DRAFT_KEY = 'vo-quote-draft'

const { data: config, pending, error: loadError, refresh } = await useFetch<QConfig>('/api/quote/config', { key: 'quote-config' })
const loadErrorMessage = computed(() => (loadError.value?.data as any)?.code === 'NO_RATE_TABLE' ? t('errors.noRates') : t('errors.loadFailed'))

const money = (n: number) => formatMoney(n, result.value?.currency ?? 'KES')

// ── State ──────────────────────────────────────────────────────────────
const step = ref(1)
const token = ref<string | null>(null)
const result = ref<QResult | null>(null)
const tier = ref('standard')
const saving = ref(false)
const saveError = ref('')
const notice = ref('')
const errors = reactive<Record<string, string>>({})
const heading = ref<HTMLElement | null>(null)

const form = reactive({
  industry: '',        // the tile picked; planned industries share the "other" module
  industryHint: '',
  moduleKey: '',
  clientType: '' as '' | typeof CLIENT_TYPES[number],
  firstName: '', whatsapp: '', email: '', consent: false, website: '',
  details: {} as Record<string, string>,
  addons: {} as Record<string, number>,
  town: '', lat: null as number | null, lng: null as number | null, accuracy: null as number | null,
  timing: '' as '' | typeof TIMINGS[number],
  note: '',
})

const entry = (() => {
  const q = route.query
  const utm = Object.fromEntries(Object.entries(q).filter(([k, v]) => /^utm_[a-z]+$/.test(k) && typeof v === 'string')) as Record<string, string>
  const source = typeof q.src === 'string' ? q.src : utm.utm_source
  return { ...(source ? { source: source.slice(0, 40) } : {}), ...(Object.keys(utm).length ? { utm } : {}) }
})()

const module = computed(() => config.value?.modules.find(m => m.key === form.moduleKey))

interface IndustryTile { key: string; moduleKey: string; hint?: string; from: number | null }
function tileFor(key: string): IndustryTile | null {
  const mods = config.value?.modules ?? []
  const m = mods.find(x => x.key === key)
  if (m) return { key, moduleKey: key, from: m.from }
  if (PLANNED_INDUSTRIES.includes(key) && mods.some(x => x.key === 'other')) return { key, moduleKey: 'other', hint: key, from: null }
  return null
}

// Step 1 groups; "other" and any module not in a group go last
const industryGroups = computed(() => {
  const grouped = INDUSTRY_GROUPS.map(g => ({ key: g.key, tiles: g.industries.map(tileFor).filter((x): x is IndustryTile => !!x) }))
  const placed = new Set(INDUSTRY_GROUPS.flatMap(g => g.industries))
  const rest = (config.value?.modules ?? []).map(m => m.key).filter(k => !placed.has(k))
    .sort((a, b) => Number(a === 'other') - Number(b === 'other'))
    .map(tileFor).filter((x): x is IndustryTile => !!x)
  return [...grouped, { key: 'other', tiles: rest }].filter(g => g.tiles.length)
})
const industryTiles = computed(() => industryGroups.value.flatMap(g => g.tiles))

// "Who are you?" options and wording follow the industry
const clientTypes = computed(() => (CLIENT_TYPES_BY_INDUSTRY[form.industry] ?? DEFAULT_CLIENT_TYPES) as Array<typeof CLIENT_TYPES[number]>)
function clientLabel(c: string) {
  const key = `clientTypesFor.${form.industry}.${c}`
  const own = t(key)
  return own === key ? t(`clientTypes.${c}`) : own
}

// Hand-priced industries reuse the "other" questions, worded for the place
function questionLabel(q: QQuestion) {
  return q.id === 'description' && form.industry !== 'other' && module.value?.resultMode === 'custom' ? t('describe.label') : q.label
}
function questionHelp(q: QQuestion) {
  if (q.id !== 'description') return q.help
  const key = `describe.${form.industry}`
  return t(key) === key ? q.help : t(key)
}

// Mirrors the engine's isVisible: client-type questions and showIf conditions
const visibleQuestions = computed(() => (module.value?.questions ?? []).filter(q =>
  (!q.clientTypes || (!!form.clientType && q.clientTypes.includes(form.clientType)))
  && (!q.showIf || q.showIf.in.includes(form.details[q.showIf.question] ?? '')),
))

const choicesFor = (q: QQuestion): QOption[] => q.type === 'boolean'
  ? [{ value: 'true', label: t('details.yes'), price: null }, { value: 'false', label: t('details.no'), price: null }]
  : q.options ?? []

// Short answers sit three across, the rest two across, so a phone shows them all
function gridFor(q: QQuestion) {
  const choices = choicesFor(q)
  return choices.length === 3 && choices.every(o => o.label.length <= 12) ? 'qf__tiles--3' : 'qf__tiles--2'
}

const stepTitle = computed(() => ({
  1: t('industryQuestion'), 2: t('steps.contact'), 3: t('steps.details'), 4: t('extras.title'), 5: t('steps.where'),
} as Record<number, string>)[step.value])

const resultTitle = computed(() => {
  const name = form.firstName.trim()
  if (result.value?.mode === 'custom') return t('result.customTitle', { name })
  return name ? t('result.title', { name }) : t('result.titleNoName')
})

// ── WhatsApp links (number from config, wording from the strings file) ──
const wa = (text: string) => `https://wa.me/${runtime.quoteWhatsapp}?text=${encodeURIComponent(text)}`
const helpLink = computed(() => wa(t('whatsappHelp', { step: step.value < RESULT ? t(`steps.${STEPS[step.value - 1]}`) : t('result.titleNoName') })))
const pickedOption = computed(() => result.value?.options.find(o => o.tier === tier.value))
const bookLink = computed(() => {
  const picked = pickedOption.value
  const link = import.meta.client && token.value ? `${location.origin}/quote?r=${token.value}` : ''
  return wa(t('whatsappBook', {
    tier: t(`tiers.${tier.value}`), amount: picked ? money(picked.total) : '', industry: t(`industries.${form.industry || form.moduleKey}`), link,
  }))
})

// ── Echo of earlier answers on the result ───────────────────────────────
const echo = computed(() => {
  const rows: Array<{ step: string; icon: IconName; label: string; value: string }> = []
  if (!module.value) return rows
  rows.push({
    step: 'industry', icon: INDUSTRY_ICONS[form.industry] ?? 'dots-circle-horizontal', label: t('industryQuestion'),
    value: [t(`industries.${form.industry || module.value.key}`), form.clientType ? clientLabel(form.clientType) : ''].filter(Boolean).join(' · '),
  })
  for (const q of visibleQuestions.value) {
    const v = form.details[q.id]
    if (!v) continue
    rows.push({ step: 'details', icon: QUESTION_ICONS[q.id] ?? 'clipboard-list', label: questionLabel(q), value: choicesFor(q).find(o => o.value === v)?.label ?? v })
  }
  const picked = module.value.addons.filter(a => form.addons[a.key]).map(a => a.label)
  rows.push({ step: 'extras', icon: 'plus', label: t('echo.extras'), value: picked.length ? picked.join(', ') : t('details.none') })
  rows.push({
    step: 'where', icon: 'map-pin', label: t('steps.where'),
    value: [form.town.trim() || (form.lat !== null ? t('echo.location') : ''), form.timing ? t(`where.${TIMING_KEYS[form.timing]}`) : ''].filter(Boolean).join(' · '),
  })
  return rows
})

// ── Choices ─────────────────────────────────────────────────────────────
// After an answer, bring the next question up if it's below the pinned
// Next bar, so nobody has to scroll to find it.
function afterAnswer(id: string) {
  nextTick(() => {
    const blocks = [...document.querySelectorAll<HTMLElement>('.qf__form [data-q]')]
    const next = blocks[blocks.findIndex(el => el.dataset.q === id) + 1]
    if (!next) return
    const bar = document.querySelector('.qf__actions')?.getBoundingClientRect().top ?? window.innerHeight
    if (next.getBoundingClientRect().top + 60 < bar) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    next.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
  })
}

function pickClientType(c: typeof CLIENT_TYPES[number], scroll: boolean) {
  form.clientType = c
  if (scroll) afterAnswer('clientType')
}

function pickIndustry(tile: IndustryTile, advance: boolean) {
  if (form.moduleKey !== tile.moduleKey) { form.details = {}; form.addons = {} }
  form.moduleKey = tile.moduleKey
  form.industry = tile.key
  form.industryHint = tile.hint ?? ''
  if (form.clientType && !clientTypes.value.includes(form.clientType)) form.clientType = ''
  // One question on this screen, so a tap moves on (Back is always there)
  if (advance && step.value === 1) setTimeout(() => { if (step.value === 1 && !saving.value) next() }, 160)
}

function applyDefaults() {
  for (const q of module.value?.questions ?? []) {
    if (q.default !== undefined && (form.details[q.id] === undefined || form.details[q.id] === '')) form.details[q.id] = String(q.default)
  }
}

function toggleAddon(key: string) {
  if (form.addons[key]) delete form.addons[key]
  else form.addons[key] = 1
}

const join = (current: string | undefined, text: string) => (current ? `${current.trim()} ${text}` : text)
const dictation = useDictation()
const dictate = (onText: (text: string) => void) => dictation.toggle(onText)

const locating = ref(false)
function locate() {
  if (!navigator.geolocation) { errors.where = t('errors.locationDenied'); return }
  locating.value = true
  navigator.geolocation.getCurrentPosition(pos => {
    form.lat = Math.round(pos.coords.latitude * 1e5) / 1e5
    form.lng = Math.round(pos.coords.longitude * 1e5) / 1e5
    form.accuracy = Math.round(pos.coords.accuracy)
    delete errors.where
    locating.value = false
  }, () => {
    errors.where = t('errors.locationDenied')
    locating.value = false
  }, { timeout: 10_000, maximumAge: 300_000 })
}

// ── Validation (the server checks again) ────────────────────────────────
function clearErrors() { for (const k of Object.keys(errors)) delete errors[k] }

// An error goes as soon as the visitor changes that answer
watch(() => form.industry, () => delete errors.industry)
watch(() => form.clientType, () => delete errors.clientType)
watch(() => form.firstName, () => delete errors.firstName)
watch(() => form.email, () => delete errors.email)
watch(() => form.whatsapp, () => { if (errors.whatsapp && !normalisePhoneHint(form.whatsapp)) delete errors.whatsapp })
watch(() => [form.town, form.lat], () => delete errors.where)
watch(() => form.timing, () => delete errors.timing)
watch(() => ({ ...form.details }), (now, before) => {
  for (const k of Object.keys(now)) if (now[k] !== before[k]) delete errors[k]
})

function checkPhone() {
  const reason = normalisePhoneHint(form.whatsapp)
  if (reason) errors.whatsapp = t(`errors.phone.${reason}`)
  else delete errors.whatsapp
}

function validate(): boolean {
  clearErrors()
  if (step.value === 1 && !form.industry) errors.industry = t('errors.required')
  if (step.value === 2) {
    if (!form.clientType) errors.clientType = t('errors.required')
    if (!form.firstName.trim()) errors.firstName = t('errors.firstName')
    checkPhone()
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = t('errors.email')
  }
  if (step.value === 3) {
    for (const q of visibleQuestions.value) {
      const v = (form.details[q.id] ?? '').trim()
      if (q.type === 'number' && v) {
        const n = Number(v); const min = q.min ?? 0; const max = q.max ?? 10_000
        if (!Number.isInteger(n) || n < min || n > max) errors[q.id] = t('errors.number', { min, max })
      } else if (q.required && !v) {
        errors[q.id] = q.type === 'text' ? t('errors.text') : q.type === 'number' ? t('errors.number', { min: q.min ?? 0, max: q.max ?? 10_000 }) : t('errors.required')
      }
    }
  }
  if (step.value === 5) {
    if (!form.town.trim() && form.lat === null) errors.where = t('errors.where')
    if (!form.timing) errors.timing = t('errors.required')
  }
  const first = Object.keys(errors)[0]
  if (first) nextTick(() => document.getElementById(`q-${first}`)?.focus())
  return !first
}

function detailsPayload() {
  const out: Record<string, string | number | boolean> = {}
  for (const q of visibleQuestions.value) {
    const v = (form.details[q.id] ?? '').trim()
    if (!v) continue
    out[q.id] = q.type === 'number' ? Number(v) : q.type === 'boolean' ? v === 'true' : v
  }
  return out
}

// ── Saving each step ────────────────────────────────────────────────────
const api = <T,>(path: string, opts: Record<string, any> = {}) => $fetch<T>(`/api/quote${path}`, opts)

function storeToken(value: string | null) {
  token.value = value
  try { value ? localStorage.setItem(TOKEN_KEY, value) : localStorage.removeItem(TOKEN_KEY) } catch {}
}

async function saveStep(): Promise<boolean> {
  if (step.value === 1) {
    if (!token.value) {
      const res = await api<{ token: string }>('/requests', {
        method: 'POST', body: { moduleKey: form.moduleKey, industryHint: form.industryHint || undefined, entry, website: form.website || undefined },
      })
      storeToken(res.token)
      return true
    }
    await api(`/requests/${token.value}`, { method: 'PATCH', body: { step: 'industry', moduleKey: form.moduleKey, industryHint: form.industryHint || undefined } })
    return true
  }
  if (step.value === 2) {
    await api(`/requests/${token.value}`, {
      method: 'PATCH',
      body: {
        step: 'contact', clientType: form.clientType, firstName: form.firstName.trim(), whatsapp: form.whatsapp.trim(), email: form.email.trim(),
        consent: form.consent, consentTextId: config.value?.consent?.id ?? null, website: form.website || undefined,
      },
    })
    return true
  }
  if (step.value === 3) {
    await api(`/requests/${token.value}`, { method: 'PATCH', body: { step: 'details', details: detailsPayload() } })
    return true
  }
  if (step.value === 4) {
    await api(`/requests/${token.value}`, { method: 'PATCH', body: { step: 'extras', addons: { ...form.addons } } })
    return true
  }
  const res = await api<{ result: QResult }>(`/requests/${token.value}`, {
    method: 'PATCH',
    body: {
      step: 'where',
      location: { ...(form.town.trim() ? { town: form.town.trim() } : {}), ...(form.lat !== null ? { lat: form.lat, lng: form.lng } : {}) },
      timing: form.timing,
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
    },
  })
  result.value = res.result
  tier.value = res.result.options.find(o => o.tier === 'standard')?.tier ?? res.result.options[0]?.tier ?? 'standard'
  return true
}

function handleSaveError(e: any) {
  const status = e?.statusCode ?? e?.response?.status
  const data = e?.data ?? {}
  if (status === 400 && Array.isArray(data.fields)) {
    for (const f of data.fields) {
      const field = f.field as string
      errors[field] = field === 'whatsapp' ? t(`errors.phone.${f.message}`) : field === 'email' ? t('errors.email') : t('errors.required')
    }
    return
  }
  if (status === 404 || status === 410) {
    storeToken(null)
    notice.value = status === 410 ? t('errors.expired') : t('errors.notFound')
    step.value = 1
    return
  }
  if (status === 409) { step.value = data.code === 'CONTACT_REQUIRED' ? 2 : 1; return }
  if (status === 503) { saveError.value = t('errors.noRates'); return }
  saveError.value = import.meta.client && !navigator.onLine ? t('errors.offline') : t('errors.saveFailed')
}

async function next() {
  saveError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    await saveStep()
    goTo(step.value + 1)
  } catch (e) {
    handleSaveError(e)
  } finally {
    saving.value = false
  }
}

function back() { goTo(step.value - 1) }

function goTo(target: number | string) {
  const n = typeof target === 'number' ? target : STEPS.indexOf(target as typeof STEPS[number]) + 1
  clearErrors()
  saveError.value = ''
  step.value = Math.min(Math.max(n, 1), RESULT)
}

function startOver() {
  storeToken(null)
  try { localStorage.removeItem(DRAFT_KEY) } catch {}
  Object.assign(form, {
    industry: '', industryHint: '', moduleKey: '', clientType: '', details: {}, addons: {}, town: '', lat: null, lng: null, accuracy: null, timing: '', note: '',
  })
  result.value = null
  notice.value = ''
  reached.clear()
  goTo(1)
}

// ── Running total on the extras step, priced by the real engine ─────────
const preview = ref<number | null>(null)
let previewTimer: ReturnType<typeof setTimeout> | undefined
watch(() => [step.value, JSON.stringify(form.addons)], () => {
  if (step.value !== 4 || !module.value || module.value.resultMode === 'custom') return
  preview.value = null
  clearTimeout(previewTimer)
  previewTimer = setTimeout(async () => {
    try {
      const res = await api<{ beforeTravel: number | null }>('/preview', {
        method: 'POST',
        body: { moduleKey: form.moduleKey, clientType: form.clientType || undefined, details: detailsPayload(), addons: { ...form.addons } },
      })
      preview.value = res.beforeTravel
    } catch { preview.value = null }
  }, 250)
})

// ── Step changes: focus, defaults, analytics (never personal data) ──────
const reached = new Set<number>()
const abandoned = new Set<number>()
const stepName = (n: number) => (n === RESULT ? 'result' : STEPS[n - 1])

watch(step, n => {
  if (n === 3) applyDefaults()
  if (import.meta.client) {
    window.scrollTo({ top: 0 })
    nextTick(() => heading.value?.focus({ preventScroll: true }))
  }
  if (!reached.has(n)) {
    reached.add(n)
    if (n === RESULT) track('quote_result_viewed', { industry: form.industry, mode: result.value?.mode, source: entry.source ?? null })
    else track('quote_step_reached', { step: n, step_name: stepName(n), industry: form.industry || null, source: entry.source ?? null })
  }
})

function onHidden() {
  if (document.visibilityState !== 'hidden' || step.value === RESULT || abandoned.has(step.value)) return
  abandoned.add(step.value)
  track('quote_step_abandoned', { step: step.value, step_name: stepName(step.value), industry: form.industry || null })
}

// The non-personal answers stay on this phone too, so nothing is lost offline
watch(() => [form.industry, form.clientType, form.details, form.addons, form.town, form.timing], () => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      industry: form.industry, industryHint: form.industryHint, moduleKey: form.moduleKey, clientType: form.clientType, details: form.details, addons: form.addons, town: form.town, timing: form.timing,
    }))
  } catch {}
}, { deep: true })

// ── Resume: ?r=token from a WhatsApp link, or the token on this phone ───
async function resume() {
  let saved: string | null = typeof route.query.r === 'string' ? route.query.r : null
  if (saved) router.replace({ query: { ...route.query, r: undefined } })
  try { saved = saved ?? localStorage.getItem(TOKEN_KEY) } catch {}

  if (saved && /^[A-Za-z0-9_-]{32}$/.test(saved)) {
    try {
      const res = await api<{ request: any; contact: any; result: QResult | null }>(`/requests/${saved}`)
      storeToken(saved)
      const a = res.request.answers ?? {}
      Object.assign(form, {
        moduleKey: res.request.moduleKey ?? '',
        industry: res.request.industryHint ?? res.request.moduleKey ?? '',
        industryHint: res.request.industryHint ?? '',
        clientType: res.request.clientType ?? '',
        details: Object.fromEntries(Object.entries(a.details ?? {}).map(([k, v]) => [k, String(v)])),
        addons: { ...(a.addons ?? {}) },
        town: a.location?.town ?? '',
        lat: a.location?.lat ?? null,
        lng: a.location?.lng ?? null,
        timing: a.timing ?? '',
        note: a.note ?? '',
      })
      if (res.contact) Object.assign(form, { firstName: res.contact.firstName ?? '', whatsapp: res.contact.whatsapp ?? '', email: res.contact.email ?? '' })
      if (res.result) {
        result.value = res.result
        tier.value = res.result.options.find(o => o.tier === 'standard')?.tier ?? res.result.options[0]?.tier ?? 'standard'
        step.value = RESULT
      } else {
        step.value = Math.min(Math.max(res.request.stepReached + 1, 1), STEPS.length)
      }
      return
    } catch (e: any) {
      const status = e?.statusCode ?? e?.response?.status
      storeToken(null)
      if (status === 410) notice.value = t('errors.expired')
      else if (status === 404) notice.value = t('errors.notFound')
    }
  }
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null')
    if (draft && config.value?.modules.some(m => m.key === draft.moduleKey)) {
      Object.assign(form, { industry: draft.industry ?? draft.moduleKey, industryHint: draft.industryHint ?? '', moduleKey: draft.moduleKey, clientType: draft.clientType ?? '', details: draft.details ?? {}, addons: draft.addons ?? {}, town: draft.town ?? '', timing: draft.timing ?? '' })
    }
  } catch {}
}

onMounted(async () => {
  document.addEventListener('visibilitychange', onHidden)
  track('quote_form_viewed', { source: entry.source ?? null })
  if (config.value) await resume()
  if (!reached.has(step.value)) {
    reached.add(step.value)
    track(step.value === RESULT ? 'quote_result_viewed' : 'quote_step_reached', { step: step.value, step_name: stepName(step.value), industry: form.industry || null, source: entry.source ?? null })
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onHidden)
  clearTimeout(previewTimer)
})
</script>

<style scoped>
.qf { max-width: 560px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.qf--wide { max-width: 1040px; }
.qf--mid { max-width: 840px; }
.qf__form, .qf__result { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
.qf__title:focus { outline: none; }
/* One line on a 360 px phone, so the choices sit higher */
@media (max-width: 559px) { .qf .qf__title { font-size: 1.375rem; } }
.qf__narrow { max-width: 560px; }
.qf__stack { display: grid; gap: 10px; }
.qf__row { display: flex; flex-wrap: wrap; gap: 10px; }

.qf__group { display: grid; gap: 10px; border: 0; padding: 0; margin: 0; min-width: 0; }
.qf__group legend { padding: 0; margin-bottom: 10px; }
.qf__tiles { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.qf__industries { display: grid; gap: 12px; }
.qf__industry-group { display: grid; gap: 6px; min-width: 0; }
.qf__group-label { font-size: var(--q-text-xs); font-weight: 600; letter-spacing: 0.02em; color: var(--q-ink-2); text-transform: uppercase; }
/* Wider screens: the group name sits to the left of its tiles */
@media (min-width: 720px) {
  .qf__industry-group { grid-template-columns: 150px minmax(0, 1fr); align-items: start; column-gap: 16px; }
  .qf__group-label { padding-top: 12px; }
  .qf__industry-group:not(:has(.qf__group-label)) .qf__tiles { grid-column: 2; }
}
.qf [data-q] { scroll-margin-top: 16px; }
@media (max-width: 559px) {
  /* A lone tile at the end of a group takes the full row instead of leaving a gap */
  .qf__tiles--industry > :last-child:nth-child(odd) { grid-column: 1 / -1; min-height: 52px; }
}
/* Short phones: drop the reassurance line so the industries fit */
@media (max-height: 700px) and (max-width: 559px) {
  .qf__intro { display: none; }
  .qf--mid .qf__form { gap: 12px; }
  .qf__industries { gap: 8px; }
  .qf__industry-group { gap: 4px; }
  .qf__tiles--industry :deep(.q-tile--compact) { padding-block: 6px; min-height: 56px; }
}
.qf__tiles--3, .qf__tiles--when { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.qf__tiles--2, .qf__tiles--industry { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
@media (min-width: 560px) {
  .qf__tiles--industry { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .qf__tiles--when { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.qf__chips { display: flex; flex-wrap: wrap; gap: 8px; }

.qf__consent { display: flex; gap: 12px; align-items: flex-start; min-height: var(--q-tap); cursor: pointer; }
.qf__consent input { width: 22px; height: 22px; margin-top: 1px; accent-color: var(--q-ink); flex: none; }
.qf__hint { margin-top: -8px; }
/* Bots fill every field; people never see this one */
.qf__honeypot { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }

.qf__locate { display: grid; gap: 8px; justify-items: start; }
.qf__ok { display: inline-flex; align-items: center; gap: 6px; color: var(--q-good); }

.qf__error { font-size: var(--q-text-sm); color: var(--q-bad); }
.qf__error--block { padding: 10px 12px; background: var(--q-bad-bg); border-radius: var(--q-radius-sm); color: var(--q-ink); border-left: 3px solid var(--q-bad); }
.qf__notice { padding: 10px 12px; background: var(--q-warn-bg); color: var(--q-ink); border-radius: var(--q-radius-sm); font-size: var(--q-text-sm); }

.qf__actions { display: grid; gap: 12px; padding-top: 4px; }
.qf__buttons { display: flex; gap: 10px; }
.qf__next { flex: 1; }
/* Back and Next stay within thumb reach, so nobody has to hunt for them.
   On extras the running total rides along. */
.qf__actions {
  position: sticky; bottom: 0; z-index: 2;
  margin: 0 calc(-1 * var(--q-gutter)); padding: 12px var(--q-gutter) calc(12px + env(safe-area-inset-bottom));
  background: var(--q-surface); border-top: 1px solid var(--q-border);
}
.qf__running { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.qf__running-total { font-size: var(--q-text-lg); font-weight: 700; white-space: nowrap; }

.qf__talk {
  display: inline-flex; align-items: center; gap: 8px; justify-self: start; min-height: var(--q-tap);
  color: var(--q-ink-2); font-size: var(--q-text-sm); text-decoration: underline; text-underline-offset: 3px;
}
.qf__talk:hover { color: var(--q-ink); }
.qf__talk:focus-visible { outline: none; box-shadow: var(--q-focus); border-radius: 4px; }

.qf__fine { display: grid; gap: 6px; max-width: 640px; }
.qf__again { justify-self: start; }
.qf__book { display: flex; align-items: center; gap: 16px; max-width: 560px; }
.qf__book-summary { display: grid; gap: 2px; white-space: nowrap; }
.qf__book-summary strong { font-size: var(--q-text-lg); }
.qf__book-btn { flex: 1; white-space: nowrap; }
@media (max-width: 899px) {
  .qf__book-summary strong { font-size: var(--q-text-md); }
  .qf__book {
    gap: 12px;
    position: sticky; bottom: 0; z-index: 2; max-width: none;
    margin: 0 calc(-1 * var(--q-gutter)); padding: 12px var(--q-gutter) calc(12px + env(safe-area-inset-bottom));
    background: var(--q-surface); border-top: 1px solid var(--q-border);
  }
}

.qf__state { display: grid; gap: 12px; padding: 18px; background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius); }
.qf__state--error { border-color: var(--q-bad); background: var(--q-bad-bg); }
.qf__state-title { font-weight: 600; }
.qf__skeleton { display: block; height: 14px; border-radius: 4px; background: var(--q-sunken); }
.qf__skeleton--short { width: 60%; }
</style>
