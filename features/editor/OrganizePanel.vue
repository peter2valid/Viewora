<template>
  <div class="og-root">
    <div v-if="loading" class="og-center"><span class="og-spin" /></div>

    <div v-else-if="loadError" class="og-center">
      <p class="og-title">Couldn't load your photos</p>
      <button class="og-btn" @click="init">Try again</button>
    </div>

    <div v-else-if="!scenes.length" class="og-center">
      <p class="og-title">Organize</p>
      <p class="og-muted">Add 360° photos in the 360° Tour tab first, then come back to sort them into categories.</p>
    </div>

    <template v-else>
      <!-- Filters -->
      <div class="og-bar">
        <input v-model="search" class="og-search" type="search" placeholder="Search photo names…" aria-label="Search photo names" />
        <div class="og-chips" role="group" aria-label="Filter by category">
          <button class="og-chip" :class="{ 'og-chip--on': catFilter === ALL }" @click="catFilter = ALL">All <span>{{ scenes.length }}</span></button>
          <button class="og-chip" :class="{ 'og-chip--on': catFilter === NONE }" @click="catFilter = NONE">Uncategorized <span>{{ uncategorizedCount }}</span></button>
          <button
            v-for="c in usedCategories" :key="c.name"
            class="og-chip" :class="{ 'og-chip--on': catFilter === c.name }"
            @click="catFilter = c.name"
          >{{ c.name }} <span>{{ c.count }}</span></button>
        </div>
        <div v-if="floors.length" class="og-chips" role="group" aria-label="Filter by floor">
          <button class="og-chip og-chip--floor" :class="{ 'og-chip--on': floorFilter === ALL }" @click="floorFilter = ALL">All floors</button>
          <button
            v-for="f in floors" :key="f.id"
            class="og-chip og-chip--floor" :class="{ 'og-chip--on': floorFilter === f.id }"
            @click="floorFilter = f.id"
          >{{ f.name }} <span>{{ floorCounts[f.id] ?? 0 }}</span></button>
          <button class="og-chip og-chip--floor" :class="{ 'og-chip--on': floorFilter === NONE }" @click="floorFilter = NONE">Not on a plan <span>{{ floorCounts[NONE] ?? 0 }}</span></button>
        </div>
        <p class="og-muted og-help">
          Click photos to select them · <b>Shift-click</b> selects everything in between ·
          give them a category below. A category with 2+ photos becomes a folder in the viewer's dock.
        </p>
      </div>

      <!-- Grid -->
      <div class="og-grid-wrap" :class="{ 'og-grid-wrap--bar': selected.size > 0 }">
        <div class="og-grid-head">
          <span class="og-muted">{{ shown.length }} shown</span>
          <button class="og-link" :disabled="!shown.length" @click="selectAllShown">Select all shown</button>
          <button v-if="selected.size" class="og-link" @click="clearSelection">Clear selection</button>
        </div>
        <p v-if="!shown.length" class="og-muted og-none">No photos match these filters.</p>
        <div class="og-grid">
          <button
            v-for="(sc, i) in shown" :key="sc.id"
            type="button"
            class="og-card" :class="{ 'og-card--on': selected.has(sc.id) }"
            :aria-pressed="selected.has(sc.id)"
            @click="onCardClick($event, sc.id, i)"
          >
            <span class="og-thumb">
              <img v-if="sc.thumb" :src="sc.thumb" alt="" loading="lazy" draggable="false" />
              <span class="og-check" aria-hidden="true">✓</span>
            </span>
            <span class="og-name" :title="sc.name">{{ sc.name }}</span>
            <span class="og-meta">
              <span v-if="sc.group" class="og-tag">{{ sc.group }}</span>
              <span v-else class="og-tag og-tag--none">No category</span>
              <small v-if="floorName(sc.floorId)">{{ floorName(sc.floorId) }}</small>
            </span>
          </button>
        </div>
      </div>

      <!-- Action bar -->
      <Transition name="og-bar">
        <div v-if="selected.size" class="og-action" role="region" aria-label="Set category">
          <span class="og-count">{{ selected.size }} selected</span>
          <input
            ref="categoryInput"
            v-model="categoryDraft"
            class="og-input"
            type="text"
            maxlength="40"
            list="og-category-options"
            placeholder="Category, e.g. Food Court"
            @keydown.enter.prevent="apply(categoryDraft)"
          />
          <datalist id="og-category-options">
            <option v-for="c in categoryOptions" :key="c" :value="c" />
          </datalist>
          <div class="og-quick">
            <button
              v-for="c in categoryOptions.slice(0, 6)" :key="c"
              class="og-chip" :class="{ 'og-chip--on': categoryDraft.trim() === c }"
              @click="categoryDraft = c"
            >{{ c }}</button>
          </div>
          <button class="og-btn og-btn--primary" :disabled="saving || !categoryDraft.trim()" @click="apply(categoryDraft)">
            {{ saving ? 'Saving…' : 'Apply' }}
          </button>
          <button class="og-btn" :disabled="saving" @click="apply('')">Remove category</button>
          <button class="og-btn og-btn--icon" aria-label="Clear selection" @click="clearSelection">✕</button>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, onActivated, onDeactivated } from 'vue'
