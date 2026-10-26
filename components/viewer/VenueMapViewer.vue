<template>
  <div class="vmv" role="dialog" aria-label="Venue map">
    <VenueCanvas
      v-if="floor"
      ref="canvasRef"
      :key="floor.id"
      :image-url="floor.imageUrl"
      :width="floor.width"
      :height="floor.height"
      :places="floor.venue.places"
      :route-points="legOnFloor?.points"
      :start-point="startOnFloor"
      :markers="markers"
      :connectors="connectorsOnFloor"
      :dim-others="!!route || !!selected"
      :insets="insets"
      @place-click="onPlaceClick"
      @connector-click="showFloor"
      @map-click="onMapClick"
    />

    <!-- ── Search / directions panel ── -->
    <div ref="panelEl" class="vmv-panel" :class="{ 'vmv-panel--open': panelOpen }">
      <template v-if="mode === 'browse'">
        <div class="vmv-search">
          <button v-if="closable" type="button" class="vmv-icon-btn" aria-label="Back to the 360 tour" title="Back to the 360 tour" @click="emit('close')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <svg v-else class="vmv-search__glass" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input
            ref="searchEl"
            v-model="query"
            class="vmv-search__input"
            type="search"
            :placeholder="`Search ${places.length} places`"
            aria-label="Search shops and places"
            @focus="searchFocused = true"
            @keydown.enter="results[0] && pick(results[0])"
            @keydown.esc="clearSearch"
          />
          <button v-if="query || category" type="button" class="vmv-icon-btn" aria-label="Clear search" @click="clearSearch">×</button>
          <button v-else type="button" class="vmv-icon-btn vmv-icon-btn--route" aria-label="Directions" title="Directions" @click="startDirections()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l10 10-10 10L2 12z"/><path d="M9 13v-2a1 1 0 0 1 1-1h5"/><path d="M13 8l2 2-2 2"/></svg>
          </button>
        </div>

        <div v-if="categories.length > 1" class="vmv-chips" role="list">
          <button
            v-for="c in categories" :key="c.name"
            type="button" role="listitem"
            class="vmv-chip" :class="{ 'vmv-chip--on': c.name === category }"
            @click="toggleCategory(c.name)"
          >{{ c.name }}<small>{{ c.count }}</small></button>
        </div>

        <ul v-if="showResults" class="vmv-results">
          <li v-for="p in results" :key="`${p.floorId}:${p.id}`">
            <button type="button" @click="pick(p)">
              <span class="vmv-results__logo" :style="logoStyle(p)">{{ p.logo ? '' : initials(p.name) }}</span>
              <span class="vmv-results__text">
                <b>{{ p.name }}</b>
                <small>{{ [p.category, p.floorName].filter(Boolean).join(' · ') }}</small>
              </span>
            </button>
          </li>
          <li v-if="!results.length" class="vmv-results__empty">No places match "{{ query }}"</li>
        </ul>
      </template>

      <template v-else>
        <div class="vmv-dir">
          <button type="button" class="vmv-icon-btn" aria-label="Close directions" @click="exitDirections">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div class="vmv-dir__fields">
            <label class="vmv-field">
              <i class="vmv-field__dot vmv-field__dot--from" />
              <input
                ref="fromEl"
                :value="editing === 'from' ? fieldQuery : (fromPlace?.name ?? '')"
                placeholder="Where are you? (choose a shop near you)"
                aria-label="Starting point"
                @focus="editField('from')"
                @input="fieldQuery = ($event.target as HTMLInputElement).value"
                @keydown.enter="fieldResults[0] && setField(fieldResults[0])"
                @keydown.esc="editing = null"
              />
            </label>
            <label class="vmv-field">
              <i class="vmv-field__dot vmv-field__dot--to" />
              <input
                ref="toEl"
                :value="editing === 'to' ? fieldQuery : (toPlace?.name ?? '')"
                placeholder="Where to?"
                aria-label="Destination"
                @focus="editField('to')"
                @input="fieldQuery = ($event.target as HTMLInputElement).value"
                @keydown.enter="fieldResults[0] && setField(fieldResults[0])"
                @keydown.esc="editing = null"
              />
            </label>
          </div>
          <button type="button" class="vmv-icon-btn" aria-label="Swap start and destination" title="Swap" @click="swap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/></svg>
          </button>
        </div>

        <div class="vmv-opts">
          <button type="button" class="vmv-chip" :class="{ 'vmv-chip--on': stepFree }" :aria-pressed="stepFree" @click="stepFree = !stepFree">
            <span aria-hidden="true">♿</span> Step-free
          </button>
          <button v-if="route" type="button" class="vmv-chip" @click="share">{{ copied ? 'Link copied' : 'Share route' }}</button>
        </div>

        <ul v-if="editing" class="vmv-results">
          <li v-if="editing === 'from' && herePlace && !fieldQuery">
            <button type="button" @click="setField(herePlace)">
              <span class="vmv-results__logo vmv-results__logo--here">◎</span>
              <span class="vmv-results__text"><b>Where I am in the 360° tour</b><small>{{ herePlace.floorName }}</small></span>
            </button>
          </li>
          <li v-for="p in fieldResults" :key="`${p.floorId}:${p.id}`">
            <button type="button" @click="setField(p)">
              <span class="vmv-results__logo" :style="logoStyle(p)">{{ p.logo ? '' : initials(p.name) }}</span>
              <span class="vmv-results__text">
                <b>{{ p.name }}</b>
                <small>{{ [p.category, p.floorName].filter(Boolean).join(' · ') }}</small>
              </span>
            </button>
          </li>
          <li v-if="fieldQuery && !fieldResults.length" class="vmv-results__empty">No places match "{{ fieldQuery }}"</li>
          <li v-if="!fieldQuery" class="vmv-results__hint">Type a shop name, or tap a place on the map</li>
        </ul>

        <template v-else-if="route">
          <button type="button" class="vmv-summary" :class="{ 'vmv-summary--closed': !stepsOpen }" :aria-expanded="stepsOpen" @click="stepsOpen = !stepsOpen">
            <span>
              <b>{{ route.legs.length > 1 ? `${route.legs.length} floors` : 'Same floor' }}</b>
              <template v-if="route.legs.length > 1"> · via {{ viaText }}</template>
            </span>
            <span class="vmv-summary__toggle">{{ stepsOpen ? 'Hide steps' : 'Steps' }}</span>
          </button>
          <ol v-show="stepsOpen" class="vmv-steps">
            <li
              v-for="(st, i) in stepItems" :key="i"
              :class="{ 'vmv-steps--floor': st.floorId, 'vmv-steps--on': st.floorId === floor?.id }"
              @click="st.floorId && showFloor(st.floorId)"
            >
              <span class="vmv-steps__icon">{{ st.icon }}</span>
              <span>{{ st.text }}</span>
            </li>
          </ol>
          <button v-if="walkScenes.length" type="button" class="vmv-cta vmv-cta--walk" @click="walkIn360">
            <span aria-hidden="true">360°</span> Walk this route in 360°
          </button>
        </template>
        <p v-else-if="fromPlace && toPlace" class="vmv-note">
          {{ stepFree ? 'No step-free route between these places. Try without "Step-free".' : 'No route between these places on the map yet.' }}
        </p>
      </template>
    </div>

    <!-- ── Floor switcher ── -->
    <div v-if="floors.length > 1" class="vmv-floors" :class="{ 'vmv-floors--under-card': mode === 'browse' && !!selected }" role="tablist" aria-label="Floors">
      <button
        v-for="f in floorsTopDown" :key="f.id"
        type="button" role="tab"
        :aria-selected="f.id === floor?.id"
        :title="f.name"
        class="vmv-floor" :class="{ 'vmv-floor--on': f.id === floor?.id, 'vmv-floor--route': routeFloorIds.has(f.id) }"
        @click="showFloor(f.id)"
      >{{ shortFloor(f.name) }}</button>
    </div>
    <div class="vmv-floor-name" aria-live="polite">{{ floor?.name }}</div>

    <!-- ── Multi-floor route: step through the floors ── -->
    <div v-if="route && route.legs.length > 1 && !editing" class="vmv-legnav">
      <button type="button" :disabled="legIndex <= 0" aria-label="Previous floor" @click="goLeg(legIndex - 1)">‹</button>
      <span>{{ legIndex >= 0 ? `${legIndex + 1} of ${route.legs.length}` : '' }} · {{ floor?.name }}</span>
      <button type="button" class="vmv-legnav__next" :disabled="legIndex >= route.legs.length - 1" @click="goLeg(legIndex + 1)">
        {{ legIndex < route.legs.length - 1 ? `Next: ${floorName(route.legs[legIndex + 1]?.floorId)}` : 'Arrived' }} ›
      </button>
    </div>

    <!-- ── Selected place ── -->
    <Transition name="vmv-card">
      <div v-if="mode === 'browse' && selected" class="vmv-card">
        <button type="button" class="vmv-card__x" aria-label="Close" @click="selectedKey = null">×</button>
        <div class="vmv-card__head">
          <span class="vmv-card__logo" :style="logoStyle(selected)">{{ selected.logo ? '' : initials(selected.name) }}</span>
          <div>
            <p class="vmv-card__title">{{ selected.name }}</p>
            <p class="vmv-card__meta">{{ [selected.category, selected.floorName].filter(Boolean).join(' · ') }}</p>
          </div>
        </div>
        <p v-if="selected.text" class="vmv-card__text">{{ selected.text }}</p>
        <div class="vmv-card__actions">
          <button type="button" class="vmv-cta" @click="startDirections(selected)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l10 10-10 10L2 12z"/><path d="M9 13v-2a1 1 0 0 1 1-1h5"/><path d="M13 8l2 2-2 2"/></svg>
            Directions
          </button>
          <button type="button" class="vmv-cta vmv-cta--ghost" @click="startFrom(selected)">I'm here</button>
          <button v-if="selected.scene_id && sceneIds.has(selected.scene_id)" type="button" class="vmv-cta vmv-cta--ghost" @click="emit('open-scene', selected.scene_id!)">360°</button>
          <a v-if="selected.url" :href="selected.url" target="_blank" rel="noopener noreferrer" class="vmv-cta vmv-cta--ghost">Website ↗</a>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import VenueCanvas, { type VenueCanvasConnector, type VenueCanvasMarker } from '~/features/venue/VenueCanvas.vue'
