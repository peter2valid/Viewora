<template>
  <div class="app-page properties-page">
    <!-- Page header -->
    <div class="properties-header-wrapper">
      <div class="properties-header-top">
        <h1 class="properties-page-title">Properties</h1>
        <button class="btn btn-primary" @click="openCreateModal">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.4rem"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Property
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="properties-toolbar">
      <div class="properties-search-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="properties-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" type="text" class="properties-search-input" placeholder="Search properties" autocomplete="off" />
      </div>
      <div class="properties-toolbar-spacer"></div>
      <div class="properties-sort-wrapper">
        <select v-model="sortBy" class="properties-sort-select">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">A → Z</option>
        </select>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="properties-sort-icon"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="app-state-box app-state-box--error">
      <p>{{ error }}</p>
      <button class="btn btn-secondary" @click="fetchProperties">Retry</button>
    </div>

    <!-- Grid -->
    <div v-else class="properties-grid">
      <!-- Add card -->
      <div class="property-card property-card--add" @click="openCreateModal">
        <div class="property-add-content">
          <div class="property-add-icon-wrapper property-add-icon-wrapper--cyan">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <span class="property-add-text">New Property</span>
        </div>
      </div>

      <!-- Skeletons -->
      <template v-if="pending">
        <div v-for="n in 4" :key="n" class="property-card property-card--skeleton">
          <div class="property-card-thumbnail" style="background: var(--border);"></div>
          <div class="property-card-body">
            <div class="skeleton-line skeleton-line--title"></div>
            <div class="skeleton-line skeleton-line--meta" style="width: 40%; margin-top: 0.5rem;"></div>
          </div>
        </div>
      </template>

      <!-- Property cards -->
      <template v-else>
      <div v-for="property in filteredProperties" :key="property.id" class="property-card">
      <div class="property-card-thumbnail prop-thumb" :class="property.is_published ? 'prop-thumb--live' : 'prop-thumb--draft'">
        <div class="property-status-badge">{{ property.is_published ? 'Published' : 'Draft' }}</div>
      </div>

      <div class="property-card-body">
        <h3 class="property-card-title">{{ property.title }}</h3>
        <div class="property-card-meta">
          <div class="property-meta-group">
            <span class="property-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {{ formatDate(property.created_at) }}
            </span>
            <a
              v-if="property.is_published && property.slug"
              :href="`/p/${property.slug}`"
              target="_blank"
              rel="noopener"
              class="property-meta-item property-meta-link"
              @click.stop
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              View
            </a>
          </div>

          <div class="property-more-wrapper">
            <button class="property-more-btn" @click.stop.prevent="toggleDropdown(property.id, $event)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
            </button>
            <div v-if="activeDropdown === property.id" class="property-dropdown-menu">
              <button class="property-dropdown-item" @click="handleTogglePublish(property)">
                {{ property.is_published ? 'Unpublish' : 'Publish' }}
              </button>
              <button class="property-dropdown-item text-danger" @click="confirmDelete(property)">
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
              <h3 class="modal-title">New Property</h3>
              <button class="modal-close" @click="closeCreateModal" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div v-if="modalError" class="modal-error">{{ modalError }}</div>
            <form @submit.prevent="handleCreate">
              <div class="modal-body">
                <div class="form-group mb-4">
                  <label class="form-label" for="prop-name">Property name <span class="required">*</span></label>
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
                    placeholder="Brief description of the property…"
                    style="resize: vertical;"
                  ></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeCreateModal">Cancel</button>
                <button type="submit" class="btn btn-dark" :disabled="creating">
                  <span v-if="creating" class="btn-spinner-xs" style="margin-right:0.5rem"></span>
                  {{ creating ? 'Creating…' : 'Create Property' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <!-- Delete Confirm -->
      <Transition name="modal">
        <div v-if="propertyToDelete" class="modal-backdrop" @click.self="propertyToDelete = null">
          <div class="modal-card" style="max-width:400px;">
            <div class="modal-header">
              <h3 class="modal-title">Delete Property</h3>
              <button class="modal-close" @click="propertyToDelete = null" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <p class="text-muted text-sm">
                Permanently delete <strong style="color:var(--ink)">"{{ propertyToDelete.title }}"</strong>?
                This will also remove all leads and analytics. This cannot be undone.
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="propertyToDelete = null">Cancel</button>
              <button class="btn btn-danger" :disabled="deleting" @click="handleDelete">
                <span v-if="deleting" class="btn-spinner-xs" style="margin-right:0.5rem"></span>
                {{ deleting ? 'Deleting…' : 'Delete Property' }}
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
import type { Property } from '~/composables/useProperties'
useSeoMeta({ title: 'Properties | Viewora' })

const { properties, pending, error, fetchProperties, createProperty, deleteProperty, publishProperty } = useProperties()

const search = ref('')
const sortBy = ref<'newest' | 'oldest' | 'name'>('newest')
const activeDropdown = ref<string | null>(null)

// Create modal
const showCreateModal = ref(false)
const createForm = ref({ name: '', description: '' })
const modalError = ref<string | null>(null)
const creating = ref(false)

// Delete
const propertyToDelete = ref<Property | null>(null)
const deleting = ref(false)

// Toast
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  fetchProperties()
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

const filteredProperties = computed(() => {
  let list = properties.value.slice()
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
    const property = await createProperty({ title: createForm.value.name, description: createForm.value.description || undefined })
    closeCreateModal()
    showToast(`"${property.title}" created`)
  } catch (e: any) {
    modalError.value = e.data?.statusMessage ?? e.message ?? 'Failed to create property.'
  } finally {
    creating.value = false
  }
}

// Publish
const handleTogglePublish = async (property: Property) => {
  const isLive = property.is_published
  try {
    await publishProperty(property.id, !isLive)
    activeDropdown.value = null
    showToast(isLive ? `"${property.title}" unpublished` : `"${property.title}" is now live`)
  } catch (e: any) {
    showToast(e.data?.statusMessage ?? 'Failed to update publish status.', 'error')
  }
}

// Delete
const confirmDelete = (property: Property) => {
  propertyToDelete.value = property
  activeDropdown.value = null
}
const handleDelete = async () => {
  if (!propertyToDelete.value) return
  deleting.value = true
  const title = propertyToDelete.value.title
  try {
    await deleteProperty(propertyToDelete.value.id)
    propertyToDelete.value = null
    showToast(`"${title}" deleted`)
  } catch (e: any) {
    showToast(e.data?.statusMessage ?? 'Failed to delete property.', 'error')
  } finally {
    deleting.value = false
    propertyToDelete.value = null
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

.property-meta-link {
  color: var(--accent) !important;
  text-decoration: none;
  font-weight: 600;
}
.property-meta-link:hover { text-decoration: underline; }
</style>
