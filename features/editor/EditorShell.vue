<template>
  <div class="editor-shell">

    <!-- Hidden file input — triggered by ViewerCanvas "Choose File" (empty state) -->
    <input
      ref="canvasFileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handlePanoramaUpload"
    />

    <!-- Hidden file input — triggered by SceneDock Add Scene -->
    <input
      ref="addSceneFileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handleAddSceneFileChange"
    />

    <!-- ── Full-viewport viewer ── -->
    <ViewerCanvas
      :active-scene="activeViewerScene"
      :space-type="space?.space_type"
      :hotspots="activeSceneHotspotsWithPreview"
      :is-tracing="isTracing"
      :trace-points="tracePoints"
      @error="showToast($event.message, 'error')"
      @add-hotspot="handleViewerAddHotspot"
      @hotspot-click="handleHotspotClick"
      @hotspot-edit="handleHotspotEdit"
      @hotspot-delete="deleteHotspot"
      @hotspot-reposition="handleHotspotReposition"
      @request-upload="handleViewerCanvasUpload"
      @update-trace="handleUpdateTrace"
      @cancel-placement="onCancelPlacement"
    />

    <!-- ── Floating panels (position:fixed, above viewer) ── -->
    <TopBar
      v-if="editorStore.mode !== 'preview'"
      :space-name="space?.title || 'Edit Tour'"
      :is-published="Boolean(space?.is_published)"
      :publishing="publishing"
      :has-processing-scenes="hasProcessingScenes"
      :space-id="space?.id"
      :slug="space?.slug"
      @toggle-publish="handleTogglePublish"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
      @preview="editorStore.setMode('preview')"
    />

    <HotspotPanel
      :visible="editorStore.activePanel === 'hotspots' && !isPreviewMode"
      :hotspots="activeSceneHotspots"
      :selected-id="editorStore.selectedHotspotId"
      :draft="editDraft"
      :other-scenes="otherScenesForHotspot"
      :saving="savingHotspot"
      :deleting="deletingHotspot"
      @close="closeHotspotPanel"
      @select="selectHotspot"
      @update-draft="patchHotspotDraft"
      @save="saveHotspotEdit"
      @delete="confirmDeleteHotspot"
      @start-tracing="startTracing"
    />

    <LeftToolbar
      v-if="editorStore.mode !== 'preview'"
      @open-type-picker="onOpenTypePicker"
      @cancel-placement="onCancelPlacement"
    />

    <SceneDock
      v-if="!isPreviewMode || scenes.length > 1"
      :scenes="sceneChips"
      :active-scene-id="selectedSceneId"
      :add-scene-pending="false"
      :show-add="!isPreviewMode"
      @select-scene="selectScene"
      @add-scene="handleAddScene"
      @reorder-scenes="handleReorderScenes"
      @rename-scene="handleRenameScene"
    />

    <!-- Preview Mode Overlays -->
    <Transition name="fade-smooth">
      <div
        v-if="isPreviewMode"
        class="fixed top-5 left-5 z-30 flex flex-col gap-1 pointer-events-none"
      >
        <h1 class="text-white text-lg font-black tracking-tight drop-shadow-lg uppercase">{{ space?.title || 'Tour Preview' }}</h1>
        <p v-if="space?.location_text" class="text-white/60 text-[10px] font-bold tracking-[0.2em] drop-shadow-md uppercase">{{ space.location_text }}</p>
      </div>
    </Transition>

    <!-- Preview exit button -->
    <Transition name="fade-smooth">
      <button
        v-if="isPreviewMode"
        class="fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 h-10 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md text-white text-[12px] font-bold transition-all shadow-2xl pointer-events-auto"
        @click="editorStore.setMode('view')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
        Exit Preview
      </button>
    </Transition>

    <!-- Type picker + quick editor (floating, fixed-position) -->
    <HotspotTypePicker
      :visible="showTypePicker"
      @select="onTypePicked"
      @cancel="showTypePicker = false"
    />

    <HotspotQuickEditor
      :visible="quickEditHotspotId !== null"
      :draft="editDraft"
      :other-scenes="otherScenesForHotspot"
      :screen-x="quickEditScreenPos.x"
      :screen-y="quickEditScreenPos.y"
      :saving="addingHotspot"
      @update-draft="patchHotspotDraft"
      @done="onQuickEditDone"
      @more="onQuickEditMore"
      @cancel="onQuickEditCancel"
    />

    <!-- Toast + Share modal teleported to body -->
    <Teleport to="body">
      <Transition name="fade-smooth">
        <div
          v-if="toast"
          class="editor-toast"
          :class="toast.type === 'error' ? 'editor-toast--error' : 'editor-toast--success'"
        >
          <div class="editor-toast__dot"></div>
          <span class="editor-toast__msg">{{ toast.message }}</span>
        </div>
      </Transition>

      <Transition name="fade-smooth">
        <div v-if="renameCandidate" class="rename-popover" role="dialog" aria-label="Rename scene">
          <span class="rename-popover__label">Scene name</span>
          <input
            ref="renameInputRef"
            v-model="renameDraft"
            class="rename-popover__input"
            type="text"
            maxlength="64"
            placeholder="Scene name"
            @keydown.enter="saveRenameScene"
            @keydown.exact.escape="renameCandidate = null"
          />
          <div class="rename-popover__actions">
            <button class="rename-popover__save" :disabled="renameSaving" @click="saveRenameScene">Save</button>
            <button class="rename-popover__cancel" @click="renameCandidate = null">✕</button>
          </div>
          <div class="rename-popover__delete-row">
            <template v-if="sceneDeleteConfirm === renameCandidate.id">
              <button class="rename-popover__del-confirm" :disabled="deletingScene" @click="confirmDeleteScene(renameCandidate.id)">
                <span v-if="deletingScene" class="hs-edit-panel__spin" />
                <template v-else>Confirm delete</template>
              </button>
              <button class="rename-popover__del-abort" @click="sceneDeleteConfirm = null">Cancel</button>
            </template>
            <template v-else>
              <button
                class="rename-popover__del"
                @click="sceneDeleteConfirm = renameCandidate.id"
              >Delete scene</button>
            </template>
          </div>
        </div>
      </Transition>

      <Transition name="share-modal">
        <div v-if="showSettingsPanel" class="share-overlay" @click.self="showSettingsPanel = false">
          <div class="settings-modal" role="dialog" aria-modal="true" aria-label="Tour settings">
            <div class="settings-modal__header">
              <span class="settings-modal__title">Tour settings</span>
              <button class="share-modal__close" @click="showSettingsPanel = false">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="settings-modal__field">
              <div class="settings-modal__field-header">
                <span class="settings-modal__label">Field of view</span>
                <span class="settings-modal__value">{{ settingsDraft.hfov }}°</span>
              </div>
              <input type="range" v-model.number="settingsDraft.hfov" min="30" max="120" step="1" class="settings-modal__range" />
            </div>

            <div class="settings-modal__field">
              <div class="settings-modal__field-header">
                <span class="settings-modal__label">Starting yaw</span>
                <span class="settings-modal__value">{{ settingsDraft.yaw }}°</span>
              </div>
              <input type="range" v-model.number="settingsDraft.yaw" min="-180" max="180" step="1" class="settings-modal__range" />
            </div>

            <div class="settings-modal__field">
              <div class="settings-modal__field-header">
                <span class="settings-modal__label">Starting pitch</span>
                <span class="settings-modal__value">{{ settingsDraft.pitch }}°</span>
              </div>
              <input type="range" v-model.number="settingsDraft.pitch" min="-90" max="90" step="1" class="settings-modal__range" />
            </div>

            <div class="settings-modal__toggle-row">
              <div>
                <div class="settings-modal__label">Auto-rotate</div>
                <div class="settings-modal__sublabel">Slowly pan the view on load</div>
              </div>
              <button
                class="settings-modal__toggle"
                :class="{ 'settings-modal__toggle--on': settingsDraft.autoRotate }"
                role="switch"
                :aria-checked="settingsDraft.autoRotate"
                @click="settingsDraft.autoRotate = !settingsDraft.autoRotate"
              >
                <span class="settings-modal__toggle-thumb" />
              </button>
            </div>

            <div class="settings-modal__actions">
              <button class="settings-modal__save" :disabled="settingsSaving" @click="saveSettings">
                <span v-if="settingsSaving" class="hs-edit-panel__spin" />
                <template v-else>Save settings</template>
              </button>
              <button class="settings-modal__cancel" @click="showSettingsPanel = false">Cancel</button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="share-modal">
        <div v-if="showShareModal" class="share-overlay" @click.self="showShareModal = false">
          <div class="share-modal" role="dialog" aria-modal="true" aria-label="Share your tour">
            <div class="share-modal__header">
              <div class="share-modal__icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h2 class="share-modal__title">Your tour is live!</h2>
                <p class="share-modal__sub">Share this link with your clients</p>
              </div>
              <button class="share-modal__close" @click="showShareModal = false">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="share-modal__url-row">
              <span class="share-modal__url">{{ publicUrl }}</span>
              <button class="share-modal__copy" @click="copyPublicUrl">
                <template v-if="urlCopied">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  Copied!
                </template>
                <template v-else>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </template>
              </button>
            </div>

            <div class="share-modal__embed">
              <p class="share-modal__embed-label">Embed on your website</p>
              <div class="share-modal__url-row">
                <code class="share-modal__url share-modal__embed-code">{{ embedUrl }}</code>
                <button class="share-modal__copy" @click="copyEmbedCode">
                  <template v-if="embedCopied">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    Copied!
                  </template>
                  <template v-else>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy iframe
                  </template>
                </button>
              </div>
            </div>

            <div class="share-modal__actions">
              <a
                :href="`https://wa.me/?text=${encodeURIComponent('Check out my virtual tour: ' + publicUrl)}`"
                target="_blank"
                rel="noopener noreferrer"
                class="share-modal__whatsapp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                Share on WhatsApp
              </a>
              <button class="share-modal__done" @click="showShareModal = false">Keep editing</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { usePlanStore } from '~/stores/plan'
