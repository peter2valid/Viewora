<template>
  <div class="min-h-screen bg-white font-sans text-zinc-900 selection:bg-zinc-900 selection:text-white">
    <!-- Loading State -->
    <div v-if="pending" class="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6">
      <div class="w-12 h-12 border-4 border-zinc-100 border-t-zinc-900 rounded-full animate-spin"></div>
      <span class="text-sm font-black tracking-widest text-zinc-400 uppercase">Immersing...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center">
      <div class="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h1 class="text-2xl font-black mb-2">Space Unavailable</h1>
      <p class="text-zinc-500 font-medium max-w-xs">{{ fetchError }}</p>
      <NuxtLink to="/" class="mt-8 px-8 py-3 bg-zinc-950 text-white rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95">Return Home</NuxtLink>
    </div>

    <!-- Main Space View -->
    <template v-else-if="space">
      <!-- Premium Navigation -->
      <nav class="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-100 px-6 py-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 bg-zinc-950 rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-950/20">
                <div class="w-3 h-3 bg-white rounded-full"></div>
             </div>
             <div>
                <span class="text-lg font-black tracking-tighter block leading-none">VIEWORA</span>
                <span v-if="space.profiles?.agency_name" class="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none mt-1 block">{{ space.profiles.agency_name }}</span>
             </div>
          </div>
          
          <div class="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-zinc-400">
             <a href="#experience" class="hover:text-zinc-950 transition-colors">Experience</a>
             <a href="#details" class="hover:text-zinc-950 transition-colors">Details</a>
             <a href="#gallery" class="hover:text-zinc-950 transition-colors">Gallery</a>
          </div>

          <button 
            @click="scrollToForm"
            class="px-6 py-2.5 bg-zinc-950 text-white text-xs font-black rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20 active:scale-95"
          >
            Inquire Now
          </button>
        </div>
      </nav>

      <main class="pt-24 pb-32">
          <!-- Hero / 360 Viewer Section -->
          <section id="experience" class="px-6 max-w-7xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
           <PublicTourHero
            :space="space"
            :panorama="panorama"
            :settings="settings"
            :share-url="shareUrl"
            :embed-url="embedUrl"
            :gallery-count="gallery.length"
           />
          </section>

        <!-- Main Content Grid -->
        <section class="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-16 md:gap-24">
           <!-- Details & Gallery -->
           <div class="lg:col-span-2 space-y-24">
              <!-- About Section -->
              <div id="details" class="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                <div class="flex items-center gap-4 mb-8">
                   <h2 class="text-4xl font-black tracking-tighter">The Narrative</h2>
                   <div class="h-px flex-1 bg-zinc-100"></div>
                </div>
                <p class="text-2xl text-zinc-500 leading-relaxed font-medium whitespace-pre-line tracking-tight">
                  {{ space.description || 'No detailed narrative provided for this architectural masterpiece.' }}
                </p>
              </div>

              <!-- Gallery Grid -->
              <div id="gallery" v-if="gallery.length" class="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                 <div class="flex items-center justify-between mb-12">
                    <h2 class="text-4xl font-black tracking-tighter">Curation</h2>
                    <div class="flex items-center gap-3">
                       <span class="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{{ gallery.length }} Selected Photos</span>
                       <div class="w-2 h-2 bg-zinc-100 rounded-full"></div>
                    </div>
                 </div>
                 
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div 
                      v-for="(img, idx) in gallery" 
                      :key="img.id" 
                      class="group relative aspect-[4/3] bg-zinc-100 rounded-[3rem] overflow-hidden cursor-zoom-in hover:shadow-2xl hover:-translate-y-4 transition-all duration-700 animate-in fade-in"
                      :style="{ animationDelay: `${idx * 100}ms` }"
                      @click="lightboxImg = img.public_url"
                    >
                       <img :src="img.public_url" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" loading="lazy" />
                       
                       <!-- Premium Overlay -->
                       <div class="absolute inset-0 bg-zinc-950/20 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px] flex flex-col justify-end p-8">
                          <div class="flex items-center justify-between">
                             <div class="w-14 h-14 bg-white/20 backdrop-blur-3xl border border-white/20 rounded-2xl flex items-center justify-center text-white transform scale-90 group-hover:scale-100 transition-transform duration-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                             </div>
                             <span class="text-[10px] font-black uppercase tracking-widest text-white/60">Inspect Shot</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <!-- Inquiry Sidebar -->
           <aside v-if="space.lead_form_enabled" id="inquiry-form" class="lg:sticky lg:top-32 h-fit animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
              <div class="bg-zinc-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
                 <!-- Background Polish -->
                 <div class="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] group-hover:bg-emerald-500/20 transition-colors duration-1000"></div>
                 
                 <div class="relative z-10">
                   <h3 class="text-3xl font-black tracking-tight mb-2">Request Access</h3>
                   <p class="text-zinc-500 text-sm mb-10 font-medium">Leave your credentials for a private consultation.</p>
                   
                   <div v-if="leadSuccess" class="py-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                      <div class="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/40">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <h4 class="text-xl font-bold mb-2">Message Delivered</h4>
                      <p class="text-zinc-400 text-sm">The property owners will reach out to you shortly.</p>
                      <button @click="leadSuccess = false" class="mt-8 text-xs font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 underline transition-colors">Send Another</button>
                   </div>

                   <form v-else @submit.prevent="submitLead" class="space-y-4">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">Identification</label>
                         <input v-model="leadForm.name" type="text" placeholder="Your Full Name" required class="w-full bg-white/5 border border-white/5 focus:border-white/20 focus:ring-4 focus:ring-white/5 rounded-2xl p-4 text-sm font-bold placeholder:text-zinc-700 outline-none transition-all" />
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">Communication</label>
                         <input v-model="leadForm.email" type="email" placeholder="Email Address" required class="w-full bg-white/5 border border-white/5 focus:border-white/20 focus:ring-4 focus:ring-white/5 rounded-2xl p-4 text-sm font-bold placeholder:text-zinc-700 outline-none transition-all" />
                         <input v-model="leadForm.phone" type="tel" placeholder="Phone (Optional)" class="w-full bg-white/5 border border-white/5 focus:border-white/20 focus:ring-4 focus:ring-white/5 rounded-2xl p-4 text-sm font-bold placeholder:text-zinc-700 outline-none transition-all" />
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">Intent</label>
                         <textarea v-model="leadForm.message" placeholder="Special requirements or questions..." rows="4" class="w-full bg-white/5 border border-white/5 focus:border-white/20 focus:ring-4 focus:ring-white/5 rounded-2xl p-4 text-sm font-bold placeholder:text-zinc-700 outline-none transition-all resize-none"></textarea>
                      </div>
                      
                      <button 
                        type="submit" 
                        class="w-full py-5 mt-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-base font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                        :disabled="leadPending"
                      >
                        {{ leadPending ? 'Relaying...' : 'Dispatch Inquiry' }}
                      </button>
                      <p v-if="leadError" class="text-xs font-bold text-rose-500 text-center mt-4 italic">{{ leadError }}</p>
                   </form>
                 </div>
              </div>
           </aside>
        </section>
      </main>

      <!-- Premium Branding -->
      <div v-if="space.branding_enabled && space.profiles?.agency_logo_url" class="fixed bottom-8 left-8 z-40 animate-in fade-in slide-in-from-left-8 duration-1000 delay-700">
         <div class="bg-white/80 backdrop-blur-2xl px-6 py-4 rounded-[1.5rem] border border-zinc-100 shadow-2xl flex items-center gap-4 group hover:bg-white transition-colors">
            <img :src="space.profiles.agency_logo_url" class="h-8 w-auto grayscale group-hover:grayscale-0 transition-all duration-500" />
            <div class="h-6 w-px bg-zinc-100"></div>
            <span class="text-[11px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-950 transition-colors">{{ space.profiles.agency_name }}</span>
         </div>
      </div>
      <div v-else class="fixed bottom-8 left-8 z-40 pointer-events-none opacity-20">
         <span class="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-950 italic">Powered by Viewora Studio</span>
      </div>

      <!-- Lightbox System -->
      <Teleport to="body">
        <Transition name="modal-in">
          <div v-if="lightboxImg" class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
             <div class="absolute inset-0 bg-zinc-950/95 backdrop-blur-3xl" @click="lightboxImg = null"></div>
             
             <button 
               class="absolute top-8 right-8 w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-center transition-all duration-300 z-10 backdrop-blur-md border border-white/10 shadow-2xl"
               @click="lightboxImg = null"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
             </button>

             <div class="relative w-full h-full flex items-center justify-center animate-modal-in pointer-events-none">
                <img 
                  :src="lightboxImg" 
                  class="max-w-full max-h-full object-contain rounded-[2.5rem] shadow-2xl pointer-events-auto border border-white/5 shadow-white/5" 
                  @click.stop
                />
                
                <!-- Experience Badge -->
                <div class="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-none opacity-40 select-none">
                  <div class="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                    <div class="w-1.5 h-1.5 bg-black rounded-full"></div>
                  </div>
                  <span class="text-[10px] font-black text-white tracking-[0.3em] uppercase italic">Cinematic Preview</span>
                </div>
             </div>
          </div>
        </Transition>
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
import { ref, computed, onMounted } from 'vue'
import { useSeoMeta, useHead, useRoute } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

