<template>
  <div class="h-full flex flex-col">
    <!-- Page header -->
    <header class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-main">Tours</h1>
        <p class="text-sm text-dim mt-1">Manage and organize your virtual tours.</p>
      </div>
      <!-- Filters & Actions -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div class="flex items-center gap-2 p-1 bg-surface-alt border border-border rounded-xl">
          <button 
            v-for="f in ['all', 'published', 'draft']" 
            :key="f"
            @click="filterStatus = f"
            class="px-5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest rounded-lg transition-all duration-200"
            :class="filterStatus === f ? 'bg-main text-bg shadow-lg' : 'text-dim hover:text-main'"
          >
            {{ f }}
          </button>
        </div>
        
        <div class="flex items-center gap-3">
          <button 
            @click="navigateTo('/app/create')"
            class="btn btn-primary gap-2 !px-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Tour
          </button>
        </div>
      </div>
    </header>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-4 items-center justify-between card-glass p-2.5 !rounded-2xl border border-border shadow-sm mb-12">
      <div class="relative w-full sm:w-80 group">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="absolute left-4 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-main transition-colors"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" type="text" class="w-full pl-11 pr-5 py-2.5 bg-transparent border-none focus:ring-0 text-sm font-bold outline-none placeholder:text-dim/60 text-main" placeholder="Search your property domain..." />
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-3">
        <select v-model="sortBy" class="w-full sm:w-auto pl-4 pr-10 py-2 bg-transparent border-transparent text-xs font-black uppercase tracking-widest outline-none appearance-none cursor-pointer text-main hover:text-main transition-colors">
          <option value="newest">Sort: Chronological</option>
          <option value="oldest">Sort: Legacy</option>
          <option value="name">Sort: Alphabetical</option>
        </select>
      </div>
    </div>

    <!-- Grid -->
    <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="n in 4" :key="n" class="h-64 card-glass overflow-hidden animate-pulse">
         <div class="h-2/3 bg-surface-alt"></div>
         <div class="p-4 space-y-3">
            <div class="h-4 bg-surface-alt rounded-lg w-3/4"></div>
            <div class="h-3 bg-surface-alt rounded-lg w-1/2"></div>
         </div>
      </div>
    </div>

    <!-- Space cards -->
    <template v-else>
      <!-- Empty State: no spaces at all -->
      <div v-if="!filteredSpaces.length && !search" class="col-span-full py-12 md:py-24 animate-in fade-in zoom-in-95 duration-700">
        <div class="relative group mx-auto max-w-2xl px-4 w-full">
          <!-- iOS-style futuristic glass card -->
          <div class="absolute -inset-0.5 bg-main/5 blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000"></div>
          
          <div class="relative card-glass p-8 sm:p-12 md:p-16 !rounded-[3rem] border-main/10 shadow-2xl flex flex-col items-center text-center overflow-hidden">
            <div class="mb-8 flex items-center justify-center">
              <div class="w-16 h-16 rounded-full bg-main/10 flex items-center justify-center text-main">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              </div>
            </div>

            <h2 class="text-3xl font-black text-main mb-3 tracking-tight">Expand Your Reality</h2>
            <p class="text-dim mb-12 font-bold text-base max-w-md">Your portfolio is currently a clean slate. Start capturing spaces to build your brand.</p>
            
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md z-10">
              <button @click="navigateTo('/app/create')" class="btn btn-primary flex-1 !py-5 !rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create First Tour
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Empty State: no search results -->
      <div v-else-if="!filteredSpaces.length && search" class="col-span-full py-16 flex flex-col items-center justify-center text-center">
        <p class="text-sm font-medium text-zinc-500  mb-2">No spaces match <span class="text-zinc-900 ">"{{ search }}"</span></p>
        <button class="text-sm font-medium text-zinc-500  hover:text-zinc-900 " @click="search = ''">Clear search</button>
      </div>

      <div
        v-for="space in filteredSpaces"
        :key="space.id" 
        class="group relative flex flex-col h-[280px] bg-card rounded-2xl border border-border overflow-hidden hover:border-text-dim hover:shadow-lg transition-all duration-300 cursor-pointer"
        @click="navigateTo(`/app/spaces/${space.id}`)"
      >
        <!-- Thumbnail -->
        <div class="h-2/3 w-full bg-surface-alt relative overflow-hidden border-b border-border">
          <div 
            v-if="space.cover_image_url"
            class="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
            :style="{ backgroundImage: `url(${space.cover_image_url})` }"
          ></div>
          <div 
            v-else
            :class="['w-full h-full flex items-center justify-center bg-surface-alt transition-all duration-500 group-hover:bg-surface']"
          >
             <svg v-if="!space.is_published" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-dim/20"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>

          <div class="absolute top-4 left-4 flex gap-2">
            <span 
              :class="['px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest shadow-lg border backdrop-blur-md transition-all', 
                       space.is_published 
                         ? 'bg-emerald-500 text-bg border-emerald-400' 
                         : 'bg-surface-alt text-dim border-border']"
            >
              {{ space.is_published ? 'Published' : 'Draft' }}
            </span>
          </div>

          <!-- Quick Actions (Hover) -->
          <div class="absolute inset-0 bg-main/5 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px]">
             <button 
               class="w-11 h-11 flex items-center justify-center bg-surface border border-border rounded-xl text-dim shadow-xl hover:bg-main hover:text-bg hover:border-main transition-all duration-300 active:scale-90"
               @click.stop="navigateTo(`/app/spaces/${space.id}`)"
               title="Edit"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
             </button>
             <a 
               v-if="space.is_published && space.slug"
               :href="`/p/${space.slug}`"
               target="_blank"
               class="w-11 h-11 flex items-center justify-center bg-surface border border-border rounded-xl text-dim shadow-xl hover:bg-main hover:text-bg hover:border-main transition-all duration-300 active:scale-90"
               @click.stop
               title="View Live"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
             </a>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 p-4 flex flex-col justify-between">
          <h3 class="text-sm font-semibold text-main truncate" :title="space.title">{{ space.title }}</h3>
          <div class="flex items-center justify-between mt-auto">
            <span class="text-xs font-medium text-dim flex items-center gap-1.5">
              {{ formatDate(space.created_at) }}
            </span>

            <!-- More menu -->
            <div class="relative">
              <button 
                class="p-1 hover:bg-surface-alt rounded text-dim hover:text-main transition-colors"
                @click.stop.prevent="toggleDropdown(space.id, $event)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
              </button>
              <div 
                v-if="activeDropdown === space.id" 
                class="absolute bottom-full right-0 mb-2 w-36 bg-card text-main rounded-lg shadow-lg border border-border p-1 z-20 flex flex-col"
              >
                <button class="w-full text-left px-3 py-1.5 text-sm font-medium hover:bg-surface-alt rounded-md" @click.stop.prevent="handleTogglePublish(space)">
                  {{ space.is_published ? 'Unpublish' : 'Publish' }}
                </button>
                <button class="w-full text-left px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-500/10 rounded-md" @click.stop.prevent="confirmDelete(space)">
                  Delete
                </button>
              </div>
            </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSpaces } from '~/composables/useSpaces'
