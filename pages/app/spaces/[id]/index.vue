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

      <Transition name="fade-smooth">
        <div
          v-if="hasProcessingMedia"
          class="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border"
          :class="isProcessingStuck ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-sky-50 border-sky-200 text-sky-800'"
        >
          <div class="flex items-center gap-2 text-sm font-medium">
            <div class="w-3.5 h-3.5 border-2 rounded-full animate-spin" :class="isProcessingStuck ? 'border-amber-300 border-t-amber-700' : 'border-sky-300 border-t-sky-700'"></div>
            <span v-if="isProcessingStuck">Processing is taking longer than expected. You can keep working while we finish in the background.</span>
            <span v-else>Media processing is in progress in the background.</span>
          </div>
          <span class="text-xs font-semibold">{{ processingElapsedSeconds }}s</span>
        </div>
      </Transition>


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
      <div v-if="activeTab === 'gallery'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <header class="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
           <div class="space-y-1">
             <h3 class="text-xl font-black tracking-tight text-zinc-950">Property Gallery</h3>
             <p class="text-sm text-zinc-500 font-medium">Manage the cinematic 2D photography for your public tour carousel.</p>
           </div>
           <div class="flex items-center gap-3">
             <Transition name="fade-smooth">
               <div
                 v-if="showFirstUploadHint"
                 class="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-pulse"
               >
                 Start here: upload your first photo
               </div>
             </Transition>
             <label class="cursor-pointer inline-flex items-center justify-center gap-3 px-8 py-4 bg-zinc-950 text-white text-sm font-black rounded-2xl hover:bg-zinc-800 shadow-xl shadow-zinc-950/20 transition-all active:scale-95 group">
               <input type="file" multiple accept="image/*" class="hidden" @change="handleGalleryUpload" />
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="group-hover:rotate-90 transition-transform duration-300"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
               Upload High-Res Photos
             </label>
           </div>
        </header>

        <div v-if="galleryLocalUploads.length" class="space-y-3">
          <div class="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
            <p class="text-xs font-semibold text-zinc-700">Uploading {{ galleryLocalUploads.length }} file{{ galleryLocalUploads.length > 1 ? 's' : '' }}</p>
            <p class="text-xs text-zinc-500">{{ uploadSummaryText }}</p>
          </div>
          <TransitionGroup name="toast" tag="div" class="space-y-3">
          <div
            v-for="item in galleryLocalUploads"
            :key="item.id"
            class="p-4 bg-white border border-zinc-200 rounded-xl"
          >
            <div class="flex items-center justify-between gap-4 mb-2">
              <p class="text-sm font-semibold text-zinc-900 truncate">{{ item.fileName }}</p>
              <span class="text-xs font-medium text-zinc-500">{{ localStateLabel(item.state) }}</span>
            </div>
            <div class="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                :class="item.state === 'uploading' ? 'bg-zinc-900 w-1/2 animate-pulse' : item.state === 'registering' || item.state === 'signing' ? 'bg-zinc-700 w-3/4 animate-pulse' : item.state === 'failed' ? 'bg-rose-500 w-full' : 'bg-zinc-400 w-full'"
              ></div>
            </div>
            <p v-if="item.error" class="text-xs text-rose-600 mt-2">{{ item.error }}</p>
          </div>
          </TransitionGroup>
        </div>

        <div v-if="galleryMedia.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <div 
             v-for="(img, idx) in galleryMedia" 
             :key="img.id" 
             class="group relative aspect-[4/3] bg-zinc-100 rounded-[2rem] overflow-hidden border border-zinc-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 animate-in fade-in"
             :class="completionRingClass(img.id)"
             :style="{ animationDelay: `${idx * 50}ms` }"
           >
              <img :src="img.public_url" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
              <div class="absolute top-4 left-4 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider" :class="statusBadgeClass(img.processing_status)">
                {{ statusLabel(img.processing_status) }}
              </div>
              <div v-if="completionFxMap[img.id]" class="absolute top-4 right-4 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg success-pulse transition-opacity duration-500" :class="completionFxMap[img.id] === 'exit' ? 'opacity-0' : 'opacity-100'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              
              <!-- Premium Overlay -->
              <div class="absolute inset-0 bg-zinc-950/20 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px] flex items-center justify-center gap-4">
                 <button 
                   class="w-12 h-12 bg-white text-zinc-950 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300"
                   @click="previewImage = img"
                   title="Preview Image"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                 </button>
                 <button 
                   class="w-12 h-12 bg-rose-500 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300" 
                   @click="handleDeleteMedia(img.id)"
                   title="Delete Image"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                 </button>
                 <button
                   v-if="img.processing_status === 'failed'"
                   class="px-4 h-12 bg-amber-500 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300 text-xs font-bold"
                   :disabled="Boolean(retryingMediaMap[img.id])"
                   @click="handleRetryMedia(img.id)"
                   title="Retry Processing"
                 >
                   {{ retryingMediaMap[img.id] ? 'Retrying...' : 'Retry' }}
                 </button>
              </div>

              <!-- Identification Tag -->
              <div class="absolute bottom-6 left-6 px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-900 border border-white/20 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-100 shadow-sm">
                 IMG-{{ img.id.slice(0, 4) }}
              </div>
           </div>
        </div>
        
        <div v-else class="p-20 bg-white border-2 border-dashed border-zinc-200 rounded-[3rem] flex flex-col items-center justify-center text-center group hover:border-zinc-400 transition-colors">
           <div class="w-24 h-24 bg-zinc-50 text-zinc-200 rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
           </div>
           <h4 class="text-xl font-black text-zinc-950 mb-2">Awaiting Visuals</h4>
           <p class="text-sm text-zinc-500 max-w-xs mx-auto font-medium">
             Upload high-quality interior and exterior photos to populate the property carousel.
           </p>
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
              <div class="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider" :class="statusBadgeClass(panorama.processing_status)">
                {{ statusLabel(panorama.processing_status) }}
              </div>
              <div v-if="completionFxMap[panorama.id]" class="absolute top-3 right-3 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg success-pulse transition-opacity duration-500" :class="completionFxMap[panorama.id] === 'exit' ? 'opacity-0' : 'opacity-100'">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="absolute inset-0 flex items-center justify-center">
                 <button class="px-4 py-2 bg-white text-zinc-900 text-sm font-medium rounded-lg shadow-xl hover:bg-zinc-50 transition-colors" @click="confirmDeleteMedia(panorama.id)">Remove Panorama</button>
              </div>
           </div>
           <div v-if="panorama?.processing_status === 'failed'" class="mt-3 flex items-center gap-3">
             <p class="text-xs text-rose-600">Panorama processing failed.</p>
             <button
               class="px-3 py-1.5 rounded-md bg-amber-500 text-white text-xs font-semibold"
               :disabled="Boolean(retryingMediaMap[panorama.id])"
               @click="handleRetryMedia(panorama.id)"
             >
               {{ retryingMediaMap[panorama.id] ? 'Retrying...' : 'Retry processing' }}
             </button>
           </div>
           <div v-if="panoramaLocalUploads.length" class="mt-3 space-y-2">
             <div v-for="item in panoramaLocalUploads" :key="item.id" class="p-3 bg-zinc-50 rounded-md border border-zinc-200">
               <div class="flex items-center justify-between mb-2">
                 <p class="text-xs font-semibold text-zinc-800 truncate">{{ item.fileName }}</p>
                 <span class="text-[11px] text-zinc-500">{{ localStateLabel(item.state) }}</span>
               </div>
               <div class="h-2 bg-zinc-200 rounded-full overflow-hidden">
                 <div class="h-full rounded-full" :class="item.state === 'uploading' ? 'bg-zinc-900 w-1/2 animate-pulse' : item.state === 'registering' || item.state === 'signing' ? 'bg-zinc-700 w-3/4 animate-pulse' : item.state === 'failed' ? 'bg-rose-500 w-full' : 'bg-zinc-400 w-full'"></div>
               </div>
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

    <!-- Image Preview Lightbox -->
    <Teleport to="body">
      <Transition name="modal-in">
        <div v-if="previewImage" class="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-12">
           <div class="absolute inset-0 bg-zinc-950/90 backdrop-blur-xl" @click="previewImage = null"></div>
           
           <button 
             class="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-center transition-all duration-300 z-10 backdrop-blur-md"
             @click="previewImage = null"
           >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
           </button>

           <div class="relative w-full h-full flex items-center justify-center animate-modal-in pointer-events-none">
              <img 
                :src="previewImage.public_url" 
                class="max-w-full max-h-full object-contain rounded-3xl shadow-2xl pointer-events-auto shadow-white/5" 
                @click.stop
              />
              
              <!-- Image Metadata Bar -->
              <div class="absolute bottom-0 left-1/2 -translate-x-1/2 p-6 w-full max-w-xl flex items-center justify-center pointer-events-auto">
                 <div class="bg-white/10 backdrop-blur-xl border border-white/20 px-8 py-4 rounded-3xl flex items-center gap-8 shadow-2xl">
                    <div class="flex flex-col">
                       <span class="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Dimensions</span>
                       <span class="text-sm font-bold text-white">{{ previewImage.width || '?' }} x {{ previewImage.height || '?' }}</span>
                    </div>
                    <div class="w-px h-8 bg-white/10"></div>
                    <div class="flex flex-col">
                       <span class="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">File Size</span>
                       <span class="text-sm font-bold text-white">{{ (previewImage.file_size_bytes / 1024 / 1024).toFixed(2) }} MB</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade-smooth">
        <div
          v-if="toast"
          class="fixed bottom-6 right-6 z-[400] px-4 py-3 rounded-xl border shadow-xl max-w-sm"
          :class="toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'"
        >
          <div class="flex items-start gap-2">
            <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="mt-0.5"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p class="text-sm font-medium">{{ toast.message }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
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
const deletingMedia = ref(false)
const previewImage = ref<any>(null)
const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
const heartbeatTimer = ref<ReturnType<typeof setInterval> | null>(null)
const retryingMediaMap = ref<Record<string, boolean>>({})
const completionFxMap = ref<Record<string, 'enter' | 'exit'>>({})
const processingStartedAt = ref<number | null>(null)
const nowTick = ref(Date.now())

type LocalUploadState = 'local_select' | 'signing' | 'uploading' | 'registering' | 'failed'
type LocalUploadItem = {
  id: string
  mediaType: string
  fileName: string
  state: LocalUploadState
  error?: string
}
const localUploads = ref<LocalUploadItem[]>([])

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
const galleryLocalUploads = computed(() => localUploads.value.filter((u) => u.mediaType === 'gallery'))
const panoramaLocalUploads = computed(() => localUploads.value.filter((u) => u.mediaType === 'panorama'))
const hasProcessingMedia = computed(() => media.value.some((m) => m.processing_status === 'pending' || m.processing_status === 'processing'))
const showFirstUploadHint = computed(() => media.value.length === 0 && localUploads.value.length === 0 && activeTab.value === 'gallery')
const processingElapsedSeconds = computed(() => processingStartedAt.value ? Math.floor((nowTick.value - processingStartedAt.value) / 1000) : 0)
const isProcessingStuck = computed(() => hasProcessingMedia.value && processingElapsedSeconds.value > 45)
const uploadSummaryText = computed(() => {
  const uploading = localUploads.value.filter((u) => u.state === 'uploading').length
  const signing = localUploads.value.filter((u) => u.state === 'signing').length
  const registering = localUploads.value.filter((u) => u.state === 'registering').length
  const failed = localUploads.value.filter((u) => u.state === 'failed').length
  if (failed > 0) return `${failed} failed, ${uploading + signing + registering} active`
  if (registering > 0) return `Finalizing ${registering}`
  if (uploading > 0) return `Uploading ${uploading}`
  if (signing > 0) return `Preparing ${signing}`
  return 'In progress'
})

function unwrapApiData<T = any>(value: any): T {
  if (value && typeof value === 'object' && 'data' in value && value.data !== undefined) {
    return value.data as T
  }
  if (value && typeof value === 'object' && 'result' in value && value.result !== undefined) {
    return value.result as T
  }
  return value as T
}

watch(hasProcessingMedia, (isProcessing) => {
  if (isProcessing) {
    startPolling()
    if (!processingStartedAt.value) {
      processingStartedAt.value = Date.now()
    }
  } else {
    stopPolling()
    processingStartedAt.value = null
  }
}, { immediate: true })

onMounted(async () => {
  await fetchSpace(true)
  heartbeatTimer.value = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  stopPolling()
  if (heartbeatTimer.value) {
    clearInterval(heartbeatTimer.value)
    heartbeatTimer.value = null
  }
})

function localStateLabel(state: LocalUploadState) {
  if (state === 'local_select') return 'Selected'
  if (state === 'signing') return 'Signing...'
  if (state === 'uploading') return 'Uploading...'
  if (state === 'registering') return 'Registering...'
  return 'Failed'
}

function statusLabel(status?: string) {
  if (status === 'pending') return 'Queued'
  if (status === 'processing') return 'Processing'
  if (status === 'failed') return 'Failed'
  return 'Ready'
}

function statusBadgeClass(status?: string) {
  if (status === 'pending') return 'bg-amber-100 text-amber-700 border border-amber-200'
  if (status === 'processing') return 'bg-sky-100 text-sky-700 border border-sky-200'
  if (status === 'failed') return 'bg-rose-100 text-rose-700 border border-rose-200'
  return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
}

function startPolling() {
  if (pollingTimer.value) return
  pollingTimer.value = setInterval(async () => {
    await fetchSpace(true)
  }, 3000)
}

function stopPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

function createLocalUpload(file: File, mediaType: string): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  localUploads.value.push({
    id,
    mediaType,
    fileName: file.name,
    state: 'local_select',
  })
  return id
}

