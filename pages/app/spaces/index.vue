<template>
  <div class="app-page">

    <!-- Page header -->
    <div class="app-page-header">
      <div>
        <h1 class="app-page-title">Spaces</h1>
        <p class="app-page-subtitle">Your 360° virtual tour spaces.</p>
      </div>
      <button class="btn btn-dark" @click="openCreateModal">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.25rem;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        New Space
      </button>
    </div>

    <!-- Stats bar -->
    <div v-if="!pending && !error && spaces.length > 0" class="spaces-stats">
      <div class="spaces-stat">
        <span class="spaces-stat-value">{{ spaces.length }}</span>
        <span class="spaces-stat-label">{{ spaces.length === 1 ? 'Space' : 'Spaces' }}</span>
      </div>
      <div class="spaces-stat-divider"></div>
      <div class="spaces-stat">
        <span class="spaces-stat-value spaces-stat-value--live">{{ publishedCount }}</span>
        <span class="spaces-stat-label">Live</span>
      </div>
      <div class="spaces-stat-divider"></div>
      <div class="spaces-stat">
        <span class="spaces-stat-value">{{ draftCount }}</span>
        <span class="spaces-stat-label">Draft</span>
      </div>
    </div>

    <!-- Toolbar (search + sort) -->
    <div v-if="!pending && !error && spaces.length > 0" class="spaces-toolbar">
      <div class="spaces-search">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spaces-search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input v-model="search" type="text" class="spaces-search-input" placeholder="Search spaces…" autocomplete="off" />
        <button v-if="search" class="spaces-search-clear" @click="search = ''" aria-label="Clear search">×</button>
      </div>
      <select v-model="sortBy" class="spaces-sort">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="name">A → Z</option>
        <option value="status">Live first</option>
      </select>
    </div>

    <!-- Loading skeletons -->
    <div v-if="pending" class="spaces-grid">
      <div v-for="n in 3" :key="n" class="space-card space-card--skeleton">
        <div class="space-card-accent" style="background: var(--border);"></div>
        <div class="space-card-body">
          <div class="skeleton-line skeleton-line--badge"></div>
          <div class="skeleton-line skeleton-line--title"></div>
          <div class="skeleton-line skeleton-line--meta"></div>
          <div class="skeleton-line skeleton-line--meta" style="width: 40%;"></div>
        </div>
        <div class="space-card-footer" style="display: flex; gap: 0.5rem;">
          <div class="skeleton-line" style="width: 80px; height: 32px; border-radius: 6px; margin: 0;"></div>
          <div class="skeleton-line" style="width: 56px; height: 32px; border-radius: 6px; margin: 0;"></div>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="app-state-box app-state-box--error">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <p>{{ isSchemaError ? 'Database not set up yet — run migration 004 in your Supabase Dashboard SQL Editor.' : error }}</p>
      <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem; flex-wrap: wrap; justify-content: center;">
        <button class="btn btn-secondary" style="color: #ef4444; border-color: #fca5a5;" @click="fetchSpaces">Retry</button>
        <a v-if="isSchemaError" href="https://supabase.com/dashboard" target="_blank" rel="noopener" class="btn btn-dark">Open Supabase →</a>
      </div>
    </div>

    <!-- Empty state (no spaces exist) -->
    <div v-else-if="spaces.length === 0" class="spaces-empty">
      <div class="spaces-empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
      </div>
      <h3 class="spaces-empty-title">No spaces yet</h3>
      <p class="spaces-empty-desc">Create your first space to start building interactive 360° virtual tours.</p>
      <div class="spaces-empty-steps">
        <div class="spaces-empty-step">
          <span class="spaces-empty-step-num">1</span>
          <span>Create a space</span>
        </div>
        <div class="spaces-empty-step-arrow">→</div>
        <div class="spaces-empty-step">
          <span class="spaces-empty-step-num">2</span>
          <span>Upload panoramas</span>
        </div>
        <div class="spaces-empty-step-arrow">→</div>
        <div class="spaces-empty-step">
          <span class="spaces-empty-step-num">3</span>
          <span>Add hotspots &amp; publish</span>
        </div>
      </div>
      <button class="btn btn-dark" @click="openCreateModal">Create Your First Space →</button>
    </div>

    <!-- No search results -->
    <div v-else-if="filteredSpaces.length === 0" class="app-state-box">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <p>No spaces match <strong>"{{ search }}"</strong></p>
      <button class="btn btn-secondary" @click="search = ''">Clear search</button>
    </div>

    <!-- Spaces grid -->
    <div v-else class="spaces-grid">
      <article
        v-for="(space, i) in filteredSpaces"
        :key="space.id"
        class="space-card"
        :style="{ animationDelay: `${i * 0.06}s` }"
      >
        <div :class="['space-card-accent', space.is_published ? 'space-card-accent--live' : '']"></div>
        <div class="space-card-body">
          <div class="space-card-meta-row">
            <span :class="['space-status-pill', space.is_published ? 'space-status-pill--live' : 'space-status-pill--draft']">
              <span class="space-status-dot"></span>
              {{ space.is_published ? 'Live' : 'Draft' }}
            </span>
            <button
              :class="['space-toggle-btn', space.is_published ? 'space-toggle-btn--unpublish' : 'space-toggle-btn--publish']"
              :disabled="toggling === space.id"
              @click.prevent="handleTogglePublish(space)"
              :title="space.is_published ? 'Unpublish this space' : 'Publish this space'"
            >
              {{ toggling === space.id ? '…' : space.is_published ? 'Unpublish' : 'Publish' }}
            </button>
          </div>
          <h3 class="space-card-name">{{ space.title }}</h3>
          <p v-if="space.description" class="space-card-meta" style="margin-top: 0.25rem; line-height: 1.4;">{{ space.description }}</p>
          <p class="space-card-meta" style="margin-top: 0.375rem; font-size: 0.72rem; color: var(--text-muted);">
            {{ relativeTime(space.created_at) }}
          </p>
        </div>
        <div class="space-card-footer" style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
          <NuxtLink :to="`/app/spaces/${space.id}`" class="btn btn-secondary space-card-btn">
            Open →
          </NuxtLink>
          <button class="space-delete-btn" @click="confirmDelete(space)" title="Delete space">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
          </button>
        </div>
      </article>
    </div>

    <!-- ── Modals + Toast via Teleport (fixes position:fixed in overflow:hidden shell) ── -->
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
                    placeholder="e.g. Nairobi Apartment"
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
                  <span v-if="creating" class="btn-spinner"></span>
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
                <span v-if="deleting" class="btn-spinner"></span>
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
import { ref, computed, onMounted } from 'vue'
import type { Space } from '~/composables/useSpaces'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Spaces | Viewora' })

