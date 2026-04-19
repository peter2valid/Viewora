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
        v-for="tab in editorTabs" 
        :key="tab.id" 
        class="flex items-center py-3 border-b-2 text-sm font-medium transition-all relative whitespace-nowrap group"
        :class="[
          activeTab === tab.id ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500',
          tab.disabled ? 'opacity-45 cursor-not-allowed' : 'hover:text-zinc-700'
        ]"
        :disabled="tab.disabled"
        :title="tab.disabled ? 'Add at least one 360 panorama to unlock sharing.' : ''"
        @click="selectTab(tab.id, tab.disabled)"
      >
        {{ tab.label }}
        <span v-if="tab.disabled" class="ml-2 text-[10px] font-bold uppercase tracking-wider">Locked</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="flex-1">
      <div v-if="postPublishPrompt" class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-emerald-800">Your tour is now live</p>
          <p class="text-xs text-emerald-700 mt-0.5">Share it now to start getting client interest.</p>
        </div>
        <button class="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors" @click="activeTab = 'share'; postPublishPrompt = false">
          Share Live Tour
        </button>
      </div>

      <div class="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3 mb-3">
          <p class="text-sm font-semibold text-zinc-900">Tour Setup Progress</p>
          <p class="text-xs font-medium text-zinc-500">{{ completedSetupSteps }}/{{ setupSteps.length }} done</p>
        </div>
        <div class="w-full h-2 rounded-full bg-zinc-100 overflow-hidden mb-4">
          <div class="h-full bg-zinc-900 transition-all duration-500" :style="{ width: `${setupProgressPercent}%` }"></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div
            v-for="step in setupSteps"
            :key="step.id"
            class="px-3 py-2 rounded-lg border text-xs font-medium"
            :class="step.done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600'"
          >
            <span class="font-bold mr-1">{{ step.done ? '[✓]' : '[ ]' }}</span>{{ step.label }}
          </div>
        </div>
      </div>

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

      <div v-if="activeTab === '360'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <div class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p class="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Views</p>
          <p class="mt-2 text-2xl font-bold text-zinc-950">{{ analyticsMetrics.totalViews }}</p>
          <p class="text-xs text-zinc-500 mt-1">Tracked on the live tour</p>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p class="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Leads</p>
          <p class="mt-2 text-2xl font-bold text-zinc-950">{{ analyticsMetrics.totalLeads }}</p>
          <p class="text-xs text-zinc-500 mt-1">Request form submissions</p>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p class="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">WhatsApp Shares</p>
          <p class="mt-2 text-2xl font-bold text-zinc-950">{{ analyticsMetrics.whatsappViews }}</p>
          <p class="text-xs text-zinc-500 mt-1">Sent directly from the tour</p>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p class="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">QR Opens</p>
          <p class="mt-2 text-2xl font-bold text-zinc-950">{{ analyticsMetrics.qrViews }}</p>
          <p class="text-xs text-zinc-500 mt-1">Shared through QR code</p>
        </div>
      </div>


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
             <h3 class="text-xl font-black tracking-tight text-zinc-950">Property Photos</h3>
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
                   @click="confirmDeleteMedia(img.id)"
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
            <div class="relative w-full max-w-lg aspect-[16/8] rounded-3xl overflow-hidden mb-8 border border-zinc-200 bg-gradient-to-br from-zinc-100 via-white to-zinc-100">
              <div class="absolute inset-0 bg-gradient-to-t from-zinc-900/25 via-transparent to-transparent"></div>
              <div class="absolute top-4 left-4 px-2 py-1 rounded-md bg-white/90 text-[10px] font-bold text-zinc-700 border border-zinc-200">Sample Tour Flow</div>
              <div class="absolute bottom-4 left-4 flex gap-2">
               <span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-white/90 border border-zinc-200 text-zinc-700">Living Room</span>
               <span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-white/90 border border-zinc-200 text-zinc-700">Kitchen</span>
               <span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-zinc-900 text-white">+ Hotspot</span>
              </div>
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
           <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <div>
                <h3 class="text-base font-semibold text-zinc-900">360 Tour Builder</h3>
                <p class="text-sm text-zinc-500 mt-0.5">Your viewer is always live. Upload or replace panoramas anytime.</p>
              </div>
              <label class="cursor-pointer w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-white text-sm font-semibold rounded-xl transition-all shadow-sm group" :class="!hasPanorama ? 'bg-zinc-950 animate-pulse ring-4 ring-zinc-900/20 hover:animate-none' : 'bg-zinc-900 hover:bg-zinc-800'">
                <input type="file" accept="image/*" class="hidden" @change="handlePanoramaUpload" />
                <svg v-if="!hasPanorama" class="w-4 h-4 shadow-sm" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload 360 Image to Start Tour
              </label>
           </div>

           <div v-if="panoramaSaveState" class="mb-3 px-3 py-2 rounded-lg border text-xs font-semibold" :class="panoramaSaveState === 'saving' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'">
             {{ panoramaSaveState === 'saving' ? 'Uploading 360 image... Optimizing for fast loading.' : 'Saved 360 image ✅' }}
           </div>

           <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4 mb-3">
             <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
               <div>
                 <p class="text-sm font-semibold text-zinc-900">Inline Hotspot Editor</p>
                 <p class="text-xs text-zinc-500 mt-0.5">No page switch: turn on edit mode, then click inside the viewer to place hotspots.</p>
               </div>
               <button
                 class="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold border transition-colors"
                 :class="inlineEditMode ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'"
                 :disabled="!hasPanorama"
                 @click="inlineEditMode = !inlineEditMode"
               >
                 {{ inlineEditMode ? 'Editing On (Click Viewer)' : 'Enable Edit Mode' }}
               </button>
             </div>

             <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
               <div class="space-y-1">
                 <label class="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Hotspot Type</label>
                 <select v-model="hotspotDraftType" class="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" :disabled="!hasPanorama">
                   <option value="info">Info</option>
                   <option value="scene_link">Scene Link</option>
                   <option value="url">External URL</option>
                 </select>
               </div>
               <div class="space-y-1 md:col-span-2" v-if="hotspotDraftType === 'scene_link'">
                 <label class="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Link To Scene</label>
                 <select v-model="hotspotTargetSceneId" class="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" :disabled="!hasPanorama || sceneChips.length < 2">
                   <option value="">Auto choose next scene</option>
                   <option v-for="scene in sceneChips" :key="scene.id" :value="scene.id">{{ scene.label }}</option>
                 </select>
               </div>
             </div>
           </div>

              <div class="relative rounded-lg overflow-hidden border border-zinc-200 aspect-[2/1] bg-zinc-900">

                <!-- Real 360 viewer — hotspot positions are perspective-correct -->
                <ClientOnly v-if="hasPanorama && activePanoramaSrc">
                  <ViewerView360Viewer
                    class="absolute inset-0 w-full h-full"
                    :image-url="activePanoramaSrc"
                    :hotspots="activeSceneHotspots"
                    :is-editing="inlineEditMode"
                    @add-hotspot="handleViewerAddHotspot"
                    @hotspot-click="handleHotspotClick"
                    @remove-hotspot="handleViewerRemoveHotspot"
                  />
                  <template #fallback>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <div class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                  </template>
                </ClientOnly>

                <!-- Placeholder shown before any panorama is uploaded -->
                <div v-if="!hasPanorama" class="absolute inset-0">
                  <img :src="placeholderPanoramaUrl" class="w-full h-full object-cover opacity-85" />
                  <div class="absolute inset-0 bg-gradient-to-br from-zinc-950/30 via-transparent to-zinc-950/40"></div>
                  <div class="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/90 text-[11px] font-semibold text-zinc-800 border border-zinc-200">
                    Demo preview loaded
                  </div>
                </div>

                <!-- Processing status badge -->
                <div class="absolute top-3 left-3 z-10 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider" :class="statusBadgeClass(panorama?.processing_status)">
                  {{ panoramaStatusLabel }}
                </div>

                <!-- Completion FX badge -->
                <div v-if="panorama && completionFxMap[panorama.id]" class="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg success-pulse transition-opacity duration-500" :class="completionFxMap[panorama.id] === 'exit' ? 'opacity-0' : 'opacity-100'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>

                <!-- Remove Panorama — floats above the viewer -->
                <div v-if="hasPanorama" class="absolute bottom-3 inset-x-0 flex justify-center z-10 pointer-events-none">
                  <button
                    class="pointer-events-auto px-4 py-2 bg-white/90 backdrop-blur-sm text-zinc-900 text-sm font-medium rounded-lg shadow-xl hover:bg-white transition-colors"
                    @click.stop="confirmDeleteMedia(panorama!.id)"
                  >
                    Remove Panorama
                  </button>
                </div>

                <!-- Empty state guide -->
                <div v-if="!hasPanorama" class="absolute inset-x-0 bottom-0 p-5 z-10">
                  <div class="rounded-xl border border-white/15 bg-black/35 backdrop-blur-sm p-4 text-white">
                    <p class="text-sm font-semibold">Step 1: Upload your first 360 image</p>
                    <p class="text-xs text-white/75 mt-1">Choose a high-resolution equirectangular panorama (2:1) to start your interactive tour instantly.</p>
                  </div>
                </div>
              </div>

             <div v-if="showHotspotPrompt" class="rounded-xl border-2 border-sky-400 bg-sky-50 px-5 py-4 shadow-md animate-pulse">
               <div class="flex items-start gap-3">
                 <div class="w-8 h-8 rounded-full bg-sky-200 flex flex-shrink-0 items-center justify-center text-sky-700">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                 </div>
                 <div>
                   <p class="text-sm font-bold text-sky-900">Next step: Start adding hotspots</p>
                   <p class="text-xs text-sky-800 mt-1 font-medium">Edit mode is already on. Click anywhere inside the viewer to place your first hotspot.</p>
                 </div>
               </div>
             </div>

             <Transition name="fade-smooth">
               <div v-if="editingHotspotId" class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                 <div class="flex items-center justify-between gap-3 mb-3">
                   <div>
                     <p class="text-sm font-semibold text-zinc-900">Hotspot Edit Panel</p>
                     <p class="text-xs text-zinc-500 mt-0.5">Update the label, type, and link target before saving.</p>
                   </div>
                   <button class="text-xs font-semibold text-zinc-500 hover:text-zinc-900" @click="closeHotspotEditor">Close</button>
                 </div>

                 <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <div class="space-y-1">
                     <label class="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Title</label>
                     <input v-model="hotspotEditForm.title" type="text" class="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" placeholder="Spot name" />
                   </div>
                   <div class="space-y-1">
                     <label class="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Type</label>
                     <select v-model="hotspotEditForm.type" class="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500">
                       <option value="info">Info</option>
                       <option value="scene_link">Scene Link</option>
                       <option value="url">External Link</option>
                     </select>
                   </div>
                 </div>

                 <div class="mt-3 space-y-1">
                   <label class="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Description</label>
                   <textarea v-model="hotspotEditForm.description" rows="3" class="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 resize-none" placeholder="Describe this point of interest..."></textarea>
                 </div>

                 <div v-if="hotspotEditForm.type === 'scene_link'" class="mt-3 space-y-1">
                   <label class="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Target Scene</label>
                   <select v-model="hotspotEditForm.targetSceneId" class="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500">
                     <option value="">Choose scene</option>
                     <option v-for="scene in sceneChips" :key="scene.id" :value="scene.id">{{ scene.label }}</option>
                   </select>
                 </div>

                 <div v-if="hotspotEditForm.type === 'url'" class="mt-3 space-y-1">
                   <label class="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Link</label>
                   <input v-model="hotspotEditForm.link" type="url" class="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" placeholder="https://" />
                 </div>

                 <div class="mt-4 flex flex-wrap gap-2">
                   <button class="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800" @click="saveHotspotEdits">Save</button>
                   <button class="px-4 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-700 text-xs font-semibold hover:bg-zinc-50" @click="deleteEditingHotspot">Delete</button>
                 </div>
               </div>
             </Transition>

           <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
             <div class="flex items-center justify-between gap-3 mb-3">
               <p class="text-sm font-semibold text-zinc-900">Scenes</p>
               <button
                 class="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
                   :disabled="!hasPanorama || addScenePending"
                 @click="handleAddScene"
               >
                   {{ addScenePending ? 'Adding...' : '+ Add Scene' }}
               </button>
             </div>
             <div v-if="sceneChips.length" class="flex flex-wrap gap-2">
               <button
                 v-for="scene in sceneChips"
                 :key="scene.id"
                 type="button"
                 class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                 :class="selectedSceneId === scene.id ? 'bg-zinc-900 text-white border-zinc-900' : scene.ready ? 'bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100' : 'bg-white text-zinc-500 border-zinc-200'"
                 @click="selectScene(scene.id)"
               >
                 {{ scene.label }}
               </button>
             </div>
             <p v-else class="text-xs text-zinc-500">Upload a panorama to create Scene 1, then keep adding rooms to build a full walkthrough.</p>
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
               <p v-if="item.state !== 'failed'" class="text-[11px] text-zinc-500 mt-2">Processing in background. Your preview is already live.</p>
             </div>
           </div>
        </section>
      </div>

      <!-- SHARE TAB -->
      <div v-if="activeTab === 'share'" class="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div v-if="!canShare" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm font-medium">
          Share unlocks after your first panorama is uploaded.
        </div>
        <section class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
           <div class="p-6 border-b border-zinc-100">
              <h3 class="text-base font-semibold text-zinc-900">Public Access</h3>
           </div>
           <div class="p-6 space-y-6">
              <div class="space-y-2">
                <label class="text-xs font-medium text-zinc-500 uppercase tracking-wider">Direct Link</label>
                <div class="flex gap-2">
                   <input readonly :value="publicUrl" class="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-sm font-mono text-zinc-600 outline-none" />
                   <button class="px-4 py-2 bg-white border border-zinc-200 text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!canShare" @click="copyLink(publicUrl)">Copy</button>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button class="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!canShare" @click="shareOnWhatsapp">
                    Share on WhatsApp
                  </button>
                  <a :href="publicUrl" target="_blank" class="px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none" :class="!canShare ? 'disabled' : ''">
                    Open Live Tour
                  </a>
                </div>
              </div>

              <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p class="text-xs font-semibold text-zinc-800">Lead Conversion Actions</p>
                <p class="text-xs text-zinc-600 mt-1">Turn on Lead Capture in Details and your live tour will include the request viewing form for client inquiries.</p>
                <button class="mt-2 px-3 py-1.5 rounded-md bg-white border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" @click="activeTab = 'details'">
                  Configure Lead Capture
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                 <div class="space-y-3">
                    <label class="text-xs font-medium text-zinc-500 uppercase tracking-wider">QR Code</label>
                    <div class="p-4 bg-zinc-50 rounded-lg flex flex-col items-center gap-4">
                       <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`" class="w-32 h-32 rounded shadow-sm border border-zinc-200" />
                        <button class="text-xs font-semibold text-zinc-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!canShare" @click="downloadQR('png')">Download PNG</button>
                    </div>
                 </div>
                 <div class="space-y-3">
                    <label class="text-xs font-medium text-zinc-500 uppercase tracking-wider">Embed Code</label>
                    <textarea readonly :value="embedCode" class="w-full h-32 bg-zinc-50 border border-zinc-200 p-3 rounded-lg text-[10px] font-mono text-zinc-600 outline-none resize-none"></textarea>
                      <button class="w-full py-2 bg-white border border-zinc-200 text-zinc-900 text-xs font-bold rounded-md hover:bg-zinc-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!canShare" @click="copyLink(embedCode)">Copy Embed iFrame</button>
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
import { definePageMeta, useSeoMeta, useSupabaseClient, useRoute } from '#imports'
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
const activeTab = ref((route.query.tab as string) || 'details')
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
const localPanoramaPreviewUrl = ref<string | null>(null)
const placeholderPanoramaUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800" viewBox="0 0 1600 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23111627"/><stop offset="55%" stop-color="%231f2a44"/><stop offset="100%" stop-color="%232a4365"/></linearGradient></defs><rect width="1600" height="800" fill="url(%23g)"/><circle cx="1220" cy="230" r="180" fill="rgba(255,255,255,0.08)"/><circle cx="360" cy="600" r="260" fill="rgba(255,255,255,0.06)"/><g fill="none" stroke="rgba(255,255,255,0.35)"><path d="M0 540h1600"/><path d="M0 480h1600"/></g><text x="120" y="170" fill="rgba(255,255,255,0.88)" font-family="Arial" font-size="48" font-weight="700">Viewora 360 Tour Preview</text><text x="120" y="235" fill="rgba(255,255,255,0.7)" font-family="Arial" font-size="28">Upload your panorama to replace this placeholder instantly.</text></svg>'
const showHotspotPrompt = ref(false)
const panoramaSaveState = ref<'saving' | 'saved' | null>(null)
const addScenePending = ref(false)
const addingHotspot = ref(false)
const deletingHotspotsMap = ref<Record<string, boolean>>({})
let ensureScenePromise: Promise<string | null> | null = null
const scenes = ref<any[]>([])
const selectedSceneId = ref('')
const hotspotsByScene = ref<Record<string, any[]>>({})
const inlineEditMode = ref(false)
const hotspotDraftType = ref<'info' | 'scene_link' | 'url'>('info')
const hotspotTargetSceneId = ref('')
const postPublishPrompt = ref(false)
const isSceneTransitioning = ref(false)
const editingHotspotId = ref<string | null>(null)
const editingHotspotSceneId = ref<string | null>(null)
const hotspotEditForm = ref({
  type: 'info' as 'info' | 'scene_link' | 'url',
  title: '',
  description: '',
  link: '',
  targetSceneId: '',
})
const analyticsSummary = ref<any[]>([])
const sceneRealtimeChannels = ref<any[]>([])
let sceneRealtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null

// ── Realtime sync guards ──────────────────────────────────────
// isMounted prevents late Supabase callbacks from scheduling work after the
// component has been torn down (removeChannel is async; callbacks can arrive
// in the gap between onBeforeUnmount and the server ACK'ing the unsubscribe).
let isMounted = false
// Version counter: each fetchScenes call stamps itself. When the response
// arrives, if the version no longer matches the current counter, a newer call
// has already superseded us and this response is discarded.
let fetchScenesVersion = 0
// AbortController: lets us cancel the in-flight XHR when a newer fetchScenes
// call starts, saving bandwidth and preventing out-of-order applies.
let fetchScenesController: AbortController | null = null

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
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/p/${space.value?.slug || space.value?.id}`
})

