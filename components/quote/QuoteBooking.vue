<template>
  <section class="qb" aria-labelledby="qb-title">
    <header class="qb__head">
      <h2 id="qb-title" class="q-h2">{{ firstName ? t('booking.title', { name: firstName }) : t('booking.titleNoName') }}</h2>
      <p class="q-num">
        {{ job.balanceStatus === 'paid' && job.balanceAmount === 0
          ? t('booking.paidFull', { amount: money(job.depositAmount), option: optionName })
          : t('booking.paid', { amount: money(job.depositAmount), option: optionName }) }}
      </p>
      <p class="q-small">{{ t('booking.ref', { ref: job.ref }) }}</p>
    </header>

    <!-- Delivered -->
    <div v-if="job.tourUrl" class="qb__block">
      <h3 class="qb__h3">{{ t('booking.readyTitle') }}</h3>
      <QuoteButton :href="job.tourUrl" icon="external-link" class="qb__solo">{{ t('booking.open') }}</QuoteButton>
    </div>

    <!-- Shoot day -->
    <div v-else-if="job.shootDateStatus === 'confirmed'" class="qb__block qb__block--good" role="status">
      <p class="qb__strong">{{ t('booking.confirmed', { day: dayLong(job.shootDate!), window: windowName(job.shootWindow!).toLowerCase() }) }}</p>
      <p class="q-small">{{ t('booking.changeConfirmed') }}</p>
    </div>

    <div v-else-if="job.shootDateStatus === 'requested' && !changing" class="qb__block" role="status">
      <p class="qb__strong">{{ t('booking.requested', { day: dayLong(job.shootDate!), window: windowName(job.shootWindow!).toLowerCase() }) }}</p>
      <QuoteButton variant="secondary" icon="calendar" class="qb__solo" @click="startChange">{{ t('booking.change') }}</QuoteButton>
    </div>

    <form v-else-if="canPick" class="qb__block" @submit.prevent="save">
      <div>
        <h3 class="qb__h3">{{ t('booking.pickTitle') }}</h3>
        <p class="q-small">{{ t('booking.pickHelp') }}</p>
      </div>

      <div v-if="loading" class="qb__skeleton" aria-busy="true"><span /><span /><span /></div>
      <div v-else-if="loadError" class="qb__error" role="alert">
        <p>{{ t('booking.loadFailed') }}</p>
        <QuoteButton variant="secondary" icon="refresh" @click="load">{{ t('actions.retry') }}</QuoteButton>
      </div>
      <p v-else-if="!openDays.length" class="q-body" role="status">{{ t('booking.noDays') }}</p>

      <template v-else>
        <fieldset class="qb__set">
          <legend class="q-small qb__legend">{{ t('booking.dayLabel') }}</legend>
          <div class="qb__days" role="radiogroup" :aria-label="t('booking.dayLabel')">
            <button
              v-for="d in shownDays" :key="d.date" type="button" role="radio"
              class="qb__day" :class="{ 'qb__day--on': date === d.date }"
              :aria-checked="date === d.date" :disabled="!d.slots.some(s => s.open)"
              @click="pickDay(d.date)"
            >
              <span class="qb__dow">{{ dayParts(d.date).dow }}</span>
              <span class="qb__dnum q-num">{{ dayParts(d.date).day }}</span>
              <span class="qb__dmon">{{ d.slots.some(s => s.open) ? dayParts(d.date).month : t('booking.full') }}</span>
            </button>
          </div>
          <QuoteButton v-if="shownDays.length < openDays.length" variant="quiet" icon="chevron-down" class="qb__solo" @click="showAll = true">{{ t('booking.moreDays') }}</QuoteButton>
        </fieldset>

        <fieldset v-if="date" class="qb__set">
          <legend class="q-small qb__legend">{{ t('booking.windowLabel') }}</legend>
          <div class="qb__windows" role="radiogroup" :aria-label="t('booking.windowLabel')">
            <button
              v-for="s in selectedDay?.slots ?? []" :key="s.window" type="button" role="radio"
              class="qb__window" :class="{ 'qb__window--on': window === s.window }"
              :aria-checked="window === s.window" :disabled="!s.open"
              @click="window = s.window"
            >
              {{ windowName(s.window) }}<span v-if="!s.open" class="q-small"> · {{ t('booking.full') }}</span>
            </button>
          </div>
        </fieldset>

        <p v-if="saveError" class="qb__error" role="alert">{{ saveError }}</p>
        <QuoteButton type="submit" icon="calendar" :loading="saving" :disabled="!date || !window" block>
          {{ date && window ? t('booking.request', { day: dayShort(date), window: windowName(window).toLowerCase() }) : t('booking.pickBoth') }}
        </QuoteButton>
      </template>
    </form>

    <div class="qb__block">
      <h3 class="qb__h3">{{ t('booking.prepTitle') }}</h3>
      <ul class="qb__prep">
        <li v-for="i in 4" :key="i"><UiIcon name="check" :size="16" :stroke-width="2.5" aria-hidden="true" />{{ t(`booking.prep${i}`) }}</li>
      </ul>
    </div>

    <p class="q-small q-num">
      {{ job.balanceStatus === 'paid' ? t('booking.balancePaid') : t('booking.balance', { amount: money(job.balanceAmount) }) }}
    </p>
  </section>