import { useApiFetch } from '~/composables/useApiFetch'
import { type EditorHotspot, mapDbHotspots } from '~/features/editor/mappers'
import { useEditorStore } from '~/features/editor/store/useEditorStore'
import ViewerCanvas from '~/features/editor/components/ViewerCanvas.vue'
import TopBar from '~/features/editor/components/TopBar.vue'
import LeftToolbar from '~/features/editor/components/LeftToolbar.vue'
import SceneDock from '~/features/editor/components/SceneDock.vue'
import { useSceneUpload } from '~/features/editor/composables/useSceneUpload'
import { useEditorRealtime } from '~/features/editor/composables/useEditorRealtime'
import { useEditorUpload, isLocalSceneId, type SceneUploadState } from '~/features/editor/composables/useEditorUpload'
import { useHotspotEditor } from '~/features/editor/composables/useHotspotEditor'
import { useEditorPublish } from '~/features/editor/composables/useEditorPublish'
import HotspotPanel from '~/features/editor/components/HotspotPanel.vue'
import HotspotTypePicker from '~/features/editor/components/HotspotTypePicker.vue'
import HotspotQuickEditor from '~/features/editor/components/HotspotQuickEditor.vue'

const editorStore = useEditorStore()

const props = defineProps<{
  spaceId: string
}>()

