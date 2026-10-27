<template>
  <div class="sheet">
    <header class="sheet__intro">
      <h1 class="q-h1">Quote engine: tokens and components</h1>
      <p class="q-body">
        For review before any screen is built. Prices on this page come from rate table
        v{{ samples.rateTableVersion }}, run through the pricing engine. Admin rows are labelled examples.
      </p>
    </header>

    <!-- ── Tokens ───────────────────────────────────────────── -->
    <section class="sheet__section" aria-labelledby="s-colour">
      <h2 id="s-colour" class="q-h2">Colour</h2>
      <p class="q-small">A neutral base, ink for text and the one primary action, and green as the single accent. Contrast is measured against the surface it sits on.</p>
      <ul class="swatches">
        <li v-for="s in swatches" :key="s.name" class="swatch">
          <span class="swatch__chip" :style="{ background: s.hex }" />
          <span class="swatch__name">{{ s.name }}</span>
          <span class="swatch__meta q-num">{{ s.hex }} · {{ s.use }}</span>
          <span v-if="s.on" class="swatch__meta q-num">{{ contrast(s.hex, s.on).toFixed(1) }}:1 on {{ s.onName }}</span>
        </li>
      </ul>
    </section>

    <section class="sheet__section" aria-labelledby="s-type">
      <h2 id="s-type" class="q-h2">Type</h2>
      <div class="type-scale">
        <p class="q-h1">What are we shooting?</p>
        <p class="q-h2">Pick the closest size</p>
        <p class="q-body">We shoot each room type plus the public areas, not every room.</p>
        <p class="q-small">Every tour includes 12 months of hosting.</p>
        <p class="q-label">STEP LABEL / TABLE HEADER</p>
        <p class="price-demo q-num">{{ money(samples.result.options[1].total) }} <span class="q-small">tabular numerals</span></p>
      </div>
    </section>

    <!-- ── Controls ─────────────────────────────────────────── -->
    <section class="sheet__section" aria-labelledby="s-buttons">
      <h2 id="s-buttons" class="q-h2">Buttons</h2>
      <p class="q-small">One primary per screen. 48 px high. Press to see the pressed state; tab to see focus.</p>
      <div class="row">
        <QuoteButton>{{ t('actions.next') }}</QuoteButton>
        <QuoteButton variant="secondary">{{ t('actions.back') }}</QuoteButton>
        <QuoteButton variant="secondary" icon="brand-whatsapp">{{ t('actions.chatWhatsapp') }}</QuoteButton>
        <QuoteButton variant="quiet">{{ t('actions.emailPdf') }}</QuoteButton>
        <QuoteButton loading>Saving</QuoteButton>
        <QuoteButton disabled>{{ t('actions.next') }}</QuoteButton>
      </div>
    </section>

    <section class="sheet__section" aria-labelledby="s-inputs">
      <h2 id="s-inputs" class="q-h2">Inputs</h2>
      <div class="stack narrow">
        <QuoteField id="f-name" v-model="name" :label="t('contact.firstName')" autocomplete="given-name" />
        <QuoteField
          id="f-phone" v-model="phone" :label="t('contact.whatsapp')" type="tel" inputmode="tel"
          autocomplete="tel" :help="t('contact.whatsappHelp')" :error="phoneError"
          @blur="phoneTouched = true"
        />
        <QuoteField
          id="f-note" v-model="note" label="Anything we should know? (optional)" multiline voice
          :recording="recording" @voice="recording = !recording"
        />
        <label class="consent">
          <input v-model="consent" type="checkbox">
          <span class="q-small">{{ t('contact.consent') }}</span>
        </label>
        <p class="flag">Consent wording is a draft for the lawyer's review. The mic button toggles a state only; the recorder loads on tap in the real form.</p>
      </div>
    </section>

    <section class="sheet__section" aria-labelledby="s-progress">
      <h2 id="s-progress" class="q-h2">Progress</h2>
      <div class="narrow"><QuoteProgress :step="2" :total="5" /></div>
    </section>

    <section class="sheet__section" aria-labelledby="s-tiles">
      <h2 id="s-tiles" class="q-h2">Tiles</h2>
      <p class="q-small">Large tap targets in a radiogroup; arrow keys move between them. "From" prices are generated from the rate table.</p>
      <div role="radiogroup" aria-label="Industry" class="tiles" @keydown="onArrows($event, samples.tiles.length, i => (industry = samples.tiles[i].key))">
        <QuoteTile
          v-for="tile in samples.tiles" :key="tile.key"
          :title="tile.label"
          :sub="tile.from ? `From ${money(tile.from)}` : 'We reply with a price'"
          :selected="industry === tile.key"
          :focusable="industry === tile.key"
          @select="industry = tile.key"
        />
      </div>
      <div role="radiogroup" aria-label="Who are you?" class="tiles tiles--2" @keydown="onArrows($event, clientTypes.length, i => (clientType = clientTypes[i].key))">
        <QuoteTile
          v-for="c in clientTypes" :key="c.key" :title="c.label"
          :selected="clientType === c.key" :focusable="clientType === c.key" @select="clientType = c.key"
        />
      </div>
      <div class="tour-frame">
        <span class="q-small">Industry tiles get a frame from a live Viewora tour here. Which tours should I use for each industry?</span>
      </div>
    </section>

    <section class="sheet__section" aria-labelledby="s-chips">
      <h2 id="s-chips" class="q-h2">Chips and the running total</h2>
      <div class="chips">
        <QuoteChip
          v-for="a in samples.addons" :key="a.key" :label="a.label" :price="`+${money(a.amount)}`"
          :on="!!picked[a.key]" @toggle="picked[a.key] = !picked[a.key]"
        />
      </div>
      <div class="running" aria-live="polite">
        <span class="q-small">{{ t('result.runningTotal') }}</span>
        <span class="running__total q-num">{{ money(runningTotal) }}</span>
        <QuoteButton>{{ t('actions.next') }}</QuoteButton>
      </div>
      <p class="q-small">On the extras step this bar sticks to the bottom of the screen, within thumb reach.</p>
    </section>

    <!-- ── Result ───────────────────────────────────────────── -->
    <section class="sheet__section" aria-labelledby="s-options">
      <h2 id="s-options" class="q-h2">Three options</h2>
      <p class="q-small">2 bedroom in Nairobi, to let, with 20 edited photos. Output of the engine.</p>
      <div class="options">
        <article v-for="o in samples.result.options" :key="o.tier" class="option" :class="{ 'option--picked': o.tier === 'standard' }">
          <header>
            <h3 class="option__tier">{{ t(`tiers.${o.tier}`) }}</h3>
            <p class="q-small">{{ t(`tiers.${o.tier}Note`) }}</p>
          </header>
          <p class="option__total q-num">{{ money(o.total) }}</p>
          <ul class="option__lines">
            <li v-for="l in o.lines.filter(x => x.amount !== 0 || x.kind === 'travel')" :key="l.key">
              <span>{{ l.label }}</span>
              <span class="q-num">{{ l.amount === 0 ? 'Free' : money(l.amount) }}</span>
            </li>
          </ul>
          <p class="q-small q-num">{{ t('result.deposit', { amount: money(o.deposit) }) }}</p>
          <QuoteButton :variant="o.tier === 'standard' ? 'primary' : 'secondary'" block>
            Choose {{ t(`tiers.${o.tier}`) }}
          </QuoteButton>
        </article>
      </div>
      <p class="q-small">{{ samples.result.vat.charged ? t('result.vatIncluded', { rate: samples.result.vat.rateBp / 100 }) : t('result.vatExcluded') }} {{ t('result.included') }}</p>
    </section>

    <!-- ── Admin ────────────────────────────────────────────── -->
    <section class="sheet__section" aria-labelledby="s-pills">
      <h2 id="s-pills" class="q-h2">Status pills (admin)</h2>
      <div class="row">
        <QuoteStatusPill v-for="s in stages" :key="s" :stage="s" />
      </div>
    </section>

    <section class="sheet__section" aria-labelledby="s-table">
      <h2 id="s-table" class="q-h2">Table (admin)</h2>
      <p class="flag">Example rows, not real leads.</p>
      <div class="table-wrap">
        <table class="q-table">
          <thead>
            <tr><th>Name</th><th>Industry</th><th>Source</th><th>Step</th><th>Last activity</th><th>Owner</th><th>Stage</th><th class="q-right">Quote</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in exampleRows" :key="r.name">
              <td>{{ r.name }}</td><td>{{ r.industry }}</td><td>{{ r.source }}</td>
              <td class="q-num">{{ r.step }} of 5</td><td>{{ r.ago }}</td><td>{{ r.owner }}</td>
              <td><QuoteStatusPill :stage="r.stage" /></td>
              <td class="q-right q-num">{{ r.total ? money(r.total) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="sheet__section" aria-labelledby="s-states">
      <h2 id="s-states" class="q-h2">Empty, loading and error states</h2>
      <div class="states">
        <div class="state">
          <p class="state__title">No leads yet</p>
          <p class="q-small">New quote requests appear here the moment someone finishes step 1. Share a /q link from a DM to get the first one.</p>
        </div>
        <div class="state" aria-busy="true">
          <span class="skeleton" /><span class="skeleton skeleton--short" />
          <p class="q-small">Working out your price…</p>
        </div>
        <div class="state state--error" role="alert">
          <p class="state__title">{{ t('errors.saveFailed') }}</p>
          <QuoteButton variant="secondary">Try again</QuoteButton>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import samples from '~/features/quote/sheetSamples.generated.json'
import { normalisePhoneHint } from '~/features/quote/phoneHint'

definePageMeta({ layout: 'quote' })
useSeoMeta({ title: 'Quote components | Viewora', robots: 'noindex, nofollow' })

if (!useRuntimeConfig().public.quoteEngine) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

const { t } = useQuoteStrings()
const money = (n: number) => formatMoney(n, 'KES')

const name = ref('')
const phone = ref('07123')
const phoneTouched = ref(true)
const phoneError = computed(() => {
  if (!phoneTouched.value) return undefined
  const reason = normalisePhoneHint(phone.value)
  return reason ? t(`errors.phone.${reason}`) : undefined
})
const note = ref('')
const recording = ref(false)
const consent = ref(false)

const industry = ref('homes')
const clientTypes = [
  { key: 'owner', label: 'Owner' }, { key: 'agent', label: 'Agent' },
  { key: 'developer', label: 'Developer' }, { key: 'manager', label: 'Manager' },
]
const clientType = ref('owner')

function onArrows(e: KeyboardEvent, count: number, pick: (i: number) => void) {
  const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
  if (!(e.key in keys)) return
  e.preventDefault()
  const tiles = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="radio"]')]
  const i = (tiles.indexOf(document.activeElement as HTMLElement) + keys[e.key] + count) % count
  pick(i)
  nextTick(() => tiles[i]?.focus())
}

const picked = reactive<Record<string, boolean>>({ photos_20: true })
const baseTotal = samples.result.options[0].total
const runningTotal = computed(() => baseTotal + samples.addons.filter(a => picked[a.key]).reduce((s, a) => s + (a.amount ?? 0), 0))

const stages = ['new', 'contacted', 'quoted', 'booked', 'delivered', 'paid', 'lost'] as const
const exampleRows: Array<{ name: string; industry: string; source: string; step: number; ago: string; owner: string; stage: typeof stages[number]; total: number | null }> = [
  { name: 'Example A', industry: 'Homes', source: 'Instagram', step: 5, ago: '4 min ago', owner: 'Lead handler', stage: 'new', total: samples.result.options[1].total },
  { name: 'Example B', industry: 'Hotels', source: 'WhatsApp', step: 3, ago: '2 h ago', owner: 'Peter', stage: 'contacted', total: null },
  { name: 'Example C', industry: 'Something else', source: 'TikTok', step: 5, ago: 'Yesterday', owner: '—', stage: 'quoted', total: null },
]

// WCAG relative-luminance contrast, so the ratios on this page are measured, not claimed
function luminance(hex: string) {
  const c = hex.replace('#', '').match(/../g)!.map(x => parseInt(x, 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
const swatches = [
  { name: 'Page', hex: '#f8f8f7', use: 'background' },
  { name: 'Surface', hex: '#ffffff', use: 'cards, inputs' },
  { name: 'Border', hex: '#dededb', use: 'dividers' },
  { name: 'Ink', hex: '#111111', use: 'text, primary button', on: '#ffffff', onName: 'white' },
  { name: 'Ink 2', hex: '#5f5f5c', use: 'secondary text', on: '#ffffff', onName: 'white' },
  { name: 'Ink 3', hex: '#6f6f6a', use: 'hints, placeholders', on: '#ffffff', onName: 'white' },
  { name: 'Accent', hex: '#00dc82', use: 'selected, progress; never text', on: '#111111', onName: 'ink' },
  { name: 'Accent tint', hex: '#e6fbf2', use: 'selected fill', on: '#111111', onName: 'ink' },
  { name: 'Error', hex: '#b91c1c', use: 'errors only', on: '#ffffff', onName: 'white' },
]
</script>

<style scoped>
.sheet { max-width: 1040px; margin: 0 auto; display: grid; gap: 40px; }
.sheet__intro { display: grid; gap: 8px; max-width: 640px; }
.sheet__section { display: grid; gap: 14px; padding-top: 24px; border-top: 1px solid var(--q-border); }
.narrow { max-width: 420px; }
.stack { display: grid; gap: 16px; }
.row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.flag { font-size: var(--q-text-sm); color: var(--q-warn); background: var(--q-warn-bg); padding: 8px 12px; border-radius: var(--q-radius-sm); }

.swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.swatch { display: grid; grid-template-columns: 40px 1fr; column-gap: 12px; align-items: center; padding: 10px; background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius); }
.swatch__chip { grid-row: span 3; width: 40px; height: 40px; border-radius: var(--q-radius-sm); border: 1px solid var(--q-border); }
.swatch__name { font-weight: 600; font-size: var(--q-text-sm); }
.swatch__meta { font-size: var(--q-text-xs); color: var(--q-ink-2); }

.type-scale { display: grid; gap: 10px; }
.price-demo { font-size: var(--q-text-xl); font-weight: 700; }

.consent { display: flex; gap: 12px; align-items: flex-start; min-height: var(--q-tap); cursor: pointer; }
.consent input { width: 22px; height: 22px; margin-top: 1px; accent-color: var(--q-ink); flex: none; }

.tiles { display: grid; gap: 10px; }
.tiles--2 { grid-template-columns: 1fr 1fr; }
@media (min-width: 768px) { .tiles { grid-template-columns: repeat(4, 1fr); } }
.tour-frame { display: grid; place-items: center; min-height: 120px; padding: 16px; border: 1px dashed var(--q-border-strong); border-radius: var(--q-radius); background: var(--q-sunken); text-align: center; }

.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.running { display: flex; align-items: center; gap: 12px; padding: 12px var(--q-gutter); background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius); }
.running__total { font-size: var(--q-text-lg); font-weight: 700; margin-right: auto; white-space: nowrap; }

.options { display: grid; gap: 12px; }
@media (min-width: 900px) { .options { grid-template-columns: repeat(3, 1fr); align-items: start; } }
.option { display: grid; gap: 12px; padding: 18px; background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius-lg); }
.option--picked { border-color: var(--q-ink); box-shadow: inset 0 0 0 1px var(--q-ink); }
.option__tier { font-size: var(--q-text-md); font-weight: 700; }
.option__total { font: 700 var(--q-text-xl)/1 var(--q-font); }
.option__lines { display: grid; gap: 6px; padding: 12px 0; border-block: 1px solid var(--q-border); font-size: var(--q-text-sm); }
.option__lines li { display: flex; justify-content: space-between; gap: 12px; }
.option__lines li span:first-child { color: var(--q-ink-2); }

.table-wrap { overflow-x: auto; border: 1px solid var(--q-border); border-radius: var(--q-radius); max-width: 100%; }

.states { display: grid; gap: 12px; }
@media (min-width: 768px) { .states { grid-template-columns: repeat(3, 1fr); } }
.state { display: grid; gap: 10px; align-content: start; padding: 18px; background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius); }
.state--error { border-color: var(--q-bad); background: var(--q-bad-bg); }
.state__title { font-weight: 600; }
.skeleton { display: block; height: 14px; border-radius: 4px; background: linear-gradient(90deg, var(--q-sunken), var(--q-border), var(--q-sunken)); background-size: 200% 100%; animation: shimmer 1.2s linear infinite; }
.skeleton--short { width: 60%; }
@keyframes shimmer { to { background-position: -200% 0; } }
</style>
