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
                :disabled="!isLocalSceneId(renameCandidate.id) && scenes.filter(s => !isLocalSceneId(s.id)).length <= 1"
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
import { useSupabaseClient } from '#imports'
import { usePlanStore } from '~/stores/plan'
import { useApiFetch } from '~/composables/useApiFetch'
import { mapDbHotspot, mapDbHotspots, type EditorHotspot } from '~/features/editor/mappers'
import { useEditorStore } from '~/features/editor/store/useEditorStore'
import ViewerCanvas from '~/features/editor/components/ViewerCanvas.vue'
import TopBar from '~/features/editor/components/TopBar.vue'
import LeftToolbar from '~/features/editor/components/LeftToolbar.vue'
import SceneDock from '~/features/editor/components/SceneDock.vue'
import HotspotPanel from '~/features/editor/components/HotspotPanel.vue'
import HotspotTypePicker from '~/features/editor/components/HotspotTypePicker.vue'
import HotspotQuickEditor from '~/features/editor/components/HotspotQuickEditor.vue'

const editorStore = useEditorStore()

const props = defineProps<{
  spaceId: string
}>()

const { apiFetch } = useApiFetch()
const supabase = useSupabaseClient()
const planStore = usePlanStore()

const space = ref<any>(null)
const media = ref<any[]>([])
const publishing = ref(false)
const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
const retryingMediaMap = ref<Record<string, boolean>>({})
const completionFxMap = ref<Record<string, 'enter' | 'exit'>>({})
const placeholderPanoramaUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800" viewBox="0 0 1600 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23111627"/><stop offset="55%" stop-color="%231f2a44"/><stop offset="100%" stop-color="%232a4365"/></linearGradient></defs><rect width="1600" height="800" fill="url(%23g)"/><circle cx="1220" cy="230" r="180" fill="rgba(255,255,255,0.08)"/><circle cx="360" cy="600" r="260" fill="rgba(255,255,255,0.06)"/><g fill="none" stroke="rgba(255,255,255,0.35)"><path d="M0 540h1600"/><path d="M0 480h1600"/></g><text x="120" y="170" fill="rgba(255,255,255,0.88)" font-family="Arial" font-size="48" font-weight="700">Viewora 360 Tour Preview</text><text x="120" y="235" fill="rgba(255,255,255,0.7)" font-family="Arial" font-size="28">Upload your panorama to replace this placeholder instantly.</text></svg>'
const addingHotspot = ref(false)
const scenes = ref<any[]>([])
const selectedSceneId = ref('')
const hotspotsByScene = ref<Record<string, EditorHotspot[]>>({})
const deletingMedia = ref<Record<string, boolean>>({})
const hotspotDraftType = ref<'info' | 'scene_link' | 'url' | 'video' | 'youtube'>('info')
const showTypePicker = ref(false)
const quickEditHotspotId = ref<string | null>(null)
const quickEditScreenPos = ref({ x: 0, y: 0 })
const hotspotTargetSceneId = ref('')
const pendingScenePreviewById = ref<Record<string, string>>({})
type SceneUploadState = 'queued' | 'signing' | 'uploading' | 'registering' | 'processing' | 'ready' | 'failed'
const sceneUploadStateById = ref<Record<string, SceneUploadState>>({})
const sceneRealtimeChannels = ref<any[]>([])
let sceneRealtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null

type PersistedLocalScene = {
  id: string
  name: string
  order_index: number
  status: 'processing'
  _local: true
}

type EditorRecoverySnapshot = {
  selectedSceneId: string
  localScenes: PersistedLocalScene[]
  sceneUploadStateById: Record<string, SceneUploadState>
  scenePreviewById: Record<string, string>
}

function getEditorRecoveryStorageKey() {
  return `viewora:editor-recovery:${props.spaceId}`
}

function getLocalScenes() {
  return scenes.value.filter((scene) => isLocalSceneId(scene?.id)) as PersistedLocalScene[]
}

function readEditorRecoverySnapshot(): EditorRecoverySnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(getEditorRecoveryStorageKey())
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<EditorRecoverySnapshot>
    const safePreviewById: Record<string, string> = {}
    if (parsed.scenePreviewById && typeof parsed.scenePreviewById === 'object') {
      for (const [sceneId, preview] of Object.entries(parsed.scenePreviewById as Record<string, unknown>)) {
        if (!isLocalSceneId(sceneId)) continue
        if (typeof preview !== 'string') continue
        if (!preview.startsWith('data:image/')) continue
        if (preview.length > 600_000) continue
        safePreviewById[sceneId] = preview
      }
    }
    const validUploadStates = new Set<string>(['queued', 'signing', 'uploading', 'registering', 'processing', 'ready', 'failed'])
    const safeLocalScenes: PersistedLocalScene[] = []
    if (Array.isArray(parsed.localScenes)) {
      for (const item of parsed.localScenes) {
        if (!item || typeof item !== 'object') continue
        if (!isLocalSceneId(item.id)) continue
        if (item._local !== true) continue
        if (item.status !== 'processing') continue
        if (typeof item.order_index !== 'number') continue
        safeLocalScenes.push(item as PersistedLocalScene)
      }
    }
    const safeUploadState: Record<string, SceneUploadState> = {}
    if (parsed.sceneUploadStateById && typeof parsed.sceneUploadStateById === 'object') {
      for (const [id, state] of Object.entries(parsed.sceneUploadStateById as Record<string, unknown>)) {
        if (!isLocalSceneId(id)) continue
        if (typeof state !== 'string' || !validUploadStates.has(state)) continue
        safeUploadState[id] = state as SceneUploadState
      }
    }
    return {
      selectedSceneId: typeof parsed.selectedSceneId === 'string' ? parsed.selectedSceneId : '',
      localScenes: safeLocalScenes,
      sceneUploadStateById: safeUploadState,
      scenePreviewById: safePreviewById,
    }
  } catch {
    return null
  }
}

function writeEditorRecoverySnapshot() {
  if (typeof window === 'undefined') return
  const localScenes = getLocalScenes()
  const activeLocalState: Record<string, SceneUploadState> = {}
  const activeLocalPreviews: Record<string, string> = {}
  for (const scene of localScenes) {
    const state = sceneUploadStateById.value[scene.id]
    if (state) activeLocalState[scene.id] = state
    const preview = pendingScenePreviewById.value[scene.id]
    if (preview && !isBlobPreviewUrl(preview)) activeLocalPreviews[scene.id] = preview
  }
  if (!localScenes.length && !Object.keys(activeLocalState).length && !Object.keys(activeLocalPreviews).length) {
    window.sessionStorage.removeItem(getEditorRecoveryStorageKey())
    return
  }
  const snapshot: EditorRecoverySnapshot = {
    selectedSceneId: isLocalSceneId(selectedSceneId.value) ? selectedSceneId.value : '',
    localScenes,
    sceneUploadStateById: activeLocalState,
    scenePreviewById: activeLocalPreviews,
  }
  try {
    window.sessionStorage.setItem(getEditorRecoveryStorageKey(), JSON.stringify(snapshot))
  } catch {
    // If storage quota is exceeded, persist minimal recovery state instead of crashing the watcher.
    try {
      window.sessionStorage.setItem(
        getEditorRecoveryStorageKey(),
        JSON.stringify({
          selectedSceneId: snapshot.selectedSceneId,
          localScenes: snapshot.localScenes,
          sceneUploadStateById: snapshot.sceneUploadStateById,
          scenePreviewById: {},
        } satisfies EditorRecoverySnapshot),
      )
    } catch {
      window.sessionStorage.removeItem(getEditorRecoveryStorageKey())
    }
  }
}