const { apiFetch } = useApiFetch()
const planStore = usePlanStore()

const {
  localUploads,
  uploadFile,
} = useSceneUpload(props.spaceId)

const space = ref<any>(null)
const placeholderPanoramaUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800" viewBox="0 0 1600 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23111627"/><stop offset="55%" stop-color="%231f2a44"/><stop offset="100%" stop-color="%232a4365"/></linearGradient></defs><rect width="1600" height="800" fill="url(%23g)"/><circle cx="1220" cy="230" r="180" fill="rgba(255,255,255,0.08)"/><circle cx="360" cy="600" r="260" fill="rgba(255,255,255,0.06)"/><g fill="none" stroke="rgba(255,255,255,0.35)"><path d="M0 540h1600"/><path d="M0 480h1600"/></g><text x="120" y="170" fill="rgba(255,255,255,0.88)" font-family="Arial" font-size="48" font-weight="700">Viewora 360 Tour Preview</text><text x="120" y="235" fill="rgba(255,255,255,0.7)" font-family="Arial" font-size="28">Upload your panorama to replace this placeholder instantly.</text></svg>'
const scenes = ref<any[]>([])
const selectedSceneId = ref('')
const hotspotsByScene = ref<Record<string, EditorHotspot[]>>({})
const inlineEditMode = computed({
  get: () => editorStore.mode === 'hotspot',
  set: (val: boolean) => editorStore.setMode(val ? 'hotspot' : 'view'),
})

const {
  pendingScenePreviewById,
  sceneUploadStateById,
  canvasFileInput,
  addSceneFileInput,
  backendSceneStatusToUploadState,
  sceneHasRenderableImage,
  scenePreviewUrl,
  replacePendingScenePreviewMap,
  createOptimisticLocalScene,
  removeOptimisticLocalScene,
  setSceneUploadState,
  removeSceneUploadState,
  mapSceneLinkTargets,
  createSceneWithPanorama,
  handlePanoramaUpload,
  handleViewerCanvasUpload,
  handleAddSceneFileChange,
  enqueuePanoramaFiles,
  hydrateRecoverySnapshot,
} = useEditorUpload(
  props.spaceId,
  uploadFile,
  scenes,
  selectedSceneId,
  hotspotsByScene,
  showToast,
  fetchScenes,
  inlineEditMode,
)

const sceneChips = computed(() => {
  if (!scenes.value.length) return []
  return scenes.value
    .slice()
    .sort((a, b) => {
      const orderDiff = Number(a.order_index || 0) - Number(b.order_index || 0)
      if (orderDiff !== 0) return orderDiff
      return String(a.id || '').localeCompare(String(b.id || ''))
    })
    .map((s, idx) => {
      const state: SceneUploadState = sceneUploadStateById.value[s.id] || backendSceneStatusToUploadState(s.status)
      const badge: 'loading' | 'failed' | null = state === 'failed' ? 'failed' : state === 'ready' ? null : 'loading'
      return {
        id: s.id,
        label: s.name || `Scene ${idx + 1}`,
        ready: state === 'ready',
        badge,
        imageUrl: scenePreviewUrl(s),
      }
    })
})

const {
  editDraft,
  savingHotspot,
  addingHotspot,
  deletingHotspot,
  quickEditHotspotId,
  quickEditScreenPos,
  repositioningHotspotId,
  hotspotDraftType,
  showTypePicker,
  isTracing,
  tracePoints,
  deleteCandidate,
  activeSceneHotspots,
  hotspotCount,
  activeSceneHotspotsWithPreview,
  otherScenesForHotspot,
  startTracing,
  handleUpdateTrace,
  onOpenTypePicker,
  onTypePicked,
  onCancelPlacement,
  onQuickEditCancel,
  handleViewerAddHotspot,
  onQuickEditDone,
  onQuickEditMore,
  handleHotspotEdit,
  deleteHotspot,
  handleHotspotReposition,
  selectHotspot,
  patchHotspotDraft,
  closeHotspotPanel,
  confirmDeleteHotspot,
  saveHotspotEdit,
} = useHotspotEditor(
  apiFetch,
  editorStore,
  inlineEditMode,
  selectedSceneId,
  hotspotsByScene,
  sceneChips,
  showToast,
  fetchHotspots,
)