const embedCode = computed(() => {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `<iframe src="${base}/embed/${space.value?.slug || space.value?.id}" width="100%" height="600px" frameborder="0" allowfullscreen></iframe>`
})

const galleryMedia = computed(() => media.value.filter(m => m.media_type === 'gallery_image'))
const panorama = computed(() => media.value.find(m => m.media_type === 'panorama'))
const galleryLocalUploads = computed(() => localUploads.value.filter((u) => u.mediaType === 'gallery'))
const panoramaLocalUploads = computed(() => localUploads.value.filter((u) => u.mediaType === 'panorama'))
const hasPanorama = computed(() => Boolean(panorama.value || localPanoramaPreviewUrl.value))
const canShare = computed(() => Boolean(panorama.value))
const activeScene = computed(() => scenes.value.find((s) => s.id === selectedSceneId.value) || scenes.value[0] || null)
const activeSceneHotspots = computed(() => {
  if (!selectedSceneId.value) return []
  return hotspotsByScene.value[selectedSceneId.value] || []
})
const activePanoramaSrc = computed(() => {
  // Blob preview is only used when the active scene has NO real URL yet.
  // This prevents a mid-upload blob from hijacking other scenes' views.
  if (activeScene.value?.raw_image_url) return activeScene.value.raw_image_url
  if (localPanoramaPreviewUrl.value) return localPanoramaPreviewUrl.value
  if (panorama.value?.public_url) return panorama.value.public_url
  return placeholderPanoramaUrl
})
const panoramaStatusLabel = computed(() => {
  if (!panorama.value) return localPanoramaPreviewUrl.value ? 'Preview' : 'Placeholder'
  return statusLabel(panorama.value.processing_status)
})
const editorTabs = computed(() => [
  { id: 'details', label: 'Details', disabled: false },
  { id: 'gallery', label: 'Photos', disabled: false },
  { id: '360', label: '360 Tour Builder', disabled: false },
  { id: 'share', label: 'Share', disabled: !canShare.value }
])
const setupSteps = computed(() => [
  { id: 'create', label: 'Create Space', done: Boolean(space.value?.id) },
  { id: 'upload', label: 'Upload 360 Image', done: Boolean(panorama.value) },
  { id: 'hotspots', label: 'Add Hotspots', done: hotspotCount.value > 0 },
  { id: 'publish', label: 'Publish', done: Boolean(space.value?.is_published) }
])
const completedSetupSteps = computed(() => setupSteps.value.filter((s) => s.done).length)
const setupProgressPercent = computed(() => Math.round((completedSetupSteps.value / setupSteps.value.length) * 100))
const hotspotCount = computed(() => {
  if (Object.keys(hotspotsByScene.value).length > 0) {
    return Object.values(hotspotsByScene.value).reduce((sum: number, items: any) => sum + (Array.isArray(items) ? items.length : 0), 0)
  }
  const raw = space.value?.property_360_settings?.[0]?.hotspots_json
  if (Array.isArray(raw)) return raw.length
  if (raw && typeof raw === 'object') return Object.keys(raw).length
  return 0
})
const sceneChips = computed(() => {
  if (!hasPanorama.value || !scenes.value.length) return []
  return scenes.value
    .slice()
    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
    .map((s, idx) => ({ id: s.id, label: s.name || `Scene ${idx + 1}`, ready: s.status === 'ready' || Boolean(s.raw_image_url) }))
})
const analyticsMetrics = computed(() => {
  const totalViews = analyticsSummary.value.reduce((sum: number, item: any) => sum + Number(item.total_views || 0), 0)
  const totalLeads = analyticsSummary.value.reduce((sum: number, item: any) => sum + Number(item.leads_count || 0), 0)
  const whatsappViews = analyticsSummary.value.reduce((sum: number, item: any) => sum + Number(item.whatsapp_views || 0), 0)
  const qrViews = analyticsSummary.value.reduce((sum: number, item: any) => sum + Number(item.qr_views || 0), 0)
  return { totalViews, totalLeads, whatsappViews, qrViews }
})
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
  isMounted = true
  await fetchSpace(true)
  startSceneRealtime()
  heartbeatTimer.value = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  isMounted = false
  // Cancel any in-flight fetchScenes so its response can't apply to unmounted state
  fetchScenesController?.abort()
  fetchScenesController = null
  stopPolling()
  stopSceneRealtime()
  clearPanoramaPreview()
  if (heartbeatTimer.value) {
    clearInterval(heartbeatTimer.value)
    heartbeatTimer.value = null
  }
})