const { apiFetch } = useApiFetch()
const route = useRoute()
const slug = route.params.slug as string

const pending = ref(true)
const fetchError = ref('')
const space = ref<any>(null)
const lightboxImg = ref<string | null>(null)
const shareUrl = ref('')
const embedUrl = ref('')

// Lead form
const leadPending = ref(false)
const leadError = ref('')
const leadSuccess = ref(false)
const leadForm = ref({ name: '', email: '', phone: '', message: '' })

const media = computed(() => space.value?.property_media || [])
const gallery = computed(() => media.value.filter((m: any) => m.media_type === 'gallery_image'))
const panorama = computed(() => media.value.find((m: any) => m.media_type === 'panorama'))
const settings = computed(() => space.value?.property_360_settings?.[0])
const publicSlug = computed(() => space.value?.slug || space.value?.id || slug)

onMounted(async () => {
  await fetchSpace()
  syncShareLinks()
})

async function fetchSpace() {
  pending.value = true
  try {
    const data = await apiFetch<any>(`/spaces/by-slug/${encodeURIComponent(slug)}`)
    space.value = data
    syncShareLinks(data)
    fireViewEvent(data.id)
  } catch (err: any) {
    fetchError.value = err.data?.statusMessage || 'Space unavailable or removed.'
  } finally {
    pending.value = false
  }
}