import {
  allPlaces, buildVenueGraph, findRoute, scenesAlongRoute, searchPlaces, splitCategories, venueCategories,
  type VenueFloor, type VenuePlaceRef, type VenueLinkKind,
} from '~/shared/utils/venue'

const props = withDefaults(defineProps<{
  floors: VenueFloor[]
  closable?: boolean
  /** Raw tour scenes (with floor-plan pins): "walk it in 360" and "where I am". */
  scenes?: any[]
  /** The 360 view the visitor came from. */
  activeSceneId?: string | null
  /** Open with a route / place (from a shared link). */
  initialTo?: string | null
  initialFrom?: string | null
}>(), { closable: true, scenes: () => [], activeSceneId: null, initialTo: null, initialFrom: null })

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-scene', sceneId: string): void
  (e: 'track', event: string, props?: Record<string, unknown>): void
}>()

const canvasRef = ref<InstanceType<typeof VenueCanvas> | null>(null)
const places = computed(() => allPlaces(props.floors))
const graph = computed(() => buildVenueGraph(props.floors))
const categories = computed(() => venueCategories(places.value).slice(0, 24))
const sceneIds = computed(() => new Set((props.scenes ?? []).map((s: any) => s?.id).filter(Boolean)))
const keyOf = (p: { floorId: string; id: string }) => `${p.floorId}:${p.id}`
const placeByKey = computed(() => new Map(places.value.map(p => [keyOf(p), p])))
/** Place ids are unique per floor; a bare id (shared link) resolves to the first match. */
function findPlace(ref: string | null): VenuePlaceRef | null {
  if (!ref) return null
  if (ref === HERE_ID) return herePlace.value
  return placeByKey.value.get(ref) ?? places.value.find(p => p.id === ref) ?? null
}

