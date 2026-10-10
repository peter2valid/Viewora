<template>
  <div class="ap-root">
    <input ref="fileInput" type="file" accept="image/*" multiple class="ap-hidden" @change="onFiles" />

    <!-- Loading / setup states -->
    <div v-if="loading" class="ap-center"><span class="ap-spin" /></div>

    <div v-else-if="setupError" class="ap-center ap-empty">
      <p class="ap-empty__title">Aerial maps aren't set up yet</p>
      <p class="ap-empty__text">{{ setupError }}</p>
      <button class="ap-btn" @click="load">Try again</button>
    </div>

    <div v-else-if="!maps.length" class="ap-center ap-empty">
      <div class="ap-empty__icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z"/><path d="M9 4v13M15 7v13"/></svg>
      </div>
      <p class="ap-empty__title">Aerial plot map</p>
      <p class="ap-empty__text">
        Upload a normal drone photo — top-down or angled. It stays sharp and flat, and you draw plots,
        the estate outline, road arrows and beacons right on it. Buyers tap a plot to see its price and enquire.
      </p>
      <button class="ap-btn ap-btn--primary" @click="fileInput?.click()">Upload drone photo</button>
    </div>

    <template v-else>
      <!-- Canvas -->
      <div class="ap-stage">
        <AerialCanvas
          v-if="current"
          ref="canvasRef"
          :key="(current as any)._key || current.id"
          :image-url="current.image_url"
          :width="current.width"
          :height="current.height"
          :shapes="previewShapes"
          :selected-id="selectedId"
          :crosshair="Boolean(tool)"
          :draft="draft"
          :closable="draftClosable"
          :insets="{ top: 128, right: 330, bottom: 104, left: 88 }"
          fit-mode="contain"
          @ready="onCanvasReady"
          @canvas-click="onCanvasClick"
          @shape-click="selectShape"
          @close-draft="finishDraft"
          @remove-draft-point="removePoint"
        />
      </div>

      <!-- Tools -->
      <aside class="ap-tools" aria-label="Aerial map tools">
        <button
          v-for="t in TOOLS" :key="t.key"
          class="ap-tool" :class="{ 'ap-tool--on': tool === t.key }"
          :title="`${t.label} (${t.hotkey.toUpperCase()})`"
          :disabled="!current"
          @click="toggleTool(t.key)"
        >
          <span class="ap-tool__icon" v-html="t.icon" />
          <span class="ap-tool__label">{{ t.label }}</span>
        </button>
      </aside>

      <!-- Drawing bar -->
      <div v-if="tool && tool !== 'beacon'" class="ap-drawbar" role="toolbar">
        <div class="ap-drawbar__count" :class="{ 'ap-drawbar__count--ok': canFinish }">{{ draft?.points.length || 0 }}</div>
        <div class="ap-drawbar__copy">
          <p class="ap-drawbar__title">{{ drawTitle }}</p>
          <p class="ap-drawbar__hint">{{ drawHint }}</p>
        </div>
        <div class="ap-drawbar__actions">
          <button class="ap-dbtn" :disabled="!draft?.points.length" @click="undoPoint">Undo</button>
          <button class="ap-dbtn ap-dbtn--cancel" aria-label="Cancel drawing" @click="cancelTool">✕ Cancel</button>
          <button class="ap-dbtn ap-dbtn--primary" :disabled="!canFinish" @click="finishDraft">Finish</button>
        </div>
      </div>
      <div v-else-if="tool === 'beacon'" class="ap-drawbar">
        <div class="ap-drawbar__copy">
          <p class="ap-drawbar__title">Place beacon</p>
          <p class="ap-drawbar__hint">Click where the survey beacon is</p>
        </div>
        <div class="ap-drawbar__actions"><button class="ap-dbtn" @click="cancelTool">Cancel</button></div>
      </div>

      <!-- Save status -->
      <div class="ap-save" :class="`ap-save--${saveState}`" aria-live="polite">
        <template v-if="uploadingCount">Uploading photo… you can keep drawing</template>
        <template v-else-if="saveState === 'saving'">Saving…</template>
        <template v-else-if="saveState === 'error'">Not saved · <button @click="saveNow">Retry</button></template>
        <template v-else-if="saveState === 'saved'">Saved</template>
      </div>

      <!-- Photo strip -->
      <div class="ap-strip">
        <button
          v-for="m in maps" :key="(m as any)._key || m.id"
          class="ap-thumb" :class="{ 'ap-thumb--on': m.id === currentId, 'ap-thumb--failed': (m as any)._upload === 'failed' }"
          :style="{ backgroundImage: `url('${m.image_url}')` }"
          :title="m.title"
          @click="switchMap(m.id)"
        >
          <span v-if="m.group_name" class="ap-thumb__group">{{ m.group_name }}</span>
          <span class="ap-thumb__count">{{ m.shapes.filter(s => s.kind === 'plot').length }} plots</span>
          <span v-if="(m as any)._upload === 'preparing' || (m as any)._upload === 'uploading'" class="ap-thumb__state" :title="(m as any)._upload === 'preparing' ? 'Preparing…' : 'Uploading…'">
            <span class="ap-spin ap-spin--sm" />
          </span>
          <span v-else-if="(m as any)._upload === 'failed'" class="ap-thumb__state ap-thumb__state--failed" @click.stop="retryUpload(m as any)">Retry</span>
        </button>
        <button class="ap-thumb ap-thumb--add" @click="fileInput?.click()">
          +<small>Photo</small>
        </button>
      </div>

      <!-- Side panel -->
      <aside class="ap-panel" :class="{ 'ap-panel--overview': !selected }">
        <!-- Shape editor -->
        <template v-if="selected">
          <button class="ap-back" @click="selectedId = null">‹ All shapes</button>
          <span class="ap-badge" :class="`ap-badge--${selected.kind}`">{{ KIND_LABEL[selected.kind] }}</span>

          <label class="ap-field">
            <span>Label</span>
            <input class="ap-input" :value="selected.label" maxlength="60"
              :placeholder="selected.kind === 'plot' ? 'Plot 4' : selected.kind === 'zone' ? 'Phase 2' : selected.kind === 'road' ? 'Old Namanga Road' : 'Beacon PL/23'"
              @input="patchSelected({ label: ($event.target as HTMLInputElement).value })" />
          </label>

          <template v-if="selected.kind === 'plot'">
            <div class="ap-field">
              <span>Status</span>
              <div class="ap-seg">
                <button v-for="(m, k) in AERIAL_STATUS" :key="k"
                  :class="{ 'ap-seg--on': (selected.status || 'available') === k }"
                  :style="{ '--c': m.color }"
                  @click="patchSelected({ status: k as AerialPlotStatus })">{{ m.label }}</button>
              </div>
            </div>
            <div class="ap-row">
              <label class="ap-field"><span>Size</span>
                <input class="ap-input" :value="selected.size" maxlength="40" placeholder="50×100 ft" @input="patchSelected({ size: ($event.target as HTMLInputElement).value })" /></label>
              <label class="ap-field"><span>Price</span>
                <input class="ap-input" :value="selected.price" maxlength="40" placeholder="KES 1.2M" @input="patchSelected({ price: ($event.target as HTMLInputElement).value })" /></label>
            </div>
          </template>

          <template v-if="selected.kind === 'road'">
            <label class="ap-field">
              <span>Arrow width · {{ Math.round((selected.arrow_width ?? 1) * 100) }}%</span>
              <input type="range" min="0.3" max="3" step="0.05" :value="selected.arrow_width ?? 1"
                @input="patchSelected({ arrow_width: Number(($event.target as HTMLInputElement).value) })" />
            </label>
            <label class="ap-field">
              <span>Directions <em>optional</em></span>
              <input class="ap-input" v-model="directionsInput" placeholder="Google Maps link or -1.2921, 36.8219"
                @blur="applyDirections" @keydown.enter="applyDirections" />
              <small v-if="directionsError" class="ap-err">{{ directionsError }}</small>
            </label>
          </template>

          <label class="ap-field">
            <span>{{ selected.kind === 'plot' ? 'Notes for buyers' : 'Description' }}</span>
            <textarea class="ap-input ap-textarea" :value="selected.text" maxlength="500" rows="3"
              :placeholder="selected.kind === 'plot' ? 'Corner plot, ready title, water on site' : ''"
              @input="patchSelected({ text: ($event.target as HTMLTextAreaElement).value })" />
          </label>

          <!-- Grid split -->
          <div v-if="selected.kind === 'plot' && selected.points.length === 4" class="ap-grid">
            <span class="ap-grid__title">Split block into plots</span>
            <div class="ap-row">
              <label class="ap-field"><span>Rows</span><input class="ap-input" type="number" min="1" max="30" v-model.number="gridRows" /></label>
              <label class="ap-field"><span>Across</span><input class="ap-input" type="number" min="1" max="30" v-model.number="gridCols" /></label>
            </div>
            <button class="ap-btn ap-btn--primary ap-btn--full" :disabled="gridTotal < 2 || gridTotal > 200" @click="splitSelected">
              Create {{ gridTotal }} plots
            </button>
            <small class="ap-muted">Follows the photo's perspective. Rows run from your 1st corner to your 4th.</small>
          </div>

          <div class="ap-actions">
            <button v-if="selected.kind !== 'beacon'" class="ap-btn" @click="redrawSelected">Redraw</button>
            <button class="ap-btn ap-btn--danger" @click="deleteSelected">Delete</button>
          </div>
        </template>

        <!-- Overview -->
        <template v-else-if="current">
          <label class="ap-field">
            <span>Photo title</span>
            <input class="ap-input" :value="current.title" maxlength="80" @change="renameMap(($event.target as HTMLInputElement).value)" />
          </label>
          <label class="ap-field">
            <span>Category <em>groups photos for buyers</em></span>
            <input class="ap-input" :value="current.group_name || ''" maxlength="40" list="aerial-categories" placeholder="e.g. Phase 1"
              @change="setMapGroup(($event.target as HTMLInputElement).value)" />
            <datalist id="aerial-categories">
              <option v-for="c in aerialCategoryOptions" :key="c" :value="c" />
            </datalist>
          </label>

          <!-- Buyer intro: where the camera starts and glides to -->
          <div class="ap-intro">
            <span class="ap-grid__title">Buyer's first view</span>
            <p class="ap-muted">
              {{ current.intro?.start || current.intro?.end
                ? 'Buyers glide from your start view to your end view.'
                : 'Automatic: whole photo, then a glide onto your plots.' }}
            </p>
            <div class="ap-row">
              <button class="ap-btn" :class="{ 'ap-btn--set': current.intro?.start }" @click="setIntro('start')">{{ current.intro?.start ? '✓ Start set' : 'Set start' }}</button>
              <button class="ap-btn" :class="{ 'ap-btn--set': current.intro?.end }" @click="setIntro('end')">{{ current.intro?.end ? '✓ End set' : 'Set end' }}</button>
            </div>
            <div class="ap-row">
              <button class="ap-btn" @click="previewIntro">▶ Preview</button>
              <button class="ap-btn" :disabled="!current.intro" @click="resetIntro">Automatic</button>
            </div>
            <small class="ap-muted">Zoom and move the photo to the framing you want, then press Set start or Set end.</small>
          </div>
          <div class="ap-stats">
            <span v-for="(m, k) in AERIAL_STATUS" :key="k"><i :style="{ background: m.color }" />{{ counts[k] }} {{ m.label.toLowerCase() }}</span>
          </div>
          <p v-if="!current.shapes.length" class="ap-muted ap-tip">
            Tip: click <b>Plot</b> and outline a whole block with 4 corners, then split it into rows × plots in one go.
          </p>
          <ul class="ap-list">
            <li v-for="s in sortedShapes" :key="s.id">
              <button @click="selectShape(s.id, true)">
                <i :style="{ background: s.kind === 'plot' ? AERIAL_STATUS[s.status || 'available'].color : '#94a3b8' }" />
                <span>{{ s.label || KIND_LABEL[s.kind] }}</span>
                <small>{{ s.kind === 'plot' ? AERIAL_STATUS[s.status || 'available'].label : KIND_LABEL[s.kind] }}</small>
              </button>
            </li>
          </ul>
          <button class="ap-btn ap-btn--danger ap-btn--full" @click="deleteMap">Delete this photo</button>
        </template>
      </aside>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, onActivated, onDeactivated } from 'vue'
