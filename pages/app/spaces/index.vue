<template>
  <div class="h-full flex flex-col">
    <!-- Page header -->
    <header class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-main">Tours</h1>
        <p class="text-sm text-dim mt-1">Manage and organize your virtual tours.</p>
      </div>

      <!-- Filters & Actions -->
      <div class="flex flex-col md:flex-row md:items-center gap-4">
        <!-- View Toggle: Panoee-style Sliding Segmented Control -->
        <div v-if="spaces.length > 0 || search" class="relative flex items-center p-1 bg-surface-alt rounded-xl w-24 h-10 overflow-hidden">
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
          @click="handleCreateTour"
          class="btn btn-primary gap-2 !px-8 shadow-2xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Tour
        </button>
      </div>
    </header>

    <!-- Toolbar (Only if we have spaces) -->
    <div v-if="spaces.length > 0 || search" @click="searchInput?.focus()" class="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border dark:border-transparent p-1 !rounded-2xl shadow-sm mb-12 cursor-pointer group/search transition-colors">
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
      <div class="flex items-center gap-3 w-full sm:w-auto sm:border-l border-black/[0.08] dark:border-white/20 h-12 sm:pl-3" @click.stop>
        <div class="relative w-full sm:w-auto">
          <select v-model="sortBy" class="w-full sm:w-auto pl-4 pr-7 py-2 bg-transparent border-transparent text-[11px] font-black uppercase tracking-normal outline-none appearance-none cursor-pointer text-main hover:opacity-70 transition-all">
            <option value="newest" class="bg-surface text-main">Newest</option>
            <option value="oldest" class="bg-surface text-main">Oldest</option>
            <option value="name" class="bg-surface text-main">A–Z</option>
          </select>
          <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim/60">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex flex-col animate-pulse">
      <!-- Toolbar skeleton -->
      <div class="bg-card rounded-2xl mb-12 h-14 flex items-center px-4 gap-4">
        <div class="w-4 h-4 bg-surface-alt rounded-full shrink-0"></div>
        <div class="h-3 w-48 bg-surface-alt rounded flex-1 max-w-xs"></div>
        <div class="w-px h-6 bg-white/20 shrink-0 ml-auto"></div>
        <div class="h-3 w-16 bg-surface-alt rounded"></div>
        <div class="w-3 h-3 bg-surface-alt rounded shrink-0"></div>
      </div>
      <!-- Cards grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="n in 4" :key="n" class="h-[300px] bg-card rounded-2xl overflow-hidden flex flex-col">
          <div class="h-[180px] w-full bg-surface-alt shrink-0"></div>
          <div class="flex-1 p-5 flex flex-col justify-between">
            <div>
              <div class="h-3 w-3/4 bg-surface-alt rounded mb-2"></div>
              <div class="h-2 w-1/3 bg-surface-alt/60 rounded"></div>
            </div>
            <div class="flex items-center justify-between">
              <div class="w-7 h-7 bg-surface-alt rounded-lg"></div>
              <div class="w-7 h-7 bg-surface-alt rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <template v-else>
      <!-- Empty State: No tours yet -->
      <div v-if="!filteredSpaces.length && !search" class="flex flex-col gap-8">
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
              <button @click="handleCreateTour" class="btn btn-primary flex-1 !py-5 shadow-2xl gap-1">
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
          class="group relative flex flex-col h-[300px] bg-card rounded-2xl border border-border dark:border-transparent overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer"
          @click="navigateTo(`/app/spaces/${space.id}`)"
        >
          <!-- Thumbnail -->
          <div class="h-[180px] w-full bg-surface-alt relative overflow-hidden border-b border-black/10 dark:border-white/5">
            <NuxtImg
              v-if="space.cover_image_url && !failedImages.has(space.id)"
              :src="space.cover_image_url"
              :alt="space.title"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              width="400"
              height="225"
              format="webp"
              quality="80"
              loading="lazy"
              @error="failedImages.add(space.id)"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-surface-alt group-hover:bg-surface transition-colors duration-500 text-dim/20">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </div>
            
            <!-- Badges -->
            <div class="absolute top-4 left-4 flex gap-2">
              <span :class="['px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-md transition-all', space.is_published ? 'bg-emerald-500 text-bg' : 'bg-surface/80 text-dim']">
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
                <button class="p-1.5 hover:bg-surface-alt rounded-lg text-dim hover:text-main transition-colors" @click.stop="openShare(space)" title="Share">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
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
        <div class="px-6 py-5 flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-dim/30">
          <div class="w-14 flex-shrink-0"></div>
          <div class="flex-1">Domain & Project</div>
          <div class="w-40 hidden md:block">Technology</div>
          <div class="w-32 hidden md:block">Status</div>
          <div class="w-48 hidden lg:block text-right pr-20">Last Sync</div>
          <div class="w-32 text-right invisible">Actions</div>
        </div>
        
        <div
          v-for="space in filteredSpaces"
          :key="space.id"
          class="group px-6 py-4 flex items-center gap-6 bg-surface-alt/10 hover:bg-surface-alt/40 border border-border/20 dark:border-transparent hover:border-main/20 rounded-[1.25rem] transition-all duration-500 cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-0.5"
          @click="navigateTo(`/app/spaces/${space.id}`)"
        >
          <!-- Premium Compact Thumb -->
          <div class="w-14 h-14 rounded-2xl bg-surface-alt border border-border/40 dark:border-transparent overflow-hidden flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-700">
             <NuxtImg
               v-if="space.cover_image_url && !failedImages.has(space.id)"
               :src="space.cover_image_url"
               :alt="space.title"
               class="w-full h-full object-cover"
               width="56"
               height="56"
               format="webp"
               quality="80"
               loading="lazy"
               @error="failedImages.add(space.id)"
             />
             <div v-else class="w-full h-full flex items-center justify-center bg-surface-alt text-dim/20">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
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
            <span class="text-[9px] font-black text-main/60 uppercase px-3 py-1 bg-main/[0.03] rounded-full border border-main/10 dark:border-transparent tracking-widest shadow-sm">360 WebXR</span>
          </div>

          <div class="w-32 hidden md:block">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-alt/50 rounded-xl border border-border/20 dark:border-transparent group-hover:bg-main/5 transition-colors">
              <div :class="['w-1.5 h-1.5 rounded-full', space.is_published ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-dim/20']"></div>
              <span class="text-[9px] font-black uppercase tracking-widest text-main/60">{{ space.is_published ? 'Live' : 'Draft' }}</span>
            </div>
          </div>

          <div class="w-48 hidden lg:block text-right pr-20">
            <span class="text-[11px] font-bold text-dim/60 tracking-tight">{{ formatDate(space.created_at) }}</span>
          </div>

          <div class="w-32 flex justify-end gap-1.5">
            <button class="w-10 h-10 flex items-center justify-center bg-surface-alt/50 hover:bg-main hover:text-bg border border-border/20 dark:border-transparent rounded-xl transition-all duration-300 shadow-sm" @click.stop="navigateTo(`/app/spaces/${space.id}`)" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="w-10 h-10 flex items-center justify-center bg-surface-alt/50 hover:bg-main hover:text-bg border border-border/20 dark:border-transparent rounded-xl transition-all duration-300 shadow-sm" @click.stop="openShare(space)" title="Share">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button class="w-10 h-10 flex items-center justify-center bg-surface-alt/50 hover:bg-rose-500 hover:text-white border border-border/20 dark:border-transparent rounded-xl transition-all duration-300 shadow-sm" @click.stop="confirmDelete(space)" title="Delete">
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

      <!-- Share Modal -->
      <Transition name="share-modal">
        <div v-if="spaceToShare" class="share-overlay" @click.self="spaceToShare = null">
          <div class="share-modal" role="dialog" aria-modal="true" aria-label="Share your tour">
            <div class="share-modal__topbar">
              <h2 class="share-modal__title">Share</h2>
              <button class="share-modal__close" @click="spaceToShare = null" aria-label="Close share dialog">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="share-modal__tabs" role="tablist">
              <button v-for="tab in shareTabs" :key="tab.id" type="button" class="share-modal__tab" :class="{ 'share-modal__tab--active': shareTab === tab.id }" :aria-selected="shareTab === tab.id" role="tab" @click="shareTab = tab.id">{{ tab.label }}</button>
            </div>

            <div class="share-modal__body">
              <!-- Send a link -->
              <div v-if="shareTab === 'link'" class="share-modal__panel" role="tabpanel">
                <p class="share-modal__eyebrow">Link to share</p>
                <div class="share-modal__link-row">
                  <span class="share-modal__link">{{ publicUrl }}</span>
                  <button class="share-modal__copy" @click="copyShareUrl">
                    <template v-if="urlCopied">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      Copied
                    </template>
                    <template v-else>Copy link</template>
                  </button>
                </div>
                <div class="share-modal__share-row">
                  <a :href="shareWhatsappHref" target="_blank" rel="noopener" class="share-modal__share-item">
                    <span class="share-modal__share-icon share-modal__share-icon--whatsapp">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.49 2 2 6.48 2 12c0 1.89.52 3.66 1.42 5.18L2 22l4.98-1.39A9.96 9.96 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm5.8 14.16c-.24.68-1.44 1.32-1.98 1.39-.52.07-1.2.1-1.95-.12-.46-.14-1.05-.33-1.81-.66-3.18-1.38-5.24-4.6-5.39-4.81-.14-.21-1.3-1.73-1.3-3.3s.79-2.34 1.07-2.66c.28-.32.61-.4.82-.4h.58c.19 0 .45-.07.7.53.24.6.82 2.07.89 2.22.07.15.12.33.02.54-.1.21-.15.34-.3.52-.15.18-.31.4-.45.53-.15.16-.3.33-.13.63.16.31.71 1.17 1.52 1.9 1.04.92 1.9 1.21 2.22 1.37.31.16.49.14.67-.08.18-.22.77-.9.98-1.2.2-.31.4-.26.67-.16.28.1 1.74.82 2.04.97.3.14.5.22.58.34.08.12.08.74-.17 1.42Z"/></svg>
                    </span>
                    <span class="share-modal__share-label">WhatsApp</span>
                  </a>
                  <a :href="shareXHref" target="_blank" rel="noopener" class="share-modal__share-item">
                    <span class="share-modal__share-icon share-modal__share-icon--x">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.78 7.72L23.2 22h-6.4l-5-6.58L5.98 22H2.84l7.2-8.2L.8 2h6.55l4.53 5.98L18.9 2Zm-1.12 18h1.72L6.42 3.94H4.58L17.78 20Z"/></svg>
                    </span>
                    <span class="share-modal__share-label">X</span>
                  </a>
                  <a :href="shareGmailHref" class="share-modal__share-item">
                    <span class="share-modal__share-icon share-modal__share-icon--gmail">
                      <svg viewBox="0 0 24 24" fill="none"><path d="M4 6.5h16v11H4z" fill="currentColor" opacity="0.16"/><path d="M4 6.5 12 12 20 6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 7.2 12 12.1 19.2 7.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <span class="share-modal__share-label">Gmail</span>
                  </a>
                </div>
              </div>

              <!-- Embed -->
              <div v-else-if="shareTab === 'embed'" class="share-modal__panel" role="tabpanel">
                <p class="share-modal__eyebrow">Embed</p>
                <div class="share-modal__link-row share-modal__link-row--code">
                  <code class="share-modal__link share-modal__link--code">{{ shareEmbedCode }}</code>
                  <button class="share-modal__copy" @click="copyEmbedCode">
                    <template v-if="embedCopied">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      Copied
                    </template>
                    <template v-else>Copy iframe</template>
                  </button>
                </div>
                <div class="share-modal__preview-card">
                  <iframe :src="embedUrl" class="share-modal__preview-frame" title="Tour embed preview" loading="lazy" referrerpolicy="no-referrer" />
                </div>
              </div>

              <!-- QR Code -->
              <div v-else class="share-modal__panel share-modal__panel--qr" role="tabpanel">
                <p class="share-modal__eyebrow">QR code</p>
                <div class="share-modal__qr-card">
                  <div class="share-modal__qr-wrap">
                    <img v-if="!qrLoading && qrDataUrl" :src="qrDataUrl" alt="QR code" class="share-modal__qr-image" />
                    <div v-else class="share-modal__qr-placeholder">
                      <span class="share-modal__qr-loading" />
                    </div>
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
import { ref, computed, onMounted, watch } from 'vue'
import { useSpaces } from '~/composables/useSpaces'
import { usePlanStore } from '~/stores/plan'
import { navigateTo } from '#imports'
import { toast } from 'vue-sonner'
import type { Space } from '~/composables/useSpaces'
import QRCode from 'qrcode'
useSeoMeta({ title: 'Spaces | Viewora' })

