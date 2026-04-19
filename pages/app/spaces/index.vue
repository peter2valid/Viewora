<template>
  <div class="h-full flex flex-col">
    <!-- Page header -->
    <header class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-zinc-950">Spaces</h1>
        <p class="text-sm text-zinc-500 mt-1">Manage and organize your virtual tours.</p>
      </div>
      <button 
        class="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors shadow-sm" 
        @click="navigateTo('/app/create')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        + Create Tour
      </button>
    </header>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-3 rounded-xl border border-zinc-200 shadow-sm mb-6">
      <div class="relative w-full sm:w-72">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" type="text" class="w-full pl-9 pr-4 py-1.5 bg-transparent border-transparent focus:ring-0 text-sm outline-none placeholder:text-zinc-400" placeholder="Search spaces..." />
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-zinc-100 pt-3 sm:pt-0 sm:pl-3">
        <select v-model="sortBy" class="w-full sm:w-auto pl-3 pr-8 py-1.5 bg-transparent border-transparent text-sm outline-none appearance-none cursor-pointer text-zinc-600 font-medium hover:text-zinc-900 transition-colors">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">A → Z</option>
        </select>
      </div>
    </div>

    <!-- Grid -->
    <div v-if="!error" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

      <!-- Skeletons -->
      <template v-if="pending">
        <div v-for="n in 4" :key="n" class="h-64 bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col animate-pulse">
          <div class="h-2/3 w-full bg-zinc-100"></div>
          <div class="flex-1 p-4 flex flex-col justify-between">
            <div class="h-4 bg-zinc-100 rounded w-3/4"></div>
            <div class="h-3 bg-zinc-100 rounded w-1/4"></div>
          </div>
        </div>
      </template>

      <!-- Space cards -->
      <template v-else>
        <!-- Empty State: no spaces at all -->
        <div v-if="!filteredSpaces.length && !search" class="col-span-full py-16 flex flex-col items-center justify-center text-center">
          <div class="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 text-left">
            <h2 class="text-2xl font-bold text-zinc-900 mb-2">👋 Welcome to Viewora</h2>
            <p class="text-zinc-500 mb-6 font-medium">Let's get your first interactive 360° tour up and running.</p>
            
            <div class="space-y-4 mb-8">
              <div class="flex items-start gap-3">
                <div class="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-900 shrink-0">1</div>
                <p class="text-sm font-medium text-zinc-700">Create your first tour</p>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-900 shrink-0">2</div>
                <p class="text-sm font-medium text-zinc-700">Upload your 360° image</p>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-900 shrink-0">3</div>
                <p class="text-sm font-medium text-zinc-700">Share with clients</p>
              </div>
            </div>

            <div class="flex flex-col gap-3">
              <button class="w-full py-3 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-colors shadow-sm" @click="navigateTo('/app/create')">
                + Create New Tour
              </button>
              <button class="w-full py-3 bg-white border border-zinc-200 text-zinc-900 text-sm font-bold rounded-xl hover:bg-zinc-50 transition-colors disabled:opacity-50" @click="generateDemoTour" :disabled="creatingDemo">
                {{ creatingDemo ? 'Creating Demo...' : 'View Demo Tour' }}
              </button>
            </div>
          </div>
        </div>
        <!-- Empty State: no search results -->
        <div v-else-if="!filteredSpaces.length && search" class="col-span-full py-16 flex flex-col items-center justify-center text-center">
          <p class="text-sm font-medium text-zinc-500 mb-2">No spaces match <span class="text-zinc-900">"{{ search }}"</span></p>
          <button class="text-sm font-medium text-emerald-600 hover:text-emerald-700" @click="search = ''">Clear search</button>
        </div>

        <div
          v-for="space in filteredSpaces"
          :key="space.id" 
          class="group relative flex flex-col h-64 bg-white rounded-xl border border-zinc-200 overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all duration-200 cursor-pointer"
          @click="navigateTo(`/app/spaces/${space.id}`)"
        >
          <!-- Thumbnail -->
          <div class="h-2/3 w-full bg-zinc-50 relative overflow-hidden border-b border-zinc-100">
            <div 
              v-if="space.cover_image_url"
              class="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
              :style="{ backgroundImage: `url(${space.cover_image_url})` }"
            ></div>
            <div 
              v-else
              :class="['w-full h-full flex items-center justify-center bg-zinc-100 transition-all duration-500 group-hover:bg-zinc-200']"
            >
               <svg v-if="!space.is_published" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-zinc-300"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>

            <!-- Badges -->
            <div class="absolute top-3 left-3 flex gap-2">
              <span 
                :class="['px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider shadow-sm border backdrop-blur-md', 
                         space.is_published 
                           ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' 
                           : 'bg-white/90 text-zinc-600 border-zinc-200/50']"
              >
                {{ space.is_published ? 'Published' : 'Draft' }}
              </span>
            </div>

            <!-- Quick Actions (Hover) -->
            <div class="absolute inset-0 bg-zinc-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
               <button 
                 class="w-8 h-8 flex items-center justify-center bg-white rounded-md text-zinc-900 shadow-sm hover:scale-105 transition-transform"
                 @click.stop="navigateTo(`/app/spaces/${space.id}`)"
                 title="Edit"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
               </button>
               <a 
                 v-if="space.is_published && space.slug"
                 :href="`/p/${space.slug}`"
                 target="_blank"
                 class="w-8 h-8 flex items-center justify-center bg-white rounded-md text-zinc-900 shadow-sm hover:scale-105 transition-transform"
                 @click.stop
                 title="View Live"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
               </a>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 p-4 flex flex-col justify-between">
            <h3 class="text-sm font-semibold text-zinc-900 truncate" :title="space.title">{{ space.title }}</h3>
            <div class="flex items-center justify-between mt-auto">
              <span class="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                {{ formatDate(space.created_at) }}
              </span>

              <!-- More menu -->
              <div class="relative">
                <button 
                  class="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-600 transition-colors"
                  @click.stop.prevent="toggleDropdown(space.id, $event)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
                </button>
                <div 
                  v-if="activeDropdown === space.id" 
                  class="absolute bottom-full right-0 mb-2 w-36 bg-white text-zinc-900 rounded-lg shadow-lg border border-zinc-200 p-1 z-20 flex flex-col"
                >
                  <button class="w-full text-left px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 rounded-md" @click.stop.prevent="handleTogglePublish(space)">
                    {{ space.is_published ? 'Unpublish' : 'Publish' }}
                  </button>
                  <button class="w-full text-left px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-md" @click.stop.prevent="confirmDelete(space)">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

    </div>

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
        <div v-if="toast" :class="['fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold transition-all', toast.type === 'success' ? 'bg-zinc-950 text-white' : 'bg-red-600 text-white']">
          <div class="w-6 h-6 rounded-full flex items-center justify-center" :class="toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/20 text-white'">
            <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          {{ toast.message }}
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
