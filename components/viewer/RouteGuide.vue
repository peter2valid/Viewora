<template>
  <div class="rg" aria-live="polite">
    <!-- The hotspot to take next: a big pulsing beacon on it -->
    <button
      v-if="beacon"
      type="button"
      class="rg-beacon"
      :style="{ transform: `translate(${beacon.x}px, ${beacon.y}px)` }"
      :aria-label="`Go this way, towards ${nextName}`"
      @click="goNext"
    >
      <span class="rg-beacon__label">Go this way</span>
      <span class="rg-beacon__ring" />
      <span class="rg-beacon__core">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </span>
    </button>

    <!-- Hotspot out of view: which way to turn -->
    <button
      v-else-if="turn"
      type="button"
      class="rg-turn" :class="`rg-turn--${turn}`"
      @click="faceNext"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path v-if="turn === 'left'" d="M15 18l-6-6 6-6" /><path v-else d="M9 18l6-6-6-6" />
      </svg>
      <span>Turn {{ turn }}</span>
    </button>

    <!-- Step card: what to do now, progress, next / map / end -->
    <div class="rg-card" :class="{ 'rg-card--done': arrived }">
      <div class="rg-card__top">
        <span class="rg-card__icon" :class="{ 'rg-card__icon--done': arrived && plan.status === 'full' }" aria-hidden="true">
          <svg v-if="arrived && plan.status === 'full'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
          <svg v-else-if="offRoute" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
          <svg v-else-if="changesFloor" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l4-4 4 4M8 17l4 4 4-4"/></svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        </span>
        <div class="rg-card__text">
          <p class="rg-card__title">{{ title }}</p>
          <p class="rg-card__sub">{{ subtitle }}</p>
        </div>
        <button type="button" class="rg-x" aria-label="End the route" title="End the route" @click="emit('end')">×</button>
      </div>

      <div v-if="!arrived && !offRoute" class="rg-progress" aria-hidden="true">
        <i :style="{ width: `${Math.round(((index + 1) / path.length) * 100)}%` }" />
      </div>

      <div class="rg-card__actions">
        <button type="button" class="rg-btn rg-btn--ghost" @click="emit('show-map')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>
          Map
        </button>
        <button v-if="offRoute && rejoinId" type="button" class="rg-btn" @click="emit('rejoin', rejoinId)">Back to the route</button>
        <button v-else-if="!arrived" type="button" class="rg-btn" :disabled="!nextHotspot || transitioning" @click="goNext">
          Next stop
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <button v-else type="button" class="rg-btn" @click="emit('end')">Done</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Turn-by-turn guide for "Walk this route in 360": the walk is a list of
// scenes joined by hotspots; at each stop the hotspot to take next gets a
// beacon (or a turn arrow when it's out of view), and the camera turns to
// face it on arrival. Leaving the route re-plans from wherever you are.
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { PsvViewerHandle } from '~/shared/utils/viewerAdapters/psvAdapter'
import { getHotspotScreenPos } from '~/shared/utils/viewerAdapters/psvAdapter'
import { floorSpotPosition } from '~/shared/utils/viewerAdapters/floorCursor'
import { buildSceneGraph, scenePath, type VenueFloor } from '~/shared/utils/venue'
import type { VenueWalkRoute } from '~/components/viewer/VenueMapViewer.vue'

const props = defineProps<{
  plan: VenueWalkRoute
  handle: PsvViewerHandle | null
  activeSceneId: string | null
  /** Raw tour scenes (hotspots, names, floor-plan pins). */
  scenes: any[]
  floors: VenueFloor[]
  transitioning: boolean
}>()

const emit = defineEmits<{
  (e: 'walk', sceneId: string, yaw: number): void
  (e: 'rejoin', sceneId: string): void
  (e: 'show-map'): void
  (e: 'end'): void
}>()

const sceneById = computed(() => new Map(props.scenes.map((s: any) => [s.id, s])))
const sceneGraph = computed(() => buildSceneGraph(props.scenes))
const target = computed(() => props.plan.sceneIds[props.plan.sceneIds.length - 1])

const path = ref<string[]>([...props.plan.sceneIds])
watch(() => props.plan, p => { path.value = [...p.sceneIds] })

const index = computed(() => (props.activeSceneId ? path.value.indexOf(props.activeSceneId) : -1))
/** Last stop of the route visited, to get back to it when lost. */
const rejoinId = ref<string | null>(null)
watch(index, i => { if (i >= 0) rejoinId.value = path.value[i] }, { immediate: true })

