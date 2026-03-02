<template>
  <EditorSpaceEditorShell
    :scenes="shellScenes"
    :space-name="currentSpace?.title || 'Loading…'"
    :space-id="spaceId"
    :active-scene-id="activeSceneId"
    :is-published="currentSpace?.is_published ?? false"
    :is-publishing="isPending"
    :add-hotspot-mode="addHotspotMode"
    :show-hotspot-toggle="true"
    @select-scene="activeSceneId = $event"
    @toggle-hotspot-mode="toggleHotspotMode"
    @publish="publish"
  >
    <template #viewer>
      <EditorMarzipanoViewer
        v-if="mappedScenes.length > 0"
        :scenes="mappedScenes"
        :hotspots="mappedHotspots"
        :active-scene-id="activeSceneId"
        :add-hotspot-mode="addHotspotMode"
        @hotspot-placed="onHotspotPlaced"
        @hotspot-navigate="activeSceneId = $event"
        style="width: 100%; height: 100%;"
      />
    </template>
  </EditorSpaceEditorShell>

  <!-- Add Hotspot Modal -->
  <div v-if="showHotspotModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.75rem; width: 100%; max-width: 380px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">
      <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #111827; margin: 0;">Configure Hotspot</h3>
        <button @click="showHotspotModal = false" style="color: #6b7280; background: none; border: none; cursor: pointer; line-height: 0; padding: 0.25rem; border-radius: 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <form @submit.prevent="saveHotspot" style="padding: 1.25rem 1.5rem;">
        <div style="margin-bottom: 1rem;">
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #6b7280; margin-bottom: 0.375rem; text-transform: uppercase; letter-spacing: 0.04em;">Type</label>
          <select
            v-model="newHotspotForm.type"
            @change="newHotspotForm.payload = {}"
            style="width: 100%; padding: 0.5rem 0.75rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; color: #111827; font-size: 0.875rem; outline: none;"
          >
            <option value="nav">Navigation (Go to Scene)</option>
            <option value="info">Info Label</option>
          </select>
        </div>

        <div v-if="newHotspotForm.type === 'nav'" style="margin-bottom: 1rem;">
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #6b7280; margin-bottom: 0.375rem; text-transform: uppercase; letter-spacing: 0.04em;">Target Scene</label>
          <select
            v-model="newHotspotForm.payload.target_scene_id"
            required
            style="width: 100%; padding: 0.5rem 0.75rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; color: #111827; font-size: 0.875rem; outline: none;"
          >
            <option value="">— Select a scene —</option>
            <option v-for="scene in scenes.filter(s => s.id !== activeSceneId)" :key="scene.id" :value="scene.id">
              {{ scene.name }}
            </option>
          </select>
        </div>

        <div v-if="newHotspotForm.type === 'info'" style="margin-bottom: 1rem;">
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #6b7280; margin-bottom: 0.375rem; text-transform: uppercase; letter-spacing: 0.04em;">Label</label>
          <input
            v-model="newHotspotForm.payload.label"
            type="text"
            required
            placeholder="e.g. Living Room"
            style="width: 100%; padding: 0.5rem 0.75rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; color: #111827; font-size: 0.875rem; outline: none;"
          />
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.625rem; margin-top: 1.25rem;">
          <button type="button" @click="showHotspotModal = false" style="padding: 0.375rem 0.75rem; font-size: 0.8rem; font-weight: 500; border-radius: 6px; border: 1px solid #e5e7eb; background: #ffffff; color: #6b7280; cursor: pointer;">Cancel</button>
          <button type="submit" style="padding: 0.375rem 0.75rem; font-size: 0.8rem; font-weight: 600; border-radius: 6px; border: 1px solid #111827; background: #111827; color: #ffffff; cursor: pointer;">Save Hotspot</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import type { ViewerScene, ViewerHotspot } from '~/components/editor/MarzipanoViewer.vue'

definePageMeta({ layout: false, middleware: 'auth' })

const route = useRoute()
const spaceId = route.params.spaceId as string

