<template>
  <div class="app-page tours-page">
    <!-- Page header -->
    <div class="tours-header-wrapper">
      <div class="tours-header-top">
        <h1 class="tours-page-title">Your Tours</h1>
        <button class="btn btn-primary tours-live-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.4rem;"><path d="M15.6 11.6L22 7v10l-6.4-4.5v-1zM4 5h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7c0-1.1.9-2 2-2z"></path></svg>
          Talk Live Now
        </button>
      </div>

      <div class="tours-tabs">
        <button class="tours-tab active">My Tours</button>
        <button class="tours-tab">Shared with me</button>
        <button class="tours-tab">Published to GSV</button>
        <button class="tours-tab">Recycle Bin</button>
      </div>
    </div>

    <!-- Toolbar (search + filter) -->
    <div class="tours-toolbar">
      <div class="tours-search-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tours-search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input v-model="search" type="text" class="tours-search-input" placeholder="Search my tours" autocomplete="off" />
      </div>
      <div class="tours-filter-wrapper">
        <input type="text" class="tours-filter-input" placeholder="Filter by tags" readonly />
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tours-filter-icon"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      
      <div class="tours-toolbar-spacer"></div>
      
      <div class="tours-sort-wrapper">
        <select v-model="sortBy" class="tours-sort-select">
          <option value="newest">By date</option>
          <option value="oldest">Oldest first</option>
          <option value="name">A → Z</option>
        </select>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tours-sort-icon"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      
      <div class="tours-view-toggles">
        <button class="tours-view-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></button>
        <button class="tours-view-btn active"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="error" class="app-state-box app-state-box--error">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <p>{{ isSchemaError ? 'Database not set up yet — run migration 004 in your Supabase Dashboard SQL Editor.' : error }}</p>
      <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem; flex-wrap: wrap; justify-content: center;">
        <button class="btn btn-secondary" style="color: #ef4444; border-color: #fca5a5;" @click="fetchSpaces">Retry</button>
        <a v-if="isSchemaError" href="https://supabase.com/dashboard" target="_blank" rel="noopener" class="btn btn-dark">Open Supabase →</a>
      </div>
    </div>

    <!-- Tours grid -->
    <div v-else class="tours-grid">
      <!-- Fixed Add Cards -->
      <div class="tour-card tour-card--add" @click="openCreateModal">
        <div class="tour-add-content">
          <div class="tour-add-icon-wrapper tour-add-icon-wrapper--cyan">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <span class="tour-add-text">Create New Tour</span>
        </div>
      </div>
      
      <div class="tour-card tour-card--add tour-card--dashed">
        <div class="tour-add-content">
          <div class="tour-add-icon-wrapper tour-add-icon-wrapper--purple">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <span class="tour-add-text">Create New Collection</span>
        </div>
      </div>

      <!-- Loading skeletons -->
      <template v-if="pending">
        <div v-for="n in 5" :key="n" class="tour-card tour-card--skeleton">
          <div class="tour-card-thumbnail" style="background: var(--border);"></div>
          <div class="tour-card-body">
            <div class="skeleton-line skeleton-line--title"></div>
            <div class="skeleton-line skeleton-line--meta" style="width: 40%; margin-top: 0.5rem;"></div>
          </div>
        </div>
      </template>
      
      <!-- Actual Items -->
      <template v-else>
        <div v-for="(space, i) in filteredSpaces" :key="space.id" class="tour-card">
          <NuxtLink :to="`/app/spaces/${space.id}/editor`" class="tour-card-thumbnail">
            <!-- Background Image Placeholder (Fallback/Mock) -->
            <div class="tour-thumbnail-placeholder"></div>
            <div class="tour-status-badge">{{ space.is_published ? 'Published' : 'Unpublished' }}</div>
          </NuxtLink>
          <div class="tour-card-body">
            <NuxtLink :to="`/app/spaces/${space.id}/editor`" class="tour-title-link">
              <h3 class="tour-card-title">{{ space.title }}</h3>
            </NuxtLink>
            <div class="tour-card-meta">
              <div class="tour-meta-group">
                <span class="tour-meta-item" title="Views">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  0
                </span>
                <span class="tour-meta-item" title="Date Created">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  {{ formatDate(space.created_at) }}
                </span>
              </div>
              
              <!-- More Menu Dropdown -->
              <div class="tour-more-wrapper">
                <button class="tour-more-btn" @click.stop.prevent="toggleDropdown(space.id, $event)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle><circle cx="5" cy="12" r="1.5"></circle></svg>
                </button>
                <div v-if="activeDropdown === space.id" class="tour-dropdown-menu">
                  <button class="tour-dropdown-item" @click="handleTogglePublish(space)">
                    {{ space.is_published ? 'Unpublish' : 'Publish' }}
                  </button>
                  <NuxtLink :to="`/app/spaces/${space.id}`" class="tour-dropdown-item">
                    View Public Page
                  </NuxtLink>
                  <button class="tour-dropdown-item text-danger" @click="confirmDelete(space)">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ── Modals + Toast via Teleport ── -->
    <Teleport to="body">
      <!-- Create Modal -->
      <Transition name="modal">
        <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
          <div class="modal-card">
            <div class="modal-header">
              <h3 class="modal-title">New Space</h3>
              <button class="modal-close" @click="closeModal" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div v-if="modalError" class="modal-error">{{ modalError }}</div>
            <form @submit.prevent="handleCreateSpace">
              <div class="modal-body">
                <div class="form-group mb-4">
                  <label class="form-label" for="space-title">Title <span class="required">*</span></label>
                  <input
                    id="space-title"
                    v-model="newSpaceForm.title"
                    type="text"
                    class="form-input"
                    placeholder="e.g. Modern Apartment Virtual Tour"
                    required
                    autofocus
                  />
                </div>
                <div class="form-group">
                  <label class="form-label" for="space-desc">Description <span class="form-label-optional">(optional)</span></label>
                  <textarea
                    id="space-desc"
                    v-model="newSpaceForm.description"
                    class="form-input"
                    rows="2"
                    placeholder="Brief description of the space…"
                    style="resize: vertical;"
                  ></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
                <button type="submit" class="btn btn-dark" :disabled="creating">
                  <span v-if="creating" class="btn-spinner-xs" style="margin-right: 0.5rem"></span>
                  {{ creating ? 'Creating…' : 'Create Space' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <!-- Delete Confirm Modal -->
      <Transition name="modal">
        <div v-if="spaceToDelete" class="modal-backdrop" @click.self="spaceToDelete = null">
          <div class="modal-card" style="max-width: 400px;">
            <div class="modal-header">
              <h3 class="modal-title">Delete Space</h3>
              <button class="modal-close" @click="spaceToDelete = null" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div class="modal-body">
              <p class="text-muted text-sm">
                Permanently delete <strong style="color: var(--ink);">"{{ spaceToDelete.title }}"</strong> and all its scenes and hotspots?
                This cannot be undone.
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="spaceToDelete = null">Cancel</button>
              <button class="btn btn-danger" :disabled="deleting" @click="handleDelete">
                <span v-if="deleting" class="btn-spinner-xs" style="margin-right: 0.5rem"></span>
                {{ deleting ? 'Deleting…' : 'Delete Space' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Toast notification -->
      <Transition name="toast">
        <div v-if="toast" :class="['toast', `toast--${toast.type}`]">
          <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Space } from '~/composables/useSpaces'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Tours | Viewora' })

const { spaces, pending, error, fetchSpaces, createSpace, deleteSpace, togglePublish } = useSpaces()

// UI state
const showModal = ref(false)
const spaceToDelete = ref<Space | null>(null)
const newSpaceForm = ref({ title: '', description: '' })
const modalError = ref<string | null>(null)
const creating = ref(false)
const deleting = ref(false)
const search = ref('')
const sortBy = ref<'newest' | 'oldest' | 'name'>('newest')
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const activeDropdown = ref<string | null>(null)
const toggleDropdown = (id: string, event: Event) => {
  event.preventDefault()
  activeDropdown.value = activeDropdown.value === id ? null : id
}
const closeDropdowns = () => { activeDropdown.value = null }

onMounted(() => {
  fetchSpaces()
  if (import.meta.client) window.addEventListener('click', closeDropdowns)
})

onUnmounted(() => {
  if (import.meta.client) window.removeEventListener('click', closeDropdowns)
})

// Computed
const isSchemaError = computed(() => !!error.value?.includes('schema cache'))

const filteredSpaces = computed(() => {
  let list = spaces.value.slice()
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter((s: Space) =>
      s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
    )
  }
  if (sortBy.value === 'oldest') list.sort((a: Space, b: Space) => a.created_at.localeCompare(b.created_at))
  else if (sortBy.value === 'name') list.sort((a: Space, b: Space) => a.title.localeCompare(b.title))
  else list.sort((a: Space, b: Space) => b.created_at.localeCompare(a.created_at))
  return list
})

// Helpers
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  const month = d.toLocaleString('en-US', { month: 'short' })
  return `${month}. ${d.getDate()}, ${d.getFullYear()}`
}

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}