function selectTab(tabId: string, disabled = false) {
  if (disabled) {
    showToast('Upload your first 360 panorama to unlock sharing.', 'error')
    return
  }
  activeTab.value = tabId
}

function setPanoramaPreview(file: File) {
  clearPanoramaPreview()
  localPanoramaPreviewUrl.value = URL.createObjectURL(file)
  panoramaSaveState.value = 'saving'
}

function clearPanoramaPreview() {
  if (localPanoramaPreviewUrl.value) {
    URL.revokeObjectURL(localPanoramaPreviewUrl.value)
    localPanoramaPreviewUrl.value = null
  }
}

async function fetchScenes() {
  // Stamp this call's version. Any response that arrives after a newer call
  // has started will be discarded — prevents stale overwrites.
  const version = ++fetchScenesVersion

  // Cancel any previous in-flight fetchScenes to save bandwidth.
  fetchScenesController?.abort()
  fetchScenesController = new AbortController()
  const { signal } = fetchScenesController

  try {
    const result = await apiFetch<any>(`/spaces/${spaceId}/scenes`, { signal })

    // A newer call already completed — our data is stale, discard silently.
    if (version !== fetchScenesVersion) return

    const loadedScenes = unwrapApiData<any>(result)?.scenes || result?.scenes || []
    scenes.value = loadedScenes

    // Build hotspot map. For each scene:
    //   1. Prefer the bundled hotspots[] from the backend (no N+1).
    //   2. Merge back any _pending (optimistic) entries not yet in the DB —
    //      these are hotspots the user just added whose POST is still in flight
    //      or whose DB insert hasn't propagated to realtime yet.
    //   3. Fall back to individual fetch only when hotspots key is absent entirely.
    const newMap: Record<string, any[]> = {}
    for (const scene of loadedScenes) {
      if (Array.isArray(scene.hotspots)) {
        const dbHotspots: any[] = scene.hotspots
        // Re-attach pending entries not yet confirmed by the DB round-trip.
        const pending = (hotspotsByScene.value[scene.id] ?? []).filter((h: any) => h._pending === true)
        newMap[scene.id] = pending.length ? [...dbHotspots, ...pending] : dbHotspots
      } else if (hotspotsByScene.value[scene.id] !== undefined) {
        // Keep existing local state — don't regress to empty while waiting for DB.
        newMap[scene.id] = hotspotsByScene.value[scene.id]
      } else {
        // Fallback N+1 for scenes missing the hotspots bundle (should be rare).
        try {
          const hRes = await apiFetch<any>(`/scenes/${scene.id}/hotspots`, { signal })
          if (version !== fetchScenesVersion) return
          newMap[scene.id] = unwrapApiData<any>(hRes)?.hotspots ?? hRes?.hotspots ?? []
        } catch (err: any) {
          if (isAbortError(err)) return
          newMap[scene.id] = hotspotsByScene.value[scene.id] ?? []
        }
      }
    }

    hotspotsByScene.value = newMap
    fetchScenesController = null

    if (loadedScenes.length) {
      if (!selectedSceneId.value || !loadedScenes.some((s: any) => s.id === selectedSceneId.value)) {
        selectedSceneId.value = loadedScenes[0].id
      }
    } else {
      selectedSceneId.value = ''
    }
  } catch (err: any) {
    if (isAbortError(err)) return  // intentional cancellation — not an error
    scenes.value = []
  }
}

