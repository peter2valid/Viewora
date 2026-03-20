<template>
  <div class="h-full flex flex-col">
    <!-- Header with Breadcrumbs & Actions -->
    <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <nav class="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-1">
           <NuxtLink to="/app/spaces" class="hover:text-zinc-900 transition-colors">Spaces</NuxtLink>
           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
           <span class="text-zinc-400 truncate max-w-[150px]">{{ space?.title || '...' }}</span>
        </nav>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-zinc-950 truncate max-w-[300px] md:max-w-md">{{ space?.title || 'Edit Space' }}</h1>
          <div v-if="space?.is_published" class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold uppercase tracking-wider border border-emerald-200">Live</div>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <a 
           v-if="space?.is_published && space.slug" 
           :href="`/p/${space.slug}`" 
           target="_blank" 
           class="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-zinc-700 text-sm font-medium rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          View Live
        </a>
        <button 
          class="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50" 
          @click="handleTogglePublish" 
          :disabled="publishing"
        >
          <div v-if="publishing" class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          {{ space?.is_published ? 'Unpublish' : 'Publish Space' }}
        </button>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-6 overflow-x-auto border-b border-zinc-200 mb-8 scrollbar-hide">
      <button 
        v-for="tab in [
          { id: 'details', label: 'Details' }, 
          { id: 'gallery', label: 'Gallery' }, 
          { id: '360', label: '360° Studio' }, 
          { id: 'share', label: 'Share' }
        ]" 
        :key="tab.id" 
        class="flex items-center py-3 border-b-2 text-sm font-medium transition-all relative whitespace-nowrap group"
        :class="activeTab === tab.id ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="flex-1">


      <!-- DETAILS TAB -->
      <div v-if="activeTab === 'details'" class="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        <form @submit.prevent="handleUpdateDetails" class="space-y-8">
          <section class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-zinc-100">
              <h3 class="text-base font-semibold text-zinc-900">Basic Information</h3>
            </div>
            <div class="p-6 space-y-6">
              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-zinc-700">Space Title</label>
                <input v-model="detailsForm.title" type="text" class="w-full px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none transition-shadow shadow-sm" required placeholder="e.g. Modern Minimalist Loft" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-zinc-700">Custom Slug</label>
                <div class="flex items-center gap-2">
                   <span class="text-sm text-zinc-400 font-mono">viewora.com/p/</span>
                   <input v-model="detailsForm.slug" type="text" class="flex-1 px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none transition-shadow shadow-sm" placeholder="unique-space-id" />
                </div>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-zinc-700">Description</label>
                <textarea v-model="detailsForm.description" class="w-full px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none transition-shadow shadow-sm resize-none" rows="4" placeholder="Brief overview of the property..."></textarea>
              </div>
            </div>
          </section>

          <section class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 class="text-base font-semibold text-zinc-900">Feature Toggles</h3>
            </div>
            <div class="divide-y divide-zinc-100">
              <div class="flex items-center justify-between p-6">
                <div>
                  <span class="text-sm font-semibold text-zinc-900 block">Lead Capture Form</span>
                  <span class="text-xs text-zinc-500 mt-0.5 block">Enable visitor enquiry collection.</span>
                </div>
                <div class="flex items-center gap-3">
                  <div v-if="!planStore.entitlements?.lead_capture_enabled" class="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase rounded">Pro</div>
                  <button 
                    v-else
                    type="button" 
                    class="w-10 h-5 rounded-full relative transition-colors duration-200 focus:outline-none"
                    :class="space?.lead_form_enabled ? 'bg-zinc-900' : 'bg-zinc-200'"
                    @click="handleToggleFeature('lead_form_enabled')"
                  >
                    <div class="absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-200" :class="space?.lead_form_enabled ? 'translate-x-5' : ''"></div>
                  </button>
                </div>
              </div>

              <div class="flex items-center justify-between p-6">
                <div>
                  <span class="text-sm font-semibold text-zinc-900 block">Agency Branding</span>
                  <span class="text-xs text-zinc-500 mt-0.5 block">Display your agency watermark.</span>
                </div>
                <div class="flex items-center gap-3">
                  <div v-if="!planStore.entitlements?.branding_customization_enabled" class="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase rounded">Pro</div>
                  <button 
                    v-else
                    type="button" 
                    class="w-10 h-5 rounded-full relative transition-colors duration-200 focus:outline-none"
                    :class="space?.branding_enabled ? 'bg-zinc-900' : 'bg-zinc-200'"
                    @click="handleToggleFeature('branding_enabled')"
                  >
                    <div class="absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-200" :class="space?.branding_enabled ? 'translate-x-5' : ''"></div>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div class="flex justify-end sticky bottom-0 bg-zinc-50/80 backdrop-blur-sm py-4 border-t border-zinc-200 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button type="submit" class="px-6 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Details' }}
            </button>
          </div>
        </form>
      </div>

      <!-- GALLERY TAB -->
      <div v-if="activeTab === 'gallery'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <header class="flex items-center justify-between">
           <div>
             <h3 class="text-base font-semibold text-zinc-900">Property Photos</h3>
             <p class="text-sm text-zinc-500 mt-0.5">High-quality 2D images for the carousel.</p>
           </div>
           <label class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-sm font-medium text-zinc-700 rounded-lg hover:bg-zinc-50 shadow-sm transition-colors">
             <input type="file" multiple accept="image/*" class="hidden" @change="handleGalleryUpload" />
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
             Upload Photos
           </label>
        </header>

        <div v-if="galleryMedia.length" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
           <div v-for="img in galleryMedia" :key="img.id" class="group relative aspect-video bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200 shadow-sm">
              <img :src="img.public_url" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div class="absolute inset-0 bg-zinc-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <button class="p-2 bg-white rounded-md text-rose-600 shadow-lg hover:scale-110 transition-transform" @click="handleDeleteMedia(img.id)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                 </button>
              </div>
           </div>
        </div>
        <div v-else class="p-12 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center text-center">
           <div class="w-10 h-10 bg-zinc-50 text-zinc-300 rounded-lg flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
           </div>
           <p class="text-sm font-medium text-zinc-900">No photos yet</p>
           <p class="text-xs text-zinc-500 mt-1">Upload property images to build your gallery.</p>
        </div>
      </div>

      <!-- 360 STUDIO TAB -->
      <div v-if="activeTab === '360'" class="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <section class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden p-6">
           <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-base font-semibold text-zinc-900">Panorama Upload</h3>
                <p class="text-sm text-zinc-500 mt-0.5">High-resolution equirectangular image (2:1 ratio).</p>
              </div>
              <label v-if="!panorama" class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors shadow-sm">
                <input type="file" accept="image/*" class="hidden" @change="handlePanoramaUpload" />
                Select Image
              </label>
           </div>

           <div v-if="panorama" class="relative rounded-lg overflow-hidden border border-zinc-200 aspect-[2/1] bg-zinc-900">
              <img :src="panorama.public_url" class="w-full h-full object-cover opacity-80" />
              <div class="absolute inset-0 flex items-center justify-center">
                 <button class="px-4 py-2 bg-white text-zinc-900 text-sm font-medium rounded-lg shadow-xl hover:bg-zinc-50 transition-colors" @click="handleDeleteMedia(panorama.id)">Remove Panorama</button>
              </div>
           </div>
           <div v-else class="p-12 bg-zinc-50 rounded-lg border border-zinc-100 flex flex-col items-center justify-center text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-zinc-300 mb-3"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
              <p class="text-sm font-medium text-zinc-900">No panorama detected</p>
              <p class="text-xs text-zinc-500 mt-1">Upload a 360° image to enable the immersive experience.</p>
           </div>
        </section>
      </div>

      <!-- SHARE TAB -->
      <div v-if="activeTab === 'share'" class="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <section class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
           <div class="p-6 border-b border-zinc-100">
              <h3 class="text-base font-semibold text-zinc-900">Public Access</h3>
           </div>
           <div class="p-6 space-y-6">
              <div class="space-y-2">
                <label class="text-xs font-medium text-zinc-500 uppercase tracking-wider">Direct Link</label>
                <div class="flex gap-2">
                   <input readonly :value="publicUrl" class="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-sm font-mono text-zinc-600 outline-none" />
                   <button class="px-4 py-2 bg-white border border-zinc-200 text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-50 shadow-sm" @click="copyLink(publicUrl)">Copy</button>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                 <div class="space-y-3">
                    <label class="text-xs font-medium text-zinc-500 uppercase tracking-wider">QR Code</label>
                    <div class="p-4 bg-zinc-50 rounded-lg flex flex-col items-center gap-4">
                       <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`" class="w-32 h-32 rounded shadow-sm border border-zinc-200" />
                       <button class="text-xs font-semibold text-zinc-900 hover:underline" @click="downloadQR('png')">Download PNG</button>
                    </div>
                 </div>
                 <div class="space-y-3">
                    <label class="text-xs font-medium text-zinc-500 uppercase tracking-wider">Embed Code</label>
                    <textarea readonly :value="embedCode" class="w-full h-32 bg-zinc-50 border border-zinc-200 p-3 rounded-lg text-[10px] font-mono text-zinc-600 outline-none resize-none"></textarea>
                    <button class="w-full py-2 bg-white border border-zinc-200 text-zinc-900 text-xs font-bold rounded-md hover:bg-zinc-50 shadow-sm" @click="copyLink(embedCode)">Copy Embed iFrame</button>
                 </div>
              </div>
           </div>
        </section>
      </div>

    </div>
  </div>

  <Teleport to="body">
    <AppConfirmationModal
      :is-open="!!mediaToDelete"
      title="Remove File?"
      message="This will permanently delete the file. You can upload a new one afterwards."
      confirm-text="Remove"
      :is-dangerous="true"
      :loading="deletingMedia"
      @confirm="confirmDeleteMedia"
      @cancel="mediaToDelete = null"
    />

    <Transition name="toast">
      <div v-if="toast" :class="['fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold whitespace-nowrap', toast.type === 'success' ? 'bg-zinc-950 text-white' : 'bg-red-600 text-white']">
        <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :class="toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/20 text-white'">
          <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        {{ toast.message }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { definePageMeta, useSeoMeta, useSupabaseClient, useRoute, navigateTo } from '#imports'
import { usePlanStore } from '~/stores/plan'
import { useApiFetch } from '~/composables/useApiFetch'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Edit Space | Viewora' })

const route = useRoute()
const spaceId = route.params.id as string
const { apiFetch } = useApiFetch()
const supabase = useSupabaseClient()
const planStore = usePlanStore()

const space = ref<any>(null)
const media = ref<any[]>([])
const activeTab = ref('details')
const saving = ref(false)
const publishing = ref(false)
const mediaToDelete = ref<string | null>(null)
const deletingMedia = ref(false)

const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}

const detailsForm = ref({
  title: '',
  description: '',
  slug: ''
})

const publicUrl = computed(() => {
  const base = window.location.origin
  return `${base}/p/${space.value?.slug || space.value?.id}`
})

const embedCode = computed(() => {
  const base = window.location.origin
  return `<iframe src="${base}/embed/${space.value?.slug || space.value?.id}" width="100%" height="600px" frameborder="0" allowfullscreen></iframe>`
})

const galleryMedia = computed(() => media.value.filter(m => m.media_type === 'gallery_image'))
const panorama = computed(() => media.value.find(m => m.media_type === 'panorama'))

onMounted(async () => {
  await fetchSpace()
})

async function copyLink(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast('Copied to clipboard')
  } catch (err) {
    showToast('Failed to copy', 'error')
  }
}

async function downloadQR(format: 'png' | 'svg' = 'png') {
  if (format === 'svg' && !planStore.entitlements?.qr_svg_enabled) {
    showToast('SVG download is available on the Plus plan and above.', 'error')
    return
  }
  const size = format === 'svg' ? '1000x1000' : '500x500'
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}&format=${format}&data=${encodeURIComponent(publicUrl.value + '?src=qr')}`
  
  try {
    const response = await fetch(qrUrl)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `viewora-qr-${space.value?.slug || 'space'}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (err) {
    window.open(qrUrl, '_blank')
  }
}

async function fetchSpace() {
  if (!planStore.plan) {
    await planStore.fetchSubscriptionStatus()
  }

  try {
    const data = await apiFetch<any>(`/spaces/${spaceId}`)
    space.value = data
    detailsForm.value = {
      title: data.title,
      description: data.description || '',
      slug: data.slug || ''
    }
    media.value = data.property_media || []
  } catch (e: any) {
    showToast('Failed to load space data', 'error')
  }
}

async function handleUpdateDetails() {
  saving.value = true
  try {
    const updated = await apiFetch<any>(`/spaces/${spaceId}`, {
      method: 'PATCH',
      body: detailsForm.value
    })
    space.value = updated
    showToast('Details saved')
  } catch (e) {
    showToast('Failed to save details', 'error')
  } finally {
    saving.value = false
  }
}

async function handleToggleFeature(feature: string) {
  try {
    const newVal = !space.value[feature]
    const updated = await apiFetch<any>(`/spaces/${spaceId}`, {
      method: 'PATCH',
      body: { [feature]: newVal }
    })
    space.value = updated
  } catch (e: any) {
    showToast(e.data?.statusMessage || 'Failed to update setting', 'error')
  }
}

async function handleTogglePublish() {
  publishing.value = true
  try {
    const isLive = space.value.is_published
    const updated = await apiFetch<any>(`/spaces/${spaceId}/publish`, {
      method: 'POST',
      body: {
        publish: !isLive,
        slug: detailsForm.value.slug,
        lead_form_enabled: space.value.lead_form_enabled,
        branding_enabled: space.value.branding_enabled
      }
    })
    space.value = updated
    showToast(isLive ? 'Space unpublished' : 'Space is now live')
  } catch (e: any) {
    showToast(e.data?.statusMessage || 'Publishing failed', 'error')
  } finally {
    publishing.value = false
  }
}

async function handleGalleryUpload(e: any) {
  const files = e.target.files as FileList
  if (!files.length) return

  for (const file of Array.from(files)) {
    await uploadFile(file, 'gallery')
  }
}

async function handlePanoramaUpload(e: any) {
  const file = e.target.files[0] as File
  if (!file) return
  await uploadFile(file, 'panorama')
}

async function uploadFile(file: File, type: string) {
  try {
    const { signedUrl, objectKey, publicUrl } = await apiFetch<any>('/uploads/create-signed-url', {
      method: 'POST',
      body: {
        spaceId: spaceId,
        mediaType: type,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size
      }
    })

    await $fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    })

    const record = await apiFetch<any>('/uploads/complete', {
      method: 'POST',
      body: {
        spaceId: spaceId,
        mediaType: type,
        objectKey,
        publicUrl,
        fileSize: file.size
      }
    })
    
    media.value.push(record)
  } catch (err: any) {
    showToast(`Failed to upload ${file.name}: ${err.data?.statusMessage || err.message}`, 'error')
  }
}

function handleDeleteMedia(id: string) {
  mediaToDelete.value = id
}

async function confirmDeleteMedia() {
  if (!mediaToDelete.value) return
  deletingMedia.value = true
  try {
    await apiFetch(`/uploads/${mediaToDelete.value}`, { method: 'DELETE' })
    media.value = media.value.filter(m => m.id !== mediaToDelete.value)
    mediaToDelete.value = null
    showToast('Media deleted')
  } catch (err: any) {
    showToast(`Failed to delete media: ${err.data?.statusMessage || err.message}`, 'error')
  } finally {
    deletingMedia.value = false
  }
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }
</style>
