<template>
  <section v-if="show" class="space-y-6" aria-labelledby="gvi-title">
    <div class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h3 id="gvi-title" class="text-lg font-bold text-main tracking-tight">Guided visits</h3>
        <p class="text-xs text-dim">What visitors do inside tours with patient journeys · {{ rangeLabel }}</p>
      </div>
      <p v-if="data && !data.enabled" class="text-xs font-semibold text-amber-600 dark:text-amber-400">
        Collecting starts after the visit-events database update.
      </p>
    </div>

    <div v-if="loading" class="bg-card rounded-2xl border border-border dark:border-transparent p-6 text-xs text-dim">Loading…</div>

    <template v-else-if="data">
      <!-- Headline tiles -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div v-for="t in tiles" :key="t.label" class="bg-card rounded-2xl border border-border dark:border-transparent p-4">
          <p class="text-[10px] font-black uppercase tracking-widest text-dim">{{ t.label }}</p>
          <p class="text-2xl font-black text-main mt-1 tabular-nums">{{ t.value }}</p>
          <p class="text-[11px] text-dim mt-0.5">{{ t.hint }}</p>
        </div>
      </div>

      <!-- Each visit: how far people got -->
      <div class="bg-card rounded-2xl border border-border dark:border-transparent p-6">
        <h4 class="text-base font-bold text-main tracking-tight">Visits, step by step</h4>
        <p class="text-xs text-dim mb-4">How many people reached each step, and where most stopped watching.</p>
        <p v-if="!data.visits.length" class="text-xs text-dim">No guided visits yet.</p>
        <div v-for="v in data.visits" :key="v.journey_id" class="py-4 border-t border-black/[0.06] dark:border-white/10 first:border-t-0 first:pt-0">
          <div class="flex items-baseline justify-between gap-3 flex-wrap">
            <p class="text-sm font-bold text-main">{{ v.title }}</p>
            <p class="text-xs text-dim tabular-nums">
              {{ v.starts }} started · {{ v.completes }} finished
              <span v-if="v.starts" class="font-bold text-main">({{ pct(v.completionRate) }})</span>
              <span v-if="v.medianMs"> · typically {{ duration(v.medianMs) }}</span>
            </p>
          </div>
          <ol v-if="v.steps.length" class="mt-3 space-y-1.5">
            <li v-for="(s, i) in v.steps" :key="i" class="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-x-3 gap-y-1 text-xs">
              <span class="truncate text-main font-semibold" :title="s.title">{{ i + 1 }}. {{ s.title }}</span>
              <span class="h-2 rounded-full bg-surface-alt overflow-hidden col-span-2 order-last sm:col-span-1 sm:order-none" aria-hidden="true">
                <span class="block h-full rounded-full" :class="i === v.topExitStep ? 'bg-rose-500' : 'bg-main/70'" :style="{ width: bar(s.reached, v.starts) }" />
              </span>
              <span class="tabular-nums text-dim w-24 text-right">
                {{ s.reached }}<span v-if="i === v.topExitStep" class="ml-1 font-bold text-rose-500">most leave</span>
              </span>
            </li>
          </ol>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-card rounded-2xl border border-border dark:border-transparent p-6">
          <h4 class="text-base font-bold text-main tracking-tight">Areas chosen</h4>
          <p class="text-xs text-dim mb-4">From the list down the left of the tour.</p>
          <p v-if="!data.areas.length" class="text-xs text-dim">None yet.</p>
          <ul class="space-y-2">
            <li v-for="a in data.areas.slice(0, 8)" :key="a.scene_id" class="text-xs">
              <div class="flex justify-between gap-2"><span class="truncate font-semibold text-main">{{ a.title }}</span><span class="tabular-nums text-dim">{{ a.opens }}</span></div>
              <span class="mt-1 block h-1.5 rounded-full bg-surface-alt overflow-hidden"><span class="block h-full bg-main/70 rounded-full" :style="{ width: bar(a.opens, data.areas[0]?.opens ?? 0) }" /></span>
              <span class="text-[11px] text-dim">{{ a.completes }} listened to the end</span>
            </li>
          </ul>
        </div>

        <div class="bg-card rounded-2xl border border-border dark:border-transparent p-6">
          <h4 class="text-base font-bold text-main tracking-tight">Directions asked for</h4>
          <p class="text-xs text-dim mb-4">Where people want to go: worth signposting.</p>
          <p v-if="!data.routes.length" class="text-xs text-dim">None yet.</p>
          <ul class="space-y-2.5">
            <li v-for="r in data.routes" :key="`${r.from}>${r.to}`" class="text-xs">
              <p class="font-semibold text-main truncate">{{ r.fromTitle }} → {{ r.toTitle }}</p>
              <p class="text-dim tabular-nums">{{ r.asks }} asked · {{ r.arrived }} walked all the way</p>
            </li>
          </ul>
        </div>

        <div class="bg-card rounded-2xl border border-border dark:border-transparent p-6">
          <h4 class="text-base font-bold text-main tracking-tight">Most viewed photos</h4>
          <p class="text-xs text-dim mb-4">Every time someone stood there.</p>
          <p v-if="!data.scenes.length" class="text-xs text-dim">None yet.</p>
          <ul class="space-y-2">
            <li v-for="sc in data.scenes" :key="sc.scene_id" class="flex justify-between gap-2 text-xs">
              <span class="truncate font-semibold text-main">{{ sc.title }}</span><span class="tabular-nums text-dim">{{ sc.views }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
// The dashboard's guided-visit section (GET /analytics/visits, built from
// visit_events). Hidden for owners with no patient journeys and no data.
import { computed, ref, watch } from 'vue'

interface Insights {
  enabled: boolean
  sessions: number
  visitors: number
  medianSessionMs: number | null
  devices: { phone: number; tablet: number; desktop: number }
  guidedShare: number
  daily: { date: string; sessions: number }[]
  visits: { journey_id: string; title: string; starts: number; completes: number; completionRate: number; medianMs: number | null; steps: { title: string; reached: number }[]; topExitStep: number | null }[]
  areas: { scene_id: string; title: string; opens: number; completes: number }[]
  scenes: { scene_id: string; title: string; views: number }[]
  routes: { from: string | null; to: string; fromTitle: string; toTitle: string; asks: number; arrived: number }[]
}

const props = defineProps<{ days: number; spaceId: string | null; rangeLabel: string }>()
const { apiFetch } = useApiFetch()
const data = ref<Insights | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const q = new URLSearchParams({ days: String(props.days) })
    if (props.spaceId) q.set('spaceId', props.spaceId)
    const res = await apiFetch<Insights>(`/analytics/visits?${q}`)
    data.value = res && Array.isArray(res.visits) && Array.isArray(res.daily) ? res : null
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}
watch(() => [props.days, props.spaceId], load, { immediate: true })

