<template>
  <div class="amv" role="dialog" aria-label="Aerial plot map">
    <AerialCanvas
      v-if="current"
      ref="canvasRef"
      :key="current.id"
      :image-url="current.image_url"
      :width="current.width"
      :height="current.height"
      :shapes="current.shapes"
      :selected-id="selectedId"
      :insets="{ top: 64, bottom: maps.length > 1 ? (groups.length > 1 && visibleMaps.length > 1 ? 104 : 60) : 12 }"
      @shape-click="select"
      @canvas-click="selectedId = null"
      @interact="hintVisible = false"
    />

    <!-- How-to-move hint: shown while the intro plays, gone at the first touch -->
    <Transition name="amv-hint">
      <div v-if="hintVisible" class="amv-hint" aria-hidden="true">
        <span class="amv-hint__hand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.5 4.5a1.5 1.5 0 0 1 3 0v6"/><path d="M12.5 7a1.5 1.5 0 0 1 3 0v3.5"/><path d="M6.5 9a1.5 1.5 0 0 1 3 0v1.5"/>
            <path d="M6.5 10.5v2a5.5 5.5 0 0 0 5.5 5.5h.5a5.5 5.5 0 0 0 5.5-5.5V10"/>
          </svg>
        </span>
        <span>{{ isTouch ? 'Drag to explore · Pinch to zoom · Tap a plot' : 'Drag to explore · Scroll to zoom · Click a plot' }}</span>
      </div>
    </Transition>

    <!-- Header -->
    <div class="amv-top">
      <button v-if="closable" class="amv-close" aria-label="Back to the 360 tour" @click="$emit('close')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        <span>360° tour</span>
      </button>
      <div v-if="legend.length" class="amv-legend">
        <span class="amv-legend__title">Plots</span>
        <span v-for="l in legend" :key="l.key"><i :style="{ background: l.color }" />{{ l.count }} {{ l.label.toLowerCase() }}</span>
      </div>
    </div>

    <!-- Photo switcher: categories (if used) → the photos inside the open one -->
    <div v-if="maps.length > 1" class="amv-switch">
      <div v-if="groups.length > 1" class="amv-tabs amv-tabs--groups">
        <button
          v-for="g in groups" :key="g.key"
          :class="{ 'amv-tab--on': g.key === activeGroupKey }"
          @click="openGroupTab(g.key)"
        >{{ g.label }}<small v-if="g.maps.length > 1">{{ g.maps.length }}</small></button>
      </div>
      <div v-if="visibleMaps.length > 1" class="amv-tabs">
        <button v-for="m in visibleMaps" :key="m.id" :class="{ 'amv-tab--on': m.id === currentId }" @click="switchTo(m.id)">{{ m.title }}</button>
      </div>
    </div>

    <!-- Selected shape card -->
    <Transition name="amv-card">
      <div v-if="selected" class="amv-card">
        <button class="amv-card__x" aria-label="Close" @click="selectedId = null">×</button>
        <template v-if="selected.kind === 'plot'">
          <span class="amv-status" :style="{ color: status.color }"><i :style="{ background: status.color }" />{{ status.label }}</span>
          <p class="amv-card__title">{{ selected.label || 'Plot' }}</p>
          <div v-if="selected.size || selected.price" class="amv-facts">
            <div v-if="selected.size"><span>Size</span><b>{{ selected.size }}</b></div>
            <div v-if="selected.price"><span>Price</span><b>{{ selected.price }}</b></div>
          </div>
          <p v-if="selected.text" class="amv-card__text">{{ selected.text }}</p>
          <button v-if="selected.status !== 'sold'" class="amv-cta" :style="{ background: status.color }" @click="enquire">Enquire about this plot</button>
          <p class="amv-note">Boundaries are indicative. Confirm on site with a licensed surveyor.</p>
        </template>
        <template v-else>
          <span class="amv-status">{{ selected.kind === 'road' ? 'Access' : selected.kind === 'beacon' ? 'Survey beacon' : 'Estate' }}</span>
          <p class="amv-card__title">{{ selected.label }}</p>
          <p v-if="selected.text" class="amv-card__text">{{ selected.text }}</p>
          <a v-if="selected.kind === 'road' && selected.url" :href="selected.url" target="_blank" rel="noopener noreferrer" class="amv-cta amv-cta--road">Get directions ↗</a>
          <p v-if="selected.kind === 'beacon'" class="amv-note">Beacon positions are indicative. Verify with the official survey plan.</p>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import AerialCanvas from '~/features/aerial/AerialCanvas.vue'