// Actions
const openCreateModal = () => {
  modalError.value = null
  newSpaceForm.value = { title: '', description: '' }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  newSpaceForm.value = { title: '', description: '' }
  modalError.value = null
}

const handleCreateSpace = async () => {
  creating.value = true
  modalError.value = null
  try {
    const newSpace = await createSpace(newSpaceForm.value)
    if (newSpace) {
      closeModal()
      showToast(`"${newSpace.title}" created`)
      navigateTo(`/app/spaces/${newSpace.id}/editor`)
    } else {
      modalError.value = error.value ?? 'Failed to create space.'
    }
  } finally {
    creating.value = false
  }
}

const confirmDelete = (space: Space) => {
  spaceToDelete.value = space
  activeDropdown.value = null
}

const handleDelete = async () => {
  if (!spaceToDelete.value) return
  deleting.value = true
  const name = spaceToDelete.value.title
  await deleteSpace(spaceToDelete.value.id)
  spaceToDelete.value = null
  deleting.value = false
  if (error.value) showToast(error.value, 'error')
  else showToast(`"${name}" deleted`)
}

const handleTogglePublish = async (space: Space) => {
  const wasLive = space.is_published
  await togglePublish(space)
  activeDropdown.value = null
  if (error.value) showToast(error.value, 'error')
  else showToast(wasLive ? `"${space.title}" unpublished` : `"${space.title}" is now live`)
}
</script>
