<template>
  <div class="h-full flex flex-col">
    <!-- Page Header -->
    <header class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-main">Dashboard</h1>
        <p class="text-sm text-dim mt-1">Manage your tours and track performance.</p>
      </div>
    </header>

    <!-- Loading Skeleton -->
    <section v-if="pending" class="flex flex-col gap-6">
      <!-- Stat cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="n in 4" :key="n" class="bg-card rounded-2xl p-5 animate-pulse">
          <div class="h-2.5 w-20 bg-surface-alt rounded mb-3"></div>
          <div class="h-8 w-12 bg-surface-alt rounded mb-2"></div>
          <div class="h-2 w-16 bg-surface-alt rounded"></div>
        </div>
      </div>
      <!-- Draft nudge placeholder -->
      <div class="h-11 bg-surface-alt rounded-xl animate-pulse"></div>
      <!-- Chart + Recent Tours -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-card rounded-2xl p-6 animate-pulse">
          <div class="h-3 w-32 bg-surface-alt rounded mb-2"></div>
          <div class="h-2 w-20 bg-surface-alt rounded mb-6"></div>
          <div class="h-[200px] bg-surface-alt/50 rounded-xl"></div>
        </div>
        <div class="flex flex-col gap-4 animate-pulse">
          <div class="h-4 w-28 bg-surface-alt rounded"></div>
          <div class="bg-card rounded-xl overflow-hidden">
            <div class="aspect-[16/9] w-full bg-surface-alt"></div>
            <div class="px-3 py-4">
              <div class="h-3 w-24 bg-surface-alt rounded mb-1.5"></div>
              <div class="h-2 w-16 bg-surface-alt/50 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Empty State (no tours yet) -->
    <section v-else-if="!hasSpaces" class="flex flex-col gap-8">
      <div class="relative group mx-auto max-w-2xl w-full mt-16 md:mt-24">
        <div class="absolute -inset-0.5 bg-main/5 blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000"></div>
        <div class="relative card-glass p-8 sm:p-12 md:p-16 !rounded-[3rem] border-main/10 shadow-2xl flex flex-col items-center text-center overflow-hidden">
          <div class="absolute -top-12 -right-12 w-64 h-64 bg-main/5 rounded-full blur-3xl pointer-events-none"></div>
          <div class="mb-4 md:mb-6 flex items-center justify-center">
            <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-main/10 flex items-center justify-center text-main">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="md:w-6 md:h-6"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
            </div>
          </div>
          <h2 class="text-2xl md:text-3xl font-extrabold text-main mb-3 tracking-tight">Welcome to Viewora</h2>
          <p class="text-dim mb-8 md:mb-10 font-medium text-sm md:text-base max-w-md">Capturing reality has never been this simple. Create your first immersive experience in minutes.</p>
          <div class="flex items-center justify-center gap-3 sm:gap-6 mb-10 md:mb-12 w-full relative">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/10 dark:bg-white/5 border border-white/20 flex items-center justify-center text-[10px] md:text-xs font-bold text-main">1</div>
              <p class="hidden sm:block text-[13px] font-bold text-main">Define</p>
            </div>
            <div class="w-4 md:w-8 h-px bg-white/10"></div>
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/10 dark:bg-white/5 border border-white/20 flex items-center justify-center text-[10px] md:text-xs font-bold text-main">2</div>
              <p class="hidden sm:block text-[13px] font-bold text-main">Upload</p>
            </div>
            <div class="w-4 md:w-8 h-px bg-white/10"></div>
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/10 dark:bg-white/5 border border-white/20 flex items-center justify-center text-[10px] md:text-xs font-bold text-main">3</div>
              <p class="hidden sm:block text-[13px] font-bold text-main">Share</p>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md z-10">
            <button @click="navigateTo('/app/create')" class="btn btn-primary flex-1 !py-5 shadow-2xl gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Start Creating
            </button>
            <button @click="navigateTo('/app/spaces')" class="btn btn-secondary flex-1 !py-5 shadow-sm gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              My Portfolio
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Active Dashboard -->
    <section v-else class="flex flex-col gap-6">

      <!-- Stat Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-card rounded-2xl border border-border dark:border-transparent p-5">
          <p class="text-xs font-bold text-dim uppercase tracking-wider mb-3">Total Views</p>
          <p class="text-3xl font-black text-main leading-none">{{ totalViews }}</p>
          <p class="text-xs text-dim mt-2">{{ viewsToday }} today</p>
        </div>
        <div class="bg-card rounded-2xl border border-border dark:border-transparent p-5">
          <p class="text-xs font-bold text-dim uppercase tracking-wider mb-3">Leads Captured</p>
          <p class="text-3xl font-black text-main leading-none">{{ totalLeads }}</p>
          <p class="text-xs text-dim mt-2">{{ conversionRate }} conversion</p>
        </div>
        <div class="bg-card rounded-2xl border border-border dark:border-transparent p-5">
          <p class="text-xs font-bold text-dim uppercase tracking-wider mb-3">Active Tours</p>
          <p class="text-3xl font-black text-main leading-none">{{ usage?.active_spaces_count || 0 }}</p>
          <p class="text-xs text-dim mt-2">Published &amp; live</p>
        </div>
        <div class="bg-card rounded-2xl border border-border dark:border-transparent p-5">
          <p class="text-xs font-bold text-dim uppercase tracking-wider mb-3">Top Tour</p>
          <p class="text-base font-black text-main leading-snug truncate">{{ topTourName }}</p>
          <p class="text-xs text-dim mt-2">{{ topTourViews }} views</p>
        </div>
      </div>

      <!-- Draft Nudge -->
      <div v-if="draftCount > 0" class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-surface-alt rounded-xl border-l-2 border-main text-sm">
        <span class="font-semibold text-main">{{ draftCount }} tour{{ draftCount > 1 ? 's' : '' }} still in draft — publish to start getting views</span>
        <NuxtLink to="/app/spaces" class="text-xs font-bold text-dim hover:text-main transition-colors shrink-0 ml-4">Go to Tours →</NuxtLink>
      </div>

      <!-- Chart + Recent Tours -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Views Chart -->
        <div class="lg:col-span-2 bg-card rounded-2xl border border-border dark:border-transparent p-6 flex flex-col gap-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-base font-bold text-main tracking-tight">Views Over Time</h3>
              <div class="flex items-center gap-2 mt-0.5">
                <p class="text-xs text-dim">Last 7 days</p>
                <span v-if="whatsappViews > 0" class="px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded text-[10px] font-bold">{{ whatsappViews }} via WhatsApp</span>
              </div>
              <!-- Tour filter pills -->
              <div v-if="recentSpaces.length > 0" class="flex items-center gap-1.5 mt-2 flex-wrap">
                <button
                  @click="selectedTourId = null"
                  class="px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-colors"
                  :class="!selectedTourId ? 'bg-main text-bg' : 'bg-surface-alt text-dim hover:text-main'"
                >All</button>
                <button
                  v-for="space in recentSpaces"
                  :key="space.id"
                  @click="selectedTourId = space.id"
                  class="px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-colors max-w-[100px] truncate"
                  :class="selectedTourId === space.id ? 'bg-main text-bg' : 'bg-surface-alt text-dim hover:text-main'"
                >{{ space.title }}</button>
              </div>
            </div>
            <NuxtLink to="/app/analytics" class="text-xs font-semibold text-dim hover:text-main transition-colors inline-flex items-center gap-1 flex-shrink-0 mt-0.5">
              Full Analytics
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </NuxtLink>
          </div>

          <div class="flex-1 min-h-[200px]">
            <ViewsChart :chart-days="chartDays" :max-y="maxY" />
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
              class="bg-card rounded-xl border border-border dark:border-transparent overflow-hidden cursor-pointer transition-all duration-200 group"
              @click="navigateTo(`/app/spaces/${space.id}`)"
            >
              <div class="aspect-[16/9] w-full bg-surface-alt relative overflow-hidden border-b border-black/10 dark:border-white/5">
                <div v-if="space.cover_image_url" class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500" :style="{ backgroundImage: `url(${space.cover_image_url})` }"></div>
                <span
                  class="absolute top-2 left-2 px-1.5 py-0.5 backdrop-blur-sm rounded text-[10px] font-bold uppercase tracking-wide"
                  :class="space.is_published ? 'bg-emerald-600/80 text-white' : 'bg-zinc-600/90 text-zinc-100'"
                >
                  {{ space.is_published ? 'Live' : 'Draft' }}
                </span>
              </div>
              <div class="px-3 py-3 flex items-center justify-between gap-1 transition-colors duration-200" :class="selectedTourId === space.id ? 'bg-surface-alt' : ''">
                <div class="min-w-0">
                  <h4 class="text-xs font-bold text-main truncate">{{ space.title }}</h4>
                  <p class="text-[10px] text-dim mt-0.5">{{ new Date(space.created_at).toLocaleDateString() }}</p>
                </div>
                <div class="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    class="p-1.5 rounded-lg transition-colors"
                    :class="selectedTourId === space.id ? 'bg-main text-bg' : 'hover:bg-surface-alt text-dim hover:text-main'"
                    title="View individual chart"
                    @click.stop="selectedTourId = selectedTourId === space.id ? null : space.id"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="14" width="4" height="6"/><rect x="10" y="8" width="4" height="12"/><rect x="16" y="4" width="4" height="16"/></svg>
                  </button>
                  <button
                    class="p-1.5 hover:bg-surface-alt rounded-lg text-dim hover:text-main transition-colors"
                    title="Share"
                    @click.stop="openShare(space)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  </div>

  <Teleport to="body">
    <Transition name="share-modal">
      <div v-if="spaceToShare" class="share-overlay" @click.self="spaceToShare = null">
        <div class="share-modal" role="dialog" aria-modal="true" aria-label="Share your tour">
          <div class="share-modal__topbar">
            <h2 class="share-modal__title">Share</h2>
            <button class="share-modal__close" @click="spaceToShare = null">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="share-modal__tabs" role="tablist">
            <button v-for="tab in shareTabs" :key="tab.id" type="button" class="share-modal__tab" :class="{ 'share-modal__tab--active': shareTab === tab.id }" role="tab" @click="shareTab = tab.id">{{ tab.label }}</button>
          </div>
          <div class="share-modal__body">
            <div v-if="shareTab === 'link'" class="share-modal__panel">
              <p class="share-modal__eyebrow">Link to share</p>
              <div class="share-modal__link-row">
                <span class="share-modal__link">{{ publicUrl }}</span>
                <button class="share-modal__copy" @click="copyShareUrl">
                  <template v-if="urlCopied"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Copied</template>
                  <template v-else>Copy link</template>
                </button>
              </div>
              <div class="share-modal__share-row">
                <a :href="shareWhatsappHref" target="_blank" rel="noopener" class="share-modal__share-item">
                  <span class="share-modal__share-icon share-modal__share-icon--whatsapp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.49 2 2 6.48 2 12c0 1.89.52 3.66 1.42 5.18L2 22l4.98-1.39A9.96 9.96 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm5.8 14.16c-.24.68-1.44 1.32-1.98 1.39-.52.07-1.2.1-1.95-.12-.46-.14-1.05-.33-1.81-.66-3.18-1.38-5.24-4.6-5.39-4.81-.14-.21-1.3-1.73-1.3-3.3s.79-2.34 1.07-2.66c.28-.32.61-.4.82-.4h.58c.19 0 .45-.07.7.53.24.6.82 2.07.89 2.22.07.15.12.33.02.54-.1.21-.15.34-.3.52-.15.18-.31.4-.45.53-.15.16-.3.33-.13.63.16.31.71 1.17 1.52 1.9 1.04.92 1.9 1.21 2.22 1.37.31.16.49.14.67-.08.18-.22.77-.9.98-1.2.2-.31.4-.26.67-.16.28.1 1.74.82 2.04.97.3.14.5.22.58.34.08.12.08.74-.17 1.42Z"/></svg></span>
                  <span class="share-modal__share-label">WhatsApp</span>
                </a>
                <a :href="shareXHref" target="_blank" rel="noopener" class="share-modal__share-item">
                  <span class="share-modal__share-icon share-modal__share-icon--x"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.78 7.72L23.2 22h-6.4l-5-6.58L5.98 22H2.84l7.2-8.2L.8 2h6.55l4.53 5.98L18.9 2Zm-1.12 18h1.72L6.42 3.94H4.58L17.78 20Z"/></svg></span>
                  <span class="share-modal__share-label">X</span>
                </a>
                <a :href="shareGmailHref" class="share-modal__share-item">
                  <span class="share-modal__share-icon share-modal__share-icon--gmail"><svg viewBox="0 0 24 24" fill="none"><path d="M4 6.5h16v11H4z" fill="currentColor" opacity="0.16"/><path d="M4 6.5 12 12 20 6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
                  <span class="share-modal__share-label">Gmail</span>
                </a>
              </div>
            </div>
            <div v-else-if="shareTab === 'embed'" class="share-modal__panel">
              <p class="share-modal__eyebrow">Embed</p>
              <div class="share-modal__link-row share-modal__link-row--code">
                <code class="share-modal__link share-modal__link--code">{{ shareEmbedCode }}</code>
                <button class="share-modal__copy" @click="copyEmbedCode">
                  <template v-if="embedCopied"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Copied</template>
                  <template v-else>Copy iframe</template>
                </button>
              </div>
              <div class="share-modal__preview-card">
                <iframe :src="embedUrl" class="share-modal__preview-frame" title="Tour embed preview" loading="lazy" referrerpolicy="no-referrer" />
              </div>
            </div>
            <div v-else class="share-modal__panel share-modal__panel--qr">
              <p class="share-modal__eyebrow">QR code</p>
              <div class="share-modal__qr-card">
                <div class="share-modal__qr-wrap">
                  <img v-if="!qrLoading && qrDataUrl" :src="qrDataUrl" alt="QR code" class="share-modal__qr-image" />
                  <div v-else class="share-modal__qr-placeholder"><span class="share-modal__qr-loading" /></div>
                </div>
                <p class="share-modal__qr-text">Scan to open the tour on any device.</p>
                <p class="share-modal__qr-url">{{ publicUrl }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { definePageMeta, navigateTo } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSpaces } from '~/composables/useSpaces'
