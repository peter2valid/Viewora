<template>
  <div class="editor-shell editor-root">

    <!-- Full-screen error overlay when initial space load fails -->
    <div v-if="spaceLoadFailed" class="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950 gap-4">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p class="text-white/60 text-sm font-medium">Failed to load tour — check your connection</p>
      <button
        class="px-4 h-9 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors"
        @click="fetchSpace(false)"
      >Retry</button>
    </div>

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
      ref="viewerCanvasRef"
      :active-scene="activeViewerScene"
      :hide-nav-arrows="isPreviewMode && !dockCollapsed"
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
      @hotspot-drag-drop="handleHotspotDragDrop"
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
      :has-scene="hasPanorama"
      :space-id="space?.id"
      :slug="space?.slug"
      @toggle-publish="handleTogglePublish"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
      @preview="editorStore.setMode('preview')"
      @share="showShareModal = true"
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
      :has-scene="hasPanorama"
      :active-placement-type="activePlacementType"
      :settings-open="showSettingsPanel"
      @place-hotspot="handlePlaceHotspot"
      @open-settings="showSettingsPanel = !showSettingsPanel"
      @cancel-placement="onCancelPlacement"
      @auto-link="openAutoLink"
    />

    <!-- Preview mode: identical GlassDock to what the public viewer shows -->
    <GlassDock
      v-if="isPreviewMode && scenes.length > 0"
      v-model:collapsed="dockCollapsed"
      :items="glassDockItems"
      :active-id="selectedSceneId"
      :bottom-px="20"
      :edge-inset-px="16"
      :max-strip-vw="80"
      :max-strip-px="860"
      :max-scale="1.6"
      :sigma-px="94"
      :lift-px="14"
      @select="selectScene"
    />

    <!-- Editor mode: SceneDock with rename, reorder, add -->
    <SceneDock
      v-else-if="!isPreviewMode"
      :scenes="sceneChips"
      :active-scene-id="selectedSceneId"
      :add-scene-pending="false"
      :show-add="true"
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
      @cancel="onQuickEditCancel"
      @start-tracing="startTracing"
    />

    <!-- Toast + Share modal teleported to body -->
    <Teleport to="body">
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

      <!-- ── Viewer Settings Panel — hfov/yaw/pitch/auto-rotate only. Basic
           Info/Listing Details/Lead Capture live on their own full-page
           form now (DetailsPanel.vue, the "Details" tab) — this quick panel
           stays scoped to the one thing worth adjusting while looking at
           the live panorama, since you see the framing change immediately. -->
      <Transition name="ts-slide">
        <div v-if="showSettingsPanel" class="ts-overlay" @click.self="showSettingsPanel = false" role="dialog" aria-modal="true" aria-label="Viewer settings">
          <div class="ts-panel">

            <!-- Header -->
            <div class="ts-header">
              <span class="ts-header__title">Viewer Settings</span>
              <button class="ts-close" @click="showSettingsPanel = false" aria-label="Close settings">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Scrollable body -->
            <div class="ts-body ts-scroll">

              <div class="ts-section">
                <div class="ts-field">
                  <div class="ts-slider-header">
                    <label class="ts-field__label">Field of View</label>
                    <span class="ts-slider-val">{{ settingsDraft.hfov }}°</span>
                  </div>
                  <input type="range" class="ts-range" v-model.number="settingsDraft.hfov" min="30" max="120" step="1" />
                </div>

                <div class="ts-field">
                  <div class="ts-slider-header">
                    <label class="ts-field__label">Starting Yaw</label>
                    <span class="ts-slider-val">{{ settingsDraft.yaw }}°</span>
                  </div>
                  <input type="range" class="ts-range" v-model.number="settingsDraft.yaw" min="-180" max="180" step="1" />
                </div>

                <div class="ts-field">
                  <div class="ts-slider-header">
                    <label class="ts-field__label">Starting Pitch</label>
                    <span class="ts-slider-val">{{ settingsDraft.pitch }}°</span>
                  </div>
                  <input type="range" class="ts-range" v-model.number="settingsDraft.pitch" min="-90" max="90" step="1" />
                </div>

                <div class="ts-toggle-row">
                  <div>
                    <div class="ts-field__label">Auto-rotate</div>
                    <div class="ts-toggle-sub">Slowly pan the view on load</div>
                  </div>
                  <button
                    class="ts-toggle"
                    :class="{ 'ts-toggle--on': settingsDraft.autoRotate }"
                    role="switch"
                    :aria-checked="settingsDraft.autoRotate"
                    @click="settingsDraft.autoRotate = !settingsDraft.autoRotate"
                  >
                    <span class="ts-toggle-thumb" />
                  </button>
                </div>
              </div>

            </div><!-- end ts-body -->

            <!-- Footer -->
            <div class="ts-footer">
              <button class="ts-btn-save" :disabled="settingsSaving" @click="saveSettings">
                <span v-if="settingsSaving" class="ts-spin" />
                <template v-else>Save Changes</template>
              </button>
              <button class="ts-btn-cancel" @click="showSettingsPanel = false">Cancel</button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <UiShareModal
      :space="showShareModal ? (space as any) : null"
      context="tour"
      @close="showShareModal = false"
    />

    <!-- ── AI Auto-link modal ── -->
    <Teleport to="body">
      <Transition name="share-overlay">
        <div v-if="showAutoLinkModal" class="share-overlay" @click.self="closeAutoLink" role="dialog" aria-modal="true" aria-label="Auto-link scenes">
          <div class="al-modal">

            <div class="share-modal__topbar">
              <h2 class="share-modal__title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"/></svg>
                AI Scene Linking
              </h2>
              <button class="share-modal__close" @click="closeAutoLink" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Analysing state -->
            <div v-if="autoLinkAnalyzing" class="al-loading">
              <div class="al-spinner" />
              <p class="al-loading__text">{{ autoLinkProgress ?? 'Connecting to AI…' }}</p>
              <p class="al-loading__sub">Using Haiku + Sonnet per scene · results appear when complete</p>
            </div>

            <!-- Error state -->
            <div v-else-if="autoLinkError" class="al-error">
              <p>{{ autoLinkError }}</p>
              <button class="al-btn al-btn--secondary" @click="closeAutoLink">Close</button>
            </div>

            <!-- Results -->
            <div v-else>
              <!-- Rename scenes -->
              <template v-if="autoLinkRenames.length">
                <p class="al-section-label">✏️ Rename scenes</p>
                <ul class="al-list">
                  <li v-for="r in autoLinkRenames" :key="r._id" class="al-item">
                    <label class="al-item__label">
                      <input type="checkbox" class="al-checkbox" :checked="autoLinkSelectedRenames.has(r._id)" @change="toggleAutoLinkRename(r._id)" />
                      <span class="al-item__text">
                        <span class="al-item__from">{{ r.currentName }}</span>
                        <span class="al-item__arrow">→</span>
                        <strong>{{ r.suggestedName }}</strong>
                      </span>
                    </label>
                  </li>
                </ul>
              </template>

              <!-- Remove bad hotspots -->
              <template v-if="autoLinkDeletions.length">
                <p class="al-section-label">🗑️ Remove incorrect hotspots</p>
                <ul class="al-list">
                  <li v-for="d in autoLinkDeletions" :key="d._id" class="al-item al-item--danger">
                    <label class="al-item__label">
                      <input type="checkbox" class="al-checkbox" :checked="autoLinkSelectedDeletions.has(d._id)" @change="toggleAutoLinkDeletion(d._id)" />
                      <span class="al-item__text">
                        <span class="al-item__from">{{ d.sceneName }}</span>
                        <span class="al-item__arrow">·</span>
                        <span>{{ d.label }}</span>
                        <span class="al-item__badge al-item__badge--remove">{{ d.type === 'scene_link' ? 'nav' : d.type }}</span>
                      </span>
                    </label>
                  </li>
                </ul>
              </template>

              <!-- Navigation hotspots -->
              <template v-if="autoLinkSuggestions.length">
                <p class="al-section-label">🧭 Add navigation hotspots</p>
                <ul class="al-list">
                  <li v-for="s in autoLinkSuggestions" :key="s._id" class="al-item">
                    <label class="al-item__label">
                      <input type="checkbox" class="al-checkbox" :checked="autoLinkSelected.has(s._id)" @change="toggleAutoLinkSuggestion(s._id)" />
                      <span class="al-item__text">
                        <span class="al-item__from">{{ s.fromSceneName }}</span>
                        <span class="al-item__arrow">→</span>
                        <strong>{{ s.toSceneName }}</strong>
                        <span class="al-item__detail">{{ s.doorwayDescription }}</span>
                      </span>
                    </label>
                  </li>
                </ul>
              </template>

              <!-- Info hotspots -->
              <template v-if="autoLinkInfoHotspots.length">
                <p class="al-section-label">📍 Add info labels</p>
                <ul class="al-list">
                  <li v-for="h in autoLinkInfoHotspots" :key="h._id" class="al-item">
                    <label class="al-item__label">
                      <input type="checkbox" class="al-checkbox" :checked="autoLinkSelectedInfo.has(h._id)" @change="toggleAutoLinkInfo(h._id)" />
                      <span class="al-item__text">
                        <span class="al-item__from">{{ h.sceneName }}</span>
                        <span class="al-item__arrow">·</span>
                        <strong>{{ h.label }}</strong>
                        <span class="al-item__detail">{{ h.description }}</span>
                      </span>
                    </label>
                  </li>
                </ul>
              </template>

              <p v-if="!autoLinkRenames.length && !autoLinkDeletions.length && !autoLinkSuggestions.length && !autoLinkInfoHotspots.length" class="al-empty">
                Everything looks good — no changes needed.
              </p>

              <div class="al-actions">
                <button class="al-btn al-btn--secondary" @click="closeAutoLink">Cancel</button>
                <button
                  class="al-btn al-btn--primary"
                  :disabled="autoLinkApplying || !autoLinkHasSelections()"
                  @click="handleAutoLinkApply"
                >
                  <span v-if="autoLinkApplying" class="al-spinner al-spinner--sm" />
                  <template v-else>Apply selected</template>
                </button>
              </div>
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
import { type EditorHotspot, mapDbHotspot, mapDbHotspots } from '~/features/editor/mappers'
import { useEditorStore } from '~/features/editor/store/useEditorStore'
import ViewerCanvas from '~/features/editor/components/ViewerCanvas.vue'
import TopBar from '~/features/editor/components/TopBar.vue'
import LeftToolbar from '~/features/editor/components/LeftToolbar.vue'
import SceneDock from '~/features/editor/components/SceneDock.vue'
import GlassDock from '~/components/ui/GlassDock.vue'
import { useSceneUpload } from '~/features/editor/composables/useSceneUpload'
import { useEditorRealtime } from '~/features/editor/composables/useEditorRealtime'
import { useEditorUpload, isLocalSceneId, type SceneUploadState } from '~/features/editor/composables/useEditorUpload'
import { useHotspotEditor } from '~/features/editor/composables/useHotspotEditor'
import { useEditorPublish } from '~/features/editor/composables/useEditorPublish'
import { useAutoLink } from '~/features/editor/composables/useAutoLink'
import HotspotPanel from '~/features/editor/components/HotspotPanel.vue'
import HotspotTypePicker from '~/features/editor/components/HotspotTypePicker.vue'
import HotspotQuickEditor from '~/features/editor/components/HotspotQuickEditor.vue'
import { toast } from 'vue-sonner'

