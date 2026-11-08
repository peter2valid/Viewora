<template>
  <div ref="rootEl" class="vp" :class="{ 'is-preview': preview }" @dragover.prevent @drop.prevent="onRootDrop">
    <input ref="oneInput" type="file" accept="image/jpeg,image/png,image/webp" class="vp-hidden" @change="onOne" />
    <input ref="manyInput" type="file" accept="image/jpeg,image/png,image/webp" multiple class="vp-hidden" @change="onMany" />

    <!-- Toolbar: always on screen, so the editor looks and feels ready before the photos arrive. -->
    <header class="vp-bar">
      <div class="vp-bar__title">
        <NuxtLink to="/app/spaces" class="vp-back" aria-label="Back to spaces">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </NuxtLink>
        <div>
          <h1 class="vp-h1">Car exterior</h1>
          <p class="vp-sub vp-num">
            <template v-if="!loaded">Loading photos…</template>
            <template v-else>{{ views.length }} photo{{ views.length === 1 ? '' : 's' }} · {{ filledSlots }} of {{ VEHICLE_SLOTS.length }} main angles · {{ hotspotTotal }} hotspot{{ hotspotTotal === 1 ? '' : 's' }}</template>
          </p>
        </div>
      </div>

      <div class="vp-tools" role="toolbar" aria-label="Car exterior tools">
        <button class="vp-btn" :class="{ 'is-on': placing }" :disabled="!current || preview" :aria-pressed="placing" @click="togglePlacing" title="Press H">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
          {{ placing ? 'Tap the photo…' : 'Add hotspot' }}
        </button>
        <button class="vp-btn" :disabled="views.length < 2 || aiBusy === 'sort' || preview" @click="runAiSort">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/></svg>
          {{ aiBusy === 'sort' ? 'Sorting…' : 'AI sort photos' }}
        </button>
        <button class="vp-btn" :disabled="!current || aiBusy === 'hotspots' || preview" @click="runAiHotspots">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z"/></svg>
          {{ aiBusy === 'hotspots' ? 'Looking…' : 'AI suggest hotspots' }}
        </button>
        <button class="vp-btn" :class="{ 'is-on': preview }" :disabled="!views.length" :aria-pressed="preview" @click="togglePreview">
          {{ preview ? 'Back to editing' : 'Preview as buyer' }}
        </button>
        <button class="vp-btn vp-btn--primary" :disabled="busy || views.length >= VEHICLE_MAX_VIEWS" @click="manyInput?.click()">
          Add photos
        </button>
      </div>
    </header>

    <p v-if="setupError" class="vp-alert vp-alert--error" role="alert">
      {{ setupError }}
      <button class="vp-linkbtn" @click="init">Try again</button>
    </p>
    <p v-else-if="notice" class="vp-alert" role="status">
      {{ notice }}
      <button v-if="noticeAction" class="vp-linkbtn" @click="noticeAction.run()">{{ noticeAction.label }}</button>
      <button class="vp-linkbtn" @click="clearNotice">Dismiss</button>
    </p>

    <div class="vp-main">
      <!-- Canvas -->
      <section class="vp-stage" aria-label="Photo canvas">
        <div class="vp-canvas">
          <template v-if="!loaded && !setupError">
            <div class="vp-skeleton" aria-busy="true" aria-label="Loading photos"><span class="vp-spin" /></div>
          </template>

          <template v-else-if="!views.length">
            <div class="vp-empty">
              <p class="vp-empty__title">Start with the front of the car</p>
              <p class="vp-empty__text">
                Normal photos are enough. Walk around the car and take each angle from the same distance, then add them all at once, in this order:
              </p>
              <ol class="vp-empty__order">
                <li v-for="s in VEHICLE_SLOTS" :key="s.key">{{ s.label }}</li>
              </ol>
              <button class="vp-btn vp-btn--primary" :disabled="busy" @click="manyInput?.click()">Add photos</button>
              <p class="vp-hint">You can also drop photos here. Out of order? <strong>AI sort</strong> fixes it.</p>
            </div>
          </template>

          <VehicleSpinViewer
            v-else
            :views="views"
            :index="viewerIndex"
            :fit="preview ? 'cover' : 'contain'"
            :editable="!preview"
            :placing="placing && !preview"
            :hide-bar="!preview"
            :selected-hotspot-id="selectedHotspotId"
            @update:index="onViewerIndex"
            @place="onPlace"
            @select-hotspot="onSelectHotspot"
            @move-hotspot="onMoveHotspot"
          />
        </div>

        <!-- Dock: every angle in walk-around order. Click to open, drop a photo on a slot to fill it, drag one onto another to swap. -->
        <ul class="vp-dock" aria-label="Photo angles">
          <template v-if="!loaded">
            <li v-for="n in 8" :key="n" class="vp-dock__item"><div class="vp-thumb vp-thumb--skeleton" /></li>
          </template>
          <li v-for="item in dockItems" v-else :key="item.key" class="vp-dock__item">
            <button
              v-if="item.view"
              class="vp-thumb"
              :class="{ 'is-active': item.view.id === selectedId, 'is-dragover': dragOverKey === item.key }"
              draggable="true"
              :aria-label="`${viewLabel(item.view)}, ${item.view.angle} degrees${(item.view.hotspots?.length ?? 0) ? ', ' + item.view.hotspots!.length + ' hotspots' : ''}`"
              :aria-current="item.view.id === selectedId ? 'true' : undefined"
              @click="selectView(item.view.id)"
              @dragstart="onDragStart($event, item.view.id)"
              @dragend="dragOverKey = ''"
              @dragover.prevent="dragOverKey = item.key"
              @dragleave="dragOverKey = ''"
              @drop.prevent.stop="onDropOn($event, item)"
            >
              <img :src="item.view.image_url" :alt="''" loading="lazy" draggable="false" />
              <span v-if="pendingAngles.has(item.view.angle)" class="vp-thumb__busy"><span class="vp-spin vp-spin--sm" /></span>
              <span v-if="item.view.hotspots?.length" class="vp-thumb__count vp-num">{{ item.view.hotspots.length }}</span>
              <span class="vp-thumb__label">{{ viewLabel(item.view) }}</span>
            </button>
            <button
              v-else
              class="vp-thumb vp-thumb--empty"
              :class="{ 'is-dragover': dragOverKey === item.key }"
              :disabled="busy"
              :aria-label="`Add ${item.slot!.label} photo`"
              @click="pick(item.slot!.angle)"
              @dragover.prevent="dragOverKey = item.key"
              @dragleave="dragOverKey = ''"
              @drop.prevent.stop="onDropOn($event, item)"
            >
              <span v-if="pendingAngles.has(item.slot!.angle)" class="vp-spin vp-spin--sm" />
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              <span class="vp-thumb__label">{{ item.slot!.label }}</span>
            </button>
          </li>
        </ul>
      </section>

      <!-- Side panel -->
      <aside v-if="!preview" class="vp-side" aria-label="Selected photo">
        <template v-if="current">
          <section class="vp-sec">
            <h2 class="vp-h2">{{ viewLabel(current) }}</h2>
            <p class="vp-muted vp-num">{{ current.angle }}° around the car</p>

            <label class="vp-label" for="vp-pos">Position</label>
            <select id="vp-pos" class="vp-select" :value="current.angle" :disabled="busy" @change="onPositionChange(Number(($event.target as HTMLSelectElement).value))">
              <option v-for="o in positionOptions" :key="o.angle" :value="o.angle">{{ o.text }}</option>
            </select>
            <p class="vp-hint">Choose a taken position to swap the two photos.</p>

            <div class="vp-row">
              <button class="vp-btn" :disabled="busy" @click="pick(current.angle, current.id)">Replace photo</button>
              <button class="vp-btn vp-btn--danger" :disabled="busy" @click="confirmRemove">{{ removeArmed ? 'Tap again to remove' : 'Remove' }}</button>
            </div>
          </section>

          <section class="vp-sec">
            <div class="vp-sec__head">
              <h2 class="vp-h2">Hotspots on this photo</h2>
              <span class="vp-muted vp-num">{{ currentHotspots.length }} / {{ MAX_HOTSPOTS_PER_VIEW }}</span>
            </div>

            <p v-if="!currentHotspots.length && !aiDrafts.length" class="vp-muted">
              None yet. Press <strong>Add hotspot</strong>, then tap the part of the car. Good ones: alloy wheels, roof rails, a scratch you are upfront about.
            </p>

            <ul v-if="currentHotspots.length" class="vp-hlist">
              <li v-for="h in currentHotspots" :key="h.id">
                <button class="vp-hitem" :class="{ 'is-active': h.id === selectedHotspotId }" @click="selectedHotspotId = h.id">
                  <span class="vp-kind" :class="`vp-kind--${h.kind}`" aria-hidden="true">{{ h.kind === 'damage' ? '!' : h.kind === 'link' ? '↗' : h.kind === 'info' ? 'i' : '+' }}</span>
                  <span class="vp-hitem__t">{{ h.title }}</span>
                  <span class="vp-hitem__k">{{ hotspotKindLabel(h.kind) }}</span>
                </button>
              </li>
            </ul>

            <!-- AI suggestions: review, then add. Nothing is saved until you do. -->
            <div v-if="aiDrafts.length" class="vp-drafts">
              <p class="vp-label">AI suggestions. Check them against the photo.</p>
              <ul class="vp-hlist">
                <li v-for="(d, i) in aiDrafts" :key="i" class="vp-draft">
                  <label class="vp-check">
                    <input v-model="d.on" type="checkbox" />
                    <span><strong>{{ d.title }}</strong> <span class="vp-muted">· {{ hotspotKindLabel(d.kind) }}</span><br /><span class="vp-muted">{{ d.body }}</span></span>
                  </label>
                </li>
              </ul>
              <div class="vp-row">
                <button class="vp-btn vp-btn--primary" :disabled="busy || !aiDrafts.some(d => d.on)" @click="addDrafts">Add selected</button>
                <button class="vp-btn" @click="aiDrafts = []">Discard</button>
              </div>
            </div>
          </section>

          <section v-if="selectedHotspot" class="vp-sec" aria-label="Edit hotspot">
            <div class="vp-sec__head">
              <h2 class="vp-h2">Edit hotspot</h2>
              <span class="vp-muted" aria-live="polite">{{ saveState }}</span>
            </div>
            <fieldset class="vp-seg" aria-label="Hotspot type">
              <button v-for="k in HOTSPOT_KINDS" :key="k.kind" type="button" class="vp-seg__btn" :class="{ 'is-on': selectedHotspot.kind === k.kind }" :aria-pressed="selectedHotspot.kind === k.kind" @click="editHotspot({ kind: k.kind })">{{ k.label }}</button>
            </fieldset>
            <p class="vp-hint">{{ HOTSPOT_KINDS.find(k => k.kind === selectedHotspot!.kind)?.hint }}</p>

            <label class="vp-label" for="vp-h-title">Title</label>
            <input id="vp-h-title" ref="titleInput" class="vp-input" maxlength="60" :value="selectedHotspot.title" @input="editHotspot({ title: ($event.target as HTMLInputElement).value })" />

            <label class="vp-label" for="vp-h-body">Note <span class="vp-muted">optional</span></label>
            <textarea id="vp-h-body" class="vp-input vp-textarea" maxlength="400" rows="3" :value="selectedHotspot.body ?? ''" @input="editHotspot({ body: ($event.target as HTMLTextAreaElement).value })" />

            <label class="vp-label" for="vp-h-url">Link <span class="vp-muted">optional, https://…</span></label>
            <input id="vp-h-url" class="vp-input" type="url" inputmode="url" placeholder="https://" :value="selectedHotspot.url ?? ''" @input="editHotspot({ url: ($event.target as HTMLInputElement).value })" />
            <p v-if="urlError" class="vp-error">{{ urlError }}</p>

            <p class="vp-hint">Drag the pin on the photo to move it.</p>
            <div class="vp-row">
              <button class="vp-btn vp-btn--danger" @click="removeSelectedHotspot">Delete hotspot</button>
              <button class="vp-btn" @click="selectedHotspotId = null">Done</button>
            </div>
          </section>
        </template>

        <section v-else class="vp-sec">
          <h2 class="vp-h2">How this works</h2>
          <ol class="vp-steps">
            <li>Add photos of every side of the car.</li>
            <li>Buyers drag left and right to turn it.</li>
            <li>Pin features and marks so buyers know what they are looking at.</li>
          </ol>
        </section>

        <p v-if="gapText" class="vp-gap">{{ gapText }}</p>

        <div class="vp-next">
          <NuxtLink :to="{ query: { tab: 'tour' } }" class="vp-link">Next: Interior 360° (optional) →</NuxtLink>
          <NuxtLink :to="{ query: { tab: 'details' } }" class="vp-link">Then: Details &amp; Publish →</NuxtLink>
        </div>
      </aside>
    </div>

    <!-- AI sort review -->
    <div v-if="sortReview" class="vp-modal" role="dialog" aria-modal="true" aria-label="Review AI sort" @keydown.esc="sortReview = null">
      <div class="vp-modal__box">
        <h2 class="vp-h2">AI sorted your photos</h2>
        <p class="vp-muted">
          {{ sortChanges.length ? `${sortChanges.length} photo${sortChanges.length === 1 ? '' : 's'} would move. Check them, then apply.` : 'Everything is already in the right place.' }}
        </p>
        <ul class="vp-sortlist">
          <li v-for="r in sortReview" :key="r.id" class="vp-sortrow">
            <img :src="r.image_url" alt="" />
            <span class="vp-sortrow__t">
              <template v-if="r.suggested === null">Not an outside shot. Left as is.</template>
              <template v-else-if="r.suggested === r.current"><strong>{{ r.name }}</strong> · stays</template>
              <template v-else><strong>{{ r.name }}</strong> · {{ r.current }}° → {{ r.suggested }}°</template>
            </span>
          </li>
        </ul>
        <div class="vp-row">
          <button class="vp-btn vp-btn--primary" :disabled="busy || !sortChanges.length" @click="applySort">Apply {{ sortChanges.length }} change{{ sortChanges.length === 1 ? '' : 's' }}</button>
          <button class="vp-btn" @click="sortReview = null">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import VehicleSpinViewer from '~/features/viewer/car/VehicleSpinViewer.vue'
