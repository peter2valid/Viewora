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
  icon?: string
  scale?: number
}

export type InfoHotspotSuggestion = {
  _id: string
  sceneId: string
  sceneName: string
  yaw: number
  pitch: number
  label: string
  description: string
  category?: 'feature' | 'view' | 'highlight'
  icon?: string
  scale?: number
  labelBold?: boolean
}

export type HotspotFix = {
  _id: string
  hotspotId: string
  sceneId: string
  sceneName: string
  label: string
  type: string
  newLabel?: string
  yaw?: number
  pitch?: number
  moveDeg?: number
}

export type SceneSetting = {
  _id: string
  sceneId: string
  sceneName: string
  initialYawDeg?: number
  group?: string
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

export function useAutoLink(spaceId: string) {
  const showModal    = ref(false)
  const isAnalyzing  = ref(false)
  const isApplying   = ref(false)
  const errorMsg     = ref<string | null>(null)
  const progress     = ref<string | null>(null)

  const suggestions      = ref<AutoLinkSuggestion[]>([])
  const infoHotspots     = ref<InfoHotspotSuggestion[]>([])
  const hotspotDeletions = ref<HotspotDeletion[]>([])
  const sceneRenames     = ref<SceneRename[]>([])
  const hotspotFixes     = ref<HotspotFix[]>([])
  const sceneSettings    = ref<SceneSetting[]>([])

  const selectedSuggestions  = ref<Set<string>>(new Set())
  const selectedInfoHotspots = ref<Set<string>>(new Set())
  const selectedDeletions    = ref<Set<string>>(new Set())
  const selectedRenames      = ref<Set<string>>(new Set())
  const selectedFixes        = ref<Set<string>>(new Set())
  const selectedSettings     = ref<Set<string>>(new Set())

  function applyResults(data: any) {
    suggestions.value      = (data.suggestions      ?? []).map((s: any, i: number) => ({ ...s, _id: `s${i}` }))
    infoHotspots.value     = (data.infoHotspots     ?? []).map((h: any, i: number) => ({ ...h, _id: h._id || `ih${i}` }))
    hotspotDeletions.value = (data.hotspotDeletions ?? []).map((d: any, i: number) => ({ ...d, _id: d._id || `del${i}` }))
    sceneRenames.value     = (data.sceneRenames     ?? []).map((r: any, i: number) => ({ ...r, _id: `r${i}` }))
    hotspotFixes.value     = (data.hotspotFixes     ?? []).map((f: any, i: number) => ({ ...f, _id: f._id || `fix${i}` }))
    sceneSettings.value    = (data.sceneSettings    ?? []).map((c: any, i: number) => ({ ...c, _id: c._id || `set${i}` }))

    selectedSuggestions.value  = new Set(suggestions.value.map(s => s._id))
    selectedInfoHotspots.value = new Set(infoHotspots.value.map(h => h._id))
    selectedDeletions.value    = new Set(hotspotDeletions.value.map(d => d._id))
    selectedRenames.value      = new Set(sceneRenames.value.map(r => r._id))
    selectedFixes.value        = new Set(hotspotFixes.value.map(f => f._id))
    selectedSettings.value     = new Set(sceneSettings.value.map(c => c._id))
  }

  async function open() {
    showModal.value    = true
    isAnalyzing.value  = true
    progress.value     = null
    errorMsg.value     = null
    suggestions.value      = []
    infoHotspots.value     = []
    hotspotDeletions.value = []
    sceneRenames.value     = []
    hotspotFixes.value     = []
    sceneSettings.value    = []

    // Build request URL and auth token from Nuxt composables.
    // We use native fetch (not apiFetch/$fetch) because $fetch buffers the
    // entire response before resolving — incompatible with SSE streaming.
    const session = useSupabaseSession()
    const config  = useRuntimeConfig()
    const baseURL = (config.public.apiBaseUrl as string | undefined) || ''
    const token   = session.value?.access_token ?? ''

    const url = baseURL
      ? `${baseURL.replace(/\/$/, '')}/spaces/${spaceId}/auto-link`
      : `/api/spaces/${spaceId}/auto-link`

    try {
      const response = await fetch(url, {
        method:  'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept':        'text/event-stream',
        },
      })

      if (!response.ok) {
        // Early error before SSE starts (e.g. 404, 503) — parse JSON envelope
        const body = await response.json().catch(() => ({})) as any
        throw new Error(
          body?.message ||
          body?.data?.message ||
          body?.statusMessage ||
          `Request failed (HTTP ${response.status})`,
        )
      }

      if (!response.body) throw new Error('No response body from server.')

      // Read the SSE stream
      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      let   gotComplete = false

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // SSE events are separated by \n\n
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            if (!part.trim()) continue

            let eventType = 'message'
            let dataStr   = ''

            for (const line of part.split('\n')) {
              if (line.startsWith('event: '))      eventType = line.slice(7).trim()
              else if (line.startsWith('data: '))  dataStr   = line.slice(6).trim()
            }

            if (!dataStr) continue

            let parsed: any
            try { parsed = JSON.parse(dataStr) } catch { continue }

            if (eventType === 'progress') {
              progress.value = `Analysing scene ${parsed.sceneIndex} of ${parsed.total} — ${parsed.sceneName}`
            } else if (eventType === 'complete') {
              gotComplete = true
              applyResults(parsed)
            } else if (eventType === 'error') {
              throw new Error(parsed.message || 'Analysis failed on the server.')
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      if (!gotComplete) {
        throw new Error('Analysis was interrupted before completing. Please try again.')
      }
    } catch (err: any) {
      errorMsg.value =
        err?.message ||
        'Analysis failed. Check that the Gemini API key is configured on the server.'
    } finally {
      isAnalyzing.value = false
      progress.value    = null
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

  function toggleFix(id: string) {
    const next = new Set(selectedFixes.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selectedFixes.value = next
  }

  function toggleSetting(id: string) {
    const next = new Set(selectedSettings.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selectedSettings.value = next
  }

  const hasSelections = () =>
    selectedSuggestions.value.size > 0 ||
    selectedInfoHotspots.value.size > 0 ||
    selectedDeletions.value.size > 0 ||
    selectedRenames.value.size > 0 ||
    selectedFixes.value.size > 0 ||
    selectedSettings.value.size > 0

  async function apply(
    onRename:        (sceneId: string, name: string) => Promise<void>,
    onCreateHotspot: (sceneId: string, payload: object) => Promise<void>,
    onDeleteHotspot: (hotspotId: string) => Promise<void>,
    onUpdateHotspot: (hotspotId: string, sceneId: string, body: object) => Promise<void>,
    onUpdateScene:   (sceneId: string, body: object) => Promise<void>,
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
      // 3. Fix existing hotspots (move / relabel)
      for (const f of hotspotFixes.value) {
        if (!selectedFixes.value.has(f._id)) continue
        const body: Record<string, unknown> = {}
        if (f.yaw != null && f.pitch != null) { body.yaw = f.yaw; body.pitch = f.pitch }
        if (f.newLabel) body.label = f.newLabel
        await onUpdateHotspot(f.hotspotId, f.sceneId, body)
      }
      // 4. Scene settings (opening view + category)
      for (const c of sceneSettings.value) {
        if (!selectedSettings.value.has(c._id)) continue
        const body: Record<string, unknown> = {}
        if (c.initialYawDeg != null) { body.initial_yaw = c.initialYawDeg; body.initial_pitch = 0 }
        if (c.group) body.group_name = c.group
        await onUpdateScene(c.sceneId, body)
      }
      // 5. Create navigation hotspots
      for (const s of suggestions.value) {
        if (!selectedSuggestions.value.has(s._id)) continue
        await onCreateHotspot(s.fromSceneId, {
          type:            'scene_link',
          yaw:              s.yaw,
          pitch:            s.pitch,
          label:            s.label,
          target_scene_id:  s.toSceneId,
          content:          { icon: s.icon, scale: s.scale ?? 1 },
        })
      }
      // 6. Create info hotspots
      for (const h of infoHotspots.value) {
        if (!selectedInfoHotspots.value.has(h._id)) continue
        await onCreateHotspot(h.sceneId, {
          type:    'info',
          yaw:      h.yaw,
          pitch:    h.pitch,
          label:    h.label,
          content:  {
            text:       h.description,
            icon:       h.icon,
            scale:      h.scale ?? 1,
            label_bold: h.labelBold || undefined,
          },
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
    showModal, isAnalyzing, isApplying, errorMsg, progress,
    suggestions, infoHotspots, hotspotDeletions, sceneRenames, hotspotFixes, sceneSettings,
    selectedSuggestions, selectedInfoHotspots, selectedDeletions, selectedRenames, selectedFixes, selectedSettings,
    hasSelections,
    open, close,
    toggleSuggestion, toggleInfoHotspot, toggleDeletion, toggleRename, toggleFix, toggleSetting,
    apply,
  }
}