function hydrateEditorRecoverySnapshot() {
  const snapshot = readEditorRecoverySnapshot()
  if (!snapshot) return
  if (snapshot.localScenes.length) {
    const existingIds = new Set(scenes.value.map((scene) => scene.id))
    for (const scene of snapshot.localScenes) {
      if (!existingIds.has(scene.id)) scenes.value.push(scene)
    }
  }
  sceneUploadStateById.value = {
    ...sceneUploadStateById.value,
    ...snapshot.sceneUploadStateById,
  }
  if (snapshot.scenePreviewById && Object.keys(snapshot.scenePreviewById).length) {
    replacePendingScenePreviewMap({
      ...pendingScenePreviewById.value,
      ...snapshot.scenePreviewById,
    })
  }
  if (snapshot.selectedSceneId && isLocalSceneId(snapshot.selectedSceneId)) {
    selectedSceneId.value = snapshot.selectedSceneId
  }
}

let recoverySnapshotDebounceTimer: ReturnType<typeof setTimeout> | null = null
watch([scenes, sceneUploadStateById, selectedSceneId, pendingScenePreviewById], () => {
  if (recoverySnapshotDebounceTimer) clearTimeout(recoverySnapshotDebounceTimer)
  recoverySnapshotDebounceTimer = setTimeout(() => {
    recoverySnapshotDebounceTimer = null
    writeEditorRecoverySnapshot()
  }, 300)
}, { deep: true })

function backendSceneStatusToUploadState(status?: string | null): SceneUploadState {
  if (!status) return 'ready'                                     // null/undefined = no active job
  if (status === 'ready' || status === 'complete') return 'ready'
  if (status === 'failed' || status === 'error') return 'failed'
  if (
    status === 'queued'
    || status === 'pending'
    || status === 'processing'
    || status === 'signing'
    || status === 'uploading'
    || status === 'registering'
  ) return 'processing'
  return 'ready'                                                  // unknown future status → treat as ready
}

let isMounted = false
let fetchScenesVersion = 0
let fetchScenesController: AbortController | null = null

type LocalUploadState = 'local_select' | 'signing' | 'uploading' | 'registering' | 'failed'
type LocalUploadItem = {
  id: string
  mediaType: string
  fileName: string
  state: LocalUploadState
  error?: string
}
const localUploads = ref<LocalUploadItem[]>([])
const pollFailureCount = ref(0)
type DeleteCandidate = EditorHotspot & { sceneId: string }
const deleteCandidate = ref<DeleteCandidate | null>(null)
const deletingHotspot = ref(false)
const repositioningHotspotId = ref<string | null>(null)
const editDraft = ref<{ label: string; description: string; url: string; targetSceneId: string; type: 'info' | 'url' | 'scene_link' | 'video' | 'youtube'; icon: string; scale: number; hoverScale: number; corners?: Array<{ yaw: number; pitch: number }> }>({
  label: '', description: '', url: '', targetSceneId: '', type: 'info', icon: '', scale: 1, hoverScale: 1.3,
})
const savingHotspot = ref(false)
const renameCandidate = ref<{ id: string; name: string } | null>(null)
const renameDraft = ref('')
const renameSaving = ref(false)
const renameInputRef = ref<HTMLInputElement | null>(null)
const showSettingsPanel = ref(false)
const isTracing = ref(false)
const tracePoints = ref<Array<{ yaw: number; pitch: number }>>([])

function startTracing() {
  isTracing.value = true
  tracePoints.value = []
  showToast('Click 4 corners in the room to pin video', 'success')
}

watch(isTracing, (val) => {
  // We no longer block modal state here so the panel stays visible
})
function handleUpdateTrace(payload: { yaw: number; pitch: number }) {
  if (!isTracing.value) return
  
  tracePoints.value.push(payload)
  
  if (tracePoints.value.length === 4) {
    editDraft.value.corners = [...tracePoints.value]
    isTracing.value = false
    tracePoints.value = []
    showToast('Spatial mapping complete', 'success')
  } else {
    showToast(`Point ${tracePoints.value.length}/4 captured`, 'success')
  }
}

const settingsDraft = ref({ hfov: 90, yaw: 0, pitch: 0, autoRotate: false })
const settingsSaving = ref(false)
const sceneDeleteConfirm = ref<string | null>(null)
const deletingScene = ref(false)

const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showShareModal = ref(false)
watch(showShareModal, (open) => open ? editorStore.openModal() : editorStore.closeModal())
watch(showSettingsPanel, (open) => {
  if (open) {
    const s = space.value?.property_360_settings?.[0]
    settingsDraft.value = {
      hfov: s?.hfov_default ?? 90,
      yaw: s?.yaw_default ?? 0,
      pitch: s?.pitch_default ?? 0,
      autoRotate: s?.auto_rotate_enabled ?? false,
    }
    editorStore.openModal()
  } else {
    editorStore.closeModal()
  }
})
const urlCopied = ref(false)

// Bridges editorStore mode ↔ ViewerCanvas isEditing prop
const inlineEditMode = computed({
  get: () => editorStore.mode === 'hotspot',
  set: (val: boolean) => editorStore.setMode(val ? 'hotspot' : 'view'),
})

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

function isLocalSceneId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('local_scene_')
}

function isBlobPreviewUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.startsWith('blob:')
}

function releasePreviewUrl(url: string | null | undefined) {
  if (typeof window === 'undefined') return
  if (!isBlobPreviewUrl(url)) return
  try {
    window.URL.revokeObjectURL(url)
  } catch {
    // Best effort cleanup only.
  }
}

function replacePendingScenePreviewMap(next: Record<string, string>) {
  const nextUrls = new Set(Object.values(next))
  for (const url of Object.values(pendingScenePreviewById.value)) {
    if (!nextUrls.has(url)) releasePreviewUrl(url)
  }
  pendingScenePreviewById.value = next
}

function setPendingScenePreview(sceneId: string, url: string) {
  const next = {
    ...pendingScenePreviewById.value,
    [sceneId]: url,
  }
  replacePendingScenePreviewMap(next)
}

function deletePendingScenePreview(sceneId: string) {
  if (!(sceneId in pendingScenePreviewById.value)) return
  const next = { ...pendingScenePreviewById.value }
  delete next[sceneId]
  replacePendingScenePreviewMap(next)
}

