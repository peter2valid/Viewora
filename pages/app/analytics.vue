<template>
  <div class="analytics">

      <!-- Header -->
      <div class="an-header">
        <div>
          <h1 class="an-title">Analytics</h1>
          <p class="an-sub">Track views and performance across all your published spaces.</p>
        </div>
        <div class="an-range">
          <button
            v-for="r in ranges"
            :key="r.value"
            :class="['range-btn', { 'range-btn--active': activeRange === r.value }]"
            @click="activeRange = r.value"
          >{{ r.label }}</button>
        </div>
      </div>

      <!-- Metric cards -->
      <div class="an-metrics">
        <div class="metric-card">
          <div class="metric-label">Total Views</div>
          <div class="metric-value">{{ totalViews }}</div>
          <div class="metric-delta metric-delta--neutral">{{ viewsToday }} today</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Leads Captured</div>
          <div class="metric-value">{{ totalLeads }}</div>
          <div class="metric-delta metric-delta--neutral">All time</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Top Source</div>
          <div class="metric-value metric-value--sm">{{ topSource }}</div>
          <div class="metric-delta metric-delta--neutral">{{ topSourceViews }} views</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Top Space</div>
          <div class="metric-value metric-value--sm">{{ topSpaceName }}</div>
          <div class="metric-delta metric-delta--neutral">{{ topSpaceViews }} views</div>
        </div>
      </div>

      <!-- Chart -->
      <div class="an-chart-wrap">
        <div class="an-chart-head">
          <span class="an-chart-label">Views over time</span>
          <span class="an-chart-period">{{ activeRangeLabel }}</span>
        </div>

        <!-- Bar chart -->
        <div class="bar-chart">
          <div class="bar-y-axis">
            <span>{{ maxY }}</span>
            <span>{{ Math.round(maxY * 0.75) }}</span>
            <span>{{ Math.round(maxY * 0.5) }}</span>
            <span>{{ Math.round(maxY * 0.25) }}</span>
            <span>0</span>
          </div>
          <div class="bar-area">
            <div class="bar-grid">
              <div class="bar-gridline" v-for="n in 4" :key="n"></div>
            </div>
            <div class="bar-cols">
              <div v-for="(day, i) in chartDays" :key="i" class="bar-col">
                <div class="bar-fill" :style="{ height: (day.views / (maxY || 1) * 100) + '%' }"></div>
                <div class="bar-x-label">{{ day.label }}</div>
              </div>
            </div>
            <!-- No data overlay -->
            <div v-if="rawStats.length === 0" class="bar-empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="16" width="4" height="4"/><rect x="10" y="8" width="4" height="12"/><rect x="16" y="2" width="4" height="18"/></svg>
              <span>No analytics data for this period.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="an-table-wrap">
        <div class="an-table-head">
          <span class="an-chart-label">Space Performance</span>
        </div>
        <table class="an-table" v-if="spaceStats.length > 0">
          <thead>
            <tr>
              <th>Space Name</th>
              <th>Total Views</th>
              <th>Direct</th>
              <th>QR</th>
              <th>WhatsApp</th>
              <th>Embed</th>
              <th>Leads</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stat in spaceStats" :key="stat.id">
              <td>
                <NuxtLink :to="`/app/spaces/${stat.id}`" class="table-tour-link">
                  {{ stat.title }}
                </NuxtLink>
              </td>
              <td class="table-num font-bold">{{ stat.total_views }}</td>
              <td class="table-num">{{ stat.direct_views }}</td>
              <td class="table-num">{{ stat.qr_views }}</td>
              <td class="table-num">{{ stat.whatsapp_views }}</td>
              <td class="table-num">{{ stat.embed_views }}</td>
              <td class="table-num">{{ stat.leads_count }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="table-empty">
          <p>No published spaces yet. <NuxtLink to="/app/spaces" style="color:var(--accent);font-weight:500;">Publish a space</NuxtLink> to start tracking performance.</p>
        </div>
      </div>

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
