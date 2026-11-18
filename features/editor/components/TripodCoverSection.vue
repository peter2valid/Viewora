<template>
  <!-- Tripod cover: the owner's logo, round, under the camera in every scene.
       Edits a draft (v-model); the settings panel's Save keeps it. -->
  <div class="tc">
    <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="tc-hidden" @change="onFile" />

    <div class="tc-head">
      <div>
        <div class="tc-title">Tripod cover</div>
        <div class="tc-sub">Your logo on the floor, over the tripod: in every scene or only the ones you choose.</div>
      </div>
      <button
        v-if="model?.url"
        class="tc-toggle"
        :class="{ 'tc-toggle--on': model.enabled }"
        role="switch"
        :aria-checked="model.enabled"
        aria-label="Show the tripod cover in every scene"
        @click="patch({ enabled: !model.enabled })"
      >
        <span class="tc-toggle-thumb" />
      </button>
    </div>

    <!-- No image yet -->
    <div v-if="!model?.url" class="tc-empty">
      <button class="tc-btn tc-btn--primary" :disabled="uploading" @click="fileInput?.click()">
        <span v-if="uploading" class="tc-spin" />
        <template v-else>Upload image</template>
      </button>
      <button v-if="brandLogoUrl" class="tc-btn" :disabled="uploading" @click="useImage(brandLogoUrl)">Use my brand logo</button>
      <p class="tc-hint">Square logos fill the circle; others sit inside it. PNG with a transparent background works best.</p>
    </div>

    <template v-else>
      <div class="tc-preview-row">
        <div class="tc-preview" :class="{ 'tc-preview--off': !model.enabled }">
          <canvas ref="previewCanvas" class="tc-preview__canvas" :style="{ transform: `rotate(${model.rotation}deg)` }" />
          <span v-if="previewError" class="tc-preview__err">Can't load image</span>
        </div>
        <div class="tc-preview-actions">
          <button class="tc-btn tc-btn--sm" :disabled="uploading" @click="fileInput?.click()">
            <span v-if="uploading" class="tc-spin" />
            <template v-else>Replace</template>
          </button>
          <button v-if="brandLogoUrl && brandLogoUrl !== model.url" class="tc-btn tc-btn--sm" @click="useImage(brandLogoUrl)">Brand logo</button>
          <button class="tc-btn tc-btn--sm tc-btn--ghost" @click="emit('update:modelValue', null)">Remove</button>
          <button class="tc-btn tc-btn--sm tc-btn--look" :disabled="!model.enabled" @click="emit('look-down')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            Look down
          </button>
        </div>
      </div>

      <!-- Where it goes: every scene, or only the scenes picked here -->
      <div class="tc-where" :class="{ 'tc-where--off': !model.enabled }">
        <div class="tc-seg tc-seg--wide" role="radiogroup" aria-label="Which scenes get the tripod cover">
          <button role="radio" :aria-checked="mode === 'all'" :class="{ on: mode === 'all' }" @click="setMode('all')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            Every scene
          </button>
          <button role="radio" :aria-checked="mode === 'some'" :class="{ on: mode === 'some' }" @click="setMode('some')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><path d="m14 7 2 2 4-4"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke-dasharray="2 2"/></svg>
            Chosen scenes
          </button>
        </div>

        <p class="tc-summary" :class="{ 'tc-summary--warn': mode === 'some' && !onCount }">{{ summary }}</p>

        <div v-if="scenes.length" class="tc-scenes" role="group" :aria-label="mode === 'all' ? 'Untick scenes to leave them out' : 'Tick the scenes that get the cover'">
          <button
            v-for="sc in scenes"
            :key="sc.id"
            class="tc-scene"
            :class="{ on: showsOn(sc.id), here: sc.id === activeSceneId }"
            :aria-pressed="showsOn(sc.id)"
            :title="sc.name"
            @click="toggleScene(sc.id)"
          >
            <span class="tc-scene__thumb" :style="sc.thumb ? { backgroundImage: `url('${sc.thumb.replace(/'/g, '%27')}')` } : undefined">
              <span class="tc-scene__check" aria-hidden="true">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>
              </span>
              <span v-if="sc.id === activeSceneId" class="tc-scene__here">Here</span>
            </span>
            <span class="tc-scene__name">{{ sc.name }}</span>
          </button>
        </div>

        <div v-if="scenes.length > 1" class="tc-scenes-actions">
          <button class="tc-link" @click="setAll(true)">Select all</button>
          <span aria-hidden="true">·</span>
          <button class="tc-link" @click="setAll(false)">{{ mode === 'all' ? 'Leave all out' : 'Clear' }}</button>
          <template v-if="activeSceneId && !showsOn(activeSceneId)">
            <span aria-hidden="true">·</span>
            <span class="tc-not-here">Not on the scene you're viewing</span>
          </template>
        </div>
      </div>

      <div class="tc-field">
        <div class="tc-slider-header">
          <label class="tc-label" for="tc-size">Size</label>
          <span class="tc-val">{{ model.size }}°</span>
        </div>
        <input id="tc-size" type="range" class="tc-range" :min="NADIR_SIZE_MIN" :max="NADIR_SIZE_MAX" step="1"
               :value="model.size" @input="patch({ size: Number(($event.target as HTMLInputElement).value) })" />
      </div>

      <div class="tc-field">
        <div class="tc-slider-header">
          <label class="tc-label" for="tc-rot">Rotate</label>
          <span class="tc-val">{{ model.rotation }}°</span>
        </div>
        <input id="tc-rot" type="range" class="tc-range" min="-180" max="180" step="1"
               :value="model.rotation" @input="patch({ rotation: Number(($event.target as HTMLInputElement).value) })" />
      </div>

      <div class="tc-field tc-field--row">
        <span class="tc-label">Shape</span>
        <div class="tc-seg" role="radiogroup" aria-label="How the image sits in the circle">
          <button role="radio" :aria-checked="model.fit === 'fill'" :class="{ on: model.fit === 'fill' }" @click="patch({ fit: 'fill' })">Fill circle</button>
          <button role="radio" :aria-checked="model.fit === 'fit'" :class="{ on: model.fit === 'fit' }" @click="patch({ fit: 'fit' })">Fit inside</button>
        </div>
      </div>

      <div class="tc-field tc-field--row">
        <span class="tc-label">Background</span>
        <div class="tc-swatches">
          <button
            v-for="c in SWATCHES" :key="c ?? 'none'"
            class="tc-swatch" :class="{ on: model.bg === c, 'tc-swatch--none': !c }"
            :style="c ? { background: c } : undefined"
            :aria-label="c ? `Background ${c}` : 'No background'"
            :title="c ?? 'None'"
            @click="patch({ bg: c })"
          />
          <label class="tc-swatch tc-swatch--custom" :class="{ on: model.bg && !SWATCHES.includes(model.bg) }" title="Custom colour"
                 :style="model.bg && !SWATCHES.includes(model.bg) ? { background: model.bg } : undefined">
            <input type="color" :value="model.bg ?? '#ffffff'" aria-label="Custom background colour"
                   @input="patch({ bg: ($event.target as HTMLInputElement).value })" />
          </label>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import {
  DEFAULT_NADIR_COVER, NADIR_SIZE_MAX, NADIR_SIZE_MIN,
  drawCoverCanvas, loadCoverImage, nadirCoverShowsOn, suggestFit,
  type NadirCoverSettings,
} from '~/shared/utils/viewerAdapters/nadirCover'