function movePendingScenePreview(fromSceneId: string, toSceneId: string) {
  const preview = pendingScenePreviewById.value[fromSceneId]
  if (!preview) return
  const next = {
    ...pendingScenePreviewById.value,
    [toSceneId]: preview,
  }
  delete next[fromSceneId]
  replacePendingScenePreviewMap(next)
}

async function createPersistedScenePreview(file: File): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const sourceUrl = window.URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('preview_load_failed'))
      img.src = sourceUrl
    })

    const maxWidth = 360
    const maxHeight = 220
    const width = image.naturalWidth || image.width || maxWidth
    const height = image.naturalHeight || image.height || maxHeight
    const scale = Math.min(1, maxWidth / width, maxHeight / height)

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.78)
  } catch {
    return null
  } finally {
    window.URL.revokeObjectURL(sourceUrl)
  }
}

function mapSceneLinkTargets(fromSceneId: string, toSceneId: string) {
  const next: Record<string, EditorHotspot[]> = {}
  for (const [sceneId, list] of Object.entries(hotspotsByScene.value)) {
    next[sceneId] = (list ?? []).map((h) => (
      h.type === 'scene_link' && h.targetSceneId === fromSceneId
        ? { ...h, targetSceneId: toSceneId }
        : h
    ))
  }
  hotspotsByScene.value = next
}

function setSceneUploadState(sceneId: string, state: SceneUploadState) {
  sceneUploadStateById.value = {
    ...sceneUploadStateById.value,
    [sceneId]: state,
  }
}

function removeSceneUploadState(sceneId: string) {
  if (!(sceneId in sceneUploadStateById.value)) return
  const next = { ...sceneUploadStateById.value }
  delete next[sceneId]
  sceneUploadStateById.value = next
}

