<template>
  <div class="photos-panel">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden-input"
      @change="handleFileChange"
    />

    <header class="photos-header">
      <NuxtLink to="/app/spaces" class="photos-back" title="Back to spaces">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </NuxtLink>
      <div class="photos-header__title">
        <SpacePill :name="space?.title || 'MY TOUR'" mode="Photos" />
        <p>Regular photos — no 360° camera needed. Buyers see these as a swipeable gallery.</p>
      </div>
      <button class="photos-add-btn" :disabled="pending || !space" @click="fileInput?.click()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        Add Photos
      </button>
    </header>

    <div class="photos-body">
      <div v-if="pending" class="photos-empty">
        <span class="photos-spin" />
      </div>

      <div v-else-if="!photos.length && !localUploads.length" class="photos-empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <p>No photos yet</p>
        <button class="photos-add-btn" :disabled="!space" @click="fileInput?.click()">Add your first photo</button>
      </div>

      <div v-else class="photos-grid">
        <div
          v-for="u in localUploads"
          :key="u.id"
          class="photo-card photo-card--uploading"
          :class="{ 'photo-card--upload-failed': u.state === 'failed' }"
        >
          <img v-if="u.previewUrl" :src="u.previewUrl" alt="" class="photo-card__preview" />
          <div class="photo-card__uploading-overlay">
            <span class="photos-spin photos-spin--sm" />
            <p class="photo-card__status">{{ uploadStateLabel(u.state) }}</p>
          </div>
        </div>

        <div
          v-for="(p, i) in photos"
          :key="p.id"
          class="photo-card photo-card--clickable"
          :class="{ 'photo-card--cover': p.is_primary, 'photo-card--dragging': draggedId === p.id }"
          :draggable="!p.is_primary"
          @click="openLightbox(i)"
          @dragstart="onDragStart(p, $event)"
          @dragover.prevent="onDragOver(p)"
          @dragend="onDragEnd"
        >
          <NuxtImg
            :src="p.public_url"
            :alt="space?.title || 'Photo'"
            width="240"
            height="240"
            format="webp"
            quality="75"
            loading="lazy"
          />
          <span v-if="p.is_primary" class="photo-card__cover-badge">Cover</span>
          <span v-if="p.processing_status !== 'complete'" class="photo-card__badge" :class="`photo-card__badge--${p.processing_status}`">
            {{ p.processing_status === 'failed' ? 'Failed' : 'Processing…' }}
          </span>
          <button
            v-if="!p.is_primary"
            class="photo-card__cover-btn"
            :disabled="settingCoverId === p.id"
            aria-label="Set as cover photo"
            title="Set as cover photo"
            @click.stop="handleSetCover(p)"
          >
            <svg v-if="settingCoverId !== p.id" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"/></svg>
            <span v-else class="photos-spin photos-spin--sm" />
          </button>
          <button class="photo-card__delete" :disabled="deletingId === p.id" aria-label="Delete photo" @click.stop="handleDelete(p)">
            <svg v-if="deletingId !== p.id" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            <span v-else class="photos-spin photos-spin--sm" />
          </button>
        </div>
      </div>
      <p v-if="photos.length > 1" class="photos-hint">Drag a photo to reorder. The cover photo is always shown first — use the star to change it.</p>

      <Teleport to="body">
        <div v-if="lightboxIndex !== null" class="photo-lightbox" role="dialog" aria-modal="true" @click.self="closeLightbox">
          <button class="photo-lightbox__close" aria-label="Close preview" @click="closeLightbox">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <button v-if="photos.length > 1" v-show="lightboxIndex > 0" class="photo-lightbox__nav photo-lightbox__nav--prev" aria-label="Previous photo" @click="goLightbox(lightboxIndex - 1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button v-if="photos.length > 1" v-show="lightboxIndex < photos.length - 1" class="photo-lightbox__nav photo-lightbox__nav--next" aria-label="Next photo" @click="goLightbox(lightboxIndex + 1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <img :src="photos[lightboxIndex]?.public_url" :alt="space?.title || 'Photo'" class="photo-lightbox__img" />
          <div v-if="photos.length > 1" class="photo-lightbox__counter">{{ lightboxIndex + 1 }} / {{ photos.length }}</div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSpaces } from '~/composables/useSpaces'