import { unwrapApiData, toArrayPayload } from '~/shared/utils/api'
import type { Space } from '~/composables/useSpaces'
import QRCode from 'qrcode'

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
const shareTab = ref<'link' | 'embed' | 'qr'>('link')
const urlCopied = ref(false)
const embedCopied = ref(false)
const qrDataUrl = ref('')
const qrLoading = ref(false)
const shareTabs = [
  { id: 'link', label: 'Send a link' },
  { id: 'embed', label: 'Embed' },
  { id: 'qr', label: 'QR code' },
]
const publicUrl = computed(() => {
  if (!spaceToShare.value) return ''
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/p/${spaceToShare.value.slug || spaceToShare.value.id}`
})
const embedUrl = computed(() => {
  if (!spaceToShare.value) return ''
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/embed/${spaceToShare.value.slug || spaceToShare.value.id}`
})
const shareText = computed(() => `Check out this immersive virtual tour created with Viewora: ${publicUrl.value}`)
const shareWhatsappHref = computed(() => `https://wa.me/?text=${encodeURIComponent(shareText.value)}`)
const shareXHref = computed(() => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.value)}`)
const shareGmailHref = computed(() => `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('Viewora virtual tour')}&body=${encodeURIComponent(shareText.value)}`)
const shareEmbedCode = computed(() => `<iframe src="${embedUrl.value}" width="100%" height="600" frameborder="0" allowfullscreen style="border-radius:8px; border:none;"></iframe>`)

function openShare(space: Space) {
  spaceToShare.value = space
  shareTab.value = 'link'
}
async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    urlCopied.value = true
    setTimeout(() => { urlCopied.value = false }, 2000)
  } catch { /* silent */ }
}
async function copyEmbedCode() {
  try {
    await navigator.clipboard.writeText(shareEmbedCode.value)
    embedCopied.value = true
    setTimeout(() => { embedCopied.value = false }, 2000)
  } catch { /* silent */ }
}
watch(spaceToShare, async (space) => {
  shareTab.value = 'link'
  qrDataUrl.value = ''
  if (!space) return
  qrLoading.value = true
  try {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${space.slug || space.id}`
    qrDataUrl.value = await QRCode.toDataURL(url, { width: 192, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#111827', light: '#ffffff' } })
  } catch { qrDataUrl.value = '' }
  finally { qrLoading.value = false }
})

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