const editorStore = useEditorStore()
const analytics = useAnalytics()

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
const dockCollapsed = ref(false)
const hotspotsByScene = ref<Record<string, EditorHotspot[]>>({})
const inlineEditMode = computed({
  get: () => editorStore.mode === 'hotspot',
  set: (val: boolean) => editorStore.setMode(val ? 'hotspot' : 'view'),
})

const {
  pendingScenePreviewById,
  localPanoramaUrlById,
  sceneUploadStateById,
  canvasFileInput,
  addSceneFileInput,
  backendSceneStatusToUploadState,
  sceneHasRenderableImage,
  scenePreviewUrl,
  replacePendingScenePreviewMap,
  deleteLocalPanoramaUrl,
  revokeAllLocalPanoramaUrls,
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

  const sorted = scenes.value
    .slice()
    .sort((a, b) => {
      const orderDiff = Number(a.order_index || 0) - Number(b.order_index || 0)
      if (orderDiff !== 0) return orderDiff
      return String(a.id || '').localeCompare(String(b.id || ''))
    })

  // BFS reachability: find ready scenes unreachable via nav arrows from the first ready scene.
  const readyIds = sorted
    .filter(s => (sceneUploadStateById.value[s.id] || backendSceneStatusToUploadState(s.status)) === 'ready')
    .map(s => s.id)

  const isolatedIds = new Set<string>()
  if (readyIds.length >= 2) {
    const reachable = new Set<string>([readyIds[0]])
    const queue = [readyIds[0]]
    while (queue.length) {
      const cur = queue.shift()!
      for (const h of (hotspotsByScene.value[cur] ?? [])) {
        if (h.type === 'scene_link' && h.targetSceneId && !reachable.has(h.targetSceneId)) {
          reachable.add(h.targetSceneId)
          queue.push(h.targetSceneId)
        }
      }
    }
    for (const id of readyIds) {
      if (!reachable.has(id)) isolatedIds.add(id)
    }
  }

  return sorted.map((s, idx) => {
    const state: SceneUploadState = sceneUploadStateById.value[s.id] || backendSceneStatusToUploadState(s.status)
    let badge: 'loading' | 'failed' | 'warn' | null = state === 'failed' ? 'failed' : state === 'ready' ? null : 'loading'
    if (isolatedIds.has(s.id)) badge = 'warn'
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
  placeHotspotDirect,
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
  handleHotspotDragDrop,
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

const viewerCanvasRef = ref<InstanceType<typeof ViewerCanvas> | null>(null)

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
  // Apply settings to the live viewer immediately after a successful save
  (settings) => viewerCanvasRef.value?.refreshSettings(settings),
)

// ── AI Auto-link ──────────────────────────────────────────────────────────────
const {
  showModal: showAutoLinkModal,
  isAnalyzing: autoLinkAnalyzing,
  isApplying: autoLinkApplying,
  errorMsg: autoLinkError,
  progress: autoLinkProgress,
  suggestions: autoLinkSuggestions,
  infoHotspots: autoLinkInfoHotspots,
  hotspotDeletions: autoLinkDeletions,
  sceneRenames: autoLinkRenames,
  selectedSuggestions: autoLinkSelected,
  selectedInfoHotspots: autoLinkSelectedInfo,
  selectedDeletions: autoLinkSelectedDeletions,
  selectedRenames: autoLinkSelectedRenames,
  hasSelections: autoLinkHasSelections,
  open: openAutoLink,
  close: closeAutoLink,
  toggleSuggestion: toggleAutoLinkSuggestion,
  toggleInfoHotspot: toggleAutoLinkInfo,
  toggleDeletion: toggleAutoLinkDeletion,
  toggleRename: toggleAutoLinkRename,
  apply: applyAutoLink,
} = useAutoLink(props.spaceId)

async function handleAutoLinkApply() {
  await applyAutoLink(
    // rename callback
    async (sceneId, name) => {
      const prev = scenes.value.slice()
      scenes.value = scenes.value.map(s => s.id === sceneId ? { ...s, name } : s)
      try {
        await apiFetch(`/scenes/${sceneId}`, { method: 'PATCH', body: { name } })
      } catch {
        scenes.value = prev
      }
    },
    // create hotspot callback
    async (sceneId, payload) => {
      const data = await apiFetch(`/scenes/${sceneId}/hotspots`, { method: 'POST', body: payload }) as any
      if (data?.hotspot) {
        const mapped = mapDbHotspot(data.hotspot)
        hotspotsByScene.value = {
          ...hotspotsByScene.value,
          [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []), mapped],
        }
      }
    },
    // delete hotspot callback
    async (hotspotId) => {
      await apiFetch(`/hotspots/${hotspotId}`, { method: 'DELETE' })
      for (const sceneId of Object.keys(hotspotsByScene.value)) {
        hotspotsByScene.value = {
          ...hotspotsByScene.value,
          [sceneId]: (hotspotsByScene.value[sceneId] ?? []).filter(h => h.id !== hotspotId),
        }
      }
    },
  )
  showToast('Tour edited by AI!')
}

let isMounted = false
let fetchScenesVersion = 0
let fetchScenesController: AbortController | null = null
const spaceLoadFailed = ref(false)

const renameCandidate = ref<{ id: string; name: string } | null>(null)
const renameDraft = ref('')
const renameSaving = ref(false)
const renameInputRef = ref<HTMLInputElement | null>(null)
const sceneDeleteConfirm = ref<string | null>(null)
const deletingScene = ref(false)

const isPreviewMode = computed(() => editorStore.mode === 'preview')

const glassDockItems = computed(() =>
  sceneChips.value.map(s => ({
    id: s.id,
    label: s.label,
    imageUrl: s.imageUrl || null,
    ariaLabel: `Go to ${s.label}`,
    badge: s.badge,
  }))
)

function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (type === 'error') {
    toast.error(message)
  } else {
    toast.success(message)
  }
}

