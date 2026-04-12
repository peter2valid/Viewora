<template>
  <div class="h-full flex flex-col">
    <!-- Page Header -->
    <header class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-zinc-950">Dashboard</h1>
      <p class="text-sm text-zinc-500 mt-1">Overview of your agency's performance and usage.</p>
    </header>

    <!-- ── Loading Skeleton ──────────────────────────────────────────────── -->
    <section v-if="pending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
      <div v-for="n in 4" :key="n" class="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm animate-pulse flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="h-3 bg-zinc-100 rounded w-24"></div>
          <div class="w-4 h-4 bg-zinc-100 rounded"></div>
        </div>
        <div>
          <div class="h-8 bg-zinc-100 rounded w-16 mb-2"></div>
          <div class="h-3 bg-zinc-100 rounded w-20"></div>
        </div>
      </div>
      <div class="md:col-span-2 lg:col-span-3 bg-zinc-100 rounded-xl h-40 animate-pulse"></div>
      <div class="bg-zinc-100 rounded-xl h-40 animate-pulse"></div>
    </section>

    <!-- ── Overview Summary ────────────────────────────────────────────── -->
    <section v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">

      <!-- Metrics -->
      <div v-for="card in [
        { label: 'Live Spaces', value: usage?.active_spaces_count || 0, sub: 'Active properties', icon: 'home', to: '/app/spaces' },
        { label: 'Recent Leads', value: recentLeadsCount, sub: 'Last 7 days', icon: 'users', to: '/app/leads' },
        { label: 'Total Views', value: totalViews, sub: 'All time', icon: 'eye', to: '/app/analytics' },
        { label: 'Storage Usage', value: formatBytes(usage?.storage_used_bytes || 0), sub: 'Cloud assets', icon: 'database', to: '/app/billing' }
      ]" :key="card.label" 
        class="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-4" 
        @click="navigateTo(card.to)">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-zinc-500">{{ card.label }}</span>
          <div class="text-zinc-400">
             <svg v-if="card.icon === 'home'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
             <svg v-else-if="card.icon === 'users'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
             <svg v-else-if="card.icon === 'eye'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
             <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          </div>
        </div>
        <div>
          <div class="text-3xl font-semibold text-zinc-900 tracking-tight">{{ card.value }}</div>
          <div class="text-xs text-zinc-500 mt-1">{{ card.sub }}</div>
        </div>
      </div>

      <!-- Main Action Card -->
      <div class="md:col-span-2 lg:col-span-3 bg-zinc-900 p-8 rounded-xl text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
         <div class="space-y-3 flex-1">
            <h2 class="text-xl font-semibold tracking-tight">Elevate Your Real Estate Presence</h2>
            <p class="text-zinc-400 text-sm max-w-md leading-relaxed">Capture, create, and share immersive 360° experiences that turn prospects into clients. Build your first space today.</p>
         </div>
         <div class="flex gap-3 w-full md:w-auto">
            <button @click="navigateTo('/app/spaces')" class="flex-1 md:flex-none px-4 py-2 bg-white text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-100 transition-colors">
               Manage Spaces
            </button>
            <button @click="navigateTo('/app/analytics')" class="flex-1 md:flex-none px-4 py-2 bg-zinc-800 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700">
               View Analytics
            </button>
         </div>
      </div>

      <!-- Quick Info / Status -->
      <div class="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between min-h-[160px]">
         <div class="space-y-4">
            <div class="flex items-center gap-2">
               <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
               <span class="text-xs font-semibold uppercase tracking-wider text-zinc-500">System Status</span>
            </div>
            <div>
               <h4 class="text-base font-semibold text-zinc-900">{{ plan?.name || 'Free' }} Plan</h4>
               <p class="text-sm text-zinc-500 mt-1">All systems operational.</p>
            </div>
         </div>
         <button @click="navigateTo('/app/billing')" class="text-left text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors mt-4 inline-flex items-center gap-1">
            Manage Billing <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
         </button>
      </div>

    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { definePageMeta, navigateTo } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const { apiFetch } = useApiFetch()
const pending = ref(true)
const plan = ref<any>(null)
const usage = ref<any>(null)
const totalViews = ref(0)
const recentLeadsCount = ref(0)

function unwrapData<T = any>(value: any): T {
  if (value && typeof value === 'object' && 'data' in value && value.data !== undefined) {
    return value.data as T
  }
  return value as T
}

function toArray<T = any>(value: any): T[] {
  const unwrapped = unwrapData<any>(value)
  if (Array.isArray(unwrapped)) return unwrapped
  if (unwrapped && typeof unwrapped === 'object') {
    if (Array.isArray(unwrapped.items)) return unwrapped.items
    if (Array.isArray(unwrapped.rows)) return unwrapped.rows
    if (Array.isArray(unwrapped.results)) return unwrapped.results
  }
  return []
}

onMounted(async () => {
  try {
    // Load billing first so the dashboard shell can render quickly.
    const billingData = unwrapData<any>(await apiFetch<any>('/billing/status'))

    plan.value = billingData?.plan ?? null
    usage.value = billingData?.usage ?? null

    // Unblock UI while secondary widgets continue fetching in background.
    pending.value = false

    const [analyticsRes, leadsRes] = await Promise.allSettled([
      apiFetch<any[]>('/analytics/summary'),
      apiFetch<any[]>('/leads')
    ])

    const analyticsData = analyticsRes.status === 'fulfilled' ? toArray<any>(analyticsRes.value) : []
    const leadsData = leadsRes.status === 'fulfilled' ? toArray<any>(leadsRes.value) : []
    
    // Aggregates
    totalViews.value = analyticsData.reduce((acc, curr) => acc + Number(curr?.total_views || 0), 0)
    
    // Recent leads (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    recentLeadsCount.value = leadsData.filter(l => {
      const createdAt = l?.created_at
      return createdAt && new Date(createdAt) > sevenDaysAgo
    }).length

  } catch (e) {
    console.error('Failed to bootstrap dashboard', e)
  } finally {
    pending.value = false
  }
})

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>