function syncShareLinks(value = space.value) {
  if (typeof window === 'undefined' || !value) return

  const identifier = value.slug || value.id || publicSlug.value
  const origin = window.location.origin
  shareUrl.value = `${origin}/p/${identifier}`
  embedUrl.value = `${origin}/embed/${identifier}`
}

async function submitLead() {
  leadError.value = ''
  leadPending.value = true
  try {
    await apiFetch('/leads', {
      method: 'POST',
      body: {
        spaceId: space.value.id,
        ...leadForm.value,
        source: route.query.src || 'direct'
      }
    })
    leadSuccess.value = true
    leadForm.value = { name: '', email: '', phone: '', message: '' }
  } catch (err: any) {
    leadError.value = err.data?.statusMessage || 'Failed to dispatch inquiry.'
  } finally {
    leadPending.value = false
  }
}

function fireViewEvent(spaceId: string) {
  apiFetch('/analytics/view', {
    method: 'POST',
    body: { spaceId, source: route.query.src || 'direct' }
  }).catch(() => {})
}

function scrollToForm() {
  const el = document.getElementById('inquiry-form')
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

const ogImage = computed(() => space.value?.cover_image_url || 'https://app.viewora.software/images/og-default.png')

useSeoMeta({
  title: computed(() => space.value ? `${space.value.title} | Viewora Studio` : 'Property Experience'),
  ogTitle: computed(() => space.value ? `${space.value.title} | Viewora Studio` : 'Property Experience'),
  description: computed(() => space.value?.description || 'Experience this immersive architectural vision on Viewora.'),
  ogDescription: computed(() => space.value?.description || 'Experience this immersive architectural vision on Viewora.'),
  ogImage: ogImage,
  twitterCard: 'summary_large_image',
  twitterTitle: computed(() => space.value ? `${space.value.title} | Viewora Studio` : 'Property Experience'),
  twitterDescription: computed(() => space.value?.description || 'Experience this immersive architectural vision on Viewora.'),
  twitterImage: ogImage
})

useHead({
  link: [
    { rel: 'canonical', href: computed(() => `https://viewora.software/p/${slug}`) }
  ]
})
</script>

<style>
.modal-in-enter-active, .modal-in-leave-active { transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-in-enter-from, .modal-in-leave-to { opacity: 0; transform: scale(0.95); filter: blur(10px); }

@keyframes modal-in {
  0% { opacity: 0; transform: scale(0.8) translateY(20px); filter: blur(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
}
.animate-modal-in {
  animation: modal-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
