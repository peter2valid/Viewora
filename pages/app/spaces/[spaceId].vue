<template>
  <div class="app-page">
    <!-- Page Header -->
    <div class="app-page-header">
      <div>
        <NuxtLink to="/app/spaces" class="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          All Spaces
        </NuxtLink>
        <h1 class="app-page-title" style="margin-top: 0.5rem;">
          {{ space?.name ?? '…' }}
        </h1>
        <p class="app-page-subtitle">{{ typeLabel(space?.property_type) }}</p>
      </div>
      <button class="btn btn-primary" @click="showCreateModal = true">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Create Tour
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="pending" class="spaces-grid">
      <div v-for="n in 2" :key="n" class="space-card space-card--skeleton">
        <div class="skeleton-line skeleton-line--title"></div>
        <div class="skeleton-line skeleton-line--meta"></div>
        <div class="skeleton-line skeleton-line--badge"></div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="app-state-box app-state-box--error">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>{{ error }}</p>
      <button class="btn btn-secondary" @click="loadTours">Try Again</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="tours.length === 0" class="app-state-box">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
      </div>
      <h2 class="empty-title">No tours yet</h2>
      <p class="empty-desc">
        Create your first tour to start building an interactive 360° experience.
      </p>
      <button class="btn btn-primary btn-lg" @click="showCreateModal = true">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Create Your First Tour
      </button>
    </div>

    <!-- Tours grid -->
    <div v-else class="spaces-grid">
      <article
        v-for="tour in tours"
        :key="tour.id"
        class="space-card"
      >
        <!-- Status accent bar -->
        <div
          class="space-card-accent"
          :style="{ background: tour.status === 'published' ? '#10b981' : '#6b7280' }"
        ></div>

        <div class="space-card-body">
          <!-- Status badge -->
          <span
            class="space-type-badge"
            :style="{ background: tour.status === 'published' ? 'rgba(16,185,129,.12)' : 'rgba(107,114,128,.12)', color: tour.status === 'published' ? '#10b981' : '#9ca3af' }"
          >
            {{ tour.status === 'published' ? 'Live' : 'Draft' }}
          </span>

          <h3 class="space-card-name">{{ tour.title }}</h3>
          <p class="space-card-meta">Created {{ formatDate(tour.created_at) }}</p>
        </div>

        <div class="space-card-footer">
          <NuxtLink
            :to="`/app/tours/${tour.id}/edit`"
            class="btn btn-primary space-card-btn"
          >
            Open Editor
          </NuxtLink>
        </div>
      </article>
    </div>

    <!-- Create Tour Modal -->
    <AppCreateTourModal
      v-if="showCreateModal"
      :space-id="spaceId"
      @close="showCreateModal = false"
      @created="onTourCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const route = useRoute()
const spaceId = route.params.spaceId as string

useSeoMeta({ title: 'Tours | Viewora' })

// ── Space details ────────────────────────────────────────────────────────────
const supabase = useSupabaseClient()

interface SpaceRow {
  id: string
  name: string
  property_type: string
}

const space = ref<SpaceRow | null>(null)

async function loadSpace() {
  const { data } = await supabase
    .from('properties')
    .select('id, name, property_type')
    .eq('id', spaceId)
    .single()

  if (data) space.value = data
}

// ── Tours ────────────────────────────────────────────────────────────────────
const { tours, pending, error, fetchTours } = useTours()

async function loadTours() {
  await fetchTours(spaceId)
}

onMounted(async () => {
  await Promise.all([loadSpace(), loadTours()])
})

const showCreateModal = ref(false)

function onTourCreated(tourId: string) {
  showCreateModal.value = false
  navigateTo(`/app/tours/${tourId}/edit`)
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  residential: 'Residential',
  hospitality: 'Hospitality',
  commercial: 'Commercial',
  automotive: 'Automotive',
  events: 'Event Space',
  general: 'General',
}

function typeLabel(type: string | null | undefined): string {
  return TYPE_LABELS[type ?? ''] ?? 'Space'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>