function updateLocalUpload(id: string, patch: Partial<LocalUploadItem>) {
  const idx = localUploads.value.findIndex((u) => u.id === id)
  if (idx === -1) return
  localUploads.value[idx] = { ...localUploads.value[idx], ...patch }
}

function removeLocalUpload(id: string) {
  localUploads.value = localUploads.value.filter((u) => u.id !== id)
}

function extractUploadErrorMessage(err: any, fileName: string) {
  const message = String(err?.data?.message || err?.data?.statusMessage || err?.message || '').toLowerCase()
  const status = Number(err?.statusCode || err?.status || err?.response?.status || 0)

  if (status === 413 || message.includes('file too large')) {
    return `Upload failed for ${fileName}. File is too large for your plan.`
  }
  if (status === 429 || message.includes('rate')) {
    return `Too many upload requests. Please wait a few seconds and try again.`
  }
  if (message.includes('storage limit')) {
    return 'Upload failed. Storage limit reached. Please free up space or upgrade your plan.'
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return `Network issue while uploading ${fileName}. Check your connection and retry.`
  }
  if (message.includes('unauthorized')) {
    return 'Upload failed due to permission mismatch. Refresh and try again.'
  }
  return `Upload failed for ${fileName}. Try again.`
}

function markRecentlyCompleted(mediaId: string) {
  // Small delay makes completion feel intentional instead of mechanical.
  setTimeout(() => {
    completionFxMap.value = { ...completionFxMap.value, [mediaId]: 'enter' }
    setTimeout(() => {
      completionFxMap.value = { ...completionFxMap.value, [mediaId]: 'exit' }
      setTimeout(() => {
        const next = { ...completionFxMap.value }
        delete next[mediaId]
        completionFxMap.value = next
      }, 500)
    }, 1700)
  }, 150)
}

