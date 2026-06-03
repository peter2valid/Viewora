<template>
  <div class="h-full flex flex-col">
    <!-- Page Header -->
    <header class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-1">
        <h1 class="text-3xl font-black tracking-tight text-main">Visual Intelligence</h1>
        <p class="text-sm text-dim font-bold">
          Real-time spatial performance metrics for your immersive properties.
        </p>
      </div>

      <!-- Range Selector -->
      <div class="p-1 bg-surface-alt rounded-xl flex items-center shadow-sm self-start md:self-auto">
        <button
          v-for="r in ranges"
          :key="r.value"
          @click="activeRange = r.value"
          class="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all duration-200"
          :class="activeRange === r.value ? 'bg-main text-bg shadow-sm' : 'text-dim hover:text-main'"
        >
          {{ r.label }}
        </button>
      </div>
    </header>

    <!-- Upgrade Wall (Gated) -->
    <div v-if="!canAnalytics" class="flex-1 flex items-center justify-center p-6 md:p-12">
      <div class="max-w-md w-full card-glass p-12 text-center shadow-2xl relative overflow-hidden group">
        <div class="absolute top-0 left-0 w-full h-1.5 bg-main"></div>
        <div class="absolute top-0 right-0 w-64 h-64 bg-main/5 blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
        <div class="w-16 h-16 bg-surface-alt text-main rounded-2xl flex items-center justify-center mx-auto mb-8 border border-border shadow-inner relative z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <h2 class="text-2xl font-black tracking-tight text-main mb-4 relative z-10">Advanced Analytics</h2>
        <p class="text-dim text-sm font-bold leading-relaxed mb-10 relative z-10">
          Upgrade to access real-time view counts, traffic source breakdowns, and per-tour performance data.
        </p>
        <div class="space-y-4 mb-10 text-left bg-surface-alt/50 p-6 rounded-2xl border border-border relative z-10 shadow-inner">
          <div v-for="feat in ['View Counts & Trends', 'Traffic Source Breakdown', 'Per-Tour Leaderboard']" :key="feat" class="flex items-center gap-3">
            <div class="w-5 h-5 bg-main text-bg rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span class="text-[11px] font-black uppercase tracking-widest text-main">{{ feat }}</span>
          </div>
        </div>
        <NuxtLink to="/app/billing" class="btn btn-primary w-full !py-5 shadow-2xl">
          Upgrade to Viewora Plus
        </NuxtLink>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-else-if="pending" class="space-y-6 animate-pulse">
      <!-- Chart + metric tiles row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Chart skeleton (2/3) -->
        <div class="lg:col-span-2 bg-card rounded-2xl p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <div class="h-4 w-40 bg-surface-alt rounded mb-2"></div>
              <div class="h-2 w-24 bg-surface-alt/60 rounded"></div>
            </div>
            <div class="h-6 w-12 bg-surface-alt rounded-lg"></div>
          </div>
          <div class="h-[240px] bg-surface-alt/50 rounded-xl"></div>
        </div>
        <!-- Metric tiles skeleton (1/3) — 2×2 -->
        <div class="grid grid-cols-2 grid-rows-2 gap-3">
          <div v-for="n in 4" :key="n" class="bg-card rounded-2xl p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="h-2 w-14 bg-surface-alt rounded"></div>
              <div class="w-3.5 h-3.5 bg-surface-alt rounded"></div>
            </div>
            <div class="h-7 w-12 bg-surface-alt rounded mb-1"></div>
            <div class="h-2 w-16 bg-surface-alt/60 rounded"></div>
          </div>
        </div>
      </div>
      <!-- Bottom 2-col row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="bg-card rounded-2xl p-6 md:p-8">
          <div class="flex items-center justify-between mb-8">
            <div>
              <div class="h-4 w-36 bg-surface-alt rounded mb-2"></div>
              <div class="h-2 w-24 bg-surface-alt/60 rounded"></div>
            </div>
            <div class="w-9 h-9 bg-surface-alt rounded-xl"></div>
          </div>
          <div class="h-24 bg-surface-alt/40 rounded-2xl mb-4"></div>
          <div class="h-10 bg-surface-alt rounded-xl"></div>
        </div>
        <div class="bg-card rounded-2xl p-6 md:p-8">
          <div class="flex items-center justify-between mb-8">
            <div>
              <div class="h-4 w-32 bg-surface-alt rounded mb-2"></div>
              <div class="h-2 w-40 bg-surface-alt/60 rounded"></div>
            </div>
            <div class="w-9 h-9 bg-surface-alt rounded-xl"></div>
          </div>
          <div class="space-y-4">
            <div v-for="n in 3" :key="n">
              <div class="flex items-center justify-between mb-2">
                <div class="h-3 w-16 bg-surface-alt rounded"></div>
                <div class="h-3 w-12 bg-surface-alt rounded"></div>
              </div>
              <div class="h-1.5 w-full bg-surface-alt/60 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
      <!-- Table card -->
      <div class="bg-card rounded-2xl overflow-hidden">
        <div class="p-6 border-b border-border">
          <div class="h-4 w-48 bg-surface-alt rounded mb-2"></div>
          <div class="h-2 w-32 bg-surface-alt/60 rounded"></div>
        </div>
        <div class="p-6 space-y-4">
          <div v-for="n in 4" :key="n" class="flex items-center gap-8">
            <div class="flex-1 h-3 bg-surface-alt rounded"></div>
            <div class="w-16 h-3 bg-surface-alt rounded"></div>
            <div class="w-10 h-3 bg-surface-alt/60 rounded"></div>
            <div class="w-10 h-3 bg-surface-alt/60 rounded"></div>
            <div class="w-10 h-3 bg-surface-alt/60 rounded"></div>
            <div class="w-16 h-3 bg-surface-alt rounded"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Dashboard Grid ──────────────────────────────────────────────── -->
    <div v-else class="space-y-6">

      <!-- Tour Selector -->
      <div v-if="tourStats.length > 1" class="flex items-center gap-2 overflow-x-auto pb-1">
        <span class="text-[10px] font-black uppercase tracking-widest text-dim flex-shrink-0">Tour:</span>
        <button
          @click="selectedInsightsTourId = null"
          class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
          :class="!selectedInsightsTourId ? 'bg-main text-bg' : 'bg-surface-alt text-main'"
        >All Tours</button>
        <button
          v-for="tour in tourStats"
          :key="tour.id"
          @click="selectedInsightsTourId = tour.id"
          class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors flex-shrink-0 whitespace-nowrap max-w-[160px] truncate"
          :class="selectedInsightsTourId === tour.id ? 'bg-main text-bg' : 'bg-surface-alt text-main'"
        >{{ tour.title }}</button>
      </div>
      
      <!-- Chart + Metric Tiles Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Main Chart Card (2/3) -->
        <div class="lg:col-span-2 bg-card rounded-2xl border border-border dark:border-transparent p-6 flex flex-col gap-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold text-main tracking-tight">Visitor Intelligence</h3>
              <p class="text-[11px] font-bold uppercase tracking-wider text-dim mt-0.5">
                {{ activeRangeLabel }}
                <span v-if="selectedInsightsTourId" class="text-main normal-case tracking-normal font-semibold">
                  · {{ tourStats.find(t => t.id === selectedInsightsTourId)?.title }}
                </span>
              </p>
            </div>
            <div class="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-extrabold uppercase tracking-wider">
               <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgb(16,185,129)]"></div>
               Live
            </div>
          </div>

          <!-- Chart -->
          <div class="h-[240px] relative">
            <!-- Empty State Overlay — shown when there's genuinely no data -->
            <div v-if="chartDays.every(d => d.views === 0)" class="absolute inset-0 flex flex-col items-center justify-center bg-surface-alt/60 dark:bg-surface/80 backdrop-blur-xl z-20 rounded-2xl border border-black/[0.08] dark:border-white/20">
               <div class="relative mb-6">
                  <div class="w-16 h-16 bg-surface-alt text-main rounded-2xl flex items-center justify-center shadow-inner relative z-10">
                     <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="opacity-20"><rect x="4" y="16" width="4" height="4"/><rect x="10" y="8" width="4" height="12"/><rect x="16" y="2" width="4" height="18"/></svg>
                  </div>
                  <div class="absolute -inset-4 bg-main/5 blur-2xl rounded-full"></div>
               </div>
               <p class="text-base font-black text-main tracking-tight">Signal Loss Detected</p>
               <p class="text-[11px] text-dim font-bold mt-1 uppercase tracking-widest opacity-60">Waiting for inbound telemetry...</p>
            </div>
            <ViewsChart :chart-days="chartDays" :max-y="maxY" />
          </div>
        </div>

        <!-- Metric Tiles (1/3) — 2×2 grid, fills chart height -->
        <div class="grid grid-cols-2 grid-rows-2 gap-3">
          <div v-for="metric in [
            { label: 'Total Views', value: totalViews, sub: `${viewsToday} today`, icon: 'eye' },
            { label: 'Leads Captured', value: totalLeads, sub: 'High intent', icon: 'users' },
            { label: 'Top Source', value: topSource, sub: `${topSourceViews} views`, icon: 'link' },
            { label: 'Optimal Space', value: topTourName, sub: `${topTourViews} views`, icon: 'home' }
          ]" :key="metric.label" class="bg-card rounded-2xl border border-border dark:border-transparent p-4 group flex flex-col justify-between">
            <div class="flex items-center justify-between mb-3">
              <span class="text-[9px] font-black uppercase tracking-[0.15em] text-dim/60 leading-tight">{{ metric.label }}</span>
              <div class="text-main/20 group-hover:text-main transition-all duration-500">
                 <svg v-if="metric.icon === 'eye'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                 <svg v-else-if="metric.icon === 'users'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                 <svg v-else-if="metric.icon === 'link'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                 <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
            </div>
            <div class="text-2xl font-black text-main tracking-tighter leading-none mb-1 truncate">{{ metric.value }}</div>
            <div class="text-[9px] font-bold uppercase tracking-widest text-dim/60 truncate">{{ metric.sub }}</div>
          </div>
        </div>

      </div>

      <!-- Bottom Insights Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Lead Intensity -->
        <div class="bg-card rounded-2xl border border-border dark:border-transparent p-6 md:p-8 flex flex-col h-full">
           <div class="flex items-center justify-between mb-8">
             <div>
               <h3 class="text-base font-bold text-main tracking-tight">Lead Capture Intensity</h3>
               <p class="text-xs text-dim">Total lead form submissions</p>
             </div>
             <div class="p-2 bg-surface-alt rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-main"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
             </div>
           </div>
           
           <div class="flex-1 flex items-center justify-center text-center p-8 bg-surface-alt/20 rounded-2xl border border-black/[0.08] dark:border-white/20 mb-4">
              <div>
                <div class="text-4xl font-extrabold text-main mb-2">{{ totalLeads }}</div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-dim italic">Verified Lead entries</div>
              </div>
           </div>
           
           <button @click="navigateTo('/app/leads')" class="w-full py-3.5 text-xs font-bold text-main hover:bg-surface-alt transition-colors rounded-xl border border-black/[0.08] dark:border-white/20">View Lead CRM</button>
        </div>

        <!-- Top Sources -->
        <div class="bg-card rounded-2xl border border-border dark:border-transparent p-6 md:p-8 flex flex-col h-full">
           <div class="flex items-center justify-between mb-8">
             <div>
                <h3 class="text-base font-bold text-main tracking-tight">Traffic Sources</h3>
                <p class="text-xs text-dim">Where your visitors are coming from</p>
             </div>
             <div class="p-2 bg-surface-alt rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-main"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
             </div>
           </div>

           <div class="space-y-4">
              <div v-for="source in topSources" :key="source.name" class="group">
                 <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-main">{{ source.name }}</span>
                    <span class="text-xs font-bold text-main">{{ source.views }} views</span>
                 </div>
                 <div class="h-1.5 w-full bg-surface-alt rounded-full overflow-hidden">
                    <div class="h-full bg-main rounded-full transition-all duration-1000" :style="{ width: totalViews > 0 ? (source.views / totalViews * 100) + '%' : '0%' }"></div>
                 </div>
              </div>
              <div v-if="!topSources.length" class="text-center py-12 text-xs text-dim">
                 Waiting for inbound traffic...
              </div>
           </div>
        </div>
      </div>

      <!-- performance Table Card -->
      <div class="bg-card rounded-2xl border border-border dark:border-transparent overflow-hidden flex flex-col">
          <header class="p-6 border-b border-black/[0.08] dark:border-white/20 flex items-center justify-between">
             <div>
                <h3 class="text-base font-bold text-main tracking-tight">Performance Leaderboard</h3>
                <p class="text-xs text-dim">Ranking by total engagement.</p>
             </div>
          </header>

          <div v-if="tourStats.length === 0" class="p-12 flex flex-col items-center justify-center text-center">
             <div class="w-10 h-10 bg-surface-alt text-dim rounded-lg flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
             </div>
             <p class="text-xs font-medium text-dim">No data available for the selected range.</p>
          </div>
          <div v-else class="overflow-x-auto scrollbar-premium">
            <table class="w-full text-left border-collapse table-fixed min-w-[800px]">
              <thead class="border-b border-black/[0.08] dark:border-white/20 bg-surface-alt/50">
                <tr class="text-[10px] font-black uppercase tracking-[0.2em] text-dim/60">
                  <th class="w-[40%] px-8 py-5">Property Domain</th>
                  <th class="w-[15%] px-8 py-5 text-right">Atmospheres</th>
                  <th class="w-[10%] px-8 py-5 text-center">Direct</th>
                  <th class="w-[10%] px-8 py-5 text-center">Proxy</th>
                  <th class="w-[10%] px-8 py-5 text-center">WA</th>
                  <th class="w-[15%] px-8 py-5 text-right">Intent</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/5">
                <tr
                  v-for="stat in tourStats"
                  :key="stat.id"
                  class="group transition-all duration-300 cursor-pointer"
                  :class="selectedInsightsTourId === stat.id ? 'bg-main/5' : 'hover:bg-surface-alt/30'"
                  @click="selectedInsightsTourId = selectedInsightsTourId === stat.id ? null : stat.id"
                >
                  <td class="px-8 py-5">
                    <div class="flex items-center gap-2">
                      <NuxtLink :to="`/app/spaces/${stat.id}`" class="text-sm font-black text-main hover:text-main transition-colors truncate tracking-tight" @click.stop>
                        {{ stat.title }}
                      </NuxtLink>
                      <span v-if="selectedInsightsTourId === stat.id" class="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-main text-bg rounded flex-shrink-0">Selected</span>
                    </div>
                  </td>
                  <td class="px-8 py-5 text-right text-sm font-black text-main tabular-nums">{{ stat.total_views }}</td>
                  <td class="px-8 py-5 text-center text-[11px] text-dim font-bold tabular-nums">{{ stat.direct_views }}</td>
                  <td class="px-8 py-5 text-center text-[11px] text-dim font-bold tabular-nums">{{ stat.qr_views }}</td>
                  <td class="px-8 py-5 text-center text-[11px] text-dim font-bold tabular-nums">{{ stat.whatsapp_views }}</td>
                  <td class="px-8 py-5 text-right text-sm font-black text-main tabular-nums">{{ stat.leads_count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { definePageMeta, useSeoMeta, navigateTo } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { usePlanStore } from '~/stores/plan'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Analytics | Viewora' })

const { apiFetch } = useApiFetch()
const planStore = usePlanStore()
const canAnalytics = computed(() => planStore.can('advanced_analytics_enabled'))
const rawStats = ref<any[]>([])
const pending = ref(true)
const selectedInsightsTourId = ref<string | null>(null)

const activeRange = ref('7d')
const ranges = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All', value: 'all' },
]

const activeRangeLabel = computed(() => {
  const map: Record<string, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', 'all': 'All time' }
  return map[activeRange.value]
})

onMounted(async () => {
  if (canAnalytics.value) await fetchStats()
  else pending.value = false
})

async function fetchStats() {
  pending.value = true
  try {
    const data = await apiFetch<any[]>('/analytics/summary')
    rawStats.value = data || []
  } catch {
    // handled by pending state
  } finally {
    pending.value = false
  }
}

// Filter stats by selected tour (null = all tours)
const filteredStats = computed(() => {
  if (!selectedInsightsTourId.value) return rawStats.value
  return rawStats.value.filter(s => (s.space_id || s.property_id) === selectedInsightsTourId.value)
})

// Aggregated Metrics (filtered)
const totalViews = computed(() => filteredStats.value.reduce((acc, curr) => acc + (curr.total_views || 0), 0))
const totalLeads = computed(() => filteredStats.value.reduce((acc, curr) => acc + (curr.leads_count || 0), 0))
const viewsToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return filteredStats.value.filter(s => s.date === today).reduce((acc, curr) => acc + (curr.total_views || 0), 0)
})

