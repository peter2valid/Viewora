<template>
  <!-- Object Spotlights of the scene on screen. Made and published by Spotlight
       Studio on your computer; here they can be removed, or added from a file.
       Changes apply at once (not on the panel's Save). -->
  <div class="sp" @dragover.prevent="dragging = true" @dragleave.self="dragging = false" @drop.prevent="onDrop">
    <input ref="fileInput" type="file" accept=".spotlight,application/json" class="sp-hidden" @change="onFile" />

    <div class="sp-head">
      <div>
        <div class="sp-title">Object spotlights</div>
        <div class="sp-sub">Tap an object in the tour and it lights up, with a short note and a voice. Made in Spotlight Studio on your computer.</div>
      </div>
      <button class="sp-btn sp-btn--sm sp-btn--ghost" :disabled="s.loading" aria-label="Refresh" title="Refresh" @click="spotlights.refresh()">
        <span v-if="s.loading" class="sp-spin" />
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
      </button>
    </div>

    <p v-if="!s.enabled" class="sp-hint">Spotlights need one database update before they can be added. Please contact Viewora support.</p>

    <template v-else>
      <div v-if="rows.length" class="sp-list">
        <div v-for="r in rows" :key="r.id" class="sp-row">
          <div class="sp-row__text">
            <div class="sp-row__title">{{ r.data.title }}</div>
            <div class="sp-row__meta">
              <span v-if="r.data.label">{{ r.data.label }}</span>
              <span v-if="r.voice_url">· voice</span>
              <span v-if="r.data.ring">· ring moved</span>
            </div>
            <button v-if="r.data.ring" class="sp-link" :disabled="!!s.busy" @click="spotlights.moveRing(r.scene_id, r.object_key, null)">Put the ring back on it</button>
          </div>
          <button
            class="sp-btn sp-btn--sm sp-btn--ghost"
            :disabled="!!s.busy"
            @click="confirmRemove(r)"
          >
            <span v-if="s.busy === r.id" class="sp-spin" />
            <template v-else>{{ confirming === r.id ? 'Sure?' : 'Delete' }}</template>
          </button>
        </div>
      </div>
      <p v-else class="sp-hint">{{ sceneName ? `None in ${sceneName} yet.` : 'None in this scene yet.' }}</p>
      <p v-if="rows.length" class="sp-hint">Is a ring covered by a hotspot? Drag the red ring in the preview to move it. It saves when you let go.</p>
      <p v-if="s.moveError" class="sp-hint sp-hint--err">{{ s.moveError }}</p>
      <p v-if="otherCount" class="sp-hint">{{ otherCount }} more in other scenes.</p>

      <div class="sp-drop" :class="{ 'sp-drop--on': dragging }">
        <button class="sp-btn sp-btn--sm" :disabled="!!s.busy" @click="fileInput?.click()">
          <span v-if="s.busy === 'upload'" class="sp-spin" />
          <template v-else>Add from file</template>
        </button>
        <span class="sp-hint">or drop a <b>.spotlight</b> file here. Spotlight Studio can also publish straight to this tour.</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EditorSpotlight, useEditorSpotlights } from '~/features/editor/composables/useEditorSpotlights'

const props = defineProps<{
  spotlights: ReturnType<typeof useEditorSpotlights>
  activeSceneId: string | null
  sceneName?: string
}>()
const emit = defineEmits<{
  (e: 'error', message: string): void
  (e: 'notice', message: string): void
}>()

const s = props.spotlights.state
const rows = computed(() => props.spotlights.forScene(props.activeSceneId))
const otherCount = computed(() => s.rows.length - rows.value.length)
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const confirming = ref('')
let confirmTimer: ReturnType<typeof setTimeout> | null = null

const message = (e: any, fallback: string) => e?.data?.statusMessage || e?.message || fallback

async function confirmRemove(r: EditorSpotlight) {
  if (confirming.value !== r.id) {
    confirming.value = r.id
    if (confirmTimer) clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => { confirming.value = '' }, 3000)
    return
  }
  confirming.value = ''
  try {
    await props.spotlights.remove(r)
    emit('notice', `Removed "${r.data.title}"`)
  } catch (e) {
    emit('error', message(e, 'Could not remove it. Check your connection.'))
  }
}

async function add(file: File | undefined | null) {
  if (!file) return
  try {
    const { sceneId, title } = await props.spotlights.upload(file)
    const where = sceneId === props.activeSceneId ? '' : ` (in ${s.sceneNames[sceneId] || 'another scene'})`
    emit('notice', `Added "${title}"${where}`)
  } catch (e) {
    emit('error', message(e, 'Could not add it. Check your connection.'))
  }
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  void add(input.files?.[0])
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragging.value = false
  void add(e.dataTransfer?.files?.[0])
}
</script>

<style scoped>
.sp { display: flex; flex-direction: column; gap: 10px; }
.sp-hidden { display: none; }
.sp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.sp-title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); }
.sp-sub { font-size: 10px; color: rgba(255,255,255,0.32); font-weight: 500; margin-top: 2px; line-height: 1.5; }
.sp-hint { font-size: 10px; color: rgba(255,255,255,0.35); margin: 0; line-height: 1.5; }
.sp-hint b { color: rgba(255,255,255,0.6); font-weight: 600; }

.sp-list { display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.08); border-radius: 9px; overflow: hidden; }
.sp-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; }
.sp-row + .sp-row { border-top: 1px solid rgba(255,255,255,0.06); }
.sp-row__text { min-width: 0; }
.sp-row__title { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.85); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sp-row__meta { font-size: 10px; color: rgba(127,231,247,0.7); display: flex; gap: 4px; }
.sp-link { margin-top: 3px; padding: 0; border: 0; background: none; color: rgba(255,255,255,0.55); font: inherit; font-size: 10px; font-weight: 600; text-decoration: underline; cursor: pointer; }
.sp-link:hover:not(:disabled) { color: rgba(255,255,255,0.85); }
.sp-link:disabled { opacity: 0.4; cursor: not-allowed; }
.sp-hint--err { color: #f87171; }

.sp-drop { display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px dashed rgba(255,255,255,0.14); border-radius: 9px; transition: border-color 130ms, background 130ms; }
.sp-drop--on { border-color: rgba(127,231,247,0.8); background: rgba(127,231,247,0.06); }

.sp-btn {
  height: 32px; padding: 0 14px; border-radius: 7px; flex-shrink: 0;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 600; font-family: inherit;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  transition: background 130ms, border-color 130ms;
}
.sp-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
.sp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sp-btn--sm { height: 28px; padding: 0 10px; font-size: 11px; }
.sp-btn--ghost { background: transparent; color: rgba(255,255,255,0.5); }

.sp-spin { width: 11px; height: 11px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; animation: sp-spin .8s linear infinite; }
@keyframes sp-spin { to { transform: rotate(360deg); } }
</style>