import { useSceneUpload } from '~/features/editor/composables/useSceneUpload'
import SpacePill from '~/features/editor/components/SpacePill.vue'
import { toast } from 'vue-sonner'

const props = defineProps<{ spaceId: string }>()

const { apiFetch } = useApiFetch()
const { fetchSpace } = useSpaces()
const { localUploads, uploadFile } = useSceneUpload(props.spaceId)

// property_media isn't part of the Space interface (GET /spaces/:id returns
// it, but useSpaces' list-oriented Space type doesn't model nested relations)
// — kept as a separate any-typed ref rather than widening that shared type
// for one relation only this panel needs.
const space = ref<any>(null)
const pending = ref(true)
const deletingId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()

const photos = computed(() => {
  const media = (space.value?.property_media ?? []) as any[]
  return media
    .filter((m) => m.media_type === 'gallery_image')
    .sort((a, b) => (a.is_primary === b.is_primary ? (a.sort_order ?? 0) - (b.sort_order ?? 0) : a.is_primary ? -1 : 1))
})

async function loadSpace() {
  pending.value = true
  try {
    space.value = await fetchSpace(props.spaceId)
    if (!space.value) toast.error('Failed to load photos')
  } finally {
    pending.value = false
  }
}
onMounted(loadSpace)

// ── Lightbox preview ─────────────────────────────────────────────────────
const lightboxIndex = ref<number | null>(null)
function openLightbox(i: number) {
  lightboxIndex.value = i
}
function closeLightbox() {
  lightboxIndex.value = null
}
function goLightbox(i: number) {
  if (i < 0 || i >= photos.value.length) return
  lightboxIndex.value = i
}
function onLightboxKeydown(e: KeyboardEvent) {
  if (lightboxIndex.value === null) return
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') goLightbox(lightboxIndex.value - 1)
  else if (e.key === 'ArrowRight') goLightbox(lightboxIndex.value + 1)
}
onMounted(() => window.addEventListener('keydown', onLightboxKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onLightboxKeydown)
  document.body.style.overflow = ''
})
watch(lightboxIndex, (i) => { document.body.style.overflow = i === null ? '' : 'hidden' })

function uploadStateLabel(state: string) {
  if (state === 'signing' || state === 'uploading') return 'Uploading…'
  if (state === 'registering' || state === 'processing') return 'Processing…'
  if (state === 'failed') return 'Failed'
  return 'Uploading…'
}

// Concurrency-capped — matches enqueuePanoramaFiles() in useEditorUpload.ts.
// Each presign hits Redis + Supabase; firing every selected file at once can
// OOM-kill the API pod on Railway (documented there, applies here too).
const UPLOAD_CONCURRENCY = 3
async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length || !space.value) return

  let next = 0
  async function worker() {
    while (next < files.length) {
      const file = files[next++]
      // Instant preview — same createObjectURL-before-network pattern the
      // 360 panorama pipeline uses, so a photo appears the moment it's
      // picked instead of only after sign+upload+register round-trips.
      const previewUrl = URL.createObjectURL(file)
      await uploadFile(file, 'gallery', {
        previewUrl,
        onRegister: async (record: any) => {
          if (!space.value.property_media) space.value.property_media = []
          space.value.property_media = [...space.value.property_media, record]
        },
        onError: (_err: any, humanError: string) => {
          toast.error(humanError)
        },
      })
    }
  }
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker))
}

async function handleDelete(photo: any) {
  if (deletingId.value) return
  deletingId.value = photo.id
  try {
    await apiFetch(`/uploads/${photo.id}`, { method: 'DELETE' })
    space.value.property_media = (space.value.property_media ?? []).filter((m: any) => m.id !== photo.id)
  } catch {
    toast.error('Failed to delete photo')
  } finally {
    deletingId.value = null
  }
}

