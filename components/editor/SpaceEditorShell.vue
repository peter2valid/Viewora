<template>
  <div class="se-shell">

    <!-- ── Top bar ── -->
    <header class="se-topbar">
      <NuxtLink :to="backLink" class="se-topbar__back" title="Back to Space">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </NuxtLink>
      <div class="se-topbar__divider"></div>

      <!-- Logo placeholder -->
      <div class="se-topbar__logo">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
      </div>

      <span class="se-topbar__title">{{ spaceName }}</span>

      <span :class="['se-topbar__badge', isPublished ? 'se-topbar__badge--live' : 'se-topbar__badge--draft']">
        {{ isPublished ? 'Live' : 'Draft' }}
      </span>

      <div class="se-topbar__spacer"></div>

      <button
        v-if="showHotspotToggle"
        :class="['se-topbar__btn', 'se-topbar__btn--ghost', addHotspotMode ? 'se-topbar__btn--active' : '']"
        @click="$emit('toggle-hotspot-mode')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <span class="se-topbar__btn-label">{{ addHotspotMode ? 'Cancel' : 'Hotspot' }}</span>
      </button>

      <button
        class="se-topbar__btn se-topbar__btn--ghost"
        disabled
        title="Coming soon"
      >
        <span class="se-topbar__btn-label">Preview</span>
      </button>
      <button
        class="se-topbar__btn se-topbar__btn--primary"
        :disabled="isPublishing"
        @click="$emit('publish')"
      >
        {{ isPublishing ? '…' : 'Publish' }}
      </button>
    </header>

    <!-- ── Sidebar ── -->
    <EditorSceneSidebar
      :scenes="scenes"
      :active-scene-id="activeSceneId"
      @select="$emit('select-scene', $event)"
    />

    <!-- ── Canvas ── -->
    <EditorCanvas :active-scene="activeScene">
      <template #viewer>
        <slot name="viewer" />
      </template>
    </EditorCanvas>

    <!-- ── Toolbar ── -->
    <EditorToolbar
      @add-logo="$emit('add-logo')"
      @add-hotspot="$emit('toggle-hotspot-mode')"
    />

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Scene {
  id: string
  name: string
  hasImage: boolean
}

const props = defineProps<{
  scenes: Scene[]
  spaceName?: string
  spaceId?: string
  activeSceneId?: string | null
  isPublished?: boolean
  isPublishing?: boolean
  addHotspotMode?: boolean
  showHotspotToggle?: boolean
}>()

defineEmits<{
  (e: 'select-scene', id: string): void
  (e: 'toggle-hotspot-mode'): void
  (e: 'publish'): void
  (e: 'add-logo'): void
}>()

const backLink = computed(() =>
  props.spaceId ? `/app/spaces/${props.spaceId}` : '/app/spaces'
)

const activeScene = computed(() =>
  props.scenes.find(s => s.id === props.activeSceneId) ?? null
)
</script>

<style scoped>
/* ── Full-screen shell ── */
.se-shell {
  position: fixed;
  inset: 0;
  display: grid;
  /* sidebar | canvas */
  grid-template-columns: 160px 1fr;
  /* topbar | content | toolbar */
  grid-template-rows: 48px 1fr 52px;
  background: #f0f0f0;
  overflow: hidden;
  font-family: var(--font-sans, system-ui, sans-serif);
}

/* ── Top bar spans full width ── */
.se-topbar {
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  z-index: 10;
  min-width: 0;
}

.se-topbar__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  color: #9ca3af;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.se-topbar__back:hover { background: #f3f4f6; color: #111827; }

.se-topbar__divider {
  width: 1px;
  height: 18px;
  background: #e5e7eb;
  flex-shrink: 0;
}

.se-topbar__logo {
  width: 26px;
  height: 26px;
  background: #f3f4f6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  flex-shrink: 0;
}

.se-topbar__title {
  font-size: 0.825rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: 160px;
}

.se-topbar__badge {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 99px;
  flex-shrink: 0;
}
.se-topbar__badge--draft { background: #f3f4f6; color: #9ca3af; border: 1px solid #e5e7eb; }
.se-topbar__badge--live  { background: #ecfdf5; color: #10b981; border: 1px solid #d1fae5; }

.se-topbar__spacer { flex: 1; min-width: 0; }

.se-topbar__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 0.775rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.se-topbar__btn:disabled { cursor: not-allowed; opacity: 0.55; }

.se-topbar__btn--ghost {
  background: transparent;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}
.se-topbar__btn--ghost:hover:not(:disabled) { background: #f3f4f6; color: #111827; }
.se-topbar__btn--active { background: #eff6ff; border-color: #3b82f6; color: #3b82f6; }

.se-topbar__btn--primary {
  background: #111827;
  border: 1px solid #111827;
  color: #ffffff;
}
.se-topbar__btn--primary:hover:not(:disabled) { background: #1f2937; }

/* ── Sidebar placement ── */
:deep(.scene-sidebar) {
  grid-column: 1;
  grid-row: 2 / 4; /* spans canvas + toolbar rows */
}

/* ── Canvas placement ── */
:deep(.editor-canvas) {
  grid-column: 2;
  grid-row: 2;
}

/* ── Toolbar placement ── */
:deep(.editor-toolbar) {
  grid-column: 2;
  grid-row: 3;
}

/* ── Tablet: narrow sidebar ── */
@media (max-width: 1024px) {
  .se-shell {
    grid-template-columns: 130px 1fr;
  }
}

/* ── Mobile: stack sidebar horizontally ── */
@media (max-width: 600px) {
  .se-shell {
    grid-template-columns: 1fr;
    grid-template-rows: 48px 100px 1fr 52px;
  }

  .se-topbar {
    grid-column: 1;
    grid-row: 1;
  }

  :deep(.scene-sidebar) {
    grid-column: 1;
    grid-row: 2;
  }

  :deep(.editor-canvas) {
    grid-column: 1;
    grid-row: 3;
  }

  :deep(.editor-toolbar) {
    grid-column: 1;
    grid-row: 4;
  }

  /* Hide some topbar elements on mobile to save space */
  .se-topbar__badge {
    display: none;
  }

  .se-topbar__btn-label {
    display: none;
  }

  .se-topbar__btn {
    padding: 5px 8px;
  }
}
</style>
