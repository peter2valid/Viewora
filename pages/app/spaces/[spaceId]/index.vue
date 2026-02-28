<template>
  <div class="app-page" style="max-width: 1100px;">
    <!-- Breadcrumb -->
    <div style="margin-bottom: 1rem;">
      <NuxtLink to="/app/spaces" class="text-muted text-sm" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem;">
        ← Back to Spaces
      </NuxtLink>
    </div>

    <!-- Header skeleton -->
    <div v-if="pendingSpace" style="margin-bottom: 2rem;">
      <div class="skeleton-line skeleton-line--title" style="height: 28px; width: 240px; margin-bottom: 0.5rem;"></div>
      <div class="skeleton-line skeleton-line--meta" style="width: 160px;"></div>
    </div>

    <!-- Space header -->
    <div v-else-if="currentSpace" class="app-page-header">
      <div>
        <h1 class="app-page-title">{{ currentSpace.title }}</h1>
        <p class="app-page-subtitle">{{ currentSpace.description || 'No description' }}</p>
      </div>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button
          v-if="!currentSpace.is_published"
          @click="publish"
          class="btn btn-secondary"
          :disabled="pendingSpace || scenes.length === 0"
        >
          Publish Tour
        </button>
        <NuxtLink
          v-if="currentSpace.is_published && currentSpace.slug"
          :to="`/tours/${currentSpace.slug}`"
          target="_blank"
          class="btn btn-secondary"
        >
          View Public Tour ↗
        </NuxtLink>
        <NuxtLink
          :to="`/app/spaces/${currentSpace.id}/editor`"
          class="btn btn-dark"
        >
          Open Editor
        </NuxtLink>
      </div>
    </div>

    <!-- Error fetching space -->
    <div v-if="spaceError" class="app-state-box app-state-box--error" style="margin-bottom: 1.5rem;">
      <p>{{ spaceError }}</p>
    </div>

    <!-- Upload Section -->
    <div class="card" style="margin-bottom: 2rem;">
      <h2 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; letter-spacing: -0.02em;">Add a Scene</h2>
      <div
        class="upload-dropzone"
        :class="{ 'upload-dropzone--active': isDragOver }"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="handleDrop"
        @click="fileInput?.click()"
      >
        <input
          type="file"
          ref="fileInput"
          style="display: none;"
          accept="image/jpeg,image/jpg,image/png"
          @change="handleFileSelect"
        />
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="color: var(--border-sharp); margin-bottom: 0.75rem;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        <p style="font-size: 0.9rem; color: var(--slate); margin-bottom: 0.25rem;">
          <span style="font-weight: 600; color: var(--ink);">Click to upload</span> or drag and drop
        </p>
        <p style="font-size: 0.78rem; color: var(--text-muted);">JPEG or PNG · 360° equirectangular panorama</p>
        <div v-if="uploading" style="margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
          <span class="btn-spinner" style="border-top-color: var(--accent);"></span>
          <span style="font-size: 0.875rem; color: var(--accent); font-weight: 500;">Uploading... {{ uploadProgress }}%</span>
        </div>
      </div>
      <div v-if="uploadError" style="margin-top: 0.75rem; padding: 0.625rem 0.875rem; background: #fee2e2; color: #ef4444; border-radius: 0.5rem; font-size: 0.875rem;">
        {{ uploadError }}
      </div>
    </div>

    <!-- Scenes Section -->
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h2 style="font-size: 1rem; font-weight: 700; letter-spacing: -0.02em; margin: 0;">
          Scenes
          <span style="font-size: 0.8rem; font-weight: 500; color: var(--slate); margin-left: 0.375rem;">({{ scenes.length }})</span>
        </h2>
      </div>

      <!-- Scenes loading -->
      <div v-if="pendingScenes" class="spaces-grid">
        <div v-for="n in 3" :key="n" class="space-card space-card--skeleton">
          <div style="height: 120px; background: var(--border); border-radius: 0.5rem 0.5rem 0 0;"></div>
          <div class="space-card-body">
            <div class="skeleton-line skeleton-line--title"></div>
          </div>
        </div>
      </div>

      <!-- Scenes empty -->
      <div v-else-if="scenes.length === 0" class="app-state-box">
        <svg xmlns="http://www.w3.org/2000/svg" class="empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        <p class="empty-title">No scenes uploaded yet</p>
        <p class="empty-desc">Upload your first 360° panorama image above to get started.</p>
      </div>

      <!-- Scenes grid -->
      <div v-else class="spaces-grid">
        <div v-for="scene in scenes" :key="scene.id" class="space-card" style="overflow: hidden;">
          <div style="height: 128px; background: var(--paper-alt); overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
            <img
              v-if="scene.image_path"
              :src="getPublicUrl(scene.image_path)"
              :alt="scene.name"
              style="width: 100%; height: 100%; object-fit: cover;"
              loading="lazy"
            />
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="color: var(--border-sharp);"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          </div>
          <div class="space-card-body" style="flex: 1; padding: 0.875rem;">
            <p class="space-card-name" style="font-size: 0.875rem;">{{ scene.name }}</p>
            <p class="space-card-meta">Scene {{ scene.order_index + 1 }}</p>
          </div>
          <div class="space-card-footer">
            <button @click="handleDeleteScene(scene.id)" class="btn btn-danger space-card-btn">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'app', middleware: 'auth' })

