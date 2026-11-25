<template>
  <Teleport to="body">
    <div class="at-backdrop" @click.self="!busy && emit('close')">
      <div class="at-dialog" role="dialog" aria-modal="true" aria-labelledby="at-title">
        <!-- ── Done ── -->
        <template v-if="result">
          <div class="at-done-icon" aria-hidden="true">✓</div>
          <h2 id="at-title" class="at-title">Added to “{{ result.space.title }}”</h2>
          <p class="at-muted">
            {{ plural(result.added.scenes, 'scene') }} {{ result.copied ? 'copied' : 'moved' }}.
            <template v-if="result.copied">They stay in this tour too.</template>
            <template v-if="result.links_removed">
              {{ plural(result.links_removed, 'arrow') }} to scenes you didn't pick {{ result.copied ? 'were left out of the copies' : 'were removed' }}.
            </template>
            They come after that tour's last scene: open it to add arrows from its own scenes to them.
          </p>
          <div class="at-actions">
            <button type="button" class="at-btn" @click="emit('close')">Stay here</button>
            <NuxtLink :to="`/app/spaces/${result.space.id}`" class="at-btn at-btn--primary">Open “{{ result.space.title }}”</NuxtLink>
          </div>
        </template>

        <!-- ── Form ── -->
        <template v-else>
          <h2 id="at-title" class="at-title">Add {{ plural(sceneIds.length, 'scene') }} to another tour</h2>
          <p class="at-muted">Pick one of your tours. Nothing is uploaded again.</p>

          <div class="at-modes" role="radiogroup" aria-label="Copy or move">
            <label class="at-mode" :class="{ 'at-mode--on': copy }">
              <input v-model="copy" type="radio" :value="true" :disabled="busy" />
              <span>
                <strong>Copy</strong>
                <small>They stay here too. For shared areas like the entrance, lift and stairs.</small>
              </span>
            </label>
            <label class="at-mode" :class="{ 'at-mode--on': !copy }">
              <input v-model="copy" type="radio" :value="false" :disabled="busy" />
              <span>
                <strong>Move</strong>
                <small>They leave this tour.</small>
              </span>
            </label>
          </div>

          <input
            ref="searchInput" v-model="query" class="at-input" type="search"
            placeholder="Search your tours…" :disabled="busy" aria-label="Search your tours"
          />
          <div class="at-list" role="listbox" aria-label="Your tours">
            <p v-if="loading" class="at-muted at-pad">Loading your tours…</p>
            <p v-else-if="!tours.length" class="at-muted at-pad">You have no other tours yet. Use “Move to new tour…” instead.</p>
            <p v-else-if="!shown.length" class="at-muted at-pad">No tour matches “{{ query }}”.</p>
            <button
              v-for="t in shown" :key="t.id" type="button" role="option"
              class="at-tour" :class="{ 'at-tour--on': targetId === t.id }"
              :aria-selected="targetId === t.id" :disabled="busy"
              @click="targetId = t.id"
            >
              <span class="at-thumb">
                <img v-if="t.thumb" :src="t.thumb" alt="" loading="lazy" decoding="async" />
              </span>
              <span class="at-tour__text">
                <span class="at-tour__name">{{ t.title || 'Untitled tour' }}</span>
                <span class="at-tour__meta">{{ t.is_published ? 'Live' : 'Draft' }}<template v-if="t.location"> · {{ t.location }}</template></span>
              </span>
            </button>
          </div>

          <ul class="at-notes">
            <li v-if="copy">The copies keep their info points, start views and the arrows between the scenes you picked.</li>
            <li v-else>They keep their hotspots, info points and start views. Arrows between them and the scenes that stay here are removed.</li>
            <li v-if="hasPins">Floor-plan pins are not carried over (floor plans belong to each tour).</li>
            <li v-if="copy">Spotlights are not copied.</li>
            <li v-if="!copy && movesEverything" class="at-warn">This is every scene. This tour will have no 360° scenes left.</li>
          </ul>

          <div class="at-actions">
            <button type="button" class="at-btn" :disabled="busy" @click="emit('close')">Cancel</button>
            <button type="button" class="at-btn at-btn--primary" :disabled="busy || !targetId" @click="submit">
              {{ busy ? (copy ? 'Copying…' : 'Moving…') : (copy ? 'Copy scenes' : 'Move scenes') }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { toast } from 'vue-sonner'
import { useImage } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

export type AddResult = {
  space: { id: string; slug: string | null; title: string }
  copied: boolean
  added: { scenes: number; photos: number }
  links_removed: number
}

const props = defineProps<{
  spaceId: string
  sceneIds: string[]
  totalScenes: number
  hasPins: boolean
}>()
const emit = defineEmits<{
  close: []
  /** Only after a MOVE: the scenes left this tour. */
  moved: [payload: { result: AddResult; sceneIds: string[] }]
}>()

const { apiFetch } = useApiFetch()
const nuxtImg = useImage()

type TourRow = { id: string; title: string; is_published: boolean; location: string; thumb: string }
const tours = ref<TourRow[]>([])
const loading = ref(true)
const query = ref('')
const targetId = ref('')
const copy = ref(true)
const busy = ref(false)
const result = ref<AddResult | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const movesEverything = computed(() => props.sceneIds.length >= props.totalScenes)
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? tours.value.filter(t => `${t.title} ${t.location}`.toLowerCase().includes(q)) : tours.value
})
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

