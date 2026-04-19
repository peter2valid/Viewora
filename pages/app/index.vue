<template>
  <div class="h-full flex flex-col">
    <!-- Page Header -->
    <header class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Dashboard</h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage your tours and track performance.</p>
      </div>
    </header>

    <!-- ── Loading Skeleton ──────────────────────────────────────────────── -->
    <section v-if="pending" class="flex flex-col gap-6">
      <div class="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="n in 4" :key="n" class="bg-zinc-100 dark:bg-zinc-800 h-24 rounded-xl animate-pulse"></div>
      </div>
    </section>

    <section v-else class="flex flex-col gap-8">
      
      <!-- EMPTY STATE / ONBOARDING (If 0 spaces) -->
      <div v-if="!hasSpaces" class="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[2rem] shadow-sm border border-zinc-200 dark:border-zinc-700 flex flex-col items-center text-center">
        <h2 class="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">👋 Welcome to Viewora</h2>
        <p class="text-zinc-500 dark:text-zinc-400 mb-8 font-medium text-[17px]">Create your first virtual tour in under 2 minutes.</p>
        
        <div class="flex flex-col sm:flex-row items-center gap-6 mb-10 w-full max-w-2xl justify-center">
          <div class="flex flex-col items-center gap-3 w-40">
            <div class="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-black text-zinc-900 dark:text-zinc-100">1</div>
            <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-center">Create your<br/>first tour</p>
          </div>
          <div class="hidden sm:block w-8 h-px bg-zinc-200"></div>
          <div class="flex flex-col items-center gap-3 w-40">
            <div class="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-black text-zinc-900 dark:text-zinc-100">2</div>
            <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-center">Upload your<br/>360° image</p>
          </div>
          <div class="hidden sm:block w-8 h-px bg-zinc-200"></div>
          <div class="flex flex-col items-center gap-3 w-40">
            <div class="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-black text-zinc-900 dark:text-zinc-100">3</div>
            <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-center">Share with<br/>clients</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 w-full max-w-lg mt-4">
          <button @click="navigateTo('/app/create')" class="flex-1 py-4 bg-zinc-900 text-white text-[15px] font-bold rounded-xl hover:bg-zinc-800 transition-all hover:-translate-y-0.5 shadow-sm active:scale-[0.98]">
            + Create New Tour
          </button>
          <button @click="navigateTo('/app/spaces')" class="flex-1 flex items-center justify-center gap-2 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[15px] font-bold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:bg-zinc-800 transition-all hover:-translate-y-0.5 hover:shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 dark:border-zinc-600 active:scale-[0.98]">
            👁 See Example Tour
          </button>
        </div>
      </div>

      <!-- ACTIVE DASHBOARD (If spaces exist) -->
      <template v-else>
        <!-- Action Header -->
        <div class="bg-zinc-900 dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700 p-8 sm:p-12 rounded-[2rem] text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-zinc-800/60 via-transparent to-transparent pointer-events-none"></div>
          <div class="space-y-2 z-10 text-center sm:text-left">
            <h2 class="text-2xl font-bold tracking-tight">Ready to create?</h2>
            <p class="text-zinc-400 text-sm max-w-sm">Capture, create, and share immersive experiences that turn prospects into clients.</p>
          </div>
          <div class="flex gap-4 z-10 w-full sm:w-auto mt-2 sm:mt-0">
            <button @click="navigateTo('/app/create')" class="w-full sm:w-auto px-8 py-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-[15px] font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:bg-zinc-800 transition-all hover:-translate-y-0.5 shadow-sm active:scale-[0.98]">
               + Create Tour
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Main Area (Recent Tours) -->
          <div class="md:col-span-2 space-y-4">
             <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Recent Tours</h3>
                <NuxtLink to="/app/spaces" class="text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100 transition-colors">View All →</NuxtLink>
             </div>
             
             <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div v-for="space in recentSpaces" :key="space.id" class="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-600 dark:border-zinc-600 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer" @click="navigateTo(`/app/spaces/${space.id}`)">
                 <div class="aspect-[16/9] w-full bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                   <div v-if="space.cover_image_url" class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700" :style="{ backgroundImage: `url(${space.cover_image_url})` }"></div>
                   <div class="absolute top-3 left-3 px-2 py-1 bg-white dark:bg-zinc-900/90 backdrop-blur-md rounded-md text-[10px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border border-white/20 shadow-sm">
                     {{ space.is_published ? 'Live' : 'Draft' }}
                   </div>
                 </div>
                 <div class="p-4">
                   <h4 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mb-1">{{ space.title }}</h4>
                   <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Created {{ new Date(space.created_at).toLocaleDateString() }}</p>
                 </div>
               </div>
             </div>
          </div>

          <!-- Side Widget (Insights) -->
          <div class="space-y-4">
             <h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Insights</h3>
             <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm space-y-6">
                <!-- Stat Card -->
                <div>
                   <p class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Total Views</p>
                   <p class="text-3xl font-black text-zinc-900 dark:text-zinc-100">{{ totalViews }}</p>
                </div>
                <!-- Stat Card -->
                <div>
                   <p class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">New Leads</p>
                   <div class="flex items-end gap-2">
                     <p class="text-3xl font-black text-zinc-900 dark:text-zinc-100">{{ recentLeadsCount }}</p>
                     <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Last 7 days</p>
                   </div>
                </div>
                <!-- Stat Card -->
                <div>
                   <p class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Active Tours</p>
                   <p class="text-3xl font-black text-zinc-900 dark:text-zinc-100">{{ usage?.active_spaces_count || 0 }}</p>
                </div>

                <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <NuxtLink to="/app/analytics" class="text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:text-zinc-100 transition-colors inline-flex items-center gap-1">Full Analytics <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></NuxtLink>
                </div>
             </div>

             <!-- Localized Help Widget -->
             <div class="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 mt-4">
                <div class="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </div>
                <h4 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">Quick Tip</h4>
                <p class="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">Share your live tours directly via WhatsApp to increase engagement by 3x.</p>
             </div>
          </div>
        </div>
      </template>

    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { definePageMeta, navigateTo } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSpaces } from '~/composables/useSpaces'

definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const { apiFetch } = useApiFetch()
const { spaces, fetchSpaces } = useSpaces()
const pending = ref(true)

const plan = ref<any>(null)
const usage = ref<any>(null)
const totalViews = ref(0)
const recentLeadsCount = ref(0)

const hasSpaces = computed(() => spaces.value.length > 0)
const recentSpaces = computed(() => spaces.value.slice(0, 4))

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
    const billingData = unwrapData<any>(await apiFetch<any>('/billing/status'))
    plan.value = billingData?.plan ?? null
    usage.value = billingData?.usage ?? null

    // Fetch spaces to power the recent tours grid + empty state check
    await fetchSpaces()
    pending.value = false

    const [analyticsRes, leadsRes] = await Promise.allSettled([
      apiFetch<any[]>('/analytics/summary'),
      apiFetch<any[]>('/leads')
    ])

    const analyticsData = analyticsRes.status === 'fulfilled' ? toArray<any>(analyticsRes.value) : []
    const leadsData = leadsRes.status === 'fulfilled' ? toArray<any>(leadsRes.value) : []
    
    totalViews.value = analyticsData.reduce((acc, curr) => acc + Number(curr?.total_views || 0), 0)
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    recentLeadsCount.value = leadsData.filter(l => {
      const createdAt = l?.created_at
      return createdAt && new Date(createdAt) > sevenDaysAgo
    }).length

  } catch (e) {
    console.error('Failed to bootstrap dashboard', e)
    pending.value = false
  }
})
</script>