// ofetch wraps the native AbortError in a FetchError with cause; check both.
function isAbortError(err: any): boolean {
  return err?.name === 'AbortError' || err?.cause?.name === 'AbortError' || err?.type === 'aborted'
}

function refreshSceneGraphSoon() {
  // Guard: Supabase removeChannel() is async; callbacks can fire in the window
  // between onBeforeUnmount setting isMounted=false and the server ACK. Drop them.
  if (!isMounted) return
  if (sceneRealtimeRefreshTimer) {
    clearTimeout(sceneRealtimeRefreshTimer)
  }
  sceneRealtimeRefreshTimer = setTimeout(() => {
    if (!isMounted) return  // second guard for the timer itself
    // DB change event — full refresh including scenes and hotspots (polling=false)
    void fetchSpace(true, false)
  }, 200)
}

function startSceneRealtime() {
  stopSceneRealtime()
  const scenesChannel = supabase.channel(`space:${spaceId}:scenes`).on('postgres_changes', { event: '*', schema: 'public', table: 'scenes' }, refreshSceneGraphSoon).subscribe()
  const hotspotsChannel = supabase.channel(`space:${spaceId}:hotspots`).on('postgres_changes', { event: '*', schema: 'public', table: 'hotspots' }, refreshSceneGraphSoon).subscribe()
  sceneRealtimeChannels.value = [scenesChannel, hotspotsChannel]
}

