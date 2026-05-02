import { ref, watch, type Ref, type ComputedRef } from 'vue'
import { type EditorHotspot } from '~/features/editor/mappers'
import { type SceneUploadState } from '~/features/editor/composables/useEditorUpload'
import { isLocalSceneId } from '~/features/editor/composables/useEditorUpload'

type EditorStore = { openModal: () => void; closeModal: () => void }

export function useEditorPublish(
  spaceId: string,
  apiFetch: (url: string, opts?: any) => Promise<any>,
  space: Ref<any>,
  scenes: Ref<any[]>,
  hotspotsByScene: Ref<Record<string, EditorHotspot[]>>,
  sceneUploadStateById: Ref<Record<string, SceneUploadState>>,
  backendSceneStatusToUploadState: (status: string) => SceneUploadState,
  fetchHotspots: (sceneId: string) => Promise<void>,
  showToast: (msg: string, type?: 'success' | 'error') => void,
  editorStore: EditorStore,
) {
  const publishing = ref(false)
  const showSettingsPanel = ref(false)
  const settingsDraft = ref({ hfov: 90, yaw: 0, pitch: 0, autoRotate: false })
  const settingsSaving = ref(false)
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

  function validateTourHealth(): { type: 'error' | 'warning'; message: string }[] {
    const issues: { type: 'error' | 'warning'; message: string }[] = []

    if (scenes.value.length === 0) {
      issues.push({ type: 'error', message: 'Your tour has no scenes. Add at least one scene first.' })
      return issues
    }

    const notReady = scenes.value.filter(s => {
      const state = sceneUploadStateById.value[s.id] || backendSceneStatusToUploadState(s.status)
      return state !== 'ready'
    })
    if (notReady.length > 0) {
      issues.push({
        type: 'error',
        message: `${notReady.length} scene${notReady.length > 1 ? 's are' : ' is'} still processing. Wait for them to finish.`,
      })
    }

    const sceneIds = new Set(scenes.value.map(s => s.id))
    let brokenCount = 0
    for (const hotspots of Object.values(hotspotsByScene.value)) {
      for (const h of hotspots as EditorHotspot[]) {
        if (h.type === 'scene_link' && h.targetSceneId && !sceneIds.has(h.targetSceneId)) brokenCount++
      }
    }
    if (brokenCount > 0) {
      issues.push({ type: 'error', message: `${brokenCount} scene link${brokenCount > 1 ? 's' : ''} point to deleted rooms. Fix them first.` })
    }

    const sortedScenes = [...scenes.value].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    const rootId = sortedScenes[0]?.id
    if (rootId) {
      const reachable = new Set<string>([rootId])
      const queue = [rootId]
      while (queue.length > 0) {
        const currentId = queue.shift()!
        for (const h of hotspotsByScene.value[currentId] || []) {
          if (h.type === 'scene_link' && h.targetSceneId && sceneIds.has(h.targetSceneId) && !reachable.has(h.targetSceneId)) {
            reachable.add(h.targetSceneId)
            queue.push(h.targetSceneId)
          }
        }
      }
      const unreachable = scenes.value.filter(s => !reachable.has(s.id))
      if (unreachable.length > 0) {
        issues.push({ type: 'warning', message: `${unreachable.length} room${unreachable.length > 1 ? 's are' : ' is'} unreachable from the start. Add links to them.` })
      }
    }

    if (scenes.value.length > 1) {
      const deadEnds = scenes.value.filter(s => !(hotspotsByScene.value[s.id] || []).some(h => h.type === 'scene_link'))
      if (deadEnds.length > 0) {
        issues.push({ type: 'warning', message: `${deadEnds.length} room${deadEnds.length > 1 ? 's have' : ' has'} no way to leave. Add an arrow back or to another room.` })
      }
    }

    return issues
  }

  async function handleTogglePublish() {
    publishing.value = true
    try {
      const isLive = space.value.is_published
      if (!isLive) {
        const unloaded = scenes.value.filter((s: any) => !isLocalSceneId(s.id) && hotspotsByScene.value[s.id] === undefined)
        if (unloaded.length) await Promise.all(unloaded.map((s: any) => fetchHotspots(s.id)))

        const issues = validateTourHealth()
        const errors = issues.filter(i => i.type === 'error')
        const warnings = issues.filter(i => i.type === 'warning')
        if (errors.length > 0) { showToast(errors[0].message, 'error'); return }
        if (warnings.length > 0) { showToast(warnings[0].message, 'error'); return }
      }

      const updated = await apiFetch(`/spaces/${spaceId}/publish`, {
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
      await apiFetch(`/spaces/${spaceId}/settings`, { method: 'PATCH', body: patch })
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

  return {
    publishing,
    showSettingsPanel,
    settingsDraft,
    settingsSaving,
    showShareModal,
    validateTourHealth,
    handleTogglePublish,
    saveSettings,
  }
}
