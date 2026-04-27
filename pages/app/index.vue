<template>
  <div class="h-full flex flex-col">
    <!-- Page Header -->
    <header class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-main">Welcome to Viewora!</h1>
        <p class="text-sm text-dim mt-1">Bring your venues to life with immersive 360° experiences.</p>
      </div>
    </header>

    <!-- ── Loading Skeleton ──────────────────────────────────────────────── -->
    <section v-if="pending" class="flex flex-col gap-8">
      <div class="h-60 bg-surface-alt/50 rounded-[2rem] border border-border/50 animate-pulse"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="n in 4" :key="n" class="bg-surface-alt/50 h-32 rounded-3xl animate-pulse border border-border/50"></div>
      </div>
    </section>

    <section v-else class="flex flex-col gap-8">
      
      <!-- EMPTY STATE (If 0 spaces) -->
      <div v-if="!hasSpaces" class="flex flex-col items-center justify-center py-16 gap-8">
        <!-- Dominant CTA -->
        <button
          @click="navigateTo(`/app/create?type=${dashSelectedType}`)"
          class="btn btn-primary !px-10 !py-4 text-base shadow-xl"
        >
          + Create Tour
        </button>

        <!-- Compact type selector -->
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
      </div>

      <!-- ACTIVE DASHBOARD (If spaces exist) -->
      <template v-else>
        <!-- Action Header -->
        <div class="bg-main border border-border p-8 sm:p-12 rounded-[2rem] text-bg shadow-xl flex flex-col sm:flex-row items-center justify-between gap-8 relative overflow-hidden group">
          <div class="absolute inset-0 bg-gradient-to-br from-bg/10 via-transparent to-transparent pointer-events-none group-hover:from-bg/20 transition-all duration-700"></div>
          <div class="space-y-2 z-10 text-center sm:text-left">
            <h2 class="text-2xl font-bold tracking-tight">Ready to create?</h2>
            <p class="text-bg/60 text-sm max-w-sm">Capture, create, and share immersive experiences that turn prospects into clients.</p>
          </div>
          <div class="flex gap-4 z-10 w-full sm:w-auto mt-2 sm:mt-0">
            <button @click="navigateTo('/app/create')" class="btn btn-secondary !bg-bg !text-main !border-none w-full sm:w-auto px-8 !py-4 text-[15px] shadow-2xl">
               + Create Tour
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Main Area (Recent Tours) -->
          <div class="md:col-span-2 space-y-4">
             <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-main tracking-tight">Recent Tours</h3>
                <NuxtLink to="/app/spaces" class="text-sm font-semibold text-dim hover:text-main transition-colors">View All →</NuxtLink>
             </div>
             
             <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div v-for="space in recentSpaces" :key="space.id" class="group bg-card border border-border rounded-2xl overflow-hidden hover:border-text-dim hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer" @click="navigateTo(`/app/spaces/${space.id}`)">
                 <div class="aspect-[16/9] w-full bg-surface-alt relative overflow-hidden">
                   <div v-if="space.cover_image_url" class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700" :style="{ backgroundImage: `url(${space.cover_image_url})` }"></div>
                   <div class="absolute top-3 left-3 px-2 py-1 bg-bg/80 backdrop-blur-md rounded-md text-[10px] font-bold uppercase tracking-wider text-main border border-border mt-0.5">
                     {{ space.is_published ? 'Live' : 'Draft' }}
                   </div>
                 </div>
                 <div class="p-4">
                   <h4 class="text-sm font-bold text-main truncate mb-1">{{ space.title }}</h4>
                   <p class="text-xs font-medium text-dim">Created {{ new Date(space.created_at).toLocaleDateString() }}</p>
                 </div>
               </div>
             </div>
          </div>

          <!-- Side Widget (Insights) -->
          <div class="space-y-4">
             <h3 class="text-lg font-bold text-main tracking-tight">Insights</h3>
             <div class="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-6">
                <!-- Stat Card -->
                <div>
                   <p class="text-xs font-bold text-dim uppercase tracking-wider mb-1">Total Views</p>
                   <p class="text-3xl font-black text-main">{{ totalViews }}</p>
                </div>
                <!-- Stat Card -->
                <div>
                   <p class="text-xs font-bold text-dim uppercase tracking-wider mb-1">New Leads</p>
                   <div class="flex items-end gap-2">
                     <p class="text-3xl font-black text-main">{{ recentLeadsCount }}</p>
                     <p class="text-xs font-semibold text-muted mb-1.5">Last 7 days</p>
                   </div>
                </div>
                <!-- Stat Card -->
                <div>
                   <p class="text-xs font-bold text-dim uppercase tracking-wider mb-1">Active Tours</p>
                   <p class="text-3xl font-black text-main">{{ usage?.active_spaces_count || 0 }}</p>
                </div>

                <div class="pt-4 border-t border-border">
                  <NuxtLink to="/app/analytics" class="text-sm font-semibold text-muted hover:text-main transition-colors inline-flex items-center gap-1">Full Analytics <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></NuxtLink>
                </div>
             </div>

             <!-- Localized Help Widget -->
             <div class="bg-surface-alt border border-border rounded-2xl p-5 mt-4">
                <div class="w-8 h-8 rounded-lg bg-bg text-main flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </div>
                <h4 class="text-sm font-bold text-main mb-1">Quick Tip</h4>
                <p class="text-xs font-medium text-dim leading-relaxed">Share your live tours directly via WhatsApp to increase engagement by 3x.</p>
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
import { unwrapApiData, toArrayPayload } from '~/shared/utils/api'

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

const dashSelectedType = ref('residential')
const dashTypeOptions = [
  { id: 'residential', label: 'Property' },
  { id: 'automotive',  label: 'Vehicle'  },
  { id: 'commercial',  label: 'Business' },
  { id: 'other',       label: 'Multiple' },
]

onMounted(async () => {
  try {
    const billingData = unwrapApiData<any>(await apiFetch<any>('/billing/status'))
    plan.value = billingData?.plan ?? null
    usage.value = billingData?.usage ?? null

    // Fetch spaces to power the recent tours grid + empty state check
    await fetchSpaces()
    pending.value = false

    const [analyticsRes, leadsRes] = await Promise.allSettled([
      apiFetch<any[]>('/analytics/summary'),
      apiFetch<any[]>('/leads')
    ])

    const analyticsData = analyticsRes.status === 'fulfilled' ? toArrayPayload<any>(analyticsRes.value) : []
    const leadsData = leadsRes.status === 'fulfilled' ? toArrayPayload<any>(leadsRes.value) : []
    
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
