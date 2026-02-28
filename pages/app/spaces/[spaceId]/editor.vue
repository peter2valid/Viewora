<template>
  <div class="editor-grid">
    <!-- Top Bar -->
    <header class="editor-topbar">
      <NuxtLink :to="`/app/spaces/${spaceId}`" class="editor-back-btn" title="Back to Space">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </NuxtLink>
      <div class="editor-topbar-divider"></div>
      <div class="editor-tour-title">
        <span class="editor-tour-title-text">{{ currentSpace?.title || 'Loading…' }}</span>
      </div>
      <span :class="['editor-status-badge', currentSpace?.is_published ? 'editor-status-badge--live' : 'editor-status-badge--draft']">
        {{ currentSpace?.is_published ? 'Live' : 'Draft' }}
      </span>
      <div style="flex: 1;"></div>
      <button
        @click="toggleHotspotMode"
        :class="['editor-action-btn', addHotspotMode ? 'editor-action-btn--active' : '']"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        {{ addHotspotMode ? 'Cancel' : 'Add Hotspot' }}
      </button>
      <button @click="publish" class="editor-action-btn editor-action-btn--primary" :disabled="isPending">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        {{ isPending ? 'Saving…' : 'Publish' }}
      </button>
    </header>

    <!-- Left Panel: Scenes -->
    <aside class="editor-scene-panel">
      <div class="scene-panel">
        <div class="scene-panel-header">
          <span class="scene-panel-title">Scenes ({{ scenes.length }})</span>
        </div>

        <div v-if="scenes.length === 0" class="scene-panel-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          <p>No scenes yet</p>
          <p class="scene-panel-empty-sub">Go back to the space to upload panoramas</p>
        </div>

        <ul v-else class="scene-list">
          <li
            v-for="(scene, index) in scenes"
            :key="scene.id"
            :class="['scene-item', activeSceneId === scene.id ? 'scene-item--active' : '']"
            @click="activeSceneId = scene.id"
          >
            <div class="scene-thumb">
              <img v-if="scene.image_path" :src="getPublicUrl(scene.image_path)" :alt="scene.name" />
              <svg v-else class="scene-thumb-placeholder" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
            <div class="scene-item-info">
              <span class="scene-item-name">{{ scene.name }}</span>
              <span class="scene-item-meta">Scene {{ index + 1 }}</span>
            </div>
          </li>
        </ul>
      </div>
    </aside>

    <!-- Center: Marzipano Viewer -->
    <div :class="['editor-viewer-area', addHotspotMode ? 'editor-viewer-area--crosshair' : '']">
      <ClientOnly>
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
        <div v-else style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #4b5563; gap: 0.75rem; background: #000;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          <p style="font-size: 0.875rem;">No scenes — go back to the space and upload panoramas first</p>
        </div>
      </ClientOnly>
    </div>

    <!-- Right Panel: Hotspot Inspector -->
    <aside class="editor-inspector-panel">
      <div class="scene-panel-header">
        <span class="scene-panel-title">Hotspots</span>
        <span style="font-size: 0.7rem; color: #6b7280;">({{ currentHotspots.length }})</span>
      </div>

      <div v-if="!activeSceneId" style="padding: 1.5rem 1rem; text-align: center; color: #4b5563; font-size: 0.8rem;">
        Select a scene to manage hotspots.
      </div>

      <div v-else-if="currentHotspots.length === 0" style="padding: 1.5rem 1rem; text-align: center; color: #4b5563; font-size: 0.8rem;">
        No hotspots in this scene.<br />
        <span style="font-size: 0.75rem; color: #374151; margin-top: 0.25rem; display: block;">
          Click "Add Hotspot" then click anywhere in the viewer.
        </span>
      </div>

      <div v-else style="overflow-y: auto; flex: 1; padding: 0.5rem;">
        <div
          v-for="hotspot in currentHotspots"
          :key="hotspot.id"
          style="border: 1px solid #1f1f1f; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.5rem; background: #111;"
        >
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">{{ hotspot.type }}</span>
            <button
              @click="handleDeleteHotspot(hotspot.id)"
              style="font-size: 0.7rem; color: #ef4444; background: none; border: none; cursor: pointer; padding: 0; font-weight: 500;"
            >Delete</button>
          </div>
          <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 0.25rem;">
            Yaw: {{ hotspot.yaw.toFixed(2) }} · Pitch: {{ hotspot.pitch.toFixed(2) }}
          </div>
          <div
            v-if="hotspot.label"
            style="font-size: 0.78rem; color: #d1d5db; background: #1a1a1a; padding: 0.375rem 0.5rem; border-radius: 4px; margin-top: 0.375rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
          >
            {{ hotspot.label }}
          </div>
        </div>
      </div>
    </aside>
  </div>

  <!-- Add Hotspot Modal — rendered as sibling (Vue 3 fragment) -->
  <div v-if="showHotspotModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;">
    <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 0.75rem; width: 100%; max-width: 380px; overflow: hidden;">
      <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #2a2a2a; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #f3f4f6; margin: 0;">Configure Hotspot</h3>
        <button @click="showHotspotModal = false" style="color: #6b7280; background: none; border: none; cursor: pointer; line-height: 0; padding: 0.25rem; border-radius: 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <form @submit.prevent="saveHotspot" style="padding: 1.25rem 1.5rem;">
        <div style="margin-bottom: 1rem;">
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #9ca3af; margin-bottom: 0.375rem; text-transform: uppercase; letter-spacing: 0.04em;">Type</label>
          <select
            v-model="newHotspotForm.type"
            @change="newHotspotForm.payload = {}"
            style="width: 100%; padding: 0.5rem 0.75rem; background: #111; border: 1px solid #2a2a2a; border-radius: 6px; color: #e5e7eb; font-size: 0.875rem; outline: none;"
          >
            <option value="nav">Navigation (Go to Scene)</option>
            <option value="info">Info Label</option>
          </select>
        </div>

        <div v-if="newHotspotForm.type === 'nav'" style="margin-bottom: 1rem;">
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #9ca3af; margin-bottom: 0.375rem; text-transform: uppercase; letter-spacing: 0.04em;">Target Scene</label>
          <select
            v-model="newHotspotForm.payload.target_scene_id"
            required
            style="width: 100%; padding: 0.5rem 0.75rem; background: #111; border: 1px solid #2a2a2a; border-radius: 6px; color: #e5e7eb; font-size: 0.875rem; outline: none;"
          >
            <option value="">— Select a scene —</option>
            <option v-for="scene in scenes.filter(s => s.id !== activeSceneId)" :key="scene.id" :value="scene.id">
              {{ scene.name }}
            </option>
          </select>
        </div>

        <div v-if="newHotspotForm.type === 'info'" style="margin-bottom: 1rem;">
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #9ca3af; margin-bottom: 0.375rem; text-transform: uppercase; letter-spacing: 0.04em;">Label</label>
          <input
            v-model="newHotspotForm.payload.label"
            type="text"
            required
            placeholder="e.g. Living Room"
            style="width: 100%; padding: 0.5rem 0.75rem; background: #111; border: 1px solid #2a2a2a; border-radius: 6px; color: #e5e7eb; font-size: 0.875rem; outline: none;"
          />
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.625rem; margin-top: 1.25rem;">
          <button type="button" @click="showHotspotModal = false" class="editor-action-btn">Cancel</button>
          <button type="submit" class="editor-action-btn editor-action-btn--primary">Save Hotspot</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import type { ViewerScene, ViewerHotspot } from '~/components/editor/MarzipanoViewer.vue'

definePageMeta({ layout: 'editor', middleware: 'auth' })

const route = useRoute()
const spaceId = route.params.spaceId as string
const supabase = useSupabaseClient()

const { currentSpace, fetchSpace, publishSpace } = useSpaces()
const { scenes, fetchScenes } = useScenes()
const { hotspots, fetchHotspots, createHotspot, deleteHotspot } = useHotspots()

const activeSceneId = ref<string | null>(null)
const addHotspotMode = ref(false)
const showHotspotModal = ref(false)
const isPending = ref(false)

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
  }
})

// Fetch hotspots whenever active scene changes
watch(activeSceneId, async (newId) => {
  if (newId) await fetchHotspots(newId)
})

const getPublicUrl = (path: string) =>
  supabase.storage.from('tours').getPublicUrl(path).data.publicUrl

// Map DB scene schema → ViewerScene (adds panorama_url + viewer defaults)
const mappedScenes = computed((): ViewerScene[] =>
  scenes.value.map(s => ({
    id: s.id,
    name: s.name,
    panorama_url: s.image_path ? getPublicUrl(s.image_path) : null,
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