const props = defineProps<{
  modelValue: NadirCoverSettings | null
  spaceId: string
  /** The tour's logo from Details, offered as a one-click choice. */
  brandLogoUrl?: string | null
  activeSceneId?: string | null
  /** The tour's scenes, in dock order (saved scenes only). */
  scenes: Array<{ id: string; name: string; thumb?: string | null }>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: NadirCoverSettings | null): void
  (e: 'look-down'): void
  (e: 'error', message: string): void
}>()

const SWATCHES: Array<string | null> = ['#ffffff', '#000000', null]

const { apiFetch } = useApiFetch()
const fileInput = ref<HTMLInputElement | null>(null)
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const uploading = ref(false)
const previewError = ref(false)

const model = computed(() => props.modelValue)
const mode = computed<'all' | 'some'>(() => (model.value?.mode === 'some' ? 'some' : 'all'))
const showsOn = (id: string) => !!model.value && nadirCoverShowsOn(model.value, id)
const onCount = computed(() => props.scenes.filter(sc => showsOn(sc.id)).length)

const summary = computed(() => {
  const total = props.scenes.length
  if (!model.value?.enabled) return 'Turned off. Your choices are kept for when you switch it back on.'
  if (mode.value === 'all') {
    if (!total) return 'On every scene, and on scenes you add later.'
    if (onCount.value === total) return `On all ${total} ${total === 1 ? 'scene' : 'scenes'}, and on scenes you add later.`
    if (!onCount.value) return 'Left out of every scene. Tick scenes to bring it back.'
    return `On ${onCount.value} of ${total} scenes, and on scenes you add later. Untick a scene to leave it out.`
  }
  if (!onCount.value) return 'Tick the scenes that should get the cover.'
  return `On ${onCount.value} of ${total} ${total === 1 ? 'scene' : 'scenes'}. Scenes you add later won't get it.`
})