function stopSceneRealtime() {
  for (const channel of sceneRealtimeChannels.value) {
    void supabase.removeChannel(channel)
  }
  sceneRealtimeChannels.value = []
  if (sceneRealtimeRefreshTimer) {
    clearTimeout(sceneRealtimeRefreshTimer)
    sceneRealtimeRefreshTimer = null
  }
}

async function fetchHotspots(sceneId: string) {
  try {
    const result = await apiFetch<any>(`/scenes/${sceneId}/hotspots`)
    const list = unwrapApiData<any>(result)?.hotspots || result?.hotspots || []
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: list }
  } catch {
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: hotspotsByScene.value[sceneId] || [] }
  }
}

function selectScene(sceneId: string) {
  if (sceneId === selectedSceneId.value) return
  isSceneTransitioning.value = true
  selectedSceneId.value = sceneId
  if (!hotspotsByScene.value[sceneId]) {
    void fetchHotspots(sceneId)
  }
  setTimeout(() => {
    isSceneTransitioning.value = false
  }, 650)
}


async function ensureSceneForEditing(): Promise<string | null> {
  if (selectedSceneId.value) return selectedSceneId.value
  if (!panorama.value?.public_url) return null

  // If the "Add Scene" button is already in flight, don't create a second scene.
  if (addScenePending.value) return null

  // Coalesce concurrent calls so only ONE scene creation request fires.
  if (ensureScenePromise) return ensureScenePromise

  ensureScenePromise = (async () => {
    try {
      const createResponse = await apiFetch<any>(`/spaces/${spaceId}/scenes`, {
        method: 'POST',
        body: {
          name: `Scene ${(scenes.value?.length || 0) + 1}`,
          raw_image_url: panorama.value!.public_url,
          initial_yaw: 0,
          initial_pitch: 0,
        },
      })
      const createdScene = unwrapApiData<any>(createResponse)?.scene || createResponse?.scene
      if (createdScene) {
        scenes.value = [...scenes.value, createdScene]
        selectedSceneId.value = createdScene.id
        hotspotsByScene.value = { ...hotspotsByScene.value, [createdScene.id]: [] }
        return createdScene.id as string
      }
      return null
    } finally {
      ensureScenePromise = null
    }
  })()

  return ensureScenePromise
}