import { toast } from 'vue-sonner'
import { useImage } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { isPlaced } from '~/shared/utils/floorPlan'
import { CATEGORY_SUGGESTIONS, normalizeGroup } from '~/shared/utils/sceneGroups'

const props = defineProps<{ spaceId: string }>()
const emit = defineEmits<{
  /** Categories saved — lets the 360° Tour tab update its own scene list. */
  (e: 'categories-changed', payload: { sceneIds: string[]; groupName: string | null }): void
}>()

const { apiFetch } = useApiFetch()
const nuxtImg = useImage()

const ALL = '__all'
const NONE = '__none'
// The backend accepts up to 500 ids per request.
const CHUNK = 500

type Row = { id: string; name: string; thumb: string; group: string; floorId: string | null }
type Floor = { id: string; name: string }

const loading = ref(true)
const loadError = ref(false)
const scenes = ref<Row[]>([])
const floors = ref<Floor[]>([])

async function loadScenes() {
  const res: any = await apiFetch(`/spaces/${props.spaceId}/scenes`)
  const list: any[] = res?.scenes ?? res?.data?.scenes ?? []
  scenes.value = list
    .filter(sc => sc?.id)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((sc, i) => {
      const src = sc.thumbnail_url || sc.raw_image_url || ''
      let thumb = src
      try { if (src) thumb = nuxtImg(src, { width: 320, quality: 70, format: 'webp' }) || src } catch { /* keep src */ }
      return {
        id: sc.id,
        name: (sc.name || '').trim() || `View ${i + 1}`,
        thumb,
        group: normalizeGroup(sc.group_name),
        floorId: isPlaced(sc) ? sc.floor_plan_id : null,
      }
    })
  // Drop selections for photos deleted elsewhere meanwhile.
  const live = new Set(scenes.value.map(s => s.id))
  for (const id of [...selected.value]) if (!live.has(id)) selected.value.delete(id)
}

// Floors are optional context: a tour without floor plans (or before the
// floor-plan migration) just has no floor filter.
async function loadFloors() {
  try {
    const res: any = await apiFetch(`/spaces/${props.spaceId}/floor-plans`)
    const list: any[] = res?.floor_plans ?? res?.data?.floor_plans ?? []
    floors.value = list.filter(f => f?.id).map(f => ({ id: f.id, name: f.name || 'Floor plan' }))
  } catch {
    floors.value = []
  }
}

async function init() {
  loading.value = true
  loadError.value = false
  try {
    await Promise.all([loadScenes(), loadFloors()])
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

// ── Filters ─────────────────────────────────────────────────
const search = ref('')
const catFilter = ref<string>(ALL)
const floorFilter = ref<string>(ALL)

const usedCategories = computed(() => {
  const counts = new Map<string, number>()
  for (const s of scenes.value) if (s.group) counts.set(s.group, (counts.get(s.group) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name))
})
const uncategorizedCount = computed(() => scenes.value.filter(s => !s.group).length)
const floorCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const s of scenes.value) {
    const k = s.floorId && floors.value.some(f => f.id === s.floorId) ? s.floorId : NONE
    counts[k] = (counts[k] ?? 0) + 1
  }
  return counts
})
const floorName = (id: string | null) => (id ? floors.value.find(f => f.id === id)?.name ?? '' : '')

// A category filter whose last photo was moved away falls back to All.
watch(usedCategories, (cats) => {
  if (catFilter.value !== ALL && catFilter.value !== NONE && !cats.some(c => c.name === catFilter.value)) catFilter.value = ALL
})
watch(floors, (fs) => {
  if (floorFilter.value !== ALL && floorFilter.value !== NONE && !fs.some(f => f.id === floorFilter.value)) floorFilter.value = ALL
})

