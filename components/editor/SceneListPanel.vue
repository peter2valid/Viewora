<template>
  <div class="scene-panel">
    <!-- Panel header -->
    <div class="scene-panel-header">
      <span class="scene-panel-title">Scenes</span>
      <button
        class="scene-add-btn"
        @click="triggerFileInput"
        :disabled="uploading"
        title="Upload panorama image"
      >
        <span v-if="uploading" class="btn-spinner-xs"></span>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        {{ uploading ? 'Uploading…' : 'Add Scene' }}
      </button>
      <!-- Hidden file input -->
      <input
        ref="fileInputEl"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style="display: none;"
        @change="onFileSelected"
      />
    </div>

    <!-- Upload error -->
    <div v-if="uploadError" class="scene-upload-error">
      {{ uploadError }}
    </div>

    <!-- Empty state -->
    <div v-if="scenes.length === 0 && !uploading" class="scene-panel-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      <p>No scenes yet</p>
      <p class="scene-panel-empty-sub">Upload a 360° panorama to get started</p>
    </div>

    <!-- Scene list -->
    <ul class="scene-list" v-else>
      <li
        v-for="scene in scenes"
        :key="scene.id"
        class="scene-item"
        :class="{ 'scene-item--active': scene.id === activeSceneId }"
        @click="$emit('select-scene', scene.id)"
      >
        <!-- Thumbnail -->
        <div class="scene-thumb">
          <img
            v-if="scene.panorama_url"
            :src="scene.panorama_url"
            :alt="scene.name"
            loading="lazy"
          />
          <div v-else class="scene-thumb-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
        </div>

        <!-- Scene info -->
        <div class="scene-item-info">
          <span class="scene-item-name">{{ scene.name }}</span>
          <span class="scene-item-meta">{{ hotspotsForScene(scene.id).length }} hotspot{{ hotspotsForScene(scene.id).length === 1 ? '' : 's' }}</span>
        </div>

        <!-- Delete button -->
        <button
          class="scene-delete-btn"
          @click.stop="$emit('delete-scene', scene.id)"
          title="Delete scene"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14H6L5 6"></path>
            <path d="M10 11v6M14 11v6"></path>
            <path d="M9 6V4h6v2"></path>
          </svg>
        </button>
      </li>

      <!-- Uploading placeholder -->
      <li v-if="uploading" class="scene-item scene-item--uploading">
        <div class="scene-thumb scene-thumb--uploading">
          <div class="scene-upload-spinner"></div>
        </div>
        <div class="scene-item-info">
          <span class="scene-item-name">Uploading…</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Database } from '~/types/database.types'

type Scene = Database['public']['Tables']['scenes']['Row']
type Hotspot = Database['public']['Tables']['hotspots']['Row']

const props = defineProps<{
  scenes: Scene[]
  hotspots: Hotspot[]
  activeSceneId: string | null
  uploading: boolean
  uploadError: string | null
}>()

const emit = defineEmits<{
  (e: 'select-scene', sceneId: string): void
  (e: 'delete-scene', sceneId: string): void
  (e: 'upload-file', file: File): void
}>()

const fileInputEl = ref<HTMLInputElement | null>(null)

function triggerFileInput() {
  fileInputEl.value?.click()
}

function onFileSelected(evt: Event) {
  const file = (evt.target as HTMLInputElement).files?.[0]
  if (!file) return
  emit('upload-file', file)
  // Reset so the same file can be re-selected
  if (fileInputEl.value) fileInputEl.value.value = ''
}

function hotspotsForScene(sceneId: string): Hotspot[] {
  return props.hotspots.filter(h => h.scene_id === sceneId)
}
</script>
