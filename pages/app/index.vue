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
      
      <!-- EMPTY STATE / ONBOARDING (If 0 spaces) -->
      <div v-if="!hasSpaces">
        <h2 class="text-base font-bold text-main mb-5">Try things out</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">

          <!-- Card 1: Define -->
          <div class="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <!-- Illustration -->
            <div class="h-44 bg-surface-alt dark:bg-zinc-900 relative overflow-hidden flex items-center justify-center">
              <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="16" y="16" width="86" height="50" rx="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="118" y="16" width="86" height="50" rx="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="16" y="74" width="86" height="50" rx="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="118" y="74" width="86" height="50" rx="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="24" y="24" width="20" height="20" rx="5" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="126" y="24" width="20" height="20" rx="5" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="24" y="82" width="20" height="20" rx="5" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="126" y="82" width="20" height="20" rx="5" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="52" y="28" width="42" height="6" rx="3" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <rect x="52" y="38" width="28" height="4" rx="2" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="154" y="28" width="42" height="6" rx="3" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <rect x="154" y="38" width="28" height="4" rx="2" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="52" y="86" width="42" height="6" rx="3" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <rect x="52" y="96" width="28" height="4" rx="2" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="154" y="86" width="42" height="6" rx="3" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <rect x="154" y="96" width="28" height="4" rx="2" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
              </svg>
            </div>
            <!-- Body -->
            <div class="p-5 flex flex-col flex-1">
              <div class="flex items-center gap-1.5 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-500"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span class="text-xs font-bold tracking-widest uppercase text-orange-500">01 Define</span>
              </div>
              <h3 class="text-base font-bold text-main mb-2">Define your space</h3>
              <p class="text-sm text-dim leading-relaxed flex-1">Pick the type of venue you want to showcase — a property, vehicle, business, or more — then give it a name. That's all it takes to get started.</p>
              <div class="mt-5">
                <button @click="navigateTo('/app/spaces')" class="text-sm font-semibold text-dim hover:text-main transition-colors flex items-center gap-1">
                  Learn more
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Card 2: Upload -->
          <div class="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <!-- Illustration -->
            <div class="h-44 bg-surface-alt dark:bg-zinc-900 relative overflow-hidden flex items-center justify-center">
              <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="30" y="20" width="160" height="100" rx="12" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="42" y="32" width="136" height="76" rx="8" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <!-- panorama lines -->
                <ellipse cx="110" cy="70" rx="48" ry="28" stroke="currentColor" stroke-width="2" class="text-zinc-400 dark:text-zinc-500" fill="none"/>
                <line x1="110" y1="42" x2="110" y2="98" stroke="currentColor" stroke-width="1.5" class="text-zinc-400 dark:text-zinc-500"/>
                <line x1="62" y1="70" x2="158" y2="70" stroke="currentColor" stroke-width="1.5" class="text-zinc-400 dark:text-zinc-500"/>
                <!-- upload arrow -->
                <circle cx="110" cy="70" r="12" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <polyline points="106,72 110,66 114,72" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-500 dark:text-zinc-400" fill="none"/>
                <line x1="110" y1="66" x2="110" y2="76" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-zinc-500 dark:text-zinc-400"/>
              </svg>
            </div>
            <!-- Body -->
            <div class="p-5 flex flex-col flex-1">
              <div class="flex items-center gap-1.5 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                <span class="text-xs font-bold tracking-widest uppercase text-indigo-500">02 Upload</span>
              </div>
              <h3 class="text-base font-bold text-main mb-2">Upload your 360° visuals</h3>
              <p class="text-sm text-dim leading-relaxed flex-1">Open your tour's editor and drop in your 360° images. Arrange scenes, fine-tune settings, and build the immersive walkthrough your clients will love.</p>
              <div class="mt-5">
                <button @click="navigateTo('/app/spaces')" class="text-sm font-semibold text-dim hover:text-main transition-colors flex items-center gap-1">
                  Learn more
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Card 3: Share -->
          <div class="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <!-- Illustration -->
            <div class="h-44 bg-surface-alt dark:bg-zinc-900 relative overflow-hidden flex items-center justify-center">
              <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- center node -->
                <circle cx="110" cy="70" r="16" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <circle cx="110" cy="70" r="8" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <!-- branches -->
                <line x1="110" y1="54" x2="110" y2="34" stroke="currentColor" stroke-width="2" class="text-zinc-300 dark:text-zinc-600"/>
                <line x1="97" y1="58" x2="68" y2="42" stroke="currentColor" stroke-width="2" class="text-zinc-300 dark:text-zinc-600"/>
                <line x1="123" y1="58" x2="152" y2="42" stroke="currentColor" stroke-width="2" class="text-zinc-300 dark:text-zinc-600"/>
                <line x1="97" y1="82" x2="68" y2="98" stroke="currentColor" stroke-width="2" class="text-zinc-300 dark:text-zinc-600"/>
                <line x1="123" y1="82" x2="152" y2="98" stroke="currentColor" stroke-width="2" class="text-zinc-300 dark:text-zinc-600"/>
                <!-- outer nodes -->
                <circle cx="110" cy="28" r="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <circle cx="60" cy="36" r="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <circle cx="160" cy="36" r="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <circle cx="60" cy="104" r="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <circle cx="160" cy="104" r="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <!-- link bar -->
                <rect x="46" y="114" width="128" height="14" rx="7" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="52" y="117" width="80" height="8" rx="4" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <rect x="148" y="116" width="20" height="10" rx="5" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
              </svg>
            </div>
            <!-- Body -->
            <div class="p-5 flex flex-col flex-1">
              <div class="flex items-center gap-1.5 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span class="text-xs font-bold tracking-widest uppercase text-emerald-500">03 Share</span>
              </div>
              <h3 class="text-base font-bold text-main mb-2">Share everywhere</h3>
              <p class="text-sm text-dim leading-relaxed flex-1">Publish your tour and get a shareable link instantly. Send it to clients, embed it on your website, or post to social media — your tour, your audience.</p>
              <div class="mt-5">
                <button @click="navigateTo('/app/spaces')" class="text-sm font-semibold text-dim hover:text-main transition-colors flex items-center gap-1">
                  Learn more
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>

        </div>

        <div class="mt-6 flex justify-center">
          <button @click="navigateTo('/app/spaces')" class="btn btn-primary px-8 py-3 text-sm">
            Get Started →
          </button>
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
