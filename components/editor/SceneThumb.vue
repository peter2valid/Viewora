<template>
  <button class="scene-thumb" :class="{ 'scene-thumb--active': isActive }" @click="$emit('click')">
    <div class="scene-thumb__image">
      <!-- Active checkmark -->
      <div v-if="isActive" class="scene-thumb__check">
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <!-- Panorama/image placeholder -->
      <div class="scene-thumb__placeholder" :class="{ 'scene-thumb__placeholder--has-image': scene.hasImage }">
        <svg v-if="scene.hasImage" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="scene-thumb__icon">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="scene-thumb__icon scene-thumb__icon--empty">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </div>
    </div>
    <span class="scene-thumb__name">{{ scene.name }}</span>
  </button>
</template>

<script setup lang="ts">
interface Scene {
  id: string
  name: string
  hasImage: boolean
}

defineProps<{
  scene: Scene
  isActive: boolean
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>

<style scoped>
.scene-thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 7px;
  transition: background 0.12s;
  text-align: center;
}

.scene-thumb:hover { background: #f0f4ff; }
.scene-thumb--active { background: #eff6ff; }

.scene-thumb__image {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 5px;
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.12s;
}

.scene-thumb--active .scene-thumb__image { border-color: #3b82f6; }

.scene-thumb__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #d1d5db;
}

.scene-thumb__placeholder--has-image {
  background: linear-gradient(135deg, #b8c5d6 0%, #9badb8 50%, #b0bec5 100%);
}

.scene-thumb__icon { color: #6b7280; opacity: 0.75; }
.scene-thumb__icon--empty { color: #9ca3af; }

.scene-thumb__check {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  z-index: 2;
}

.scene-thumb__name {
  font-size: 0.65rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: center;
  line-height: 1.3;
}

.scene-thumb--active .scene-thumb__name { color: #1d4ed8; font-weight: 600; }

/* ── Mobile: compact horizontal thumb ── */
@media (max-width: 600px) {
  .scene-thumb {
    width: 72px;
    min-width: 72px;
    padding: 4px;
    gap: 3px;
  }

  .scene-thumb__name {
    font-size: 0.6rem;
  }
}
</style>