/** Switching keeps what is on screen sensible: going to "chosen" starts from the
 *  scene being viewed (or the old picks), going back to "every" keeps exceptions. */
function setMode(next: 'all' | 'some') {
  const m = model.value
  if (!m || mode.value === next) return
  if (next === 'some') {
    const kept = (m.scene_ids ?? []).filter(id => props.scenes.some(sc => sc.id === id))
    const seed = kept.length ? kept : (props.activeSceneId ? [props.activeSceneId] : [])
    patch({ mode: 'some', scene_ids: seed })
  } else {
    patch({ mode: 'all' })
  }
}

function toggleScene(id: string) {
  const m = model.value
  if (!m) return
  if (mode.value === 'some') {
    const ids = m.scene_ids ?? []
    patch({ scene_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] })
  } else {
    const ids = m.hidden_scene_ids
    patch({ hidden_scene_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] })
  }
}

function setAll(on: boolean) {
  const ids = props.scenes.map(sc => sc.id)
  if (mode.value === 'some') patch({ scene_ids: on ? ids : [] })
  else patch({ hidden_scene_ids: on ? [] : ids })
}

function patch(p: Partial<NadirCoverSettings>) {
  if (!model.value) return
  emit('update:modelValue', { ...model.value, ...p })
}

/** Pick an image: shape from its proportions, keep the owner's other choices. */
async function useImage(url: string) {
  let fit: 'fill' | 'fit' = 'fill'
  try {
    const img = await loadCoverImage(url)
    fit = suggestFit(img.naturalWidth, img.naturalHeight)
  } catch { /* the preview will say it can't load */ }
  const base = model.value ?? { ...DEFAULT_NADIR_COVER, url }
  emit('update:modelValue', { ...base, url, fit, enabled: true })
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const types = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!types.includes(file.type)) { emit('error', 'Use a PNG, JPG, WebP or SVG image'); return }
  if (file.size > 10 * 1024 * 1024) { emit('error', 'Image is over 10 MB'); return }
  uploading.value = true
  try {
    const { uploadUrl, publicUrl } = (await apiFetch(`/spaces/${props.spaceId}/logo-url`, {
      method: 'POST',
      body: { contentType: file.type, fileName: file.name },
    })) as { uploadUrl: string; publicUrl: string }
    const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    if (!res.ok) throw new Error(`upload ${res.status}`)
    await useImage(publicUrl)
  } catch {
    emit('error', 'Image upload failed')
  } finally {
    uploading.value = false
  }
}

