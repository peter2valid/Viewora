<template>
  <div class="editor-shell" style="background: #000;">
    <!-- Top Bar -->
    <div class="editor-topbar" style="justify-content: space-between;">
      <div class="editor-tour-title">
        <span class="editor-tour-title-text" style="font-size: 1rem; font-weight: 700;">
          {{ tour?.title ?? 'Loading Tour...' }}
        </span>
      </div>

      <div>
        <NuxtLink v-if="user" :to="`/app/tours/${tourId}/edit`" class="editor-action-btn editor-action-btn--secondary" style="text-decoration: none;">
          Edit Tour
        </NuxtLink>
        <div v-else style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="color: #9ca3af; font-size: 0.8rem;">Powered by</span>
          <a href="https://viewora.software" target="_blank" class="sidebar-logo" style="font-size: 1rem; text-decoration: none;">Viewora</a>
        </div>
      </div>
    </div>

    <!-- Viewer Area (Full Screen) -->
    <div v-if="errorMsg" class="marzipano-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24"
        fill="none" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p style="color: #ef4444;">{{ errorMsg }}</p>
      <NuxtLink to="/" class="btn btn-primary" style="margin-top: 1rem;">Go Home</NuxtLink>
    </div>
    
    <div v-else-if="pending" class="marzipano-placeholder">
      <div class="confirm-spinner" style="border-top-color: var(--accent);"></div>
      <p>Loading 360° Experience...</p>
    </div>

    <div v-else class="editor-viewer-area" style="grid-column: 1 / -1; grid-row: 2; height: calc(100vh - 52px);">
      <EditorMarzipanoViewer
        :scenes="scenes"
        :hotspots="hotspots"
        :active-scene-id="activeSceneId"
        :add-hotspot-mode="false"
        @hotspot-navigate="setActiveScene"
      />
      
      <!-- Scene selector (bottom overlay) -->
      <div v-if="scenes.length > 1" class="tour-scene-selector">
        <button
          v-for="scene in scenes"
          :key="scene.id"
          class="tour-scene-thumb"
          :class="{ 'tour-scene-thumb--active': scene.id === activeSceneId }"
          @click="setActiveScene(scene.id)"
          :title="scene.name"
        >
          <img v-if="scene.panorama_url" :src="scene.panorama_url" :alt="scene.name" loading="lazy" />
          <div class="tour-scene-label">{{ scene.name }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Database } from '~/types/database.types'

type Tour = Database['public']['Tables']['virtual_tours']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']
type Hotspot = Database['public']['Tables']['hotspots']['Row']

definePageMeta({
  layout: false, // Don't use default layout, we use our own full-screen shell
})

const route = useRoute()
const tourId = route.params.id as string

const supabase = useSupabaseClient<Database>()
const user = useSupabaseUser()

const tour = ref<Tour | null>(null)
const scenes = ref<Scene[]>([])
const hotspots = ref<Hotspot[]>([])
const activeSceneId = ref<string | null>(null)

const pending = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    // 1. Fetch tour
    const { data: tourData, error: tourErr } = await supabase
      .from('virtual_tours')
      .select('*')
      .eq('id', tourId)
      .single()

    if (tourErr || !tourData) throw new Error('Tour not found.')
    
    // Auth check: if draft, only owner can view
    if (tourData.status !== 'published') {
      // Must check if user owns the property this tour belongs to
      if (!user.value) throw new Error('This tour is not published yet.')
      
      const { data: propData } = await supabase
        .from('properties')
        .select('user_id')
        .eq('id', tourData.property_id)
        .single()
        
      if (propData?.user_id !== user.value.id) {
        throw new Error('This tour is not published yet.')
      }
    }
    
    tour.value = tourData
    useSeoMeta({ title: `${tour.value.title} | Viewora 360° Tour` })

    // 2. Fetch scenes
    const { data: scenesData, error: scenesErr } = await supabase
      .from('scenes')
      .select('*')
      .eq('tour_id', tourId)
      .order('sort_order', { ascending: true })

    if (scenesErr) throw scenesErr
    scenes.value = scenesData ?? []

    if (scenes.value.length > 0) {
      activeSceneId.value = scenes.value[0].id
    } else {
      throw new Error('This tour has no scenes yet.')
    }

    // 3. Fetch hotspots
    const sceneIds = scenes.value.map(s => s.id)
    if (sceneIds.length > 0) {
      const { data: hotspotsData, error: hotspotsErr } = await supabase
        .from('hotspots')
        .select('*')
        .in('scene_id', sceneIds)

      if (hotspotsErr) throw hotspotsErr
      hotspots.value = hotspotsData ?? []
    }

  } catch (e: any) {
    errorMsg.value = e.message || 'An error occurred loading the tour.'
  } finally {
    pending.value = false
  }
})

function setActiveScene(sceneId: string) {
  activeSceneId.value = sceneId
}
</script>

<style scoped>
.tour-scene-selector {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 90vw;
  overflow-x: auto;
  z-index: 20;
}

.tour-scene-selector::-webkit-scrollbar {
  height: 6px;
}

.tour-scene-selector::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 6px;
}

.tour-scene-thumb {
  position: relative;
  width: 80px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  background: #1a1a1a;
  padding: 0;
  transition: all 0.2s ease;
}

.tour-scene-thumb:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.5);
}

.tour-scene-thumb--active {
  border-color: var(--accent);
}

.tour-scene-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.tour-scene-thumb:hover img,
.tour-scene-thumb--active img {
  opacity: 1;
}

.tour-scene-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 16px 4px 4px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}
</style>
