<template>
  <div class="editor-shell" style="background: #000;">
    <!-- Top Bar -->
    <div class="editor-topbar" style="justify-content: space-between;">
      <div class="editor-tour-title">
        <span class="editor-tour-title-text" style="font-size: 1rem; font-weight: 700;">
          {{ space?.title ?? 'Loading…' }}
        </span>
      </div>

      <div>
        <NuxtLink v-if="user" :to="`/app/spaces/${spaceId}/editor`" class="editor-action-btn editor-action-btn--secondary" style="text-decoration: none;">
          Edit
        </NuxtLink>
        <div v-else style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="color: #9ca3af; font-size: 0.8rem;">Powered by</span>
          <a href="https://viewora.software" target="_blank" class="sidebar-logo" style="font-size: 1rem; text-decoration: none;">Viewora</a>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="errorMsg" class="marzipano-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24"
        fill="none" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p style="color: #ef4444;">{{ errorMsg }}</p>
      <NuxtLink to="/" class="btn btn-primary" style="margin-top: 1rem;">Go Home</NuxtLink>
    </div>

    <!-- Loading -->
    <div v-else-if="pending" class="marzipano-placeholder">
      <div class="confirm-spinner" style="border-top-color: var(--accent);"></div>
      <p>Loading 360° Experience...</p>
    </div>

    <!-- Viewer -->
    <div v-else class="editor-viewer-area" style="grid-column: 1 / -1; grid-row: 2; height: calc(100vh - 52px);">
      <ClientOnly>
        <EditorMarzipanoViewer
          :scenes="marzipanoScenes"
          :hotspots="[]"
          :active-scene-id="activeSceneId"
          :add-hotspot-mode="false"
          @hotspot-navigate="setActiveScene"
          style="width: 100%; height: 100%;"
        />
      </ClientOnly>

      <!-- Scene selector (bottom overlay) -->
      <div v-if="scenes.length > 1" class="tour-scene-selector">
        <button
          v-for="scene in scenes"
          :key="scene.id"
          class="tour-scene-thumb"
          :class="{ 'tour-scene-thumb--active': scene.id === activeSceneId }"
          @click="setActiveScene(scene.id)"
          :title="scene.name"
        >
          <div class="tour-scene-label">{{ scene.name }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: false,
})

const route = useRoute()
const spaceId = route.params.id as string

const user = useSupabaseUser()

const { currentSpace: space, fetchSpace } = useSpaces()
const { scenes, fetchScenes } = useScenes()

const activeSceneId = ref<string | null>(null)
const pending = ref(true)
const errorMsg = ref('')

// Map scenes for MarzipanoViewer (needs panorama_url)
const marzipanoScenes = computed(() =>
  scenes.value.map(s => ({
    id: s.id,
    name: s.name,
    panorama_url: null, // Public viewer — panorama URLs fetched separately if needed
  }))
)

onMounted(async () => {
  try {
    // Load space (checks is_published via the public policy)
    await fetchSpace(spaceId)
    if (!space.value) throw new Error('Tour not found or not published.')

    useSeoMeta({ title: `${space.value.title} | Viewora 360° Tour` })

    // Load scenes
    await fetchScenes(spaceId)

    if (scenes.value.length > 0) {
      activeSceneId.value = scenes.value[0].id
    } else {
      throw new Error('This tour has no scenes yet.')
    }
  } catch (e: any) {
    errorMsg.value = e.message || 'An error occurred loading the tour.'
  } finally {
    pending.value = false
  }
})

function setActiveScene(sceneId: string) {
  activeSceneId.value = sceneId
}
</script>

<style scoped>
.tour-scene-selector {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 90vw;
  overflow-x: auto;
  z-index: 20;
}

.tour-scene-thumb {
  position: relative;
  width: 80px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  background: #1a1a1a;
  padding: 0;
  transition: all 0.2s ease;
}

.tour-scene-thumb:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.5);
}

.tour-scene-thumb--active {
  border-color: var(--accent);
}

.tour-scene-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 16px 4px 4px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
