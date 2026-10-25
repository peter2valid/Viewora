<template>
  <div class="fp-root">
    <input ref="fileInput" type="file" accept="image/png,image/jpeg" class="fp-hidden" @change="onFile" />

    <div v-if="loading" class="fp-center"><span class="fp-spin" /></div>

    <div v-else-if="setupError" class="fp-center fp-empty">
      <p class="fp-empty__title">Floor plans aren't set up yet</p>
      <p class="fp-empty__text">{{ setupError }}</p>
      <button class="fp-btn" @click="init">Try again</button>
    </div>

    <div v-else-if="!floorPlans.length" class="fp-center fp-empty">
      <div class="fp-empty__icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h7M14 12h7M12 3v6M12 15v6"/></svg>
      </div>
      <p class="fp-empty__title">Floor plan</p>
      <p class="fp-empty__text">
        Upload a floor plan (PNG or JPG) and mark where each 360° photo was taken.
        Visitors get a minimap that shows where they are and which way they're looking.
      </p>
      <button class="fp-btn fp-btn--primary" :disabled="uploading" @click="fileInput?.click()">
        {{ uploading ? 'Uploading…' : 'Upload floor plan' }}
      </button>
    </div>

    <template v-else>
      <!-- Plan + pins -->
      <!-- Zoom: wheel/pinch at the pointer, drag the plan to move it (a plain
           click still places), +/− buttons and keys. The plan is re-laid out
           at the zoomed size rather than CSS-scaled, so dots and the cone stay
           the same size on screen and spread apart as you zoom in. -->
      <div
        ref="stageRef"
        class="fp-stage"
        @wheel.prevent="onWheel"
        @pointerdown.capture="onStageDown"
      >
        <div
          v-if="current"
          ref="planRef"
          class="fp-plan"
          :class="{ 'fp-plan--placing': !!selectedSceneId && !draggingId, 'fp-plan--names': showNames, 'fp-plan--focus': !!selectedPin, 'fp-plan--pannable': zoom > 1 && !selectedSceneId, 'fp-plan--panning': panning }"
          :style="{ width: `${planBox.w * zoom}px`, height: `${planBox.h * zoom}px`, transform: `translate(${planOrigin.x}px, ${planOrigin.y}px)` }"
          @click="onPlanClick"
        >
          <img :src="current.image_url" :alt="current.name" class="fp-plan__img" draggable="false" @load="onImgLoad" />
          <button
            v-for="p in pinsOnCurrent" :key="p.id"
            class="fp-pin"
            :class="{ 'fp-pin--on': p.id === selectedSceneId, 'fp-pin--drag': p.id === draggingId }"
            :style="{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }"
            :title="p.name"
            @pointerdown.stop="onPinDown($event, p.id)"
            @click.stop
          >
            <span class="fp-pin__dot" />
            <span class="fp-pin__label">{{ p.name }}</span>
          </button>
          <!-- Direction of the selected photo's centre (same angle the viewer's cone uses) -->
          <div
            v-if="selectedPin"
            class="fp-dir"
            :style="{ left: `${selectedPin.x * 100}%`, top: `${selectedPin.y * 100}%`, transform: `rotate(${selectedDirDeg}deg)` }"
          >
            <!-- The whole cone is a grab area too: a bigger target than the
                 handle, and it sits above the other dots. -->
            <span class="fp-dir__cone" @pointerdown.stop.prevent="onDirDown" @click.stop />
            <button
              type="button"
              class="fp-dir__handle"
              :class="{ 'fp-dir__handle--drag': dirDraft !== null }"
              aria-label="Drag to set which way this photo faces"
              title="Drag to point where the centre of this photo faces"
              @pointerdown.stop.prevent="onDirDown"
              @click.stop
            />
          </div>
          <span
            v-if="pendingDot"
            class="fp-pin fp-pin--pending"
            :style="{ left: `${pendingDot.x * 100}%`, top: `${pendingDot.y * 100}%` }"
          ><span class="fp-pin__dot" /></span>
        </div>

        <div v-if="current" class="fp-zoom" @pointerdown.stop @wheel.stop>
          <button type="button" class="fp-zoom__btn" :disabled="zoom <= ZOOM_MIN" aria-label="Zoom out" title="Zoom out (−)" @click="zoomBy(1 / ZOOM_STEP)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 12h14"/></svg>
          </button>
          <span class="fp-zoom__pct" aria-live="polite">{{ Math.round(zoom * 100) }}%</span>
          <button type="button" class="fp-zoom__btn" :disabled="zoom >= ZOOM_MAX" aria-label="Zoom in" title="Zoom in (+)" @click="zoomBy(ZOOM_STEP)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button type="button" class="fp-zoom__btn fp-zoom__fit" :disabled="zoom === 1" title="Fit the whole plan (0)" @click="resetZoom">Fit</button>
        </div>
        <p v-if="current && zoomHint" class="fp-zoom__hint">Scroll or pinch to zoom · drag the plan to move around</p>
      </div>

      <!-- Side panel -->
      <aside class="fp-panel" aria-label="Floor plan photos">
        <label class="fp-field">
          Floor name
          <span class="fp-name-row">
            <input v-model="floorName" class="fp-input" maxlength="60" @change="saveFloorName" @keydown.enter="($event.target as HTMLInputElement).blur()" />
            <template v-if="floorPlans.length > 1">
              <button
                type="button" class="fp-move" :disabled="currentIndex <= 0 || moving"
                aria-label="Move floor left" title="Move left — floors show to visitors in this order"
                @click.prevent="moveFloor(-1)"
              >‹</button>
              <button
                type="button" class="fp-move" :disabled="currentIndex >= floorPlans.length - 1 || moving"
                aria-label="Move floor right" title="Move right — floors show to visitors in this order"
                @click.prevent="moveFloor(1)"
              >›</button>
            </template>
          </span>
        </label>

        <label class="fp-toggle">
          <input v-model="showNames" type="checkbox" />
          Show photo names on the plan
        </label>

        <div v-if="pendingDot" class="fp-callout">
          <p class="fp-callout__title">Which photo was taken here?</p>
          <p class="fp-muted">Pick a photo below, or press Esc to cancel.</p>
        </div>
        <div v-else-if="selectedSceneId" class="fp-callout">
          <p class="fp-callout__title">{{ sceneById[selectedSceneId]?.name }}</p>
          <p class="fp-muted">
            {{ isOnCurrent(selectedSceneId) ? 'Drag the dot to move it, or click the plan to move it there.' : 'Click the plan where this photo was taken.' }}
          </p>
          <template v-if="isOnCurrent(selectedSceneId)">
            <div class="fp-field">
              Facing direction <em>(optional)</em>
              <div class="fp-pano" :style="{ backgroundImage: `url(${sceneById[selectedSceneId]?.pano})` }">
                <span class="fp-pano__centre" />
              </div>
              <p class="fp-muted fp-hint">
                Drag the blue handle (or anywhere on the cone) so it points at whatever is in the <b>centre</b> of this photo (marked above).
              </p>
              <input
                type="number" min="-180" max="180" step="5" class="fp-input"
                aria-label="Facing direction in degrees"
                :value="selectedDirDeg"
                @change="saveNorthOffset(selectedSceneId, ($event.target as HTMLInputElement).valueAsNumber)"
              />
            </div>
            <button class="fp-btn fp-btn--danger fp-btn--full" @click="unplace(selectedSceneId)">Remove from plan</button>
          </template>
        </div>
        <p v-else class="fp-muted fp-tip">
          Select a photo, then click the plan where it was taken — or click the plan first, then pick the photo.
        </p>

        <p class="fp-section">Not placed yet <span>{{ unplaced.length }}</span></p>
        <p v-if="!scenes.length" class="fp-muted">Add 360° photos in the 360° Tour tab first.</p>
        <p v-else-if="!unplaced.length" class="fp-muted">Every photo has a location.</p>
        <ul class="fp-list">
          <li v-for="sc in unplaced" :key="sc.id">
            <button :class="{ 'fp-list__on': sc.id === selectedSceneId }" @click="pickScene(sc.id)">
              <img :src="sc.thumb" alt="" class="fp-list__thumb" />
              <span>{{ sc.name }}</span>
            </button>
          </li>
        </ul>

        <template v-if="placedHere.length">
          <p class="fp-section">On this floor <span>{{ placedHere.length }}</span></p>
          <ul class="fp-list">
            <li v-for="sc in placedHere" :key="sc.id">
              <button :class="{ 'fp-list__on': sc.id === selectedSceneId }" @click="pickScene(sc.id)">
                <img :src="sc.thumb" alt="" class="fp-list__thumb" />
                <span>{{ sc.name }}</span>
              </button>
            </li>
          </ul>
        </template>

        <template v-if="placedElsewhere.length">
          <p class="fp-section">On other floors <span>{{ placedElsewhere.length }}</span></p>
          <ul class="fp-list">
            <li v-for="sc in placedElsewhere" :key="sc.id">
              <button :class="{ 'fp-list__on': sc.id === selectedSceneId }" @click="pickScene(sc.id)">
                <img :src="sc.thumb" alt="" class="fp-list__thumb" />
                <span>{{ sc.name }}</span>
                <small>{{ floorLabel(sc.floor_plan_id) }}</small>
              </button>
            </li>
          </ul>
        </template>

        <div class="fp-actions">
          <button class="fp-btn fp-btn--danger" @click="removeFloor">Delete floor</button>
        </div>
      </aside>

      <!-- Floors -->
      <div ref="stripRef" class="fp-strip" role="tablist" aria-label="Floors">
        <button
          v-for="f in floorPlans" :key="f.id"
          role="tab" :aria-selected="f.id === currentId"
          class="fp-thumb fp-thumb--floor" :class="{ 'fp-thumb--on': f.id === currentId }"
          :data-floor-id="f.id"
          :title="floorPlans.length > 1 ? 'Drag to change the floor order' : undefined"
          :style="{ backgroundImage: `url(${f.image_url})` }"
          @click="selectFloor(f.id)"
        >
          <span class="fp-thumb__name">{{ f.name }}</span>
        </button>
        <button
          v-if="floorPlans.length < MAX_FLOOR_PLANS"
          class="fp-thumb fp-thumb--add" :disabled="uploading"
          @click="fileInput?.click()"
        >
          <span v-if="uploading" class="fp-spin fp-spin--sm" />
          <template v-else>+<small>Add floor</small></template>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, onActivated, nextTick } from 'vue'