</template>

<script setup lang="ts">
// Shown on the quote page once the deposit is paid: what was paid, the
// shoot day (the client asks, staff confirm), how to prepare, and what is
// still owed. Days and slots come from the backend's booking rules.

export interface PublicJob {
  ref: string; status: string; tier: string | null; currency: 'KES' | 'USD'
  depositAmount: number; depositPaidAt: string | null; balanceAmount: number; balanceStatus: 'pending' | 'paid' | 'waived'
  shootDate: string | null; shootWindow: 'morning' | 'afternoon' | null; shootDateStatus: 'none' | 'requested' | 'confirmed'
  tourUrl: string | null
}
interface Day { date: string; slots: Array<{ window: 'morning' | 'afternoon'; open: boolean }> }

const props = defineProps<{ job: PublicJob; token: string; firstName?: string | null }>()
const emit = defineEmits<{ updated: [job: PublicJob] }>()
const { t } = useQuoteStrings()
const { track } = useAnalytics()

const money = (n: number) => formatMoney(n, props.job.currency)
const optionName = computed(() => (props.job.tier ? t(`tiers.${props.job.tier}`) : ''))
const windowName = (w: string) => t(`booking.${w}`)
// Plain dates, read at noon UTC so no time zone moves them
const at = (d: string) => new Date(`${d}T12:00:00Z`)
const dayLong = (d: string) => at(d).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const dayShort = (d: string) => at(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const dayParts = (d: string) => ({
  dow: at(d).toLocaleDateString('en-KE', { weekday: 'short', timeZone: 'UTC' }),
  day: at(d).getUTCDate(),
  month: at(d).toLocaleDateString('en-KE', { month: 'short', timeZone: 'UTC' }),
})

const canPick = computed(() => ['booked', 'scheduled'].includes(props.job.status) && props.job.shootDateStatus !== 'confirmed')
const changing = ref(false)
const days = ref<Day[]>([])
const loading = ref(false)
const loadError = ref(false)
const showAll = ref(false)
const date = ref<string | null>(null)
const window = ref<'morning' | 'afternoon' | null>(null)
const saving = ref(false)
const saveError = ref('')

const openDays = computed(() => days.value)
const shownDays = computed(() => (showAll.value ? openDays.value : openDays.value.slice(0, 12)))
const selectedDay = computed(() => days.value.find(d => d.date === date.value))

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const r = await $fetch<{ days: Day[] }>(`/api/quote/view/${props.token}/booking`)
    days.value = r.days
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function pickDay(d: string) {
  date.value = d
  const open = selectedDay.value?.slots.filter(s => s.open) ?? []
  if (!open.some(s => s.window === window.value)) window.value = open.length === 1 ? open[0].window : null
}

function startChange() {
  changing.value = true
  if (!days.value.length) load()
}

async function save() {
  if (!date.value || !window.value) return
  saving.value = true
  saveError.value = ''
  try {
    const r = await $fetch<{ job: PublicJob }>(`/api/quote/view/${props.token}/date`, { method: 'POST', body: { date: date.value, window: window.value } })
    track('quote_shoot_day_requested', { window: window.value })
    changing.value = false
    emit('updated', r.job)
  } catch (e: any) {
    saveError.value = e?.data?.data?.statusMessage ?? e?.data?.statusMessage ?? t('booking.saveFailed')
    load()   // a slot may have just filled
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (canPick.value && props.job.shootDateStatus === 'none') load()
})
</script>

<style scoped>
.qb { display: grid; gap: 18px; padding: 18px; background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius-lg); max-width: 640px; }
.qb__head { display: grid; gap: 4px; }
.qb__h3 { font-size: var(--q-text-md); font-weight: 600; line-height: 1.3; }
.qb__block { display: grid; gap: 12px; }
.qb__block--good { padding: 12px 14px; background: var(--q-good-bg); border-radius: var(--q-radius-sm); }
.qb__strong { font-weight: 600; }
.qb__solo { justify-self: start; }
.qb__set { display: grid; gap: 8px; border: 0; margin: 0; padding: 0; min-width: 0; }
.qb__legend { font-weight: 600; color: var(--q-ink-2); padding: 0; margin-bottom: 8px; }