// Wandered off: re-plan from here through the hotspots, else offer the way back.
watch(() => props.activeSceneId, id => {
  if (!id || path.value.includes(id)) return
  const again = scenePath(sceneGraph.value, props.floors, id, target.value)
  if (again.length) path.value = again
})
const offRoute = computed(() => !!props.activeSceneId && index.value < 0)
const arrived = computed(() => index.value >= 0 && index.value === path.value.length - 1)

const nextId = computed(() => (index.value >= 0 ? path.value[index.value + 1] ?? null : null))
const nextName = computed(() => sceneName(nextId.value))
const nextHotspot = computed(() => {
  const here = props.activeSceneId && sceneById.value.get(props.activeSceneId)
  const h = here && (here.hotspots ?? []).find((x: any) => x?.type === 'scene_link' && (x.target_scene_id ?? x.targetSceneId) === nextId.value)
  return h && typeof h.yaw === 'number' && typeof h.pitch === 'number' ? floorSpotPosition(h.yaw, h.pitch) : null
})

function sceneName(id: string | null): string {
  return (id && sceneById.value.get(id)?.name) || 'the next stop'
}
function floorOf(id: string | null) {
  const fid = id ? sceneById.value.get(id)?.floor_plan_id : null
  return props.floors.find(f => f.id === fid) ?? null
}
const changesFloor = computed(() => {
  const a = floorOf(props.activeSceneId), b = floorOf(nextId.value)
  return !!a && !!b && a.id !== b.id
})

const title = computed(() => {
  if (offRoute.value) return "You've left the route"
  if (arrived.value) return props.plan.status === 'full' ? `You've arrived at ${props.plan.destination}` : 'The 360° walk ends here'
  if (changesFloor.value) {
    const a = floorOf(props.activeSceneId)!, b = floorOf(nextId.value)!
    return `Go ${b.order > a.order ? 'up' : 'down'} to ${b.name}`
  }
  return `Head towards ${nextName.value}`
})
const subtitle = computed(() => {
  if (offRoute.value) return `No hotspots lead to ${props.plan.destination} from this view.`
  if (arrived.value) return props.plan.status === 'full' ? 'Look around, or open the map to go somewhere else.' : `${props.plan.destination} is a short walk from here. Follow the map for the last stretch.`
  return `Stop ${index.value + 1} of ${path.value.length} · To ${props.plan.destination}`
})

// ── Beacon / turn arrow, kept on the hotspot as the view moves ──
const beacon = ref<{ x: number; y: number } | null>(null)
const turn = ref<'left' | 'right' | null>(null)
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

function place() {
  const viewer = props.handle?.viewer
  const spot = nextHotspot.value
  if (!viewer || !spot || props.transitioning || arrived.value || offRoute.value) { beacon.value = null; turn.value = null; return }
  const pos = viewer.getPosition?.() ?? { yaw: 0, pitch: 0 }
  const hFov = ((viewer.state?.hFov ?? 90) * Math.PI) / 180
  const vFov = ((viewer.state?.vFov ?? 60) * Math.PI) / 180
  const dYaw = wrap(spot.yaw - pos.yaw)
  const inView = Math.abs(dYaw) < hFov * 0.45 && Math.abs(spot.pitch - pos.pitch) < vFov * 0.47
  if (inView) {
    const p = getHotspotScreenPos(props.handle, spot.yaw, spot.pitch)
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) { beacon.value = { x: p.x, y: p.y }; turn.value = null; return }
  }
  beacon.value = null
  // Which screen side is "more yaw": measured, not assumed.
  const probe = getHotspotScreenPos(props.handle, pos.yaw + 0.05, pos.pitch)
  const width = viewer.container?.clientWidth ?? window.innerWidth
  const yawGrowsRight = probe ? probe.x > width / 2 : true
  turn.value = (dYaw > 0) === yawGrowsRight ? 'right' : 'left'
}

let frame = 0
const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; place() }) }
let bound: any = null
function bind() {
  unbind()
  const viewer = props.handle?.viewer
  if (!viewer) return
  bound = viewer
  viewer.addEventListener('position-updated', schedule)
  viewer.addEventListener('zoom-updated', schedule)
  viewer.addEventListener('size-updated', schedule)
  schedule()
}
function unbind() {
  if (!bound) return
  bound.removeEventListener('position-updated', schedule)
  bound.removeEventListener('zoom-updated', schedule)
  bound.removeEventListener('size-updated', schedule)
  bound = null
}
watch(() => props.handle, bind, { immediate: true })
watch([nextHotspot, () => props.transitioning, arrived, offRoute], schedule)