import { toast } from 'vue-sonner'
import Sortable from 'sortablejs'
import { useImage } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { useFloorPlans } from '~/features/floorplan/useFloorPlans'
import { clamp01, isPlaced, MAX_FLOOR_PLANS } from '~/shared/utils/floorPlan'

const props = defineProps<{ spaceId: string }>()

const { apiFetch } = useApiFetch()
const { floorPlans, uploading, load, addFloorPlan, renameFloorPlan, moveFloorPlan, reorderFloorPlans, deleteFloorPlan } = useFloorPlans(props.spaceId)
const nuxtImg = useImage()

const loading = ref(true)
const setupError = ref('')
const currentId = ref<string | null>(null)
const current = computed(() => floorPlans.value.find(f => f.id === currentId.value) ?? null)
const floorName = ref('')
watch(current, f => { floorName.value = f?.name ?? '' }, { immediate: true })

// ── Scenes (the tour's 360 photos) ──────────────────────────
type SceneRow = {
  id: string; name: string; thumb: string; pano: string
  floor_plan_id: string | null; plan_x: number | null; plan_y: number | null; north_offset: number | null
}
const scenes = ref<SceneRow[]>([])
const sceneById = computed<Record<string, SceneRow>>(() => Object.fromEntries(scenes.value.map(sc => [sc.id, sc])))
const unplaced = computed(() => scenes.value.filter(sc => !isPlaced(sc)))
const placedHere = computed(() => scenes.value.filter(sc => isPlaced(sc) && sc.floor_plan_id === currentId.value))
const placedElsewhere = computed(() => scenes.value.filter(sc => isPlaced(sc) && sc.floor_plan_id !== currentId.value))
const pinsOnCurrent = computed(() => placedHere.value.map(sc => ({ id: sc.id, name: sc.name, x: sc.plan_x as number, y: sc.plan_y as number })))
const isOnCurrent = (id: string) => placedHere.value.some(sc => sc.id === id)
const floorLabel = (id: string | null) => floorPlans.value.find(f => f.id === id)?.name ?? ''

