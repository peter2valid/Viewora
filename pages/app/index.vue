<template>
  <div class="h-full flex flex-col">
    <UiPageHeader title="Dashboard" subtitle="Manage your tours and track performance." />

    <!-- Loading Skeleton -->
    <section v-if="pending" class="flex flex-col gap-6">
      <!-- Stat cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="n in 4" :key="n" class="bg-card border border-border dark:border-transparent rounded-xl p-5 animate-pulse">
          <div class="h-2.5 w-20 bg-surface-alt rounded mb-3"></div>
          <div class="h-8 w-12 bg-surface-alt rounded mb-2"></div>
          <div class="h-2 w-16 bg-surface-alt rounded"></div>
        </div>
      </div>
      <!-- Draft nudge placeholder -->
      <div class="h-11 bg-surface-alt rounded-xl animate-pulse"></div>
      <!-- Chart + Recent Tours -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-card border border-border dark:border-transparent rounded-xl p-6 animate-pulse">
          <div class="h-3 w-32 bg-surface-alt rounded mb-2"></div>
          <div class="h-2 w-20 bg-surface-alt rounded mb-6"></div>
          <div class="h-[200px] bg-surface-alt/50 rounded-lg"></div>
        </div>
        <div class="flex flex-col gap-4 animate-pulse">
          <div class="h-4 w-28 bg-surface-alt rounded"></div>
          <div class="bg-card border border-border dark:border-transparent rounded-xl overflow-hidden">
            <div class="aspect-[16/9] w-full bg-surface-alt"></div>
            <div class="px-4 py-4">
              <div class="h-3 w-24 bg-surface-alt rounded mb-1.5"></div>
              <div class="h-2 w-16 bg-surface-alt/50 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Empty State (no tours yet) -->
    <section v-else-if="!hasSpaces" class="flex flex-col gap-8">
      <AppWelcomeCard show-capture-nudge @create="navigateTo('/app/create')" />
    </section>

    <!-- Active Dashboard -->
    <section v-else class="flex flex-col gap-6">

      <!-- Capture nudge strip — always visible for active users -->
      <AppCaptureNudge variant="strip" />

      <!-- Stat Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <UiMetricCard label="Total Views" :value="totalViews" :sub="`${viewsToday} today`" />
        <UiMetricCard label="Leads Captured" :value="totalLeads" :sub="`${conversionRate} conversion`" />
        <UiMetricCard label="Active Tours" :value="usage?.active_spaces_count || 0" sub="Published &amp; live" />
        <UiMetricCard label="Top Tour" :value="topTourName" :sub="`${topTourViews} views`" />
      </div>

      <!-- Draft Nudge -->
      <div v-if="draftCount > 0" class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-surface-alt rounded-lg border-l-2 border-main text-sm">
        <span class="font-semibold text-main">{{ draftCount }} tour{{ draftCount > 1 ? 's' : '' }} still in draft — publish to start getting views</span>
        <NuxtLink to="/app/spaces" class="text-xs font-bold text-dim hover:text-main transition-colors shrink-0 ml-4">Go to Tours →</NuxtLink>
      </div>

      <!-- Chart + Recent Tours -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Views Chart -->
        <UiCard class="lg:col-span-2 flex flex-col gap-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-base font-bold text-main tracking-tight">Views Over Time</h3>
              <div class="flex items-center gap-2 mt-0.5">
                <p class="text-xs text-dim">Last 7 days</p>
                <span v-if="whatsappViews > 0" class="px-1.5 py-0.5 bg-success-bg text-success border border-success/20 rounded text-[10px] font-bold">{{ whatsappViews }} via WhatsApp</span>
              </div>
              <!-- Tour filter pills -->
              <div v-if="recentSpaces.length > 0 && totalViews > 0" class="flex items-center gap-1.5 mt-2 flex-wrap">
                <button
                  @click="selectedTourId = null"
                  class="px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-colors"
                  :class="!selectedTourId ? 'bg-main text-bg' : 'bg-surface-alt text-main border border-border dark:border-transparent'"
                >All</button>
                <button
                  v-for="space in recentSpaces"
                  :key="space.id"
                  @click="selectedTourId = space.id"
                  class="px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-colors max-w-[100px] truncate"
                  :class="selectedTourId === space.id ? 'bg-main text-bg' : 'bg-surface-alt text-main border border-border dark:border-transparent'"
                >{{ space.title }}</button>
              </div>
            </div>
            <NuxtLink to="/app/analytics" class="text-xs font-semibold text-dim hover:text-main transition-colors inline-flex items-center gap-1 flex-shrink-0 mt-0.5">
              Full Analytics
              <UiIcon name="chevron-right" :size="12" :stroke-width="2.5" />
            </NuxtLink>
          </div>

          <div class="flex-1 min-h-[200px]">
            <UiEmptyState
              v-if="totalViews === 0"
              icon="bar-chart"
              title="No views yet"
              description="Share your tour to start collecting analytics."
            />
            <ViewsChart v-else :chart-days="chartDays" :max-y="maxY" />
          </div>
        </UiCard>

        <!-- Recent Tours -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-main tracking-tight">Recent Tours</h3>
            <NuxtLink to="/app/spaces" class="text-xs font-semibold text-dim hover:text-main transition-colors">View All →</NuxtLink>
          </div>
          <div class="flex flex-col gap-3">
            <UiTourCard
              v-for="space in recentSpaces"
              :key="space.id"
              :space="space"
              :selected="selectedTourId === space.id"
              @open="navigateTo(`/app/spaces/${space.id}`)"
            >
              <template #actions>
                <button
                  class="p-1.5 rounded-lg transition-colors"
                  :class="selectedTourId === space.id ? 'bg-main text-bg' : 'hover:bg-surface-alt text-dim hover:text-main'"
                  title="View individual chart"
                  @click="selectedTourId = selectedTourId === space.id ? null : space.id"
                >
                  <UiIcon name="chart" :size="14" />
                </button>
                <button
                  class="p-1.5 hover:bg-surface-alt rounded-lg text-dim hover:text-main transition-colors"
                  title="Share"
                  @click="openShare(space)"
                >
                  <UiIcon name="share" :size="14" />
                </button>
              </template>
            </UiTourCard>
          </div>
        </div>

      </div>
    </section>
  </div>

  <UiShareModal :space="spaceToShare" @close="spaceToShare = null" />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { definePageMeta, navigateTo } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSpaces } from '~/composables/useSpaces'
