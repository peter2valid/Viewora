<template>
  <div class="h-screen flex flex-col">
    <!-- Top Bar -->
    <header class="bg-white border-b h-14 flex items-center justify-between px-4">
      <div class="flex items-center gap-4">
        <NuxtLink :to="`/app/spaces/${spaceId}`" class="text-sm font-medium hover:underline text-gray-600">← Back to Space</NuxtLink>
        <h1 class="font-bold text-lg">{{ currentSpace?.title || 'Loading...' }}</h1>
      </div>
      <div>
        <button @click="publish" class="bg-black text-white px-4 py-1.5 rounded text-sm font-medium">Publish Changes</button>
      </div>
    </header>

    <!-- Main Editor Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Panel: Scenes -->
      <aside class="w-64 bg-gray-50 border-r flex flex-col">
        <div class="p-3 border-b font-semibold bg-gray-100">Scenes</div>
        <div class="flex-1 overflow-y-auto p-2">
          <div v-for="scene in scenes" :key="scene.id" 
               @click="activeSceneId = scene.id"
               :class="['p-2 mb-2 rounded cursor-pointer border', activeSceneId === scene.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300']">
            <div class="h-20 bg-gray-200 mb-2 overflow-hidden flex items-center justify-center">
               <img v-if="scene.image_path" :src="getPublicUrl(scene.image_path)" class="w-full h-full object-cover" />
               <span v-else class="text-xs text-gray-500">No Image</span>
            </div>
            <div class="text-sm font-medium truncate">{{ scene.name }}</div>
          </div>
        </div>
      </aside>

      <!-- Center: Marzipano Viewer -->
      <main class="flex-1 relative bg-black">
        <ClientOnly>
          <EditorMarzipanoViewer
            v-if="mappedScenes.length > 0"
            :scenes="mappedScenes"
            :hotspots="currentHotspots"
            :active-scene-id="activeSceneId"
            :add-hotspot-mode="addHotspotMode"
            @hotspot-placed="onHotspotPlaced"
            @hotspot-navigate="activeSceneId = $event"
            class="w-full h-full"
          />
          <div v-else class="absolute inset-0 flex items-center justify-center text-white">
            No scenes available to display.
          </div>
        </ClientOnly>

        <!-- Viewer Controls -->
        <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
          <button @click="addHotspotMode = !addHotspotMode" 
                  :class="['px-4 py-2 rounded-full font-medium shadow-lg', addHotspotMode ? 'bg-red-500 text-white' : 'bg-white text-black']">
            {{ addHotspotMode ? 'Cancel Hotspot' : '+ Add Hotspot' }}
          </button>
        </div>
      </main>

      <!-- Right Panel: Inspector -->
      <aside class="w-72 bg-white border-l flex flex-col">
        <div class="p-3 border-b font-semibold bg-gray-100">Hotspots in Scene</div>
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="currentHotspots.length === 0" class="text-sm text-gray-500 text-center py-4">
            No hotspots in this scene.
          </div>
          <div v-for="hotspot in currentHotspots" :key="hotspot.id" class="border p-3 rounded mb-3 bg-gray-50">
            <div class="flex justify-between items-start mb-2">
              <span class="text-xs font-bold uppercase text-gray-500">{{ hotspot.type }}</span>
              <button @click="handleDeleteHotspot(hotspot.id)" class="text-red-500 text-xs hover:underline">Delete</button>
            </div>
            <div class="text-sm">Yaw: {{ hotspot.yaw.toFixed(2) }}</div>
            <div class="text-sm">Pitch: {{ hotspot.pitch.toFixed(2) }}</div>
            <div class="mt-2 text-xs text-gray-600 bg-white p-1 rounded border">{{ JSON.stringify(hotspot.payload) }}</div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Add Hotspot Modal -->
    <div v-if="showHotspotModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg w-96">
        <h3 class="text-lg font-bold mb-4">Configure Hotspot</h3>
        <form @submit.prevent="saveHotspot">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">Type</label>
            <select v-model="newHotspotForm.type" class="w-full border rounded p-2">
              <option value="nav">Navigation (Go to Scene)</option>
              <option value="info">Info Text</option>
            </select>
          </div>
          <div v-if="newHotspotForm.type === 'nav'" class="mb-4">
            <label class="block text-sm font-medium mb-1">Target Scene</label>
            <select v-model="newHotspotForm.payload.target_scene_id" class="w-full border rounded p-2" required>
              <option v-for="scene in scenes.filter(s => s.id !== activeSceneId)" :key="scene.id" :value="scene.id">
                {{ scene.name }}
              </option>
            </select>
          </div>
          <div v-if="newHotspotForm.type === 'info'" class="mb-4">
            <label class="block text-sm font-medium mb-1">Label / Text</label>
            <input v-model="newHotspotForm.payload.label" type="text" class="w-full border rounded p-2" required>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <button type="button" @click="showHotspotModal = false" class="px-3 py-1.5 border rounded">Cancel</button>
            <button type="submit" class="px-3 py-1.5 bg-black text-white rounded">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'