import { useVehicleViews, type AngleSuggestion } from '~/features/vehicle/useVehicleViews'
import {
  VEHICLE_SLOTS, VEHICLE_MAX_VIEWS, MAX_HOTSPOTS_PER_VIEW, HOTSPOT_KINDS,
  viewLabel, nearestSlot, hotspotKindLabel, slotGaps, swapAngles,
  type VehicleView, type VehicleSlot, type VehicleHotspotKind,
} from '~/shared/utils/vehicleViews'

const props = defineProps<{ spaceId: string }>()

const {
  views, loaded, load, addView, removeView, replaceView, applyAngles,
  createHotspot, updateHotspot, deleteHotspot, aiSortSuggestions, aiHotspotSuggestions,
} = useVehicleViews(props.spaceId)

const rootEl = ref<HTMLElement | null>(null)
const oneInput = ref<HTMLInputElement | null>(null)
const manyInput = ref<HTMLInputElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)

const setupError = ref('')
const busy = ref(false)
const pendingAngles = ref<Set<number>>(new Set())
const preview = ref(false)
const placing = ref(false)
const selectedId = ref<string | null>(null)
const selectedHotspotId = ref<string | null>(null)
const dragOverKey = ref('')
const removeArmed = ref(false)
let removeTimer: ReturnType<typeof setTimeout> | undefined

