<template>
  <div>
    <div class="mode-switch" role="tablist" aria-label="Editor mode">
      <button
        role="tab"
        :aria-selected="mode === 'tour'"
        class="mode-switch__btn"
        :class="{ 'mode-switch__btn--active': mode === 'tour' }"
        @click="setMode('tour')"
      >360° Tour</button>
      <button
        role="tab"
        :aria-selected="mode === 'photos'"
        class="mode-switch__btn"
        :class="{ 'mode-switch__btn--active': mode === 'photos' }"
        @click="setMode('photos')"
      >Photos</button>
    </div>

    <!-- v-show, not v-if — EditorShell owns a live WebGL canvas + upload
         state; destroying and remounting it on every tab switch would be
         wasteful and would drop in-progress uploads. -->
    <div v-show="mode === 'tour'" class="mode-pane">
      <EditorShell :space-id="spaceId" />
    </div>
    <PhotosPanel v-if="mode === 'photos'" :space-id="spaceId" />

    <ClaimBanner />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta, useSeoMeta, useRoute, useRouter } from '#imports'
import EditorShell from '~/features/editor/EditorShell.vue'
import PhotosPanel from '~/features/editor/PhotosPanel.vue'

definePageMeta({ layout: 'editor', middleware: 'auth' })
useSeoMeta({ title: 'Edit Tour | Viewora' })

const route = useRoute()
const router = useRouter()
const spaceId = route.params.id as string

const mode = ref<'tour' | 'photos'>(route.query.tab === 'photos' ? 'photos' : 'tour')
function setMode(next: 'tour' | 'photos') {
  mode.value = next
  router.replace({ query: { ...route.query, tab: next } })
}
</script>

<style scoped>
.mode-switch {
  position: fixed; top: 64px; left: 50%; transform: translateX(-50%); z-index: 29;
  display: flex; gap: 2px; padding: 3px; border-radius: 12px;
  background: rgba(20, 20, 24, 0.7); border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(16px);
}
.mode-switch__btn {
  height: 30px; padding: 0 14px; border-radius: 9px; border: none; background: transparent;
  color: rgba(255,255,255,0.45); font-size: 12px; font-weight: 700; cursor: pointer;
  transition: background 140ms, color 140ms;
}
.mode-switch__btn:hover { color: rgba(255,255,255,0.75); }
.mode-switch__btn--active { background: rgba(255,255,255,0.12); color: #fff; }

.mode-pane { width: 100%; height: 100%; }

@media (max-width: 640px) {
  .mode-switch { top: 58px; }
}
</style>