// ── "Where I am in the 360 tour": the active scene's floor-plan pin ──
const HERE_ID = '__here'
const herePlace = computed<VenuePlaceRef | null>(() => {
  const sc = (props.scenes ?? []).find((s: any) => s?.id === props.activeSceneId)
  const f = sc && props.floors.find(fl => fl.id === sc.floor_plan_id)
  if (!f || typeof sc.plan_x !== 'number' || typeof sc.plan_y !== 'number') return null
  return { id: HERE_ID, name: 'Your 360° view', x: sc.plan_x, y: sc.plan_y, floorId: f.id, floorName: f.name }
})

// ── Floors ──
const currentFloorId = ref<string | null>(herePlace.value?.floorId ?? props.floors.find(f => /ground/i.test(f.name) && !/lower|upper/i.test(f.name))?.id ?? props.floors[0]?.id ?? null)
const floor = computed(() => props.floors.find(f => f.id === currentFloorId.value) ?? props.floors[0] ?? null)
const floorsTopDown = computed(() => [...props.floors].reverse())
const floorName = (id?: string) => props.floors.find(f => f.id === id)?.name ?? ''

function shortFloor(name: string): string {
  const n = name.toLowerCase()
  const words: Record<string, string> = { first: '1', second: '2', third: '3', fourth: '4', fifth: '5', sixth: '6', seventh: '7', eighth: '8', ninth: '9', tenth: '10' }
  if (/lower\s*ground/.test(n)) return 'LG'
  if (/upper\s*ground/.test(n)) return 'UG'
  if (/basement/.test(n)) return `B${n.match(/\d+/)?.[0] ?? ''}`
  if (/ground/.test(n)) return 'G'
  if (/mezz/.test(n)) return 'M'
  if (/roof/.test(n)) return 'R'
  for (const [w, d] of Object.entries(words)) if (n.includes(w)) return d
  const num = n.match(/-?\d+/)?.[0]
  return num ?? name.slice(0, 3)
}