import { AERIAL_STATUS, type AerialMap, type AerialPlotStatus } from '~/shared/utils/aerialGeometry'
import type { PlotEnquiryDetail } from '~/shared/utils/viewerAdapters/landMarkers'

const props = withDefaults(defineProps<{ maps: AerialMap[]; closable?: boolean }>(), { closable: true })
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'enquire', detail: PlotEnquiryDetail): void
}>()

const canvasRef = ref<InstanceType<typeof AerialCanvas> | null>(null)
const currentId = ref(props.maps[0]?.id ?? null)
const selectedId = ref<string | null>(null)

const current = computed(() => props.maps.find(m => m.id === currentId.value) ?? props.maps[0] ?? null)
const selected = computed(() => current.value?.shapes.find(s => s.id === selectedId.value) ?? null)
const status = computed(() => AERIAL_STATUS[(selected.value?.status || 'available') as AerialPlotStatus])

const legend = computed(() => {
  const c: Record<AerialPlotStatus, number> = { available: 0, reserved: 0, sold: 0 }
  for (const s of current.value?.shapes ?? []) if (s.kind === 'plot') c[s.status || 'available']++
  return (Object.keys(c) as AerialPlotStatus[]).filter(k => c[k]).map(k => ({ key: k, count: c[k], ...AERIAL_STATUS[k] }))
})

// Categories: photos with the same group_name are shown together; photos
// without one fall under "Other" (or the only tab when none are categorised).
const groups = computed(() => {
  const out: Array<{ key: string; label: string; maps: AerialMap[] }> = []
  for (const m of props.maps) {
    const key = (m.group_name ?? '').trim()
    let g = out.find(x => x.key === key)
    if (!g) { g = { key, label: key || 'Other', maps: [] }; out.push(g) }
    g.maps.push(m)
  }
  return out
})
const activeGroupKey = computed(() => (current.value?.group_name ?? '').trim())
const visibleMaps = computed(() => groups.value.length > 1
  ? (groups.value.find(g => g.key === activeGroupKey.value)?.maps ?? [])
  : props.maps)
function openGroupTab(key: string) {
  const first = groups.value.find(g => g.key === key)?.maps[0]
  if (first) switchTo(first.id)
}

// Intro glide on open and on every photo switch (the canvas is re-created per photo).
const hintVisible = ref(true)
// Set after mount so server-rendered and browser HTML match.
const isTouch = ref(false)
let hintTimer: ReturnType<typeof setTimeout> | null = null
function startIntro() {
  void nextTick(() => canvasRef.value?.playIntro(current.value?.intro ?? null))
}
onMounted(() => {
  isTouch.value = window.matchMedia?.('(pointer: coarse)').matches ?? false
  startIntro()
  hintTimer = setTimeout(() => { hintVisible.value = false }, 14000)
})
onBeforeUnmount(() => { if (hintTimer) clearTimeout(hintTimer) })
watch(currentId, () => startIntro())

function select(id: string) { selectedId.value = id }
function switchTo(id: string) { currentId.value = id; selectedId.value = null }

function enquire() {
  const s = selected.value
  if (!s) return
  emit('enquire', { hotspotId: s.id, label: s.label || 'Plot', status: s.status || 'available', size: s.size, price: s.price })
}
</script>