function completionRingClass(mediaId: string) {
  if (!completionFxMap.value[mediaId]) return ''
  return completionFxMap.value[mediaId] === 'exit'
    ? 'ring-2 ring-emerald-200 ring-offset-2 transition-all duration-500 opacity-80'
    : 'ring-2 ring-emerald-300 ring-offset-2 transition-all duration-300 success-pulse'
}

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

async function fetchSpace(silent = false) {
  if (!planStore.plan) {
    await planStore.fetchSubscriptionStatus()
  }

  try {
    const previousStatusById = new Map(media.value.map((m: any) => [m.id, m.processing_status]))
    const data = await apiFetch<any>(`/spaces/${spaceId}`)
    space.value = data
    detailsForm.value = {
      title: data.title,
      description: data.description || '',
      slug: data.slug || ''
    }
    media.value = data.property_media || []

    for (const item of media.value) {
      const prev = previousStatusById.get(item.id)
      if ((prev === 'pending' || prev === 'processing') && item.processing_status === 'complete') {
        markRecentlyCompleted(item.id)
      }
    }
  } catch (e: any) {
    if (!silent) {
      showToast('Failed to load space data', 'error')
    }
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
  const localId = createLocalUpload(file, type)
  try {
    updateLocalUpload(localId, { state: 'signing' })

    const signedPayload = unwrapApiData<any>(await apiFetch<any>('/uploads/create-signed-url', {
      method: 'POST',
      body: {
        spaceId: spaceId,
        mediaType: type,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size
      }
    }))

    const signedUrl = signedPayload?.signedUrl
    const objectKey = signedPayload?.objectKey
    const publicUrl = signedPayload?.publicUrl

    if (!signedUrl || typeof signedUrl !== 'string' || !signedUrl.startsWith('http')) {
      throw new Error('Upload signing failed: invalid signed URL returned by server')
    }
    if (!objectKey || !publicUrl) {
      throw new Error('Upload signing failed: missing upload metadata from server')
    }

    updateLocalUpload(localId, { state: 'uploading' })

    await $fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    })

    updateLocalUpload(localId, { state: 'registering' })

    const record = unwrapApiData<any>(await apiFetch<any>('/uploads/complete', {
      method: 'POST',
      body: {
        spaceId: spaceId,
        mediaType: type,
        objectKey,
        publicUrl,
        fileSize: file.size
      }
    }))
    
    media.value.push(record)
    removeLocalUpload(localId)
    if (record.processing_status === 'pending' || record.processing_status === 'processing') {
      startPolling()
    } else if (record.processing_status === 'complete') {
      markRecentlyCompleted(record.id)
      showToast(`Upload complete: ${file.name}`)
    }
  } catch (err: any) {
    const humanError = extractUploadErrorMessage(err, file.name)
    updateLocalUpload(localId, {
      state: 'failed',
      error: humanError,
    })
    showToast(humanError, 'error')
  }
}