// Preview: the same drawing the viewer uses, so what you see is what visitors get.
let previewSeq = 0
async function drawPreview() {
  const m = model.value
  const seq = ++previewSeq
  previewError.value = false
  if (!m?.url) return
  await nextTick()
  try {
    const img = await loadCoverImage(m.url)
    if (seq !== previewSeq || !previewCanvas.value) return
    drawCoverCanvas(img, m, 256, previewCanvas.value)
  } catch {
    if (seq === previewSeq) previewError.value = true
  }
}
watch(() => [model.value?.url, model.value?.fit, model.value?.bg], drawPreview, { immediate: true })
</script>

<style scoped>
.tc { display: flex; flex-direction: column; gap: 14px; }
.tc-hidden { display: none; }
.tc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.tc-title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); }
.tc-sub { font-size: 10px; color: rgba(255,255,255,0.32); font-weight: 500; margin-top: 2px; }
.tc-label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.55); letter-spacing: 0.01em; }
.tc-hint { font-size: 10px; color: rgba(255,255,255,0.3); margin: 2px 0 0; line-height: 1.5; }

.tc-empty { display: flex; flex-wrap: wrap; gap: 8px; }
.tc-empty .tc-hint { flex-basis: 100%; }

.tc-btn {
  height: 32px; padding: 0 14px; border-radius: 7px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 600; font-family: inherit;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  transition: background 130ms, border-color 130ms;
}
.tc-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
.tc-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tc-btn--primary { background: #fff; color: #0e0e12; border-color: transparent; font-weight: 800; }
.tc-btn--primary:hover:not(:disabled) { background: rgba(255,255,255,0.88); }
.tc-btn--sm { height: 28px; padding: 0 10px; font-size: 11px; }
.tc-btn--ghost { background: transparent; color: rgba(255,255,255,0.45); }
.tc-btn--look { color: #fff; }

.tc-preview-row { display: flex; gap: 14px; align-items: center; }
.tc-preview {
  position: relative; flex-shrink: 0; width: 96px; height: 96px; border-radius: 50%;
  /* checkerboard: shows where the cover is see-through */
  background: repeating-conic-gradient(#2a2a30 0 25%, #1c1c21 0 50%) 0 0 / 12px 12px;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.12);
  overflow: hidden; transition: opacity 160ms;
}
.tc-preview--off { opacity: 0.35; }
.tc-preview__canvas { width: 100%; height: 100%; display: block; }
.tc-preview__err {
  position: absolute; inset: 0; display: grid; place-items: center; text-align: center;
  font-size: 10px; color: rgba(255,255,255,0.6); padding: 10px;
}
.tc-preview-actions { display: flex; flex-wrap: wrap; gap: 6px; }

.tc-field--row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.tc-slider-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
.tc-val { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); font-family: ui-monospace, monospace; }
.tc-range {
  width: 100%; height: 3px; appearance: none;
  background: rgba(255,255,255,0.12); border-radius: 2px; cursor: pointer; outline: none;
}
.tc-range::-webkit-slider-thumb {
  appearance: none; width: 14px; height: 14px; border-radius: 50%;
  background: #fff; border: 2px solid rgba(0,0,0,0.4);
  box-shadow: 0 2px 6px rgba(0,0,0,0.5); cursor: pointer;
}
.tc-range::-moz-range-thumb {
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff; border: 2px solid rgba(0,0,0,0.4); cursor: pointer;
}

.tc-seg { display: inline-flex; padding: 2px; border-radius: 7px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); }
.tc-seg button {
  height: 26px; padding: 0 10px; border: none; border-radius: 5px; background: transparent;
  color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 600; font-family: inherit; cursor: pointer;
}
.tc-seg button.on { background: rgba(255,255,255,0.9); color: #0e0e12; }

.tc-swatches { display: flex; gap: 8px; align-items: center; }
.tc-swatch {
  position: relative; width: 24px; height: 24px; border-radius: 50%; padding: 0; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.25); outline: 2px solid transparent; outline-offset: 2px;
}
.tc-swatch.on { outline-color: #fff; }
.tc-swatch--none { background: linear-gradient(135deg, transparent 45%, #ef4444 45% 55%, transparent 55%), #1c1c21; }
.tc-swatch--custom { background: conic-gradient(#ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444); overflow: hidden; }
.tc-swatch--custom input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; border: none; padding: 0; }

.tc-where {
  display: flex; flex-direction: column; gap: 10px;
  padding: 12px; border-radius: 10px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  transition: opacity 160ms;
}
.tc-where--off { opacity: 0.5; }
.tc-seg--wide { display: flex; }
.tc-seg--wide button { flex: 1; height: 32px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; }
.tc-summary { margin: 0; font-size: 11px; line-height: 1.45; color: rgba(255,255,255,0.55); }
.tc-summary--warn { color: #fbbf24; }

.tc-scenes {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
  max-height: 228px; overflow-y: auto; padding: 2px; margin: -2px;
}
.tc-scenes::-webkit-scrollbar { width: 3px; }
.tc-scenes::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
.tc-scene {
  display: flex; flex-direction: column; gap: 4px; min-width: 0;
  padding: 0; background: none; border: none; cursor: pointer; text-align: left; font-family: inherit;
}
.tc-scene__thumb {
  position: relative; display: block; aspect-ratio: 16 / 10; border-radius: 6px;
  background: #1c1c21 center / cover no-repeat;
  outline: 2px solid transparent; outline-offset: -2px;
  filter: grayscale(0.85) brightness(0.55);
  transition: filter 140ms, outline-color 140ms;
}
.tc-scene.on .tc-scene__thumb { filter: none; outline-color: #fff; }
.tc-scene:hover .tc-scene__thumb { filter: grayscale(0.3) brightness(0.8); }
.tc-scene.on:hover .tc-scene__thumb { filter: brightness(1.08); }
.tc-scene:focus-visible { outline: none; }
.tc-scene:focus-visible .tc-scene__thumb { outline-color: #60a5fa; }
.tc-scene__check {
  position: absolute; top: 4px; right: 4px; width: 16px; height: 16px; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(0,0,0,0.45); border: 1.5px solid rgba(255,255,255,0.7); color: transparent;
}
.tc-scene.on .tc-scene__check { background: #fff; border-color: #fff; color: #0e0e12; }
.tc-scene__here {
  position: absolute; left: 4px; bottom: 4px; padding: 1px 5px; border-radius: 4px;
  background: #2563eb; color: #fff; font-size: 9px; font-weight: 800; letter-spacing: 0.03em;
}
.tc-scene__name {
  font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tc-scene.on .tc-scene__name { color: rgba(255,255,255,0.85); }

.tc-scenes-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 10px; color: rgba(255,255,255,0.25); }
.tc-link { background: none; border: none; padding: 0; font: inherit; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.6); cursor: pointer; }
.tc-link:hover { color: #fff; text-decoration: underline; }
.tc-not-here { font-size: 11px; color: #fbbf24; }

.tc-toggle {
  width: 38px; height: 22px; border-radius: 11px;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1);
  padding: 2px; cursor: pointer; display: flex; align-items: center;
  justify-content: flex-start; flex-shrink: 0;
  transition: background 200ms, border-color 200ms;
}
.tc-toggle--on { background: rgba(255,255,255,0.9); border-color: transparent; justify-content: flex-end; }
.tc-toggle-thumb {
  width: 16px; height: 16px; border-radius: 50%;
  background: rgba(255,255,255,0.6); box-shadow: 0 1px 4px rgba(0,0,0,0.4);
}
.tc-toggle--on .tc-toggle-thumb { background: #111; }

.tc-spin {
  display: inline-block; width: 12px; height: 12px;
  border: 1.5px solid rgba(255,255,255,0.3); border-top-color: currentColor;
  border-radius: 50%; animation: tc-spin 0.6s linear infinite;
}
.tc-btn--primary .tc-spin { border-color: rgba(0,0,0,0.3); border-top-color: #000; }
@keyframes tc-spin { to { transform: rotate(360deg); } }
</style>
