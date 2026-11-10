<template>
  <div>
    <!-- A car: one glass top bar (back, name, preview, share, publish) for every step, the same
         bar as the 360° editor, then the steps. No step brings a header of its own. -->
    <TopBar
      v-if="isCar"
      :space-name="carSpace?.title || 'Car'"
      :mode-label="carStepLabel"
      :is-published="Boolean(carSpace?.is_published)"
      :publishing="carPublishing"
      :has-scene="false"
      @preview="previewCar"
      @share="carShareOpen = true"
      @toggle-publish="toggleCarPublish"
    />
    <UiShareModal :space="carShareOpen ? carSpace : null" @close="carShareOpen = false" />

    <div v-if="isCar" class="mode-switch" role="tablist" aria-label="Car steps">
      <button
        v-for="st in carTabs"
        :key="st.tab"
        role="tab"
        :aria-selected="mode === st.tab"
        class="mode-switch__btn mode-switch__btn--step"
        :class="{ 'mode-switch__btn--active': mode === st.tab, 'is-done': st.done }"
        :title="st.status"
        @click="setMode(st.tab)"
      >
        <span class="mode-switch__n" aria-hidden="true">
          <svg v-if="st.done" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17 19 7"/></svg>
          <template v-else>{{ st.n }}</template>
        </span>
        {{ st.title }}<span class="sr-only">{{ st.done ? ', done' : st.optional ? ', optional' : '' }}</span>
      </button>
    </div>

    <!-- Only once we know it is not a car, so a car never flashes the property tabs first. -->
    <div v-else-if="typeKnown" class="mode-switch" role="tablist" aria-label="Editor mode">
      <button
        role="tab"
        :aria-selected="mode === 'tour'"
        class="mode-switch__btn"
        :class="{ 'mode-switch__btn--active': mode === 'tour' }"
        @click="setMode('tour')"
      >360° Tour</button>
      <button
        role="tab"
        :aria-selected="mode === 'photos'"
        class="mode-switch__btn"
        :class="{ 'mode-switch__btn--active': mode === 'photos' }"
        @click="setMode('photos')"
      >Photos</button>
      <button
        role="tab"
        :aria-selected="mode === 'aerial'"
        class="mode-switch__btn"
        :class="{ 'mode-switch__btn--active': mode === 'aerial' }"
        @click="setMode('aerial')"
      >Aerial Map</button>
      <button
        role="tab"
        :aria-selected="mode === 'floorplan'"
        class="mode-switch__btn"
        :class="{ 'mode-switch__btn--active': mode === 'floorplan' }"
        @click="setMode('floorplan')"
      >Floor Plan</button>
      <button
        role="tab"
        :aria-selected="mode === 'organize'"
        class="mode-switch__btn"
        :class="{ 'mode-switch__btn--active': mode === 'organize' }"
        @click="setMode('organize')"
      >Organize</button>
      <button
        role="tab"
        :aria-selected="mode === 'details'"
        class="mode-switch__btn"
        :class="{ 'mode-switch__btn--active': mode === 'details' }"
        @click="setMode('details')"
      >Details</button>
    </div>

    <!-- v-show, not v-if — EditorShell owns a live WebGL canvas + upload
         state; destroying and remounting it on every tab switch would be
         wasteful and would drop in-progress uploads. -->
    <div v-show="mode === 'tour'" class="mode-pane">
      <EditorShell ref="editorShellRef" :space-id="spaceId" :hide-top-bar="isCar || !typeKnown" />
    </div>
    <!-- KeepAlive — mounts (and fetches) once on first visit, then just
         toggles visibility on every switch after. Without it, v-if alone
         destroys and recreates the panel on every tab switch: a fresh
         loading spinner + refetch each time, and (for Details specifically)
         silently discarded unsaved form edits the instant you switched away. -->
    <KeepAlive>
      <PhotosPanel v-if="mode === 'photos'" :space-id="spaceId" />
    </KeepAlive>
    <!-- v-show, not KeepAlive: mounted as soon as we know it is a car, so photos are already loading
         and the editor is on screen the moment the tab is clicked (same as the 360 tab). -->
    <div v-if="isCar" v-show="mode === 'car'" class="mode-pane">
      <VehiclePanel ref="vehiclePanelRef" :space-id="spaceId" />
    </div>
    <KeepAlive>
      <AerialPanel v-if="mode === 'aerial'" :space-id="spaceId" />
    </KeepAlive>
    <KeepAlive>
      <FloorPlanPanel v-if="mode === 'floorplan'" :space-id="spaceId" />
    </KeepAlive>
    <KeepAlive>
      <OrganizePanel v-if="mode === 'organize'" :space-id="spaceId" @categories-changed="onCategoriesChanged" />
    </KeepAlive>
    <KeepAlive>
      <DetailsPanel v-if="mode === 'details'" :space-id="spaceId" @published="editorShellRef?.fetchSpace(true)" />
    </KeepAlive>

    <ClaimBanner />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { definePageMeta, useSeoMeta, useRoute, useRouter } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import EditorShell from '~/features/editor/EditorShell.vue'