function resolveTargetSceneId(currentSceneId: string) {
  if (hotspotTargetSceneId.value && hotspotTargetSceneId.value !== currentSceneId) {
    return hotspotTargetSceneId.value
  }
  const ordered = sceneChips.value.map((s: any) => s.id)
  if (ordered.length < 2) return null
  const idx = ordered.findIndex((id: string) => id === currentSceneId)
  if (idx === -1) return ordered[0]
  const next = ordered[(idx + 1) % ordered.length]
  return next === currentSceneId ? null : next
}

// Called by View360Viewer with real spherical (yaw, pitch) — perspective-correct.
async function handleViewerAddHotspot({ yaw, pitch }: { yaw: number; pitch: number }) {
  if (addingHotspot.value) return  // debounce concurrent clicks
  addingHotspot.value = true

  const sceneId = await ensureSceneForEditing()
  if (!sceneId) {
    showToast('Create or upload a scene first.', 'error')
    addingHotspot.value = false
    return
  }

  const payload: any = {
    type: hotspotDraftType.value,
    yaw,
    pitch,
    label: hotspotDraftType.value === 'scene_link' ? 'Go to next room' : 'Info hotspot',
    content: hotspotDraftType.value === 'url'
      ? { url: publicUrl.value, button_label: 'Open link' }
      : { text: 'Point of interest' },
  }

  if (hotspotDraftType.value === 'scene_link') {
    const targetSceneId = resolveTargetSceneId(sceneId)
    if (!targetSceneId) {
      showToast('Add another scene first, then place a scene-link hotspot.', 'error')
      addingHotspot.value = false
      return
    }
    payload.target_scene_id = targetSceneId
  }

  // ── Optimistic update ─────────────────────────────────────────
  // Show the hotspot immediately so the user sees instant feedback.
  // _pending=true marks it as unconfirmed; fetchScenes merges will preserve it
  // until the DB round-trip confirms the real record.
  const beforeCount = hotspotCount.value
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const optimisticEntry = { ...payload, id: tempId, _pending: true }
  hotspotsByScene.value = {
    ...hotspotsByScene.value,
    [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []), optimisticEntry],
  }

  try {
    const response = await apiFetch<any>(`/scenes/${sceneId}/hotspots`, {
      method: 'POST',
      body: payload,
    })
    const created = unwrapApiData<any>(response)?.hotspot || response?.hotspot
    if (created) {
      // Swap temp entry for the real DB record (preserves order, removes _pending flag).
      hotspotsByScene.value = {
        ...hotspotsByScene.value,
        [sceneId]: (hotspotsByScene.value[sceneId] ?? [])
          .filter((h: any) => h.id !== tempId)
          .concat([created]),
      }
      if (beforeCount === 0) {
        showToast('Your tour is now interactive')
      } else {
        showToast(hotspotDraftType.value === 'scene_link' ? 'Scene link hotspot added' : 'Hotspot added')
      }
    }
  } catch (e: any) {
    // Rollback: remove the optimistic entry so the viewer returns to the correct state.
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter((h: any) => h.id !== tempId),
    }
    showToast(e?.data?.statusMessage || 'Could not add hotspot. Try again.', 'error')
  } finally {
    addingHotspot.value = false
  }
}