const route = useRoute()
const spaceId = route.params.spaceId as string
const supabase = useSupabaseClient()

const { currentSpace, fetchSpace, pending: pendingSpace, error: spaceError, publishSpace } = useSpaces()
const { scenes, fetchScenes, createScene, deleteScene, pending: pendingScenes } = useScenes()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref('')
const isDragOver = ref(false)

onMounted(() => {
  fetchSpace(spaceId)
  fetchScenes(spaceId)
})

const getPublicUrl = (path: string) => {
  return supabase.storage.from('tours').getPublicUrl(path).data.publicUrl
}

const processFile = async (file: File) => {
  uploadError.value = ''
  isDragOver.value = false

  const allowed = ['image/jpeg', 'image/jpg', 'image/png']
  if (!allowed.includes(file.type)) {
    uploadError.value = 'Only JPEG or PNG images are supported.'
    return
  }
  if (file.size > 20 * 1024 * 1024) {
    uploadError.value = 'File too large. Maximum size is 20MB.'
    return
  }

  uploading.value = true
  uploadProgress.value = 10

  try {
    const ext = file.name.split('.').pop()
    const fileName = `${spaceId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`

    uploadProgress.value = 40
    const { data, error } = await supabase.storage
      .from('tours')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (error) throw error
    uploadProgress.value = 80

    const sceneName = file.name.replace(/\.[^/.]+$/, '')
    await createScene(spaceId, sceneName, data.path)
    uploadProgress.value = 100
  } catch (err: any) {
    uploadError.value = err.message || 'Upload failed. Please try again.'
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    if (fileInput.value) fileInput.value.value = ''
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files?.[0]) processFile(target.files[0])
}

const handleDrop = (e: DragEvent) => {
  if (e.dataTransfer?.files?.[0]) processFile(e.dataTransfer.files[0])
}

const handleDeleteScene = async (id: string) => {
  if (confirm('Delete this scene? This cannot be undone.')) {
    await deleteScene(id)
  }
}

const publish = async () => {
  const slug = currentSpace.value?.slug || `tour-${Math.random().toString(36).substring(7)}`
  const result = await publishSpace(spaceId, slug)
  if (result) {
    // success — currentSpace reactive ref is updated by publishSpace
  }
}

useSeoMeta({ title: () => `${currentSpace.value?.title || 'Space'} | Viewora` })
</script>

<style scoped>
.upload-dropzone {
  border: 2px dashed var(--border);
  border-radius: 0.75rem;
  padding: 2.5rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-dropzone:hover,
.upload-dropzone--active {
  border-color: var(--accent);
  background: var(--accent-dim);
}
</style>