const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return scenes.value.filter((s) => {
    if (catFilter.value === NONE ? !!s.group : catFilter.value !== ALL && s.group !== catFilter.value) return false
    if (floorFilter.value !== ALL) {
      const onKnownFloor = !!s.floorId && floors.value.some(f => f.id === s.floorId)
      if (floorFilter.value === NONE ? onKnownFloor : s.floorId !== floorFilter.value) return false
    }
    return !q || s.name.toLowerCase().includes(q)
  })
})

const categoryOptions = computed(() => {
  const used = usedCategories.value.map(c => c.name)
  return [...used, ...CATEGORY_SUGGESTIONS.filter(c => !used.includes(c))]
})

// ── Selection ───────────────────────────────────────────────
const selected = ref(new Set<string>())
let anchorIndex: number | null = null

function onCardClick(e: MouseEvent, id: string, index: number) {
  const next = new Set(selected.value)
  if (e.shiftKey && anchorIndex !== null && shown.value[anchorIndex]) {
    // Range: everything between the last clicked card and this one.
    const [a, b] = anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex]
    for (const s of shown.value.slice(a, b + 1)) next.add(s.id)
  } else if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  anchorIndex = index
  selected.value = next
}

function selectAllShown() {
  selected.value = new Set([...selected.value, ...shown.value.map(s => s.id)])
}

function clearSelection() {
  selected.value = new Set()
  anchorIndex = null
}

// Shift-click ranges refer to positions in the shown list.
watch(shown, () => { anchorIndex = null })

// ── Apply ───────────────────────────────────────────────────
const categoryDraft = ref('')
const categoryInput = ref<HTMLInputElement | null>(null)
const saving = ref(false)

async function apply(raw: string) {
  const groupName = raw.trim().slice(0, 40) || null
  const ids = [...selected.value]
  if (!ids.length || saving.value) return
  saving.value = true
  const done: string[] = []
  try {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const res: any = await apiFetch(`/spaces/${props.spaceId}/scenes/category`, {
        method: 'PATCH',
        body: { scene_ids: ids.slice(i, i + CHUNK), group_name: groupName },
      })
      done.push(...((res?.scene_ids ?? res?.data?.scene_ids ?? []) as string[]))
    }
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Could not save the category')
  } finally {
    if (done.length) {
      const hit = new Set(done)
      scenes.value = scenes.value.map(s => (hit.has(s.id) ? { ...s, group: groupName ?? '' } : s))
      emit('categories-changed', { sceneIds: done, groupName })
      toast.success(groupName
        ? `${done.length} photo${done.length === 1 ? '' : 's'} added to ${groupName}`
        : `Category removed from ${done.length} photo${done.length === 1 ? '' : 's'}`)
      clearSelection()
      categoryDraft.value = ''
    }
    saving.value = false
  }
}

// ── Keyboard ────────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  const typing = (e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]')
  if (e.key === 'Escape' && selected.value.size) { clearSelection(); return }
  if (typing) return
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && shown.value.length) {
    e.preventDefault()
    selectAllShown()
  }
}

// KeepAlive: only listen while this tab is on screen.
let listening = false
function listen(on: boolean) {
  if (on === listening) return
  listening = on
  if (on) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
}

let firstActivation = true
onMounted(() => { listen(true); init() })
// Photos may have been added/renamed in the 360° Tour tab meanwhile.
onActivated(() => {
  listen(true)
  if (firstActivation) { firstActivation = false; return }
  Promise.all([loadScenes(), loadFloors()]).catch(() => {})
})
onDeactivated(() => listen(false))
onBeforeUnmount(() => listen(false))
</script>

<style scoped>
.og-root { position: fixed; inset: 0; display: flex; flex-direction: column; padding-top: 130px; background: #0b0d12; color: #fff; }
.og-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; }
.og-title { font-size: 20px; font-weight: 800; }
.og-muted { color: rgba(255,255,255,0.5); font-size: 12px; line-height: 1.5; }
.og-spin { width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.15); border-top-color: #fff; animation: og-rot 0.8s linear infinite; }
@keyframes og-rot { to { transform: rotate(360deg); } }