async function loadScenes() {
  const res: any = await apiFetch(`/spaces/${props.spaceId}/scenes`)
  const list: any[] = res?.scenes ?? res?.data?.scenes ?? []
  scenes.value = list
    .filter(sc => sc?.id)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((sc, i) => {
      const src = sc.thumbnail_url || sc.raw_image_url || ''
      let thumb = src
      let pano = src
      try { if (src) thumb = nuxtImg(src, { width: 160, quality: 70, format: 'webp' }) || src } catch { /* keep src */ }
      try { if (src) pano = nuxtImg(src, { width: 640, quality: 70, format: 'webp' }) || src } catch { /* keep src */ }
      return {
        id: sc.id,
        name: (sc.name || '').trim() || `View ${i + 1}`,
        thumb,
        pano,
        floor_plan_id: sc.floor_plan_id ?? null,
        plan_x: sc.plan_x ?? null,
        plan_y: sc.plan_y ?? null,
        north_offset: sc.north_offset ?? null,
      }
    })
}

async function init() {
  loading.value = true
  setupError.value = ''
  try {
    await Promise.all([load(), loadScenes()])
    if (!currentId.value || !floorPlans.value.some(f => f.id === currentId.value)) currentId.value = floorPlans.value[0]?.id ?? null
  } catch (e: any) {
    setupError.value = e?.data?.statusMessage
      ? `${e.data.statusMessage}. If this is new, run migration-add-floor-plans.sql in Supabase.`
      : 'Could not load floor plans. If this is new, run migration-add-floor-plans.sql in Supabase.'
  } finally {
    loading.value = false
  }
}

// ── Floors ──────────────────────────────────────────────────
const fileInput = ref<HTMLInputElement | null>(null)

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const created = await addFloorPlan(file)
    currentId.value = created.id
    toast.success(`${created.name} added`)
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || err?.message || 'Upload failed')
  }
}

function selectFloor(id: string) {
  currentId.value = id
  pendingDot.value = null
}

async function saveFloorName() {
  const f = current.value
  const name = floorName.value.trim()
  if (!f || !name || name === f.name) { floorName.value = f?.name ?? ''; return }
  try { await renameFloorPlan(f.id, name) }
  catch { floorName.value = f.name; toast.error('Could not rename the floor') }
}

const currentIndex = computed(() => floorPlans.value.findIndex(f => f.id === currentId.value))
const moving = ref(false)

async function moveFloor(dir: -1 | 1) {
  const f = current.value
  if (!f || moving.value) return
  moving.value = true
  try { await moveFloorPlan(f.id, dir) }
  catch { toast.error('Could not change the floor order') }
  finally { moving.value = false }
}

// ── Drag a floor thumbnail to reorder ───────────────────────
const stripRef = ref<HTMLElement | null>(null)
let stripSortable: Sortable | null = null
watch(stripRef, (el) => {
  stripSortable?.destroy()
  stripSortable = null
  if (!el) return
  stripSortable = Sortable.create(el, {
    animation: 150,
    draggable: '.fp-thumb--floor',
    onEnd: (evt) => {
      const { oldIndex, newIndex, item } = evt
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
      const ids = Array.from(el.querySelectorAll<HTMLElement>('[data-floor-id]')).map(n => n.dataset.floorId as string)
      // Put the node back where Vue left it; the reorder re-renders the list.
      el.removeChild(item)
      el.insertBefore(item, el.children[oldIndex] ?? null)
      moving.value = true
      reorderFloorPlans(ids)
        .catch(() => toast.error('Could not change the floor order'))
        .finally(() => { moving.value = false })
    },
  })
})

