<template>
  <aside class="scene-sidebar">
    <!-- Header -->
    <div class="scene-sidebar__header">
      <span class="scene-sidebar__label">Scenes</span>
      <span class="scene-sidebar__count">{{ scenes.length }}</span>
    </div>

    <!-- Thumbnails list -->
    <div class="scene-sidebar__list">
      <EditorSceneThumb
        v-for="scene in scenes"
        :key="scene.id"
        :scene="scene"
        :is-active="scene.id === activeSceneId"
        @click="$emit('select', scene.id)"
      />
    </div>

    <!-- Add scene button -->
    <button class="scene-sidebar__add-btn" disabled title="Upload scenes from the space page">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span class="scene-sidebar__add-label">Add Scene</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
interface Scene {
  id: string
  name: string
  hasImage: boolean
}

defineProps<{
  scenes: Scene[]
  activeSceneId: string | null
}>()

defineEmits<{
  (e: 'select', id: string): void
}>()
</script>

<style scoped>
/* ── Desktop: vertical column ── */
.scene-sidebar {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
  height: 100%;
  width: 100%;
}

.scene-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 10px 10px 8px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.scene-sidebar__label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.scene-sidebar__count {
  font-size: 0.68rem;
  font-weight: 500;
  color: #9ca3af;
  background: #f3f4f6;
  border-radius: 99px;
  padding: 1px 6px;
}

.scene-sidebar__list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.scene-sidebar__list::-webkit-scrollbar { width: 3px; }
.scene-sidebar__list::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }

.scene-sidebar__add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin: 6px;
  padding: 7px;
  background: transparent;
  border: 1px dashed #d1d5db;
  border-radius: 7px;
  color: #9ca3af;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: not-allowed;
  flex-shrink: 0;
}

/* ── Mobile: horizontal strip ── */
@media (max-width: 600px) {
  .scene-sidebar {
    flex-direction: row;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    height: 100%;
    width: 100%;
  }

  .scene-sidebar__header {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-bottom: none;
    border-right: 1px solid #f3f4f6;
    min-width: 44px;
    flex-shrink: 0;
  }

  .scene-sidebar__label {
    display: none;
  }

  .scene-sidebar__count {
    margin: 0;
  }

  .scene-sidebar__list {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 6px 8px;
    gap: 6px;
    align-items: center;
  }

  /* Fix thumb sizing in horizontal mode */
  .scene-sidebar__list :deep(.scene-thumb) {
    width: 72px;
    min-width: 72px;
    flex-shrink: 0;
    padding: 4px;
  }

  .scene-sidebar__add-btn {
    flex-direction: column;
    min-width: 52px;
    width: 52px;
    flex-shrink: 0;
    font-size: 0;  /* hide text, show only icon */
    margin: 6px 4px;
    padding: 8px 4px;
    gap: 0;
    border-radius: 8px;
  }

  .scene-sidebar__add-label {
    display: none;
  }
}
</style>