import PhotosPanel from '~/features/editor/PhotosPanel.vue'
import DetailsPanel from '~/features/editor/DetailsPanel.vue'
import VehiclePanel from '~/features/editor/VehiclePanel.vue'
import AerialPanel from '~/features/editor/AerialPanel.vue'
import FloorPlanPanel from '~/features/editor/FloorPlanPanel.vue'
import OrganizePanel from '~/features/editor/OrganizePanel.vue'
import { useCarSetup } from '~/features/vehicle/useCarSetup'
import TopBar from '~/features/editor/components/TopBar.vue'
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'editor', middleware: 'auth' })
useSeoMeta({ title: 'Edit Tour | Viewora' })

const route = useRoute()
const router = useRouter()
const spaceId = route.params.id as string

type Mode = 'tour' | 'car' | 'photos' | 'aerial' | 'floorplan' | 'organize' | 'details'
function tabToMode(t: unknown): Mode {
  return t === 'car' || t === 'photos' || t === 'aerial' || t === 'floorplan' || t === 'organize' || t === 'details' ? t : 'tour'
}
const mode = ref<Mode>(tabToMode(route.query.tab))

// Car listings get a Car Exterior tab first, 360° becomes the optional interior, and the
// map/floor-plan/organize tabs (meaningless for one car) are hidden.
const { apiFetch } = useApiFetch()
// ?tab=car is only ever a car (the create page opens a new car there), so its editor is on
// screen from the first frame instead of waiting for the space to load.
const isCar = ref(route.query.tab === 'car')
const typeKnown = ref(isCar.value)
const carSpace = ref<any>(null)
apiFetch<any>(`/spaces/${spaceId}`)
  .then((s) => {
    const sp = s?.data ?? s
    isCar.value = (sp?.space_type ?? sp?.property_type) === 'automotive'
    typeKnown.value = true
    if (isCar.value) carSpace.value = sp
    // New car listings open on the exterior photos, the first thing a car needs.
    if (isCar.value) {
      // Aerial Map, Floor Plan and Organize are hidden for a single car, so a link to one lands on the car tab;
      // so does an old ?tab=360 link (the interior is step 2, the car starts on step 1).
      const t = route.query.tab
      if (!t || t === '360' || t === 'aerial' || t === 'floorplan' || t === 'organize') setMode('car')
    }
  })
  .catch(() => { typeKnown.value = true })

const editorShellRef = ref<InstanceType<typeof EditorShell> | null>(null)

// Car listings: what each step has, refreshed whenever the owner moves between steps
// (each tab saves as it goes, so switching is the natural moment to re-check).
const carSetup = useCarSetup(spaceId)
const CAR_STEP_LABELS: Record<string, string> = { car: 'Exterior', tour: 'Interior', photos: 'Close-ups', details: 'Details' }
const carTabs = computed(() => {
  const byTab = new Map(carSetup.steps.value.filter(s => s.key !== 'publish').map(s => [s.tab, s]))
  const labels: Record<string, string> = CAR_STEP_LABELS
  return (['car', 'tour', 'photos', 'details'] as const).map((tab, i) => {
    const st = byTab.get(tab)!
    const publish = carSetup.steps.value.find(s => s.key === 'publish')
    const done = tab === 'details' ? !!(st?.done && publish?.done) : !!st?.done
    return { tab, n: i + 1, title: labels[tab], done, optional: !!st?.optional, status: st?.status ?? '' }
  })
})
const carTourUrl = computed(() => carSetup.tourUrl.value)
const carStepLabel = computed(() => CAR_STEP_LABELS[mode.value] ?? 'Exterior')

// ── The car's top bar: preview, share and publish, the same on every step ──
const vehiclePanelRef = ref<InstanceType<typeof VehiclePanel> | null>(null)
const carShareOpen = ref(false)
const carPublishing = ref(false)

/** Live car: its tour in a new tab. Not live yet: the buyer's view of the spin, here. */
function previewCar() {
  if (carTourUrl.value) { window.open(carTourUrl.value, '_blank', 'noopener'); return }
  if (mode.value !== 'car') setMode('car')
  vehiclePanelRef.value?.showBuyerView()
}

