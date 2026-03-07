<template>
  <NuxtLayout name="app">
    <div class="analytics">

      <!-- Header -->
      <div class="an-header">
        <div>
          <h1 class="an-title">Analytics</h1>
          <p class="an-sub">Track views and performance across all your published tours.</p>
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
          <div class="metric-value">0</div>
          <div class="metric-delta metric-delta--neutral">No data yet</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Unique Visitors</div>
          <div class="metric-value">0</div>
          <div class="metric-delta metric-delta--neutral">No data yet</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Avg. View Duration</div>
          <div class="metric-value">—</div>
          <div class="metric-delta metric-delta--neutral">No data yet</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Top Tour</div>
          <div class="metric-value metric-value--sm">{{ topTourName }}</div>
          <div class="metric-delta metric-delta--neutral">0 views</div>
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
            <span>20</span>
            <span>15</span>
            <span>10</span>
            <span>5</span>
            <span>0</span>
          </div>
          <div class="bar-area">
            <div class="bar-grid">
              <div class="bar-gridline" v-for="n in 4" :key="n"></div>
            </div>
            <div class="bar-cols">
              <div v-for="(day, i) in chartDays" :key="i" class="bar-col">
                <div class="bar-fill" :style="{ height: day.pct + '%' }"></div>
                <div class="bar-x-label">{{ day.label }}</div>
              </div>
            </div>
            <!-- No data overlay -->
            <div class="bar-empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="16" width="4" height="4"/><rect x="10" y="8" width="4" height="12"/><rect x="16" y="2" width="4" height="18"/></svg>
              <span>Analytics tracking will begin once you publish a tour.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="an-table-wrap">
        <div class="an-table-head">
          <span class="an-chart-label">Tour Performance</span>
        </div>
        <table class="an-table" v-if="publishedSpaces.length > 0">
          <thead>
            <tr>
              <th>Tour Name</th>
              <th>Status</th>
              <th>Views</th>
              <th>Visitors</th>
              <th>Avg. Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="space in publishedSpaces" :key="space.id">
              <td>
                <NuxtLink :to="`/app/spaces/${space.id}/editor`" class="table-tour-link">
                  {{ space.title }}
                </NuxtLink>
              </td>
              <td><span class="status-pill status-pill--live">Published</span></td>
              <td class="table-num">0</td>
              <td class="table-num">0</td>
              <td class="table-num">—</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="table-empty">
          <p>No published tours yet. <NuxtLink to="/app/spaces" style="color:var(--accent);font-weight:500;">Publish a tour</NuxtLink> to start tracking performance.</p>
        </div>
      </div>

      <!-- Info banner -->
      <div class="an-info-banner">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>View tracking and visitor analytics are launching in an upcoming update. Your data will appear here automatically once enabled.</span>
      </div>

    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Analytics | Viewora' })

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

const { spaces, fetchSpaces } = useSpaces()
onMounted(() => fetchSpaces())

const publishedSpaces = computed(() => spaces.value.filter((s: any) => s.is_published))
const topTourName = computed(() => publishedSpaces.value[0]?.title || '—')

// Chart days — last 7 labels, all zero data
const chartDays = computed(() => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date().getDay()
  return Array.from({ length: 7 }, (_, i) => ({
    label: days[(today - 6 + i + 7) % 7],
    pct: 0,
  }))
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