function showFloor(id: string) {
  if (!props.floors.some(f => f.id === id)) return
  currentFloorId.value = id
  void nextTick(() => canvasRef.value?.whenLoaded(() => focusCurrent()))
}

// ── Browse: search + categories ──
const mode = ref<'browse' | 'directions'>('browse')
const query = ref('')
const category = ref<string | null>(null)
const searchFocused = ref(false)
const searchEl = ref<HTMLInputElement | null>(null)
const results = computed(() => {
  if (query.value.trim()) return searchPlaces(category.value ? places.value.filter(p => splitCategories(p.category).includes(category.value!)) : places.value, query.value)
  if (category.value) return places.value.filter(p => splitCategories(p.category).includes(category.value!)).sort((a, b) => a.name.localeCompare(b.name))
  return []
})
const showResults = computed(() => !!query.value.trim() || !!category.value)
const panelOpen = computed(() => showResults.value || mode.value === 'directions')

function toggleCategory(name: string) { category.value = category.value === name ? null : name }
function clearSearch() { query.value = ''; category.value = null; searchEl.value?.blur() }

const selectedKey = ref<string | null>(null)
const selected = computed(() => (selectedKey.value ? placeByKey.value.get(selectedKey.value) ?? null : null))

function pick(p: VenuePlaceRef) {
  selectedKey.value = keyOf(p)
  query.value = ''
  category.value = null
  searchEl.value?.blur()
  emit('track', 'venue_place_opened', { place: p.name })
  if (p.floorId !== currentFloorId.value) currentFloorId.value = p.floorId
  void nextTick(() => canvasRef.value?.whenLoaded(() => canvasRef.value?.focusPoints([p], 3)))
}

function onPlaceClick(id: string) {
  const p = floor.value && placeByKey.value.get(`${floor.value.id}:${id}`)
  if (!p) return
  if (mode.value === 'directions') {
    // Tapping the map fills whichever field is being edited, else the empty one.
    const target = editing.value ?? (!fromKey.value ? 'from' : 'to')
    editing.value = target
    setField(p)
    return
  }
  pick(p)
}
function onMapClick() {
  if (mode.value === 'browse') selectedKey.value = null
  editing.value = null
}

// ── Directions ──
const fromKey = ref<string | null>(null)
const toKey = ref<string | null>(null)
const stepFree = ref(false)
const editing = ref<'from' | 'to' | null>(null)
const fieldQuery = ref('')
const fromEl = ref<HTMLInputElement | null>(null)
const toEl = ref<HTMLInputElement | null>(null)
const copied = ref(false)

const fromPlace = computed(() => findPlace(fromKey.value))
const toPlace = computed(() => findPlace(toKey.value))
const fieldResults = computed(() => searchPlaces(places.value, fieldQuery.value, 20))