async function removeFloor() {
  const f = current.value
  if (!f) return
  if (placedHere.value.length && !window.confirm(`Delete “${f.name}”? ${placedHere.value.length} photo(s) on it will become unplaced.`)) return
  try {
    await deleteFloorPlan(f.id)
    for (const sc of scenes.value) {
      if (sc.floor_plan_id === f.id) Object.assign(sc, { floor_plan_id: null, plan_x: null, plan_y: null })
    }
    currentId.value = floorPlans.value[0]?.id ?? null
    toast.success('Floor deleted')
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Could not delete the floor')
  }
}

// ── Plan sizing: fit the image inside the stage ─────────────
const stageRef = ref<HTMLElement | null>(null)
const planRef = ref<HTMLElement | null>(null)
const natural = ref({ w: 0, h: 0 })
const stageSize = ref({ w: 0, h: 0 })
const planBox = computed(() => {
  const w = natural.value.w || current.value?.width || 1
  const h = natural.value.h || current.value?.height || 1
  // 24px margin: the stage clips, and a dot on the top edge needs room for its cone.
  const scale = Math.max(0, Math.min((stageSize.value.w - 48) / w, (stageSize.value.h - 48) / h)) || 0
  return { w: Math.floor(w * scale), h: Math.floor(h * scale) }
})

// ── Zoom + pan ──────────────────────────────────────────────
// zoom multiplies the fitted size; pan is the plan's offset from centred.
const ZOOM_MIN = 1
const ZOOM_MAX = 8
const ZOOM_STEP = 1.5
const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const panning = ref(false)
const zoomHint = ref(true)
onMounted(() => setTimeout(() => { zoomHint.value = false }, 8000))

/** Top-left of the plan inside the stage. */
const planOrigin = computed(() => ({
  x: (stageSize.value.w - planBox.value.w * zoom.value) / 2 + pan.value.x,
  y: (stageSize.value.h - planBox.value.h * zoom.value) / 2 + pan.value.y,
}))

/** Keep part of the plan on screen: it can't be pushed more than 80px past the stage edge. */
function clampPan(p: { x: number; y: number }, z = zoom.value) {
  const mx = Math.max(0, (planBox.value.w * z - stageSize.value.w) / 2 + 80)
  const my = Math.max(0, (planBox.value.h * z - stageSize.value.h) / 2 + 80)
  return z <= 1 ? { x: 0, y: 0 } : { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) }
}

/** Zoom to `next`, keeping the plan point under (sx, sy) — stage coordinates — where it is. */
function zoomAt(next: number, sx: number, sy: number) {
  const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next))
  if (z === zoom.value || !planBox.value.w) return
  const o = planOrigin.value
  const fx = (sx - o.x) / (planBox.value.w * zoom.value)
  const fy = (sy - o.y) / (planBox.value.h * zoom.value)
  const nw = planBox.value.w * z
  const nh = planBox.value.h * z
  const p = { x: sx - fx * nw - (stageSize.value.w - nw) / 2, y: sy - fy * nh - (stageSize.value.h - nh) / 2 }
  zoom.value = z
  pan.value = clampPan(p, z)
  zoomHint.value = false
}

/** Buttons and keys zoom around the selected dot if there is one, else the stage centre. */
function zoomBy(factor: number) {
  const pin = selectedPin.value
  const o = planOrigin.value
  const sx = pin ? o.x + pin.x * planBox.value.w * zoom.value : stageSize.value.w / 2
  const sy = pin ? o.y + pin.y * planBox.value.h * zoom.value : stageSize.value.h / 2
  zoomAt(zoom.value * factor, sx, sy)
}

function resetZoom() {
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
}
watch(currentId, resetZoom)
watch(stageSize, () => { pan.value = clampPan(pan.value) })

function stagePoint(e: { clientX: number; clientY: number }) {
  const r = stageRef.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function onWheel(e: WheelEvent) {
  if (!current.value) return
  const at = stagePoint(e)
  // Trackpad pinch arrives as ctrl+wheel with small deltas; mouse wheels as ±100.
  const k = e.ctrlKey ? 0.01 : 0.0015
  zoomAt(zoom.value * Math.exp(-e.deltaY * k), at.x, at.y)
}

// Every pointer on the stage is seen here first (capture), dots included:
// on a busy plan a pinch often starts on dots. One pointer on empty plan that
// moves = pan (and the click that follows is swallowed); a second pointer
// anywhere = pinch zoom around the midpoint, cancelling any dot/cone drag.
const touches = new Map<number, { x: number; y: number }>()
let panStart: { x: number; y: number; px: number; py: number } | null = null
let pinchStart: { dist: number; zoom: number } | null = null

function onStageDown(e: PointerEvent) {
  if (!current.value || (e.pointerType === 'mouse' && e.button !== 0)) return
  const target = e.target as HTMLElement
  if (target.closest('.fp-zoom')) return
  touches.set(e.pointerId, stagePoint(e))
  if (touches.size === 1) {
    // Dots and the cone handle their own drags; only empty plan pans.
    panStart = target.closest('.fp-pin, .fp-dir') ? null : { ...stagePoint(e), px: pan.value.x, py: pan.value.y }
  } else if (touches.size === 2) {
    const [a, b] = [...touches.values()]
    pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: zoom.value }
    panStart = null
    panning.value = false
    cancelPinDrag()
    cancelDirDrag()
    // The second finger's own pointerdown must not start a dot/cone drag.
    e.stopPropagation()
  }
  window.addEventListener('pointermove', onStageMove)
  window.addEventListener('pointerup', onStageUp)
  window.addEventListener('pointercancel', onStageUp)
}