const { currentSpace, fetchSpace, publishSpace } = useSpaces()
const { scenes, fetchScenes } = useScenes()
const { hotspots, fetchHotspots, createHotspot, deleteHotspot } = useHotspots()
const { apiFetch } = useApiFetch()

const activeSceneId = ref<string | null>(null)
const addHotspotMode = ref(false)
const showHotspotModal = ref(false)
const isPending = ref(false)

// R2 signed GET URLs keyed by image_path (R2 object key)
const signedUrlCache = ref<Record<string, string>>({})

const newHotspotForm = ref({
  yaw: 0,
  pitch: 0,
  type: 'nav',
  payload: {} as Record<string, any>
})

onMounted(async () => {
  await fetchSpace(spaceId)
  await fetchScenes(spaceId)
  if (scenes.value.length > 0) {
    activeSceneId.value = scenes.value[0].id
    // Pre-load R2 signed URLs for all scenes
    await loadSignedUrls(scenes.value)
  }
})

// Load presigned GET URLs for any scenes not yet cached
async function loadSignedUrls(sceneList: typeof scenes.value) {
  await Promise.all(
    sceneList
      .filter(s => s.image_path && !signedUrlCache.value[s.image_path])
      .map(async (s) => {
        try {
          const { url } = await apiFetch<{ url: string }>(
            `/api/uploads/panorama-signed-url?key=${encodeURIComponent(s.image_path!)}`
          )
          signedUrlCache.value[s.image_path!] = url
        } catch { /* skip */ }
      })
  )
}

// Fetch hotspots whenever active scene changes
watch(activeSceneId, async (newId) => {
  if (newId) {
    await fetchHotspots(newId)
    // Ensure the new scene's signed URL is ready
    const scene = scenes.value.find(s => s.id === newId)
    if (scene?.image_path && !signedUrlCache.value[scene.image_path]) {
      await loadSignedUrls([scene])
    }
  }
})

// Map DB scenes → shell format { id, name, hasImage }
const shellScenes = computed(() =>
  scenes.value.map(s => ({
    id: s.id,
    name: s.name,
    hasImage: !!s.image_path,
  }))
)

// Map DB scene schema → ViewerScene with R2 presigned URL
const mappedScenes = computed((): ViewerScene[] =>
  scenes.value
    .filter(s => s.image_path && signedUrlCache.value[s.image_path])
    .map(s => ({
      id: s.id,
      name: s.name,
      panorama_url: signedUrlCache.value[s.image_path!],
      initial_yaw: 0,
      initial_pitch: 0,
      initial_fov: 1.0,
    }))
)

// Only hotspots belonging to the active scene
const currentHotspots = computed(() =>
  hotspots.value.filter(h => h.scene_id === activeSceneId.value)
)

// Map DB hotspot schema → ViewerHotspot
const mappedHotspots = computed((): ViewerHotspot[] =>
  currentHotspots.value.map(h => ({
    id: h.id,
    scene_id: h.scene_id,
    yaw: h.yaw,
    pitch: h.pitch,
    type: h.type,
    target_scene_id: h.type === 'nav' ? (h.payload?.target_scene_id ?? null) : null,
    label: h.type === 'info' ? (h.payload?.label ?? '') : 'Go',
  }))
)

const toggleHotspotMode = () => { addHotspotMode.value = !addHotspotMode.value }

const onHotspotPlaced = (coords: { yaw: number; pitch: number }) => {
  newHotspotForm.value = { yaw: coords.yaw, pitch: coords.pitch, type: 'nav', payload: {} }
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
  if (confirm('Delete this hotspot?')) await deleteHotspot(id)
}

const publish = async () => {
  isPending.value = true
  try {
    const slug = currentSpace.value?.slug || `tour-${Math.random().toString(36).substring(7)}`
    await publishSpace(spaceId, slug)
  } finally {
    isPending.value = false
  }
}

useSeoMeta({ title: () => `Editor — ${currentSpace.value?.title || 'Space'} | Viewora` })
</script>
