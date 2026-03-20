<template>
  <div class="space-y-8">
    <!-- Page header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-zinc-950">Spaces</h1>
        <p class="text-sm text-slate-500">Manage and organize your virtual tours.</p>
      </div>
      <button 
        class="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-all shadow-sm active:scale-95" 
        @click="openCreateModal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Space
      </button>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
      <div class="relative w-full sm:w-72">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" type="text" class="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-zinc-300 rounded-lg text-sm transition-all outline-none" placeholder="Search spaces..." />
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <select v-model="sortBy" class="w-full sm:w-auto pl-3 pr-8 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-zinc-300 rounded-lg text-sm transition-all outline-none appearance-none cursor-pointer">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">A → Z</option>
        </select>
      </div>
    </div>

    <!-- Grid -->
    <div v-if="!error" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <!-- Add card -->
      <button 
        class="group relative flex flex-col items-center justify-center gap-4 h-64 rounded-2xl border-2 border-dashed border-slate-200 bg-white hover:border-zinc-300 hover:bg-slate-50 transition-all duration-300"
        @click="openCreateModal"
      >
        <div class="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-white group-hover:shadow-md flex items-center justify-center text-slate-400 group-hover:text-zinc-600 transition-all duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
        <span class="text-sm font-bold text-slate-500 group-hover:text-zinc-900">Create New Space</span>
      </button>

      <!-- Skeletons -->
      <template v-if="pending">
        <div v-for="n in 4" :key="n" class="space-card space-card--skeleton">
          <div class="space-card-thumbnail" style="background: var(--border);"></div>
          <div class="space-card-body">
            <div class="skeleton-line skeleton-line--title"></div>
            <div class="skeleton-line skeleton-line--meta" style="width: 40%; margin-top: 0.5rem;"></div>
          </div>
        </div>
      </template>

      <!-- Space cards -->
      <template v-else>
        <div 
          v-for="space in filteredSpaces" 
          :key="space.id" 
          class="group relative flex flex-col h-64 bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-zinc-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          @click="navigateTo(`/app/spaces/${space.id}`)"
        >
          <!-- Thumbnail -->
          <div 
            class="h-2/3 w-full bg-slate-100 relative overflow-hidden"
          >
            <div 
              v-if="space.cover_image_url"
              class="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
              :style="{ backgroundImage: `url(${space.cover_image_url})` }"
            ></div>
            <div 
              v-else
              :class="['w-full h-full flex items-center justify-center bg-gradient-to-br transition-all duration-500 group-hover:opacity-80', 
                       space.is_published ? 'from-zinc-900 to-zinc-800' : 'from-slate-100 to-slate-200']"
            >
               <svg v-if="!space.is_published" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-slate-300"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>

            <!-- Badges -->
            <div class="absolute top-3 left-3 flex gap-2">
              <span 
                :class="['px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm border', 
                         space.is_published 
                           ? 'bg-emerald-500/90 text-white border-emerald-400/50' 
                           : 'bg-white/90 text-slate-600 border-slate-200/50']"
              >
                {{ space.is_published ? 'Published' : 'Draft' }}
              </span>
            </div>

            <!-- Quick Actions (Hover) -->
            <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
               <button 
                 class="p-2 bg-white rounded-lg text-zinc-950 shadow-lg hover:scale-110 active:scale-95 transition-all"
                 @click.stop="navigateTo(`/app/spaces/${space.id}`)"
                 title="Edit"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
               </button>
               <a 
                 v-if="space.is_published && space.slug"
                 :href="`/p/${space.slug}`"
                 target="_blank"
                 class="p-2 bg-white rounded-lg text-zinc-950 shadow-lg hover:scale-110 active:scale-95 transition-all"
                 @click.stop
                 title="View Live"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
               </a>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 p-4 flex flex-col justify-between">
            <h3 class="text-sm font-bold text-zinc-950 truncate">{{ space.title }}</h3>
            <div class="flex items-center justify-between mt-auto">
              <span class="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ formatDate(space.created_at) }}
              </span>

              <!-- More menu -->
              <div class="relative">
                <button 
                  class="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-zinc-600"
                  @click.stop.prevent="toggleDropdown(space.id, $event)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
                </button>
                <div 
                  v-if="activeDropdown === space.id" 
                  class="absolute bottom-full right-0 mb-2 w-40 bg-zinc-950 text-white rounded-xl shadow-2xl border border-zinc-800 p-1 z-20 flex flex-col"
                >
                  <button class="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-zinc-800 rounded-lg" @click="handleTogglePublish(space)">
                    {{ space.is_published ? 'Unpublish' : 'Publish' }}
                  </button>
                  <button class="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg" @click="confirmDelete(space)">
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
      <!-- Create Modal -->
      <Transition name="modal">
        <div v-if="showCreateModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm" @click.self="closeCreateModal">
          <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all duration-300">
            <div class="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <h3 class="text-lg font-bold text-zinc-950">New Space</h3>
              <button class="p-2 text-slate-400 hover:text-zinc-600 rounded-lg hover:bg-slate-50 transition-colors" @click="closeCreateModal">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <form @submit.prevent="handleCreate">
              <div class="p-6 space-y-6">
                <div v-if="modalError" class="p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-medium text-red-600">
                  {{ modalError }}
                </div>

                <div class="space-y-4">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[12px] font-bold text-zinc-500 uppercase tracking-wider" for="prop-name">Space Name</label>
                    <input
                      id="prop-name"
                      v-model="createForm.name"
                      type="text"
                      class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 rounded-xl text-sm transition-all outline-none"
                      placeholder="e.g. Luxury Beachfront Villa"
                      required
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[12px] font-bold text-zinc-500 uppercase tracking-wider" for="prop-desc">Description <span class="text-[10px] lowercase font-normal opacity-70">(optional)</span></label>
                    <textarea
                      id="prop-desc"
                      v-model="createForm.description"
                      class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 rounded-xl text-sm transition-all outline-none resize-none"
                      rows="3"
                      placeholder="Enter a brief overview..."
                    ></textarea>
                  </div>
                </div>
              </div>

              <div class="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                <button type="button" class="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-zinc-900" @click="closeCreateModal">Cancel</button>
                <button 
                  type="submit" 
                  class="px-5 py-2 bg-zinc-950 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 shadow-md active:scale-95 transition-all disabled:opacity-50"
                  :disabled="creating"
                >
                  {{ creating ? 'Creating...' : 'Create Space' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <!-- Delete Confirm -->
      <Transition name="modal">
        <div v-if="spaceToDelete" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm" @click.self="spaceToDelete = null">
          <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-6">
            <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </div>
            <div class="space-y-2">
              <h3 class="text-lg font-bold text-zinc-950">Delete Space</h3>
              <p class="text-sm text-slate-500">
                Are you sure you want to delete <span class="font-bold text-zinc-950">"{{ spaceToDelete.title }}"</span>? This action cannot be undone.
              </p>
            </div>
            <div class="flex gap-3 pt-2">
              <button class="flex-1 px-4 py-2 border border-slate-200 text-sm font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors" @click="spaceToDelete = null">Cancel</button>
              <button 
                class="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/20 active:scale-95 transition-all" 
                :disabled="deleting" 
                @click="handleDelete"
              >
                {{ deleting ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

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

// Create modal
const showCreateModal = ref(false)
const createForm = ref({ name: '', description: '' })
const modalError = ref<string | null>(null)
const creating = ref(false)

// Delete
const spaceToDelete = ref<Space | null>(null)
const deleting = ref(false)

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
  let list = spaces.value.slice()
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

// Create
const openCreateModal = () => {
  modalError.value = null
  createForm.value = { name: '', description: '' }
  showCreateModal.value = true
}
const closeCreateModal = () => {
  showCreateModal.value = false
  createForm.value = { name: '', description: '' }
  modalError.value = null
}
const handleCreate = async () => {
  creating.value = true
  modalError.value = null
  try {
    const space = await createSpace({ title: createForm.value.name, description: createForm.value.description || undefined })
    closeCreateModal()
    showToast(`"${space.title}" created`)
  } catch (e: any) {
    modalError.value = e.data?.statusMessage ?? e.message ?? 'Failed to create space.'
  } finally {
    creating.value = false
  }
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
