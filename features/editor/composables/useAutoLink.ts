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

export type InfoHotspotSuggestion = {
  _id: string
  sceneId: string
  sceneName: string
  yaw: number
  pitch: number
  label: string
  description: string
}

export type HotspotDeletion = {
  _id: string
  hotspotId: string
  sceneId: string
  sceneName: string
  label: string
  type: string
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
  const showModal    = ref(false)
  const isAnalyzing  = ref(false)
  const isApplying   = ref(false)
  const errorMsg     = ref<string | null>(null)

  const suggestions      = ref<AutoLinkSuggestion[]>([])
  const infoHotspots     = ref<InfoHotspotSuggestion[]>([])
  const hotspotDeletions = ref<HotspotDeletion[]>([])
  const sceneRenames     = ref<SceneRename[]>([])

  const selectedSuggestions  = ref<Set<string>>(new Set())
  const selectedInfoHotspots = ref<Set<string>>(new Set())
  const selectedDeletions    = ref<Set<string>>(new Set())
  const selectedRenames      = ref<Set<string>>(new Set())

  async function open() {
    showModal.value    = true
    isAnalyzing.value  = true
    errorMsg.value     = null
    suggestions.value      = []
    infoHotspots.value     = []
    hotspotDeletions.value = []
    sceneRenames.value     = []

    try {
      const result = await apiFetch(`/spaces/${spaceId}/auto-link`, { method: 'POST' }) as any

      suggestions.value      = (result.suggestions      ?? []).map((s: any, i: number) => ({ ...s, _id: `s${i}` }))
      infoHotspots.value     = (result.infoHotspots     ?? []).map((h: any, i: number) => ({ ...h, _id: h._id || `ih${i}` }))
      hotspotDeletions.value = (result.hotspotDeletions ?? []).map((d: any, i: number) => ({ ...d, _id: d._id || `del${i}` }))
      sceneRenames.value     = (result.sceneRenames     ?? []).map((r: any, i: number) => ({ ...r, _id: `r${i}` }))

      // Pre-select everything
      selectedSuggestions.value  = new Set(suggestions.value.map(s => s._id))
      selectedInfoHotspots.value = new Set(infoHotspots.value.map(h => h._id))
      selectedDeletions.value    = new Set(hotspotDeletions.value.map(d => d._id))
      selectedRenames.value      = new Set(sceneRenames.value.map(r => r._id))
    } catch (err: any) {
      errorMsg.value =
        err?.data?.message ||
        err?.data?.statusMessage ||
        err?.message ||
        'Analysis failed. Check that the Anthropic API key is configured on the server.'
    } finally {
      isAnalyzing.value = false
    }
  }

  function close() { showModal.value = false }

  function toggleSuggestion(id: string) {
    const next = new Set(selectedSuggestions.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selectedSuggestions.value = next
  }

  function toggleInfoHotspot(id: string) {
    const next = new Set(selectedInfoHotspots.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selectedInfoHotspots.value = next
  }

  function toggleDeletion(id: string) {
    const next = new Set(selectedDeletions.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selectedDeletions.value = next
  }

  function toggleRename(id: string) {
    const next = new Set(selectedRenames.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selectedRenames.value = next
  }

  const hasSelections = () =>
    selectedSuggestions.value.size > 0 ||
    selectedInfoHotspots.value.size > 0 ||
    selectedDeletions.value.size > 0 ||
    selectedRenames.value.size > 0

  async function apply(
    onRename:        (sceneId: string, name: string) => Promise<void>,
    onCreateHotspot: (sceneId: string, payload: object) => Promise<void>,
    onDeleteHotspot: (hotspotId: string) => Promise<void>,
  ) {
    isApplying.value = true
    errorMsg.value   = null
    try {
      // 1. Renames first (scene names used in hotspot labels)
      for (const r of sceneRenames.value) {
        if (selectedRenames.value.has(r._id)) await onRename(r.sceneId, r.suggestedName)
      }
      // 2. Delete bad hotspots
      for (const d of hotspotDeletions.value) {
        if (selectedDeletions.value.has(d._id)) await onDeleteHotspot(d.hotspotId)
      }
      // 3. Create navigation hotspots
      for (const s of suggestions.value) {
        if (!selectedSuggestions.value.has(s._id)) continue
        await onCreateHotspot(s.fromSceneId, {
          type:            'scene_link',
          yaw:              s.yaw,
          pitch:            s.pitch,
          label:            s.label,
          target_scene_id:  s.toSceneId,
        })
      }
      // 4. Create info hotspots
      for (const h of infoHotspots.value) {
        if (!selectedInfoHotspots.value.has(h._id)) continue
        await onCreateHotspot(h.sceneId, {
          type:    'info',
          yaw:      h.yaw,
          pitch:    h.pitch,
          label:    h.label,
          content:  { text: h.description },
        })
      }
      showModal.value = false
    } catch {
      errorMsg.value = 'Some changes could not be applied. Please try again.'
    } finally {
      isApplying.value = false
    }
  }

  return {
    showModal, isAnalyzing, isApplying, errorMsg,
    suggestions, infoHotspots, hotspotDeletions, sceneRenames,
    selectedSuggestions, selectedInfoHotspots, selectedDeletions, selectedRenames,
    hasSelections,
    open, close,
    toggleSuggestion, toggleInfoHotspot, toggleDeletion, toggleRename,
    apply,
  }
}