const {
  publishing,
  showSettingsPanel,
  settingsDraft,
  settingsSaving,
  showShareModal,
  handleTogglePublish,
  saveSettings,
} = useEditorPublish(
  props.spaceId,
  apiFetch,
  space,
  scenes,
  hotspotsByScene,
  sceneUploadStateById,
  backendSceneStatusToUploadState,
  fetchHotspots,
  showToast,
  editorStore,
)

let isMounted = false
let fetchScenesVersion = 0
let fetchScenesController: AbortController | null = null

const renameCandidate = ref<{ id: string; name: string } | null>(null)
const renameDraft = ref('')
const renameSaving = ref(false)
const renameInputRef = ref<HTMLInputElement | null>(null)
const sceneDeleteConfirm = ref<string | null>(null)
const deletingScene = ref(false)

const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
const urlCopied = ref(false)

const isPreviewMode = computed(() => editorStore.mode === 'preview')

function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}

async function copyPublicUrl() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    urlCopied.value = true
    setTimeout(() => { urlCopied.value = false }, 2000)
  } catch {
    showToast('Could not copy — please copy manually', 'error')
  }
}

async function copyEmbedCode() {
  const code = `<iframe src="${embedUrl.value}" width="100%" height="600" frameborder="0" allowfullscreen style="border-radius:8px"></iframe>`
  try {
    await navigator.clipboard.writeText(code)
    embedCopied.value = true
    setTimeout(() => { embedCopied.value = false }, 2000)
  } catch {
    showToast('Could not copy — please copy manually', 'error')
  }
}

const publicUrl = computed(() => {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/p/${space.value?.slug || space.value?.id}`
})
const embedUrl = computed(() => {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/embed/${space.value?.slug || space.value?.id}`
})
const embedCopied = ref(false)

const hasPanorama = computed(() => Boolean(scenes.value.length || Object.keys(pendingScenePreviewById.value).length))

const selectedScene = computed(() =>
  scenes.value.find((s) => s.id === selectedSceneId.value) || scenes.value[0] || null
)

const activeScene = computed(() => selectedScene.value)


const activePanoramaSrc = computed(() => {
  // pendingScenePreviewById may contain blob: or data: URLs created in-browser for dock thumbnails.
  // PSV uses fetch() internally which CANNOT load blob: or data: URLs.
  // Only forward real HTTPS URLs from the CDN to the 360 viewer.
  const pending = activeScene.value?.id ? pendingScenePreviewById.value[activeScene.value.id] : null
  if (pending && pending.startsWith('https://')) return pending

  // Use raw_image_url as the main texture since EquirectangularTilesAdapter
  // does not natively support Deep Zoom pyramids without custom coordinate mapping.
  if (activeScene.value?.raw_image_url) return activeScene.value.raw_image_url
  if (activeScene.value?.thumbnail_url) return activeScene.value.thumbnail_url
  return placeholderPanoramaUrl
})

const activeViewerScene = computed(() => {
  const url = activePanoramaSrc.value
  if (!url || url === placeholderPanoramaUrl) return null
  const s = space.value?.property_360_settings?.[0]
  return {
    id: activeScene.value?.id ?? 'editor-scene',
    imageUrl: url,
    // tileManifestUrl: activeScene.value?.tile_manifest_url, // Disabled until DZI is supported
    width: activeScene.value?.width,
    height: activeScene.value?.height,
    hotspots: activeSceneHotspots.value ?? [],
    settings: {
      hfov_default: s?.hfov_default ?? 90,
      pitch_default: s?.pitch_default ?? 0,
      yaw_default: s?.yaw_default ?? 0,
      auto_rotate_enabled: s?.auto_rotate_enabled ?? false,
    },
  }
})


const hasProcessingScenes = computed(() =>
  scenes.value.some((s: any) => {
    const state = sceneUploadStateById.value[s.id] || backendSceneStatusToUploadState(s.status)
    return state !== 'ready' && state !== 'failed'
  }) || localUploads.value.length > 0
)

function unwrapApiData<T = any>(value: any): T {
  if (value && typeof value === 'object' && 'data' in value && value.data !== undefined) return value.data as T
  if (value && typeof value === 'object' && 'result' in value && value.result !== undefined) return value.result as T
  return value as T
}

function toArrayPayload<T = any>(value: any, key: string): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as any)[key])) return (value as any)[key] as T[]
  return []
}

// Track processing completion
watch(hasProcessingScenes, (sceneProcessing) => {
  if (sceneProcessing) {
    window.onbeforeunload = () => 'Uploads are still processing. Are you sure you want to leave?'
  } else {
    window.onbeforeunload = null
  }
}, { immediate: true })

watch(renameCandidate, async (val) => {
  if (!val) { sceneDeleteConfirm.value = null; return }
  await nextTick()
  renameInputRef.value?.focus()
  renameInputRef.value?.select()
})

function handleRenameScene(id: string) {
  const scene = scenes.value.find((s) => s.id === id)
  if (!scene) return
  deleteCandidate.value = null
  renameDraft.value = scene.name || ''
  renameCandidate.value = { id, name: scene.name || '' }
}