<style scoped>
.share-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(60,64,67,.32); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 18px; }
.share-modal { width: 100%; max-width: 560px; background: #fff; border-radius: 16px; box-shadow: 0 1px 2px rgba(60,64,67,.3), 0 8px 24px rgba(60,64,67,.18); color: #202124; overflow: hidden; }
.share-modal__topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; }
.share-modal__title { font-size: 22px; font-weight: 400; color: #202124; }
.share-modal__close { width: 28px; height: 28px; border-radius: 50%; background: transparent; border: none; color: #5f6368; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 120ms; }
.share-modal__close:hover { background: rgba(60,64,67,.08); color: #202124; }
.share-modal__tabs { display: flex; gap: 8px; padding: 0 20px; border-bottom: 1px solid #e8eaed; }
.share-modal__tab { position: relative; padding: 12px 4px 11px; border: none; background: transparent; color: #5f6368; font-size: 14px; font-weight: 500; cursor: pointer; }
.share-modal__tab--active { color: #1a73e8; }
.share-modal__tab--active::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 2px 2px 0 0; background: #1a73e8; }
.share-modal__body { padding: 16px 20px 20px; }
.share-modal__panel { display: flex; flex-direction: column; gap: 14px; }
.share-modal__eyebrow { font-size: 13px; font-weight: 500; color: #5f6368; }
.share-modal__link-row { display: flex; align-items: center; gap: 10px; min-height: 44px; border: 1px solid #dadce0; border-radius: 10px; padding: 0 12px; background: #fff; }
.share-modal__link-row--code { align-items: center; padding: 10px 12px; }
.share-modal__link { flex: 1; min-width: 0; font-size: 13px; color: #3c4043; white-space: nowrap; overflow-x: auto; overflow-y: hidden; font-family: ui-monospace, monospace; }
.share-modal__link--code { white-space: nowrap; word-break: normal; }
.share-modal__copy { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid #dadce0; background: #f8f9fa; color: #1a73e8; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background 120ms, border-color 120ms; flex-shrink: 0; }
.share-modal__copy:hover { background: #eef3fd; border-color: #c6dafc; }
.share-modal__share-row { display: flex; flex-wrap: wrap; gap: 14px; padding-top: 6px; }
.share-modal__share-item { width: 76px; display: flex; flex-direction: column; align-items: center; gap: 8px; border: none; background: transparent; color: #3c4043; text-decoration: none; cursor: pointer; }
.share-modal__share-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.share-modal__share-icon svg { width: 22px; height: 22px; }
.share-modal__share-icon--whatsapp { color: #25d366; background: rgba(37,211,102,.12); }
.share-modal__share-icon--x { color: #111827; background: #f3f4f6; }
.share-modal__share-icon--gmail { color: #ea4335; background: rgba(234,67,53,.10); }
.share-modal__share-label { font-size: 12px; font-weight: 500; color: #3c4043; }
.share-modal__preview-card { border: 1px solid #dadce0; border-radius: 14px; overflow: hidden; background: #f8f9fa; }
.share-modal__preview-frame { display: block; width: 100%; height: 300px; border: 0; }
.share-modal__panel--qr { align-items: center; }
.share-modal__qr-card { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px; border: 1px solid #dadce0; border-radius: 16px; padding: 20px; background: #fff; }
.share-modal__qr-wrap { width: 192px; height: 192px; border-radius: 14px; border: 1px solid #e8eaed; display: flex; align-items: center; justify-content: center; }
.share-modal__qr-image { width: 176px; height: 176px; }
.share-modal__qr-placeholder { width: 176px; height: 176px; display: flex; align-items: center; justify-content: center; }
.share-modal__qr-loading { width: 32px; height: 32px; border-radius: 50%; border: 3px solid #e8eaed; border-top-color: #1a73e8; animation: share-spin 0.8s linear infinite; }
.share-modal__qr-text { font-size: 13px; color: #5f6368; text-align: center; }
.share-modal__qr-url { font-size: 12px; color: #80868b; text-align: center; word-break: break-all; }
@keyframes share-spin { to { transform: rotate(360deg); } }
.share-modal-enter-active, .share-modal-leave-active { transition: opacity 0.2s ease; }
.share-modal-enter-active .share-modal, .share-modal-leave-active .share-modal { transition: transform 0.2s ease, opacity 0.2s ease; }
.share-modal-enter-from { opacity: 0; }
.share-modal-enter-from .share-modal { transform: scale(0.92) translateY(12px); }
.share-modal-leave-to { opacity: 0; }
.share-modal-leave-to .share-modal { transform: scale(0.95) translateY(6px); }
</style>