// ── Notices ──
const notice = ref('')
const noticeAction = ref<{ label: string; run: () => void } | null>(null)
function setNotice(text: string, action?: { label: string; run: () => void }) { notice.value = text; noticeAction.value = action ?? null }
function clearNotice() { notice.value = ''; noticeAction.value = null }

function errMsg(e: any, fallback: string) {
  return e?.data?.statusMessage || e?.response?._data?.statusMessage || e?.message || fallback
}

// ── Load ──
async function init() {
  setupError.value = ''
  try {
    await load()
    if (!selectedId.value && views.value.length) selectedId.value = views.value[0].id
  } catch (e: any) {
    const m = errMsg(e, '')
    setupError.value = /not found|relation|schema|42P01/i.test(m)
      ? 'The car photo tables are not ready on the server yet. Ask your admin to run the car photo database update, then try again.'
      : `Could not load the car photos${m ? ` (${m})` : ''}. Check your connection and try again.`
  }
}
onMounted(() => { init(); window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); if (removeTimer) clearTimeout(removeTimer) })

// ── Derived ──
const slotAngles = new Set(VEHICLE_SLOTS.map(s => s.angle))
const filledSlots = computed(() => VEHICLE_SLOTS.filter(s => views.value.some(v => v.angle === s.angle)).length)
const hotspotTotal = computed(() => views.value.reduce((n, v) => n + (v.hotspots?.length ?? 0), 0))
const current = computed<VehicleView | null>(() => views.value.find(v => v.id === selectedId.value) ?? null)
const currentHotspots = computed(() => current.value?.hotspots ?? [])
const selectedHotspot = computed(() => currentHotspots.value.find(h => h.id === selectedHotspotId.value) ?? null)
const viewerIndex = computed(() => Math.max(0, views.value.findIndex(v => v.id === selectedId.value)))