async function saveRenameScene() {
  if (!renameCandidate.value || renameSaving.value) return
  const name = renameDraft.value.trim()
  if (!name) return
  renameSaving.value = true
  const { id } = renameCandidate.value
  const prevScenes = scenes.value.slice()
  scenes.value = scenes.value.map((s) => s.id === id ? { ...s, name } : s)
  renameCandidate.value = null
  try {
    await apiFetch(`/scenes/${id}`, { method: 'PATCH', body: { name } })
    showToast('Scene renamed')
  } catch (e: any) {
    scenes.value = prevScenes
    showToast(e?.data?.statusMessage || 'Failed to rename scene', 'error')
  } finally {
    renameSaving.value = false
  }
}

async function confirmDeleteScene(id: string) {
  if (deletingScene.value) return
  deletingScene.value = true
  const prevScenes = scenes.value.slice()
  const prevHotspots = { ...hotspotsByScene.value }
  const prevSelectedId = selectedSceneId.value
  renameCandidate.value = null
  sceneDeleteConfirm.value = null
  scenes.value = scenes.value.filter((s) => s.id !== id)
  const { [id]: _removed, ...remainingHotspots } = hotspotsByScene.value
  hotspotsByScene.value = remainingHotspots
  if (selectedSceneId.value === id) selectedSceneId.value = scenes.value[0]?.id || ''
  try {
    await apiFetch(`/scenes/${id}`, { method: 'DELETE' })
    showToast('Scene deleted')
  } catch (e: any) {
    scenes.value = prevScenes
    hotspotsByScene.value = prevHotspots
    selectedSceneId.value = prevSelectedId
    showToast(e?.data?.statusMessage || 'Failed to delete scene', 'error')
  } finally {
    deletingScene.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (deleteCandidate.value) { e.preventDefault(); deleteCandidate.value = null; return }
    if (renameCandidate.value) { e.preventDefault(); renameCandidate.value = null; return }
    if (showSettingsPanel.value) { showSettingsPanel.value = false; return }
    if (showShareModal.value) { showShareModal.value = false; return }
    if (inlineEditMode.value) { e.preventDefault(); inlineEditMode.value = false }
    return
  }
  const target = e.target as HTMLElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
  if (editorStore.isModalOpen) return
  if (e.key === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    e.preventDefault()
    inlineEditMode.value = !inlineEditMode.value
  }
}

async function handleReorderScenes(orderedIds: string[]) {
  if (orderedIds.some(isLocalSceneId)) {
    showToast('Wait for all scenes to finish uploading before reordering.', 'error')
    return
  }
  const prevScenes = scenes.value.slice()
  const idToScene = new Map(scenes.value.map((s) => [s.id, s]))
  const reordered = orderedIds.map((id) => idToScene.get(id)).filter(Boolean) as any[]
  // Preserve any scenes not present in orderedIds (e.g. added by a concurrent realtime update).
  const orderedSet = new Set(orderedIds)
  const extra = scenes.value.filter((s) => !orderedSet.has(s.id))
  scenes.value = [...reordered, ...extra]
  try {
    await Promise.all(
      orderedIds.map((id, idx) =>
        apiFetch(`/scenes/${id}`, { method: 'PATCH', body: { order_index: idx } })
      )
    )
  } catch {
    scenes.value = prevScenes
    showToast('Failed to save scene order', 'error')
  }
}

onMounted(async () => {
  isMounted = true
  window.addEventListener('keydown', handleKeydown)
  hydrateRecoverySnapshot()
  if (!planStore.plan) await planStore.fetchSubscriptionStatus()
  await fetchSpace(true)
  startSceneRealtime()
})

onBeforeUnmount(() => {
  isMounted = false
  window.removeEventListener('keydown', handleKeydown)
  fetchScenesController?.abort()
  fetchScenesController = null
  stopSceneRealtime()
  replacePendingScenePreviewMap({})
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null }
})