<style scoped>
.amv { position: absolute; inset: 0; z-index: 70; background: #0b0d12; }
.amv-top { position: absolute; top: 14px; left: 14px; right: 14px; z-index: 5; display: flex; align-items: center; gap: 10px; pointer-events: none; }
.amv-top > * { pointer-events: auto; }
.amv-close { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px 0 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); background: rgba(10,12,20,0.82); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; backdrop-filter: blur(12px); }
.amv-legend { margin: 0 auto; display: flex; align-items: center; gap: 12px; padding: 8px 14px; border-radius: 999px; background: rgba(10,11,16,0.82); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 600; white-space: nowrap; backdrop-filter: blur(12px); pointer-events: none; }
.amv-legend__title { font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.5); }
.amv-legend i, .amv-status i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.amv-switch { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 5; display: flex; flex-direction: column; align-items: center; gap: 6px; max-width: calc(100% - 100px); }
.amv-tabs--groups button { font-weight: 800; }
.amv-tabs small { margin-left: 6px; padding: 1px 6px; border-radius: 999px; background: rgba(255,255,255,0.14); font-size: 10px; }
.amv-tabs { display: flex; gap: 4px; padding: 4px; max-width: 100%; overflow-x: auto; border-radius: 12px; background: rgba(10,12,20,0.82); border: 1px solid rgba(255,255,255,0.1); }
.amv-tabs button { flex-shrink: 0; height: 32px; padding: 0 12px; border-radius: 9px; border: 0; background: transparent; color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 700; cursor: pointer; }
.amv-tabs .amv-tab--on { background: rgba(255,255,255,0.14); color: #fff; }

.amv-card { position: absolute; left: 16px; bottom: 18px; z-index: 6; width: 280px; max-width: calc(100% - 32px); padding: 16px; border-radius: 18px; background: rgba(6,8,16,0.96); border: 1px solid rgba(255,255,255,0.11); box-shadow: 0 24px 64px rgba(0,0,0,0.6); color: #fff; }
.amv-card__x { position: absolute; top: 8px; right: 10px; width: 28px; height: 28px; border-radius: 50%; border: 0; background: rgba(255,255,255,0.08); color: #fff; font-size: 18px; cursor: pointer; }
.amv-status { display: inline-flex; align-items: center; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.6); }
.amv-card__title { margin: 6px 0 8px; font-size: 16px; font-weight: 800; }
.amv-card__text { margin: 0 0 10px; font-size: 12px; line-height: 1.55; color: rgba(255,255,255,0.6); }
.amv-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.amv-facts div { padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.06); }
.amv-facts span { display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.45); }
.amv-facts b { font-size: 14px; }
.amv-cta { display: block; width: 100%; padding: 10px; border: 0; border-radius: 11px; color: #0b0d14; font-size: 13px; font-weight: 800; text-align: center; text-decoration: none; cursor: pointer; }
.amv-cta--road { background: #facc15; }
.amv-note { margin: 10px 0 0; font-size: 10px; line-height: 1.45; color: rgba(255,255,255,0.38); }
.amv-hint {
  position: absolute; left: 50%; bottom: 96px; transform: translateX(-50%); z-index: 4;
  display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 999px;
  background: rgba(8, 10, 18, 0.72); border: 1px solid rgba(255,255,255,0.16);
  color: #fff; font-size: 13px; font-weight: 700; white-space: nowrap;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  pointer-events: none;
}
.amv-hint__hand { display: flex; animation: amv-swipe 1.8s ease-in-out infinite; }
@keyframes amv-swipe { 0%, 100% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
.amv-hint-enter-active, .amv-hint-leave-active { transition: opacity 0.35s; }
.amv-hint-enter-from, .amv-hint-leave-to { opacity: 0; }
@media (max-width: 640px) { .amv-hint { font-size: 11.5px; padding: 10px 14px; white-space: normal; max-width: calc(100% - 40px); text-align: center; } }

.amv-card-enter-active, .amv-card-leave-active { transition: opacity 0.2s, transform 0.2s; }
.amv-card-enter-from, .amv-card-leave-to { opacity: 0; transform: translateY(10px); }

@media (max-width: 640px) {
  .amv-card { left: 12px; right: 12px; width: auto; bottom: 64px; }
  .amv-legend { gap: 8px; padding: 6px 11px; font-size: 11px; }
  .amv-legend__title { display: none; }
  .amv-close span { display: none; }
  .amv-close { padding: 0 10px; }
}
</style>