/** Only owners who have journeys (or visit data) see this section. */
const show = computed(() => loading.value || (!!data.value && (data.value.visits.length > 0 || data.value.sessions > 0)))

const pct = (x: number) => `${Math.round(x * 100)}%`
const bar = (n: number, of: number) => `${of && n ? Math.max(2, Math.round((n / of) * 100)) : 0}%`
function duration(ms: number) {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${Math.floor(m / 60)}h ${m % 60}m`
}

const tiles = computed(() => {
  const d = data.value
  if (!d) return []
  const devices = d.devices.phone + d.devices.tablet + d.devices.desktop
  return [
    { label: 'Visitors', value: d.visitors.toLocaleString(), hint: 'different people' },
    { label: 'Tour opens', value: d.sessions.toLocaleString(), hint: 'times the tour was opened' },
    { label: 'Time on tour', value: d.medianSessionMs ? duration(d.medianSessionMs) : '—', hint: 'typical (median)' },
    { label: 'Used guidance', value: d.sessions ? pct(d.guidedShare) : '—', hint: 'a visit, an area or directions' },
    { label: 'On a phone', value: devices ? pct(d.devices.phone / devices) : '—', hint: `${d.devices.tablet} tablet · ${d.devices.desktop} computer` },
  ]
})
</script>