.og-btn { height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.07); color: #fff; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.og-btn:hover:not(:disabled) { background: rgba(255,255,255,0.13); }
.og-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.og-btn--primary { background: #22c55e; border-color: #22c55e; color: #0b0d14; }
.og-btn--primary:hover:not(:disabled) { background: #4ade80; }
.og-btn--icon { width: 36px; padding: 0; }

/* Filters: the root's top padding keeps them clear of TopBar + the editor's tab switch. */
.og-bar { flex: none; display: flex; flex-direction: column; gap: 8px; padding: 0 16px 8px; }
.og-search { width: min(360px, 100%); height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 13px; outline: none; }
.og-search:focus { border-color: rgba(96,165,250,0.7); }
.og-chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
.og-chip { flex: none; height: 28px; padding: 0 11px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.75); font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.og-chip span { margin-left: 3px; opacity: 0.55; font-weight: 600; }
.og-chip:not(.og-chip--on):hover { background: rgba(255,255,255,0.1); color: #fff; }
.og-chip--on { background: #fff; border-color: #fff; color: #0b0d12; }
.og-chip--floor { border-style: dashed; }
.og-chip--floor.og-chip--on { border-style: solid; }
.og-help b { color: rgba(255,255,255,0.75); }

.og-grid-wrap { flex: 1; min-height: 0; overflow-y: auto; padding: 0 16px 24px; }
.og-grid-wrap--bar { padding-bottom: 110px; }
.og-grid-head { display: flex; align-items: center; gap: 14px; padding: 4px 0 10px; }
.og-link { border: 0; background: none; color: #93c5fd; font-size: 12px; font-weight: 700; cursor: pointer; padding: 0; }
.og-link:disabled { opacity: 0.4; cursor: default; }
.og-none { padding: 24px 0; }
.og-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }

.og-card { display: flex; flex-direction: column; gap: 6px; padding: 6px 6px 8px; border-radius: 12px; border: 2px solid transparent; background: rgba(255,255,255,0.04); color: #fff; text-align: left; cursor: pointer; user-select: none; }
.og-card:hover { background: rgba(255,255,255,0.08); }
.og-card--on { border-color: #3b82f6; background: rgba(59,130,246,0.14); }
.og-thumb { position: relative; display: block; aspect-ratio: 2 / 1; border-radius: 8px; overflow: hidden; background: #1f2430; }
.og-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.og-check { position: absolute; top: 6px; right: 6px; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; border: 2px solid rgba(255,255,255,0.85); background: rgba(0,0,0,0.35); color: transparent; }
.og-card--on .og-check { background: #3b82f6; border-color: #fff; color: #fff; }
.og-name { font-size: 12.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 2px; }
.og-meta { display: flex; align-items: center; gap: 6px; min-width: 0; padding: 0 2px; }
.og-meta small { color: rgba(255,255,255,0.45); font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.og-tag { flex: none; max-width: 100%; padding: 1px 7px; border-radius: 6px; background: rgba(34,197,94,0.16); color: #86efac; font-size: 10.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.og-tag--none { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); }

.og-action {
  position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 20;
  display: flex; align-items: center; gap: 8px; padding: 10px; width: min(1040px, calc(100vw - 32px));
  background: rgba(14,14,18,0.94); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; backdrop-filter: blur(16px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
}
.og-count { flex: none; padding: 0 6px; font-size: 13px; font-weight: 800; color: #93c5fd; white-space: nowrap; }
.og-input { flex: 0 1 220px; min-width: 140px; height: 36px; padding: 0 11px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #fff; font-size: 13px; font-weight: 600; outline: none; }
.og-input:focus { border-color: rgba(96,165,250,0.7); }
.og-quick { flex: 1; min-width: 0; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }

.og-bar-enter-active, .og-bar-leave-active { transition: opacity 160ms, transform 160ms; }
.og-bar-enter-from, .og-bar-leave-to { opacity: 0; transform: translate(-50%, 12px); }

@media (max-width: 768px) {
  .og-root { padding-top: 100px; }
  .og-bar { padding: 0 12px 6px; }
  .og-help { display: none; }
  .og-grid-wrap { padding: 0 12px 24px; }
  .og-grid-wrap--bar { padding-bottom: 170px; }
  .og-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
  .og-action { flex-wrap: wrap; bottom: 12px; width: calc(100vw - 24px); }
  .og-input { flex: 1 1 100%; order: 2; }
  .og-quick { flex: 1 1 100%; order: 3; }
  .og-count { order: 1; flex: 1; }
  .og-action .og-btn { order: 4; flex: 1; }
  .og-action .og-btn--icon { order: 1; flex: none; }
}
</style>