function onStageMove(e: PointerEvent) {
  if (!touches.has(e.pointerId)) return
  const at = stagePoint(e)
  touches.set(e.pointerId, at)
  if (pinchStart && touches.size >= 2) {
    const [a, b] = [...touches.values()]
    zoomAt(pinchStart.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.dist, (a.x + b.x) / 2, (a.y + b.y) / 2)
    suppressClick = true
    return
  }
  if (!panStart) return
  const dx = at.x - panStart.x
  const dy = at.y - panStart.y
  if (!panning.value && Math.hypot(dx, dy) < 5) return
  if (zoom.value <= 1) return
  panning.value = true
  suppressClick = true
  zoomHint.value = false
  pan.value = clampPan({ x: panStart.px + dx, y: panStart.py + dy })
}

function onStageUp(e: PointerEvent) {
  touches.delete(e.pointerId)
  if (touches.size < 2) pinchStart = null
  if (touches.size) return
  window.removeEventListener('pointermove', onStageMove)
  window.removeEventListener('pointerup', onStageUp)
  window.removeEventListener('pointercancel', onStageUp)
  panStart = null
  if (panning.value || suppressClick) {
    panning.value = false
    // The click event fires right after pointerup; let it see suppressClick first.
    setTimeout(() => { suppressClick = false }, 0)
  }
}

/** When zoomed in, bring a dot picked from the list into view. */
function revealPin(id: string) {
  if (zoom.value <= 1) return
  const sc = sceneById.value[id]
  if (!sc || sc.plan_x == null || sc.plan_y == null) return
  const o = planOrigin.value
  const sx = o.x + sc.plan_x * planBox.value.w * zoom.value
  const sy = o.y + sc.plan_y * planBox.value.h * zoom.value
  const m = 60
  if (sx > m && sx < stageSize.value.w - m && sy > m && sy < stageSize.value.h - m) return
  pan.value = clampPan({ x: pan.value.x + stageSize.value.w / 2 - sx, y: pan.value.y + stageSize.value.h / 2 - sy })
}
function onImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  natural.value = { w: img.naturalWidth, h: img.naturalHeight }
}
watch(currentId, () => { natural.value = { w: 0, h: 0 } })

let ro: ResizeObserver | null = null
function observeStage() {
  ro?.disconnect()
  if (!stageRef.value) return
  ro = new ResizeObserver(([entry]) => {
    stageSize.value = { w: entry.contentRect.width, h: entry.contentRect.height }
  })
  ro.observe(stageRef.value)
}
watch(stageRef, () => nextTick(observeStage))

function fractionAt(e: { clientX: number; clientY: number }) {
  const r = planRef.value!.getBoundingClientRect()
  return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) }
}

// ── Placing ─────────────────────────────────────────────────
const selectedSceneId = ref<string | null>(null)
// Names are off by default: on a busy plan they cover the spots you need to
// click. A dot still shows its name on hover, and the selected dot always does.
const showNames = ref(false)
const pendingDot = ref<{ x: number; y: number } | null>(null)

function onPlanClick(e: MouseEvent) {
  if (!current.value || suppressClick) { suppressClick = false; return }
  const at = fractionAt(e)
  if (selectedSceneId.value) {
    void savePin(selectedSceneId.value, { floor_plan_id: current.value.id, plan_x: at.x, plan_y: at.y })
  } else {
    pendingDot.value = at
  }
}

function pickScene(id: string) {
  if (pendingDot.value && current.value) {
    const at = pendingDot.value
    pendingDot.value = null
    selectedSceneId.value = id
    void savePin(id, { floor_plan_id: current.value.id, plan_x: at.x, plan_y: at.y })
    return
  }
  selectedSceneId.value = selectedSceneId.value === id ? null : id
  const sc = sceneById.value[id]
  // Jump to the floor a placed photo is on, so its dot is visible.
  if (sc && isPlaced(sc) && sc.floor_plan_id !== currentId.value) currentId.value = sc.floor_plan_id
  else if (selectedSceneId.value === id) revealPin(id)
}

function unplace(id: string) {
  void savePin(id, { floor_plan_id: null, plan_x: null, plan_y: null })
  selectedSceneId.value = null
}

function saveNorthOffset(id: string, deg: number) {
  if (!Number.isFinite(deg)) return
  const v = Math.max(-180, Math.min(180, Math.round(deg)))
  void savePin(id, { north_offset: v })
}

/** Optimistic update; reverts and shows an error if the save fails. */
async function savePin(id: string, patch: Partial<Pick<SceneRow, 'floor_plan_id' | 'plan_x' | 'plan_y' | 'north_offset'>>) {
  const sc = sceneById.value[id]
  if (!sc) return
  const before = { floor_plan_id: sc.floor_plan_id, plan_x: sc.plan_x, plan_y: sc.plan_y, north_offset: sc.north_offset }
  Object.assign(sc, patch)
  try {
    await apiFetch(`/scenes/${id}`, { method: 'PATCH', body: patch })
  } catch (e: any) {
    Object.assign(sc, before)
    toast.error(e?.data?.statusMessage || 'Could not save the location — check your connection.')
  }
}