const hasPanorama = computed(() => Boolean(scenes.value.length || Object.keys(pendingScenePreviewById.value).length))

const selectedScene = computed(() =>
  scenes.value.find((s) => s.id === selectedSceneId.value) || scenes.value[0] || null
)

const activeScene = computed(() => selectedScene.value)


const activePanoramaSrc = computed(() => {
  const sceneId = activeScene.value?.id
  if (!sceneId) return placeholderPanoramaUrl

  // Instant preview: full-resolution blob URL kept alive while the file is uploading.
  // PSV's default equirectangular adapter loads via <img>, which supports blob: URLs.
  const localBlob = localPanoramaUrlById.value[sceneId]
  if (localBlob) return localBlob

  // Pending https URL pushed by the upload flow before the realtime sync arrives.
  const pending = pendingScenePreviewById.value[sceneId]
  if (pending && pending.startsWith('https://')) return pending

  // Prefer thumbnail (2048×1024) — fits WebGL limits on all devices.
  // raw_image_url is kept as fallback for scenes that haven't been processed yet.
  if (activeScene.value?.thumbnail_url) return activeScene.value.thumbnail_url
  if (activeScene.value?.raw_image_url) return activeScene.value.raw_image_url
  return placeholderPanoramaUrl
})

const activeViewerScene = computed(() => {
  const url = activePanoramaSrc.value
  if (!url || url === placeholderPanoramaUrl) return null
  const s = space.value?.property_360_settings?.[0]
  return {
    id: activeScene.value?.id ?? 'editor-scene',
    imageUrl: url,
    rawImageUrl: activeScene.value?.raw_image_url ?? undefined,
    tileManifestUrl: activeScene.value?.tile_manifest_url ?? undefined,
    tileCols: activeScene.value?.tile_cols ?? undefined,
    tileRows: activeScene.value?.tile_rows ?? undefined,
    tilesReady: activeScene.value?.tiles_ready ?? false,
    tileMediumManifestUrl: activeScene.value?.tile_medium_manifest_url ?? undefined,
    tileMediumCols: activeScene.value?.tile_medium_cols ?? undefined,
    tileMediumRows: activeScene.value?.tile_medium_rows ?? undefined,
    tileMediumKtx2ManifestUrl: activeScene.value?.tile_medium_ktx2_manifest_url ?? undefined,
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

// Poll fetchScenes while scenes are still processing so a missed realtime event
// never leaves the editor permanently stuck with a "processing" badge.
let processingPollTimer: ReturnType<typeof setInterval> | null = null
watch(hasProcessingScenes, (isProcessing) => {
  if (isProcessing && !processingPollTimer) {
    processingPollTimer = setInterval(() => {
      if (isMounted) void fetchScenes()
    }, 6000)
  } else if (!isProcessing && processingPollTimer) {
    clearInterval(processingPollTimer)
    processingPollTimer = null
  }
}, { immediate: true })

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
  // Optimistically remove the scene and any nav arrows pointing to it from other scenes
  const { [id]: _removed, ...remainingHotspots } = hotspotsByScene.value
  const prunedHotspots = Object.fromEntries(
    Object.entries(remainingHotspots).map(([sid, hs]) => [
      sid,
      hs.filter(h => !(h.type === 'scene_link' && h.targetSceneId === id)),
    ])
  )
  hotspotsByScene.value = prunedHotspots
  if (selectedSceneId.value === id) selectedSceneId.value = scenes.value[0]?.id || ''
  try {
    const result = await apiFetch(`/scenes/${id}`, { method: 'DELETE' }) as any
    const removedLinks: number = result?.removedLinks ?? 0
    showToast(removedLinks > 0 ? `Scene deleted (removed ${removedLinks} nav arrow${removedLinks === 1 ? '' : 's'})` : 'Scene deleted')
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
}

function handlePlaceHotspot(type: 'info' | 'nav') {
  placeHotspotDirect(type)
}

const activePlacementType = computed<'info' | 'nav' | null>(() => {
  if (editorStore.mode !== 'hotspot') return null
  if (hotspotDraftType.value === 'scene_link') return 'nav'
  return 'info'
})

async function handleReorderScenes(orderedIds: string[]) {
  if (orderedIds.some(isLocalSceneId)) {
    showToast('Wait for all scenes to finish uploading before reordering.', 'error')
    return
  }
  const prevScenes = scenes.value.slice()
  const idToScene = new Map(scenes.value.map((s) => [s.id, s]))
  const reordered = orderedIds.map((id, idx) => {
    const scene = idToScene.get(id)
    if (scene) {
      return { ...scene, order_index: idx }
    }
    return null
  }).filter(Boolean) as any[]
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

  // Silently clean up orphaned nav arrows, order gaps, and stuck scenes on every mount.
  try {
    const repair = await apiFetch(`/spaces/${props.spaceId}/repair`, { method: 'POST' }) as any
    const fixed = (repair?.orphansRemoved ?? 0) + (repair?.stuckReset ?? 0)
    if (fixed > 0) {
      showToast('Tour cleaned up automatically')
      await fetchScenes()
    }
  } catch { /* ignore — repair is best-effort */ }

  startSceneRealtime()
})

onBeforeUnmount(() => {
  isMounted = false
  window.removeEventListener('keydown', handleKeydown)
  window.onbeforeunload = null
  fetchScenesController?.abort()
  fetchScenesController = null
  stopSceneRealtime()
  replacePendingScenePreviewMap({})
  revokeAllLocalPanoramaUrls()
  if (processingPollTimer) { clearInterval(processingPollTimer); processingPollTimer = null }
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
      } else if ((mapped === 'processing' || mapped === 'failed') && (scene.thumbnail_url || scene.tiles_ready)) {
        // Status field is missing or stale but thumbnail confirms processing is done or tiles are usable.
        // Store 'ready' explicitly so sceneChips and hasProcessingScenes see the
        // correct state — deleting the entry would cause them to fall back to the
        // raw status string which still says 'processing' or 'failed'.
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
      // Release the local blob URL held for the PSV viewer once the server has a real URL.
      if (localPanoramaUrlById.value[scene.id] && scene?.raw_image_url) {
        deleteLocalPanoramaUrl(scene.id)
      }

      // Clear dock thumbnail blob:/data: previews once the server provides an HTTPS URL.
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
        // Restore last-visited scene for this space; fall back to first scene
        let restoredId = ''
        if (typeof window !== 'undefined' && props.spaceId) {
          try { restoredId = window.localStorage.getItem(`viewora_editor_scene_${props.spaceId}`) ?? '' } catch { /* noop */ }
        }
        const isValid = restoredId && mergedScenes.some((s: any) => s.id === restoredId)
        selectedSceneId.value = isValid ? restoredId : mergedScenes[0].id
      }
    } else {
      selectedSceneId.value = ''
    }
  } catch (err: any) {
    if (isAbortError(err)) return
    fetchScenesController = null
    showToast('Could not refresh scenes — showing last known state', 'error')
  }
}