const { spaces, pending, error, fetchSpaces, createSpace, deleteSpace, togglePublish } = useSpaces()

// UI state
const showModal = ref(false)
const spaceToDelete = ref<Space | null>(null)
const newSpaceForm = ref({ title: '', description: '' })
const modalError = ref<string | null>(null)
const creating = ref(false)
const deleting = ref(false)
const toggling = ref<string | null>(null)
const search = ref('')
const sortBy = ref<'newest' | 'oldest' | 'name' | 'status'>('newest')
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => fetchSpaces())

// Computed
const publishedCount = computed(() => spaces.value.filter(s => s.is_published).length)
const draftCount = computed(() => spaces.value.filter(s => !s.is_published).length)
const isSchemaError = computed(() => !!error.value?.includes('schema cache'))

const filteredSpaces = computed(() => {
  let list = spaces.value.slice()
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(s =>
      s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
    )
  }
  if (sortBy.value === 'oldest') list.sort((a, b) => a.created_at.localeCompare(b.created_at))
  else if (sortBy.value === 'name') list.sort((a, b) => a.title.localeCompare(b.title))
  else if (sortBy.value === 'status') list.sort((a, b) => Number(b.is_published) - Number(a.is_published))
  else list.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return list
})

// Helpers
const relativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
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
      navigateTo(`/app/spaces/${newSpace.id}`)
    } else {
      modalError.value = error.value ?? 'Failed to create space.'
    }
  } finally {
    creating.value = false
  }
}

const confirmDelete = (space: Space) => { spaceToDelete.value = space }

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
  toggling.value = space.id
  const wasLive = space.is_published
  await togglePublish(space)
  toggling.value = null
  if (error.value) showToast(error.value, 'error')
  else showToast(wasLive ? `"${space.title}" unpublished` : `"${space.title}" is now live`)
}
</script>
