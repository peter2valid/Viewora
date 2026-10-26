<template>
  <div class="vi-backdrop" @click.self="!busy && emit('close')">
    <div class="vi" role="dialog" aria-label="Import a mall map">
      <div class="vi-head">
        <p class="vi-title">Import a mall map</p>
        <button type="button" class="vi-x" :disabled="busy" aria-label="Close" @click="emit('close')">×</button>
      </div>

      <p class="vi-text">
        Brings in a mall map made with <b>Mapplic</b> (with its Routes add-on): every floor, shop and walkway,
        so visitors can search a shop and get directions to it across floors.
      </p>
      <ol class="vi-how">
        <li>On the mall's map page, save the page (Ctrl+S → "Webpage, HTML only") — or get the map's JSON file.</li>
        <li>Download each floor's SVG drawing.</li>
        <li>Select them all here at once.</li>
      </ol>

      <input ref="fileEl" type="file" multiple accept=".json,.html,.htm,.svg,application/json,text/html,image/svg+xml" class="vi-hidden" @change="onFiles" />
      <button type="button" class="vi-btn" :disabled="busy" @click="fileEl?.click()">
        {{ source ? 'Add more files' : 'Choose files' }}
      </button>
      <p v-if="error" class="vi-error">{{ error }}</p>

      <template v-if="source">
        <table class="vi-table">
          <thead><tr><th>Floor</th><th>Drawing</th><th>Shops</th><th>Walkways</th><th>Goes to</th></tr></thead>
          <tbody>
            <tr v-for="row in rows" :key="row.level.id">
              <td>{{ row.level.title }}</td>
              <td :class="row.svg ? 'vi-ok' : 'vi-miss'">{{ row.svg ? '✓' : `missing ${levelFileName(row.level) || ''}` }}</td>
              <td>{{ row.result ? `${row.result.stats.places}` : '–' }}<small v-if="row.result"> · {{ row.result.stats.doors }} doors</small></td>
              <td>{{ row.result ? row.result.stats.segments : '–' }}<small v-if="row.result"> · {{ row.result.stats.links }} lifts/esc.</small></td>
              <td>
                <span v-if="row.status" class="vi-status" :class="`vi-status--${row.statusTone}`">{{ row.status }}</span>
                <template v-else>{{ row.target ? `Update "${row.target.name}"` : 'New floor' }}</template>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="newFloorCount > roomForFloors" class="vi-error">
          This would make {{ existingFloors.length + newFloorCount }} floors; a listing can have {{ MAX_FLOOR_PLANS }}. Remove some floors first.
        </p>
        <p class="vi-muted">Floors whose name matches an existing floor get the shops and walkways added to that floor (its drawing is kept). Others are added as new floors.</p>
        <div class="vi-actions">
          <button type="button" class="vi-btn" :disabled="busy" @click="emit('close')">{{ done ? 'Close' : 'Cancel' }}</button>
          <button
            v-if="!done"
            type="button" class="vi-btn vi-btn--primary"
            :disabled="busy || !readyRows.length || newFloorCount > roomForFloors"
            @click="runImport"
          >{{ busy ? 'Importing…' : `Import ${readyRows.length} floor${readyRows.length === 1 ? '' : 's'}` }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { MAX_FLOOR_PLANS, type FloorPlan } from '~/shared/utils/floorPlan'
import type { VenueFloorData } from '~/shared/utils/venue'
import {
  cleanFloorSvg, importMapplicLevel, levelFileName, measureSvg, parseMapplicSource, rasterizeSvg,
  type ImportedLevel, type MapplicData, type MapplicLevel,
} from '~/shared/utils/mapplicImport'

const props = defineProps<{
  existingFloors: FloorPlan[]
  addFloorPlan: (file: File, name?: string) => Promise<FloorPlan>
  setVenue: (id: string, venue: VenueFloorData | null) => Promise<void>
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'imported', floorIds: string[]): void }>()

const fileEl = ref<HTMLInputElement | null>(null)
const source = ref<MapplicData | null>(null)
const svgs = reactive<Record<string, string>>({}) // lower-case file name → text
const results = reactive<Record<string, ImportedLevel | null>>({})
const statuses = reactive<Record<string, { text: string; tone: 'run' | 'ok' | 'err' }>>({})
const error = ref('')
const busy = ref(false)
const done = ref(false)

function svgFor(level: MapplicLevel): string | null {
  const want = levelFileName(level)
  if (want && svgs[want]) return svgs[want]
  // Renamed downloads ("Ground Floor.svg", "ground-floor.svg"): match on the level id / title.
  const keys = Object.keys(svgs)
  const slug = (s: string) => s.toLowerCase().replace(/\.svg$/, '').replace(/[^a-z0-9]+/g, '')
  const hit = keys.find(k => slug(k) === slug(level.id) || slug(k) === slug(level.title))
  return hit ? svgs[hit] : null
}

