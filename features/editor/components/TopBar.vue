<template>
  <Transition name="editor-panel--top">
    <header
      v-if="visible"
      class="editor-glass fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-30 flex items-center h-12 px-2 sm:px-3 rounded-2xl w-[calc(100vw-24px)] sm:w-[calc(100vw-40px)] max-w-[1000px] pointer-events-auto"
    >
      <div class="flex items-center justify-between w-full gap-2 sm:gap-3">
        <div class="flex items-center gap-1 sm:gap-2 min-w-0">
          <NuxtLink
            to="/app/spaces"
            class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/[0.08] transition-colors"
            title="Back to spaces"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </NuxtLink>

          <div class="topbar-tour-pill" :title="spaceName">
            <span class="topbar-tour-pill__label">{{ spaceName || 'MY TOUR' }}</span>
            <span class="topbar-tour-pill__dot hidden sm:inline">•</span>
            <span class="topbar-tour-pill__mode hidden sm:inline">360°</span>
          </div>

          <Transition name="dot-pop">
            <span
              v-if="editorStore.isDirty"
              class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-white/50"
              title="Unsaved changes"
            ></span>
          </Transition>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            @click="$emit('preview')"
            class="flex-shrink-0 flex items-center justify-center gap-2 h-8 px-2 sm:px-3 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/[0.08] transition-colors"
            title="Preview tour"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span class="hidden md:inline text-[12px] font-semibold">Preview</span>
          </button>

          <button
            @click="$emit('toggle-settings')"
            class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/[0.08] transition-colors"
            title="Tour settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <circle cx="9" cy="6" r="2.5" fill="currentColor" stroke="none"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <circle cx="15" cy="12" r="2.5" fill="currentColor" stroke="none"/>
              <line x1="4" y1="18" x2="20" y2="18"/>
              <circle cx="10" cy="18" r="2.5" fill="currentColor" stroke="none"/>
            </svg>
          </button>

          <button
            @click="$emit('toggle-publish')"
            :disabled="publishing || editorStore.isSaving"
            class="inline-flex items-center justify-center gap-2 h-8 px-3 sm:px-4 rounded-lg text-[11px] sm:text-[12px] font-semibold transition-all duration-[160ms] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            :class="isPublished
              ? 'bg-white/[0.08] text-gray-200 border border-white/[0.15] hover:bg-white/[0.12]'
              : 'bg-blue-600 text-white hover:bg-blue-500'"
          >
            <span
              v-if="publishing || editorStore.isSaving"
              class="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"
            ></span>
            <template v-else>
              <span class="sm:hidden">{{ isPublished ? 'Unpub' : 'Publish' }}</span>
              <span class="hidden sm:inline">{{ isPublished ? 'Unpublish' : 'Publish Tour' }}</span>
            </template>
          </button>
        </div>
      </div>
    </header>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEditorStore } from '~/features/editor/store/useEditorStore'

defineProps<{
  spaceName: string
  isPublished: boolean
  publishing: boolean
  spaceId?: string
  slug?: string
}>()

defineEmits<{
  (e: 'toggle-publish'): void
  (e: 'toggle-settings'): void
  (e: 'preview'): void
}>()

const editorStore = useEditorStore()

const visible = ref(false)
onMounted(() => { visible.value = true })
</script>

<style scoped>
.editor-panel--top-enter-active  { transition: opacity 180ms ease, transform 180ms ease; }
.editor-panel--top-enter-from    { opacity: 0; transform: translate(-50%, 6px); }
.editor-panel--top-leave-active  { transition: opacity 140ms ease, transform 140ms ease; }
.editor-panel--top-leave-to      { opacity: 0; transform: translate(-50%, 6px); }

.topbar-item-enter-active,
.topbar-item-leave-active { transition: opacity 150ms ease, transform 150ms ease; }
.topbar-item-enter-from,
.topbar-item-leave-to     { opacity: 0; transform: translateY(-3px); }

.dot-pop-enter-active { transition: opacity 150ms ease, transform 150ms ease; }
.dot-pop-leave-active { transition: opacity 100ms ease, transform 100ms ease; }
.dot-pop-enter-from,
.dot-pop-leave-to     { opacity: 0; transform: scale(0); }

.topbar-tour-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06));
  border: 1px solid rgba(255,255,255,0.15);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
  max-width: 280px;
}

.topbar-tour-pill__label {
  font-size: 11px;
  letter-spacing: 0.18em;
  font-weight: 700;
  color: rgba(255,255,255,0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 210px;
}

.topbar-tour-pill__dot {
  color: rgba(255,255,255,0.45);
  font-size: 11px;
}

.topbar-tour-pill__mode {
  font-size: 10px;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: rgba(255,255,255,0.65);
}
</style>
