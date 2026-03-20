<template>
  <div class="h-full flex flex-col bg-zinc-50/50">
    <!-- Page Header -->
    <header class="p-8 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-3xl font-black tracking-tight text-zinc-950">Analytics</h1>
        <p class="text-sm text-slate-500 font-medium font-inter">
          Real-time performance metrics for your published virtual tours.
        </p>
      </div>

      <!-- Range Selector -->
      <div class="p-1.5 bg-white border border-slate-200 rounded-2xl flex items-center gap-1 shadow-sm">
        <button
          v-for="r in ranges"
          :key="r.value"
          @click="activeRange = r.value"
          class="px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
          :class="activeRange === r.value ? 'bg-zinc-950 text-white shadow-lg shadow-zinc-950/20' : 'text-slate-400 hover:text-zinc-600'"
        >
          {{ r.label }}
        </button>
      </div>
    </header>

    <!-- ── Dashboard Grid ──────────────────────────────────────────────── -->
    <section class="p-8 space-y-8 overflow-y-auto flex-1 text-inter">
      
      <!-- Metrics Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="metric in [
          { label: 'Total Views', value: totalViews, sub: `${viewsToday} today`, icon: 'eye' },
          { label: 'Leads Captured', value: totalLeads, sub: 'All time', icon: 'users' },
          { label: 'Top Source', value: topSource, sub: `${topSourceViews} views`, icon: 'link' },
          { label: 'Top Space', value: topSpaceName, sub: `${topSpaceViews} views`, icon: 'home' }
        ]" :key="metric.label" class="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:shadow-xl group">
          <div class="flex items-center justify-between mb-6">
            <span class="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-emerald-500 transition-colors">{{ metric.label }}</span>
            <div class="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
               <svg v-if="metric.icon === 'eye'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
               <svg v-else-if="metric.icon === 'users'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
               <svg v-else-if="metric.icon === 'link'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
               <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
          </div>
          <div class="text-3xl font-black tracking-tight text-zinc-950 mb-1 truncate leading-none italic">{{ metric.value }}</div>
          <div class="text-xs font-bold text-slate-400 uppercase tracking-tighter">{{ metric.sub }}</div>
        </div>
      </div>

      <!-- Main Chart Card -->
      <div class="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-10 flex flex-col gap-10">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <h3 class="text-xl font-black text-zinc-950 tracking-tight">Visitor Intelligence</h3>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{{ activeRangeLabel }}</p>
          </div>
          <div class="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
             <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
             Live Telemetry
          </div>
        </div>

        <!-- Custom Bar Chart Visualization -->
        <div class="h-[300px] flex items-end gap-2 px-4 relative group/chart">
          <!-- Empty State Overlay -->
          <div v-if="rawStats.length === 0" class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-20 rounded-2xl">
             <div class="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="16" width="4" height="4"/><rect x="10" y="8" width="4" height="12"/><rect x="16" y="2" width="4" height="18"/></svg>
             </div>
             <p class="text-[10px] font-black uppercase tracking-widest text-zinc-400">No telemetry recorded for this cycle</p>
          </div>

          <!-- Y Axis -->
          <div class="absolute -left-4 inset-y-0 w-8 flex flex-col justify-between text-[9px] font-black text-slate-300 pointer-events-none">
            <span>{{ maxY }}</span>
            <span>{{ Math.round(maxY * 0.5) }}</span>
            <span>0</span>
          </div>

          <!-- Grid Lines -->
          <div class="absolute inset-0 flex flex-col justify-between pointer-events-none pr-4">
             <div class="w-full border-t border-slate-50"></div>
             <div class="w-full border-t border-slate-50"></div>
             <div class="w-full border-t border-slate-100"></div>
          </div>

          <!-- Vertical Bars -->
          <div v-for="(day, i) in chartDays" :key="i" class="flex-1 flex flex-col items-center justify-end h-full gap-3 group/bar z-10">
            <div class="relative w-full group/tip">
              <!-- Tooltip on hover -->
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-3 py-2 bg-zinc-950 text-white rounded-xl text-[10px] font-black opacity-0 group-hover/bar:opacity-100 transition-all scale-90 group-hover/bar:scale-100 pointer-events-none shadow-xl z-30">
                 {{ day.views }} views
                 <div class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-950"></div>
              </div>
              
              <!-- The Bar -->
              <div 
                class="w-full min-h-[4px] rounded-full transition-all duration-700 ease-out group-hover/bar:bg-zinc-950 bg-slate-100"
                :class="day.views > 0 ? 'bg-emerald-500/40 group-hover/bar:bg-emerald-500' : ''"
                :style="{ height: (day.views / (maxY || 1) * 100) + '%' }"
              ></div>
            </div>
            <span class="text-[9px] font-black text-slate-400 group-hover/bar:text-zinc-950 transition-colors hidden md:block uppercase tracking-tighter">{{ day.label }}</span>
          </div>
        </div>
      </div>

      <!-- performance Table Card -->
      <div class="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <header class="p-10 pb-6 border-b border-slate-100">
             <h3 class="text-xl font-black text-zinc-950 tracking-tight">Performance Leaderboard</h3>
             <p class="text-xs font-bold text-slate-400">Comparing view velocity across active spaces.</p>
          </header>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse" v-if="spaceStats.length > 0">
              <thead>
                <tr class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 bg-slate-50/50">
                  <th class="px-10 py-5">Space Identity</th>
                  <th class="px-10 py-5 text-right">Total Views</th>
                  <th class="px-10 py-5 text-center">Direct</th>
                  <th class="px-10 py-5 text-center">QR</th>
                  <th class="px-10 py-5 text-center">WA</th>
                  <th class="px-10 py-5 text-center">Embed</th>
                  <th class="px-10 py-5 text-right">Leads</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="stat in spaceStats" :key="stat.id" class="group hover:bg-slate-50/50 transition-colors">
                  <td class="px-10 py-6">
                    <NuxtLink :to="`/app/spaces/${stat.id}`" class="text-sm font-black text-zinc-950 hover:text-emerald-600 transition-colors leading-none flex items-center gap-3">
                      <div class="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center text-[8px] text-zinc-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        {{ stat.title[0] }}
                      </div>
                      {{ stat.title }}
                    </NuxtLink>
                  </td>
                  <td class="px-10 py-6 text-right font-black text-zinc-950 text-base italic">{{ stat.total_views }}</td>
                  <td class="px-10 py-6 text-center text-xs font-bold text-slate-400 italic">{{ stat.direct_views }}</td>
                  <td class="px-10 py-6 text-center text-xs font-bold text-slate-400 italic">{{ stat.qr_views }}</td>
                  <td class="px-10 py-6 text-center text-xs font-bold text-slate-400 italic">{{ stat.whatsapp_views }}</td>
                  <td class="px-10 py-6 text-center text-xs font-bold text-slate-400 italic">{{ stat.embed_views }}</td>
                  <td class="px-10 py-6 text-right">
                    <span v-if="stat.leads_count > 0" class="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black border border-emerald-500/20 italic">
                      {{ stat.leads_count }} Leads
                    </span>
                    <span v-else class="text-[10px] font-bold text-slate-300 italic">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div v-else class="p-20 text-center">
               <div class="w-20 h-20 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
               </div>
               <h3 class="text-lg font-black text-zinc-950 mb-2">No Performance History</h3>
               <p class="text-sm text-slate-500 font-medium mb-8">Deploy your first space to start measuring engagement velocity.</p>
               <NuxtLink to="/app/spaces" class="px-10 py-4 bg-zinc-950 text-white text-xs font-black rounded-2xl hover:bg-zinc-800 shadow-xl shadow-zinc-950/20 transition-all active:scale-95">Go to Spaces</NuxtLink>
            </div>
          </div>
      </div>

    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { definePageMeta, useSeoMeta, useSupabaseUser, useSupabaseClient, navigateTo } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Analytics | Viewora' })