interface DockItem { key: string; angle: number; view?: VehicleView; slot?: VehicleSlot }
const dockItems = computed<DockItem[]>(() => {
  const items: DockItem[] = views.value.map(v => ({ key: v.id, angle: v.angle, view: v }))
  for (const s of VEHICLE_SLOTS) if (!views.value.some(v => v.angle === s.angle)) items.push({ key: `slot-${s.key}`, angle: s.angle, slot: s })
  return items.sort((a, b) => a.angle - b.angle || (a.view ? -1 : 1))
})

const positionOptions = computed(() => {
  const taken = new Map(views.value.map(v => [v.angle, v]))
  const out: Array<{ angle: number; text: string }> = []
  const seen = new Set<number>()
  const add = (angle: number) => {
    if (seen.has(angle)) return
    seen.add(angle)
    const t = taken.get(angle)
    const slot = VEHICLE_SLOTS.find(s => s.angle === angle)
    const name = slot ? slot.label : `${angle}° near ${nearestSlot(angle).label.toLowerCase()}`
    out.push({ angle, text: `${name}${t && t.id !== current.value?.id ? ' (swap with that photo)' : ''}` })
  }
  VEHICLE_SLOTS.forEach(s => add(s.angle))
  for (let a = 0; a < 360; a += 15) add(a)
  if (current.value) add(current.value.angle)
  return out.sort((x, y) => x.angle - y.angle)
})

const gapText = computed(() => {
  if (!loaded.value || !views.value.length) return ''
  const { missing, duplicates } = slotGaps(views.value)
  const bits: string[] = []
  if (missing.length) bits.push(`Still missing: ${missing.map(m => m.label.toLowerCase()).join(', ')}. The car still turns without them, just less smoothly.`)
  if (duplicates.length) bits.push(`Two photos share ${duplicates.map(d => `${d}°`).join(', ')}. Move one to a free position.`)
  return bits.join(' ')
})

// ── Selection / viewer sync ──
watch(views, (list) => {
  if (!list.length) { selectedId.value = null; return }
  if (!list.some(v => v.id === selectedId.value)) selectedId.value = list[0].id
})
function selectView(id: string) { selectedId.value = id; selectedHotspotId.value = null; removeArmed.value = false }
function onViewerIndex(i: number) {
  const v = views.value[i]
  if (v && v.id !== selectedId.value) { selectedId.value = v.id; selectedHotspotId.value = null; removeArmed.value = false }
}

// ── Busy wrapper ──
async function withBusy(angle: number | null, fn: () => Promise<unknown>, fail = 'Something went wrong') {
  busy.value = true
  if (angle !== null) pendingAngles.value = new Set(pendingAngles.value).add(angle)
  try {
    await fn()
    return true
  } catch (e: any) {
    const m = errMsg(e, fail)
    setNotice(`${m}. Nothing was lost; try again.`)
    toast.error(m)
    return false
  } finally {
    if (angle !== null) { const n = new Set(pendingAngles.value); n.delete(angle); pendingAngles.value = n }
    busy.value = false
  }
}

