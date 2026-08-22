import { ref, watch, type Ref, type ComputedRef } from 'vue'
import { type EditorHotspot } from '~/features/editor/mappers'
import { type SceneUploadState } from '~/features/editor/composables/useEditorUpload'
import { isLocalSceneId } from '~/features/editor/composables/useEditorUpload'

type EditorStore = { openModal: () => void; closeModal: () => void }

// v-model.number leaves the ref as '' (not null) when a number input is
// cleared — Vue's own looseToNumber() only coerces strings that parse as a
// valid float and passes anything else through unchanged. A bare `!== null`
// guard would let '' slip into a PATCH/POST body and fail the backend's
// z.number() validation. Treats null/''/NaN alike as "not set".
function positiveNumberOrUndefined(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined
}

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
  /** Called after settings are saved to backend so the caller can apply them to the live viewer */
  onSettingsApplied?: (settings: { hfov: number; yaw: number; pitch: number }) => void,
) {
  const publishing = ref(false)
  const showSettingsPanel = ref(false)
  const settingsDraft = ref({
    // 360 viewer
    hfov: 90,
    yaw: 0,
    pitch: 0,
    autoRotate: false,
    // space info
    title: '',
    description: '',
    locationText: '',
    locationLat: null as number | null,
    locationLng: null as number | null,
    logoUrl: '',
    // contact & lead capture
    phone: '',
    email: '',
    ctaEnabled: false,
    ctaButtonText: 'Book a Viewing',
    ctaAction: 'link' as 'link' | 'email' | 'phone',
    ctaDestination: '',
    // listing facts (VIEWORA_2_PRODUCT_SPEC.md §3.1) — what the buyer-facing
    // detail screen actually reads. land_acres/land_type are deliberately
    // left out here: no public page reads them (view/p/[slug].vue's
    // keyFacts only branches on residential/automotive), and there's no
    // 'land' space_type to gate them on — collecting data nobody displays
    // isn't worth the UI.
    priceKes: null as number | null,
    listingStatus: 'available' as 'available' | 'sold' | 'rented',
    bedrooms: null as number | null,
    bathrooms: null as number | null,
    areaSqm: null as number | null,
    vehicleYear: null as number | null,
    vehicleMileageKm: null as number | null,
    vehicleTransmission: '' as '' | 'manual' | 'automatic',
    vehicleFuelType: '' as '' | 'petrol' | 'diesel' | 'electric' | 'hybrid',
    amenities: [] as string[],
  })
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
        title: space.value?.title ?? '',
        description: space.value?.description ?? '',
        locationText: space.value?.location_text ?? '',
        locationLat: space.value?.location_lat ?? null,
        locationLng: space.value?.location_lng ?? null,
        logoUrl: space.value?.logo_url ?? '',
        phone: space.value?.phone ?? '',
        email: space.value?.email ?? '',
        ctaEnabled: space.value?.cta_enabled ?? false,
        ctaButtonText: space.value?.cta_button_text ?? 'Book a Viewing',
        ctaAction: (space.value?.cta_action as 'link' | 'email' | 'phone') ?? 'link',
        ctaDestination: space.value?.cta_destination ?? '',
        priceKes: space.value?.price_kes ?? null,
        listingStatus: (space.value?.listing_status as 'available' | 'sold' | 'rented') ?? 'available',
        bedrooms: space.value?.bedrooms ?? null,
        bathrooms: space.value?.bathrooms ?? null,
        areaSqm: space.value?.area_sqm ?? null,
        vehicleYear: space.value?.vehicle_year ?? null,
        vehicleMileageKm: space.value?.vehicle_mileage_km ?? null,
        vehicleTransmission: (space.value?.vehicle_transmission as '' | 'manual' | 'automatic') ?? '',
        vehicleFuelType: (space.value?.vehicle_fuel_type as '' | 'petrol' | 'diesel' | 'electric' | 'hybrid') ?? '',
        amenities: [...(space.value?.amenities ?? [])],
      }
      editorStore.openModal()
    } else {
      editorStore.closeModal()
    }
  })

  function validateTourHealth(): { type: 'error' | 'warning'; message: string }[] {
    const issues: { type: 'error' | 'warning'; message: string }[] = []

    if (scenes.value.length === 0) {
      // Photo-only listings (PhotosPanel.vue) have nothing in scenes.value
      // at all — that's correct, not unhealthy. Everything below this block
      // is scene-graph-specific (hotspot links, reachability, dead ends) and
      // doesn't apply when there's no scene graph to begin with.
      const hasCompleteGalleryPhoto = (space.value?.property_media ?? []).some(
        (m: any) => m.media_type === 'gallery_image' && m.processing_status === 'complete'
      )
      if (!hasCompleteGalleryPhoto) {
        issues.push({ type: 'error', message: 'Add at least one 360° scene or photo before publishing.' })
      }
      return issues
    }

    const notReady = scenes.value.filter(s => {
      const state = sceneUploadStateById.value[s.id] || backendSceneStatusToUploadState(s.status)
      return state !== 'ready' && state !== 'failed'
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

      const prevSettings = space.value?.property_360_settings
      const updated = await apiFetch(`/spaces/${spaceId}/publish`, {
        method: 'POST',
        body: {
          publish: !isLive,
          slug: space.value?.slug,
          lead_form_enabled: space.value.lead_form_enabled,
          branding_enabled: space.value.branding_enabled,
        },
      })
      // Publish endpoint returns flat columns — restore property_360_settings from local state
      space.value = { ...updated, property_360_settings: prevSettings }
      if (!isLive) {
        const analytics = useAnalytics()
        analytics.track('tour_published', {
          space_id: spaceId,
          scene_count: scenes.value.length,
        })
        showShareModal.value = true
      } else {
        showToast('Tour unpublished')
      }
    } catch (e: any) {
      showToast(e.data?.statusMessage || 'Publishing failed', 'error')
    } finally {
      publishing.value = false
    }
  }

  async function saveSettings() {
    if (settingsSaving.value) return
    settingsSaving.value = true

    const viewerPatch = {
      hfov_default: settingsDraft.value.hfov,
      yaw_default: settingsDraft.value.yaw,
      pitch_default: settingsDraft.value.pitch,
      auto_rotate_enabled: settingsDraft.value.autoRotate,
    }

    const spacePatch: Record<string, any> = {
      title: settingsDraft.value.title.trim() || space.value?.title,
      description: settingsDraft.value.description || null,
      location_text: settingsDraft.value.locationText || null,
      logo_url: settingsDraft.value.logoUrl || null,
      phone: settingsDraft.value.phone || null,
      email: settingsDraft.value.email || null,
      cta_enabled: settingsDraft.value.ctaEnabled,
      cta_button_text: settingsDraft.value.ctaButtonText || 'Book a Viewing',
      cta_action: settingsDraft.value.ctaAction,
      cta_destination: settingsDraft.value.ctaDestination || null,
      listing_status: settingsDraft.value.listingStatus,
      amenities: settingsDraft.value.amenities,
    }
    if (settingsDraft.value.locationLat !== null) spacePatch.location_lat = settingsDraft.value.locationLat
    if (settingsDraft.value.locationLng !== null) spacePatch.location_lng = settingsDraft.value.locationLng
    const price = positiveNumberOrUndefined(settingsDraft.value.priceKes)
    if (price !== undefined && price > 0) spacePatch.price_kes = price
    const bedrooms = positiveNumberOrUndefined(settingsDraft.value.bedrooms)
    if (bedrooms !== undefined) spacePatch.bedrooms = bedrooms
    const bathrooms = positiveNumberOrUndefined(settingsDraft.value.bathrooms)
    if (bathrooms !== undefined) spacePatch.bathrooms = bathrooms
    const areaSqm = positiveNumberOrUndefined(settingsDraft.value.areaSqm)
    if (areaSqm !== undefined) spacePatch.area_sqm = areaSqm
    const vehicleYear = positiveNumberOrUndefined(settingsDraft.value.vehicleYear)
    if (vehicleYear !== undefined) spacePatch.vehicle_year = vehicleYear
    const vehicleMileageKm = positiveNumberOrUndefined(settingsDraft.value.vehicleMileageKm)
    if (vehicleMileageKm !== undefined) spacePatch.vehicle_mileage_km = vehicleMileageKm
    if (settingsDraft.value.vehicleTransmission) spacePatch.vehicle_transmission = settingsDraft.value.vehicleTransmission
    if (settingsDraft.value.vehicleFuelType) spacePatch.vehicle_fuel_type = settingsDraft.value.vehicleFuelType

    const prevSettings = space.value?.property_360_settings?.[0]
    const prevSpace = { ...space.value }

    if (space.value) {
      space.value = {
        ...space.value,
        ...spacePatch,
        property_360_settings: [{ ...(prevSettings ?? {}), ...viewerPatch }],
      }
    }
    showSettingsPanel.value = false

    try {
      await Promise.all([
        apiFetch(`/spaces/${spaceId}/settings`, { method: 'PATCH', body: viewerPatch }),
        apiFetch(`/spaces/${spaceId}`, { method: 'PATCH', body: spacePatch }),
      ])
      showToast('Settings saved')
      // Apply to the live viewer immediately — no page reload needed
      onSettingsApplied?.({
        hfov: settingsDraft.value.hfov,
        yaw:  settingsDraft.value.yaw,
        pitch: settingsDraft.value.pitch,
      })
    } catch (e: any) {
      if (space.value) space.value = prevSpace
      showToast(e?.data?.statusMessage || 'Failed to save settings', 'error')
    } finally {
      settingsSaving.value = false
    }
  }

  // ── AI-drafted description ────────────────────────────────────────────
  // Grounded strictly in whatever facts are already filled into the draft
  // (price, bed/bath/m² or vehicle specs, amenities) — never sent until the
  // owner has actually typed/selected those, since an empty draft would
  // only give the AI a title to work from. Fills the textarea for review;
  // doesn't save on its own — the owner still hits Save Settings after.
  const generatingDescription = ref(false)
  async function generateDescription() {
    if (generatingDescription.value) return
    generatingDescription.value = true
    const d = settingsDraft.value
    try {
      const result = await apiFetch<{ description: string }>(`/spaces/${spaceId}/generate-description`, {
        method: 'POST',
        body: {
          title: d.title || undefined,
          space_type: space.value?.space_type || undefined,
          location_text: d.locationText || undefined,
          price_kes: positiveNumberOrUndefined(d.priceKes),
          listing_status: d.listingStatus || undefined,
          bedrooms: positiveNumberOrUndefined(d.bedrooms),
          bathrooms: positiveNumberOrUndefined(d.bathrooms),
          area_sqm: positiveNumberOrUndefined(d.areaSqm),
          vehicle_year: positiveNumberOrUndefined(d.vehicleYear),
          vehicle_mileage_km: positiveNumberOrUndefined(d.vehicleMileageKm),
          vehicle_transmission: d.vehicleTransmission || undefined,
          vehicle_fuel_type: d.vehicleFuelType || undefined,
          amenities: d.amenities.length ? d.amenities : undefined,
        },
      })
      settingsDraft.value.description = result.description
    } catch (e: any) {
      showToast(e?.data?.statusMessage || 'Could not generate a description — try again.', 'error')
    } finally {
      generatingDescription.value = false
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
    generatingDescription,
    generateDescription,
  }
}