function startDirections(to?: VenuePlaceRef) {
  mode.value = 'directions'
  if (to) toKey.value = keyOf(to)
  if (!fromKey.value && herePlace.value && herePlace.value.id !== to?.id) fromKey.value = HERE_ID
  emit('track', 'venue_directions_started', { to: to?.name })
  void nextTick(() => {
    if (!fromKey.value) { editing.value = 'from'; fromEl.value?.focus() }
    else if (!toKey.value) { editing.value = 'to'; toEl.value?.focus() }
  })
}
function startFrom(p: VenuePlaceRef) {
  mode.value = 'directions'
  fromKey.value = keyOf(p)
  toKey.value = null
  void nextTick(() => { editing.value = 'to'; toEl.value?.focus() })
}
function exitDirections() {
  mode.value = 'browse'
  editing.value = null
  selectedKey.value = toKey.value && toKey.value !== HERE_ID ? toKey.value : null
}
function editField(which: 'from' | 'to') { editing.value = which; fieldQuery.value = '' }
function setField(p: VenuePlaceRef) {
  const key = p.id === HERE_ID ? HERE_ID : keyOf(p)
  if (editing.value === 'from') fromKey.value = key
  else toKey.value = key
  editing.value = null
  fieldQuery.value = ''
  ;(document.activeElement as HTMLElement | null)?.blur?.()
  void nextTick(() => {
    if (!fromKey.value) { editing.value = 'from'; fromEl.value?.focus() }
    else if (!toKey.value) { editing.value = 'to'; toEl.value?.focus() }
  })
}
function swap() { [fromKey.value, toKey.value] = [toKey.value, fromKey.value] }

const route = computed(() => {
  if (mode.value !== 'directions' || !fromPlace.value || !toPlace.value) return null
  if (keyOf(fromPlace.value) === keyOf(toPlace.value)) return null
  return findRoute(graph.value, fromPlace.value, toPlace.value, { stepFree: stepFree.value })
})
const routeFloorIds = computed(() => new Set(route.value?.legs.map(l => l.floorId) ?? []))
const legIndex = computed(() => route.value?.legs.findIndex(l => l.floorId === floor.value?.id) ?? -1)
const legOnFloor = computed(() => (legIndex.value >= 0 ? route.value!.legs[legIndex.value] : null))
const startOnFloor = computed(() => {
  if (route.value) {
    const first = route.value.legs[legIndex.value]
    return first?.points[0] ?? null
  }
  return null
})

const KIND_ICON: Record<VenueLinkKind | 'any', string> = { lift: '⇅', escalator: '⤴', stairs: '⌸', ramp: '⟋', any: '⇅' }
const kindName = (k: VenueLinkKind | null) => (k ? ({ lift: 'lift', escalator: 'escalator', stairs: 'stairs', ramp: 'ramp' } as const)[k] : 'lift / escalator')
const viaText = computed(() => {
  const kinds = [...new Set(route.value?.legs.filter(l => l.connector).map(l => kindName(l.connector!.kind)) ?? [])]
  return kinds.join(' & ')
})

const connectorsOnFloor = computed<VenueCanvasConnector[]>(() => {
  const leg = legOnFloor.value
  if (!leg?.connector) return []
  const end = leg.points[leg.points.length - 1]
  const up = (props.floors.find(f => f.id === leg.connector!.toFloorId)?.order ?? 0) > (floor.value?.order ?? 0)
  return [{ x: end.x, y: end.y, toFloorId: leg.connector.toFloorId, icon: KIND_ICON[leg.connector.kind ?? 'any'], label: `${kindName(leg.connector.kind)} ${up ? 'up' : 'down'} to ${shortFloor(floorName(leg.connector.toFloorId))} ›` }]
})

const markers = computed<VenueCanvasMarker[]>(() => {
  const out: VenueCanvasMarker[] = []
  if (mode.value === 'directions') {
    const t = toPlace.value
    if (t && t.floorId === floor.value?.id) out.push({ id: 'to', x: t.x, y: t.y, label: t.name, tone: 'to' })
    const f = fromPlace.value
    if (f && f.floorId === floor.value?.id && !route.value) out.push({ id: 'from', x: f.x, y: f.y, label: f.name, tone: 'sel' })
  } else if (selected.value && selected.value.floorId === floor.value?.id) {
    out.push({ id: 'sel', x: selected.value.x, y: selected.value.y, label: selected.value.name, tone: 'sel' })
  }
  return out
})

const stepItems = computed(() => {
  const r = route.value
  if (!r) return []
  const items: Array<{ text: string; icon: string; floorId?: string }> = []
  items.push({ text: `Start at ${r.from.name}`, icon: '●', floorId: r.legs[0].floorId })
  r.legs.forEach((leg, i) => {
    if (!leg.connector) return
    const to = leg.connector.toFloorId
    const up = (props.floors.find(f => f.id === to)?.order ?? 0) > (props.floors.find(f => f.id === leg.floorId)?.order ?? 0)
    items.push({ text: `Walk to the ${kindName(leg.connector.kind)}`, icon: '↗' })
    items.push({ text: `Take the ${kindName(leg.connector.kind)} ${up ? 'up' : 'down'} to ${floorName(to)}`, icon: KIND_ICON[leg.connector.kind ?? 'any'], floorId: r.legs[i + 1]?.floorId })
  })
  items.push({ text: `Arrive at ${r.to.name}`, icon: '⚑', floorId: r.legs[r.legs.length - 1].floorId })
  return items
})

