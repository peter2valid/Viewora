<template>
  <EditorSpaceEditorShell
    :scenes="shellScenes"
    :space-name="tourTitle"
    :space-id="spaceId"
    :active-scene-id="activeSceneId"
    :is-published="tourStatus === 'published'"
    :is-publishing="saving"
    :add-hotspot-mode="addHotspotMode"
    :show-hotspot-toggle="true"
    @select-scene="setActiveScene"
    @toggle-hotspot-mode="addHotspotMode = !addHotspotMode"
    @publish="togglePublish"
  >
    <template #viewer>
      <EditorMarzipanoViewer
        :scenes="scenes"
        :hotspots="hotspots"
        :active-scene-id="activeSceneId"
        :add-hotspot-mode="addHotspotMode"
        @hotspot-placed="onHotspotPlaced"
        @hotspot-navigate="setActiveScene"
        style="width: 100%; height: 100%;"
      />
    </template>
  </EditorSpaceEditorShell>

  <!-- Hotspot picker modal -->
  <EditorHotspotPickerModal
    v-if="showHotspotPicker"
    :scenes="scenes"
    :current-scene-id="activeSceneId"
    @confirm="onHotspotConfirm"
    @cancel="cancelHotspot"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: false,
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

// Map DB scenes to shell format
const shellScenes = computed(() =>
  scenes.value.map(s => ({
    id: s.id,
    name: s.name,
    hasImage: !!s.panorama_url,
  }))
)

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
    activeSceneId.value = scene.id
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