async function handleRetryMedia(mediaId: string) {
  retryingMediaMap.value = { ...retryingMediaMap.value, [mediaId]: true }
  try {
    await apiFetch(`/uploads/${mediaId}/retry-processing`, { method: 'POST' })
    media.value = media.value.map((m) => m.id === mediaId ? { ...m, processing_status: 'pending' } : m)
    startPolling()
    showToast('Retry queued')
  } catch (err: any) {
    showToast(`Retry failed. ${extractUploadErrorMessage(err, 'media')}`, 'error')
  } finally {
    retryingMediaMap.value = { ...retryingMediaMap.value, [mediaId]: false }
  }
}

async function confirmDeleteMedia(mediaId: string) {
  deletingMedia.value = true
  try {
    await apiFetch(`/uploads/${mediaId}`, { method: 'DELETE' })
    media.value = media.value.filter(m => m.id !== mediaId)
    if (previewImage.value?.id === mediaId) {
      previewImage.value = null
    }
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
.fade-smooth-enter-active, .fade-smooth-leave-active { transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
.fade-smooth-enter-from, .fade-smooth-leave-to { opacity: 0; transform: translateY(6px) scale(0.995); }
.success-pulse { animation: successPulse 600ms ease-out; }
@keyframes successPulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
</style>