/** Frame what matters on this floor: the route leg, else the selected place. */
function focusCurrent() {
  const leg = legOnFloor.value
  if (leg) { canvasRef.value?.focusPoints(leg.points, 3); return }
  const m = markers.value[0]
  if (m) canvasRef.value?.focusPoints([m], 3)
}

function goLeg(i: number) {
  const leg = route.value?.legs[i]
  if (leg) showFloor(leg.floorId)
}

// New route → open it on its first floor, drawn and framed.
watch(() => route.value && `${keyOf(route.value.from)}>${keyOf(route.value.to)}|${stepFree.value}`, (k) => {
  if (!k || !route.value) return
  emit('track', 'venue_route_shown', { from: route.value.from.name, to: route.value.to.name, floors: route.value.legs.length, step_free: stepFree.value })
  const first = route.value.legs[0].floorId
  if (first !== currentFloorId.value) showFloor(first)
  else void nextTick(() => canvasRef.value?.whenLoaded(() => focusCurrent()))
})

// ── 360 along the route ──
const walkScenes = computed(() => (route.value ? scenesAlongRoute(route.value, props.scenes) : []))
function walkIn360() {
  const first = walkScenes.value[0]
  if (!first) return
  emit('track', 'venue_route_walk_360', { scenes: walkScenes.value.length })
  emit('open-scene', first.sceneId)
}

