import { ref } from 'vue'

export type AutoLinkSuggestion = {
  _id: string
  fromSceneId: string
  fromSceneName: string
  toSceneId: string
  toSceneName: string
  yaw: number
  pitch: number
  label: string
  doorwayDescription: string
}

export type SceneRename = {
  _id: string
  sceneId: string
  currentName: string
  suggestedName: string
}

export function useAutoLink(
  spaceId: string,
  apiFetch: (url: string, opts?: any) => Promise<any>,
) {
  const showModal = ref(false)
  const isAnalyzing = ref(false)
  const isApplying = ref(false)
  const errorMsg = ref<string | null>(null)
  const suggestions = ref<AutoLinkSuggestion[]>([])
  const sceneRenames = ref<SceneRename[]>([])
  const selectedSuggestions = ref<Set<string>>(new Set())
  const selectedRenames = ref<Set<string>>(new Set())

  async function open() {
    showModal.value = true
    isAnalyzing.value = true
    errorMsg.value = null
    suggestions.value = []
    sceneRenames.value = []

    try {
      const result = await apiFetch(`/spaces/${spaceId}/auto-link`, { method: 'POST' }) as any
      suggestions.value = (result.suggestions ?? []).map((s: any, i: number) => ({ ...s, _id: `s${i}` }))
      sceneRenames.value = (result.sceneRenames ?? []).map((r: any, i: number) => ({ ...r, _id: `r${i}` }))
      // Pre-select everything
      selectedSuggestions.value = new Set(suggestions.value.map(s => s._id))
      selectedRenames.value = new Set(sceneRenames.value.map(r => r._id))
    } catch (err: any) {
      errorMsg.value =
        err?.data?.message ||
        err?.data?.statusMessage ||
        err?.message ||
        'Analysis failed. Check that AI is configured on the server.'
    } finally {
      isAnalyzing.value = false
    }
  }

  function close() {
    showModal.value = false
  }

  function toggleSuggestion(id: string) {
    if (selectedSuggestions.value.has(id)) selectedSuggestions.value.delete(id)
    else selectedSuggestions.value.add(id)
  }

  function toggleRename(id: string) {
    if (selectedRenames.value.has(id)) selectedRenames.value.delete(id)
    else selectedRenames.value.add(id)
  }

  async function apply(
    onRename: (sceneId: string, name: string) => Promise<void>,
    onCreateHotspot: (sceneId: string, payload: object) => Promise<void>,
  ) {
    isApplying.value = true
    errorMsg.value = null
    try {
      for (const r of sceneRenames.value) {
        if (selectedRenames.value.has(r._id)) await onRename(r.sceneId, r.suggestedName)
      }
      for (const s of suggestions.value) {
        if (!selectedSuggestions.value.has(s._id)) continue
        await onCreateHotspot(s.fromSceneId, {
          type: 'scene_link',
          yaw: s.yaw,
          pitch: s.pitch,
          label: s.label,
          target_scene_id: s.toSceneId,
        })
      }
      showModal.value = false
    } catch (err: any) {
      errorMsg.value = 'Some changes could not be applied. Please try again.'
    } finally {
      isApplying.value = false
    }
  }

  return {
    showModal, isAnalyzing, isApplying, errorMsg,
    suggestions, sceneRenames,
    selectedSuggestions, selectedRenames,
    open, close, toggleSuggestion, toggleRename, apply,
  }
}
