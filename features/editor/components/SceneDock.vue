<template>
  <Transition name="scene-dock">
    <div
      v-if="visible && hasPanorama"
      class="editor-glass fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-2 py-2 rounded-full pointer-events-auto"
      style="max-width: calc(100vw - 40px)"
    >
      <!-- Scene filmstrip -->
      <div
        v-if="scenes.length"
        class="flex items-center gap-2 overflow-x-auto"
        style="scrollbar-width: none; max-width: 70vw"
      >
        <button
          v-for="scene in scenes"
          :key="scene.id"
          :aria-pressed="scene.id === activeSceneId"
          :aria-label="scene.label"
          class="relative flex-shrink-0 flex flex-col items-center gap-1 p-1 rounded-2xl transition-all duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-[0.96] hover:scale-[1.05]"
          :class="scene.id === activeSceneId
            ? 'ring-2 ring-blue-500 bg-blue-500/10'
            : 'hover:bg-white/[0.06]'"
          @click="$emit('select-scene', scene.id)"
        >
          <!-- Thumbnail -->
          <div class="w-[72px] h-[38px] rounded-xl overflow-hidden bg-white/[0.05] flex-shrink-0">
            <img
              v-if="scene.imageUrl"
              :src="scene.imageUrl"
              :alt="scene.label"
              class="w-full h-full object-cover"
              draggable="false"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-white/20" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
          </div>

          <!-- Title -->
          <span class="text-[9px] font-semibold leading-none max-w-[72px] truncate px-0.5"
            :class="scene.id === activeSceneId ? 'text-white' : 'text-gray-400'">
            {{ scene.label }}
          </span>

          <!-- Loading pulse indicator -->
          <span
            v-if="!scene.ready"
            class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
          />
        </button>
      </div>

      <!-- Divider -->
      <span v-if="scenes.length" class="w-px h-8 bg-white/10 flex-shrink-0" />

      <!-- Add Scene button -->
      <button
        :disabled="addScenePending"
        class="flex-shrink-0 flex flex-col items-center gap-1 p-1 rounded-2xl transition-all duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 hover:bg-white/[0.06] active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        @click="$emit('add-scene')"
      >
        <!-- Dashed add box -->
        <div class="w-[72px] h-[38px] rounded-xl border border-dashed border-white/20 flex items-center justify-center">
          <svg
            v-if="!addScenePending"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500" aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span
            v-else
            class="w-3 h-3 rounded-full border-2 border-gray-500 border-t-transparent animate-spin"
            aria-hidden="true"
          />
        </div>
        <span class="text-[9px] font-semibold leading-none text-gray-500">
          {{ addScenePending ? 'Adding…' : 'Scene' }}
        </span>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineProps<{
  scenes: { id: string; label: string; ready: boolean; imageUrl: string | null }[]
  activeSceneId: string
  hasPanorama: boolean
  addScenePending: boolean
}>()

defineEmits<{
  (e: 'select-scene', id: string): void
  (e: 'add-scene'): void
}>()

const visible = ref(false)
onMounted(() => { visible.value = true })
</script>

<style scoped>
.scene-dock-enter-active { transition: opacity 180ms ease, transform 180ms ease; }
.scene-dock-enter-from   { opacity: 0; transform: translate(-50%, 6px); }
.scene-dock-leave-active { transition: opacity 140ms ease, transform 140ms ease; }
.scene-dock-leave-to     { opacity: 0; transform: translate(-50%, 6px); }

div::-webkit-scrollbar { display: none; }
</style>
