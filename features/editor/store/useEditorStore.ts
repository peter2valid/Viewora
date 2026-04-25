import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'

export type EditorMode = 'view' | 'hotspot' | 'settings'
export type EditorPanel = 'scenes' | 'hotspots' | 'settings' | 'share' | null

// UI-only state for the editor. No domain data lives here — that belongs in useTourStore.
export const useEditorStore = defineStore('editor', () => {
  const mode = ref<EditorMode>('view')
  const activePanel = ref<EditorPanel>(null)
  const isDirty = ref(false)
  const isSaving = ref(false)
  const selectedHotspotId = ref<string | null>(null)
  // Any open dialog/modal sets this true — keyboard shortcuts check it before firing.
  const isModalOpen = ref(false)

  function setMode(next: EditorMode) {
    mode.value = next
  }

  function setPanel(panel: EditorPanel) {
    activePanel.value = panel
  }

  function selectHotspot(id: string | null) {
    selectedHotspotId.value = id
  }

  function markDirty() {
    isDirty.value = true
  }

  function markClean() {
    isDirty.value = false
  }

  function setSaving(value: boolean) {
    isSaving.value = value
    if (value) isDirty.value = false
  }

  function openModal() {
    isModalOpen.value = true
  }

  function closeModal() {
    isModalOpen.value = false
  }

  function $reset() {
    mode.value = 'view'
    activePanel.value = null
    isDirty.value = false
    isSaving.value = false
    selectedHotspotId.value = null
    isModalOpen.value = false
  }

  return {
    mode: readonly(mode),
    activePanel: readonly(activePanel),
    isDirty: readonly(isDirty),
    isSaving: readonly(isSaving),
    selectedHotspotId: readonly(selectedHotspotId),
    isModalOpen: readonly(isModalOpen),
    setMode,
    setPanel,
    selectHotspot,
    markDirty,
    markClean,
    setSaving,
    openModal,
    closeModal,
    $reset,
  }
})
