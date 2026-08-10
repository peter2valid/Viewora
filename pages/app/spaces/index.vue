<template>
  <div class="h-full flex flex-col">
    <UiPageHeader title="Tours" subtitle="Manage and organize your virtual tours.">
      <template #actions>
        <!-- View Toggle -->
        <div v-if="spaces.length > 0 || search" class="relative flex items-center p-1 bg-surface-alt rounded-lg w-24 h-10 overflow-hidden flex-shrink-0">
          <div
            class="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-main rounded-md shadow-sm transition-all duration-300 ease-out"
            :style="{ transform: viewMode === 'grid' ? 'translateX(0)' : 'translateX(100%)' }"
          ></div>
          <button
            @click="viewMode = 'grid'"
            class="relative z-10 flex-1 flex items-center justify-center transition-colors duration-300"
            :class="viewMode === 'grid' ? 'text-bg' : 'text-dim hover:text-main'"
            title="Grid View"
          >
            <UiIcon name="grid" :size="16" :stroke-width="2.5" />
          </button>
          <button
            @click="viewMode = 'list'"
            class="relative z-10 flex-1 flex items-center justify-center transition-colors duration-300"
            :class="viewMode === 'list' ? 'text-bg' : 'text-dim hover:text-main'"
            title="List View"
          >
            <UiIcon name="list" :size="16" :stroke-width="2.5" />
          </button>
        </div>

        <AppCaptureNudge variant="btn" />
        <UiButton variant="primary" @click="handleCreateTour">
          <UiIcon name="plus" :size="16" :stroke-width="2.5" />
          Create Tour
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Toolbar (Only if we have spaces) -->
    <div v-if="spaces.length > 0 || search" class="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border dark:border-transparent rounded-xl p-2 mb-10 cursor-text" @click="searchInputRef?.focus()">
      <UiSearchInput ref="searchInputRef" v-model="search" placeholder="Search your tours..." class="w-full sm:w-80" @click.stop />
      <div class="flex items-center gap-2 w-full sm:w-auto sm:border-l border-border h-10 sm:pl-3" @click.stop>
        <div class="relative w-full sm:w-auto">
          <select v-model="sortBy" class="w-full sm:w-auto pl-3 pr-7 py-2 bg-transparent border-none text-xs font-semibold uppercase tracking-wide outline-none appearance-none cursor-pointer text-main">
            <option value="newest" class="bg-surface text-main">Newest</option>
            <option value="oldest" class="bg-surface text-main">Oldest</option>
            <option value="name" class="bg-surface text-main">A–Z</option>
          </select>
          <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-dim">
            <UiIcon name="chevron-down" :size="12" :stroke-width="2.5" />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex flex-col animate-pulse">
      <div class="bg-card rounded-xl mb-10 h-14"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="n in 4" :key="n" class="h-[300px] bg-card rounded-xl overflow-hidden flex flex-col">
          <div class="aspect-[16/9] w-full bg-surface-alt shrink-0"></div>
          <div class="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div class="h-3 w-3/4 bg-surface-alt rounded mb-2"></div>
              <div class="h-2 w-1/3 bg-surface-alt/60 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <template v-else>
      <!-- Empty State: No tours yet -->
      <div v-if="!filteredSpaces.length && !search" class="flex flex-col gap-8">
        <AppWelcomeCard @create="handleCreateTour" />
      </div>

      <!-- Empty State: search results -->
      <UiEmptyState
        v-else-if="!filteredSpaces.length && search"
        icon="search"
        :title="`No results for “${search}”`"
        description="Try a different search term."
      >
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="search = ''">Reset filters</UiButton>
        </template>
      </UiEmptyState>

      <!-- Populated State: Grid View -->
      <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <UiTourCard
          v-for="space in filteredSpaces"
          :key="space.id"
          :space="space"
          @open="navigateTo(`/app/spaces/${space.id}`)"
        >
          <template #overlay>
            <button class="w-10 h-10 flex items-center justify-center bg-surface border border-border rounded-lg text-main shadow-sm hover:bg-main hover:text-bg transition-colors" @click.stop="navigateTo(`/app/spaces/${space.id}`)" title="Edit">
              <UiIcon name="edit" :size="16" />
            </button>
            <a v-if="space.is_published && space.slug" :href="`/p/${space.slug}`" target="_blank" class="w-10 h-10 flex items-center justify-center bg-surface border border-border rounded-lg text-main shadow-sm hover:bg-main hover:text-bg transition-colors" @click.stop title="View Live">
              <UiIcon name="external-link" :size="16" />
            </a>
          </template>
          <template #actions>
            <button class="p-1.5 hover:bg-surface-alt rounded-lg text-dim hover:text-main transition-colors" @click="handleTogglePublish(space)" title="Toggle Status">
              <UiIcon name="globe" :size="14" />
            </button>
            <button class="p-1.5 hover:bg-surface-alt rounded-lg text-dim hover:text-main transition-colors" @click="openShare(space)" title="Share">
              <UiIcon name="share" :size="14" />
            </button>
            <button class="p-1.5 hover:bg-danger-bg rounded-lg text-dim hover:text-danger transition-colors" @click="confirmDelete(space)" title="Delete">
              <UiIcon name="trash" :size="14" />
            </button>
          </template>
        </UiTourCard>
      </div>

      <!-- Populated State: List View -->
      <div v-else class="flex flex-col gap-2">
        <!-- List Header -->
        <div class="px-4 py-2 flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-dim">
          <div class="w-14 flex-shrink-0"></div>
          <div class="flex-1">Tour</div>
          <div class="w-40 hidden md:block">Type</div>
          <div class="w-32 hidden md:block">Status</div>
          <div class="w-48 hidden lg:block text-right pr-20">Created</div>
          <div class="w-32 text-right invisible">Actions</div>
        </div>

        <div
          v-for="space in filteredSpaces"
          :key="space.id"
          class="group px-4 py-3 flex items-center gap-6 bg-card border border-border dark:border-transparent hover:border-main/20 rounded-xl transition-colors cursor-pointer"
          @click="navigateTo(`/app/spaces/${space.id}`)"
        >
          <div class="w-14 h-14 rounded-lg bg-surface-alt border border-border dark:border-transparent overflow-hidden flex-shrink-0">
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
            <div v-else class="w-full h-full flex items-center justify-center text-dim/40">
              <UiIcon name="image" :size="18" :stroke-width="1.5" />
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-bold text-main truncate flex items-center gap-2">
              {{ space.title }}
              <UiIcon v-if="space.is_published" name="check" :size="12" :stroke-width="3" class="text-success flex-shrink-0" />
            </h3>
            <p class="text-xs text-dim mt-0.5 truncate">viewora.com/p/{{ space.slug || space.id.slice(0, 8) }}</p>
          </div>

          <div class="w-40 hidden md:block">
            <span class="text-[10px] font-bold text-dim uppercase px-2.5 py-1 bg-surface-alt rounded-md tracking-wide">360 WebXR</span>
          </div>

          <div class="w-32 hidden md:block">
            <UiBadge :status="space.is_published ? 'published' : 'draft'" dot>{{ space.is_published ? 'Live' : 'Draft' }}</UiBadge>
          </div>

          <div class="w-48 hidden lg:block text-right pr-20">
            <span class="text-xs font-medium text-dim">{{ formatDate(space.created_at) }}</span>
          </div>

          <div class="w-32 flex justify-end gap-1.5" @click.stop>
            <button class="w-9 h-9 flex items-center justify-center bg-surface-alt hover:bg-main hover:text-bg border border-border dark:border-transparent rounded-lg transition-colors" @click="navigateTo(`/app/spaces/${space.id}`)" title="Edit">
              <UiIcon name="edit" :size="14" />
            </button>
            <button class="w-9 h-9 flex items-center justify-center bg-surface-alt hover:bg-main hover:text-bg border border-border dark:border-transparent rounded-lg transition-colors" @click="openShare(space)" title="Share">
              <UiIcon name="share" :size="14" />
            </button>
            <button class="w-9 h-9 flex items-center justify-center bg-surface-alt hover:bg-danger hover:text-white border border-border dark:border-transparent rounded-lg transition-colors" @click="confirmDelete(space)" title="Delete">
              <UiIcon name="trash" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Modals ── -->
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

    <UiShareModal :space="spaceToShare" @close="spaceToShare = null" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
import { ref, computed, onMounted } from 'vue'
import { useSpaces } from '~/composables/useSpaces'
import { usePlanStore } from '~/stores/plan'
import { navigateTo } from '#imports'
import { toast } from 'vue-sonner'
import type { Space } from '~/composables/useSpaces'
useSeoMeta({ title: 'Spaces | Viewora' })

const { spaces, pending, fetchSpaces, deleteSpace, publishSpace } = useSpaces()
const planStore = usePlanStore()

const search = ref('')
const searchInputRef = ref<{ focus: () => void }>()
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

// Track images that failed to load (dev IPX proxy can't reach Supabase URLs) — list view only,
// grid view thumbnails use UiTourCard which tracks this internally.
const failedImages = ref(new Set<string>())

// Share
const spaceToShare = ref<Space | null>(null)
function openShare(space: Space) {
  spaceToShare.value = space
}

const deleteMessage = computed(() => {
  if (!spaceToDelete.value) return ''
  return `Are you sure you want to permanently remove "${spaceToDelete.value.title}"? This will also delete all associated media and lead data.`
})

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
