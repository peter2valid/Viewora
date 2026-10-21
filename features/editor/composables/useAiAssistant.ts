import { computed, reactive, ref } from 'vue'

// AI assistant panel: the owner prompts for the whole tour, the current scene,
// or an area they drew on the photo. The backend answers with proposals
// (hotspots, scene settings, listing text, photo edits) that are applied
// through the normal endpoints only after the owner ticks them — same review
// model as auto-link. Photo edits are a separate, billed step per proposal.

export type AiScope = 'tour' | 'scene' | 'region'
export type SphericalPoint = { yaw: number; pitch: number }

export type AiProposal = {
  id: string
  kind: 'create_hotspot' | 'update_hotspot' | 'delete_hotspot' | 'update_scene' | 'update_listing' | 'edit_image'
  summary: string
  why: string
  sceneId?: string
  sceneName?: string
  hotspotId?: string
  payload?: Record<string, any>
  instruction?: string
  corners?: SphericalPoint[]
}

export type AiAllowance = { used: number; limit: number | null }
export type AiUsage = { period: string; planName: string; isFree: boolean; prompts: AiAllowance; imageEdits: AiAllowance }

export type PhotoEditState = {
  status: 'idle' | 'generating' | 'ready' | 'applying' | 'applied' | 'error'
  editId?: string
  beforeUrl?: string
  afterUrl?: string
  error?: string
}

export type AiMessage = { role: 'user' | 'ai'; text: string; scope?: AiScope }

export type AiApplyCallbacks = {
  createHotspot: (sceneId: string, payload: object) => Promise<void>
  updateHotspot: (hotspotId: string, sceneId: string, body: object) => Promise<void>
  deleteHotspot: (hotspotId: string) => Promise<void>
  updateScene:   (sceneId: string, body: object) => Promise<void>
  updateListing: (body: object) => Promise<void>
}

function errMessage(err: any, fallback: string): string {
  return err?.data?.statusMessage || err?.data?.message || err?.message || fallback
}