const rows = computed(() => (source.value?.levels ?? []).map(level => {
  const st = statuses[level.id]
  return {
    level,
    svg: svgFor(level),
    result: results[level.id] ?? null,
    target: props.existingFloors.find(f => f.name.trim().toLowerCase() === level.title.trim().toLowerCase()) ?? null,
    status: st?.text ?? '',
    statusTone: st?.tone ?? 'run',
  }
}))
const readyRows = computed(() => rows.value.filter(r => r.svg && r.result))
const newFloorCount = computed(() => readyRows.value.filter(r => !r.target).length)
const roomForFloors = computed(() => MAX_FLOOR_PLANS - props.existingFloors.length)

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  error.value = ''
  for (const f of files) {
    const text = await f.text()
    if (/\.svg$/i.test(f.name) || f.type === 'image/svg+xml') { svgs[f.name.toLowerCase()] = text; continue }
    try { source.value = parseMapplicSource(text) } catch (err: any) { error.value = `${f.name}: ${err?.message || 'could not read it'}` }
  }
  if (!source.value && Object.keys(svgs).length) error.value = 'Also choose the map page (saved HTML) or its JSON file.'
  analyse()
}

/** Dry run: read every matched floor so the table shows what will come in. */
function analyse() {
  const data = source.value
  if (!data) return
  for (const level of data.levels) {
    const svg = svgFor(level)
    if (!svg || results[level.id]) continue
    const m = measureSvg(svg)
    try {
      results[level.id] = importMapplicLevel(data, level, svg, m)
    } catch (err: any) {
      results[level.id] = null
      statuses[level.id] = { text: err?.message || 'Could not read', tone: 'err' }
    } finally {
      m.dispose()
    }
  }
}

async function runImport() {
  busy.value = true
  const ids: string[] = []
  for (const row of readyRows.value) {
    statuses[row.level.id] = { text: 'Working…', tone: 'run' }
    try {
      let floorId = row.target?.id
      if (!floorId) {
        statuses[row.level.id] = { text: 'Drawing…', tone: 'run' }
        const png = await rasterizeSvg(cleanFloorSvg(row.svg!), levelFileName(row.level) || `${row.level.id}.svg`)
        statuses[row.level.id] = { text: 'Uploading…', tone: 'run' }
        const created = await props.addFloorPlan(png, row.result!.title)
        floorId = created.id
      }
      statuses[row.level.id] = { text: 'Saving shops…', tone: 'run' }
      await props.setVenue(floorId, row.result!.venue)
      ids.push(floorId)
      statuses[row.level.id] = { text: '✓ Imported', tone: 'ok' }
    } catch (err: any) {
      statuses[row.level.id] = { text: err?.data?.statusMessage || err?.message || 'Failed', tone: 'err' }
    }
  }
  busy.value = false
  done.value = true
  if (ids.length) emit('imported', ids)
}
</script>

<style scoped>
.vi-backdrop { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 16px; background: rgba(0,0,0,0.6); }
.vi { width: 680px; max-width: 100%; max-height: calc(100vh - 32px); overflow-y: auto; padding: 20px; border-radius: 18px; background: #12141c; border: 1px solid rgba(255,255,255,0.1); color: #fff; box-shadow: 0 24px 64px rgba(0,0,0,0.6); }
.vi-head { display: flex; align-items: center; justify-content: space-between; }
.vi-title { margin: 0; font-size: 17px; font-weight: 800; }
.vi-x { width: 32px; height: 32px; border: 0; border-radius: 50%; background: rgba(255,255,255,0.08); color: #fff; font-size: 18px; cursor: pointer; }
.vi-text { margin: 10px 0 6px; font-size: 13px; line-height: 1.55; color: rgba(255,255,255,0.7); }
.vi-how { margin: 0 0 14px; padding-left: 20px; font-size: 12.5px; line-height: 1.6; color: rgba(255,255,255,0.6); }
.vi-hidden { display: none; }
.vi-btn { height: 38px; padding: 0 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.07); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.vi-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.vi-btn--primary { background: #22c55e; border-color: #22c55e; color: #0b0d14; }
.vi-error { margin: 10px 0 0; font-size: 12.5px; color: #fca5a5; }
.vi-muted { margin: 10px 0 0; font-size: 11.5px; line-height: 1.5; color: rgba(255,255,255,0.45); }
.vi-table { width: 100%; margin-top: 14px; border-collapse: collapse; font-size: 12.5px; }
.vi-table th { padding: 6px 8px; text-align: left; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.45); border-bottom: 1px solid rgba(255,255,255,0.08); }
.vi-table td { padding: 7px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.vi-table small { color: rgba(255,255,255,0.45); }
.vi-ok { color: #4ade80; }
.vi-miss { color: #fbbf24; font-size: 11.5px; word-break: break-all; }
.vi-status--run { color: #93c5fd; }
.vi-status--ok { color: #4ade80; }
.vi-status--err { color: #fca5a5; }
.vi-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>
