<template>
  <div class="h-full flex flex-col">
    <!-- Page header -->
    <header class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-main">Tours</h1>
        <p class="text-sm text-dim mt-1">Manage and organize your virtual tours.</p>
      </div>

      <!-- Filters & Actions -->
      <div class="flex flex-col md:flex-row md:items-center gap-4">
        <!-- View Toggle: Panoee-style Sliding Segmented Control -->
        <div v-if="spaces.length > 0 || search" class="relative flex items-center p-1 bg-surface-alt border border-border rounded-xl w-24 h-10 overflow-hidden">
          <!-- Sliding Backdrop -->
          <div 
            class="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-main rounded-lg shadow-sm transition-all duration-300 ease-out"
            :style="{ transform: viewMode === 'grid' ? 'translateX(0)' : 'translateX(100%)' }"
          ></div>
          
          <button 
            @click="viewMode = 'grid'"
            class="relative z-10 flex-1 flex items-center justify-center transition-colors duration-300"
            :class="viewMode === 'grid' ? 'text-bg' : 'text-dim hover:text-main'"
            title="Grid View"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </button>
          
          <button 
            @click="viewMode = 'list'"
            class="relative z-10 flex-1 flex items-center justify-center transition-colors duration-300"
            :class="viewMode === 'list' ? 'text-bg' : 'text-dim hover:text-main'"
            title="List View"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>

        <button 
          @click="navigateTo('/app/create')"
          class="btn btn-primary gap-2 !px-8 shadow-2xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Tour
        </button>
      </div>
    </header>

    <!-- Toolbar (Only if we have spaces) -->
    <div v-if="spaces.length > 0 || search" @click="searchInput?.focus()" class="flex flex-col sm:flex-row gap-4 items-center justify-between card-glass p-1 !rounded-2xl border border-border shadow-sm mb-12 cursor-pointer group/search hover:border-main/20 transition-colors">
      <div class="relative w-full sm:w-80 group h-12 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="absolute left-4 text-dim group-focus-within:text-main transition-colors"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input 
          ref="searchInput"
          v-model="search" 
          type="text" 
          class="w-full pl-11 pr-5 py-2.5 bg-transparent border-none focus:ring-0 text-sm font-bold outline-none placeholder:text-dim/60 text-main" 
          placeholder="Search your property domain..." 
        />
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-border h-12 sm:pl-3">
        <div class="relative w-full sm:w-auto">
          <select v-model="sortBy" class="w-full sm:w-auto pl-4 pr-10 py-2 bg-transparent border-transparent text-[11px] font-black uppercase tracking-[0.1em] outline-none appearance-none cursor-pointer text-main hover:opacity-70 transition-all">
            <option value="newest" class="bg-surface text-main">Chronological</option>
            <option value="oldest" class="bg-surface text-main">Legacy Records</option>
            <option value="name" class="bg-surface text-main">Alphabetical</option>
          </select>
          <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim/60">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="n in 4" :key="n" class="h-64 card-glass overflow-hidden animate-pulse">
         <div class="h-2/3 bg-surface-alt"></div>
         <div class="p-4 space-y-3">
            <div class="h-4 bg-surface-alt rounded-lg w-3/4"></div>
            <div class="h-3 bg-surface-alt rounded-lg w-1/2"></div>
         </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <template v-else>
      <!-- Empty State: Type Selection -->
      <div v-if="!filteredSpaces.length && !search">
        <div class="mb-6">
          <h2 class="text-base font-bold text-main">What are you creating?</h2>
          <p class="text-sm text-dim mt-1">Choose the type of tour to get the best setup.</p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">

          <!-- Card: Property / Space -->
          <div
            class="bg-card border rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200"
            :class="selectedSpaceType === 'residential' ? 'border-main ring-1 ring-main/30' : 'border-border hover:border-main/30'"
            @click="selectedSpaceType = 'residential'"
          >
            <div class="h-32 bg-surface-alt dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
              <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="110,18 180,66 40,66" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <rect x="50" y="66" width="120" height="60" rx="2" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="148" y="34" width="14" height="24" rx="2" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <rect x="96" y="96" width="28" height="30" rx="3" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <circle cx="120" cy="112" r="2.5" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <rect x="62" y="76" width="24" height="20" rx="3" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <line x1="74" y1="76" x2="74" y2="96" stroke="currentColor" stroke-width="1.5" class="text-zinc-200 dark:text-zinc-700"/>
                <line x1="62" y1="86" x2="86" y2="86" stroke="currentColor" stroke-width="1.5" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="134" y="76" width="24" height="20" rx="3" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <line x1="146" y1="76" x2="146" y2="96" stroke="currentColor" stroke-width="1.5" class="text-zinc-200 dark:text-zinc-700"/>
                <line x1="134" y1="86" x2="158" y2="86" stroke="currentColor" stroke-width="1.5" class="text-zinc-200 dark:text-zinc-700"/>
              </svg>
            </div>
            <div class="p-4">
              <div class="flex items-center gap-1.5 mb-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-500"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span class="text-xs font-bold tracking-widest uppercase text-orange-500">01 Property</span>
              </div>
              <h3 class="text-base font-bold text-main">Property / Space</h3>
            </div>
          </div>

          <!-- Card: Car / Vehicle -->
          <div
            class="bg-card border rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200"
            :class="selectedSpaceType === 'automotive' ? 'border-main ring-1 ring-main/30' : 'border-border hover:border-main/30'"
            @click="selectedSpaceType = 'automotive'"
          >
            <div class="h-32 bg-surface-alt dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
              <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="22" y="68" width="176" height="40" rx="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <path d="M65 68 Q76 42 98 38 L132 38 Q154 42 160 68Z" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <path d="M72 65 Q80 50 97 46 L110 46 L110 65Z" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <path d="M122 46 L133 46 Q148 50 154 65 L122 65Z" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="112" y="46" width="8" height="18" rx="1" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="22" y="88" width="20" height="12" rx="4" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <rect x="178" y="88" width="20" height="12" rx="4" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <circle cx="70" cy="110" r="18" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <circle cx="70" cy="110" r="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <circle cx="70" cy="110" r="4" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <circle cx="152" cy="110" r="18" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <circle cx="152" cy="110" r="10" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <circle cx="152" cy="110" r="4" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
              </svg>
            </div>
            <div class="p-4">
              <div class="flex items-center gap-1.5 mb-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                <span class="text-xs font-bold tracking-widest uppercase text-indigo-500">02 Vehicle</span>
              </div>
              <h3 class="text-base font-bold text-main">Car / Vehicle</h3>
            </div>
          </div>

          <!-- Card: Business / Institution -->
          <div
            class="bg-card border rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200"
            :class="selectedSpaceType === 'commercial' ? 'border-main ring-1 ring-main/30' : 'border-border hover:border-main/30'"
            @click="selectedSpaceType = 'commercial'"
          >
            <div class="h-32 bg-surface-alt dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
              <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="48" y="28" width="124" height="98" rx="4" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="42" y="22" width="136" height="12" rx="3" fill="currentColor" class="text-zinc-300 dark:text-zinc-600"/>
                <rect x="60" y="42" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="86" y="42" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="116" y="42" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="142" y="42" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="60" y="64" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="86" y="64" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="116" y="64" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="142" y="64" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="60" y="86" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="86" y="86" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="116" y="86" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="142" y="86" width="18" height="14" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
                <rect x="98" y="106" width="24" height="20" rx="2" fill="currentColor" class="text-zinc-400 dark:text-zinc-500"/>
              </svg>
            </div>
            <div class="p-4">
              <div class="flex items-center gap-1.5 mb-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-500"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                <span class="text-xs font-bold tracking-widest uppercase text-purple-500">03 Business</span>
              </div>
              <h3 class="text-base font-bold text-main">Business / Institution</h3>
            </div>
          </div>

          <!-- Card: Multiple Items -->
          <div
            class="bg-card border rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200"
            :class="selectedSpaceType === 'other' ? 'border-main ring-1 ring-main/30' : 'border-border hover:border-main/30'"
            @click="selectedSpaceType = 'other'"
          >
            <div class="h-32 bg-surface-alt dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
              <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="14" width="82" height="52" rx="8" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="118" y="14" width="82" height="52" rx="8" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="20" y="74" width="82" height="52" rx="8" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <rect x="118" y="74" width="82" height="52" rx="8" fill="currentColor" class="text-zinc-200 dark:text-zinc-700"/>
                <ellipse cx="61" cy="34" rx="20" ry="12" stroke="currentColor" stroke-width="1.5" class="text-zinc-400 dark:text-zinc-500" fill="none"/>
                <line x1="61" y1="22" x2="61" y2="46" stroke="currentColor" stroke-width="1" class="text-zinc-400 dark:text-zinc-500"/>
                <line x1="41" y1="34" x2="81" y2="34" stroke="currentColor" stroke-width="1" class="text-zinc-400 dark:text-zinc-500"/>
                <ellipse cx="159" cy="34" rx="20" ry="12" stroke="currentColor" stroke-width="1.5" class="text-zinc-400 dark:text-zinc-500" fill="none"/>
                <line x1="159" y1="22" x2="159" y2="46" stroke="currentColor" stroke-width="1" class="text-zinc-400 dark:text-zinc-500"/>
                <line x1="139" y1="34" x2="179" y2="34" stroke="currentColor" stroke-width="1" class="text-zinc-400 dark:text-zinc-500"/>
                <ellipse cx="61" cy="94" rx="20" ry="12" stroke="currentColor" stroke-width="1.5" class="text-zinc-400 dark:text-zinc-500" fill="none"/>
                <line x1="61" y1="82" x2="61" y2="106" stroke="currentColor" stroke-width="1" class="text-zinc-400 dark:text-zinc-500"/>
                <line x1="41" y1="94" x2="81" y2="94" stroke="currentColor" stroke-width="1" class="text-zinc-400 dark:text-zinc-500"/>
                <ellipse cx="159" cy="94" rx="20" ry="12" stroke="currentColor" stroke-width="1.5" class="text-zinc-400 dark:text-zinc-500" fill="none"/>
                <line x1="159" y1="82" x2="159" y2="106" stroke="currentColor" stroke-width="1" class="text-zinc-400 dark:text-zinc-500"/>
                <line x1="139" y1="94" x2="179" y2="94" stroke="currentColor" stroke-width="1" class="text-zinc-400 dark:text-zinc-500"/>
              </svg>
            </div>
            <div class="p-4">
              <div class="flex items-center gap-1.5 mb-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><rect x="2" y="2" width="8" height="8" rx="2" ry="2"/><rect x="14" y="2" width="8" height="8" rx="2" ry="2"/><rect x="2" y="14" width="8" height="8" rx="2" ry="2"/><rect x="14" y="14" width="8" height="8" rx="2" ry="2"/></svg>
                <span class="text-xs font-bold tracking-widest uppercase text-emerald-500">04 Multiple</span>
              </div>
              <h3 class="text-base font-bold text-main">Multiple Items</h3>
            </div>
          </div>

        </div>

        <div class="mt-6 flex flex-col items-center gap-3">
          <p class="text-sm text-dim">Not sure? Start with Property — you can change later.</p>
          <button
            @click="selectedSpaceType && navigateTo(`/app/create?type=${selectedSpaceType}`)"
            :disabled="!selectedSpaceType"
            class="btn btn-primary px-8 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue →
          </button>
        </div>
      </div>

      <!-- Empty State: search results -->
      <div v-else-if="!filteredSpaces.length && search" class="flex-1 flex flex-col items-center justify-center text-center p-12">
        <div class="w-16 h-16 rounded-2xl bg-surface-alt border border-border flex items-center justify-center text-dim mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <p class="text-base font-bold text-main mb-2">No results for "{{ search }}"</p>
        <button class="text-sm font-bold text-dim hover:text-main underline decoration-2 underline-offset-4" @click="search = ''">Reset filters</button>
      </div>

      <!-- Populated State: Grid View -->
      <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div
          v-for="space in filteredSpaces"
          :key="space.id" 
          class="group relative flex flex-col h-[300px] bg-card rounded-2xl border border-border overflow-hidden hover:border-main/50 hover:shadow-2xl transition-all duration-500 cursor-pointer"
          @click="navigateTo(`/app/spaces/${space.id}`)"
        >
          <!-- Thumbnail -->
          <div class="h-[180px] w-full bg-surface-alt relative overflow-hidden">
            <div 
              v-if="space.cover_image_url"
              class="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-1000"
              :style="{ backgroundImage: `url(${space.cover_image_url})` }"
            ></div>
            <div v-else class="w-full h-full flex items-center justify-center bg-surface-alt group-hover:bg-surface transition-colors duration-500 text-dim/20">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </div>
            
            <!-- Badges -->
            <div class="absolute top-4 left-4 flex gap-2">
              <span :class="['px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-2xl border backdrop-blur-md transition-all', space.is_published ? 'bg-emerald-500 text-bg border-emerald-400' : 'bg-surface/80 text-dim border-border']">
                {{ space.is_published ? 'Published' : 'Draft' }}
              </span>
            </div>

            <!-- Overlay Actions -->
            <div class="absolute inset-0 bg-bg/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px]">
               <button class="w-11 h-11 flex items-center justify-center bg-surface border border-border rounded-xl text-main shadow-2xl hover:bg-main hover:text-bg transition-all duration-300 active:scale-90" @click.stop="navigateTo(`/app/spaces/${space.id}`)" title="Edit">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
               </button>
               <a v-if="space.is_published && space.slug" :href="`/p/${space.slug}`" target="_blank" class="w-11 h-11 flex items-center justify-center bg-surface border border-border rounded-xl text-main shadow-2xl hover:bg-main hover:text-bg transition-all duration-300 active:scale-90" @click.stop title="View Live">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
               </a>
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 p-5 flex flex-col justify-between">
            <div>
              <h3 class="text-sm font-black text-main truncate mb-1" :title="space.title">{{ space.title }}</h3>
              <p class="text-[10px] font-bold text-dim/60 uppercase tracking-widest">{{ formatDate(space.created_at) }}</p>
            </div>
            
            <div class="flex items-center justify-between mt-4">
              <div class="flex items-center gap-3">
                <button class="p-1.5 hover:bg-surface-alt rounded-lg text-dim hover:text-main transition-colors" @click.stop="handleTogglePublish(space)" title="Toggle Status">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <button class="p-1.5 hover:bg-rose-500/10 rounded-lg text-dim hover:text-rose-500 transition-colors" @click.stop="confirmDelete(space)" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Populated State: List View (Grey Futuristic iOS Aesthetic) -->
      <div v-else class="flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto w-full">
        <!-- List Header -->
        <div class="px-8 py-5 flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-dim/30">
          <div class="flex-1">Domain & Project</div>
          <div class="w-40 hidden md:block">Technology</div>
          <div class="w-32 hidden md:block">Status</div>
          <div class="w-48 hidden lg:block text-right pr-20">Last Sync</div>
          <div class="w-32 text-right invisible">Actions</div>
        </div>
        
        <div
          v-for="space in filteredSpaces"
          :key="space.id"
          class="group px-6 py-4 flex items-center gap-6 bg-surface-alt/10 hover:bg-surface-alt/40 border border-border/20 hover:border-main/20 rounded-[1.25rem] transition-all duration-500 cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-0.5"
          @click="navigateTo(`/app/spaces/${space.id}`)"
        >
          <!-- Premium Compact Thumb -->
          <div class="w-14 h-14 rounded-2xl bg-surface-alt border border-border/40 overflow-hidden flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-700">
             <div v-if="space.cover_image_url" class="w-full h-full bg-cover bg-center" :style="{ backgroundImage: `url(${space.cover_image_url})` }"></div>
             <div v-else class="w-full h-full flex items-center justify-center text-dim/10">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
             </div>
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-black text-main truncate group-hover:text-main transition-colors flex items-center gap-2">
              {{ space.title }}
              <svg v-if="space.is_published" class="text-emerald-500 w-3 h-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>
            </h3>
            <p class="text-[10px] font-bold text-dim/40 mt-1 tracking-tight uppercase">viewora.com/p/{{ space.slug || space.id.slice(0,8) }}</p>
          </div>

          <div class="w-40 hidden md:block">
            <span class="text-[9px] font-black text-main/60 uppercase px-3 py-1 bg-main/[0.03] rounded-full border border-main/10 tracking-widest shadow-sm">360 WebXR</span>
          </div>

          <div class="w-32 hidden md:block">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-alt/50 rounded-xl border border-border/20 group-hover:bg-main/5 transition-colors">
              <div :class="['w-1.5 h-1.5 rounded-full', space.is_published ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-dim/20']"></div>
              <span class="text-[9px] font-black uppercase tracking-widest text-main/60">{{ space.is_published ? 'Live' : 'Draft' }}</span>
            </div>
          </div>

          <div class="w-48 hidden lg:block text-right pr-20">
            <span class="text-[11px] font-bold text-dim/60 tracking-tight">{{ formatDate(space.created_at) }}</span>
          </div>

          <div class="w-32 flex justify-end gap-1.5">
            <button class="w-10 h-10 flex items-center justify-center bg-surface-alt/50 hover:bg-main hover:text-bg border border-border/20 rounded-xl transition-all duration-300 shadow-sm" @click.stop="navigateTo(`/app/spaces/${space.id}`)" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="w-10 h-10 flex items-center justify-center bg-surface-alt/50 hover:bg-rose-500 hover:text-white border border-border/20 rounded-xl transition-all duration-300 shadow-sm" @click.stop="confirmDelete(space)" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Modals + Toast ── -->
    <Teleport to="body">

      <!-- Delete Confirm -->
      <AppConfirmationModal
        :is-open="!!spaceToDelete"
        title="Delete Space?"
        :message="deleteMessage"
        confirm-text="Yes, Delete Space"
        :is-dangerous="true"
        :loading="deleting"
        @confirm="handleDelete"
        @cancel="spaceToDelete = null"
      />

      <!-- Toast -->
      <Transition name="toast">
        <div 
          v-if="toast"
          class="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-4 card-glass border-main/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500"
        >
          <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          <span class="text-xs font-bold text-main tracking-tight">{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
import { ref, computed, onMounted } from 'vue'
import { useSpaces } from '~/composables/useSpaces'
import { navigateTo } from '#imports'
import type { Space } from '~/composables/useSpaces'
useSeoMeta({ title: 'Spaces | Viewora' })

const { spaces, pending, error, fetchSpaces, deleteSpace, publishSpace } = useSpaces()

const search = ref('')
const searchInput = ref<HTMLInputElement>()
const sortBy = ref<'newest' | 'oldest' | 'name'>('newest')
const viewMode = ref<'grid' | 'list'>('grid')
const selectedSpaceType = ref<string>('')
// Delete
const spaceToDelete = ref<Space | null>(null)
const deleting = ref(false)

const deleteMessage = computed(() => {
  if (!spaceToDelete.value) return ''
  return `Are you sure you want to permanently remove "${spaceToDelete.value.title}"? This will also delete all associated media and lead data.`
})

// Toast
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  fetchSpaces()
})