// Called by View360Viewer's remove-hotspot emit (edit mode ✕ button).
async function handleViewerRemoveHotspot(hotspotId: string) {
  if (deletingHotspotsMap.value[hotspotId]) return  // prevent double-delete from rapid clicks
  const sceneId = selectedSceneId.value
  if (!sceneId) return

  // Pending (optimistic) hotspot whose POST is still in flight — cancel locally
  // without hitting the API since there's no server-side record yet.
  const isPending = (hotspotsByScene.value[sceneId] ?? []).some(
    (h: any) => h.id === hotspotId && h._pending === true
  )
  if (isPending) {
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter((h: any) => h.id !== hotspotId),
    }
    return
  }

  deletingHotspotsMap.value = { ...deletingHotspotsMap.value, [hotspotId]: true }
  try {
    await apiFetch(`/hotspots/${hotspotId}`, { method: 'DELETE' })
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] || []).filter((h: any) => h.id !== hotspotId),
    }
    if (editingHotspotId.value === hotspotId) closeHotspotEditor()
    showToast('Hotspot deleted')
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Failed to delete hotspot', 'error')
  } finally {
    const next = { ...deletingHotspotsMap.value }
    delete next[hotspotId]
    deletingHotspotsMap.value = next
  }
}

function handleHotspotClick(id: string) {
  const hotspot = activeSceneHotspots.value.find((h: any) => h.id === id)
  if (!hotspot) return
  if (inlineEditMode.value) {
    openHotspotEditor(hotspot, selectedSceneId.value)
    return
  }
  if (hotspot.type === 'scene_link' && hotspot.target_scene_id) {
    selectScene(hotspot.target_scene_id)
    showToast('Moved to linked scene')
    return
  }
  if (hotspot.type === 'url' && hotspot.content?.url) {
    window.open(hotspot.content.url, '_blank', 'noopener,noreferrer')
    return
  }
  showToast(hotspot.label || 'Hotspot selected')
}

function openHotspotEditor(hotspot: any, sceneId: string) {
  editingHotspotId.value = hotspot.id
  editingHotspotSceneId.value = sceneId
  hotspotEditForm.value = {
    type: hotspot.type || 'info',
    title: hotspot.label || '',
    description: hotspot.content?.text || '',
    link: hotspot.content?.url || '',
    targetSceneId: hotspot.target_scene_id || '',
  }
}

function closeHotspotEditor() {
  editingHotspotId.value = null
  editingHotspotSceneId.value = null
}


async function saveHotspotEdits() {
  if (!editingHotspotId.value || !editingHotspotSceneId.value) return
  try {
    const payload: any = {
      type: hotspotEditForm.value.type,
      label: hotspotEditForm.value.title || null,
      content: hotspotEditForm.value.type === 'url'
        ? { url: hotspotEditForm.value.link, button_label: 'Open link', text: hotspotEditForm.value.description }
        : { text: hotspotEditForm.value.description },
      target_scene_id: hotspotEditForm.value.type === 'scene_link'
        ? (hotspotEditForm.value.targetSceneId || null)
        : null,
    }
    await apiFetch(`/hotspots/${editingHotspotId.value}`, {
      method: 'PATCH',
      body: payload,
    })
    const sceneId = editingHotspotSceneId.value
    await fetchHotspots(sceneId)
    showToast('Hotspot updated')
    closeHotspotEditor()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Failed to update hotspot', 'error')
  }
}

async function deleteEditingHotspot() {
  if (!editingHotspotId.value || !editingHotspotSceneId.value) return
  try {
    await apiFetch(`/hotspots/${editingHotspotId.value}`, { method: 'DELETE' })
    const sceneId = editingHotspotSceneId.value
    hotspotsByScene.value[sceneId] = (hotspotsByScene.value[sceneId] || []).filter((h) => h.id !== editingHotspotId.value)
    showToast('Hotspot deleted')
    closeHotspotEditor()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Failed to delete hotspot', 'error')
  }
}