export function useAiAssistant(spaceId: string) {
  const { apiFetch } = useApiFetch()

  const isOpen     = ref(false)
  const scope      = ref<AiScope>('scene')
  const prompt     = ref('')
  const isSending  = ref(false)
  const isApplying = ref(false)
  const error      = ref<string | null>(null)
  const messages   = ref<AiMessage[]>([])
  const proposals  = ref<AiProposal[]>([])
  const selected   = ref<Set<string>>(new Set())
  const usage      = ref<AiUsage | null>(null)

  // Area tool: drawing → owner drags a box on the panorama → region is set
  const isDrawing  = ref(false)
  const region     = ref<SphericalPoint[] | null>(null)

  const photoEdits = reactive<Record<string, PhotoEditState>>({})

  const canEditPhotos = computed(() => {
    const u = usage.value?.imageEdits
    return !!u && (u.limit === null || u.limit > u.used)
  })
  const promptsLeft = computed(() => {
    const u = usage.value?.prompts
    return !u || u.limit === null ? null : Math.max(0, u.limit - u.used)
  })
  const editsLeft = computed(() => {
    const u = usage.value?.imageEdits
    return !u || u.limit === null ? null : Math.max(0, u.limit - u.used)
  })
  const applicable = computed(() => proposals.value.filter(p => p.kind !== 'edit_image'))
  const photoProposals = computed(() => proposals.value.filter(p => p.kind === 'edit_image'))

  async function fetchUsage() {
    try {
      usage.value = await apiFetch('/ai/usage') as AiUsage
    } catch { /* meter just stays hidden */ }
  }

  function open(initialScope: AiScope = 'scene') {
    isOpen.value = true
    scope.value  = initialScope
    error.value  = null
    void fetchUsage()
  }

  function close() {
    isOpen.value    = false
    isDrawing.value = false
  }

  function startDrawing() {
    scope.value     = 'region'
    isDrawing.value = true
    region.value    = null
  }

  function setRegion(corners: SphericalPoint[] | null) {
    isDrawing.value = false
    region.value    = corners
    if (!corners && scope.value === 'region') scope.value = 'scene'
  }

  function setScope(next: AiScope) {
    scope.value = next
    if (next === 'region' && !region.value) startDrawing()
    if (next !== 'region') isDrawing.value = false
  }

  async function send(sceneId: string | null) {
    const text = prompt.value.trim()
    if (text.length < 2 || isSending.value) return
    if (scope.value !== 'tour' && !sceneId) { error.value = 'Open a scene first.'; return }
    if (scope.value === 'region' && !region.value) { error.value = 'Draw a box on the photo first.'; return }

    isSending.value = true
    error.value     = null
    messages.value  = [...messages.value, { role: 'user', text, scope: scope.value }]
    prompt.value    = ''
    try {
      const res = await apiFetch(`/spaces/${spaceId}/ai/assistant`, {
        method: 'POST',
        body: {
          prompt: text,
          scope:  scope.value,
          ...(scope.value !== 'tour' ? { sceneId } : {}),
          ...(scope.value === 'region' ? { region: { corners: region.value } } : {}),
        },
      }) as { reply: string; proposals: AiProposal[]; usage: AiUsage }
      messages.value  = [...messages.value, { role: 'ai', text: res.reply }]
      proposals.value = res.proposals
      selected.value  = new Set(res.proposals.filter(p => p.kind !== 'edit_image').map(p => p.id))
      usage.value     = res.usage
      for (const p of res.proposals) if (p.kind === 'edit_image') photoEdits[p.id] = { status: 'idle' }
    } catch (err: any) {
      error.value = errMessage(err, 'The AI assistant couldn’t answer right now.')
      prompt.value = text   // give the owner their text back
      messages.value = messages.value.slice(0, -1)
    } finally {
      isSending.value = false
    }
  }

  function toggle(id: string) {
    const next = new Set(selected.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selected.value = next
  }

  /** Applies the ticked non-photo proposals in a safe order. Returns how many succeeded. */
  async function applySelected(cb: AiApplyCallbacks): Promise<number> {
    isApplying.value = true
    error.value      = null
    const order: AiProposal['kind'][] = ['update_listing', 'update_scene', 'delete_hotspot', 'update_hotspot', 'create_hotspot']
    const todo = applicable.value
      .filter(p => selected.value.has(p.id))
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    const done = new Set<string>()
    try {
      for (const p of todo) {
        if (p.kind === 'update_listing')      await cb.updateListing(p.payload!)
        else if (p.kind === 'update_scene')   await cb.updateScene(p.sceneId!, p.payload!)
        else if (p.kind === 'delete_hotspot') await cb.deleteHotspot(p.hotspotId!)
        else if (p.kind === 'update_hotspot') await cb.updateHotspot(p.hotspotId!, p.sceneId!, p.payload!)
        else if (p.kind === 'create_hotspot') await cb.createHotspot(p.sceneId!, p.payload!)
        done.add(p.id)
      }
    } catch (err: any) {
      error.value = errMessage(err, 'Some changes could not be applied.')
    } finally {
      // Applied proposals leave the list; failed/unticked ones stay for another try
      proposals.value  = proposals.value.filter(p => !done.has(p.id))
      selected.value   = new Set([...selected.value].filter(id => !done.has(id)))
      isApplying.value = false
    }
    return done.size
  }

  /** Billed step: asks the image model for the edit and returns before/after crops. */
  async function previewPhotoEdit(p: { id: string; sceneId: string; instruction: string; corners: SphericalPoint[] }) {
    photoEdits[p.id] = { status: 'generating' }
    try {
      const res = await apiFetch(`/scenes/${p.sceneId}/ai/image-edit`, {
        method: 'POST',
        body: { instruction: p.instruction, corners: p.corners },
      }) as { editId: string; beforeUrl: string; afterUrl: string; usage: AiUsage }
      photoEdits[p.id] = { status: 'ready', editId: res.editId, beforeUrl: res.beforeUrl, afterUrl: res.afterUrl }
      usage.value = res.usage
    } catch (err: any) {
      photoEdits[p.id] = { status: 'error', error: errMessage(err, 'Photo edit failed.') }
    }
  }

  /** Direct photo edit of the drawn area, skipping the assistant (saves a prompt). */
  async function editDrawnArea(sceneId: string) {
    const text = prompt.value.trim()
    if (!region.value || text.length < 3) return
    const id = `direct-${Date.now()}`
    proposals.value = [...proposals.value, {
      id, kind: 'edit_image', summary: `Photo edit: ${text}`, why: 'Your instruction',
      sceneId, instruction: text, corners: region.value,
    }]
    messages.value = [...messages.value, { role: 'user', text: `🖌️ ${text}`, scope: 'region' }]
    prompt.value = ''
    await previewPhotoEdit({ id, sceneId, instruction: text, corners: region.value })
  }

  /**
   * Free step: queues the edit onto the full-resolution photo. The scene is
   * re-tiled in the background; `waitForScene` resolves when it's live.
   */
  async function applyPhotoEdit(p: AiProposal, waitForScene: (sceneId: string, variant: string) => Promise<boolean>) {
    const state = photoEdits[p.id]
    if (!state?.editId || !p.sceneId) return
    photoEdits[p.id] = { ...state, status: 'applying' }
    try {
      const res = await apiFetch(`/scenes/${p.sceneId}/ai/image-edit/${state.editId}/apply`, { method: 'POST' }) as { variant: string }
      const ok = await waitForScene(p.sceneId, res.variant)
      photoEdits[p.id] = ok
        ? { ...state, status: 'applied' }
        : { ...state, status: 'error', error: 'The edit is taking longer than usual — check back in a few minutes.' }
    } catch (err: any) {
      photoEdits[p.id] = { ...state, status: 'error', error: errMessage(err, 'Could not apply the edit.') }
    }
  }

  function discardPhotoEdit(id: string) {
    proposals.value = proposals.value.filter(p => p.id !== id)
    delete photoEdits[id]
  }

  async function revertPhoto(sceneId: string, waitForScene: (sceneId: string, variant: string) => Promise<boolean>) {
    const res = await apiFetch(`/scenes/${sceneId}/ai/revert-image`, { method: 'POST' }) as { variant: string }
    return waitForScene(sceneId, res.variant)
  }

  function clearConversation() {
    messages.value  = []
    proposals.value = []
    selected.value  = new Set()
    for (const k of Object.keys(photoEdits)) delete photoEdits[k]
  }

  return {
    isOpen, scope, prompt, isSending, isApplying, error, messages, proposals, selected, usage,
    isDrawing, region, photoEdits,
    canEditPhotos, promptsLeft, editsLeft, applicable, photoProposals,
    open, close, setScope, startDrawing, setRegion, fetchUsage,
    send, toggle, applySelected,
    previewPhotoEdit, editDrawnArea, applyPhotoEdit, discardPhotoEdit, revertPhoto,
    clearConversation,
  }
}
