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
        <h1>{{ space?.title || 'Photos' }}</h1>
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
        <div v-for="u in localUploads" :key="u.id" class="photo-card photo-card--uploading">
          <div class="photo-card__spin-wrap"><span class="photos-spin" /></div>
          <p class="photo-card__status">{{ uploadStateLabel(u.state) }}</p>
        </div>

        <div v-for="p in photos" :key="p.id" class="photo-card">
          <img :src="p.public_url" :alt="space?.title || 'Photo'" loading="lazy" />
          <span v-if="p.processing_status !== 'complete'" class="photo-card__badge" :class="`photo-card__badge--${p.processing_status}`">
            {{ p.processing_status === 'failed' ? 'Failed' : 'Processing…' }}
          </span>
          <button class="photo-card__delete" :disabled="deletingId === p.id" aria-label="Delete photo" @click="handleDelete(p)">
            <svg v-if="deletingId !== p.id" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            <span v-else class="photos-spin photos-spin--sm" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSpaces } from '~/composables/useSpaces'
import { useSceneUpload } from '~/features/editor/composables/useSceneUpload'
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
      await uploadFile(file, 'gallery', {
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
</script>

<style scoped>
.photos-panel {
  width: 100vw; height: 100vh; overflow-y: auto;
  background: #0a0a0b; color: rgba(255,255,255,0.9);
  padding-top: 112px;
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
.photos-header__title h1 { font-size: 1.1rem; font-weight: 800; margin: 4px 0 4px; }
.photos-header__title p { font-size: 0.78rem; color: rgba(255,255,255,0.4); margin: 0; }

.photos-add-btn {
  flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px;
  height: 36px; padding: 0 16px; margin-top: 4px; border-radius: 10px;
  background: #fff; color: #0e0e12; border: none;
  font-size: 12.5px; font-weight: 800; cursor: pointer;
}
.photos-add-btn:hover { background: rgba(255,255,255,0.88); }
.photos-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.photos-body { max-width: 1000px; margin: 0 auto; padding: 0 20px 40px; }

.photos-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 80px 20px; color: rgba(255,255,255,0.35); text-align: center;
}
.photos-empty p { font-size: 0.85rem; font-weight: 600; margin: 0; }

.photos-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px;
}
.photo-card {
  position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
}
.photo-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.photo-card--uploading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.photo-card__spin-wrap { display: flex; }
.photo-card__status { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4); margin: 0; }
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

.photos-spin {
  display: inline-block; width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.15); border-top-color: rgba(255,255,255,0.7);
  border-radius: 50%; animation: photos-spin-anim 0.7s linear infinite;
}
.photos-spin--sm { width: 12px; height: 12px; border-width: 1.5px; }
@keyframes photos-spin-anim { to { transform: rotate(360deg); } }
</style>
