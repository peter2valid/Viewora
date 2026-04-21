import { ref, readonly } from 'vue'

// Local composable mode type — for pages that use this composable directly without the Pinia store.
// The canonical EditorMode type lives in features/editor/store/useEditorStore.ts.
export type LocalEditorMode = 'view' | 'hotspot' | 'settings'

export function useEditorState() {
  const mode = ref<LocalEditorMode>('view')
  const isDirty = ref(false)
  const isSaving = ref(false)

  function setMode(next: LocalEditorMode) {
    mode.value = next
  }

  function markDirty() {
    isDirty.value = true
  }

  function markClean() {
    isDirty.value = false
  }

  function setSaving(value: boolean) {
    isSaving.value = value
  }

  return {
    mode: readonly(mode),
    isDirty: readonly(isDirty),
    isSaving: readonly(isSaving),
    setMode,
    markDirty,
    markClean,
    setSaving,
  }
}