function createOptimisticLocalScene(file: File, previewUrl?: string, options?: { select?: boolean }): string {
  const id = `local_scene_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const orderIndex = scenes.value.length
  const name = deriveSceneName(file.name, orderIndex + 1)
  const optimisticScene = {
    id,
    name,
    status: 'processing',
    order_index: orderIndex,
    raw_image_url: null,
    thumbnail_url: null,
    tile_manifest_url: null,
    _local: true,
  }
  scenes.value = [...scenes.value, optimisticScene]
  setSceneUploadState(id, 'queued')
  if (options?.select) selectedSceneId.value = id
  hotspotsByScene.value = {
    ...hotspotsByScene.value,
    [id]: hotspotsByScene.value[id] ?? [],
  }
  if (previewUrl) setPendingScenePreview(id, previewUrl)
  return id
}

async function enqueuePanoramaFiles(files: File[]) {
  if (!files.length) return
  const shouldSelectFirst = !selectedSceneId.value && scenes.value.length === 0
  const queued = await Promise.all(files.map(async (file, idx) => {
    const previewUrl = URL.createObjectURL(file)
    const localSceneId = createOptimisticLocalScene(file, previewUrl, { select: shouldSelectFirst && idx === 0 })
    const persistedPreview = await createPersistedScenePreview(file)
    if (persistedPreview) setPendingScenePreview(localSceneId, persistedPreview)
    return { file, localSceneId }
  }))

  for (const item of queued) {
    await uploadFile(item.file, 'panorama', { createSceneAfterUpload: true, localSceneId: item.localSceneId })
  }
}

async function syncPendingHotspotsForScene(sceneId: string) {
  const pending = (hotspotsByScene.value[sceneId] ?? []).filter((h) => h._pending)
  if (!pending.length) return

  for (const hs of pending) {
    const payload: any = {
      type: hs.type,
      yaw: hs.yaw,
      pitch: hs.pitch,
      label: hs.label || (hs.type === 'scene_link' ? 'Go to next room' : 'Info hotspot'),
    }

    if (hs.type === 'url') payload.content = { url: hs.url || publicUrl.value, button_label: 'Open link' }
    if (hs.type === 'info') payload.content = { text: hs.description || 'Point of interest' }
    if (hs.type === 'scene_link' && hs.targetSceneId) payload.target_scene_id = hs.targetSceneId

    try {
      const response = await apiFetch<any>(`/scenes/${sceneId}/hotspots`, { method: 'POST', body: payload })
      const created = unwrapApiData<any>(response)?.hotspot || response?.hotspot
      if (!created) continue
      const mapped = mapDbHotspot(created)
      hotspotsByScene.value = {
        ...hotspotsByScene.value,
        [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map((x) => x.id === hs.id ? mapped : x),
      }
    } catch {
      hotspotsByScene.value = {
        ...hotspotsByScene.value,
        [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map((x) => {
          if (x.id !== hs.id) return x
          const { _pending, ...rest } = x
          return rest
        }),
      }
    }
  }
}

function removeOptimisticLocalScene(localSceneId: string) {
  scenes.value = scenes.value.filter((s) => s.id !== localSceneId)
  const nextHotspots = { ...hotspotsByScene.value }
  delete nextHotspots[localSceneId]
  hotspotsByScene.value = nextHotspots
  deletePendingScenePreview(localSceneId)
  removeSceneUploadState(localSceneId)
  if (selectedSceneId.value === localSceneId) {
    selectedSceneId.value = scenes.value[0]?.id || ''
  }
}

const panorama = computed(() => media.value.find(m => m.media_type === 'panorama'))
const hasPanorama = computed(() => Boolean(panorama.value || scenes.value.length || Object.keys(pendingScenePreviewById.value).length))

function sceneHasRenderableImage(scene: any): boolean {
  if (!scene) return false
  if (scene.id && pendingScenePreviewById.value[scene.id]) return true
  return Boolean(scene.raw_image_url || scene.thumbnail_url || scene.tile_manifest_url)
}

function scenePreviewUrl(scene: any): string | null {
  if (!scene) return null
  return pendingScenePreviewById.value[scene.id]
    || (scene as any).thumbnail_url
    || (scene as any).raw_image_url
    || (scene as any).tile_manifest_url
    || null
}

const selectedScene = computed(() =>
  scenes.value.find((s) => s.id === selectedSceneId.value) || scenes.value[0] || null
)

const activeScene = computed(() => selectedScene.value)

const activeSceneHotspots = computed(() => {
  if (!selectedSceneId.value) return []
  return hotspotsByScene.value[selectedSceneId.value] || []
})

// Merges the live edit draft into the selected hotspot so the viewer reflects
// every style/content change immediately without requiring a save.
const activeSceneHotspotsWithPreview = computed(() => {
  const hotspots = activeSceneHotspots.value
  const selectedId = editorStore.selectedHotspotId
  if (!selectedId) return hotspots
  return hotspots.map(h => {
    if (h.id !== selectedId) return h
    const d = editDraft.value
    return {
      ...h,
      label: d.label,
      description: d.description,
      url: d.url,
      targetSceneId: d.targetSceneId,
      type: d.type as any,
      icon: d.icon,
      scale: d.scale,
      hoverScale: d.hoverScale,
      corners: d.corners,
    }
  })
})
const activePanoramaSrc = computed(() => {
  if (activeScene.value?.id && pendingScenePreviewById.value[activeScene.value.id]) {
    return pendingScenePreviewById.value[activeScene.value.id]
  }
  // Use thumbnail as baseUrl for the viewer to ensure fast initial load
  // while tiled manifest handles the high resolution.
  if (activeScene.value?.thumbnail_url) return activeScene.value.thumbnail_url
  if (activeScene.value?.raw_image_url) return activeScene.value.raw_image_url
  if (panorama.value?.public_url) return panorama.value.public_url
  return placeholderPanoramaUrl
})

const activeViewerScene = computed(() => {
  const url = activePanoramaSrc.value
  if (!url || url === placeholderPanoramaUrl) return null
  const s = space.value?.property_360_settings?.[0]
  return {
    id: activeScene.value?.id ?? 'editor-scene',
    imageUrl: url,
    tileManifestUrl: activeScene.value?.tile_manifest_url,
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

const hotspotCount = computed(() =>
  Object.values(hotspotsByScene.value).reduce((sum, items) => sum + items.length, 0)
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

const editableOtherScenes = computed(() =>
  deleteCandidate.value ? sceneChips.value.filter((s) => s.id !== deleteCandidate.value!.sceneId) : []
)

const otherScenesForHotspot = computed(() =>
  sceneChips.value
    .filter(s => s.id !== selectedSceneId.value && s.ready)
    .map(s => ({ id: s.id, label: s.label }))
)

const hasProcessingMedia = computed(() =>
  media.value.some((m) => m.processing_status === 'pending' || m.processing_status === 'processing')
)

const hasProcessingScenes = computed(() =>
  scenes.value.some((s: any) => {
    const state = sceneUploadStateById.value[s.id] || backendSceneStatusToUploadState(s.status)
    return state !== 'ready' && state !== 'failed'
  })
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

watch([hasProcessingMedia, hasProcessingScenes], ([mediaProcessing, sceneProcessing]) => {
  if (mediaProcessing || sceneProcessing) {
    startPolling()
  } else {
    stopPolling()
  }
}, { immediate: true })

watch(inlineEditMode, (editing) => {
  if (!editing) deleteCandidate.value = null
})

watch(deleteCandidate, (candidate) => {
  if (!candidate) return
  const validTargetId = sceneChips.value.some(
    (s) => s.id === candidate.targetSceneId && s.id !== candidate.sceneId,
  )
    ? candidate.targetSceneId
    : sceneChips.value.find((s) => s.id !== candidate.sceneId)?.id || ''
  editDraft.value = {
    label: candidate.label || '',
    description: candidate.description || '',
    url: candidate.url || '',
    targetSceneId: validTargetId,
    type: (candidate.type as 'info' | 'url' | 'scene_link') || 'info',
    icon: candidate.icon || '',
  }
})

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

async function saveSettings() {
  if (settingsSaving.value) return
  settingsSaving.value = true
  const patch = {
    hfov_default: settingsDraft.value.hfov,
    yaw_default: settingsDraft.value.yaw,
    pitch_default: settingsDraft.value.pitch,
    auto_rotate_enabled: settingsDraft.value.autoRotate,
  }
  const prevSettings = space.value?.property_360_settings?.[0]
  if (space.value) {
    space.value = { ...space.value, property_360_settings: [{ ...(prevSettings ?? {}), ...patch }] }
  }
  showSettingsPanel.value = false
  try {
    await apiFetch(`/spaces/${props.spaceId}/settings`, { method: 'PATCH', body: patch })
    showToast('Settings saved')
  } catch (e: any) {
    if (space.value) {
      space.value = { ...space.value, property_360_settings: prevSettings !== undefined ? [prevSettings] : [] }
    }
    showToast(e?.data?.statusMessage || 'Failed to save settings', 'error')
  } finally {
    settingsSaving.value = false
  }
}

async function confirmDeleteScene(id: string) {
  if (deletingScene.value) return
  if (!isLocalSceneId(id) && scenes.value.filter((s) => !isLocalSceneId(s.id)).length <= 1) {
    showToast('Cannot delete the last scene.', 'error')
    renameCandidate.value = null
    sceneDeleteConfirm.value = null
    return
  }
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
  hydrateEditorRecoverySnapshot()
  if (!planStore.plan) await planStore.fetchSubscriptionStatus()
  await fetchSpace(true)
  startSceneRealtime()
})

onBeforeUnmount(() => {
  isMounted = false
  window.removeEventListener('keydown', handleKeydown)
  fetchScenesController?.abort()
  fetchScenesController = null
  stopPolling()
  stopSceneRealtime()
  replacePendingScenePreviewMap({})
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null }
  if (recoverySnapshotDebounceTimer) { clearTimeout(recoverySnapshotDebounceTimer); recoverySnapshotDebounceTimer = null }
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
      // Keep local preview until backend thumbnail is available.
      // Raw panorama URLs are often large and can be slow as dock thumbnails.
      if (scene?.thumbnail_url && backendSceneStatusToUploadState(scene.status) === 'ready') {
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

function refreshSceneGraphSoon() {
  if (!isMounted) return
  if (sceneRealtimeRefreshTimer) clearTimeout(sceneRealtimeRefreshTimer)
  sceneRealtimeRefreshTimer = setTimeout(() => {
    if (!isMounted) return
    void fetchSpace(true, false)
  }, 200)
}

function startSceneRealtime() {
  stopSceneRealtime()
  const scenesChannel = supabase
    .channel(`space:${props.spaceId}:scenes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'scenes', filter: `property_id=eq.${props.spaceId}` },
      refreshSceneGraphSoon,
    )
    .subscribe()
  const hotspotsChannel = supabase
    .channel(`space:${props.spaceId}:hotspots`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hotspots', filter: `property_id=eq.${props.spaceId}` },
      refreshSceneGraphSoon,
    )
    .subscribe()
  sceneRealtimeChannels.value = [scenesChannel, hotspotsChannel]
}

function stopSceneRealtime() {
  for (const channel of sceneRealtimeChannels.value) void supabase.removeChannel(channel)
  sceneRealtimeChannels.value = []
  if (sceneRealtimeRefreshTimer) { clearTimeout(sceneRealtimeRefreshTimer); sceneRealtimeRefreshTimer = null }
}