const { apiFetch } = useApiFetch()
const rawStats = ref<any[]>([])
const pending = ref(true)

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
  await fetchStats()
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

// Aggregated Metrics
const totalViews = computed(() => rawStats.value.reduce((acc, curr) => acc + (curr.total_views || 0), 0))
const totalLeads = computed(() => rawStats.value.reduce((acc, curr) => acc + (curr.leads_count || 0), 0))
const viewsToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return rawStats.value.filter(s => s.date === today).reduce((acc, curr) => acc + (curr.total_views || 0), 0)
})

const sourceTotals = computed(() => {
  const sources = { Direct: 0, QR: 0, WhatsApp: 0, Embed: 0 }
  rawStats.value.forEach(s => {
    sources.Direct += (s.direct_views || 0)
    sources.QR += (s.qr_views || 0)
    sources.WhatsApp += (s.whatsapp_views || 0)
    sources.Embed += (s.embed_views || 0)
  })
  return sources
})

const topSource = computed(() => {
  const totals = sourceTotals.value
  return Object.keys(totals).reduce((a, b) => (totals[a as keyof typeof totals] > totals[b as keyof typeof totals] ? a : b))
})

const topSourceViews = computed(() => sourceTotals.value[topSource.value as keyof typeof sourceTotals.value] || 0)

const spaceStats = computed(() => {
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

const topSpaceName = computed(() => spaceStats.value[0]?.title || '—')
const topSpaceViews = computed(() => spaceStats.value[0]?.total_views || 0)

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
    
    const views = rawStats.value
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
/* Analytics specific transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
