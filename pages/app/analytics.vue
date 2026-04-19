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
      <div class="p-1 bg-surface-alt border border-border rounded-xl flex items-center shadow-sm">
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

    <!-- ── Dashboard Grid ──────────────────────────────────────────────── -->
    <div class="space-y-6">
      
      <!-- Metrics Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="metric in [
          { label: 'Total Views', value: totalViews, sub: `${viewsToday} today`, icon: 'eye' },
          { label: 'Leads Captured', value: totalLeads, sub: 'High intent', icon: 'users' },
          { label: 'Top Source', value: topSource, sub: `${topSourceViews} views`, icon: 'link' },
          { label: 'Optimal Space', value: topTourName, sub: `${topTourViews} views`, icon: 'home' }
        ]" :key="metric.label" class="card-glass p-8 group hover:scale-[1.02] transition-all duration-500 shadow-xl border-main/5 hover:border-main/20">
          <div class="flex items-center justify-between mb-6">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-dim/60">{{ metric.label }}</span>
            <div class="text-main/20 group-hover:text-main transition-all duration-500">
               <svg v-if="metric.icon === 'eye'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
               <svg v-else-if="metric.icon === 'users'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
               <svg v-else-if="metric.icon === 'link'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
               <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
          </div>
          <div class="text-3xl font-black text-main tracking-tighter leading-none mb-3 drop-shadow-sm">{{ metric.value }}</div>
          <div class="text-[10px] font-black uppercase tracking-widest text-dim/60">{{ metric.sub }}</div>
        </div>
      </div>

      <!-- Main Chart Card -->
      <div class="card-glass p-6 md:p-8 flex flex-col gap-10">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-main tracking-tight">Visitor Intelligence</h3>
            <p class="text-[11px] font-bold uppercase tracking-wider text-dim mt-0.5">{{ activeRangeLabel }}</p>
          </div>
          <div class="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/20">
             <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgb(16,185,129)]"></div>
             Live
          </div>
        </div>

        <!-- Custom Bar Chart Visualization -->
        <div class="h-[240px] flex items-end gap-2 px-2 relative group/chart">
          <!-- Empty State Overlay -->
          <div v-if="chartDays.every(d => d.views === 0)" class="absolute inset-0 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-md z-20 rounded-lg">
             <div class="w-12 h-12 bg-surface-alt text-dim/30 rounded-xl flex items-center justify-center mb-3 border border-border shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="16" width="4" height="4"/><rect x="10" y="8" width="4" height="12"/><rect x="16" y="2" width="4" height="18"/></svg>
             </div>
             <p class="text-sm font-bold text-main tracking-tight">No data available</p>
             <p class="text-xs text-dim mt-1">Share your tours to start gathering data.</p>
          </div>

          <!-- Y Axis (Minimal) -->
          <div class="absolute -left-2 inset-y-0 w-6 flex flex-col justify-between text-[10px] font-bold text-dim/30 pointer-events-none pr-2 text-right">
            <span>{{ maxY }}</span>
            <span>0</span>
          </div>

          <!-- Vertical Bars -->
          <div v-for="(day, i) in chartDays" :key="i" class="flex-1 flex flex-col items-center justify-end h-full gap-2 group/bar z-10">
            <div class="relative w-full group/tip">
              <!-- Tooltip on hover -->
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-main text-bg rounded-lg text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none shadow-xl z-30 whitespace-nowrap border border-border">
                 {{ day.views }} views
              </div>
              
              <!-- The Bar -->
              <div 
                class="w-full min-h-[4px] rounded-t-lg transition-all duration-500 ease-out group-hover:bg-main"
                :class="day.views > 0 ? 'bg-main/20' : 'bg-surface-alt'"
                :style="{ height: (day.views / (maxY || 1) * 100) + '%' }"
              ></div>
            </div>
            <span class="text-[10px] font-bold text-dim/50 transition-colors group-hover/bar:text-main hidden md:block">{{ day.label }}</span>
          </div>
        </div>
      </div>

      <!-- Bottom Insights Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Lead Intensity -->
        <div class="card-glass p-6 md:p-8 flex flex-col h-full">
           <div class="flex items-center justify-between mb-8">
             <div>
               <h3 class="text-base font-bold text-main tracking-tight">Lead Capture Intensity</h3>
               <p class="text-xs text-dim">Total lead form submissions</p>
             </div>
             <div class="p-2 bg-surface-alt rounded-xl border border-border">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-main"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
             </div>
           </div>
           
           <div class="flex-1 flex items-center justify-center text-center p-8 bg-surface-alt/20 rounded-2xl border border-dashed border-border mb-4">
              <div>
                <div class="text-4xl font-extrabold text-main mb-2">{{ totalLeads }}</div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-dim italic">Verified Lead entries</div>
              </div>
           </div>
           
           <button @click="navigateTo('/app/leads')" class="w-full py-3.5 text-xs font-bold text-main hover:bg-surface-alt transition-colors rounded-xl border border-border">View Lead CRM</button>
        </div>

        <!-- Top Sources -->
        <div class="card-glass p-6 md:p-8 flex flex-col h-full">
           <div class="flex items-center justify-between mb-8">
             <div>
                <h3 class="text-base font-bold text-main tracking-tight">Traffic Sources</h3>
                <p class="text-xs text-dim">Where your visitors are coming from</p>
             </div>
             <div class="p-2 bg-surface-alt rounded-xl border border-border">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-main"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
             </div>
           </div>

           <div class="space-y-4">
              <div v-for="source in topSources" :key="source.name" class="group">
                 <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-main">{{ source.name }}</span>
                    <span class="text-xs font-bold text-main">{{ source.views }} views</span>
                 </div>
                 <div class="h-1.5 w-full bg-surface-alt rounded-full overflow-hidden border border-border">
                    <div class="h-full bg-main rounded-full transition-all duration-1000" :style="{ width: (source.views / totalViews * 100) + '%' }"></div>
                 </div>
              </div>
              <div v-if="!topSources.length" class="text-center py-12 text-xs text-dim">
                 Waiting for inbound traffic...
              </div>
           </div>
        </div>
      </div>

      <!-- performance Table Card -->
      <div class="card-glass overflow-hidden flex flex-col">
          <header class="p-6 border-b border-border flex items-center justify-between">
             <div>
                <h3 class="text-base font-bold text-main tracking-tight">Performance Leaderboard</h3>
                <p class="text-xs text-dim">Ranking by total engagement.</p>
             </div>
          </header>

          <div v-if="tourStats.length === 0" class="p-12 flex flex-col items-center justify-center text-center">
             <div class="w-10 h-10 bg-surface-alt text-dim rounded-lg flex items-center justify-center mb-3 border border-border">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
             </div>
             <p class="text-xs font-medium text-dim">No data available for the selected range.</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse table-fixed min-w-[800px]">
                <tr class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <th class="w-[40%] px-6 py-4">Tour</th>
                  <th class="w-[15%] px-6 py-4 text-right">Total</th>
                  <th class="w-[10%] px-6 py-4 text-center">Dir</th>
                  <th class="w-[10%] px-6 py-4 text-center">QR</th>
                  <th class="w-[10%] px-6 py-4 text-center">WA</th>
                  <th class="w-[15%] px-6 py-4 text-right">Leads</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-50">
                <tr v-for="stat in tourStats" :key="stat.id" class="group hover:bg-zinc-50   transition-colors">
                  <td class="px-6 py-4">
                    <NuxtLink :to="`/app/spaces/${stat.id}`" class="text-sm font-bold text-zinc-900  hover:text-zinc-900  transition-colors truncate block">
                      {{ stat.title }}
                    </NuxtLink>
                  </td>
                  <td class="px-6 py-4 text-right text-sm font-bold text-zinc-900 ">{{ stat.total_views }}</td>
                  <td class="px-6 py-4 text-center text-xs text-zinc-500  font-medium">{{ stat.direct_views }}</td>
                  <td class="px-6 py-4 text-center text-xs text-zinc-500  font-medium">{{ stat.qr_views }}</td>
                  <td class="px-6 py-4 text-right text-sm font-bold text-zinc-900">{{ stat.total_views }}</td>
                  <td class="px-6 py-4 text-center text-xs text-zinc-500 font-medium">{{ stat.direct_views }}</td>
                  <td class="px-6 py-4 text-center text-xs text-zinc-500 font-medium">{{ stat.qr_views }}</td>
                  <td class="px-6 py-4 text-center text-xs text-zinc-500 font-medium">{{ stat.whatsapp_views }}</td>
                  <td class="px-6 py-4 text-right text-sm font-bold text-zinc-700">{{ stat.leads_count }}</td>
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
  const entries = Object.entries(totals)
  if (entries.length === 0) return '—'
  return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0]
})

const topSourceViews = computed(() => sourceTotals.value[topSource.value as keyof typeof sourceTotals.value] || 0)

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
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
