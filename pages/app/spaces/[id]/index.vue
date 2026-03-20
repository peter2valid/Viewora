<template>
  <div class="space-y-8 pb-12">
    <!-- Header with Breadcrumbs & Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
      <div class="space-y-1">
        <nav class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
           <NuxtLink to="/app/spaces" class="hover:text-zinc-950 transition-colors">Spaces</NuxtLink>
           <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
           <span class="text-zinc-500">{{ space?.title || 'Loading...' }}</span>
        </nav>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-black tracking-tight text-zinc-950">{{ space?.title || 'Edit Space' }}</h1>
          <div v-if="space?.is_published" class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">Live</div>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <a 
           v-if="space?.is_published && space.slug" 
           :href="`/p/${space.slug}`" 
           target="_blank" 
           class="inline-flex items-center gap-2 px-4 py-2 bg-white text-zinc-950 text-sm font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          View Public
        </a>
        <button 
          class="inline-flex items-center gap-2 px-5 py-2 bg-zinc-950 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-lg active:scale-95 disabled:opacity-50" 
          @click="handleTogglePublish" 
          :disabled="publishing"
        >
          <div v-if="publishing" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          {{ space?.is_published ? 'Unpublish' : 'Publish Space' }}
        </button>
      </div>
    </div>

    <!-- Modern Underline Tabs -->
    <div class="flex items-center gap-8 overflow-x-auto pb-1 scrollbar-hide border-b border-slate-200">
      <button 
        v-for="tab in [{ id: 'details', label: 'Details', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' }, 
                      { id: 'gallery', label: 'Gallery', icon: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' }, 
                      { id: '360', label: '360° Studio', icon: 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' }, 
                      { id: 'share', label: 'Share', icon: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13' }]" 
        :key="tab.id" 
        class="flex items-center gap-2.5 py-4 border-b-2 text-sm font-bold transition-all relative whitespace-nowrap group"
        :class="activeTab === tab.id ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-slate-500 hover:text-zinc-600'"
        @click="activeTab = tab.id"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="opacity-60 group-hover:opacity-100">
           <path v-if="tab.id === 'details'" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
           <circle v-if="tab.id === 'gallery'" cx="12" cy="13" r="4"/><path v-if="tab.id === 'gallery'" d="M1 18v3h22v-3c0-3-4-5-4-5s-3 2-7 2-7-2-7-2-4 2-4 5z"/>
           <circle v-if="tab.id === '360'" cx="12" cy="12" r="10"/><path v-if="tab.id === '360'" d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path v-if="tab.id === '360'" d="M2 12h20"/>
           <path v-if="tab.id === 'share'" d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline v-if="tab.id === 'share'" points="16 6 12 2 8 6"/><line v-if="tab.id === 'share'" x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        {{ tab.label }}
      </button>
    </div>

    <!-- Main Content Wrapper -->
    <div class="pt-4">

      <!-- Details Tab -->
            <!-- Details Tab -->
      <div v-if="activeTab === 'details'" class="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <form @submit.prevent="handleUpdateDetails" class="space-y-12">
          <!-- Information -->
          <div class="space-y-6">
            <h3 class="text-sm font-black uppercase tracking-widest text-zinc-500">Basic Information</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div class="space-y-1.5 md:col-span-2">
                <label class="text-[12px] font-bold text-zinc-500 uppercase tracking-wider">Property Title</label>
                <input v-model="detailsForm.title" type="text" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 rounded-xl text-sm transition-all outline-none font-medium" required placeholder="Luxury Penthouse..." />
              </div>
              <div class="space-y-1.5 md:col-span-2">
                <label class="text-[12px] font-bold text-zinc-500 uppercase tracking-wider">Custom Slug <span class="text-[10px] lowercase font-normal italic">(viewora.com/p/your-slug)</span></label>
                <div class="flex items-center">
                   <div class="flex-1">
                     <input v-model="detailsForm.slug" type="text" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 rounded-xl text-sm transition-all outline-none font-medium" placeholder="my-awesome-tour" />
                   </div>
                </div>
              </div>
              <div class="space-y-1.5 md:col-span-2">
                <label class="text-[12px] font-bold text-zinc-500 uppercase tracking-wider">Description</label>
                <textarea v-model="detailsForm.description" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 rounded-xl text-sm transition-all outline-none resize-none font-medium" rows="4" placeholder="Tell us about this space..."></textarea>
              </div>
            </div>
          </div>

          <!-- Feature Toggles -->
          <div class="space-y-6">
            <h3 class="text-sm font-black uppercase tracking-widest text-zinc-500">Advanced Features</h3>
            <div class="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="flex items-center justify-between p-6 group hover:bg-slate-50 transition-colors">
                <div class="space-y-1">
                  <span class="text-sm font-bold text-zinc-950 block">Lead Capture Form</span>
                  <span class="text-xs text-slate-500 block">Collect client names and emails directly from your tour.</span>
                </div>
                <div class="flex items-center gap-4">
                  <div v-if="!planStore.entitlements?.lead_capture_enabled" class="px-2 py-1 rounded-md bg-zinc-950 text-white text-[9px] font-black uppercase tracking-widest">Upgrade to Plus</div>
                  <button 
                    v-else
                    type="button" 
                    class="w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none"
                    :class="space?.lead_form_enabled ? 'bg-zinc-950' : 'bg-slate-200'"
                    @click="handleToggleFeature('lead_form_enabled')"
                  >
                    <div class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300" :class="space?.lead_form_enabled ? 'translate-x-6' : ''"></div>
                  </button>
                </div>
              </div>

              <div class="flex items-center justify-between p-6 group hover:bg-slate-50 transition-colors">
                <div class="space-y-1">
                  <span class="text-sm font-bold text-zinc-950 block">White-label Branding</span>
                  <span class="text-xs text-slate-500 block">Remove all Viewora logo and use your custom watermark.</span>
                </div>
                <div class="flex items-center gap-4">
                  <div v-if="!planStore.entitlements?.branding_customization_enabled" class="px-2 py-1 rounded-md bg-zinc-950 text-white text-[9px] font-black uppercase tracking-widest">Upgrade to Pro</div>
                  <button 
                    v-else
                    type="button" 
                    class="w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none"
                    :class="space?.branding_enabled ? 'bg-zinc-950' : 'bg-slate-200'"
                    @click="handleToggleFeature('branding_enabled')"
                  >
                    <div class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300" :class="space?.branding_enabled ? 'translate-x-6' : ''"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-4">
            <button type="submit" class="px-8 py-3 bg-zinc-950 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 shadow-xl active:scale-95 transition-all disabled:opacity-50" :disabled="saving">
              {{ saving ? 'Updating Details...' : 'Save Settings' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Gallery Tab -->
            <!-- Gallery Tab -->
      <div v-if="activeTab === 'gallery'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="flex items-center justify-between">
           <h3 class="text-sm font-black uppercase tracking-widest text-zinc-500">Gallery Highlights</h3>
           <label class="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-all cursor-pointer shadow-sm">
             <input type="file" multiple accept="image/*" class="hidden" @change="handleGalleryUpload" />
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
             Add Photos
           </label>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="img in galleryMedia" :key="img.id" class="group relative aspect-square bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <img :src="img.public_url" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <button 
                 class="p-2 bg-white text-red-600 rounded-lg shadow-xl hover:scale-110 active:scale-95 transition-all" 
                 @click="handleDeleteMedia(img.id)"
                 title="Delete"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
               </button>
            </div>
          </div>
          
          <!-- Large Dropzone if empty -->
          <div v-if="galleryMedia.length === 0" class="col-span-full py-20 border-2 border-dashed border-slate-200 bg-white rounded-2xl flex flex-col items-center justify-center gap-4 text-slate-400 group hover:border-zinc-300 transition-all">
             <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
             </div>
             <p class="text-sm font-bold text-slate-500">Drop photos here or click Add Photos</p>
          </div>
        </div>
      </div>

      <!-- 360 Tab -->
      <div v-if="activeTab === '360'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="flex items-center justify-between">
           <h3 class="text-sm font-black uppercase tracking-widest text-zinc-500">Interactive Studio</h3>
           <label v-if="panorama" class="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-all cursor-pointer shadow-sm">
             <input type="file" accept="image/*" class="hidden" @change="handlePanoramaUpload" />
             Replace Panorama
           </label>
        </div>

        <div v-if="panorama" class="relative group aspect-[2/1] bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <img :src="panorama.public_url" class="absolute inset-0 w-full h-full object-cover opacity-80" />
          
          <!-- Info overlay -->
          <div class="absolute bottom-6 left-6 z-20 space-y-2 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
             <div class="inline-block px-2 py-1 rounded-md bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">Selected Experience</div>
             <h4 class="text-lg font-bold text-white">Full 360° VR Tour Activated</h4>
          </div>

          <!-- Quick Preview Button -->
          <div class="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
             <a :href="`/p/${space.slug}`" target="_blank" class="w-16 h-16 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
             </a>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-32 bg-zinc-950 rounded-2xl border-2 border-dashed border-zinc-800 text-zinc-500 space-y-6 group hover:border-zinc-700 transition-all">
          <div class="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          </div>
          <div class="text-center space-y-2">
            <p class="text-lg font-black text-white tracking-tight">Upload Your 360° Panorama</p>
            <p class="text-sm text-zinc-500 max-w-xs mx-auto">Requires a 2:1 equirectangular image for the immersive experience.</p>
          </div>
          <label class="px-8 py-3 bg-white text-zinc-950 text-sm font-black rounded-xl hover:bg-zinc-100 transition-all cursor-pointer shadow-xl active:scale-95">
             <input type="file" accept="image/*" class="hidden" @change="handlePanoramaUpload" />
             Select Image
          </label>
        </div>
      </div>

      <!-- Share Tab -->
      <div v-if="activeTab === 'share'" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <!-- QR & Social -->
          <div class="lg:col-span-4 space-y-8">
            <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl flex flex-col items-center text-center space-y-6">
               <div class="space-y-1">
                 <h3 class="text-lg font-black text-zinc-950">Scan & Explore</h3>
                 <p class="text-xs text-slate-500">Open this space instantly on any device.</p>
               </div>
               
               <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                 <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl + '?src=qr')}`" class="w-40 h-40 mix-blend-multiply" />
               </div>

               <div class="grid grid-cols-2 gap-2 w-full">
                 <button 
                   v-if="planStore.entitlements?.qr_download_enabled"
                   class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-zinc-950 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                   @click="downloadQR('png')"
                 >
                   PNG
                 </button>
                 <button 
                   v-if="planStore.entitlements?.qr_svg_enabled"
                   class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-zinc-950 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                   @click="downloadQR('svg')"
                 >
                   SVG
                 </button>
               </div>
               <p v-if="!planStore.entitlements?.qr_download_enabled" class="text-[9px] text-slate-400 font-bold uppercase tracking-tighter italic">Downloads require Plus Plan</p>
            </div>

            <div class="space-y-4">
              <h4 class="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Social Spread</h4>
              <div class="flex flex-col gap-2">
                 <a :href="`https://wa.me/?text=${encodeURIComponent('Check out this 360° tour: ' + publicUrl)}`" target="_blank" class="flex items-center justify-between p-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all font-bold text-sm shadow-lg shadow-emerald-500/20">
                    <span>Share on WhatsApp</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                 </a>
              </div>
            </div>
          </div>

          <!-- Links & Tracking -->
          <div class="lg:col-span-8 space-y-12">
            <div class="space-y-6">
              <h3 class="text-sm font-black uppercase tracking-widest text-zinc-500 px-2">Trackable Assets</h3>
              <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                <!-- Direct -->
                <div class="p-6 space-y-3 group hover:bg-slate-50 transition-all">
                  <div class="flex items-center justify-between">
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Public Link</label>
                    <span class="text-[10px] font-bold text-emerald-500 uppercase">Primary</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <input readonly :value="publicUrl" class="flex-1 bg-slate-100/50 border-none px-4 py-3 rounded-xl text-sm font-mono text-zinc-600 outline-none" />
                    <button class="px-6 py-3 bg-zinc-950 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all active:scale-95" @click="copyLink(publicUrl)">Copy</button>
                  </div>
                </div>

                <!-- Embed -->
                <div class="p-6 space-y-3 group hover:bg-slate-50 transition-all">
                   <div class="flex items-center justify-between">
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Embed iFrame</label>
                    <span class="text-[10px] font-bold text-slate-400 uppercase">Website / Blog</span>
                  </div>
                  <div class="flex flex-col gap-3">
                    <textarea readonly :value="embedCode" class="w-full bg-slate-100/50 border-none px-4 py-3 rounded-xl text-[10px] font-mono text-zinc-500 outline-none resize-none" rows="3"></textarea>
                    <button class="w-full py-3 bg-white border border-slate-200 text-zinc-950 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all active:scale-95" @click="copyLink(embedCode)">Copy Embed Code</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tracking Tip -->
            <div class="p-6 bg-zinc-950 rounded-3xl text-white flex items-start gap-4 shadow-2xl shadow-zinc-950/20">
               <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-zinc-400">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
               </div>
               <div class="space-y-1">
                 <p class="text-sm font-bold">Pro Tip: Use Campaign Labels</p>
                 <p class="text-xs text-zinc-400">Adding <code class="bg-white/10 px-1 py-0.5 rounded text-white">?src=campaign_name</code> to your link will automatically track conversions in your Analytics tab.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
import { ref, computed, onMounted } from 'vue'
import { usePlanStore } from '~/stores/plan'
import { useRoute } from '#imports'

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
    alert('Copied to clipboard!')
  } catch (err) {
    alert('Failed to copy')
  }
}

async function downloadQR(format: 'png' | 'svg' = 'png') {
  if (format === 'svg' && !planStore.entitlements?.qr_svg_enabled) {
    alert('SVG download is available on the Plus plan and above.')
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
    alert('Failed to load space data')
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
    alert('Details saved!')
  } catch (e) {
    alert('Failed to save details')
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
    alert(e.data?.statusMessage || 'Failed to update setting')
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
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Publishing failed')
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
    // 1. Get signed URL
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

    // 2. Upload to R2
    await $fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    })

    // 3. Complete
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
    alert(`Failed to upload ${file.name}: ${err.data?.statusMessage || err.message}`)
  }
}

async function handleDeleteMedia(id: string) {
  if (!confirm('Delete this media?')) return
  try {
    await apiFetch(`/uploads/${id}`, { method: 'DELETE' })
    media.value = media.value.filter(m => m.id !== id)
  } catch (err: any) {
    alert(`Failed to delete media: ${err.data?.statusMessage || err.message}`)
  }
}
</script>

<style scoped>
/* Scrollbar hide for tabs */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
