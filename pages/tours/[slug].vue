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

const getPublicUrl = (path: string) => {
  return supabase.storage.from('tours').getPublicUrl(path).data.publicUrl
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
    }
  } catch (err: any) {
    error.value = err.message
  } finally {
    pending.value = false
  }
})

// When active scene changes, load its hotspots
watch(activeSceneId, async (newId) => {
  if (!newId) return
  try {
    const { data, error } = await supabase
      .from('hotspots')
      .select('*')
      .eq('scene_id', newId)
    if (!error && data) {
      hotspots.value = data
    }
  } catch (e) {
    console.error('Failed to load hotspots')
  }
})

const mappedScenes = computed(() => {
  return scenes.value.map(s => ({
    ...s,
    panorama_url: s.image_path ? getPublicUrl(s.image_path) : null,
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