async function fetchScenes() {
  const version = ++fetchScenesVersion
  fetchScenesController?.abort()
  fetchScenesController = new AbortController()
  const { signal } = fetchScenesController

  try {
    const result = await apiFetch<any>(`/spaces/${props.spaceId}/scenes`, { signal })
    if (version !== fetchScenesVersion) return

    // Re-read local scenes AFTER the fetch resolves so any scenes removed by a
    // concurrent upload-failure handler are not re-inserted here.
    const optimisticLocalScenes = scenes.value.filter((s) => isLocalSceneId(s?.id))
    const loadedScenes = toArrayPayload<any>(unwrapApiData<any>(result), 'scenes')
    const mergedScenes = [...loadedScenes]
    for (const localScene of optimisticLocalScenes) {
      if (!mergedScenes.some((s: any) => s.id === localScene.id)) {
        mergedScenes.push(localScene)
      }
    }
    scenes.value = mergedScenes

    const nextSceneUploadState = { ...sceneUploadStateById.value }
    const mergedSceneIds = new Set(mergedScenes.map((s: any) => s.id))
    for (const scene of loadedScenes) {
      const mapped = backendSceneStatusToUploadState(scene.status)
      if (mapped === 'ready') {
        delete nextSceneUploadState[scene.id]
      } else if (mapped === 'processing' && scene.thumbnail_url) {
        // Status field is missing or stale but thumbnail confirms processing is done.
        // Store 'ready' explicitly so sceneChips and hasProcessingScenes see the
        // correct state — deleting the entry would cause them to fall back to the
        // raw status string which still says 'processing'.
        nextSceneUploadState[scene.id] = 'ready'
      } else {
        nextSceneUploadState[scene.id] = mapped
      }
    }
    for (const id of Object.keys(nextSceneUploadState)) {
      if (!mergedSceneIds.has(id)) delete nextSceneUploadState[id]
    }
    sceneUploadStateById.value = nextSceneUploadState

    const newMap: Record<string, EditorHotspot[]> = {}
    const pendingPreviewNext = { ...pendingScenePreviewById.value }

    const hotspotTasks = loadedScenes.map(async (scene: any) => {
      // Clear local blob:/data: previews as soon as the backend has a real HTTPS URL.
      // Both blob: (URL.createObjectURL) and data: (canvas toDataURL) URLs cannot be
      // fetched by the PSV viewer — only https:// URLs work for panorama loading.
      const localPreview = pendingPreviewNext[scene.id]
      const isLocalPreview = localPreview?.startsWith('blob:') || localPreview?.startsWith('data:')
      if (isLocalPreview && (scene?.raw_image_url || scene?.thumbnail_url)) {
        delete pendingPreviewNext[scene.id]
      } else if (!isLocalPreview && scene?.thumbnail_url && backendSceneStatusToUploadState(scene.status) === 'ready') {
        delete pendingPreviewNext[scene.id]
      }

      if (Array.isArray(scene.hotspots)) {
        const dbHotspots = mapDbHotspots(scene.hotspots)
        const pending = (hotspotsByScene.value[scene.id] ?? []).filter((h) => h._pending === true)
        return {
          sceneId: scene.id,
          hotspots: pending.length ? [...dbHotspots, ...pending] : dbHotspots,
        }
      }

      if (hotspotsByScene.value[scene.id] !== undefined) {
        return {
          sceneId: scene.id,
          hotspots: hotspotsByScene.value[scene.id],
        }
      }

      // Only eager-load hotspots for the active scene; all others load on-demand via selectScene()
      const activeId = selectedSceneId.value || loadedScenes[0]?.id
      if (scene.id !== activeId) return null

      try {
        const hRes = await apiFetch<any>(`/scenes/${scene.id}/hotspots`, { signal })
        if (version !== fetchScenesVersion) return null
        return {
          sceneId: scene.id,
          hotspots: mapDbHotspots(toArrayPayload<any>(unwrapApiData<any>(hRes), 'hotspots')),
        }
      } catch (err: any) {
        if (isAbortError(err)) return null
        return {
          sceneId: scene.id,
          hotspots: hotspotsByScene.value[scene.id] ?? [],
        }
      }
    })

    const hotspotResults = await Promise.all(hotspotTasks)
    if (version !== fetchScenesVersion) return
    for (const result of hotspotResults) {
      if (!result) continue
      newMap[result.sceneId] = result.hotspots
    }
    // Preserve cached hotspot data for scenes deferred this cycle
    for (const scene of mergedScenes) {
      if (!(scene.id in newMap) && hotspotsByScene.value[scene.id] !== undefined) {
        newMap[scene.id] = hotspotsByScene.value[scene.id]
      }
    }

    hotspotsByScene.value = newMap
    replacePendingScenePreviewMap(pendingPreviewNext)
    fetchScenesController = null

    if (mergedScenes.length) {
      if (!selectedSceneId.value || !mergedScenes.some((s: any) => s.id === selectedSceneId.value)) {
        selectedSceneId.value = mergedScenes[0].id
      }
    } else {
      selectedSceneId.value = ''
    }
  } catch (err: any) {
    if (isAbortError(err)) return
    fetchScenesController = null
    // Keep existing scenes/previews on transient backend errors.
  }
}

function isAbortError(err: any): boolean {
  return err?.name === 'AbortError' || err?.cause?.name === 'AbortError' || err?.type === 'aborted'
}

const { start: startSceneRealtime, stop: stopSceneRealtime } = useEditorRealtime(
  props.spaceId,
  () => { if (isMounted) void fetchSpace(true) },
  () => isMounted,
)

async function fetchHotspots(sceneId: string) {
  if (isLocalSceneId(sceneId)) return
  try {
    const result = await apiFetch<any>(`/scenes/${sceneId}/hotspots`)
    const list = mapDbHotspots(toArrayPayload<any>(unwrapApiData<any>(result), 'hotspots'))
    const pending = (hotspotsByScene.value[sceneId] ?? []).filter((h) => h._pending === true)
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: pending.length ? [...list, ...pending] : list }
  } catch {
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: hotspotsByScene.value[sceneId] || [] }
  }
}

async function selectScene(sceneId: string) {
  if (sceneId === selectedSceneId.value) return
  selectedSceneId.value = sceneId
  const selected = scenes.value.find((s) => s.id === sceneId)
  if (selected && !sceneHasRenderableImage(selected) && selected.status !== 'ready') {
    showToast('Scene is still preparing. Showing latest ready view.', 'error')
  }
  if (!hotspotsByScene.value[sceneId]) await fetchHotspots(sceneId)
}

function handleHotspotClick(id: string) {
  if (!isPreviewMode.value) return
  const hotspot = activeSceneHotspots.value.find(h => h.id === id)
  if (!hotspot) return
  if (hotspot.type === 'scene_link' && hotspot.targetSceneId) {
    void selectScene(hotspot.targetSceneId)
    showToast('Moved to linked scene')
  } else if (hotspot.type === 'url' && hotspot.url) {
    window.open(hotspot.url, '_blank', 'noopener,noreferrer')
  }
}

