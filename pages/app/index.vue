<template>
  <div class="h-full flex flex-col">
    <!-- Page Header -->
    <header class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-main">Welcome to Viewora!</h1>
        <p class="text-sm text-dim mt-1">Bring your venues to life with immersive 360° experiences.</p>
      </div>
      <button v-if="!pending && hasSpaces" @click="navigateTo('/app/create')" class="btn btn-primary px-6 py-2.5 text-sm">
        + Create Tour
      </button>
    </header>

    <!-- Loading Skeleton -->
    <section v-if="pending" class="flex flex-col gap-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="n in 4" :key="n" class="h-24 bg-surface-alt/50 rounded-2xl animate-pulse border border-border/50"></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 h-64 bg-surface-alt/50 rounded-2xl animate-pulse border border-border/50"></div>
        <div class="h-64 bg-surface-alt/50 rounded-2xl animate-pulse border border-border/50"></div>
      </div>
    </section>

    <!-- Empty State (no tours yet) -->
    <section v-else-if="!hasSpaces" class="flex flex-col items-center justify-center py-16 gap-8">
      <button
        @click="navigateTo(`/app/create?type=${dashSelectedType}`)"
        class="btn btn-primary !px-10 !py-4 text-base shadow-xl"
      >
        + Create Tour
      </button>
      <div class="flex flex-col items-center gap-3">
        <span class="text-xs font-semibold text-dim uppercase tracking-widest">Choose type</span>
        <div class="flex items-center gap-2 flex-wrap justify-center">
          <button
            v-for="opt in dashTypeOptions"
            :key="opt.id"
            class="px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all"
            :class="dashSelectedType === opt.id ? 'bg-main text-bg border-main' : 'bg-surface-alt border-border text-dim hover:text-main hover:border-main/40'"
            @click="dashSelectedType = opt.id"
          >{{ opt.label }}</button>
        </div>
      </div>
    </section>

    <!-- Active Dashboard -->
    <section v-else class="flex flex-col gap-6">

      <!-- Stat Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-card border border-border rounded-2xl p-5">
          <p class="text-xs font-bold text-dim uppercase tracking-wider mb-3">Total Views</p>
          <p class="text-3xl font-black text-main leading-none">{{ totalViews }}</p>
          <p class="text-xs text-dim mt-2">{{ viewsToday }} today</p>
        </div>
        <div class="bg-card border border-border rounded-2xl p-5">
          <p class="text-xs font-bold text-dim uppercase tracking-wider mb-3">Leads Captured</p>
          <p class="text-3xl font-black text-main leading-none">{{ totalLeads }}</p>
          <p class="text-xs text-dim mt-2">{{ conversionRate }} conversion</p>
        </div>
        <div class="bg-card border border-border rounded-2xl p-5">
          <p class="text-xs font-bold text-dim uppercase tracking-wider mb-3">Active Tours</p>
          <p class="text-3xl font-black text-main leading-none">{{ usage?.active_spaces_count || 0 }}</p>
          <p class="text-xs text-dim mt-2">Published &amp; live</p>
        </div>
        <div class="bg-card border border-border rounded-2xl p-5">
          <p class="text-xs font-bold text-dim uppercase tracking-wider mb-3">Top Tour</p>
          <p class="text-base font-black text-main leading-snug truncate">{{ topTourName }}</p>
          <p class="text-xs text-dim mt-2">{{ topTourViews }} views</p>
        </div>
      </div>

      <!-- Draft Nudge -->
      <div v-if="draftCount > 0" class="flex items-center justify-between px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm">
        <span class="font-semibold text-amber-600 dark:text-amber-400">{{ draftCount }} tour{{ draftCount > 1 ? 's' : '' }} still in draft — publish to start getting views</span>
        <NuxtLink to="/app/spaces" class="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0 ml-4">Go to Tours →</NuxtLink>
      </div>

      <!-- Chart + Recent Tours -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Views Chart -->
        <div class="lg:col-span-2 bg-card border border-border rounded-2xl p-6 flex flex-col gap-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-main tracking-tight">Views Over Time</h3>
              <div class="flex items-center gap-2 mt-0.5">
                <p class="text-xs text-dim">Last 7 days</p>
                <span v-if="whatsappViews > 0" class="px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded text-[10px] font-bold">{{ whatsappViews }} via WhatsApp</span>
              </div>
            </div>
            <NuxtLink to="/app/analytics" class="text-xs font-semibold text-dim hover:text-main transition-colors inline-flex items-center gap-1">
              Full Analytics
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </NuxtLink>
          </div>

          <div class="h-[200px] flex items-end gap-1.5 pl-8 relative">
            <!-- Y axis labels -->
            <div class="absolute left-0 inset-y-0 w-7 flex flex-col justify-between text-[10px] font-bold text-dim pointer-events-none text-right pr-1">
              <span>{{ maxY }}</span>
              <span>0</span>
            </div>
            <!-- Bars -->
            <div v-for="(day, i) in chartDays" :key="i" class="flex-1 flex flex-col items-center justify-end h-full gap-2 group/bar">
              <div class="relative w-full">
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-main text-bg rounded-md text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none whitespace-nowrap z-10">
                  {{ day.views }} views
                </div>
                <div
                  class="w-full min-h-[3px] rounded-t-md transition-all duration-500"
                  :class="day.views > 0 ? 'bg-main/25 group-hover/bar:bg-main' : 'bg-surface-alt'"
                  :style="{ height: (day.views / (maxY || 1) * 100) + '%' }"
                ></div>
              </div>
              <span class="text-[10px] font-bold text-dim">{{ day.label }}</span>
            </div>
          </div>
        </div>

        <!-- Recent Tours -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-main tracking-tight">Recent Tours</h3>
            <NuxtLink to="/app/spaces" class="text-xs font-semibold text-dim hover:text-main transition-colors">View All →</NuxtLink>
          </div>
          <div class="flex flex-col gap-3">
            <div
              v-for="space in recentSpaces"
              :key="space.id"
              class="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-main/40 transition-all duration-200 group"
              @click="navigateTo(`/app/spaces/${space.id}`)"
            >
              <div class="aspect-[16/9] w-full bg-surface-alt relative overflow-hidden">
                <div v-if="space.cover_image_url" class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500" :style="{ backgroundImage: `url(${space.cover_image_url})` }"></div>
                <span class="absolute top-2 left-2 px-1.5 py-0.5 bg-bg/80 backdrop-blur-sm rounded text-[10px] font-bold uppercase tracking-wide text-main border border-border">
                  {{ space.is_published ? 'Live' : 'Draft' }}
                </span>
              </div>
              <div class="px-3 py-2.5">
                <h4 class="text-xs font-bold text-main truncate">{{ space.title }}</h4>
                <p class="text-[10px] text-dim mt-0.5">{{ new Date(space.created_at).toLocaleDateString() }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { definePageMeta, navigateTo } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSpaces } from '~/composables/useSpaces'