async function fetchHotspots(sceneId: string) {
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

const ensureSceneForEditing = (() => {
  let ensureScenePromise: Promise<string | null> | null = null

  return async (): Promise<string | null> => {
    if (selectedSceneId.value) return selectedSceneId.value
    if (!panorama.value?.public_url) return null
    if (ensureScenePromise) return ensureScenePromise

    ensureScenePromise = (async () => {
      try {
        const createResponse = await apiFetch<any>(`/spaces/${props.spaceId}/scenes`, {
          method: 'POST',
          body: {
            name: `Scene ${(scenes.value?.length || 0) + 1}`,
            raw_image_url: panorama.value!.public_url,
            initial_yaw: 0,
            initial_pitch: 0,
          },
        })
        const createdScene = unwrapApiData<any>(createResponse)?.scene || createResponse?.scene
        if (createdScene) {
          scenes.value = [...scenes.value, createdScene]
          selectedSceneId.value = createdScene.id
          hotspotsByScene.value = { ...hotspotsByScene.value, [createdScene.id]: [] }
          return createdScene.id as string
        }
        return null
      } finally {
        ensureScenePromise = null
      }
    })()

    return ensureScenePromise
  }
})()

function resolveTargetSceneId(currentSceneId: string) {
  if (hotspotTargetSceneId.value && hotspotTargetSceneId.value !== currentSceneId) return hotspotTargetSceneId.value
  const ordered = sceneChips.value.map((s: any) => s.id)
  if (ordered.length < 2) return null
  const idx = ordered.findIndex((id: string) => id === currentSceneId)
  if (idx === -1) return ordered[0]
  const next = ordered[(idx + 1) % ordered.length]
  return next === currentSceneId ? null : next
}

async function handleViewerAddHotspot({ yaw, pitch, screenX, screenY }: { yaw: number; pitch: number; screenX: number; screenY: number }) {
  if (repositioningHotspotId.value) {
    await repositionHotspot(repositioningHotspotId.value, yaw, pitch)
    return
  }
  if (addingHotspot.value) return

  const sceneId = await ensureSceneForEditing()
  if (!sceneId) {
    showToast('Create or upload a scene first.', 'error')
    return
  }

  const type = hotspotDraftType.value
  const targetSceneId = type === 'scene_link' ? (resolveTargetSceneId(sceneId) ?? '') : ''

  if (type === 'scene_link' && !targetSceneId) {
    showToast('Add another scene first, then place a scene-link hotspot.', 'error')
    return
  }

  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const optimisticEntry: EditorHotspot = {
    id: tempId,
    yaw,
    pitch,
    type,
    label: type === 'scene_link' ? 'Go to next room' : '',
    url: '',
    targetSceneId,
    description: '',
    _pending: true,
  }

  hotspotsByScene.value = {
    ...hotspotsByScene.value,
    [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []), optimisticEntry],
  }

  editDraft.value = {
    label: optimisticEntry.label,
    description: '',
    url: '',
    targetSceneId,
    type,
    icon: '',
    scale: 1,
    hoverScale: 1.3,
  }
  editorStore.selectHotspot(tempId)
  quickEditHotspotId.value = tempId
  quickEditScreenPos.value = { x: screenX, y: screenY }
  editorStore.setMode('view')
}

function onOpenTypePicker() {
  showTypePicker.value = true
}

function onTypePicked(userType: 'move' | 'info' | 'media' | 'link') {
  showTypePicker.value = false
  const typeMap = { move: 'scene_link', info: 'info', media: 'video', link: 'url' } as const
  hotspotDraftType.value = typeMap[userType]
  editorStore.setMode('hotspot')
}

function onCancelPlacement() {
  editorStore.setMode('view')
}

function onQuickEditCancel() {
  const id = quickEditHotspotId.value
  quickEditHotspotId.value = null
  if (id) {
    const sceneId = selectedSceneId.value
    const hs = (hotspotsByScene.value[sceneId] ?? []).find(h => h.id === id)
    if (hs?._pending) {
      hotspotsByScene.value = {
        ...hotspotsByScene.value,
        [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id),
      }
    }
  }
  editorStore.selectHotspot(null)
}

function buildHotspotPayload(d: typeof editDraft.value, hs: EditorHotspot) {
  const payload: any = {
    type: d.type,
    yaw: hs.yaw,
    pitch: hs.pitch,
    label: d.label.trim() || (d.type === 'scene_link' ? 'Go to next room' : 'Info hotspot'),
  }
  if (d.type === 'info') {
    payload.content = { text: d.description.trim() || '' }
  } else if (d.type === 'url') {
    payload.content = { url: d.url.trim(), button_label: 'Open link' }
  } else if (d.type === 'video' || d.type === 'youtube') {
    payload.content = { url: d.url.trim() }
  } else if (d.type === 'scene_link') {
    payload.target_scene_id = d.targetSceneId
  }
  return payload
}

async function onQuickEditDone() {
  const id = quickEditHotspotId.value
  quickEditHotspotId.value = null
  if (!id) return
  const sceneId = selectedSceneId.value

  if (isLocalSceneId(sceneId)) {
    const d = editDraft.value
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map(h =>
        h.id === id ? { ...h, ...d, _pending: true } : h
      ),
    }
    showToast('Hotspot saved locally. It will sync when upload completes.')
    editorStore.selectHotspot(null)
    return
  }

  const hs = (hotspotsByScene.value[sceneId] ?? []).find(h => h.id === id)
  if (!hs) return
  const beforeCount = hotspotCount.value
  addingHotspot.value = true
  try {
    const response = await apiFetch<any>(`/scenes/${sceneId}/hotspots`, { method: 'POST', body: buildHotspotPayload(editDraft.value, hs) })
    const created = unwrapApiData<any>(response)?.hotspot || response?.hotspot
    if (created) {
      const mapped = mapDbHotspot(created)
      hotspotsByScene.value = {
        ...hotspotsByScene.value,
        [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id).concat([mapped]),
      }
      showToast(beforeCount === 0 ? 'Your tour is now interactive' : 'Hotspot added')
    }
  } catch (e: any) {
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id),
    }
    showToast(e?.data?.statusMessage || 'Could not add hotspot. Try again.', 'error')
  } finally {
    addingHotspot.value = false
    editorStore.selectHotspot(null)
  }
}

async function onQuickEditMore() {
  const id = quickEditHotspotId.value
  quickEditHotspotId.value = null
  if (!id) return
  const sceneId = selectedSceneId.value

  if (isLocalSceneId(sceneId)) {
    const d = editDraft.value
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map(h =>
        h.id === id ? { ...h, ...d, _pending: true } : h
      ),
    }
    editorStore.selectHotspot(id)
    editorStore.setPanel('hotspots')
    return
  }

  const hs = (hotspotsByScene.value[sceneId] ?? []).find(h => h.id === id)
  if (!hs) return
  addingHotspot.value = true
  try {
    const response = await apiFetch<any>(`/scenes/${sceneId}/hotspots`, { method: 'POST', body: buildHotspotPayload(editDraft.value, hs) })
    const created = unwrapApiData<any>(response)?.hotspot || response?.hotspot
    if (created) {
      const mapped = mapDbHotspot(created)
      hotspotsByScene.value = {
        ...hotspotsByScene.value,
        [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id).concat([mapped]),
      }
      selectHotspot(mapped.id)
      editorStore.setPanel('hotspots')
    }
  } catch (e: any) {
    hotspotsByScene.value = {
      ...hotspotsByScene.value,
      [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== id),
    }
    showToast(e?.data?.statusMessage || 'Could not add hotspot. Try again.', 'error')
    editorStore.selectHotspot(null)
  } finally {
    addingHotspot.value = false
  }
}