// ── Cover photo ───────────────────────────────────────────────────────────
const settingCoverId = ref<string | null>(null)
async function handleSetCover(photo: any) {
  if (settingCoverId.value) return
  settingCoverId.value = photo.id
  try {
    await apiFetch(`/uploads/${photo.id}/set-cover`, { method: 'PATCH' })
    // Mirror server-side demote-then-promote locally rather than reloading —
    // only one gallery_image can be is_primary at a time.
    for (const m of (space.value?.property_media ?? [])) {
      if (m.media_type === 'gallery_image') m.is_primary = m.id === photo.id
    }
  } catch {
    toast.error('Failed to set cover photo')
  } finally {
    settingCoverId.value = null
  }
}

// ── Drag-to-reorder ───────────────────────────────────────────────────────
// The cover photo always sorts first (see `photos` computed above) regardless
// of sort_order, so it's excluded from dragging entirely rather than allowing
// a drag that visually snaps back and confuses the reorder gesture.
const draggedId = ref<string | null>(null)

function onDragStart(photo: any, e: DragEvent) {
  if (photo.is_primary) return
  draggedId.value = photo.id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', photo.id)
  }
}

// Live-reorders by rewriting sort_order on the underlying media objects —
// `photos` is a computed sorted by (is_primary, sort_order), so mutating
// sort_order here is what actually moves the cards, not array splicing.
function onDragOver(photo: any) {
  if (!draggedId.value || draggedId.value === photo.id || photo.is_primary) return
  const list = photos.value.filter((p: any) => !p.is_primary)
  const from = list.findIndex((p: any) => p.id === draggedId.value)
  const to = list.findIndex((p: any) => p.id === photo.id)
  if (from === -1 || to === -1) return
  const [moved] = list.splice(from, 1)
  list.splice(to, 0, moved)
  list.forEach((p: any, idx: number) => { p.sort_order = idx })
}

async function onDragEnd() {
  const wasDragging = !!draggedId.value
  draggedId.value = null
  if (!wasDragging || !space.value?.id) return
  try {
    await apiFetch('/uploads/reorder', {
      method: 'PATCH',
      body: { propertyId: space.value.id, orderedIds: photos.value.map((p: any) => p.id) },
    })
  } catch {
    toast.error('Failed to save photo order')
    await loadSpace()
  }
}
</script>

<style scoped>
.photos-panel {
  width: 100vw; height: 100vh; overflow-y: auto;
  background: #0a0a0b; color: rgba(255,255,255,0.9);
  /* mode-switch (pages/app/spaces/[id]/index.vue) sits at top:84px + ~36px
     tall on desktop — clear its bottom edge (~120px) with a real gap. */
  padding-top: 136px;
}
@media (max-width: 640px) { .photos-panel { padding-top: 104px; } }

.hidden-input { display: none; }

.photos-header {
  display: flex; align-items: flex-start; gap: 14px;
  max-width: 1000px; margin: 0 auto; padding: 0 20px 24px;
}
.photos-back {
  flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); text-decoration: none;
}
.photos-back:hover { color: #fff; background: rgba(255,255,255,0.1); }
.photos-header__title { flex: 1 1 auto; min-width: 0; }
.photos-header__title p { font-size: 0.78rem; color: rgba(255,255,255,0.4); margin: 8px 0 0; }

.photos-add-btn {
  flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px;
  height: 36px; padding: 0 16px; margin-top: 4px; border-radius: 10px;
  background: #fff; color: #0e0e12; border: none;
  font-size: 12.5px; font-weight: 800; cursor: pointer;
}
.photos-add-btn:hover { background: rgba(255,255,255,0.88); }
.photos-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Three unrelated-width items (icon button / running-text title / action
   button) crammed onto one row is what made this look cramped on phones —
   the title's two-line subtitle had nothing to wrap into and pushed the
   back/add buttons out of vertical alignment. Keep both buttons on a
   single top row and drop the title block to its own full-width row. */
@media (max-width: 640px) {
  .photos-header { flex-wrap: wrap; row-gap: 12px; }
  .photos-back { order: 1; }
  .photos-add-btn { order: 2; margin-left: auto; margin-top: 0; }
  .photos-header__title { order: 3; flex-basis: 100%; }
}

.photos-body { max-width: 1000px; margin: 0 auto; padding: 0 20px 40px; }

.photos-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 80px 20px; color: rgba(255,255,255,0.35); text-align: center;
}
.photos-empty p { font-size: 0.85rem; font-weight: 600; margin: 0; }

