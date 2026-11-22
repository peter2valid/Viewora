// The tour's Object Spotlights in the editor: the list (for the settings
// panel) and each scene's published file (so the editor's viewer shows them).
// Made and published by Spotlight Studio (scripts/spotlight/); here they can
// be removed, or added from a .spotlight file.
import { reactive, watch } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import { setSpotlightUrls } from '~/shared/spotlight'
import { BUNDLE_MAX_BYTES, parseBundle } from '~/shared/spotlight/bundle'

export interface EditorSpotlight {
  id: string
  scene_id: string
  object_key: string
  data: { title: string; label?: string; lines?: string[]; zoom?: number }
  voice_url: string | null
  updated_at: string
}

export function useEditorSpotlights(spaceId: () => string | undefined | null) {
  const { apiFetch } = useApiFetch()
  const state = reactive({
    /** False until the backend's migration has run. */
    enabled: true,
    loaded: false,
    loading: false,
    busy: '' as string,
    rows: [] as EditorSpotlight[],
    sceneNames: {} as Record<string, string>,
  })

  async function refresh() {
    const id = spaceId()
    if (!id) return
    state.loading = true
    try {
      const r = await apiFetch(`/spaces/${id}/spotlights`) as any
      state.enabled = r.enabled !== false
      state.rows = r.spotlights ?? []
      state.sceneNames = Object.fromEntries((r.scenes ?? []).map((s: any) => [s.id, s.name]))
      const files = new Map<string, string>((r.files ?? []).map((f: any) => [f.scene_id, f.url]))
      // Every scene of the tour: its file, or none (so a deleted one goes away).
      setSpotlightUrls((r.scenes ?? []).map((s: any) => [s.id, files.get(s.id) ?? null] as const))
      state.loaded = true
    } catch {
      // Not fatal: the editor works without them. The panel offers a retry.
    } finally {
      state.loading = false
    }
  }

  function forScene(sceneId: string | null | undefined): EditorSpotlight[] {
    return sceneId ? state.rows.filter(r => r.scene_id === sceneId) : []
  }

  async function remove(row: EditorSpotlight) {
    state.busy = row.id
    try {
      await apiFetch(`/scenes/${row.scene_id}/spotlights/${row.object_key}`, { method: 'DELETE' })
      await refresh()
    } finally {
      state.busy = ''
    }
  }

  /** Adds (or replaces) the object in a .spotlight file. Returns the scene it went to. */
  async function upload(file: File): Promise<{ sceneId: string; title: string }> {
    if (file.size > BUNDLE_MAX_BYTES) throw new Error('That file is too big to be a spotlight.')
    const b = parseBundle(await file.text())
    if (typeof b === 'string') throw new Error(b)
    if (!(b.scene in state.sceneNames)) throw new Error('That spotlight was made for a scene of another tour.')
    state.busy = 'upload'
    try {
      await apiFetch(`/scenes/${b.scene}/spotlights/${b.key}`, {
        method: 'PUT',
        body: { data: b.data, source: b.source ?? null, ...(b.voice !== undefined ? { voice: b.voice } : {}) },
      })
      await refresh()
      return { sceneId: b.scene, title: String(b.data.title) }
    } finally {
      state.busy = ''
    }
  }

  watch(spaceId, () => { void refresh() }, { immediate: true })

  return { state, refresh, forScene, remove, upload }
}