async function handleAddScene() {
  addSceneFileInput.value?.click()
}

function statusLabel(status?: string) {
  if (status === 'pending') return 'Queued'
  if (status === 'processing') return 'Processing'
  if (status === 'complete') return 'Complete'
  if (status === 'failed') return 'Failed'
  return 'Unknown'
}

function statusBadgeClass(status?: string) {
  if (status === 'pending') return 'canvas-badge--amber'
  if (status === 'processing') return 'canvas-badge--sky'
  if (status === 'failed') return 'canvas-badge--rose'
  return 'canvas-badge--emerald'
}

async function fetchSpace(silent = false) {
  try {
    const data = await apiFetch<any>(`/spaces/${props.spaceId}`)
    space.value = data

    await fetchScenes()

    if (!selectedSceneId.value && scenes.value.length) selectedSceneId.value = scenes.value[0].id
  } catch (e: any) {
    if (!silent) showToast('Failed to load space data', 'error')
  }
}

// Expose for new UI components that need to read/drive editor state
defineExpose({
  space,
  scenes,
  sceneChips,
  selectedSceneId,
  activeScene,
  activeSceneHotspots,
  hotspotCount,
  publishing,
  inlineEditMode,
  hotspotDraftType,
  localUploads,
  selectScene,
  handleAddScene,
  handleTogglePublish,
  showToast,
  statusLabel,
  statusBadgeClass,
})
</script>

<style scoped>
.editor-shell {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #0A0A0A;
}