// ── Uploading ──
let pickAngle = 0
let pickReplaceId: string | undefined
function pick(angle: number, replaceId?: string) {
  pickAngle = angle
  pickReplaceId = replaceId
  if (oneInput.value) { oneInput.value.value = ''; oneInput.value.click() }
}

async function onOne(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  await uploadOne(file, pickAngle, pickReplaceId)
}

async function uploadOne(file: File, angle: number, replaceId?: string) {
  const ok = await withBusy(angle, async () => {
    if (replaceId) {
      await replaceView(replaceId, file)
    } else {
      const created = await addView(file, angle)
      selectedId.value = created.id
    }
  }, 'Upload failed')
  if (ok && replaceId) selectedId.value = views.value.find(v => v.angle === angle)?.id ?? selectedId.value
}

/** Free angles in the order new photos should take them: empty main slots first, then spare 15° steps. */
function freeAngles(): number[] {
  const used = new Set(views.value.map(v => v.angle))
  const main = VEHICLE_SLOTS.map(s => s.angle).filter(a => !used.has(a))
  const spare: number[] = []
  for (let a = 15; a < 360; a += 15) if (!slotAngles.has(a) && !used.has(a)) spare.push(a)
  return [...main, ...spare]
}

async function addMany(files: File[]) {
  const free = freeAngles()
  const room = Math.min(free.length, VEHICLE_MAX_VIEWS - views.value.length)
  const take = files.slice(0, room)
  if (files.length > take.length) setNotice(`Only room for ${take.length} more photo${take.length === 1 ? '' : 's'} (up to ${VEHICLE_MAX_VIEWS}). The rest were skipped.`)
  let added = 0
  for (let i = 0; i < take.length; i++) {
    const ok = await withBusy(free[i], async () => {
      const created = await addView(take[i], free[i])
      if (!selectedId.value || i === 0) selectedId.value = created.id
    }, 'Upload failed')
    if (!ok) break
    added++
  }
  if (added > 1 && views.value.length > 1) {
    setNotice(`Added ${added} photos in the order you picked them. Not in the right order?`, { label: 'Sort with AI', run: runAiSort })
  }
}

async function onMany(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  ;(e.target as HTMLInputElement).value = ''
  if (files.length) await addMany(files)
}

function imageFiles(dt: DataTransfer | null): File[] {
  return Array.from(dt?.files ?? []).filter(f => f.type.startsWith('image/'))
}

async function onRootDrop(e: DragEvent) {
  const files = imageFiles(e.dataTransfer)
  if (files.length) await addMany(files)
}

