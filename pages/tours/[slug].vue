<template>
  <div class="h-screen w-screen bg-black overflow-hidden relative">
    <div v-if="pending" class="absolute inset-0 flex items-center justify-center text-white">
      Loading Tour...
    </div>
    <div v-else-if="error" class="absolute inset-0 flex items-center justify-center text-white">
      {{ error }}
    </div>
    <div v-else-if="scenes.length === 0" class="absolute inset-0 flex items-center justify-center text-white">
      This tour has no scenes.
    </div>
    <template v-else>
      <ClientOnly>
        <EditorMarzipanoViewer
          v-if="mappedScenes.length > 0"
          :scenes="mappedScenes"
          :hotspots="currentHotspots"
          :active-scene-id="activeSceneId"
          :add-hotspot-mode="false"
          @hotspot-navigate="activeSceneId = $event"
          class="w-full h-full"
        />
      </ClientOnly>

      <!-- Viewer Overlay Branding -->
      <div class="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-md backdrop-blur-sm pointer-events-none">
        <h1 class="font-bold text-lg m-0 leading-tight">{{ space?.title }}</h1>
        <p class="text-xs opacity-80 m-0">{{ space?.description || 'Virtual Tour' }}</p>
      </div>
      
      <!-- Watermark Placeholder -->
      <div class="absolute bottom-4 right-4 text-white/50 text-xs font-semibold pointer-events-none">
        Powered by Viewora
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'

definePageMeta({ layout: false })

const route = useRoute()
const slug = route.params.slug as string
const supabase = useSupabaseClient()

const pending = ref(true)
const error = ref('')
const space = ref<any>(null)
const scenes = ref<any[]>([])
const hotspots = ref<any[]>([])
const activeSceneId = ref<string | null>(null)

// R2 presigned GET URL cache: image_path → signed URL
const signedUrlCache = ref<Record<string, string>>({})

async function loadSignedUrls(sceneList: typeof scenes.value) {
  if (!sceneList.length) return
  await Promise.all(
    sceneList
      .filter(s => s.image_path && !signedUrlCache.value[s.image_path])
      .map(async (s) => {
        try {
          // Public tour viewer uses an unauthenticated fetch; the server route
          // generates the presigned URL server-side using R2 credentials.
          const res = await $fetch<{ url: string }>(
            `/api/uploads/panorama-signed-url?key=${encodeURIComponent(s.image_path)}`
          )
          signedUrlCache.value = { ...signedUrlCache.value, [s.image_path]: res.url }
        } catch { /* skip */ }
      })
  )
}

onMounted(async () => {
  pending.value = true
  try {
    // 1. Fetch space by slug
    const { data: spaceData, error: spaceErr } = await supabase
      .from('spaces')
      .select('*')
      .eq('slug', slug)
      .single()
      
    if (spaceErr) throw new Error('Tour not found or not published.')
    if (!spaceData.is_published) throw new Error('This tour is not published.')
    space.value = spaceData

    // 2. Fetch scenes
    const { data: scenesData, error: scenesErr } = await supabase
      .from('scenes')
      .select('*')
      .eq('space_id', space.value.id)
      .order('order_index', { ascending: true })
      
    if (scenesErr) throw scenesErr
    scenes.value = scenesData || []
    
    if (scenes.value.length > 0) {
      activeSceneId.value = scenes.value[0].id
      // Load R2 signed URLs for all scenes upfront
      await loadSignedUrls(scenes.value)

      // 3. Load ALL hotspots for all scenes at once (avoids per-scene network trips)
      const sceneIds = scenes.value.map(s => s.id)
      const { data: allHotspots } = await supabase
        .from('hotspots')
        .select('*')
        .in('scene_id', sceneIds)
      hotspots.value = allHotspots || []
    }
  } catch (err: any) {
    error.value = err.message
  } finally {
    pending.value = false
  }
})

// No longer need per-scene hotspot fetching — loaded all upfront
// Only filter clientside for current scene hotspots

const mappedScenes = computed(() => {
  return scenes.value
    .filter(s => s.image_path && signedUrlCache.value[s.image_path])
    .map(s => ({
      ...s,
      panorama_url: signedUrlCache.value[s.image_path] ?? null,
      initial_yaw: 0,
      initial_pitch: 0,
      initial_fov: 1.0
    }))
})

const currentHotspots = computed(() => {
  return hotspots.value.map(h => ({
    ...h,
    target_scene_id: h.type === 'nav' ? h.payload?.target_scene_id : null,
    label: h.type === 'info' ? h.payload?.label : (h.type === 'nav' ? 'Go' : '')
  }))
})

useSeoMeta({
  title: computed(() => space.value ? `${space.value.title} | Viewora` : 'Virtual Tour'),
})
</script>
