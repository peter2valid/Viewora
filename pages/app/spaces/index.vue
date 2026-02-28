<template>
  <div class="app-page">
    <div class="app-page-header flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">Spaces</h1>
        <p class="text-gray-500">Manage your 360° virtual tour spaces.</p>
      </div>
      <button class="bg-black text-white px-4 py-2 rounded-md" @click="showModal = true">
        Create Space
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="pending" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-for="n in 3" :key="n" class="bg-gray-200 h-48 rounded-lg animate-pulse"></div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 text-red-500 p-6 rounded-lg text-center">
      <p>{{ error }}</p>
      <button class="mt-4 bg-red-100 px-4 py-2 rounded-md" @click="fetchSpaces">Try Again</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="spaces.length === 0" class="text-center py-16 bg-white rounded-lg border border-gray-200">
      <h2 class="text-xl font-semibold mb-2">No spaces yet</h2>
      <p class="text-gray-500 mb-6">Create your first space to start building interactive 360° virtual tours.</p>
      <button class="bg-black text-white px-6 py-3 rounded-md font-medium" @click="showModal = true">
        Create Your First Space
      </button>
    </div>

    <!-- Spaces grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <article
        v-for="space in spaces"
        :key="space.id"
        class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="p-5">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-lg font-semibold">{{ space.title }}</h3>
            <span v-if="space.is_published" class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Published</span>
            <span v-else class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">Draft</span>
          </div>
          <p class="text-gray-500 text-sm mb-4 line-clamp-2">{{ space.description || 'No description provided.' }}</p>
          <p class="text-xs text-gray-400 mb-4">Created {{ new Date(space.created_at).toLocaleDateString() }}</p>
          
          <NuxtLink :to="`/app/spaces/${space.id}`" class="block w-full text-center bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-medium py-2 rounded-md transition-colors">
            Manage Space
          </NuxtLink>
        </div>
      </article>
    </div>

    <!-- Create Space Modal (Simplified) -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">Create New Space</h3>
        <form @submit.prevent="handleCreateSpace">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Title</label>
            <input v-model="newSpaceForm.title" type="text" class="w-full border rounded-md p-2" required>
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium mb-1">Description</label>
            <textarea v-model="newSpaceForm.description" class="w-full border rounded-md p-2" rows="3"></textarea>
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" class="px-4 py-2 border rounded-md" @click="showModal = false">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-black text-white rounded-md" :disabled="pending">
              {{ pending ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

useSeoMeta({ title: 'Spaces | Viewora' })

const { spaces, pending, error, fetchSpaces, createSpace } = useSpaces()
const showModal = ref(false)
const newSpaceForm = ref({ title: '', description: '' })

onMounted(() => {
  fetchSpaces()
})

const handleCreateSpace = async () => {
  const newSpace = await createSpace(newSpaceForm.value)
  if (newSpace) {
    showModal.value = false
    newSpaceForm.value = { title: '', description: '' }
    navigateTo(`/app/spaces/${newSpace.id}`)
  }
}
</script>