// ── Dock drag: drop a photo file on a slot, or drag one photo onto another to swap ──
function onDragStart(e: DragEvent, id: string) {
  e.dataTransfer?.setData('text/x-vehicle-view', id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

async function onDropOn(e: DragEvent, target: DockItem) {
  dragOverKey.value = ''
  const files = imageFiles(e.dataTransfer)
  if (files.length) {
    // A file dropped on a slot fills that slot (or replaces the photo there).
    await uploadOne(files[0], target.angle, target.view?.id)
    return
  }
  const fromId = e.dataTransfer?.getData('text/x-vehicle-view')
  const from = views.value.find(v => v.id === fromId)
  if (!from || from.angle === target.angle) return
  if (target.view) await moveTo(from, target.angle, target.view)
  else await moveTo(from, target.angle)
}

async function moveTo(view: VehicleView, angle: number, occupant?: VehicleView) {
  const items = (occupant ? swapAngles(view, occupant) : [{ id: view.id, angle }]).map(i => ({ ...i, label: null }))
  await withBusy(null, () => applyAngles(items), 'Could not move the photo')
}

function onPositionChange(angle: number) {
  const v = current.value
  if (!v || v.angle === angle) return
  const occupant = views.value.find(x => x.angle === angle && x.id !== v.id)
  moveTo(v, angle, occupant)
}

function confirmRemove() {
  const v = current.value
  if (!v) return
  if (!removeArmed.value) {
    removeArmed.value = true
    removeTimer = setTimeout(() => { removeArmed.value = false }, 4000)
    return
  }
  removeArmed.value = false
  withBusy(v.angle, () => removeView(v.id), 'Could not remove the photo')
}

// ── Hotspots ──
function togglePlacing() {
  if (!current.value || preview.value) return
  placing.value = !placing.value
  if (placing.value) selectedHotspotId.value = null
}
function togglePreview() {
  preview.value = !preview.value
  placing.value = false
  selectedHotspotId.value = null
}

const DEFAULT_TITLES: Record<VehicleHotspotKind, string> = { feature: 'New feature', damage: 'Mark', info: 'Note', link: 'Link' }

async function onPlace({ viewId, x, y }: { viewId: string; x: number; y: number }) {
  placing.value = false
  const v = views.value.find(i => i.id === viewId)
  if ((v?.hotspots?.length ?? 0) >= MAX_HOTSPOTS_PER_VIEW) { setNotice(`Up to ${MAX_HOTSPOTS_PER_VIEW} hotspots per photo.`); return }
  let id = ''
  const ok = await withBusy(null, async () => {
    const h = await createHotspot(viewId, { kind: 'feature', x, y, title: DEFAULT_TITLES.feature })
    id = h.id
  }, 'Could not add the hotspot')
  if (ok && id) {
    selectedHotspotId.value = id
    await nextTick()
    titleInput.value?.focus()
    titleInput.value?.select()
  }
}

function onSelectHotspot({ viewId, id }: { viewId: string; id: string }) {
  if (viewId !== selectedId.value) selectedId.value = viewId
  selectedHotspotId.value = id
  placing.value = false
}

async function onMoveHotspot({ viewId, id, x, y }: { viewId: string; id: string; x: number; y: number }) {
  selectedHotspotId.value = id
  await withBusy(null, () => updateHotspot(viewId, id, { x, y }), 'Could not move the hotspot')
}

// Edits are saved shortly after typing stops, so there is no Save button to forget.
const saveState = ref('')
const urlError = ref('')
let saveTimer: ReturnType<typeof setTimeout> | undefined
let pendingPatch: Record<string, any> = {}

function editHotspot(patch: Record<string, any>) {
  const h = selectedHotspot.value
  const v = current.value
  if (!h || !v) return
  if ('url' in patch) {
    const u = String(patch.url ?? '').trim()
    if (u && !/^https?:\/\/\S+$/i.test(u)) { urlError.value = 'Start the link with https://'; delete patch.url }
    else { urlError.value = ''; patch.url = u || null }
  }
  if ('title' in patch && !String(patch.title).trim()) { saveState.value = 'Title is needed'; delete patch.title }
  if ('body' in patch) patch.body = String(patch.body).trim() || null
  if (!Object.keys(patch).length) return

  // Show it at once; send it after a pause.
  v.hotspots = (v.hotspots ?? []).map(x => (x.id === h.id ? { ...x, ...patch } : x))
  pendingPatch = { ...pendingPatch, ...patch }
  saveState.value = 'Saving…'
  if (saveTimer) clearTimeout(saveTimer)
  const viewId = v.id
  const id = h.id
  saveTimer = setTimeout(async () => {
    const send = pendingPatch
    pendingPatch = {}
    try {
      await updateHotspot(viewId, id, send)
      saveState.value = 'Saved'
    } catch (e: any) {
      saveState.value = 'Not saved'
      setNotice(`${errMsg(e, 'Could not save the hotspot')}. Try again.`)
    }
  }, 500)
}

function removeSelectedHotspot() {
  const h = selectedHotspot.value
  const v = current.value
  if (!h || !v) return
  selectedHotspotId.value = null
  withBusy(null, () => deleteHotspot(v.id, h.id), 'Could not delete the hotspot')
}

// ── AI ──
const aiBusy = ref<'' | 'sort' | 'hotspots'>('')
interface SortRow { id: string; image_url: string; name: string; current: number; suggested: number | null; label: string | null }
const sortReview = ref<SortRow[] | null>(null)
const sortChanges = computed(() => (sortReview.value ?? []).filter(r => r.suggested !== null && r.suggested !== r.current))

async function runAiSort() {
  clearNotice()
  aiBusy.value = 'sort'
  try {
    const suggestions: AngleSuggestion[] = await aiSortSuggestions()
    const byId = new Map(suggestions.map(s => [s.id, s]))
    sortReview.value = views.value.map((v) => {
      const s = byId.get(v.id)
      const suggested = s ? s.angle : v.angle
      return { id: v.id, image_url: v.image_url, name: s?.label || viewLabel(v), current: v.angle, suggested, label: s?.label ?? null }
    })
  } catch (e: any) {
    setNotice(errMsg(e, 'AI could not sort the photos right now. You can still order them by hand.'))
  } finally {
    aiBusy.value = ''
  }
}

async function applySort() {
  const rows = sortChanges.value
  if (!rows.length) return
  const ok = await withBusy(null, () => applyAngles(rows.map(r => ({ id: r.id, angle: r.suggested as number, label: r.label }))), 'Could not apply the new order')
  if (ok) {
    sortReview.value = null
    const dup = slotGaps(views.value).duplicates
    setNotice(dup.length
      ? `Sorted. Two photos ended up at ${dup.map(d => `${d}°`).join(', ')}; move one to a free position.`
      : 'Sorted. Check the order by dragging the car around.')
  }
}

interface Draft { kind: VehicleHotspotKind; x: number; y: number; title: string; body: string | null; on: boolean }
const aiDrafts = ref<Draft[]>([])

async function runAiHotspots() {
  const v = current.value
  if (!v) return
  clearNotice()
  aiBusy.value = 'hotspots'
  try {
    const s = await aiHotspotSuggestions(v.id)
    aiDrafts.value = s.map(d => ({ ...d, on: true }))
    if (!s.length) setNotice('AI found nothing worth pinning on this photo. Add hotspots by hand if you like.')
  } catch (e: any) {
    setNotice(errMsg(e, 'AI could not look at this photo right now. Try again shortly.'))
  } finally {
    aiBusy.value = ''
  }
}

async function addDrafts() {
  const v = current.value
  if (!v) return
  const picked = aiDrafts.value.filter(d => d.on)
  const room = MAX_HOTSPOTS_PER_VIEW - (v.hotspots?.length ?? 0)
  const ok = await withBusy(null, async () => {
    for (const d of picked.slice(0, Math.max(0, room))) {
      await createHotspot(v.id, { kind: d.kind, x: d.x, y: d.y, title: d.title, body: d.body })
    }
  }, 'Could not add the hotspots')
  if (ok) {
    aiDrafts.value = []
    setNotice('Added. AI pins can be a little off: drag any pin onto the exact spot.')
  }
}
// Suggestions belong to one photo.
watch(selectedId, () => { aiDrafts.value = [] })

// ── Keyboard ──
function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}
function onKey(e: KeyboardEvent) {
  // Only while this tab is on screen (the panel stays mounted when you switch tabs).
  if (!rootEl.value || rootEl.value.offsetParent === null || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === 'h' || e.key === 'H') { e.preventDefault(); togglePlacing() }
  else if (e.key === 'Escape') { placing.value = false; selectedHotspotId.value = null }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedHotspot.value) { e.preventDefault(); removeSelectedHotspot() }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const list = views.value
    if (list.length < 2) return
    const i = list.findIndex(v => v.id === selectedId.value)
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length
    selectView(list[n].id)
    e.preventDefault()
  }
}