definePageMeta({ layout: false, middleware: 'auth' })

const route = useRoute()
const spaceId = route.params.spaceId as string
const supabase = useSupabaseClient()

const { currentSpace, fetchSpace, publishSpace } = useSpaces()
const { scenes, fetchScenes } = useScenes()
const { hotspots, fetchHotspots, createHotspot, deleteHotspot } = useHotspots()

const activeSceneId = ref<string | null>(null)
const addHotspotMode = ref(false)
const showHotspotModal = ref(false)

const newHotspotForm = ref({
  yaw: 0,
  pitch: 0,
  type: 'nav',
  payload: {} as any
})

onMounted(async () => {
  await fetchSpace(spaceId)
  await fetchScenes(spaceId)
  if (scenes.value.length > 0) {
    activeSceneId.value = scenes.value[0].id
  }
})

watch(activeSceneId, async (newId) => {
  if (newId) {
    await fetchHotspots(newId)
  }
})

const getPublicUrl = (path: string) => {
  return supabase.storage.from('tours').getPublicUrl(path).data.publicUrl
}

// Map new scene schema to what MarzipanoViewer expects
const mappedScenes = computed(() => {
  return scenes.value.map(s => ({
    ...s,
    panorama_url: s.image_path ? getPublicUrl(s.image_path) : null,
    initial_yaw: 0,
    initial_pitch: 0,
    initial_fov: 1.0
  }))
})

// Map new hotspot schema to what MarzipanoViewer expects
const currentHotspots = computed(() => {
  return hotspots.value.map(h => ({
    ...h,
    target_scene_id: h.type === 'nav' ? h.payload?.target_scene_id : null,
    label: h.type === 'info' ? h.payload?.label : (h.type === 'nav' ? 'Go' : '')
  }))
})

const onHotspotPlaced = (coords: { yaw: number, pitch: number }) => {
  newHotspotForm.value.yaw = coords.yaw
  newHotspotForm.value.pitch = coords.pitch
  newHotspotForm.value.type = 'nav'
  newHotspotForm.value.payload = {}
  addHotspotMode.value = false
  showHotspotModal.value = true
}

const saveHotspot = async () => {
  if (!activeSceneId.value) return
  await createHotspot(
    activeSceneId.value,
    newHotspotForm.value.yaw,
    newHotspotForm.value.pitch,
    newHotspotForm.value.type,
    newHotspotForm.value.payload
  )
  showHotspotModal.value = false
}

const handleDeleteHotspot = async (id: string) => {
  if (confirm('Delete hotspot?')) {
    await deleteHotspot(id)
  }
}

const publish = async () => {
  const slug = currentSpace.value?.slug || `tour-${Math.random().toString(36).substring(7)}`
  await publishSpace(spaceId, slug)
  alert('Space published successfully!')
}
</script>
