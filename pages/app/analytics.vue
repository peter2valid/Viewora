<template>
  <div class="h-full flex flex-col">
    <!-- Page Header -->
    <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-zinc-950 ">Analytics</h1>
        <p class="text-sm text-zinc-500 ">
          Real-time performance metrics for your published virtual tours.
        </p>
      </div>

      <!-- Range Selector -->
      <div class="p-1 bg-white  border border-zinc-200  rounded-lg flex items-center shadow-sm">
        <button
          v-for="r in ranges"
          :key="r.value"
          @click="activeRange = r.value"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
          :class="activeRange === r.value ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500  hover:text-zinc-900 '"
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
          { label: 'Leads Captured', value: totalLeads, sub: 'All time', icon: 'users' },
          { label: 'Top Source', value: topSource, sub: `${topSourceViews} views`, icon: 'link' },
          { label: 'Top Tour', value: topTourName, sub: `${topTourViews} views`, icon: 'home' }
        ]" :key="metric.label" class="bg-white  p-6 rounded-2xl border border-zinc-200  shadow-sm transition-all hover:shadow-md hover:border-zinc-300   group">
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-medium text-zinc-500 ">{{ metric.label }}</span>
            <div class="text-zinc-400 group-hover:text-zinc-900  transition-colors">
               <svg v-if="metric.icon === 'eye'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
               <svg v-else-if="metric.icon === 'users'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
               <svg v-else-if="metric.icon === 'link'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
               <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
          </div>
          <div class="text-2xl font-semibold text-zinc-900  tracking-tight leading-none mb-1">{{ metric.value }}</div>
          <div class="text-xs text-zinc-400 font-medium">{{ metric.sub }}</div>
        </div>
      </div>

      <!-- Main Chart Card -->
      <div class="bg-white  rounded-xl border border-zinc-200  shadow-sm p-6 flex flex-col gap-8">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-zinc-900  tracking-tight">Visitor Intelligence</h3>
            <p class="text-xs text-zinc-500 ">{{ activeRangeLabel }}</p>
          </div>
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-semibold uppercase tracking-wider border border-emerald-200">
             <div class="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
             Live
          </div>
        </div>

        <!-- Custom Bar Chart Visualization -->
        <div class="h-[240px] flex items-end gap-2 px-2 relative group/chart">
          <!-- Empty State Overlay -->
          <div v-if="chartDays.every(d => d.views === 0)" class="absolute inset-0 flex flex-col items-center justify-center bg-white  backdrop-blur-sm z-20 rounded-lg">
             <div class="w-10 h-10 bg-zinc-50  text-zinc-300 rounded-lg flex items-center justify-center mb-3 border border-zinc-100 ">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="16" width="4" height="4"/><rect x="10" y="8" width="4" height="12"/><rect x="16" y="2" width="4" height="18"/></svg>
             </div>
             <p class="text-xs font-semibold text-zinc-900 ">No data recorded</p>
             <p class="text-xs text-zinc-500  mt-1">Share your tours to start gathering intelligence.</p>
          </div>

          <!-- Y Axis (Minimal) -->
          <div class="absolute -left-2 inset-y-0 w-6 flex flex-col justify-between text-[10px] font-medium text-zinc-300 pointer-events-none pr-2 text-right">
            <span>{{ maxY }}</span>
            <span>0</span>
          </div>

          <!-- Vertical Bars -->
          <div v-for="(day, i) in chartDays" :key="i" class="flex-1 flex flex-col items-center justify-end h-full gap-2 group/bar z-10">
            <div class="relative w-full group/tip">
              <!-- Tooltip on hover -->
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white rounded text-[10px] font-medium opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none shadow-lg z-30 whitespace-nowrap">
                 {{ day.views }} views
              </div>
              
              <!-- The Bar -->
              <div 
                class="w-full min-h-[2px] rounded-t-lg transition-all duration-500 ease-out group-hover/bar:bg-zinc-900"
                :class="day.views > 0 ? 'bg-zinc-800' : 'bg-zinc-100 '"
                :style="{ height: (day.views / (maxY || 1) * 100) + '%' }"
              ></div>
            </div>
            <span class="text-[10px] font-medium text-zinc-400 transition-colors group-hover/bar:text-zinc-900  hidden md:block">{{ day.label }}</span>
          </div>
        </div>
      </div>

      <!-- performance Table Card -->
      <div class="bg-white  rounded-xl border border-zinc-200  shadow-sm overflow-hidden flex flex-col">
          <header class="p-6 border-b border-zinc-100  flex items-center justify-between">
             <div>
                <h3 class="text-base font-semibold text-zinc-900  tracking-tight">Performance Leaderboard</h3>
                <p class="text-xs text-zinc-500 ">Ranking by total engagement.</p>
             </div>
          </header>

          <div v-if="spaceStats.length === 0" class="p-12 flex flex-col items-center justify-center text-center">
             <div class="w-10 h-10 bg-zinc-50  text-zinc-200 rounded-lg flex items-center justify-center mb-3 border border-zinc-100 ">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
             </div>
             <p class="text-xs font-medium text-zinc-500 ">No data available for the selected range.</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse table-fixed min-w-[800px]">
              <thead class="sticky top-0 bg-white  backdrop-blur-md z-10 border-b border-zinc-100 ">
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
                  <td class="px-6 py-4 text-center text-xs text-zinc-500  font-medium">{{ stat.whatsapp_views }}</td>
                  <td class="px-6 py-4 text-right text-sm font-bold text-zinc-700 ">{{ stat.leads_count }}</td>
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