// ── Facing direction (scenes.north_offset) ──────────────────
// Degrees clockwise from the top of the plan that the photo's centre faces —
// the viewer's minimap cone points at yaw + this, so 0 = up, 90 = right.
const selectedPin = computed(() => pinsOnCurrent.value.find(p => p.id === selectedSceneId.value) ?? null)
const dirDraft = ref<number | null>(null)
const selectedDirDeg = computed(() => dirDraft.value ?? sceneById.value[selectedSceneId.value ?? '']?.north_offset ?? 0)

function dirAt(e: { clientX: number; clientY: number }): number {
  const pin = selectedPin.value!
  const r = planRef.value!.getBoundingClientRect()
  const dx = e.clientX - (r.left + pin.x * r.width)
  const dy = e.clientY - (r.top + pin.y * r.height)
  let deg = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI)
  // Gentle snap to the four plan directions and the diagonals.
  const nearest45 = Math.round(deg / 45) * 45
  if (Math.abs(deg - nearest45) <= 4) deg = nearest45
  return deg === -180 ? 180 : deg
}

function cancelDirDrag() {
  window.removeEventListener('pointermove', onDirMove)
  window.removeEventListener('pointerup', onDirUp)
  dirDraft.value = null
}

function onDirDown(e: PointerEvent) {
  if (e.button !== 0 || !selectedPin.value) return
  dirDraft.value = dirAt(e)
  window.addEventListener('pointermove', onDirMove)
  window.addEventListener('pointerup', onDirUp, { once: true })
}

function onDirMove(e: PointerEvent) {
  if (dirDraft.value === null || !selectedPin.value) return
  dirDraft.value = dirAt(e)
}

function onDirUp() {
  window.removeEventListener('pointermove', onDirMove)
  const id = selectedSceneId.value
  const deg = dirDraft.value
  // Keep showing the drafted angle until the optimistic save applies it.
  if (id && deg !== null) saveNorthOffset(id, deg)
  dirDraft.value = null
  suppressClick = true
  setTimeout(() => { suppressClick = false }, 0)
}

// ── Dragging pins ───────────────────────────────────────────
const draggingId = ref<string | null>(null)
let dragStart: { x: number; y: number } | null = null
let dragMoved = false
let suppressClick = false
// While a dot is selected, the other dots can be clicked to switch to them
// but not dragged — a press that slips onto a neighbour must not move it.
let dragLocked = false

function onPinDown(e: PointerEvent, id: string) {
  if (e.button !== 0) return
  dragLocked = !!selectedSceneId.value && selectedSceneId.value !== id
  draggingId.value = id
  dragStart = { x: e.clientX, y: e.clientY }
  dragMoved = false
  const sc = sceneById.value[id]
  dragOrigin = sc ? { x: sc.plan_x, y: sc.plan_y } : null
  window.addEventListener('pointermove', onPinMove)
  window.addEventListener('pointerup', onPinUp, { once: true })
}

let dragOrigin: { x: number | null; y: number | null } | null = null

/** A pinch began: put a half-dragged dot back and drop the drag. */
function cancelPinDrag() {
  window.removeEventListener('pointermove', onPinMove)
  window.removeEventListener('pointerup', onPinUp)
  const sc = draggingId.value ? sceneById.value[draggingId.value] : null
  if (sc && dragOrigin && dragMoved) { sc.plan_x = dragOrigin.x; sc.plan_y = dragOrigin.y }
  draggingId.value = null
  dragOrigin = null
  suppressClick = true
}

function onPinMove(e: PointerEvent) {
  const id = draggingId.value
  if (!id || !dragStart) return
  if (!dragMoved && Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) < 4) return
  dragMoved = true
  if (dragLocked) return
  const at = fractionAt(e)
  const sc = sceneById.value[id]
  if (sc) { sc.plan_x = at.x; sc.plan_y = at.y }
}

function onPinUp() {
  window.removeEventListener('pointermove', onPinMove)
  const id = draggingId.value
  draggingId.value = null
  if (!id) return
  if (dragMoved && dragLocked) {
    // Slipped onto another dot while one was selected: ignore entirely.
    suppressClick = true
    setTimeout(() => { suppressClick = false }, 0)
  } else if (dragMoved) {
    suppressClick = true
    const sc = sceneById.value[id]
    if (sc && current.value) {
      // Values are already applied locally; savePin re-applies them and owns the revert.
      void savePin(id, { floor_plan_id: current.value.id, plan_x: sc.plan_x, plan_y: sc.plan_y })
    }
    setTimeout(() => { suppressClick = false }, 0)
  } else {
    selectedSceneId.value = selectedSceneId.value === id ? null : id
    pendingDot.value = null
  }
}

// ── Keyboard ────────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return
  if (e.key === 'Escape') { pendingDot.value = null; selectedSceneId.value = null }
  if (!current.value || e.metaKey || e.ctrlKey || e.altKey) { /* leave browser zoom alone */ }
  else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(ZOOM_STEP) }
  else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1 / ZOOM_STEP) }
  else if (e.key === '0') { e.preventDefault(); resetZoom() }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSceneId.value && isOnCurrent(selectedSceneId.value)) {
    e.preventDefault()
    unplace(selectedSceneId.value)
  }
}