async function handleAddScene() {
  if (!panorama.value?.public_url) {
    showToast('Upload a panorama first to create Scene 1.', 'error')
    return
  }

  addScenePending.value = true
  try {
    const sceneNumber = (scenes.value?.length || 0) + 1
    const payload = {
      name: `Scene ${sceneNumber}`,
      raw_image_url: panorama.value.public_url,
      initial_yaw: 0,
      initial_pitch: 0,
    }
    const response = await apiFetch<any>(`/spaces/${spaceId}/scenes`, {
      method: 'POST',
      body: payload,
    })
    const createdScene = unwrapApiData<any>(response)?.scene || response?.scene
    if (createdScene) {
      scenes.value = [...scenes.value, createdScene]
      selectedSceneId.value = createdScene.id
      hotspotsByScene.value = { ...hotspotsByScene.value, [createdScene.id]: [] }
      showToast(`${createdScene.name || 'Scene'} created`)
      showHotspotPrompt.value = true
    } else {
      await fetchScenes()
      showToast('Scene created')
      showHotspotPrompt.value = true
    }
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Could not create scene yet. Please try again.', 'error')
  } finally {
    addScenePending.value = false
  }
}

function shareOnWhatsapp() {
  if (!canShare.value) {
    showToast('Upload a panorama first to unlock sharing.', 'error')
    return
  }
  const message = `Take a look at my 360 tour: ${publicUrl.value}`
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
}

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
    // polling=true: only refreshes media statuses, never overwrites form or scenes
    await fetchSpace(true, true)
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

// polling=true → only refresh media statuses, skip form overwrite + scene refetch
async function fetchSpace(silent = false, polling = false) {
  if (!planStore.plan) {
    await planStore.fetchSubscriptionStatus()
  }

  try {
    const previousStatusById = new Map(media.value.map((m: any) => [m.id, m.processing_status]))
    const data = await apiFetch<any>(`/spaces/${spaceId}`)
    space.value = data

    // Never overwrite the form while polling — would silently discard user's unsaved edits
    if (!polling) {
      detailsForm.value = {
        title: data.title,
        description: data.description || '',
        slug: data.slug || ''
      }
    }

    media.value = data.property_media || []

    // Scenes+hotspots are only needed on full load, not on media-status polling ticks
    if (!polling) {
      await fetchScenes()
    }

    if (!analyticsSummary.value.length) {
      try {
        const summary = await apiFetch<any>(`/analytics/summary/${spaceId}`)
        analyticsSummary.value = unwrapApiData<any>(summary) || summary || []
      } catch {
        analyticsSummary.value = []
      }
    }
    if (!selectedSceneId.value && scenes.value.length) {
      selectedSceneId.value = scenes.value[0].id
    }
    if (activeTab.value === 'details' && !media.value.some((m: any) => m.media_type === 'panorama')) {
      activeTab.value = '360'
    }

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
    postPublishPrompt.value = !isLive
    if (!isLive) {
      showToast('🎉 Your tour is LIVE. Share it now to start getting clients.')
    }
  } catch (e: any) {
    showToast(e.data?.statusMessage || 'Publishing failed', 'error')
  } finally {
    publishing.value = false
  }
}

async function handleGalleryUpload(e: any) {
  const files = e.target.files as FileList
  if (!files.length) return
  // Upload all selected files in parallel — sequential was causing multi-file uploads to feel broken
  await Promise.all(Array.from(files).map(file => uploadFile(file, 'gallery')))
}

async function handlePanoramaUpload(e: any) {
  const file = e.target.files[0] as File
  if (!file) return
  setPanoramaPreview(file)
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
    if (type === 'panorama') {
      activeTab.value = '360'
      clearPanoramaPreview()
      panoramaSaveState.value = 'saved'
      showHotspotPrompt.value = true
      inlineEditMode.value = true
      showToast('Click anywhere in the viewer to add your first hotspot')
      setTimeout(() => {
        panoramaSaveState.value = null
      }, 2800)
      await fetchScenes()
    }
    removeLocalUpload(localId)
    if (record.processing_status === 'pending' || record.processing_status === 'processing') {
      startPolling()
    } else if (record.processing_status === 'complete') {
      markRecentlyCompleted(record.id)
      showToast(`Upload complete: ${file.name}`)
    }
  } catch (err: any) {
    const humanError = extractUploadErrorMessage(err, file.name)
    updateLocalUpload(localId, { state: 'failed', error: humanError })
    // Reset panorama save state if it was a panorama upload that failed
    if (localPanoramaPreviewUrl.value) {
      clearPanoramaPreview()
      panoramaSaveState.value = null
    }
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
  const wasPanorama = media.value.find((m: any) => m.id === mediaId)?.media_type === 'panorama'
  try {
    await apiFetch(`/uploads/${mediaId}`, { method: 'DELETE' })
    media.value = media.value.filter((m: any) => m.id !== mediaId)
    if (previewImage.value?.id === mediaId) {
      previewImage.value = null
    }
    // Scenes reference the panorama's public_url — refresh so stale scene chips disappear
    if (wasPanorama) {
      scenes.value = []
      selectedSceneId.value = ''
      hotspotsByScene.value = {}
      await fetchScenes()
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