function isAbortError(err: any): boolean {
  return err?.name === 'AbortError' || err?.cause?.name === 'AbortError' || err?.type === 'aborted'
}

const { start: startSceneRealtime, stop: stopSceneRealtime } = useEditorRealtime(
  props.spaceId,
  () => { if (isMounted) void fetchScenes() },
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

  // Persist so refresh restores this scene instead of always going to scene 0
  if (typeof window !== 'undefined' && props.spaceId) {
    try { window.localStorage.setItem(`viewora_editor_scene_${props.spaceId}`, sceneId) } catch { /* noop */ }
  }

  const selected = scenes.value.find((s) => s.id === sceneId)
  if (selected && !sceneHasRenderableImage(selected) && selected.status !== 'ready') {
    showToast('Scene is still preparing. Showing latest ready view.', 'error')
  }
  if (!hotspotsByScene.value[sceneId]) await fetchHotspots(sceneId)
}

function handleHotspotClick(id: string) {
  const hotspot = activeSceneHotspots.value.find(h => h.id === id)
  if (!hotspot) return

  // Scene-link hotspots always navigate — exactly like tapping a chip in the dock.
  // No preview-mode gate: if you can see a nav arrow, clicking it should move you there.
  if (hotspot.type === 'scene_link' && hotspot.targetSceneId) {
    void selectScene(hotspot.targetSceneId)
    return
  }

  // URL / info / media hotspots only act in preview mode so editing clicks don't
  // accidentally open browser tabs or trigger content panels.
  if (!isPreviewMode.value) return
  if (hotspot.type === 'url' && hotspot.url) {
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
    spaceLoadFailed.value = false
    space.value = data

    await fetchScenes()

    if (!selectedSceneId.value && scenes.value.length) selectedSceneId.value = scenes.value[0].id
  } catch (e: any) {
    if (!space.value) spaceLoadFailed.value = true
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
  // Lets the host page (pages/app/spaces/[id]/index.vue) silently refresh
  // this component's own space/title state after the Details tab saves
  // changes elsewhere — otherwise TopBar's pill would show a stale title
  // until a full reload.
  fetchSpace,
})
</script>

