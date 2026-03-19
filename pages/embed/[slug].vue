<template>
  <div class="embed-viewer">
    <div v-if="pending" class="embed-center">
      <div class="embed-loader"></div>
    </div>

    <div v-else-if="fetchError" class="embed-center">
      <p>{{ fetchError }}</p>
    </div>

    <template v-else-if="space">
      <!-- 360 Viewer -->
      <ClientOnly v-if="space.has_360 && panorama">
        <AppPannellumViewer 
          :panorama-url="panorama.public_url" 
          :auto-rotate="settings?.auto_rotate_enabled"
          :hfov="settings?.hfov_default"
          :pitch="settings?.pitch_default"
          :yaw="settings?.yaw_default"
        />
      </ClientOnly>
      
      <!-- Gallery Fallback if no 360 -->
      <div v-else class="embed-gallery">
        <img :src="space.cover_image_url || '/images/home/plain land.png'" class="embed-img" />
        <div class="embed-overlay">
          <h1 class="embed-title">{{ space.title }}</h1>
          <a :href="`/p/${space.slug}`" target="_blank" class="embed-link">View Full Tour</a>
        </div>
      </div>

      <!-- Watermark -->
      <a v-if="!space.branding_enabled" href="https://viewora.software" target="_blank" class="embed-watermark">
        Viewora
      </a>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
import { ref, computed, onMounted } from 'vue'

const { apiFetch } = useApiFetch()
const route = useRoute()
const slug = route.params.slug as string

const pending = ref(true)
const fetchError = ref('')
const space = ref<any>(null)

const media = computed(() => space.value?.property_media || [])
const panorama = computed(() => media.value.find((m: any) => m.media_type === 'panorama'))
const settings = computed(() => space.value?.property_360_settings?.[0])

onMounted(async () => {
  await fetchSpace()
})

async function fetchSpace() {
  pending.value = true
  try {
    const data = await apiFetch<any>(`/spaces/by-slug/${encodeURIComponent(slug)}`)
    space.value = data
    fireViewEvent(data.id)
  } catch (err: any) {
    fetchError.value = err.data?.statusMessage || 'Space not found'
  } finally {
    pending.value = false
  }
}

function fireViewEvent(spaceId: string) {
  apiFetch('/analytics/view', {
    method: 'POST',
    body: { spaceId, source: 'embed' }
  }).catch(() => {})
}
</script>

<style scoped>
.embed-viewer {
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
  position: relative;
  font-family: sans-serif;
}

.embed-center {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
}

.embed-loader {
  width: 30px;
  height: 30px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.embed-gallery {
  width: 100%;
  height: 100%;
  position: relative;
}

.embed-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.embed-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  padding: 2rem;
  text-align: center;
}

.embed-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }
.embed-link { background: #fff; color: #000; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 0.9rem; }

.embed-watermark {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  text-decoration: none;
  opacity: 0.7;
  z-index: 10;
}
.embed-watermark:hover { opacity: 1; }
</style>