// ── Share: a link that opens this route ──
async function share() {
  if (!route.value || typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('to', route.value.to.id)
  if (route.value.from.id !== HERE_ID) url.searchParams.set('from', route.value.from.id)
  else url.searchParams.delete('from')
  const link = url.toString()
  try {
    if (navigator.share && window.matchMedia?.('(pointer: coarse)').matches) await navigator.share({ title: `Directions to ${route.value.to.name}`, url: link })
    else { await navigator.clipboard.writeText(link); copied.value = true; setTimeout(() => { copied.value = false }, 2000) }
  } catch { /* cancelled */ }
}

// ── Small helpers ──
function initials(name: string) {
  return name.split(/\s+/).filter(w => /[a-z0-9]/i.test(w)).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
}
const PALETTE = ['#1d4ed8', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#047857', '#4338ca', '#a16207']
function logoStyle(p: VenuePlaceRef) {
  if (p.logo) return { backgroundImage: `url('${p.logo.replace(/'/g, '%27')}')` }
  let h = 0
  for (const ch of p.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return { background: PALETTE[h % PALETTE.length] }
}

// Phones: the panel sits over the top of the map, so routes are framed below
// it; the step list starts folded to keep the route in view.
const panelEl = ref<HTMLElement | null>(null)
const panelH = ref(0)
const narrow = ref(false)
const stepsOpen = ref(true)
let panelRo: ResizeObserver | null = null
onBeforeUnmount(() => panelRo?.disconnect())
const insets = computed(() => (narrow.value
  ? { top: panelH.value + 16, left: 0, right: 56, bottom: 64 }
  : { top: 0, left: panelOpen.value ? 400 : 0, right: 64, bottom: 64 }))

onMounted(() => {
  narrow.value = window.matchMedia?.('(max-width: 640px)').matches ?? false
  if (narrow.value) stepsOpen.value = false
  if (typeof ResizeObserver !== 'undefined' && panelEl.value) {
    panelRo = new ResizeObserver(() => { panelH.value = panelEl.value?.offsetHeight ?? 0 })
    panelRo.observe(panelEl.value)
  }
  const to = findPlace(props.initialTo)
  const from = findPlace(props.initialFrom)
  if (to && from) { fromKey.value = keyOf(from); toKey.value = keyOf(to); mode.value = 'directions' }
  else if (to) pick(to)
})
</script>

<style scoped>
.vmv { position: absolute; inset: 0; z-index: 70; background: #f3f4f6; color: #111827; font-family: inherit; }

.vmv-panel { position: absolute; z-index: 5; top: calc(12px + env(safe-area-inset-top, 0px)); left: calc(12px + env(safe-area-inset-left, 0px)); width: 376px; max-width: calc(100% - 24px); max-height: calc(100% - 24px); display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
.vmv-panel > * { pointer-events: auto; }

.vmv-search, .vmv-dir { display: flex; align-items: center; gap: 4px; padding: 4px; border-radius: 16px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08); }
.vmv-search__glass { margin: 0 6px 0 10px; color: #6b7280; flex-shrink: 0; }
.vmv-search__input { flex: 1; min-width: 0; height: 44px; border: 0; outline: 0; background: transparent; font-size: 15px; color: #111827; }
.vmv-search__input::-webkit-search-cancel-button { display: none; }
.vmv-icon-btn { flex-shrink: 0; display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 12px; background: transparent; color: #374151; font-size: 22px; cursor: pointer; }
.vmv-icon-btn:hover { background: #f3f4f6; }
.vmv-icon-btn--route { color: #fff; background: #1d4ed8; width: 40px; height: 40px; margin-right: 2px; }
.vmv-icon-btn--route:hover { background: #1e40af; }

.vmv-chips, .vmv-opts { display: flex; gap: 6px; overflow-x: auto; padding: 2px 2px 4px; scrollbar-width: none; }
.vmv-chips::-webkit-scrollbar { display: none; }
.vmv-chip { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 13px; border: 1px solid #e5e7eb; border-radius: 999px; background: #fff; color: #1f2937; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.08); white-space: nowrap; }
.vmv-chip small { color: #6b7280; font-weight: 600; }
.vmv-chip--on { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.vmv-chip--on small { color: rgba(255,255,255,0.75); }

.vmv-results { margin: 0; padding: 6px; list-style: none; overflow-y: auto; border-radius: 16px; background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: min(60vh, 520px); }
.vmv-results button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 8px; border: 0; border-radius: 10px; background: transparent; text-align: left; cursor: pointer; }
.vmv-results button:hover { background: #f3f4f6; }
.vmv-results__logo { flex-shrink: 0; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background-size: cover; background-position: center; color: #fff; font-size: 13px; font-weight: 800; }
.vmv-results__logo--here { background: #dbeafe; color: #1d4ed8; font-size: 20px; }
.vmv-results__text { min-width: 0; display: flex; flex-direction: column; }
.vmv-results__text b { font-size: 14px; font-weight: 700; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vmv-results__text small { font-size: 12px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vmv-results__empty, .vmv-results__hint { padding: 14px 10px; font-size: 13px; color: #6b7280; }

.vmv-dir { align-items: stretch; }
.vmv-dir > .vmv-icon-btn { align-self: center; }
.vmv-dir__fields { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; padding: 4px 0; }
.vmv-field { display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 10px; border-radius: 10px; background: #f3f4f6; }
.vmv-field input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 14px; color: #111827; }
.vmv-field:focus-within { background: #fff; box-shadow: inset 0 0 0 2px #1d4ed8; }
.vmv-field__dot { flex-shrink: 0; width: 12px; height: 12px; border-radius: 50%; }
.vmv-field__dot--from { background: #2563eb; box-shadow: 0 0 0 3px #dbeafe; }
.vmv-field__dot--to { background: #e11d48; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); }

.vmv-summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; padding: 10px 14px; border: 0; border-radius: 14px 14px 0 0; background: #fff; font-size: 14px; color: #374151; text-align: left; box-shadow: 0 8px 24px rgba(0,0,0,0.1); margin-bottom: -8px; cursor: pointer; }
.vmv-summary--closed { border-radius: 14px; margin-bottom: 0; }
.vmv-summary__toggle { flex-shrink: 0; font-size: 12px; font-weight: 700; color: #1d4ed8; }
.vmv-summary b { color: #111827; }
.vmv-steps { margin: 0; padding: 4px 8px 10px; list-style: none; overflow-y: auto; background: #fff; border-radius: 0 0 14px 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); max-height: min(46vh, 420px); }
.vmv-steps li { display: flex; align-items: center; gap: 12px; padding: 9px 6px; border-radius: 10px; font-size: 14px; color: #1f2937; }
.vmv-steps--floor { cursor: pointer; }
.vmv-steps--floor:hover { background: #f3f4f6; }
.vmv-steps--on { font-weight: 700; }
.vmv-steps__icon { flex-shrink: 0; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: #fee2e2; color: #be123c; font-size: 13px; }
.vmv-note { margin: 0; padding: 12px 14px; border-radius: 14px; background: #fff; font-size: 13px; color: #6b7280; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }

.vmv-cta { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; padding: 0 16px; border: 0; border-radius: 999px; background: #1d4ed8; color: #fff; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; white-space: nowrap; }
.vmv-cta:hover { background: #1e40af; }
.vmv-cta--ghost { background: #eff6ff; color: #1d4ed8; }
.vmv-cta--ghost:hover { background: #dbeafe; }
.vmv-cta--walk { width: 100%; height: 46px; border-radius: 14px; background: #111827; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.vmv-cta--walk span { padding: 2px 6px; border-radius: 6px; background: #e11d48; font-size: 11px; }
.vmv-cta--walk:hover { background: #1f2937; }

.vmv-floors { position: absolute; z-index: 4; right: calc(14px + env(safe-area-inset-right, 0px)); top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.18); max-height: 60%; overflow-y: auto; }
.vmv-floor { position: relative; width: 44px; height: 40px; border: 0; border-bottom: 1px solid #f3f4f6; background: #fff; color: #374151; font-size: 13px; font-weight: 700; cursor: pointer; }
.vmv-floor:last-child { border-bottom: 0; }
.vmv-floor--on { background: #1d4ed8; color: #fff; }
.vmv-floor--route::after { content: ''; position: absolute; right: 5px; top: 5px; width: 7px; height: 7px; border-radius: 50%; background: #e11d48; box-shadow: 0 0 0 2px #fff; }
.vmv-floor-name { position: absolute; z-index: 3; top: calc(16px + env(safe-area-inset-top, 0px)); right: calc(14px + env(safe-area-inset-right, 0px)); padding: 7px 12px; border-radius: 999px; background: rgba(17,24,39,0.85); color: #fff; font-size: 12px; font-weight: 700; pointer-events: none; }

.vmv-legnav { position: absolute; z-index: 4; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 5px; border-radius: 999px; background: #111827; color: #fff; font-size: 13px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.25); white-space: nowrap; max-width: calc(100% - 24px); }
.vmv-legnav span { padding: 0 4px; overflow: hidden; text-overflow: ellipsis; }
.vmv-legnav button { height: 36px; min-width: 36px; padding: 0 12px; border: 0; border-radius: 999px; background: rgba(255,255,255,0.12); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
.vmv-legnav__next { background: #e11d48 !important; }
.vmv-legnav button:disabled { opacity: 0.4; cursor: default; }

.vmv-card { position: absolute; z-index: 6; left: calc(12px + env(safe-area-inset-left, 0px)); bottom: calc(14px + env(safe-area-inset-bottom, 0px)); width: 376px; max-width: calc(100% - 24px); padding: 16px; border-radius: 18px; background: #fff; box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
.vmv-card__x { position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; border: 0; border-radius: 50%; background: #f3f4f6; color: #374151; font-size: 18px; cursor: pointer; }
.vmv-card__head { display: flex; align-items: center; gap: 12px; padding-right: 34px; }
.vmv-card__logo { flex-shrink: 0; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 14px; background-size: cover; background-position: center; color: #fff; font-size: 17px; font-weight: 800; }
.vmv-card__title { margin: 0; font-size: 17px; font-weight: 800; line-height: 1.25; }
.vmv-card__meta { margin: 3px 0 0; font-size: 13px; color: #6b7280; }
.vmv-card__text { margin: 12px 0 0; font-size: 13px; line-height: 1.5; color: #4b5563; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.vmv-card__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }

.vmv-card-enter-active, .vmv-card-leave-active { transition: opacity 0.2s, transform 0.2s; }
.vmv-card-enter-from, .vmv-card-leave-to { opacity: 0; transform: translateY(12px); }

@media (max-width: 640px) {
  .vmv-panel { width: auto; right: calc(12px + env(safe-area-inset-right, 0px)); }
  .vmv-panel--open { max-height: 70%; }
  .vmv-steps { max-height: 30vh; }
  .vmv-card { left: 8px; right: 8px; width: auto; max-width: none; bottom: calc(8px + env(safe-area-inset-bottom, 0px)); }
  .vmv-floors { top: auto; bottom: calc(76px + env(safe-area-inset-bottom, 0px)); transform: none; max-height: 45%; }
  .vmv-floors--under-card { display: none; }
  .vmv-floor-name { display: none; }
  .vmv-legnav { bottom: calc(10px + env(safe-area-inset-bottom, 0px)); }
}
</style>