/** Turn to face the hotspot to take (pitch a little down, where floor arrows sit). */
function faceNext() {
  const spot = nextHotspot.value
  if (!spot) return
  try { props.handle?.viewer?.animate({ yaw: spot.yaw, pitch: Math.max(-0.35, spot.pitch + 0.25), speed: '10rpm' }) } catch { /* noop */ }
}
// On arriving at each stop, face the way on once the arrival turn has settled.
let faceTimer: ReturnType<typeof setTimeout> | null = null
watch([index, () => props.transitioning], ([, moving]) => {
  if (faceTimer) clearTimeout(faceTimer)
  if (moving || arrived.value || offRoute.value) return
  faceTimer = setTimeout(faceNext, 900)
}, { immediate: true })

function goNext() {
  const id = nextId.value, spot = nextHotspot.value
  if (id && spot && !props.transitioning) emit('walk', id, spot.yaw)
}

onBeforeUnmount(() => {
  unbind()
  if (frame) cancelAnimationFrame(frame)
  if (faceTimer) clearTimeout(faceTimer)
})
</script>

<style scoped>
.rg { position: absolute; inset: 0; z-index: 40; pointer-events: none; font-family: inherit; }
.rg > * { pointer-events: auto; }

.rg-beacon { position: absolute; left: 0; top: 0; width: 0; height: 0; padding: 0; border: 0; background: none; cursor: pointer; }
.rg-beacon__ring, .rg-beacon__core { position: absolute; left: -36px; top: -36px; width: 72px; height: 72px; border-radius: 50%; }
.rg-beacon__ring { background: rgba(225, 29, 72, 0.35); animation: rg-pulse 1.6s ease-out infinite; }
.rg-beacon__core { display: grid; place-items: center; left: -28px; top: -28px; width: 56px; height: 56px; background: #e11d48; color: #fff; box-shadow: 0 0 0 4px #fff, 0 8px 24px rgba(0,0,0,0.35); }
.rg-beacon__label { position: absolute; left: 50%; bottom: 44px; transform: translateX(-50%); padding: 6px 12px; border-radius: 999px; background: #111827; color: #fff; font-size: 13px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.3); }
.rg-beacon:hover .rg-beacon__core { background: #be123c; }
@keyframes rg-pulse { from { transform: scale(0.7); opacity: 1; } to { transform: scale(1.9); opacity: 0; } }

.rg-turn { position: absolute; top: 50%; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 12px; border: 0; border-radius: 18px; background: rgba(17, 24, 39, 0.82); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transform: translateY(-50%); box-shadow: 0 8px 24px rgba(0,0,0,0.3); animation: rg-nudge 1.4s ease-in-out infinite; }
.rg-turn svg { color: #fb7185; }
.rg-turn--left { left: calc(14px + env(safe-area-inset-left, 0px)); --dx: -6px; }
.rg-turn--right { right: calc(14px + env(safe-area-inset-right, 0px)); --dx: 6px; }
@keyframes rg-nudge { 50% { transform: translate(var(--dx), -50%); } }

.rg-card { position: absolute; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); width: min(440px, calc(100% - 24px)); padding: 12px; border-radius: 18px; background: #fff; color: #111827; transform: translateX(-50%); box-shadow: 0 10px 32px rgba(0,0,0,0.3); }
.rg-card__top { display: flex; align-items: center; gap: 12px; }
.rg-card__icon { flex-shrink: 0; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: #e11d48; color: #fff; }
.rg-card__icon--done { background: #16a34a; }
.rg-card__text { flex: 1; min-width: 0; }
.rg-card__title { margin: 0; font-size: 16px; font-weight: 800; line-height: 1.25; }
.rg-card__sub { margin: 2px 0 0; font-size: 13px; color: #6b7280; line-height: 1.35; }
.rg-x { flex-shrink: 0; align-self: flex-start; width: 32px; height: 32px; border: 0; border-radius: 10px; background: transparent; color: #6b7280; font-size: 22px; line-height: 1; cursor: pointer; }
.rg-x:hover { background: #f3f4f6; }
.rg-progress { height: 4px; margin: 10px 0 0; border-radius: 4px; background: #f3f4f6; overflow: hidden; }
.rg-progress i { display: block; height: 100%; background: #e11d48; transition: width 0.4s; }
.rg-card__actions { display: flex; gap: 8px; margin-top: 10px; }
.rg-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 42px; border: 0; border-radius: 12px; background: #111827; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
.rg-btn:hover { background: #1f2937; }
.rg-btn:disabled { opacity: 0.5; cursor: default; }
.rg-btn--ghost { flex: 0 0 auto; padding: 0 14px; background: #f3f4f6; color: #111827; }
.rg-btn--ghost:hover { background: #e5e7eb; }

@media (prefers-reduced-motion: reduce) {
  .rg-beacon__ring, .rg-turn { animation: none; }
}
</style>
