<template>
  <div class="app-page spaces-page">
    <!-- Page header -->
    <div class="spaces-header-wrapper">
      <div class="spaces-header-top">
        <h1 class="spaces-page-title">Spaces</h1>
        <button class="btn btn-primary" @click="openCreateModal">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.4rem"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Space
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="spaces-toolbar">
      <div class="spaces-search-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spaces-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" type="text" class="spaces-search-input" placeholder="Search spaces" autocomplete="off" />
      </div>
      <div class="spaces-toolbar-spacer"></div>
      <div class="spaces-sort-wrapper">
        <select v-model="sortBy" class="spaces-sort-select">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">A → Z</option>
        </select>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spaces-sort-icon"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="app-state-box app-state-box--error">
      <p>{{ error }}</p>
      <button class="btn btn-secondary" @click="fetchSpaces">Retry</button>
    </div>

    <!-- Grid -->
    <div v-else class="spaces-grid">
      <!-- Add card -->
      <div class="space-card space-card--add" @click="openCreateModal">
        <div class="space-add-content">
          <div class="space-add-icon-wrapper space-add-icon-wrapper--cyan">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <span class="space-add-text">New Space</span>
        </div>
      </div>

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
      <div v-for="space in filteredSpaces" :key="space.id" class="space-card" @click="navigateTo(`/app/spaces/${space.id}`)">
      <div class="space-card-thumbnail prop-thumb" :class="space.is_published ? 'prop-thumb--live' : 'prop-thumb--draft'">
        <div class="space-status-badge">{{ space.is_published ? 'Published' : 'Draft' }}</div>
      </div>

      <div class="space-card-body">
        <h3 class="space-card-title">{{ space.title }}</h3>
        <div class="space-card-meta">
          <div class="space-meta-group">
            <span class="space-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {{ formatDate(space.created_at) }}
            </span>
            <a
              v-if="space.is_published && space.slug"
              :href="`/p/${space.slug}`"
              target="_blank"
              rel="noopener"
              class="space-meta-item space-meta-link"
              @click.stop
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              View
            </a>
          </div>

          <div class="space-more-wrapper">
            <button class="space-more-btn" @click.stop.prevent="toggleDropdown(space.id, $event)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
            </button>
            <div v-if="activeDropdown === space.id" class="space-dropdown-menu">
              <button class="space-dropdown-item" @click="handleTogglePublish(space)">
                {{ space.is_published ? 'Unpublish' : 'Publish' }}
              </button>
              <button class="space-dropdown-item text-danger" @click="confirmDelete(space)">
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
        <div v-if="showCreateModal" class="modal-backdrop" @click.self="closeCreateModal">
          <div class="modal-card">
            <div class="modal-header">
              <h3 class="modal-title">New Space</h3>
              <button class="modal-close" @click="closeCreateModal" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div v-if="modalError" class="modal-error">{{ modalError }}</div>
            <form @submit.prevent="handleCreate">
              <div class="modal-body">
                <div class="form-group mb-4">
                  <label class="form-label" for="prop-name">Space name <span class="required">*</span></label>
                  <input
                    id="prop-name"
                    v-model="createForm.name"
                    type="text"
                    class="form-input"
                    placeholder="e.g. Luxury Karen Villa"
                    required
                    autofocus
                  />
                </div>
                <div class="form-group">
                  <label class="form-label" for="prop-desc">Description <span class="form-label-optional">(optional)</span></label>
                  <textarea
                    id="prop-desc"
                    v-model="createForm.description"
                    class="form-input"
                    rows="2"
                    placeholder="Brief description of the space…"
                    style="resize: vertical;"
                  ></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeCreateModal">Cancel</button>
                <button type="submit" class="btn btn-dark" :disabled="creating">
                  <span v-if="creating" class="btn-spinner-xs" style="margin-right:0.5rem"></span>
                  {{ creating ? 'Creating…' : 'Create Space' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <!-- Delete Confirm -->
      <Transition name="modal">
        <div v-if="spaceToDelete" class="modal-backdrop" @click.self="spaceToDelete = null">
          <div class="modal-card" style="max-width:400px;">
            <div class="modal-header">
              <h3 class="modal-title">Delete Space</h3>
              <button class="modal-close" @click="spaceToDelete = null" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <p class="text-muted text-sm">
                Permanently delete <strong style="color:var(--ink)">"{{ spaceToDelete.title }}"</strong>?
                This will also remove all leads and analytics. This cannot be undone.
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="spaceToDelete = null">Cancel</button>
              <button class="btn btn-danger" :disabled="deleting" @click="handleDelete">
                <span v-if="deleting" class="btn-spinner-xs" style="margin-right:0.5rem"></span>
                {{ deleting ? 'Deleting…' : 'Delete Space' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toast" :class="['toast', `toast--${toast.type}`]">
          <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
  bottom: 100%;
  right: 0;
  margin-bottom: 0.5rem;
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