const filteredSpaces = computed(() => {
  let list = Array.isArray(spaces.value) ? spaces.value.slice() : []
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(p => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
  }
  if (sortBy.value === 'oldest') list.sort((a, b) => a.created_at.localeCompare(b.created_at))
  else if (sortBy.value === 'name') list.sort((a, b) => a.title.localeCompare(b.title))
  else list.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return list
})

const formatDate = (d: string) => {
  const date = new Date(d)
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}



// Publish
const handleTogglePublish = async (space: Space) => {
  const isLive = space.is_published
  try {
    await publishSpace(space.id, !isLive)
    showToast(isLive ? `"${space.title}" unpublished` : `"${space.title}" is now live`)
  } catch (e: any) {
    showToast(e.data?.statusMessage ?? 'Failed to update publish status.', 'error')
  }
}

// Delete
const confirmDelete = (space: Space) => {
  spaceToDelete.value = space
}
const handleDelete = async () => {
  if (!spaceToDelete.value) return
  deleting.value = true
  const title = spaceToDelete.value.title
  try {
    await deleteSpace(spaceToDelete.value.id)
    spaceToDelete.value = null
    showToast(`"${title}" deleted`)
  } catch (e: any) {
    showToast(e.data?.statusMessage ?? 'Failed to delete space.', 'error')
  } finally {
    deleting.value = false
    spaceToDelete.value = null
  }
}
</script>

