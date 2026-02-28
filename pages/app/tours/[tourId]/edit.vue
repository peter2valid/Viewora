<template>
  <div class="editor-grid">
    <!-- Top bar (spans both columns) -->
    <EditorEditorTopBar
      :title="tourTitle"
      :status="tourStatus"
      :space-id="spaceId"
      :add-hotspot-mode="addHotspotMode"
      :saving="saving"
      @update:title="onTitleUpdate"
      @save="save"
      @publish="togglePublish"
      @toggle-hotspot-mode="addHotspotMode = !addHotspotMode"
    />

    <!-- Scene list panel -->
    <div class="editor-scene-panel">
      <EditorSceneListPanel
        :scenes="scenes"
        :hotspots="hotspots"
        :active-scene-id="activeSceneId"
        :uploading="uploading"
        :upload-error="uploadError"
        @select-scene="setActiveScene"
        @delete-scene="confirmDeleteScene"
        @upload-file="handleUpload"
      />
    </div>

    <!-- Marzipano viewer -->
    <div class="editor-viewer-area" :class="{ 'editor-viewer-area--crosshair': addHotspotMode }">
      <EditorMarzipanoViewer
        :scenes="scenes"
        :hotspots="hotspots"
        :active-scene-id="activeSceneId"
        :add-hotspot-mode="addHotspotMode"
        @hotspot-placed="onHotspotPlaced"
        @hotspot-navigate="setActiveScene"
      />
    </div>

    <!-- Hotspot picker modal -->
    <EditorHotspotPickerModal
      v-if="showHotspotPicker"
      :scenes="scenes"
      :current-scene-id="activeSceneId"
      @confirm="onHotspotConfirm"
      @cancel="cancelHotspot"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'editor',
  middleware: 'auth',
})

const route = useRoute()
const tourId = route.params.tourId as string

// ── Data ──────────────────────────────────────────────────────────────────────
const { fetchTour, updateTourTitle, updateTourStatus } = useTours()
const { scenes, uploading, uploadError, fetchScenes, uploadAndCreateScene, deleteScene } = useScenes()
const { hotspots, fetchHotspots, createHotspot } = useHotspots()

const tourTitle = ref('Untitled Tour')
const tourStatus = ref('draft')
const spaceId = ref('')
const activeSceneId = ref<string | null>(null)
const addHotspotMode = ref(false)
const saving = ref(false)

// Hotspot placement state
const showHotspotPicker = ref(false)
const pendingHotspotCoords = ref<{ yaw: number; pitch: number } | null>(null)

onMounted(async () => {
  try {
    const [tour] = await Promise.all([
      fetchTour(tourId),
    ])

    tourTitle.value = tour.title
    tourStatus.value = tour.status
    spaceId.value = tour.property_id

    await fetchScenes(tourId)

    if (scenes.value.length > 0) {
      activeSceneId.value = scenes.value[0].id
    }

    const sceneIds = scenes.value.map(s => s.id)
    await fetchHotspots(sceneIds)
  } catch (e: any) {
    console.error('Failed to load editor:', e.message)
  }
})

// ── Actions ───────────────────────────────────────────────────────────────────

function setActiveScene(sceneId: string) {
  activeSceneId.value = sceneId
}

async function handleUpload(file: File) {
  try {
    const scene = await uploadAndCreateScene(tourId, file)
    // Switch to the newly uploaded scene
    activeSceneId.value = scene.id
    // Hotspots don't need re-fetch — new scene has none
  } catch {
    // uploadError is set inside the composable
  }
}

async function confirmDeleteScene(sceneId: string) {
  if (activeSceneId.value === sceneId) {
    const next = scenes.value.find(s => s.id !== sceneId)
    activeSceneId.value = next?.id ?? null
  }

  await deleteScene(sceneId)

  // Re-fetch hotspots since scene's hotspots are cascade-deleted
  const sceneIds = scenes.value.map(s => s.id)
  await fetchHotspots(sceneIds)
}

function onHotspotPlaced(coords: { yaw: number; pitch: number }) {
  pendingHotspotCoords.value = coords
  showHotspotPicker.value = true
  addHotspotMode.value = false
}

async function onHotspotConfirm(payload: {
  type: 'nav' | 'info'
  targetSceneId: string | null
  label: string
}) {
  if (!pendingHotspotCoords.value || !activeSceneId.value) return

  showHotspotPicker.value = false

  await createHotspot({
    scene_id: activeSceneId.value,
    yaw: pendingHotspotCoords.value.yaw,
    pitch: pendingHotspotCoords.value.pitch,
    target_scene_id: payload.targetSceneId,
    label: payload.label || null,
  })

  pendingHotspotCoords.value = null
}

function cancelHotspot() {
  showHotspotPicker.value = false
  pendingHotspotCoords.value = null
}

async function onTitleUpdate(newTitle: string) {
  tourTitle.value = newTitle
  await updateTourTitle(tourId, newTitle)
}

async function save() {
  saving.value = true
  try {
    // Save current scene camera positions (initial_yaw/pitch/fov not yet tracked
    // from the viewer's live state — persisted on creation only for now)
    await updateTourTitle(tourId, tourTitle.value)
  } finally {
    saving.value = false
  }
}

async function togglePublish() {
  const next = tourStatus.value === 'published' ? 'draft' : 'published'
  await updateTourStatus(tourId, next as 'draft' | 'published')
  tourStatus.value = next
}
</script>