<style scoped>
.editor-shell {
  position: fixed;
  inset: 0;
  overflow: hidden;
  /* Pin the editor subtree to deep black regardless of the global app theme. */
  --bg: #000000;
  background: #000000;
}

/* ── Toast ─────────────────────────────────────────────────── */

/* ── Animations ────────────────────────────────────────────── */
.fade-smooth-enter-active, .fade-smooth-leave-active { transition: all 0.25s ease; }
.fade-smooth-enter-from, .fade-smooth-leave-to { opacity: 0; transform: translateY(6px); }

/* ── Share modal ───────────────────────────────────────────── */
.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(60, 64, 67, 0.32);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
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
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 26%, rgba(0,0,0,0.14) 100%),
    rgba(10, 12, 20, 0.42);
  backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  -webkit-backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  padding: 14px;
  z-index: 400;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.12),
    0 24px 60px rgba(0,0,0,0.40);
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

/* ── Settings modal (legacy — replaced by ts-* below) ───── */
.settings-modal {
  width: 100%;
  max-width: 380px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 26%, rgba(0,0,0,0.14) 100%),
    rgba(10,12,20,0.42);
  backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  -webkit-backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 20px;
  padding: 24px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.12),
    0 28px 72px rgba(0,0,0,0.42);
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

/* ── Tour Settings Panel (ts-*) ─────────────────────────── */
.ts-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.ts-panel {
  width: 100%; max-width: 480px; max-height: 88vh;
  background: #0e0e12;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 40px 100px rgba(0,0,0,0.7);
}
.ts-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.ts-header__title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); letter-spacing: -0.01em; }
.ts-close {
  width: 28px; height: 28px; border-radius: 6px;
  background: transparent; border: none; color: rgba(255,255,255,0.3);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: color 120ms, background 120ms;
}
.ts-close:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.07); }
.ts-body { flex: 1; overflow-y: auto; min-height: 0; }
.ts-scroll::-webkit-scrollbar { width: 3px; }
.ts-scroll::-webkit-scrollbar-track { background: transparent; }
.ts-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.ts-section { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.ts-section:last-child { border-bottom: none; }
.ts-field { margin-bottom: 16px; }
.ts-field:last-child { margin-bottom: 0; }
.ts-field__label {
  display: block; font-size: 11px; font-weight: 600;
  color: rgba(255,255,255,0.55); margin-bottom: 7px; letter-spacing: 0.01em;
}
.ts-slider-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
.ts-slider-val { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); font-family: ui-monospace, monospace; }
.ts-range {
  width: 100%; height: 3px; appearance: none;
  background: rgba(255,255,255,0.12); border-radius: 2px; cursor: pointer; outline: none;
}
.ts-range::-webkit-slider-thumb {
  appearance: none; width: 14px; height: 14px; border-radius: 50%;
  background: #fff; border: 2px solid rgba(0,0,0,0.4);
  box-shadow: 0 2px 6px rgba(0,0,0,0.5); cursor: pointer;
}
.ts-toggle-row {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.05);
}
.ts-toggle-sub { font-size: 10px; color: rgba(255,255,255,0.28); font-weight: 500; margin-top: 2px; }
.ts-toggle {
  width: 38px; height: 22px; border-radius: 11px;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1);
  padding: 2px; cursor: pointer; display: flex; align-items: center;
  justify-content: flex-start; flex-shrink: 0;
  transition: background 200ms, border-color 200ms;
}
.ts-toggle--on { background: rgba(255,255,255,0.9); border-color: transparent; justify-content: flex-end; }
.ts-toggle-thumb {
  width: 16px; height: 16px; border-radius: 50%;
  background: rgba(255,255,255,0.6); box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  transition: background 200ms;
}
.ts-toggle--on .ts-toggle-thumb { background: #111; }
.ts-footer {
  display: flex; gap: 8px; padding: 14px 20px;
  border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
}
.ts-btn-save {
  flex: 1; height: 38px; border-radius: 7px;
  background: #ffffff; border: none; color: #0e0e12;
  font-size: 12px; font-weight: 800; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  letter-spacing: 0.02em; transition: background 130ms; font-family: inherit;
}
.ts-btn-save:hover { background: rgba(255,255,255,0.88); }
.ts-btn-save:active { transform: scale(0.98); }
.ts-btn-save:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.ts-btn-cancel {
  height: 38px; padding: 0 16px; border-radius: 7px;
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.45); font-size: 12px; font-weight: 600;
  cursor: pointer; transition: border-color 130ms, color 130ms; font-family: inherit;
}
.ts-btn-cancel:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.75); }
.ts-spin {
  display: inline-block; width: 12px; height: 12px;
  border: 1.5px solid rgba(0,0,0,0.3); border-top-color: #000;
  border-radius: 50%; animation: ts-spin-anim 0.6s linear infinite;
}
@keyframes ts-spin-anim { to { transform: rotate(360deg); } }
.ts-slide-enter-active { animation: ts-panel-in 220ms cubic-bezier(0.34,1.4,0.64,1) forwards; }
.ts-slide-leave-active { animation: ts-panel-out 160ms ease-in forwards; }
@keyframes ts-panel-in  { from { opacity:0; transform:scale(0.94) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes ts-panel-out { from { opacity:1; transform:scale(1); } to { opacity:0; transform:scale(0.96); } }

@media (max-width: 768px) {
  .editor-shell {
    overflow: hidden;
  }

  .ts-overlay,
  .share-overlay {
    padding: 12px;
  }

  .ts-panel,
  .share-modal,
  .hs-edit-panel,
  .rename-popover {
    width: calc(100vw - 24px);
    max-width: none;
  }

  .ts-panel {
    max-height: calc(100vh - 24px);
  }

  .ts-body,
  .ts-scroll {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
  }

  .hs-edit-panel,
  .rename-popover {
    left: 12px;
    right: 12px;
    bottom: 12px;
    transform: none;
  }

  .share-modal {
    border-radius: 16px;
  }

  .share-modal__topbar,
  .share-modal__tabs,
  .share-modal__body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .share-modal__share-row {
    gap: 10px;
  }

  .share-modal__preview-frame {
    height: 220px;
  }
}

@media (max-width: 640px) {
  .ts-header,
  .ts-section,
  .ts-footer {
    padding-left: 14px;
    padding-right: 14px;
  }

  .ts-panel {
    border-radius: 18px;
  }
}

/* ── AI Auto-link modal ─────────────────────────────────────── */
.al-modal {
  background: #fff;
  border-radius: 16px;
  width: min(540px, calc(100vw - 32px));
  max-height: 80vh;
  overflow-y: auto;
  padding: 20px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.22);
}

.al-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 0;
}
.al-loading__text { font-size: 14px; font-weight: 600; color: #111; }
.al-loading__sub  { font-size: 12px; color: #888; }

.al-error {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 0;
  color: #c0392b;
  font-size: 13px;
}

.al-section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #888;
  margin: 18px 0 8px;
}
.al-section-label:first-child { margin-top: 4px; }

.al-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.al-item {
  border-radius: 8px;
  overflow: hidden;
}
.al-item__label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 10px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 120ms;
}
.al-item__label:hover { background: #f5f5f5; }

.al-checkbox {
  margin-top: 2px;
  width: 15px;
  height: 15px;
  accent-color: #3b82f6;
  flex-shrink: 0;
}

.al-item__text {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #222;
  line-height: 1.4;
}
.al-item__from   { color: #666; }
.al-item__arrow  { color: #999; font-size: 12px; }
.al-item__detail {
  display: block;
  width: 100%;
  font-size: 11px;
  color: #999;
  margin-top: 1px;
}

.al-item--danger .al-item__label:hover { background: #fff5f5; }

.al-item__badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.al-item__badge--remove {
  background: #fee2e2;
  color: #dc2626;
}

.al-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: #888;
}

.al-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.al-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 120ms, opacity 120ms;
}
.al-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.al-btn--secondary { background: #f0f0f0; color: #333; }
.al-btn--secondary:hover:not(:disabled) { background: #e5e5e5; }
.al-btn--primary { background: #3b82f6; color: #fff; }
.al-btn--primary:hover:not(:disabled) { background: #2563eb; }

.al-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(0,0,0,0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.al-spinner--sm {
  width: 14px;
  height: 14px;
  border-color: rgba(255,255,255,0.3);
  border-top-color: #fff;
}

/* ── Mobile: strip backdrop-filter from the entire editor ── */
@media (hover: none) and (pointer: coarse) {
  * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
}
</style>