/* ── Toast ─────────────────────────────────────────────────── */
.editor-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 10px;
  background: rgba(10,12,20,0.92);
  border: 1px solid rgba(255,255,255,0.08);
  z-index: 400;
  white-space: nowrap;
}
.editor-toast__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.editor-toast--success .editor-toast__dot { background: #3B82F6; }
.editor-toast--error .editor-toast__dot { background: #ef4444; }
.editor-toast__msg { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9); }

/* ── Animations ────────────────────────────────────────────── */
.fade-smooth-enter-active, .fade-smooth-leave-active { transition: all 0.25s ease; }
.fade-smooth-enter-from, .fade-smooth-leave-to { opacity: 0; transform: translateY(6px); }

/* ── Share modal ───────────────────────────────────────────── */
.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.share-modal {
  width: 100%;
  max-width: 440px;
  background: rgba(10,12,20,0.96);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 28px;
}
.share-modal__header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 22px;
}
.share-modal__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #3B82F6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.share-modal__title { font-size: 18px; font-weight: 800; color: #f8fafc; line-height: 1.2; margin-bottom: 3px; }
.share-modal__sub { font-size: 12px; color: rgba(255,255,255,0.45); font-weight: 500; }
.share-modal__close {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms, color 120ms;
  flex-shrink: 0;
}
.share-modal__close:hover { background: rgba(255,255,255,0.07); color: #fff; }
.share-modal__url-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 16px;
}
.share-modal__url {
  flex: 1;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: monospace;
}
.share-modal__copy {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.8);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms, color 120ms;
  flex-shrink: 0;
}
.share-modal__copy:hover { background: rgba(255,255,255,0.12); color: #fff; }
.share-modal__actions { display: flex; flex-direction: column; gap: 10px; }
.share-modal__whatsapp {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background 120ms, color 120ms;
}
.share-modal__whatsapp:hover { background: rgba(255,255,255,0.10); color: #fff; }
.share-modal__done {
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent;
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.share-modal__done:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); }

.share-modal-enter-active, .share-modal-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.share-modal-enter-active .share-modal, .share-modal-leave-active .share-modal {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.share-modal-enter-from { opacity: 0; }
.share-modal-enter-from .share-modal { transform: scale(0.92) translateY(12px); }
.share-modal-leave-to { opacity: 0; }
.share-modal-leave-to .share-modal { transform: scale(0.95) translateY(6px); }

/* ── Hotspot edit panel ──────────────────────────────────── */
.hs-edit-panel {
  position: fixed;
  bottom: 104px;
  left: 50%;
  transform: translateX(-50%);
  width: 308px;
  background: rgba(10, 12, 20, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 16px;
  padding: 14px;
  z-index: 400;
  backdrop-filter: blur(12px);
}
.hs-edit-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.hs-edit-panel__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.hs-edit-panel__dot--info { background: rgba(255, 255, 255, 0.85); }
.hs-edit-panel__dot--url { background: #3B82F6; }
.hs-edit-panel__dot--scene_link { background: #3B82F6; }
.hs-edit-panel__title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  flex: 1;
}
.hs-edit-panel__type-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  padding: 2px 7px;
}
.hs-edit-panel__close {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms, color 120ms;
}
.hs-edit-panel__close:hover { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.6); }
.hs-edit-panel__type-tabs {
  display: flex;
  gap: 3px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 12px;
}
.hs-edit-panel__type-tab {
  flex: 1;
  height: 24px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.38);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.hs-edit-panel__type-tab--active {
  background: rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.85);
}
.hs-edit-panel__fields { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.hs-edit-panel__field { display: flex; flex-direction: column; gap: 4px; }
.hs-edit-panel__label-text {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}
.hs-edit-panel__input {
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  font-weight: 500;
  outline: none;
  transition: border-color 120ms;
  width: 100%;
  box-sizing: border-box;
}
.hs-edit-panel__input:focus { border-color: rgba(59, 130, 246, 0.5); }
.hs-edit-panel__input::placeholder { color: rgba(255, 255, 255, 0.2); }
.hs-edit-panel__select { cursor: pointer; appearance: none; }
.hs-edit-panel__actions { display: flex; gap: 8px; }
.hs-edit-panel__save {
  flex: 1;
  height: 32px;
  border-radius: 8px;
  background: #3B82F6;
  border: none;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hs-edit-panel__save:hover { background: #2563EB; }
.hs-edit-panel__save:disabled { opacity: 0.5; cursor: not-allowed; }
.hs-edit-panel__del {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: #f87171;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
}
.hs-edit-panel__del:hover { background: rgba(239, 68, 68, 0.10); }
.hs-edit-panel__del:disabled { opacity: 0.5; cursor: not-allowed; }
.hs-edit-panel__spin {
  display: inline-block;
  width: 11px;
  height: 11px;
  border: 1.5px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: hs-spin 0.6s linear infinite;
}
@keyframes hs-spin { to { transform: rotate(360deg); } }

/* ── Scene rename popover ───────────────────────────────── */
.rename-popover {
  position: fixed;
  bottom: 104px;
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  background: rgba(10, 12, 20, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 14px;
  padding: 14px;
  z-index: 400;
  backdrop-filter: blur(12px);
}
.rename-popover__label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 8px;
}
.rename-popover__input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  font-weight: 500;
  outline: none;
  transition: border-color 120ms;
  box-sizing: border-box;
  margin-bottom: 10px;
}
.rename-popover__input:focus { border-color: rgba(59, 130, 246, 0.5); }
.rename-popover__input::placeholder { color: rgba(255, 255, 255, 0.2); }
.rename-popover__actions { display: flex; gap: 8px; }
.rename-popover__save {
  flex: 1;
  height: 30px;
  border-radius: 8px;
  background: #3B82F6;
  border: none;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
}
.rename-popover__save:hover { background: #2563EB; }
.rename-popover__save:disabled { opacity: 0.5; cursor: not-allowed; }
.rename-popover__cancel {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms, color 120ms;
}
.rename-popover__cancel:hover { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.6); }

/* ── Share modal embed section ──────────────────────────── */
.share-modal__embed { margin-bottom: 16px; }
.share-modal__embed-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 8px;
}
.share-modal__embed-code { font-family: monospace; }

/* ── Settings modal ─────────────────────────────────────── */
.settings-modal {
  width: 100%;
  max-width: 380px;
  background: rgba(10,12,20,0.97);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 24px;
}
.settings-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}
.settings-modal__title {
  font-size: 16px;
  font-weight: 800;
  color: rgba(255,255,255,0.9);
}
.settings-modal__field {
  margin-bottom: 18px;
}
.settings-modal__field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.settings-modal__label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.65);
}
.settings-modal__sublabel {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  margin-top: 2px;
}
.settings-modal__value {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.45);
  font-family: monospace;
  min-width: 40px;
  text-align: right;
}
.settings-modal__range {
  width: 100%;
  accent-color: #3B82F6;
  cursor: pointer;
}
.settings-modal__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 22px;
}
.settings-modal__toggle {
  width: 40px;
  height: 24px;
  border-radius: 12px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 2px;
  cursor: pointer;
  transition: background 180ms, border-color 180ms;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.settings-modal__toggle--on {
  background: #3B82F6;
  border-color: #3B82F6;
  justify-content: flex-end;
}
.settings-modal__toggle-thumb {
  width: 18px;
  height: 18px;
  border-radius: 9px;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transition: background 180ms;
}
.settings-modal__actions {
  display: flex;
  gap: 8px;
}
.settings-modal__save {
  flex: 1;
  height: 40px;
  border-radius: 10px;
  background: #3B82F6;
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
  display: flex;
  align-items: center;
  justify-content: center;
}
.settings-modal__save:hover { background: #2563EB; }
.settings-modal__save:disabled { opacity: 0.5; cursor: not-allowed; }
.settings-modal__cancel {
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.settings-modal__cancel:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); }

/* ── Rename popover delete section ──────────────────────── */
.rename-popover__delete-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.rename-popover__del {
  flex: 1;
  height: 28px;
  border-radius: 7px;
  background: transparent;
  border: 1px solid rgba(239,68,68,0.22);
  color: rgba(248,113,113,0.7);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms, color 120ms, border-color 120ms;
}
.rename-popover__del:hover:not(:disabled) { background: rgba(239,68,68,0.10); color: #f87171; border-color: rgba(239,68,68,0.40); }
.rename-popover__del:disabled { opacity: 0.35; cursor: not-allowed; }
.rename-popover__del-confirm {
  flex: 1;
  height: 28px;
  border-radius: 7px;
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.40);
  color: #f87171;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rename-popover__del-confirm:hover:not(:disabled) { background: rgba(239,68,68,0.25); }
.rename-popover__del-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.rename-popover__del-abort {
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.35);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.rename-popover__del-abort:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); }
</style>
