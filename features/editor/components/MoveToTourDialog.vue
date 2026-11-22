<template>
  <Teleport to="body">
    <div class="mt-backdrop" @click.self="!busy && emit('close')">
      <div class="mt-dialog" role="dialog" aria-modal="true" aria-labelledby="mt-title">
        <!-- ── Done ── -->
        <template v-if="result">
          <div class="mt-done-icon" aria-hidden="true">✓</div>
          <h2 id="mt-title" class="mt-title">“{{ result.space.title }}” is ready</h2>
          <p class="mt-muted">
            {{ plural(result.moved.scenes, 'scene') }}<template v-if="result.moved.photos"> and {{ plural(result.moved.photos, 'photo') }}</template>
            moved to the new tour.
            <template v-if="result.links_removed">{{ plural(result.links_removed, 'arrow') }} between the two tours {{ result.links_removed === 1 ? 'was' : 'were' }} removed.</template>
          </p>
          <div v-if="newUrl" class="mt-link">
            <a :href="newUrl" target="_blank" rel="noopener">{{ newUrl.replace('https://', '') }}</a>
            <button type="button" class="mt-btn" @click="copy">{{ copied ? 'Copied' : 'Copy link' }}</button>
          </div>
          <p v-else class="mt-muted">It's saved as a draft. Publish it from its Details tab to get its own link.</p>
          <div class="mt-actions">
            <button type="button" class="mt-btn" @click="emit('close')">Stay here</button>
            <NuxtLink :to="`/app/spaces/${result.space.id}`" class="mt-btn mt-btn--primary">Open the new tour</NuxtLink>
          </div>
        </template>

        <!-- ── Form ── -->
        <template v-else>
          <h2 id="mt-title" class="mt-title">Move {{ plural(sceneIds.length, 'scene') }} to a new tour</h2>
          <p class="mt-muted">The scenes keep their hotspots, info points and start views. Nothing is uploaded again.</p>

          <label class="mt-label" for="mt-name">Name of the new tour</label>
          <input id="mt-name" ref="nameInput" v-model="title" class="mt-input" maxlength="120" :disabled="busy" @keydown.enter.prevent="submit" />

          <!-- Photos: folded into one line by default, most moves take none. -->
          <div class="mt-section">
            <div class="mt-section__head">
              <div class="mt-section__text">
                <span class="mt-label">Photos to move <span class="mt-muted">(optional)</span></span>
                <span class="mt-muted">
                  <template v-if="loadingPhotos">Loading photos…</template>
                  <template v-else-if="!photos.length">This tour has no regular photos.</template>
                  <template v-else-if="picked.size">{{ picked.size }} of {{ photos.length }} photos move with the scenes.</template>
                  <template v-else>None picked: the new tour starts without photos.</template>
                </span>
              </div>
              <button
                v-if="photos.length"
                type="button" class="mt-btn mt-btn--small" :disabled="busy"
                :aria-expanded="photosOpen" aria-controls="mt-photo-grid"
                @click="photosOpen = !photosOpen"
              >{{ photosOpen ? 'Hide photos' : `Choose photos (${photos.length})` }}</button>
            </div>

            <div v-if="photosOpen && photos.length" id="mt-photo-grid" class="mt-picker">
              <div class="mt-picker__bar">
                <span class="mt-picker__count">{{ picked.size }} selected</span>
                <button type="button" class="mt-linkbtn" :disabled="busy || picked.size === photos.length" @click="pickAll">Select all</button>
                <button type="button" class="mt-linkbtn" :disabled="busy || !picked.size" @click="picked = new Set()">Clear</button>
              </div>
              <div class="mt-photos">
                <button
                  v-for="(p, i) in photos" :key="p.id" type="button"
                  class="mt-photo" :class="{ 'mt-photo--on': picked.has(p.id) }"
                  :aria-pressed="picked.has(p.id)" :aria-label="`Photo ${i + 1}`" :disabled="busy"
                  @click="togglePhoto(p.id)"
                >
                  <img :src="p.thumb" alt="" loading="lazy" decoding="async" draggable="false" />
                  <span class="mt-check" aria-hidden="true">✓</span>
                </button>
              </div>
            </div>
          </div>

          <label class="mt-toggle">
            <input v-model="publish" type="checkbox" :disabled="busy" />
            <span>Publish it at its own link now</span>
          </label>

          <ul class="mt-notes">
            <li>Copied from this tour: details, logo, social links, contact, button and viewer settings.</li>
            <li>Arrows between these scenes and the scenes that stay here are removed.</li>
            <li v-if="hasPins">Floor-plan pins on these scenes are cleared (floor plans stay with this tour).</li>
            <li v-if="movesEverything" class="mt-warn">This is every scene. This tour will have no 360° scenes left.</li>
          </ul>

          <div class="mt-actions">
            <button type="button" class="mt-btn" :disabled="busy" @click="emit('close')">Cancel</button>
            <button type="button" class="mt-btn mt-btn--primary" :disabled="busy || !title.trim()" @click="submit">
              {{ busy ? 'Moving…' : 'Create tour and move' }}
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
import { resolvePublicTourUrl } from '~/utils/publicTourUrl'