<style scoped>
.prop-thumb {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0.75rem;
}
.prop-thumb--live { background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); }
.prop-thumb--draft { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); }

.space-meta-link {
  color: var(--accent) !important;
  text-decoration: none;
  font-weight: 600;
}
.space-meta-link:hover { text-decoration: underline; }

/* Spaces Grid & Cards */
.spaces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.space-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 1rem;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
}

.space-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent);
  box-shadow: 0 12px 24px -10px rgba(0,0,0,0.3);
}

.space-card-thumbnail {
  aspect-ratio: 16/9;
  width: 100%;
}

.space-card-body {
  padding: 1.25rem;
}

.space-card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 0.75rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.space-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.space-meta-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.space-meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.space-status-badge {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.6rem;
  border-radius: 2rem;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(4px);
  color: #fff;
}

.space-more-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.space-more-btn:hover {
  background: var(--border);
  color: var(--ink);
}

.space-more-wrapper {
  position: relative;
}

.space-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.5rem;
  min-width: 140px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  z-index: 10;
}

.space-dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  border: none;
  background: none;
  color: var(--ink);
  border-radius: 0.4rem;
  cursor: pointer;
  transition: all 0.2s;
}

.space-dropdown-item:hover {
  background: var(--border);
}

.space-card--add {
  border-style: dashed;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.space-add-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.space-add-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.space-add-text {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-muted);
}
</style>