import { toast } from 'vue-sonner'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSceneUpload } from '~/features/editor/composables/useSceneUpload'
import AerialCanvas from '~/features/aerial/AerialCanvas.vue'
import { directionsUrl } from '~/shared/utils/viewerAdapters/landMarkers'
import {
  AERIAL_STATUS, newShapeId, nextPlotNumber, prepareAerialPhoto, subdivideQuad,
  type AerialMap, type AerialPlotStatus, type AerialPoint, type AerialShape, type AerialShapeKind,
} from '~/shared/utils/aerialGeometry'

const props = defineProps<{ spaceId: string }>()
const { apiFetch } = useApiFetch()
const { uploadFile } = useSceneUpload(props.spaceId)

const KIND_LABEL: Record<AerialShapeKind, string> = { plot: 'Plot', zone: 'Estate', road: 'Road', beacon: 'Beacon' }
const TOOLS: Array<{ key: AerialShapeKind; label: string; hotkey: string; icon: string }> = [
  { key: 'plot', label: 'Plot', hotkey: 'p', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 7 L11 3 L20 6 L18 18 L7 20 Z"/></svg>' },
  { key: 'zone', label: 'Estate', hotkey: 'e', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M3 6l6-3 12 4-2 13-15-2z"/></svg>' },
  { key: 'road', label: 'Road', hotkey: 'r', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 21 L9 3"/><path d="M20 21 L15 3"/><path d="M12 5v2M12 11v2M12 17v2"/></svg>' },
  { key: 'beacon', label: 'Beacon', hotkey: 'b', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M9 7h6l1.5 14h-9z"/><path d="M8 3h8v4H8z"/><path d="M8 14h8"/></svg>' },
]

const fileInput = ref<HTMLInputElement | null>(null)
const canvasRef = ref<InstanceType<typeof AerialCanvas> | null>(null)
const loading = ref(true)
const setupError = ref('')
const maps = ref<AerialMap[]>([])
const currentId = ref<string | null>(null)
const selectedId = ref<string | null>(null)
const tool = ref<AerialShapeKind | null>(null)
const draftPoints = ref<AerialPoint[]>([])
const redrawId = ref<string | null>(null)
const gridRows = ref(2)
const gridCols = ref(6)

const current = computed(() => maps.value.find(m => m.id === currentId.value) ?? null)
const selected = computed(() => current.value?.shapes.find(s => s.id === selectedId.value) ?? null)
const draft = computed(() => tool.value && tool.value !== 'beacon' ? { kind: tool.value, points: draftPoints.value } : null)
// While redrawing, hide the old outline so the user sees only the new one.
const previewShapes = computed(() => (current.value?.shapes ?? []).filter(s => s.id !== redrawId.value))
const minPoints = computed(() => tool.value === 'road' ? 2 : 3)
const canFinish = computed(() => draftPoints.value.length >= minPoints.value)
const draftClosable = computed(() => (tool.value === 'plot' || tool.value === 'zone') && draftPoints.value.length >= 3)
const gridTotal = computed(() => Math.max(0, Math.floor(gridRows.value || 0)) * Math.max(0, Math.floor(gridCols.value || 0)))
const counts = computed(() => {
  const c: Record<AerialPlotStatus, number> = { available: 0, reserved: 0, sold: 0 }
  for (const s of current.value?.shapes ?? []) if (s.kind === 'plot') c[s.status || 'available']++
  return c
})
const sortedShapes = computed(() => {
  const order: Record<AerialShapeKind, number> = { zone: 0, road: 1, beacon: 2, plot: 3 }
  return [...(current.value?.shapes ?? [])].sort((a, b) =>
    order[a.kind] - order[b.kind] || (a.label || '').localeCompare(b.label || '', undefined, { numeric: true }))
})

const drawTitle = computed(() => {
  const verb = redrawId.value ? 'Redraw' : 'Draw'
  return tool.value === 'road' ? `${verb} road arrow` : tool.value === 'zone' ? `${verb} estate outline` : `${verb} plot`
})
const drawHint = computed(() => {
  const n = draftPoints.value.length
  if (tool.value === 'road') return n === 0 ? 'Click where the arrow starts' : n === 1 ? 'Click where it should point (add bends on the way)' : 'Add points or press Enter'
  if (n < 3) return n === 0 ? 'Click each corner in order. Tip: outline a whole block, then split it.' : `Add ${3 - n} more corner${3 - n === 1 ? '' : 's'} · tap a dot to remove it`
  return 'Click the first corner, press Enter, or Finish'
})

// ── Load ────────────────────────────────────────────────────
async function load() {
  loading.value = true
  setupError.value = ''
  try {
    const res: any = await apiFetch(`/spaces/${props.spaceId}/aerial-maps`)
    maps.value = (res?.aerial_maps ?? res?.data?.aerial_maps ?? []).map(normalize)
    if (!currentId.value || !maps.value.some(m => m.id === currentId.value)) currentId.value = maps.value[0]?.id ?? null
  } catch (e: any) {
    setupError.value = e?.data?.statusMessage
      ? `${e.data.statusMessage}. If this is new, run VIEWORA_AERIAL_MAPS_MIGRATION.sql in Supabase.`
      : 'Could not load aerial maps. If this is new, run VIEWORA_AERIAL_MAPS_MIGRATION.sql in Supabase.'
  } finally {
    loading.value = false
  }
}

function normalize(m: any): AerialMap {
  return { ...m, shapes: Array.isArray(m.shapes) ? m.shapes : [] }
}

// ── Upload: optimistic, like the 360/Photos tabs ────────────
// The photo appears the instant it's picked and can be drawn on straight
// away; shrinking + upload + registration run in the background with a small
// ring on its thumbnail. Previously a full-screen spinner blocked everything
// until all three finished.
type UploadState = 'preparing' | 'uploading' | 'failed'
type LocalExtras = { _key?: string; _upload?: UploadState; _file?: File; _title?: string }
const isLocal = (id: string | null | undefined) => !!id && id.startsWith('local_')
const uploadingCount = computed(() => (maps.value as Array<AerialMap & LocalExtras>).filter(m => m._upload && m._upload !== 'failed').length)

function readSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not read this image'))
    img.src = url
  })
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || []).filter(f => f.type.startsWith('image/'))
  input.value = ''
  for (const raw of files) {
    // 1) Show it now. Display size = original aspect; every later image swap
    //    keeps these dimensions, so the view never jumps.
    const blobUrl = URL.createObjectURL(raw)
    let size: { width: number; height: number }
    try { size = await readSize(blobUrl) } catch { URL.revokeObjectURL(blobUrl); toast.error(`${raw.name} isn't a readable image`); continue }
    const local: AerialMap & LocalExtras = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      _key: `k_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      _upload: 'preparing',
      _title: raw.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Aerial view',
      title: raw.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Aerial view',
      image_url: blobUrl,
      width: size.width,
      height: size.height,
      order_index: maps.value.length,
      shapes: [],
    }
    maps.value = [...maps.value, local]
    // Mutate through the reactive proxy so thumbnail/progress/id updates render.
    const tracked = maps.value[maps.value.length - 1] as AerialMap & LocalExtras
    currentId.value = tracked.id
    selectedId.value = null
    void uploadInBackground(tracked, raw)
  }
}

async function uploadInBackground(m: AerialMap & LocalExtras, raw?: File) {
  try {
    // 2) Shrink (≤ 4096px long side: fast to upload, safe to open on phones).
    if (!m._file) {
      m._upload = 'preparing'
      const prepared = await prepareAerialPhoto(raw!, 4096)
      m._file = prepared.file
      // Swap the heavy original for the light version (same aspect → no jump).
      // Decode first so the swap is invisible.
      const light = URL.createObjectURL(prepared.file)
      try { const pre = new Image(); pre.src = light; await pre.decode() } catch { /* swap anyway */ }
      const old = m.image_url
      m.image_url = light
      if (old.startsWith('blob:')) URL.revokeObjectURL(old)
    }
    // 3) Upload + register.
    m._upload = 'uploading'
    const record: any = await uploadFile(m._file, 'floor_plan')
    if (!record?.public_url) throw new Error('Upload failed')
    const res: any = await apiFetch(`/spaces/${props.spaceId}/aerial-maps`, {
      method: 'POST',
      body: { title: m._title ?? m.title, image_url: record.public_url, media_id: record.id ?? null, width: m.width, height: m.height },
    })
    const created = res?.aerial_map ?? res?.data?.aerial_map
    if (!created?.id) throw new Error('Could not save the photo')
    const wasCurrent = currentId.value === m.id
    // Keep showing the local copy (already decoded) — no reload flash.
    m.id = created.id
    m.media_id = created.media_id ?? record.id ?? null
    m._upload = undefined
    m._file = undefined
    if (wasCurrent) currentId.value = created.id
    // Plots drawn while it was uploading get saved now.
    if (m.title !== (m._title ?? m.title)) void apiFetch(`/aerial-maps/${created.id}`, { method: 'PATCH', body: { title: m.title } }).catch(() => {})
    if (m.shapes.length) markDirty(created.id)
  } catch (err: any) {
    m._upload = 'failed'
    toast.error(err?.data?.statusMessage || err?.message || 'Upload failed — tap the photo’s Retry to try again.')
  }
}

function retryUpload(m: AerialMap & LocalExtras) {
  if (m._upload === 'failed') void uploadInBackground(m)
}

// ── Saving: whole shape list in one PATCH, debounced ────────
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
const saveState = ref<SaveState>('idle')
const dirtyMaps = new Set<string>()
let saveTimer: ReturnType<typeof setTimeout> | null = null
let saving: Promise<void> | null = null

function markDirty(mapId: string) {
  if (isLocal(mapId)) return // saved right after its upload registers
  dirtyMaps.add(mapId)
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void saveNow(), 700)
}

async function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  if (saving) { await saving; if (!dirtyMaps.size) return }
  if (!dirtyMaps.size) return
  const ids = [...dirtyMaps]
  dirtyMaps.clear()
  saveState.value = 'saving'
  saving = (async () => {
    try {
      for (const id of ids) {
        const m = maps.value.find(x => x.id === id)
        if (!m) continue
        await apiFetch(`/aerial-maps/${id}`, { method: 'PATCH', body: { shapes: m.shapes.map(cleanShape) } })
      }
      saveState.value = dirtyMaps.size ? 'saving' : 'saved'
    } catch (e: any) {
      ids.forEach(id => dirtyMaps.add(id))
      saveState.value = 'error'
      toast.error(e?.data?.fields?.[0]?.message || e?.data?.statusMessage || 'Could not save the map — check your connection.')
    } finally {
      saving = null
    }
  })()
  await saving
  if (dirtyMaps.size && (saveState.value as SaveState) !== 'error') void saveNow()
}

/** Strip empty optional fields so the payload stays small and validates. */
function cleanShape(s: AerialShape): AerialShape {
  const out: any = { id: s.id, kind: s.kind, points: s.points.map(p => ({ x: round(p.x), y: round(p.y) })) }
  if (s.label?.trim()) out.label = s.label.trim().slice(0, 60)
  if (s.text?.trim()) out.text = s.text.trim().slice(0, 500)
  if (s.kind === 'plot') {
    out.status = s.status || 'available'
    if (s.price?.trim()) out.price = s.price.trim()
    if (s.size?.trim()) out.size = s.size.trim()
  }
  if (s.kind === 'road') {
    out.arrow_width = Math.round((s.arrow_width ?? 1) * 100) / 100
    if (s.url?.trim()) out.url = s.url.trim()
  }
  return out
}
const round = (n: number) => Math.round(n * 1e5) / 1e5

function setShapes(next: AerialShape[]) {
  const m = current.value
  if (!m) return
  m.shapes = next
  markDirty(m.id)
}

function patchSelected(patch: Partial<AerialShape>) {
  const m = current.value, id = selectedId.value
  if (!m || !id) return
  setShapes(m.shapes.map(s => s.id === id ? { ...s, ...patch } : s))
}

// ── Tools & drawing ─────────────────────────────────────────
function toggleTool(kind: AerialShapeKind) {
  if (tool.value === kind) { cancelTool(); return }
  tool.value = kind
  draftPoints.value = []
  redrawId.value = null
  selectedId.value = null
}

function cancelTool() {
  tool.value = null
  draftPoints.value = []
  redrawId.value = null
}

function removePoint(index: number) {
  draftPoints.value = draftPoints.value.filter((_, i) => i !== index)
}

function undoPoint() {
  draftPoints.value = draftPoints.value.slice(0, -1)
}

/** Snap to an existing plot/estate corner so neighbouring plots share edges. */
function snap(p: AerialPoint): AerialPoint {
  const m = current.value
  if (!m?.width || !m?.height) return p
  const W = m.width, H = m.height, R = 0.006 * Math.max(W, H)
  let best: AerialPoint | null = null, bestD = R
  for (const s of m.shapes) {
    if ((s.kind !== 'plot' && s.kind !== 'zone') || s.id === redrawId.value) continue
    for (const v of s.points) {
      const d = Math.hypot((v.x - p.x) * W, (v.y - p.y) * H)
      if (d < bestD) { bestD = d; best = v }
    }
  }
  return best ? { ...best } : p
}

function onCanvasClick(p: AerialPoint) {
  const m = current.value
  if (!m || !tool.value) { selectedId.value = null; return }
  if (tool.value === 'beacon') {
    const s: AerialShape = { id: newShapeId(), kind: 'beacon', label: 'Beacon', points: [p] }
    setShapes([...m.shapes, s])
    tool.value = null
    selectedId.value = s.id
    return
  }
  if (draftPoints.value.length >= 64) return
  draftPoints.value = [...draftPoints.value, tool.value === 'road' ? p : snap(p)]
}

function finishDraft() {
  const m = current.value, kind = tool.value
  if (!m || !kind || kind === 'beacon' || !canFinish.value) return
  const points = [...draftPoints.value]
  if (redrawId.value) {
    const id = redrawId.value
    setShapes(m.shapes.map(s => s.id === id ? { ...s, points } : s))
    selectedId.value = id
  } else {
    const s: AerialShape = { id: newShapeId(), kind, points }
    if (kind === 'plot') { s.label = `Plot ${nextPlotNumber(maps.value)}`; s.status = 'available' }
    if (kind === 'zone') s.label = `Phase ${m.shapes.filter(x => x.kind === 'zone').length + 1}`
    if (kind === 'road') { s.label = 'Access road'; s.arrow_width = 1 }
    setShapes([...m.shapes, s])
    selectedId.value = s.id
  }
  cancelTool()
}

function selectShape(id: string, focus = false) {
  if (tool.value) return
  selectedId.value = id
  if (focus) canvasRef.value?.focusShape(id)
}

function redrawSelected() {
  const s = selected.value
  if (!s || s.kind === 'beacon') return
  tool.value = s.kind
  draftPoints.value = []
  redrawId.value = s.id
}

function deleteSelected() {
  const m = current.value, id = selectedId.value
  if (!m || !id) return
  setShapes(m.shapes.filter(s => s.id !== id))
  selectedId.value = null
}

function splitSelected() {
  const m = current.value, s = selected.value
  if (!m || !s || s.kind !== 'plot' || s.points.length !== 4) return
  const rows = Math.max(1, Math.min(30, Math.floor(gridRows.value)))
  const cols = Math.max(1, Math.min(30, Math.floor(gridCols.value)))
  if (rows * cols < 2 || rows * cols > 200) return
  const rest = m.shapes.filter(x => x.id !== s.id)
  const start = nextPlotNumber(maps.value.map(x => x.id === m.id ? { ...x, shapes: rest } : x))
  const cells = subdivideQuad(s.points, rows, cols).map((points, i): AerialShape => ({
    id: newShapeId() + i,
    kind: 'plot',
    label: `Plot ${start + i}`,
    status: s.status || 'available',
    size: s.size,
    price: s.price,
    points,
  }))
  setShapes([...rest, ...cells])
  selectedId.value = null
  toast.success(`${cells.length} plots created`)
}

// ── Roads: directions ───────────────────────────────────────
const directionsInput = ref('')
const directionsError = ref('')
watch(selectedId, () => { directionsInput.value = selected.value?.url || ''; directionsError.value = '' })
function applyDirections() {
  const raw = directionsInput.value.trim()
  directionsError.value = ''
  if (!raw) { patchSelected({ url: undefined }); return }
  const m = raw.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/)
  if (m && Math.abs(+m[1]) <= 90 && Math.abs(+m[2]) <= 180) {
    const url = directionsUrl(+m[1], +m[2])
    directionsInput.value = url
    patchSelected({ url })
    return
  }
  if (/^https?:\/\//i.test(raw)) { patchSelected({ url: raw }); return }
  directionsError.value = 'Paste a Google Maps link, or coordinates like -1.2921, 36.8219'
}

// ── Maps ────────────────────────────────────────────────────
async function switchMap(id: string) {
  if (id === currentId.value) return
  cancelTool()
  selectedId.value = null
  currentId.value = id
}

function onCanvasReady(size: { width: number; height: number }) {
  const m = current.value
  if (m && (!m.width || !m.height)) { m.width = size.width; m.height = size.height }
}

async function renameMap(title: string) {
  const m = current.value
  const t = title.trim().slice(0, 80)
  if (!m || !t || t === m.title) return
  m.title = t
  if (isLocal(m.id)) return // sent with/after creation
  try { await apiFetch(`/aerial-maps/${m.id}`, { method: 'PATCH', body: { title: t } }) }
  catch { toast.error('Could not rename the photo') }
}

const aerialCategoryOptions = computed(() => {
  const used = [...new Set(maps.value.map(m => (m.group_name ?? '').trim()).filter(Boolean))]
  const common = ['Overview', 'Phase 1', 'Phase 2', 'Phase 3', 'Entrance', 'Access road', 'Amenities']
  return [...used, ...common.filter(c => !used.includes(c))]
})

async function setMapGroup(value: string) {
  const m = current.value
  const g = value.trim().slice(0, 40)
  if (!m || g === (m.group_name ?? '')) return
  const prev = m.group_name ?? null
  m.group_name = g || null
  if (isLocal(m.id)) return
  try {
    await apiFetch(`/aerial-maps/${m.id}`, { method: 'PATCH', body: { group_name: g || null } })
  } catch {
    m.group_name = prev
    toast.error('Could not save the category. If this is new, run VIEWORA_CATEGORIES_MIGRATION.sql in Supabase.')
  }
}

// ── Buyer intro (start → end glide) ─────────────────────────
async function saveIntro(intro: AerialMap['intro']) {
  const m = current.value
  if (!m) return
  const prev = m.intro ?? null
  m.intro = intro
  if (isLocal(m.id)) return
  try {
    await apiFetch(`/aerial-maps/${m.id}`, { method: 'PATCH', body: { intro } })
  } catch {
    m.intro = prev
    toast.error('Could not save the view. If this is new, run VIEWORA_AERIAL_INTRO_MIGRATION.sql in Supabase.')
  }
}

function setIntro(which: 'start' | 'end') {
  const view = canvasRef.value?.getView()
  if (!view || !current.value) return
  void saveIntro({ ...(current.value.intro ?? {}), [which]: view })
  toast.success(which === 'start' ? 'Start view saved' : 'End view saved')
}

function previewIntro() {
  canvasRef.value?.playIntro(current.value?.intro ?? null)
}

function resetIntro() {
  void saveIntro(null)
  toast.success('Back to automatic')
}

async function deleteMap() {
  const m = current.value
  if (!m) return
  if (!window.confirm(`Delete "${m.title}" and its ${m.shapes.length} shapes?`)) return
  if (isLocal(m.id)) {
    // Not on the server yet (or failed) — just drop it locally.
    if (m.image_url.startsWith('blob:')) URL.revokeObjectURL(m.image_url)
    maps.value = maps.value.filter(x => x.id !== m.id)
    currentId.value = maps.value[0]?.id ?? null
    return
  }
  try {
    dirtyMaps.delete(m.id)
    await apiFetch(`/aerial-maps/${m.id}`, { method: 'DELETE' })
    if (m.media_id) apiFetch(`/uploads/${m.media_id}`, { method: 'DELETE' }).catch(() => {})
    maps.value = maps.value.filter(x => x.id !== m.id)
    currentId.value = maps.value[0]?.id ?? null
    toast.success('Photo deleted')
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Could not delete the photo')
  }
}

// ── Keyboard ────────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return
  if (tool.value) {
    if (e.key === 'Escape') { e.preventDefault(); cancelTool() }
    else if (e.key === 'Enter') { e.preventDefault(); finishDraft() }
    else if (e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) { e.preventDefault(); undoPoint() }
    return
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId.value) { e.preventDefault(); deleteSelected(); return }
  if (e.key === 'Escape') { selectedId.value = null; return }
  if (e.metaKey || e.ctrlKey || e.altKey || !current.value) return
  const t2 = TOOLS.find(x => x.hotkey === e.key.toLowerCase())
  if (t2) { e.preventDefault(); toggleTool(t2.key) }
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (dirtyMaps.size || saving || uploadingCount.value) { void saveNow(); e.preventDefault(); e.returnValue = '' }
}

onMounted(() => {
  void load()
  window.addEventListener('keydown', onKey)
  window.addEventListener('beforeunload', onBeforeUnload)
})
// KeepAlive: flush pending edits when the user switches tabs.
onDeactivated(() => { window.removeEventListener('keydown', onKey); void saveNow() })
onActivated(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', onBeforeUnload)
  void saveNow()
})
</script>

<style scoped>
.ap-root { position: fixed; inset: 0; background: #0b0d12; color: #fff; }
.ap-hidden { display: none; }
.ap-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; }
.ap-stage { position: absolute; inset: 0; }
.ap-muted { color: rgba(255,255,255,0.5); font-size: 12px; }
.ap-err { color: #f87171; font-size: 11px; }
.ap-spin { width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.15); border-top-color: #fff; animation: ap-rot 0.8s linear infinite; }
.ap-spin--sm { width: 18px; height: 18px; border-width: 2px; }
@keyframes ap-rot { to { transform: rotate(360deg); } }

.ap-empty { max-width: 460px; margin: 0 auto; }
.ap-empty__icon { width: 64px; height: 64px; border-radius: 18px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); color: #a7f3d0; }
.ap-empty__title { font-size: 20px; font-weight: 800; }
.ap-empty__text { font-size: 13.5px; line-height: 1.6; color: rgba(255,255,255,0.6); }

.ap-btn { height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.07); color: #fff; font-size: 12.5px; font-weight: 700; cursor: pointer; }
.ap-btn:hover:not(:disabled) { background: rgba(255,255,255,0.13); }
.ap-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.ap-btn--primary { background: #22c55e; border-color: #22c55e; color: #0b0d14; }
.ap-btn--primary:hover:not(:disabled) { background: #4ade80; }
.ap-btn--danger { color: #fca5a5; border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.08); }
.ap-btn--full { width: 100%; }

.ap-tools {
  position: fixed; left: 16px; top: 50%; transform: translateY(-50%); z-index: 20;
  display: flex; flex-direction: column; gap: 2px; padding: 6px;
  background: rgba(14,14,18,0.88); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
  backdrop-filter: blur(20px);
}
.ap-tool { width: 52px; height: 52px; border-radius: 9px; border: 0; background: transparent; color: rgba(255,255,255,0.45); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; }
.ap-tool:hover:not(:disabled) { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.05); }
.ap-tool:disabled { opacity: 0.35; }
.ap-tool--on { color: #fff; background: rgba(255,255,255,0.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25); }
.ap-tool__icon { display: flex; }
.ap-tool__label { font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }

.ap-drawbar {
  position: fixed; top: 130px; left: 50%; transform: translateX(-50%); z-index: 25;
  display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 12px;
  max-width: calc(100% - 32px); border-radius: 18px;
  background: rgba(10,12,20,0.9); border: 1px solid rgba(255,255,255,0.14);
  box-shadow: 0 18px 48px rgba(0,0,0,0.5); backdrop-filter: blur(18px);
}
.ap-drawbar__count { flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; background: rgba(255,255,255,0.12); }
.ap-drawbar__count--ok { background: #22c55e; color: #0b0d14; }
.ap-drawbar__title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; }
.ap-drawbar__hint { font-size: 11px; color: rgba(255,255,255,0.62); margin-top: 2px; }
.ap-drawbar__actions { display: flex; gap: 6px; }
.ap-dbtn { height: 34px; padding: 0 12px; border-radius: 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
.ap-dbtn:disabled { opacity: 0.4; cursor: not-allowed; }
.ap-dbtn--cancel { color: #fca5a5; }
.ap-dbtn--primary { background: #22c55e; border-color: #22c55e; color: #0b0d14; }

.ap-save { position: fixed; top: 130px; right: 340px; z-index: 22; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.55); }
.ap-save--error { color: #fca5a5; }
.ap-save button { color: #fff; text-decoration: underline; background: none; border: 0; cursor: pointer; font: inherit; }

.ap-strip {
  position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 20;
  display: flex; gap: 8px; padding: 8px; max-width: calc(100vw - 380px); overflow-x: auto;
  background: rgba(14,14,18,0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; backdrop-filter: blur(16px);
}
.ap-thumb { position: relative; flex-shrink: 0; width: 96px; height: 64px; border-radius: 10px; border: 2px solid transparent; background: #1f2430 center/cover no-repeat; cursor: pointer; }
.ap-thumb--on { border-color: #fff; }
.ap-thumb__group { position: absolute; left: 4px; top: 4px; max-width: calc(100% - 8px); padding: 1px 6px; border-radius: 6px; background: rgba(37,99,235,0.9); font-size: 9px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-thumb__count { position: absolute; left: 4px; bottom: 4px; padding: 1px 6px; border-radius: 6px; background: rgba(0,0,0,0.7); font-size: 9.5px; font-weight: 700; }
.ap-thumb__state { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(0,0,0,0.45); }
.ap-thumb__state--failed { background: rgba(127,29,29,0.7); color: #fff; font-size: 11px; font-weight: 800; }
.ap-thumb--failed { border-color: #ef4444; }
.ap-thumb--add { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px dashed rgba(255,255,255,0.25); background: rgba(255,255,255,0.03); color: #fff; font-size: 20px; }
.ap-thumb--add small { font-size: 10px; color: rgba(255,255,255,0.6); }

.ap-panel {
  position: fixed; right: 16px; top: 130px; bottom: 18px; width: 300px; z-index: 21;
  display: flex; flex-direction: column; gap: 12px; padding: 16px; overflow-y: auto;
  background: rgba(14,14,18,0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; backdrop-filter: blur(20px);
}
.ap-back { align-self: flex-start; background: none; border: 0; color: rgba(255,255,255,0.55); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer; }
.ap-badge { align-self: flex-start; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; background: rgba(255,255,255,0.1); }
.ap-badge--plot { background: rgba(34,197,94,0.15); color: #4ade80; }
.ap-badge--road { background: rgba(250,204,21,0.15); color: #facc15; }
.ap-badge--beacon { background: rgba(239,68,68,0.15); color: #f87171; }
.ap-field { display: flex; flex-direction: column; gap: 5px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.5); min-width: 0; }
.ap-field em { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; color: rgba(255,255,255,0.35); }
.ap-input { width: 100%; height: 38px; padding: 0 11px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 13px; font-weight: 600; text-transform: none; letter-spacing: 0; outline: none; }
.ap-input:focus { border-color: rgba(96,165,250,0.7); }
.ap-textarea { height: auto; padding: 9px 11px; resize: vertical; }
.ap-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ap-seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.ap-seg button { height: 32px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); font-size: 11.5px; font-weight: 700; text-transform: none; letter-spacing: 0; cursor: pointer; }
.ap-seg--on { background: color-mix(in srgb, var(--c) 22%, transparent) !important; border-color: var(--c) !important; color: #fff !important; }
.ap-intro { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); }
.ap-intro .ap-row .ap-btn { width: 100%; }
.ap-btn--set { border-color: rgba(34,197,94,0.6); color: #86efac; }
.ap-grid { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); }
.ap-grid__title { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.6); }
.ap-actions { display: flex; gap: 8px; margin-top: auto; }
.ap-actions .ap-btn { flex: 1; }
.ap-stats { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; font-weight: 700; }
.ap-stats i, .ap-list i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
.ap-tip { line-height: 1.5; }
.ap-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; flex: 1; overflow-y: auto; }
.ap-list button { width: 100%; display: flex; align-items: center; gap: 4px; padding: 7px 8px; border-radius: 8px; border: 0; background: transparent; color: #fff; font-size: 12.5px; font-weight: 600; text-align: left; cursor: pointer; }
.ap-list button:hover { background: rgba(255,255,255,0.06); }
.ap-list span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ap-list small { color: rgba(255,255,255,0.45); font-size: 10.5px; }

@media (max-width: 768px) {
  .ap-tools { left: 50%; top: auto; bottom: 104px; transform: translateX(-50%); flex-direction: row; }
  .ap-tool { width: 56px; height: 44px; }
  .ap-panel { top: auto; left: 12px; right: 12px; bottom: 160px; width: auto; max-height: 42vh; }
  .ap-strip { max-width: calc(100vw - 24px); bottom: 12px; }
  .ap-thumb { width: 72px; height: 52px; }
  .ap-drawbar { top: 100px; flex-wrap: wrap; justify-content: center; }
  .ap-save { right: 16px; top: 100px; }
  .ap-panel--overview { display: none; }
}
</style>