.qb__days { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
@media (min-width: 560px) { .qb__days { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
.qb__day {
  display: grid; justify-items: center; gap: 0; min-height: 64px; padding: 6px 2px;
  background: var(--q-page); border: 1px solid var(--q-border); border-radius: var(--q-radius-sm);
  font: inherit; color: var(--q-ink); cursor: pointer;
  transition: border-color var(--q-fast) var(--q-ease), background-color var(--q-fast) var(--q-ease);
}
.qb__day:hover:not(:disabled) { border-color: var(--q-ink-3); }
.qb__day:active:not(:disabled) { background: var(--q-sunken); }
.qb__day:focus-visible, .qb__window:focus-visible { outline: none; box-shadow: var(--q-focus); }
.qb__day:disabled { color: var(--q-ink-3); background: var(--q-sunken); cursor: not-allowed; }
.qb__day--on, .qb__day--on:hover { border-color: var(--q-ink); box-shadow: inset 0 0 0 1px var(--q-ink); }
.qb__dow, .qb__dmon { font-size: var(--q-text-xs); color: var(--q-ink-2); }
.qb__day:disabled .qb__dow, .qb__day:disabled .qb__dmon { color: var(--q-ink-3); }
.qb__dnum { font-size: var(--q-text-md); font-weight: 600; line-height: 1.2; }

.qb__windows { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.qb__window {
  min-height: var(--q-tap); padding: 0 12px; background: var(--q-page); border: 1px solid var(--q-border); border-radius: var(--q-radius-sm);
  font: inherit; font-weight: 600; color: var(--q-ink); cursor: pointer; transition: border-color var(--q-fast) var(--q-ease);
}
.qb__window:disabled { color: var(--q-ink-3); background: var(--q-sunken); cursor: not-allowed; font-weight: 400; }
.qb__window--on { border-color: var(--q-ink); box-shadow: inset 0 0 0 1px var(--q-ink); }

.qb__prep { display: grid; gap: 8px; list-style: none; margin: 0; padding: 0; }
.qb__prep li { display: grid; grid-template-columns: 16px 1fr; gap: 10px; align-items: start; }
.qb__prep :deep(svg) { margin-top: 3px; color: var(--q-good); }

.qb__error { display: grid; gap: 10px; padding: 12px 14px; background: var(--q-bad-bg); border-radius: var(--q-radius-sm); }
.qb__skeleton { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.qb__skeleton span { height: 64px; border-radius: var(--q-radius-sm); background: var(--q-sunken); }
@media (prefers-reduced-motion: reduce) { .qb__day, .qb__window { transition: none; } }
</style>