import { unwrapApiData, toArrayPayload } from '~/shared/utils/api'

definePageMeta({ layout: 'app', middleware: 'auth' })

const { apiFetch } = useApiFetch()
const { spaces, fetchSpaces } = useSpaces()
const pending = ref(true)

const usage = ref<any>(null)
const rawStats = ref<any[]>([])
const totalLeads = ref(0)

const hasSpaces = computed(() => spaces.value.length > 0)
const recentSpaces = computed(() => spaces.value.slice(0, 3))

// Empty state type selector
const dashSelectedType = ref('residential')
const dashTypeOptions = [
  { id: 'residential', label: 'Property' },
  { id: 'automotive',  label: 'Vehicle'  },
  { id: 'commercial',  label: 'Business' },
  { id: 'other',       label: 'Multiple' },
]

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
    const views = rawStats.value.filter(s => s.date === dateStr).reduce((acc, s) => acc + (s.total_views || 0), 0)
    return { label, views }
  })
})

const maxY = computed(() => {
  const max = Math.max(...chartDays.value.map(d => d.views))
  return max < 10 ? 10 : Math.ceil(max / 5) * 5
})

onMounted(async () => {
  try {
    const billingData = unwrapApiData<any>(await apiFetch<any>('/billing/status'))
    usage.value = billingData?.usage ?? null

    await fetchSpaces()
    pending.value = false

    const [analyticsRes, leadsRes] = await Promise.allSettled([
      apiFetch<any[]>('/analytics/summary'),
      apiFetch<any[]>('/leads')
    ])

    if (analyticsRes.status === 'fulfilled') {
      rawStats.value = toArrayPayload<any>(analyticsRes.value)
    }

    const leadsData = leadsRes.status === 'fulfilled' ? toArrayPayload<any>(leadsRes.value) : []
    totalLeads.value = leadsData.length

  } catch (e) {
    console.error('Failed to bootstrap dashboard', e)
    pending.value = false
  }
})
</script>