const { spaces, pending, fetchSpaces, deleteSpace, publishSpace } = useSpaces()
const planStore = usePlanStore()

const search = ref('')
const searchInput = ref<HTMLInputElement>()
const sortBy = ref<'newest' | 'oldest' | 'name'>('newest')
const viewMode = ref<'grid' | 'list'>('grid')
// Delete
const spaceToDelete = ref<Space | null>(null)
const deleting = ref(false)

const atSpaceLimit = computed(() => {
  const max = planStore.plan?.max_active_spaces ?? Infinity
  const used = planStore.usage?.active_spaces_count ?? 0
  return used >= max
})

function handleCreateTour() {
  if (atSpaceLimit.value) {
    toast.error(`Tour limit reached (${planStore.plan?.max_active_spaces} on ${planStore.plan?.name || 'Free'} plan). Upgrade to create more.`, {
      action: { label: 'Upgrade', onClick: () => navigateTo('/app/billing') }
    })
    return
  }
  navigateTo('/app/create')
}

// Track images that failed to load (dev IPX proxy can't reach Supabase URLs)
const failedImages = ref(new Set<string>())

// Share
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
  } catch {
    showToast('Could not copy — please copy manually', 'error')
  }
}
async function copyEmbedCode() {
  try {
    await navigator.clipboard.writeText(shareEmbedCode.value)
    embedCopied.value = true
    setTimeout(() => { embedCopied.value = false }, 2000)
  } catch {
    showToast('Could not copy — please copy manually', 'error')
  }
}
watch(spaceToShare, async (space) => {
  shareTab.value = 'link'
  qrDataUrl.value = ''
  if (!space) return
  qrLoading.value = true
  try {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${space.slug || space.id}`
    qrDataUrl.value = await QRCode.toDataURL(url, {
      width: 192, margin: 2, errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' },
    })
  } catch {
    qrDataUrl.value = ''
  } finally {
    qrLoading.value = false
  }
})
const deleteMessage = computed(() => {
  if (!spaceToDelete.value) return ''
  return `Are you sure you want to permanently remove "${spaceToDelete.value.title}"? This will also delete all associated media and lead data.`
})

// Toast

onMounted(() => {
  fetchSpaces()
  planStore.fetchSubscriptionStatus().catch(() => {})
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
  if (type === 'error') {
    toast.error(message)
  } else {
    toast.success(message)
  }
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
/* ── Share Modal ── */
.share-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(60, 64, 67, 0.32);
  backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  padding: 18px;
}
.share-modal {
  width: 100%; max-width: 560px;
  background: #fff; border-radius: 16px;
  box-shadow: 0 1px 2px rgba(60,64,67,.3), 0 8px 24px rgba(60,64,67,.18);
  color: #202124; overflow: hidden;
}
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
.share-modal__preview-frame { display: block; width: 100%; height: 300px; border: 0; background: #fff; }
.share-modal__panel--qr { align-items: center; }
.share-modal__qr-card { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px; border: 1px solid #dadce0; border-radius: 16px; padding: 20px; background: #fff; }
.share-modal__qr-wrap { width: 192px; height: 192px; border-radius: 14px; border: 1px solid #e8eaed; display: flex; align-items: center; justify-content: center; background: #fff; }
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