defineExpose({ reload: init })
</script>

<style scoped>
.vp {
  /* Starts below the fixed tab bar, so the page scrolls under the bar instead of behind it. */
  position: absolute; inset: 124px 0 0 0; overflow-y: auto; background: #0e0e10; color: #f2f2f3;
  padding: 4px 16px 24px; display: flex; flex-direction: column; gap: 12px;
}
@media (max-width: 640px) { .vp { top: 98px; } }
.vp-hidden { display: none; }
.vp-num { font-variant-numeric: tabular-nums; }

.vp-bar { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center; justify-content: space-between; max-width: 1280px; width: 100%; margin: 0 auto; }
.vp-bar__title { display: flex; gap: 12px; align-items: center; min-width: 0; }
.vp-back { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; color: #fff; background: rgba(255,255,255,0.08); flex: none; }
.vp-h1 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
.vp-sub { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.6); }
.vp-tools { display: flex; flex-wrap: wrap; gap: 8px; }
/* One scrolling row on phones, so the photo is on screen straight away. */
@media (max-width: 640px) {
  .vp-tools { flex-wrap: nowrap; overflow-x: auto; width: 100%; padding-bottom: 4px; scrollbar-width: none; }
  .vp-tools .vp-btn { flex: none; }
  .vp-tools .vp-btn--primary { order: -1; }
}