.photos-grid {
  /* auto-fit (not auto-fill) — with few photos, auto-fill still reserves
     as many 160px+ tracks as would fit, so a single photo sat pinned to
     the left with a row's worth of empty, invisible columns beside it.
     auto-fit collapses those unused tracks so the real card(s) fill the
     row's 1fr space instead of looking orphaned. */
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;
}
.photo-card {
  position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
}
.photo-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
/* Uploading card shows the actual picked photo immediately (via a local
   blob: preview) with a small status overlay, instead of hiding it behind
   a full spinner — matches the 360 panorama upload's instant-feedback feel. */
.photo-card__preview { opacity: 0.55; }
.photo-card__uploading-overlay {
  position: absolute; inset: 0; z-index: 2;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
}
.photo-card--upload-failed .photo-card__preview { opacity: 0.3; }
.photo-card--upload-failed .photo-card__status { color: #f87171; }
.photo-card__status { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.75); margin: 0; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
.photo-card__badge {
  position: absolute; left: 6px; bottom: 6px; z-index: 2;
  font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 3px 7px; border-radius: 5px; background: rgba(0,0,0,0.65); color: rgba(255,255,255,0.85);
}
.photo-card__badge--failed { background: rgba(220,38,38,0.85); color: #fff; }
.photo-card__delete {
  position: absolute; top: 6px; right: 6px; z-index: 2;
  width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.55); border: none; color: rgba(255,255,255,0.85); cursor: pointer;
  transition: background 120ms;
}
.photo-card__delete:hover { background: rgba(220,38,38,0.85); }
.photo-card__delete:disabled { cursor: not-allowed; }

.photo-card--cover { outline: 2px solid #fff; outline-offset: -2px; }
.photo-card--dragging { opacity: 0.4; }
.photo-card--clickable { cursor: pointer; }
.photo-card[draggable="true"] { cursor: grab; }
.photo-card__cover-badge {
  position: absolute; left: 6px; bottom: 6px; z-index: 2;
  font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 3px 7px; border-radius: 5px; background: rgba(255,255,255,0.92); color: #0a0a0b;
}
.photo-card__cover-btn {
  position: absolute; top: 6px; left: 6px; z-index: 2;
  width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.55); border: none; color: rgba(255,255,255,0.85); cursor: pointer;
  transition: background 120ms;
}
.photo-card__cover-btn:hover { background: rgba(255,255,255,0.25); }
.photo-card__cover-btn:disabled { cursor: not-allowed; }

.photos-hint { margin: 14px 0 0; font-size: 11.5px; color: rgba(255,255,255,0.35); text-align: center; }

.photos-spin {
  display: inline-block; width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.15); border-top-color: rgba(255,255,255,0.7);
  border-radius: 50%; animation: photos-spin-anim 0.7s linear infinite;
}
.photos-spin--sm { width: 12px; height: 12px; border-width: 1.5px; }
@keyframes photos-spin-anim { to { transform: rotate(360deg); } }

.photo-lightbox {
  position: fixed; inset: 0; z-index: 300;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.92);
}
.photo-lightbox__img { max-width: min(92vw, 1400px); max-height: 88vh; object-fit: contain; display: block; }
.photo-lightbox__close {
  position: absolute; top: max(16px, env(safe-area-inset-top)); right: 16px; z-index: 2;
  width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.1); border: none; color: #fff; cursor: pointer;
}
.photo-lightbox__close:hover { background: rgba(255,255,255,0.18); }
.photo-lightbox__nav {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 2;
  width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.1); border: none; color: #fff; cursor: pointer;
}
.photo-lightbox__nav:hover { background: rgba(255,255,255,0.18); }
.photo-lightbox__nav--prev { left: 16px; }
.photo-lightbox__nav--next { right: 16px; }
.photo-lightbox__counter {
  position: absolute; left: 50%; bottom: max(20px, env(safe-area-inset-bottom)); transform: translateX(-50%);
  padding: 6px 14px; border-radius: 999px; background: rgba(255,255,255,0.1);
  color: #fff; font-size: 0.78rem; font-weight: 600; font-variant-numeric: tabular-nums;
}
</style>