onMounted(async () => {
  try {
    const raw: any = await apiFetch('/spaces?limit=200')
    const list: any[] = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
    tours.value = list
      .filter(s => s?.id && s.id !== props.spaceId)
      .map(s => {
        const src = s.cover_image_url || ''
        let thumb = src
        try { thumb = src ? (nuxtImg(src, { width: 120, quality: 60, format: 'webp' }) || src) : '' } catch { /* keep url */ }
        return { id: s.id, title: s.title || '', is_published: !!s.is_published, location: s.location_text || '', thumb }
      })
  } catch {
    toast.error('Could not load your tours. Close this and try again.')
  } finally {
    loading.value = false
  }
  await nextTick()
  searchInput.value?.focus()
})

async function submit() {
  if (busy.value || !targetId.value) return
  busy.value = true
  try {
    const res: any = await apiFetch(`/spaces/${props.spaceId}/add-scenes-to-tour`, {
      method: 'POST',
      body: { target_id: targetId.value, scene_ids: props.sceneIds, photo_ids: [], copy: copy.value },
    })
    result.value = (res?.data ?? res) as AddResult
    if (!result.value.copied) emit('moved', { result: result.value, sceneIds: [...props.sceneIds] })
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Could not add the scenes. Nothing was changed.')
  } finally {
    busy.value = false
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !busy.value) { e.stopPropagation(); emit('close') }
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
</script>

<style scoped>
.at-backdrop { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
.at-dialog {
  width: min(560px, 100%); max-height: calc(100vh - 32px); overflow-y: auto;
  display: flex; flex-direction: column; gap: 10px; padding: 22px;
  border-radius: 18px; background: #12141a; border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 24px 60px rgba(0,0,0,0.55); color: #fff;
}
.at-dialog > * { flex-shrink: 0; }
.at-title { margin: 0; font-size: 18px; font-weight: 800; }
.at-muted { margin: 0; color: rgba(255,255,255,0.55); font-size: 12.5px; line-height: 1.5; font-weight: 500; }
.at-pad { padding: 14px 12px; }

.at-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
.at-mode { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); cursor: pointer; }
.at-mode--on { border-color: rgba(96,165,250,0.7); background: rgba(59,130,246,0.1); }
.at-mode input { margin-top: 3px; accent-color: #3b82f6; }
.at-mode span { display: flex; flex-direction: column; gap: 2px; }
.at-mode strong { font-size: 13px; }
.at-mode small { font-size: 11.5px; line-height: 1.4; color: rgba(255,255,255,0.55); }

.at-input { height: 38px; margin-top: 4px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #fff; font-size: 13.5px; font-weight: 600; outline: none; }
.at-input:focus { border-color: rgba(96,165,250,0.7); }

.at-list { flex: none; display: flex; flex-direction: column; gap: 4px; max-height: 280px; overflow-y: auto; overscroll-behavior: contain; padding: 4px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); scrollbar-width: thin; }
.at-tour { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px; border-radius: 10px; border: 1px solid transparent; background: none; color: #fff; text-align: left; cursor: pointer; }
.at-tour:hover:not(:disabled) { background: rgba(255,255,255,0.06); }
.at-tour--on { border-color: #3b82f6; background: rgba(59,130,246,0.14); }
.at-thumb { flex: none; width: 64px; height: 40px; border-radius: 7px; overflow: hidden; background: #1f2430; }
.at-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.at-tour__text { display: flex; flex-direction: column; min-width: 0; }
.at-tour__name { font-size: 13.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.at-tour__meta { font-size: 11.5px; color: rgba(255,255,255,0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.at-notes { margin: 4px 0 0; padding: 10px 12px 10px 28px; border-radius: 10px; background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); font-size: 12px; line-height: 1.6; }
.at-warn { color: #fbbf24; }

.at-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.at-btn { display: inline-flex; align-items: center; height: 38px; padding: 0 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.07); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: none; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.at-btn:hover:not(:disabled) { background: rgba(255,255,255,0.13); }
.at-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.at-btn--primary { background: #22c55e; border-color: #22c55e; color: #0b0d14; }
.at-btn--primary:hover:not(:disabled) { background: #4ade80; }

.at-done-icon { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: rgba(34,197,94,0.16); color: #4ade80; font-size: 22px; font-weight: 900; }

@media (max-width: 520px) {
  .at-dialog { padding: 18px; }
  .at-modes { grid-template-columns: 1fr; }
  .at-actions { flex-direction: column-reverse; }
  .at-actions .at-btn { justify-content: center; }
}
</style>