.vp-btn {
  min-height: 44px; padding: 0 14px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer;
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.09); color: #fff; border: 1px solid rgba(255,255,255,0.12);
  transition: background 120ms;
}
.vp-btn:hover:not(:disabled) { background: rgba(255,255,255,0.17); }
.vp-btn:active:not(:disabled) { background: rgba(255,255,255,0.25); }
.vp-btn:focus-visible, .vp-thumb:focus-visible, .vp-hitem:focus-visible, .vp-seg__btn:focus-visible, .vp-select:focus-visible, .vp-input:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.vp-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.vp-btn.is-on { background: #fff; color: #0e0e10; border-color: #fff; }
.vp-btn--primary { background: #fff; color: #0e0e10; border-color: #fff; }
.vp-btn--primary:hover:not(:disabled) { background: #e6e6e8; }
.vp-btn--danger { color: #ff9b9b; }
.vp-linkbtn { background: none; border: 0; padding: 0 6px; min-height: 44px; color: #fff; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; font-size: 13px; }

.vp-alert {
  max-width: 1280px; width: 100%; margin: 0 auto; padding: 4px 12px; border-radius: 10px; font-size: 13px;
  background: rgba(255,255,255,0.08); display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px;
}
.vp-alert--error { background: rgba(255,90,90,0.14); color: #ffb4b4; }

.vp-main { max-width: 1280px; width: 100%; margin: 0 auto; display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); flex: 1; min-height: 0; }
@media (min-width: 1000px) { .vp-main { grid-template-columns: minmax(0, 1fr) 340px; } }
.vp.is-preview .vp-main { grid-template-columns: minmax(0, 1fr); }

.vp-stage { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.vp-canvas {
  position: relative; border-radius: 14px; overflow: hidden; background: #0b0b0c; border: 1px solid rgba(255,255,255,0.08);
  height: 46vh; min-height: 280px;
}
@media (min-width: 1000px) { .vp-canvas { height: auto; aspect-ratio: 4 / 3; max-height: calc(100vh - 360px); width: 100%; } }
.vp-skeleton { position: absolute; inset: 0; display: grid; place-items: center; background: linear-gradient(90deg, #111 0, #17171a 50%, #111 100%); background-size: 200% 100%; animation: vp-shimmer 1.4s linear infinite; }
@keyframes vp-shimmer { to { background-position: -200% 0; } }

.vp-empty { position: absolute; inset: 0; padding: 20px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 12px; overflow-y: auto; }
.vp-empty__title { margin: 0; font-size: 18px; font-weight: 800; }
.vp-empty__text { margin: 0; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.7); max-width: 52ch; }
.vp-empty__order { margin: 0; padding-left: 20px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 20px; font-size: 13px; color: rgba(255,255,255,0.85); }

.vp-dock { list-style: none; margin: 0; padding: 2px 2px 6px; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: thin; }
.vp-dock__item { flex: none; }
.vp-thumb {
  position: relative; display: block; width: 92px; aspect-ratio: 4 / 3; padding: 0; border-radius: 10px; overflow: hidden; cursor: pointer;
  border: 2px solid rgba(255,255,255,0.12); background: #161619; color: #fff;
}
.vp-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.vp-thumb.is-active { border-color: #fff; }
.vp-thumb.is-dragover { border-color: #fff; border-style: dashed; transform: scale(1.04); }
.vp-thumb--skeleton { border-color: transparent; background: linear-gradient(90deg, #131316 0, #1b1b1f 50%, #131316 100%); background-size: 200% 100%; animation: vp-shimmer 1.4s linear infinite; }
.vp-thumb--empty { border-style: dashed; display: grid; place-items: center; align-content: center; gap: 4px; color: rgba(255,255,255,0.6); background: transparent; }
.vp-thumb--empty:hover:not(:disabled) { border-color: rgba(255,255,255,0.5); color: #fff; }
.vp-thumb__label {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 4px 3px; font-size: 10px; font-weight: 700; text-align: center;
  background: linear-gradient(transparent, rgba(0,0,0,0.75)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.vp-thumb--empty .vp-thumb__label { position: static; background: none; padding: 0; color: inherit; }
.vp-thumb__count { position: absolute; top: 4px; right: 4px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px; background: #fff; color: #0e0e10; font-size: 11px; font-weight: 800; display: grid; place-items: center; }
.vp-thumb__busy { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,0.55); }

.vp-side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
@media (min-width: 1000px) { .vp-side { max-height: calc(100vh - 300px); overflow-y: auto; padding-right: 2px; } }
.vp-sec { padding: 14px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: #141417; display: flex; flex-direction: column; gap: 8px; }
.vp-sec__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.vp-h2 { margin: 0; font-size: 14px; font-weight: 800; }
.vp-muted { margin: 0; font-size: 12px; line-height: 1.45; color: rgba(255,255,255,0.6); }
.vp-hint { margin: 0; font-size: 12px; line-height: 1.45; color: rgba(255,255,255,0.55); }
.vp-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8); margin-top: 4px; }
.vp-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.vp-error { margin: 0; font-size: 12px; color: #ffb4b4; }
.vp-select, .vp-input {
  min-height: 44px; padding: 0 10px; border-radius: 10px; background: #0e0e10; color: #fff; border: 1px solid rgba(255,255,255,0.18); font-size: 14px; width: 100%;
}
.vp-textarea { padding: 10px; min-height: 76px; resize: vertical; font-family: inherit; line-height: 1.4; }

.vp-hlist { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.vp-hitem { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 10px; padding: 0 10px; border-radius: 10px; border: 1px solid transparent; background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; text-align: left; font-size: 13px; }
.vp-hitem:hover { background: rgba(255,255,255,0.1); }
.vp-hitem.is-active { border-color: #fff; }
.vp-hitem__t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
.vp-hitem__k { font-size: 11px; color: rgba(255,255,255,0.55); }
.vp-kind { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: #fff; color: #0e0e10; font-weight: 800; font-size: 13px; flex: none; }
.vp-kind--damage { background: #ffb020; }

.vp-seg { border: 0; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.vp-seg__btn { min-height: 44px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.16); background: transparent; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.vp-seg__btn.is-on { background: #fff; color: #0e0e10; border-color: #fff; }

.vp-drafts { margin-top: 6px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 8px; }
.vp-check { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.4; min-height: 44px; padding: 6px 0; cursor: pointer; }
.vp-check input { width: 20px; height: 20px; margin-top: 2px; flex: none; accent-color: #fff; }

.vp-steps { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.75); }
.vp-gap { margin: 0; padding: 10px 12px; border-radius: 10px; background: rgba(255,176,32,0.1); color: #ffd48a; font-size: 12px; line-height: 1.5; }
.vp-next { display: flex; gap: 8px 18px; flex-wrap: wrap; }
.vp-link { color: #fff; font-size: 13px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; min-height: 44px; display: inline-flex; align-items: center; }

.vp-modal { position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,0.7); display: grid; place-items: center; padding: 16px; }
.vp-modal__box { width: 100%; max-width: 520px; max-height: 86vh; overflow-y: auto; padding: 18px; border-radius: 14px; background: #17171a; border: 1px solid rgba(255,255,255,0.12); display: flex; flex-direction: column; gap: 10px; }
.vp-sortlist { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.vp-sortrow { display: flex; align-items: center; gap: 12px; font-size: 13px; }
.vp-sortrow img { width: 64px; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 6px; flex: none; }
.vp-sortrow__t { min-width: 0; }

.vp-spin { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff; border-radius: 50%; animation: vp-rot 0.8s linear infinite; display: inline-block; }
.vp-spin--sm { width: 16px; height: 16px; }
@keyframes vp-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .vp-spin { animation-duration: 2s; }
  .vp-skeleton, .vp-thumb--skeleton { animation: none; }
  .vp-btn, .vp-thumb { transition: none; }
}
</style>