export type MoveResult = {
  space: { id: string; slug: string | null; title: string; is_published: boolean }
  moved: { scenes: number; photos: number }
  links_removed: number
}

const props = defineProps<{
  spaceId: string
  sceneIds: string[]
  /** Category shared by every selected scene, if any — used in the suggested name. */
  sharedCategory: string
  totalScenes: number
  hasPins: boolean
}>()
const emit = defineEmits<{
  close: []
  moved: [payload: { result: MoveResult; sceneIds: string[]; photoIds: string[] }]
}>()

const { apiFetch } = useApiFetch()
const nuxtImg = useImage()

const title = ref('')
const publish = ref(true)
const photos = ref<Array<{ id: string; thumb: string }>>([])
const picked = ref(new Set<string>())
const photosOpen = ref(false)
const loadingPhotos = ref(true)
const busy = ref(false)
const result = ref<MoveResult | null>(null)
const copied = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)

const movesEverything = computed(() => props.sceneIds.length >= props.totalScenes)
const newUrl = computed(() => (result.value?.space.slug ? resolvePublicTourUrl(result.value.space) : ''))
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function togglePhoto(id: string) {
  const next = new Set(picked.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  picked.value = next
}
function pickAll() { picked.value = new Set(photos.value.map(p => p.id)) }

onMounted(async () => {
  title.value = props.sharedCategory || ''
  try {
    const raw: any = await apiFetch(`/spaces/${props.spaceId}`)
    const space = raw?.data ?? raw
    const base = (space?.title || '').trim()
    title.value = props.sharedCategory ? (base ? `${base} - ${props.sharedCategory}` : props.sharedCategory) : (base ? `${base} (2)` : '')
    publish.value = !!space?.is_published
    photos.value = ((space?.property_media ?? []) as any[])
      .filter(m => m.media_type === 'gallery_image' && m.public_url)
      .sort((a, b) => (a.is_primary === b.is_primary ? (a.sort_order ?? 0) - (b.sort_order ?? 0) : a.is_primary ? -1 : 1))
      .map(m => {
        let thumb = m.public_url
        try { thumb = nuxtImg(m.public_url, { width: 200, quality: 60, format: 'webp' }) || m.public_url } catch { /* keep url */ }
        return { id: m.id, thumb }
      })
  } catch {
    // Photos are optional: the move still works without the list.
  } finally {
    loadingPhotos.value = false
  }
  await nextTick()
  nameInput.value?.focus()
  nameInput.value?.select()
})

async function submit() {
  if (busy.value || !title.value.trim()) return
  busy.value = true
  const photoIds = [...picked.value]
  try {
    const res: any = await apiFetch(`/spaces/${props.spaceId}/move-scenes`, {
      method: 'POST',
      body: { scene_ids: props.sceneIds, photo_ids: photoIds, title: title.value.trim(), publish: publish.value },
    })
    result.value = (res?.data ?? res) as MoveResult
    emit('moved', { result: result.value, sceneIds: [...props.sceneIds], photoIds })
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Could not move the scenes. Nothing was changed.')
  } finally {
    busy.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(newUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch { /* the link is on screen to copy by hand */ }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !busy.value) { e.stopPropagation(); emit('close') }
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
</script>

<style scoped>
.mt-backdrop { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
.mt-dialog {
  width: min(600px, 100%); max-height: calc(100vh - 32px); overflow-y: auto;
  display: flex; flex-direction: column; gap: 10px; padding: 22px;
  border-radius: 18px; background: #12141a; border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 24px 60px rgba(0,0,0,0.55); color: #fff;
}
/* The dialog scrolls when the screen is short; its rows never get squeezed. */
.mt-dialog > * { flex-shrink: 0; }
.mt-title { margin: 0; font-size: 18px; font-weight: 800; }
.mt-muted { margin: 0; color: rgba(255,255,255,0.55); font-size: 12.5px; line-height: 1.5; font-weight: 500; }
.mt-label { margin-top: 6px; font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.85); }
.mt-input { height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #fff; font-size: 14px; font-weight: 600; outline: none; }
.mt-input:focus { border-color: rgba(96,165,250,0.7); }
.mt-linkbtn { border: 0; background: none; padding: 0; color: #93c5fd; font-size: 12px; font-weight: 700; cursor: pointer; }
.mt-linkbtn:disabled { opacity: 0.4; cursor: default; }

.mt-section { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); }
.mt-section__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.mt-section__text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mt-section__text .mt-label { margin-top: 0; }

/* flex: none — inside the dialog's column layout the grid must keep its own
   height and scroll, not be squeezed (that is what stacked the tiles). */
.mt-picker { flex: none; display: flex; flex-direction: column; gap: 8px; }
.mt-picker__bar { display: flex; align-items: center; gap: 14px; }
.mt-picker__count { flex: 1; font-size: 12px; font-weight: 700; color: #93c5fd; }
.mt-photos {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); grid-auto-rows: 78px; gap: 8px;
  max-height: 268px; overflow-y: auto; overscroll-behavior: contain;
  padding: 2px 4px 2px 2px; scrollbar-width: thin;
}
.mt-photo { position: relative; display: block; width: 100%; height: 100%; padding: 0; border-radius: 10px; overflow: hidden; border: 2px solid transparent; background: #1f2430; cursor: pointer; transition: border-color 0.15s, transform 0.15s; }
.mt-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.7; transition: opacity 0.15s; }
.mt-photo:hover:not(:disabled) { transform: translateY(-1px); }
.mt-photo:hover img, .mt-photo--on img { opacity: 1; }
.mt-photo--on { border-color: #3b82f6; }
.mt-check { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; border: 2px solid rgba(255,255,255,0.9); background: rgba(0,0,0,0.4); color: transparent; }
.mt-photo--on .mt-check { background: #3b82f6; border-color: #fff; color: #fff; }

.mt-toggle { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.mt-toggle input { width: 16px; height: 16px; accent-color: #22c55e; }
.mt-notes { margin: 4px 0 0; padding: 10px 12px 10px 28px; border-radius: 10px; background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); font-size: 12px; line-height: 1.6; }
.mt-warn { color: #fbbf24; }

.mt-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.mt-btn { display: inline-flex; align-items: center; height: 38px; padding: 0 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.07); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: none; white-space: nowrap; }
.mt-btn:hover:not(:disabled) { background: rgba(255,255,255,0.13); }
.mt-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.mt-btn--small { flex: none; height: 32px; padding: 0 12px; font-size: 12px; }
.mt-btn--primary { background: #22c55e; border-color: #22c55e; color: #0b0d14; }
.mt-btn--primary:hover:not(:disabled) { background: #4ade80; }

.mt-done-icon { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: rgba(34,197,94,0.16); color: #4ade80; font-size: 22px; font-weight: 900; }
.mt-link { display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 12px; border-radius: 10px; background: rgba(255,255,255,0.05); }
.mt-link a { flex: 1; min-width: 0; color: #93c5fd; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 520px) {
  .mt-dialog { padding: 18px; }
  .mt-section__head { flex-direction: column; align-items: stretch; }
  .mt-photos { grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); grid-auto-rows: 66px; }
  .mt-actions { flex-direction: column-reverse; }
  .mt-actions .mt-btn { justify-content: center; }
}
</style>