onMounted(() => {
  void init()
  window.addEventListener('keydown', onKey)
})
// Photos may have been added/renamed in the 360° Tour tab meanwhile.
let firstActivation = true
onActivated(() => {
  if (firstActivation) { firstActivation = false; return }
  loadScenes().catch(() => {})
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pointermove', onPinMove)
  window.removeEventListener('pointermove', onDirMove)
  window.removeEventListener('pointermove', onStageMove)
  window.removeEventListener('pointerup', onStageUp)
  window.removeEventListener('pointercancel', onStageUp)
  ro?.disconnect()
  stripSortable?.destroy()
})
</script>

<style scoped>
.fp-root { position: fixed; inset: 0; background: #0b0d12; color: #fff; }
.fp-hidden { display: none; }
.fp-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; }
.fp-muted { color: rgba(255,255,255,0.5); font-size: 12px; line-height: 1.5; }
.fp-spin { width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.15); border-top-color: #fff; animation: fp-rot 0.8s linear infinite; }
.fp-spin--sm { width: 18px; height: 18px; border-width: 2px; }
@keyframes fp-rot { to { transform: rotate(360deg); } }

.fp-empty { max-width: 460px; margin: 0 auto; }
.fp-empty__icon { width: 64px; height: 64px; border-radius: 18px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); color: #a7f3d0; }
.fp-empty__title { font-size: 20px; font-weight: 800; }
.fp-empty__text { font-size: 13.5px; line-height: 1.6; color: rgba(255,255,255,0.6); }

