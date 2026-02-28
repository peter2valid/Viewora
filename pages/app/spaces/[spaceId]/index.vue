<template>
  <div class="app-page max-w-5xl mx-auto">
    <div class="mb-4">
      <NuxtLink to="/app/spaces" class="text-sm text-gray-500 hover:text-black">← Back to Spaces</NuxtLink>
    </div>

    <div v-if="pendingSpace" class="h-8 bg-gray-200 animate-pulse rounded w-1/3 mb-6"></div>
    <div v-else-if="currentSpace" class="flex justify-between items-start mb-6">
      <div>
        <h1 class="text-2xl font-bold">{{ currentSpace.title }}</h1>
        <p class="text-gray-500">{{ currentSpace.description || 'No description' }}</p>
      </div>
      <div class="flex gap-3">
        <button v-if="!currentSpace.is_published" @click="publish" class="px-4 py-2 border border-gray-300 rounded-md font-medium">Publish Tour</button>
        <NuxtLink v-if="currentSpace.is_published" :to="`/tour/${currentSpace.slug}`" target="_blank" class="px-4 py-2 border border-gray-300 rounded-md font-medium text-blue-600">View Public Tour</NuxtLink>
        <NuxtLink :to="`/app/spaces/${currentSpace.id}/editor`" class="bg-black text-white px-4 py-2 rounded-md font-medium">
          Open Editor
        </NuxtLink>
      </div>
    </div>

    <!-- Upload Section -->
    <div class="bg-white p-6 rounded-lg border border-gray-200 mb-8">
      <h2 class="text-lg font-semibold mb-4">Add a Scene</h2>
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
           @dragover.prevent @drop.prevent="handleDrop">
        <input type="file" ref="fileInput" class="hidden" accept="image/jpeg, image/png" @change="handleFileSelect" />
        <svg class="mx-auto h-12 w-12 text-gray-400 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <p class="text-sm text-gray-600">Drag and drop your 360° panorama (2:1 aspect ratio) here, or <button @click="$refs.fileInput.click()" class="text-blue-600 hover:underline">browse</button></p>
        <p class="text-xs text-gray-500 mt-2">JPEG or PNG up to 10MB.</p>
        <div v-if="uploading" class="mt-4 text-blue-600 font-medium animate-pulse">Uploading... {{ uploadProgress }}%</div>
        <div v-if="uploadError" class="mt-4 text-red-500 text-sm">{{ uploadError }}</div>
      </div>
    </div>

    <!-- Scenes List -->
    <div>
      <h2 class="text-lg font-semibold mb-4">Scenes ({{ scenes.length }})</h2>
      <div v-if="pendingScenes" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="n in 3" :key="n" class="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
      </div>
      <div v-else-if="scenes.length === 0" class="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
        No scenes uploaded yet.
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div v-for="scene in scenes" :key="scene.id" class="bg-white border border-gray-200 rounded-lg overflow-hidden relative group">
          <div class="h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
            <img v-if="scene.image_path" :src="getPublicUrl(scene.image_path)" class="w-full h-full object-cover" />
            <span v-else class="text-gray-400">No Image</span>
          </div>
          <div class="p-3 flex justify-between items-center">
            <span class="font-medium text-sm truncate">{{ scene.name }}</span>
            <button @click="handleDeleteScene(scene.id)" class="text-red-500 text-xs hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
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

const { currentSpace, fetchSpace, pending: pendingSpace, publishSpace } = useSpaces()
const { scenes, fetchScenes, createScene, deleteScene, pending: pendingScenes } = useScenes()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref('')

onMounted(() => {
  fetchSpace(spaceId)
  fetchScenes(spaceId)
})

const getPublicUrl = (path: string) => {
  return supabase.storage.from('tours').getPublicUrl(path).data.publicUrl
}

const processFile = async (file: File) => {
  uploadError.value = ''
  if (!file.type.includes('image')) {
    uploadError.value = 'Only images are supported.'
    return
  }
  
  uploading.value = true
  uploadProgress.value = 10
  
  try {
    const ext = file.name.split('.').pop()
    const fileName = `${spaceId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
    
    // Using standard upload (no progress event easily available in supabase v2 standard upload, so just simulating a bit)
    uploadProgress.value = 50
    const { data, error } = await supabase.storage
      .from('tours')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (error) throw error
    uploadProgress.value = 90
    
    // Create scene record
    await createScene(spaceId, file.name.replace(`.${ext}`, ''), data.path)
    uploadProgress.value = 100
  } catch (err: any) {
    uploadError.value = err.message || 'Upload failed'
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    if (fileInput.value) fileInput.value.value = ''
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    processFile(target.files[0])
  }
}

const handleDrop = (e: DragEvent) => {
  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    processFile(e.dataTransfer.files[0])
  }
}

const handleDeleteScene = async (id: string) => {
  if (confirm('Delete this scene?')) {
    await deleteScene(id)
  }
}

const publish = async () => {
  const slug = `tour-${Math.random().toString(36).substring(7)}`
  await publishSpace(spaceId, slug)
  alert('Published successfully!')
}
</script>