function handleHotspotClick(id: string) {
  // In editor mode the radial menu handles clicks — only preview mode needs this
  if (!isPreviewMode.value) return
  const hotspot = activeSceneHotspots.value.find((h) => h.id === id)
  if (!hotspot) return
  if (hotspot.type === 'scene_link' && hotspot.targetSceneId) {
    selectScene(hotspot.targetSceneId)
    showToast('Moved to linked scene')
  } else if (hotspot.type === 'url' && hotspot.url) {
    window.open(hotspot.url, '_blank', 'noopener,noreferrer')
  }
}

function handleHotspotEdit(id: string) {
  selectHotspot(id)
  editorStore.setPanel('hotspots')
  editorStore.setMode('view')
}

async function deleteHotspot(id: string) {
  if (!id || deletingHotspot.value) return
  const sceneId = selectedSceneId.value
  deletingHotspot.value = true
  hotspotsByScene.value = {
    ...hotspotsByScene.value,
    [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter((h) => h.id !== id),
  }
  editorStore.selectHotspot(null)
  try {
    await apiFetch(`/hotspots/${id}`, { method: 'DELETE' })
    showToast('Hotspot deleted')
  } catch (e: any) {
    await fetchHotspots(sceneId)
    showToast(e?.data?.statusMessage || 'Failed to delete hotspot', 'error')
  } finally {
    deletingHotspot.value = false
  }
}

function handleHotspotReposition(id: string) {
  repositioningHotspotId.value = id
  editorStore.setMode('hotspot')
  showToast('Click anywhere to reposition the hotspot')
}

async function repositionHotspot(id: string, yaw: number, pitch: number) {
  const sceneId = selectedSceneId.value
  repositioningHotspotId.value = null
  editorStore.setMode('view')
  hotspotsByScene.value = {
    ...hotspotsByScene.value,
    [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map(h => h.id === id ? { ...h, yaw, pitch } : h),
  }
  try {
    await apiFetch(`/hotspots/${id}`, { method: 'PATCH', body: { yaw, pitch } })
    showToast('Hotspot repositioned')
  } catch (e: any) {
    await fetchHotspots(sceneId)
    showToast(e?.data?.statusMessage || 'Failed to reposition hotspot', 'error')
  }
}

function selectHotspot(id: string | null) {
  editorStore.selectHotspot(id)
  if (!id) return

  const hotspot = activeSceneHotspots.value.find((h) => h.id === id)
  if (hotspot) {
    editDraft.value = {
      label: hotspot.label || '',
      description: hotspot.description || '',
      url: hotspot.url || '',
      targetSceneId: hotspot.targetSceneId || '',
      type: (hotspot.type as any) || 'info',
      icon: hotspot.icon || '',
      scale: hotspot.scale || 1,
      hoverScale: hotspot.hoverScale || 1.3,
      corners: hotspot.corners,
    }
  }
}

function patchHotspotDraft(patch: Partial<typeof editDraft.value>) {
  editDraft.value = { ...editDraft.value, ...patch }
}

function closeHotspotPanel() {
  editorStore.setPanel(null)
  editorStore.setMode('view')
  editorStore.selectHotspot(null)
}

function confirmDeleteHotspot() {
  const id = editorStore.selectedHotspotId
  if (id) deleteHotspot(id)
}

async function saveHotspotEdit() {
  const id = editorStore.selectedHotspotId
  if (!id || savingHotspot.value) return
  
  savingHotspot.value = true
  const sceneId = selectedSceneId.value
  const newType = editDraft.value.type
  const patch: any = {}
  
  const trimmedLabel = editDraft.value.label.trim()
  patch.label = trimmedLabel || (newType === 'scene_link' ? 'Go to next room' : 'Info hotspot')
  
  if (newType === 'info') {
    patch.content = { text: editDraft.value.description.trim() || 'Point of interest' }
  } else if (newType === 'url') {
    patch.content = { url: editDraft.value.url.trim(), button_label: 'Open link' }
  } else if (newType === 'video' || newType === 'youtube') {
    patch.content = { url: editDraft.value.url.trim() }
  } else if (newType === 'scene_link') {
    if (editDraft.value.targetSceneId) patch.target_scene_id = editDraft.value.targetSceneId
  }

  if (editDraft.value.icon) {
    patch.content = { ...(patch.content ?? {}), icon: editDraft.value.icon }
  }
  
  if (editDraft.value.scale !== 1) {
    patch.content = { ...(patch.content ?? {}), scale: Number(editDraft.value.scale) }
  }

  if (editDraft.value.hoverScale !== 1.3) {
    patch.content = { ...(patch.content ?? {}), hoverScale: Number(editDraft.value.hoverScale) }
  }

  if (editDraft.value.corners) {
    patch.content = { ...(patch.content ?? {}), corners: editDraft.value.corners }
  }

  patch.type = newType

  // Optimistic update
  hotspotsByScene.value = {
    ...hotspotsByScene.value,
    [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map((h) =>
      h.id !== id ? h : {
        ...h,
        type: newType,
        label: patch.label,
        description: patch.content?.text,
        url: patch.content?.url,
        targetSceneId: patch.target_scene_id,
        icon: editDraft.value.icon || undefined,
        scale: Number(editDraft.value.scale),
        hoverScale: Number(editDraft.value.hoverScale),
        corners: editDraft.value.corners,
      }
    ),
  }

  try {
    const res = await apiFetch<any>(`/hotspots/${id}`, { method: 'PATCH', body: patch })
    const updated = unwrapApiData<any>(res)?.hotspot || res?.hotspot
    if (updated) {
      const mapped = mapDbHotspot(updated)
      hotspotsByScene.value = {
        ...hotspotsByScene.value,
        [sceneId]: (hotspotsByScene.value[sceneId] ?? []).map((h) => h.id === id ? mapped : h),
      }
    }
    showToast('Hotspot updated')
  } catch (e: any) {
    await fetchHotspots(sceneId)
    showToast(e?.data?.statusMessage || 'Failed to update hotspot', 'error')
  } finally {
    savingHotspot.value = false
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

const MAX_POLL_CYCLES = 40 // 40 × 3 s = 2-minute hard cap
let pollCycles = 0

function startPolling() {
  if (pollingTimer.value) return
  pollFailureCount.value = 0
  pollCycles = 0
  pollingTimer.value = setInterval(async () => {
    pollCycles++
    if (pollCycles > MAX_POLL_CYCLES) {
      stopPolling()
      return
    }
    await fetchSpace(true, true)
  }, 3000)
}

function stopPolling() {
  if (pollingTimer.value) { clearInterval(pollingTimer.value); pollingTimer.value = null }
}

function createLocalUpload(file: File, mediaType: string): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  localUploads.value.push({ id, mediaType, fileName: file.name, state: 'local_select' })
  return id
}

function updateLocalUpload(id: string, patch: Partial<LocalUploadItem>) {
  const idx = localUploads.value.findIndex((u) => u.id === id)
  if (idx === -1) return
  localUploads.value[idx] = { ...localUploads.value[idx], ...patch }
}

function removeLocalUpload(id: string) {
  localUploads.value = localUploads.value.filter((u) => u.id !== id)
}

function extractUploadErrorMessage(err: any, fileName: string) {
  const message = String(err?.data?.message || err?.data?.statusMessage || err?.message || '').toLowerCase()
  const status = Number(err?.statusCode || err?.status || err?.response?.status || 0)
  if (status === 413 || message.includes('file too large')) return `Upload failed for ${fileName}. File is too large for your plan.`
  if (status === 429 || message.includes('rate')) return 'Too many upload requests. Please wait a few seconds and try again.'
  if (message.includes('storage limit')) return 'Upload failed. Storage limit reached. Please free up space or upgrade your plan.'
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) return `Network issue while uploading ${fileName}. Check your connection and retry.`
  if (message.includes('unauthorized')) return 'Upload failed due to permission mismatch. Refresh and try again.'
  return `Upload failed for ${fileName}. Try again.`
}

function markRecentlyCompleted(mediaId: string) {
  setTimeout(() => {
    completionFxMap.value = { ...completionFxMap.value, [mediaId]: 'enter' }
    setTimeout(() => {
      completionFxMap.value = { ...completionFxMap.value, [mediaId]: 'exit' }
      setTimeout(() => {
        const next = { ...completionFxMap.value }
        delete next[mediaId]
        completionFxMap.value = next
      }, 500)
    }, 1700)
  }, 150)
}

async function fetchSpace(silent = false, polling = false) {
  try {
    const previousStatusById = new Map(media.value.map((m: any) => [m.id, m.processing_status]))
    const data = await apiFetch<any>(`/spaces/${props.spaceId}`)
    space.value = data
    media.value = data.property_media || []

    if (!polling) await fetchScenes()

    if (!selectedSceneId.value && scenes.value.length) selectedSceneId.value = scenes.value[0].id

    for (const item of media.value) {
      const prev = previousStatusById.get(item.id)
      if ((prev === 'pending' || prev === 'processing') && item.processing_status === 'complete') {
        markRecentlyCompleted(item.id)
      }
    }
    pollFailureCount.value = 0
  } catch (e: any) {
    if (polling) {
      pollFailureCount.value += 1
      if (pollFailureCount.value >= 3) {
        stopPolling()
        showToast('Background refresh stopped after repeated errors. Reload to resume.', 'error')
      }
    }
    if (!silent) showToast('Failed to load space data', 'error')
  }
}

async function handleTogglePublish() {
  publishing.value = true
  try {
    const isLive = space.value.is_published
    if (!isLive) {
      const hasReadyBackendScene = scenes.value.some(
        (s: any) => !isLocalSceneId(s.id) && (
          sceneUploadStateById.value[s.id] === 'ready'
          || backendSceneStatusToUploadState(s.status) === 'ready'
        ),
      )
      if (!hasReadyBackendScene) {
        showToast('At least one scene must finish processing before publishing.', 'error')
        return
      }
      // Eagerly load hotspots for any backend scene the user never visited so the
      // broken-link scan covers the full tour, not just what is in memory.
      const unloadedScenes = scenes.value.filter(
        (s: any) => !isLocalSceneId(s.id) && hotspotsByScene.value[s.id] === undefined,
      )
      if (unloadedScenes.length) {
        await Promise.all(unloadedScenes.map((s: any) => fetchHotspots(s.id)))
      }

      const sceneIds = new Set(scenes.value.map((s: any) => s.id))
      let brokenCount = 0
      for (const hotspots of Object.values(hotspotsByScene.value)) {
        for (const h of hotspots as EditorHotspot[]) {
          if (h.type === 'scene_link' && h.targetSceneId && !sceneIds.has(h.targetSceneId)) {
            brokenCount++
          }
        }
      }
      if (brokenCount > 0) {
        showToast(`${brokenCount} scene link${brokenCount > 1 ? 's' : ''} point to deleted scenes. Fix them first.`, 'error')
        return
      }
    }
    const updated = await apiFetch<any>(`/spaces/${props.spaceId}/publish`, {
      method: 'POST',
      body: {
        publish: !isLive,
        slug: space.value?.slug,
        lead_form_enabled: space.value.lead_form_enabled,
        branding_enabled: space.value.branding_enabled,
      },
    })
    space.value = updated
    if (!isLive) showShareModal.value = true
    else showToast('Tour unpublished')
  } catch (e: any) {
    showToast(e.data?.statusMessage || 'Publishing failed', 'error')
  } finally {
    publishing.value = false
  }
}

async function handlePanoramaUpload(e: any) {
  const files = Array.from((e.target.files || []) as FileList)
  if (!files.length) return
  e.target.value = ''
  if (files.length > 1) {
    showToast(`Uploading ${files.length} scenes in background...`)
  }
  await enqueuePanoramaFiles(files)
}

const canvasFileInput = ref<HTMLInputElement | null>(null)
const addSceneFileInput = ref<HTMLInputElement | null>(null)

function deriveSceneName(fileName: string, sceneNumber: number): string {
  const base = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
  if (!base) return `Scene ${sceneNumber}`
  return base.replace(/\s+/g, ' ').slice(0, 64)
}

async function createSceneWithPanorama(rawImageUrl: string, name?: string, localSceneId?: string) {
  const sceneNumber = (scenes.value?.length || 0) + 1
  const response = await apiFetch<any>(`/spaces/${props.spaceId}/scenes`, {
    method: 'POST',
    body: {
      name: name || `Scene ${sceneNumber}`,
      raw_image_url: rawImageUrl,
      initial_yaw: 0,
      initial_pitch: 0,
    },
  })
  const createdScene = unwrapApiData<any>(response)?.scene || response?.scene
  if (createdScene) {
    const shouldSelectCreatedScene = localSceneId
      ? selectedSceneId.value === localSceneId
      : (!selectedSceneId.value && scenes.value.length === 0)

    if (localSceneId && isLocalSceneId(localSceneId)) {
      scenes.value = scenes.value.map((s) => s.id === localSceneId ? createdScene : s)
      if (selectedSceneId.value === localSceneId) selectedSceneId.value = createdScene.id
      const currentState = sceneUploadStateById.value[localSceneId]
      if (currentState) {
        setSceneUploadState(createdScene.id, backendSceneStatusToUploadState(createdScene.status))
        removeSceneUploadState(localSceneId)
      }

      if (hotspotsByScene.value[localSceneId]) {
        hotspotsByScene.value = {
          ...hotspotsByScene.value,
          [createdScene.id]: hotspotsByScene.value[localSceneId],
        }
        const nextHotspots = { ...hotspotsByScene.value }
        delete nextHotspots[localSceneId]
        hotspotsByScene.value = nextHotspots
      } else {
        hotspotsByScene.value = { ...hotspotsByScene.value, [createdScene.id]: [] }
      }

      mapSceneLinkTargets(localSceneId, createdScene.id)
      movePendingScenePreview(localSceneId, createdScene.id)

      await syncPendingHotspotsForScene(createdScene.id)
    } else {
      scenes.value = [...scenes.value, createdScene]
      hotspotsByScene.value = { ...hotspotsByScene.value, [createdScene.id]: [] }
      setSceneUploadState(createdScene.id, backendSceneStatusToUploadState(createdScene.status))
    }

    if (shouldSelectCreatedScene) selectedSceneId.value = createdScene.id
  }
  return createdScene || null
}

async function handleViewerCanvasUpload(file?: File) {
  if (file) {
    await enqueuePanoramaFiles([file])
  }
  else { canvasFileInput.value?.click() }
}

async function handleAddSceneFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return
  input.value = ''
  if (files.length > 1) {
    showToast(`Adding ${files.length} scenes in background...`)
  }
  await enqueuePanoramaFiles(files)
}

async function uploadFile(
  file: File,
  type: string,
  options?: { createSceneAfterUpload?: boolean; localSceneId?: string }
) {
  const localId = createLocalUpload(file, type)
  if (options?.localSceneId) setSceneUploadState(options.localSceneId, 'signing')
  const sceneCountBeforeUpload = scenes.value.length
  try {
    updateLocalUpload(localId, { state: 'signing' })
    const signedPayload = unwrapApiData<any>(await apiFetch<any>('/uploads/create-signed-url', {
      method: 'POST',
      body: { spaceId: props.spaceId, mediaType: type, fileName: file.name, contentType: file.type, fileSize: file.size },
    }))

    const signedUrl = signedPayload?.signedUrl
    const objectKey = signedPayload?.objectKey
    const publicUrlVal = signedPayload?.publicUrl

    if (!signedUrl || typeof signedUrl !== 'string' || !signedUrl.startsWith('http')) {
      throw new Error('Upload signing failed: invalid signed URL returned by server')
    }
    if (!objectKey || !publicUrlVal) throw new Error('Upload signing failed: missing upload metadata from server')

    updateLocalUpload(localId, { state: 'uploading' })
  if (options?.localSceneId) setSceneUploadState(options.localSceneId, 'uploading')
    await $fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    updateLocalUpload(localId, { state: 'registering' })
  if (options?.localSceneId) setSceneUploadState(options.localSceneId, 'registering')

    const record = unwrapApiData<any>(await apiFetch<any>('/uploads/complete', {
      method: 'POST',
      body: { spaceId: props.spaceId, mediaType: type, objectKey, publicUrl: publicUrlVal, fileSize: file.size },
    }))

    if (!record || typeof record !== 'object') {
      throw new Error('Upload registration returned an invalid response. Please try again.')
    }
    if (type === 'panorama' && !record.public_url) {
      throw new Error('Upload registration returned no public URL. Please try again.')
    }

    media.value.push(record)
    if (type === 'panorama') {
      const shouldCreateScene = options?.createSceneAfterUpload ?? sceneCountBeforeUpload === 0
      let createdScene: any = null
      if (shouldCreateScene && record?.public_url) {
        const sceneName = deriveSceneName(file.name, sceneCountBeforeUpload + 1)
        try {
          createdScene = await createSceneWithPanorama(record.public_url, sceneName, options?.localSceneId)
        } catch {
          // File is stored successfully but scene creation failed (e.g. DB error).
          // Mark the local placeholder as failed so it doesn't spin forever, but
          // do NOT remove it — the user can see it failed and refresh to recover.
          if (options?.localSceneId) setSceneUploadState(options.localSceneId, 'failed')
          removeLocalUpload(localId)
          showToast(`${file.name} uploaded but scene creation failed. Please refresh to recover.`, 'error')
          return
        }
      }
      inlineEditMode.value = true
      await fetchScenes()
      if (sceneCountBeforeUpload === 0) {
        showToast('Scene ready. Click anywhere in the viewer to add your first hotspot')
      } else if (createdScene) {
        showToast(`${createdScene.name || 'Scene'} added`)
      }
    }
    removeLocalUpload(localId)
    if (options?.localSceneId && sceneUploadStateById.value[options.localSceneId]) {
      setSceneUploadState(options.localSceneId, 'processing')
    }
    if (record.processing_status === 'pending' || record.processing_status === 'processing') {
      startPolling()
    } else if (record.processing_status === 'complete') {
      markRecentlyCompleted(record.id)
      showToast(`Upload complete: ${file.name}`)
    }
  } catch (err: any) {
    const humanError = extractUploadErrorMessage(err, file.name)
    updateLocalUpload(localId, { state: 'failed', error: humanError })
    if (options?.localSceneId) setSceneUploadState(options.localSceneId, 'failed')
    if (options?.localSceneId) removeOptimisticLocalScene(options.localSceneId)
    showToast(humanError, 'error')
  }
}

async function handleRetryMedia(mediaId: string) {
  retryingMediaMap.value = { ...retryingMediaMap.value, [mediaId]: true }
  try {
    await apiFetch(`/uploads/${mediaId}/retry-processing`, { method: 'POST' })
    media.value = media.value.map((m) => m.id === mediaId ? { ...m, processing_status: 'pending' } : m)
    startPolling()
    showToast('Retry queued')
  } catch (err: any) {
    showToast(`Retry failed. ${extractUploadErrorMessage(err, 'media')}`, 'error')
  } finally {
    retryingMediaMap.value = { ...retryingMediaMap.value, [mediaId]: false }
  }
}

async function confirmDeleteMedia(mediaId: string) {
  if (deletingMedia.value[mediaId]) return
  deletingMedia.value = { ...deletingMedia.value, [mediaId]: true }
  const wasPanorama = media.value.find((m: any) => m.id === mediaId)?.media_type === 'panorama'
  try {
    await apiFetch(`/uploads/${mediaId}`, { method: 'DELETE' })
    media.value = media.value.filter((m: any) => m.id !== mediaId)
    if (wasPanorama) { scenes.value = []; selectedSceneId.value = ''; hotspotsByScene.value = {}; await fetchScenes() }
    showToast('Media deleted')
  } catch (err: any) {
    showToast(`Failed to delete media: ${err.data?.statusMessage || err.message}`, 'error')
  } finally {
    deletingMedia.value = { ...deletingMedia.value, [mediaId]: false }
  }
}

// Expose for new UI components that need to read/drive editor state
defineExpose({
  space,
  media,
  panorama,
  hasPanorama,
  scenes,
  sceneChips,
  selectedSceneId,
  activeScene,
  activeSceneHotspots,
  hotspotCount,
  hasProcessingMedia,
  publishing,
  inlineEditMode,
  hotspotDraftType,
  localUploads,
  completionFxMap,
  selectScene,
  handleAddScene,
  handleTogglePublish,
  handleRetryMedia,
  confirmDeleteMedia,
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