.fp-btn { height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.07); color: #fff; font-size: 12.5px; font-weight: 700; cursor: pointer; }
.fp-btn:hover:not(:disabled) { background: rgba(255,255,255,0.13); }
.fp-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.fp-btn--primary { background: #22c55e; border-color: #22c55e; color: #0b0d14; }
.fp-btn--primary:hover:not(:disabled) { background: #4ade80; }
.fp-btn--danger { color: #fca5a5; border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.08); }
.fp-btn--full { width: 100%; }

/* Plan area: clear of the top bars, the side panel and the floor strip. */
.fp-stage { position: absolute; top: 130px; right: 332px; bottom: 104px; left: 16px; overflow: hidden; touch-action: none; border-radius: 12px; }
.fp-plan { position: absolute; left: 0; top: 0; border-radius: 8px; overflow: visible; background: #fff; box-shadow: 0 12px 40px rgba(0,0,0,0.45); user-select: none; }
.fp-plan--pannable { cursor: grab; }
.fp-plan--panning, .fp-plan--panning.fp-plan--placing { cursor: grabbing; }
.fp-zoom {
  position: absolute; right: 12px; bottom: 12px; z-index: 5;
  display: flex; align-items: center; gap: 2px; padding: 4px;
  border-radius: 12px; background: rgba(14,14,18,0.88); border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4); backdrop-filter: blur(12px);
}
.fp-zoom__btn { min-width: 32px; height: 32px; padding: 0 8px; display: flex; align-items: center; justify-content: center; border: 0; border-radius: 8px; background: transparent; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
.fp-zoom__btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
.fp-zoom__btn:disabled { opacity: 0.35; cursor: default; }
.fp-zoom__fit { margin-left: 2px; border-left: 1px solid rgba(255,255,255,0.12); border-radius: 0 8px 8px 0; }
.fp-zoom__pct { min-width: 44px; text-align: center; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8); font-variant-numeric: tabular-nums; }
.fp-zoom__hint {
  position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 4;
  padding: 5px 12px; border-radius: 999px; background: rgba(14,14,18,0.8); color: rgba(255,255,255,0.8);
  font-size: 11.5px; font-weight: 600; white-space: nowrap; pointer-events: none;
}
.fp-plan--placing { cursor: crosshair; }
.fp-plan__img { display: block; width: 100%; height: 100%; border-radius: 8px; pointer-events: none; }

.fp-pin { position: absolute; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; border: 0; background: transparent; cursor: grab; touch-action: none; }
.fp-pin:active { cursor: grabbing; }
.fp-pin__dot { width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.45); transition: transform 120ms; }
.fp-pin:hover .fp-pin__dot { transform: scale(1.2); }
.fp-pin--on .fp-pin__dot { background: #22c55e; transform: scale(1.3); }
.fp-pin--pending { pointer-events: none; }
.fp-dir { position: absolute; width: 0; height: 0; z-index: 3; pointer-events: none; }
.fp-dir__cone {
  position: absolute; left: -38px; top: -64px; width: 76px; height: 64px;
  clip-path: polygon(50% 100%, 0 0, 100% 0);
  background: linear-gradient(to top, rgba(37, 99, 235, 0.6), rgba(37, 99, 235, 0.05));
  pointer-events: auto; cursor: grab; touch-action: none;
}
.fp-dir__handle {
  position: absolute; left: -12px; top: -80px; width: 24px; height: 24px; padding: 0;
  border-radius: 50%; border: 3px solid #fff; background: #2563eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  cursor: grab; pointer-events: auto; touch-action: none;
}
/* Invisible 48px hit area around the 24px handle. */
.fp-dir__handle::before { content: ''; position: absolute; inset: -12px; border-radius: 50%; }
.fp-dir__handle--drag { cursor: grabbing; transform: scale(1.15); }
.fp-pano { position: relative; height: 72px; border-radius: 8px; background: #1f2430 center/cover no-repeat; border: 1px solid rgba(255,255,255,0.1); }
.fp-pano__centre { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: #3b82f6; box-shadow: 0 0 0 1px rgba(255,255,255,0.7); }
.fp-pano__centre::after { content: ''; position: absolute; top: -1px; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #3b82f6; }
.fp-hint { text-transform: none; letter-spacing: 0; font-weight: 500; }
.fp-pin--pending .fp-pin__dot { background: #f59e0b; animation: fp-pulse 1s ease-in-out infinite; }
@keyframes fp-pulse { 50% { transform: scale(1.35); } }
.fp-pin__label { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: -4px; padding: 2px 7px; border-radius: 6px; background: rgba(10,12,20,0.85); color: #fff; font-size: 10.5px; font-weight: 700; white-space: nowrap; pointer-events: none; display: none; }
/* Names: on hover, while dragging, for the selected dot, or all with the toggle. */
.fp-plan--names .fp-pin__label,
.fp-pin:hover .fp-pin__label,
.fp-pin--drag .fp-pin__label,
.fp-pin--on .fp-pin__label { display: block; }
.fp-pin:hover, .fp-pin--drag { z-index: 2; }
.fp-pin--on { z-index: 4; }
/* With a dot selected, the others step back so the cone and handle stand out. */
.fp-plan--focus .fp-pin:not(.fp-pin--on) .fp-pin__dot { opacity: 0.45; transform: scale(0.75); }
.fp-plan--focus .fp-pin:not(.fp-pin--on):hover .fp-pin__dot { opacity: 1; transform: scale(1); }

.fp-panel {
  position: fixed; right: 16px; top: 130px; bottom: 18px; width: 300px; z-index: 21;
  display: flex; flex-direction: column; gap: 10px; padding: 16px; overflow-y: auto;
  background: rgba(14,14,18,0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; backdrop-filter: blur(20px);
}
.fp-field { display: flex; flex-direction: column; gap: 5px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.5); }
.fp-field em { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; color: rgba(255,255,255,0.35); }
.fp-input { width: 100%; height: 38px; padding: 0 11px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 13px; font-weight: 600; text-transform: none; letter-spacing: 0; outline: none; }
.fp-input:focus { border-color: rgba(96,165,250,0.7); }
.fp-name-row { display: flex; gap: 6px; }
.fp-name-row .fp-input { flex: 1; min-width: 0; }
.fp-move { flex: none; width: 34px; height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 18px; font-weight: 700; line-height: 1; cursor: pointer; }
.fp-move:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
.fp-move:disabled { opacity: 0.3; cursor: default; }
.fp-toggle { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.75); cursor: pointer; }
.fp-toggle input { width: 15px; height: 15px; accent-color: #22c55e; cursor: pointer; }
.fp-callout { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); }
.fp-callout__title { font-size: 13px; font-weight: 800; }
.fp-tip { padding: 2px 2px 0; }
.fp-section { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.6); }
.fp-section span { color: rgba(255,255,255,0.4); }
.fp-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.fp-list button { width: 100%; display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: #fff; font-size: 12.5px; font-weight: 600; text-align: left; cursor: pointer; }
.fp-list button:hover { background: rgba(255,255,255,0.06); }
.fp-list .fp-list__on { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.5); }
.fp-list span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fp-list small { color: rgba(255,255,255,0.45); font-size: 10.5px; }
.fp-list__thumb { width: 44px; height: 28px; border-radius: 5px; object-fit: cover; background: #1f2430; flex-shrink: 0; }
.fp-actions { display: flex; gap: 8px; margin-top: auto; padding-top: 8px; }
.fp-actions .fp-btn { flex: 1; }

.fp-strip {
  position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 20;
  display: flex; gap: 8px; padding: 8px; max-width: calc(100vw - 380px); overflow-x: auto;
  background: rgba(14,14,18,0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; backdrop-filter: blur(16px);
}
.fp-thumb { position: relative; flex-shrink: 0; width: 96px; height: 64px; border-radius: 10px; border: 2px solid transparent; background: #fff center/cover no-repeat; cursor: pointer; }
.fp-thumb--on { border-color: #22c55e; }
.fp-thumb--floor { cursor: grab; }
.fp-thumb--floor:active { cursor: grabbing; }
.fp-thumb.sortable-ghost { opacity: 0.35; }
.fp-thumb__name { position: absolute; left: 4px; bottom: 4px; max-width: calc(100% - 8px); padding: 1px 6px; border-radius: 6px; background: rgba(0,0,0,0.75); color: #fff; font-size: 9.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fp-thumb--add { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px dashed rgba(255,255,255,0.25); background: rgba(255,255,255,0.03); color: #fff; font-size: 20px; }
.fp-thumb--add small { font-size: 10px; color: rgba(255,255,255,0.6); }

@media (max-width: 768px) {
  .fp-stage { top: 100px; right: 12px; left: 12px; bottom: calc(42vh + 96px); }
  .fp-panel { top: auto; left: 12px; right: 12px; bottom: 88px; width: auto; max-height: 42vh; }
  .fp-strip { max-width: calc(100vw - 24px); bottom: 12px; }
  .fp-thumb { width: 72px; height: 52px; }
}
</style>
