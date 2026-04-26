<template>
  <Transition name="editor-panel--top">
    <header
      v-if="visible"
      class="editor-glass fixed top-5 left-1/2 -translate-x-1/2 z-30 flex items-center h-12 px-3 gap-3 rounded-2xl w-[calc(100vw-40px)] max-w-[1100px] pointer-events-auto"
    >
      <!-- ── Left ── -->
      <div class="flex items-center gap-3 flex-1 min-w-0">

        <NuxtLink
          to="/app/spaces"
          class="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl text-gray-400 hover:text-gray-100 hover:bg-white/[0.08] hover:scale-[1.03] active:scale-[0.96] transition-all duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          title="Back to spaces"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </NuxtLink>

        <span class="flex-shrink-0 w-px h-4 bg-white/10"></span>

        <!-- Space name + dirty indicator -->
        <div class="flex items-center gap-2 min-w-0">
          <h1 class="text-sm font-semibold text-gray-100 truncate">{{ spaceName }}</h1>
          <Transition name="dot-pop">
            <span
              v-if="editorStore.isDirty"
              class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-white/50"
              title="Unsaved changes"
            ></span>
          </Transition>
        </div>

        <!-- Live badge -->
        <span
          v-if="isPublished"
          class="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wide"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          Live
        </span>

        <!-- Scene / hotspot stats -->
        <div v-if="sceneCount > 0 || hotspotCount > 0" class="flex items-center gap-3 flex-shrink-0">
          <span class="text-[11px] text-gray-500">
            <span class="font-semibold text-gray-300">{{ sceneCount }}</span> Scenes
          </span>
          <span class="w-px h-3 bg-white/10"></span>
          <span class="text-[11px] text-gray-500">
            <span class="font-semibold text-gray-300">{{ hotspotCount }}</span> Hotspots
          </span>
        </div>

        <!-- Processing indicator -->
        <Transition name="topbar-item">
          <div
            v-if="hasProcessingMedia"
            class="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-400 bg-white/[0.05] border border-white/[0.08]"
          >
            <span class="w-2.5 h-2.5 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0"></span>
            <span>{{ isProcessingStuck ? 'Taking longer than expected…' : 'Processing…' }}</span>
            <span class="text-gray-600">{{ processingElapsedSeconds }}s</span>
          </div>
        </Transition>

      </div>

      <!-- ── Right ── -->
      <div class="flex items-center gap-2 flex-shrink-0">

        <a
          v-if="isPublished && slug"
          :href="`/p/${slug}`"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-gray-300 border border-white/10 bg-white/5 hover:bg-white/10 hover:text-gray-100 hover:scale-[1.03] active:scale-[0.96] transition-all duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Preview
        </a>

        <button
          @click="$emit('toggle-publish')"
          :disabled="publishing || editorStore.isSaving"
          class="inline-flex items-center justify-center gap-2 h-8 px-4 rounded-lg text-[12px] font-semibold hover:scale-[1.03] active:scale-[0.96] disabled:scale-100 transition-all duration-[180ms] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          :class="isPublished
            ? 'bg-white/[0.08] text-gray-200 border border-white/[0.15] hover:bg-white/[0.12]'
            : 'bg-blue-600 text-white hover:bg-blue-500'"
        >
          <span
            v-if="publishing || editorStore.isSaving"
            class="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"
          ></span>
          <template v-else>
            {{ isPublished ? 'Unpublish' : 'Publish Tour' }}
          </template>
        </button>

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
  slug?: string
  sceneCount: number
  hotspotCount: number
  publishing: boolean
  hasProcessingMedia: boolean
  isProcessingStuck: boolean
  processingElapsedSeconds: number
}>()

defineEmits<{
  (e: 'toggle-publish'): void
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
</style>