async function toggleCarPublish() {
  const sp = carSpace.value
  if (carPublishing.value || !sp) return
  const live = !!sp.is_published
  // A car tour starts with its outside: send them back to step 1 rather than publish an empty tour.
  const exterior = carSetup.steps.value.find(st => st.key === 'car')
  if (!live && carSetup.setup.value && exterior && !exterior.done) {
    toast.error(exterior.status ? `Exterior: ${exterior.status}` : 'Add the outside of the car first.')
    setMode('car')
    return
  }
  carPublishing.value = true
  try {
    const updated = await apiFetch<any>(`/spaces/${spaceId}/publish`, {
      method: 'POST',
      body: { publish: !live, slug: sp.slug, lead_form_enabled: sp.lead_form_enabled, branding_enabled: sp.branding_enabled },
    })
    carSpace.value = { ...sp, ...(updated ?? {}) }
    if (!live) {
      useAnalytics().track('tour_published', { space_id: spaceId, space_type: 'automotive' })
      carShareOpen.value = true
    } else {
      toast('Unpublished. Buyers can no longer open it.')
    }
    carSetup.refresh()
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Could not publish. Check your connection and try again.')
  } finally {
    carPublishing.value = false
  }
}
watch([isCar, mode], ([car]) => { if (car) carSetup.refresh() })

function setMode(next: Mode) {
  // The Details form (title, etc.) and EditorShell's own space/title state
  // are two independent fetches — leaving Details without this would show
  // TopBar's pill with a stale title until a full reload.
  const leavingDetails = mode.value === 'details' && next !== 'details'
  mode.value = next
  router.replace({ query: { ...route.query, tab: next } })
  if (leavingDetails) {
    editorShellRef.value?.fetchSpace(true)
    if (isCar.value) apiFetch<any>(`/spaces/${spaceId}`).then((s) => { carSpace.value = { ...carSpace.value, ...(s?.data ?? s) } }).catch(() => {})
  }
}

// The 360° Tour tab stays mounted with its own copy of the scenes (dock
// folders, the rename popover's category) — bring it in line after a bulk
// category change instead of refetching everything.
function onCategoriesChanged({ sceneIds, groupName }: { sceneIds: string[]; groupName: string | null }) {
  const shell = editorShellRef.value as any
  if (!shell || !Array.isArray(shell.scenes)) return
  const hit = new Set(sceneIds)
  shell.scenes = shell.scenes.map((s: any) => (hit.has(s?.id) ? { ...s, group_name: groupName } : s))
}

// Lets a child panel's own "Next"/"Skip" links (plain NuxtLinks to
// ?tab=...) drive the same tab switch as clicking the pills above, instead
// of every panel needing setMode threaded down as a prop/emit.
watch(() => route.query.tab, (t) => {
  const next = tabToMode(t)
  if (next !== mode.value) setMode(next)
})
</script>

<style scoped>
.mode-switch {
  /* TopBar.vue sits at top-5 (20px) + h-12 (48px) on desktop, so its own
     bottom edge is at 68px — this bar's old top:64px overlapped it by 4px
     instead of leaving a real gap. */
  position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 29;
  display: flex; gap: 2px; padding: 3px; border-radius: 12px;
  background: rgba(20, 20, 24, 0.7); border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(16px);
}
.mode-switch__btn {
  height: 30px; padding: 0 14px; border-radius: 9px; border: none; background: transparent;
  color: rgba(255,255,255,0.45); font-size: 12px; font-weight: 700; cursor: pointer;
  white-space: nowrap;
  transition: background 140ms, color 140ms;
}
.mode-switch__btn:hover { color: rgba(255,255,255,0.75); }
.mode-switch__btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.mode-switch__btn--active { background: rgba(255,255,255,0.12); color: #fff; }
.mode-switch__btn--step { display: inline-flex; align-items: center; gap: 6px; }
.mode-switch__n {
  width: 18px; height: 18px; border-radius: 50%; display: inline-grid; place-items: center; flex: none;
  font-size: 10px; font-weight: 800; border: 1.5px solid currentColor;
}
.mode-switch__btn.is-done .mode-switch__n { background: #3ccf7a; border-color: #3ccf7a; color: #06210f; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.mode-pane { width: 100%; height: 100%; }

@media (max-width: 640px) {
  .mode-switch { top: 58px; max-width: calc(100vw - 24px); overflow-x: auto; scrollbar-width: none; }
  .mode-switch__btn { padding: 0 10px; font-size: 11px; }
}
/* Six tabs on the smallest phones: tighten, and scroll rather than clip. */
@media (max-width: 360px) {
  .mode-switch { overflow-x: auto; scrollbar-width: none; }
  .mode-switch__btn { padding: 0 8px; }
}
</style>