const sourceTotals = computed(() => {
  const sources = { Direct: 0, QR: 0, WhatsApp: 0, Embed: 0 }
  filteredStats.value.forEach(s => {
    sources.Direct += (s.direct_views || 0)
    sources.QR += (s.qr_views || 0)
    sources.WhatsApp += (s.whatsapp_views || 0)
    sources.Embed += (s.embed_views || 0)
  })
  return sources
})

const topSource = computed(() => {
  const totals = sourceTotals.value
  const entries = Object.entries(totals)
  if (entries.length === 0) return '—'
  return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0]
})

const topSourceViews = computed(() => sourceTotals.value[topSource.value as keyof typeof sourceTotals.value] || 0)

const topSources = computed(() => {
  const totals = sourceTotals.value
  return Object.entries(totals)
    .filter(([_, views]) => views > 0)
    .map(([name, views]) => ({ name, views }))
    .sort((a, b) => b.views - a.views)
})

const tourStats = computed(() => {
  const props: Record<string, any> = {}
  rawStats.value.forEach(s => {
    const pid = s.space_id || s.property_id
    if (!props[pid]) {
      props[pid] = { 
        id: pid, 
        title: s.spaces?.title || s.properties?.title || 'Unknown', 
        total_views: 0, 
        direct_views: 0, 
        qr_views: 0, 
        whatsapp_views: 0, 
        embed_views: 0, 
        leads_count: 0 
      }
    }
    props[pid].total_views += (s.total_views || 0)
    props[pid].direct_views += (s.direct_views || 0)
    props[pid].qr_views += (s.qr_views || 0)
    props[pid].whatsapp_views += (s.whatsapp_views || 0)
    props[pid].embed_views += (s.embed_views || 0)
    props[pid].leads_count += (s.leads_count || 0)
  })
  return Object.values(props).sort((a, b) => b.total_views - a.total_views)
})

const topTourName = computed(() => tourStats.value[0]?.title || '—')
const topTourViews = computed(() => tourStats.value[0]?.total_views || 0)

// Chart logic
const chartDays = computed(() => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const now = new Date()
  const result = []
  
  // Dynamic day count based on range
  let dayCount = 7
  if (activeRange.value === '30d') dayCount = 30
  if (activeRange.value === '90d') dayCount = 90
  if (activeRange.value === 'all') dayCount = 30 // Default to 30 for all time view
  
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(now.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    
    // Label logic: only show day names for 7d, otherwise dates or fewer labels
    let label = ''
    if (dayCount <= 7) {
      label = i === 0 ? 'Today' : days[d.getDay()]
    } else {
      // Periodic labels for larger ranges
      if (i === 0) label = 'Today'
      else if (i % Math.floor(dayCount / 6) === 0) {
        label = d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
      }
    }
    
    const views = filteredStats.value
      .filter(s => s.date === dateStr)
      .reduce((acc, curr) => acc + (curr.total_views || 0), 0)
    
    result.push({ label, views })
  }
  return result
})

const maxY = computed(() => {
  const max = Math.max(...chartDays.value.map(d => d.views))
  return max < 10 ? 10 : Math.ceil(max / 5) * 5
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