import { unwrapApiData, toArrayPayload } from '~/shared/utils/api'
import type { Space } from '~/composables/useSpaces'

definePageMeta({ layout: 'app', middleware: 'auth' })

const { apiFetch } = useApiFetch()
const { spaces, fetchSpaces } = useSpaces()
const pending = ref(true)

const usage = ref<any>(null)
const rawStats = ref<any[]>([])
const totalLeads = ref(0)

const hasSpaces = computed(() => spaces.value.length > 0)
const recentSpaces = computed(() => spaces.value.slice(0, 2))
const selectedTourId = ref<string | null>(null)

// Share modal
const spaceToShare = ref<Space | null>(null)
function openShare(space: Space) {
  spaceToShare.value = space
}

// Analytics computeds
const totalViews = computed(() => rawStats.value.reduce((acc, s) => acc + (s.total_views || 0), 0))

const viewsToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return rawStats.value.filter(s => s.date === today).reduce((acc, s) => acc + (s.total_views || 0), 0)
})

const tourStats = computed(() => {
  const map: Record<string, any> = {}
  rawStats.value.forEach(s => {
    const id = s.space_id || s.property_id
    if (!map[id]) map[id] = { id, title: s.spaces?.title || s.properties?.title || 'Unknown', total_views: 0 }
    map[id].total_views += (s.total_views || 0)
  })
  return Object.values(map).sort((a, b) => b.total_views - a.total_views)
})

const topTourName = computed(() => tourStats.value[0]?.title || '—')
const topTourViews = computed(() => tourStats.value[0]?.total_views || 0)

const conversionRate = computed(() => {
  if (!totalViews.value || !totalLeads.value) return '—'
  return (totalLeads.value / totalViews.value * 100).toFixed(1) + '%'
})

const draftCount = computed(() => spaces.value.filter(s => !s.is_published).length)

const whatsappViews = computed(() => rawStats.value.reduce((acc, s) => acc + (s.whatsapp_views || 0), 0))

const chartDays = computed(() => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const now = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(now.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const label = i === 6 ? 'Today' : dayNames[d.getDay()]
    const views = rawStats.value
      .filter(s => {
        const matchDate = s.date === dateStr
        const matchTour = !selectedTourId.value || (s.space_id || s.property_id) === selectedTourId.value
        return matchDate && matchTour
      })
      .reduce((acc, s) => acc + (s.total_views || 0), 0)
    return { label, views }
  })
})

const maxY = computed(() => {
  const max = Math.max(...chartDays.value.map(d => d.views))
  return max < 10 ? 10 : Math.ceil(max / 5) * 5
})

onMounted(async () => {
  // Billing must not block the spaces fetch — run it in parallel with spaces
  const [billingRes] = await Promise.allSettled([
    apiFetch<any>('/billing/status')
  ])
  if (billingRes.status === 'fulfilled') {
    const billingData = unwrapApiData<any>(billingRes.value)
    usage.value = billingData?.usage ?? null
  }

  // Spaces determine whether we show the welcome card or the active dashboard
  await fetchSpaces()
  pending.value = false

  // Secondary data — analytics and leads load after the skeleton clears
  const [analyticsRes, leadsRes] = await Promise.allSettled([
    apiFetch<any[]>('/analytics/summary'),
    apiFetch<any[]>('/leads')
  ])

  if (analyticsRes.status === 'fulfilled') {
    rawStats.value = toArrayPayload<any>(analyticsRes.value)
  }

  const leadsData = leadsRes.status === 'fulfilled' ? toArrayPayload<any>(leadsRes.value) : []
  totalLeads.value = leadsData.length
})
</script>
