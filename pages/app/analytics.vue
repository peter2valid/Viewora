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
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(now.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const label = i === 0 ? 'Today' : days[d.getDay()]
    
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
.analytics { padding: 2rem; max-width: 1200px; margin: 0 auto; }

.an-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
}
.an-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.03em;
  margin: 0 0 0.25rem;
}
.an-sub { color: var(--slate); font-size: 0.95rem; margin: 0; }

.an-range {
  display: flex;
  gap: 0.25rem;
  background: var(--paper-alt);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.2rem;
}
.range-btn {
  padding: 0.35rem 0.875rem;
  border: none;
  background: none;
  border-radius: 0.375rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--slate);
  cursor: pointer;
  transition: all 0.12s;
}
.range-btn--active { background: var(--paper); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

/* Metrics */
.an-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.metric-card {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.25rem;
}
.metric-label { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.5rem; }
.metric-value { font-size: 2rem; font-weight: 800; letter-spacing: -0.04em; color: var(--ink); line-height: 1; margin-bottom: 0.35rem; }
.metric-value--sm { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.metric-delta { font-size: 0.78rem; font-weight: 500; }
.metric-delta--neutral { color: var(--text-muted); }

/* Chart */
.an-chart-wrap, .an-table-wrap {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
  overflow: hidden;
}
.an-chart-head, .an-table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.an-chart-label { font-size: 0.875rem; font-weight: 700; color: var(--ink); }
.an-chart-period { font-size: 0.8rem; color: var(--text-muted); }

.bar-chart { display: flex; gap: 0; padding: 1.25rem; }
.bar-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: 1.5rem;
  width: 28px;
  flex-shrink: 0;
  text-align: right;
  font-size: 0.7rem;
  color: var(--text-muted);
  padding-right: 6px;
}
.bar-area {
  flex: 1;
  position: relative;
  min-height: 160px;
}
.bar-grid {
  position: absolute;
  inset: 0;
  bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}
.bar-gridline {
  border-top: 1px dashed var(--border);
  width: 100%;
}
.bar-cols {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  height: 100%;
  padding-bottom: 1.5rem;
  position: relative;
  z-index: 1;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  position: relative;
}
.bar-fill {
  width: 100%;
  max-width: 40px;
  min-height: 2px;
  background: var(--accent);
  border-radius: 3px 3px 0 0;
  opacity: 0.35;
}
.bar-x-label {
  position: absolute;
  bottom: 0;
  font-size: 0.7rem;
  color: var(--text-muted);
  text-align: center;
  height: 1.4rem;
}
.bar-empty {
  position: absolute;
  inset: 0;
  bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(2px);
}

/* Table */
.an-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.an-table thead tr { border-bottom: 1px solid var(--border); }
.an-table th {
  padding: 0.75rem 1.25rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
.an-table td { padding: 0.875rem 1.25rem; border-bottom: 1px solid var(--border); color: var(--ink); }
.an-table tbody tr:last-child td { border-bottom: none; }
.table-tour-link { color: var(--ink); font-weight: 500; text-decoration: none; }
.table-tour-link:hover { color: var(--accent); }
.table-num { color: var(--slate); font-variant-numeric: tabular-nums; }
.status-pill {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
}
.status-pill--live { background: var(--accent-dim); color: #008a50; }
.table-empty { padding: 2.5rem 1.25rem; text-align: center; color: var(--slate); font-size: 0.875rem; }

/* Info banner */
.an-info-banner {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  border-radius: 0.625rem;
  padding: 0.875rem 1rem;
  font-size: 0.825rem;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .an-metrics { grid-template-columns: repeat(2, 1fr); }
  .analytics { padding: 1rem; }
}
@media (max-width: 500px) {
  .an-metrics { grid-template-columns: 1fr 1fr; }
  .an-header { flex-direction: column; align-items: flex-start; }
}
</style>