import { navigateTo } from '#imports'
import type { Space } from '~/composables/useSpaces'
useSeoMeta({ title: 'Spaces | Viewora' })

const { spaces, pending, error, fetchSpaces, createSpace, deleteSpace, publishSpace } = useSpaces()

const search = ref('')
const sortBy = ref<'newest' | 'oldest' | 'name'>('newest')
const activeDropdown = ref<string | null>(null)



// Delete
const spaceToDelete = ref<Space | null>(null)
const deleting = ref(false)

// Demo tour
const creatingDemo = ref(false)
const generateDemoTour = async () => {
  creatingDemo.value = true
  try {
    const space = await createSpace({
      title: 'Sample Apartment Tour',
      description: 'A pre-generated virtual tour to help you explore Viewora.',
      space_type: 'other'
    })
    navigateTo(`/app/spaces/${space.id}?tab=360`)
  } catch (e: any) {
    showToast(e.data?.statusMessage ?? e.message ?? 'Failed to create demo tour.', 'error')
  } finally {
    creatingDemo.value = false
  }
}

const deleteMessage = computed(() => {
  if (!spaceToDelete.value) return ''
  return `Are you sure you want to permanently remove "${spaceToDelete.value.title}"? This will also delete all associated media and lead data.`
})

// Toast
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  fetchSpaces()
  if (import.meta.client) window.addEventListener('click', closeDropdowns)
})
onUnmounted(() => {
  if (import.meta.client) window.removeEventListener('click', closeDropdowns)
})

const closeDropdowns = () => { activeDropdown.value = null }
const toggleDropdown = (id: string, e: Event) => {
  e.preventDefault()
  activeDropdown.value = activeDropdown.value === id ? null : id
}

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
    activeDropdown.value = null
    showToast(isLive ? `"${space.title}" unpublished` : `"${space.title}" is now live`)
  } catch (e: any) {
    showToast(e.data?.statusMessage ?? 'Failed to update publish status.', 'error')
  }
}

// Delete
const confirmDelete = (space: Space) => {
  spaceToDelete.value = space
  activeDropdown.value = null
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
