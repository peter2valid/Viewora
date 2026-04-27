<template>
  <Transition name="panel-slide">
    <aside
      v-if="visible"
      class="editor-glass fixed right-5 top-1/2 -translate-y-1/2 z-40 w-80 max-h-[80vh] flex flex-col p-4 rounded-3xl pointer-events-auto overflow-hidden shadow-2xl"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-white text-sm font-bold tracking-tight uppercase">Scene Hotspots</h2>
          <p class="text-white/40 text-[10px] font-bold tracking-wider uppercase mt-0.5">{{ hotspots.length }} active</p>
        </div>
        <button
          @click="$emit('close')"
          class="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Hotspot List -->
      <div v-if="!selectedId" class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        <div v-if="hotspots.length === 0" class="flex flex-col items-center justify-center py-12 text-center opacity-40">
          <div class="w-12 h-12 rounded-2xl border border-dashed border-white/20 flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p class="text-[11px] font-bold uppercase tracking-widest">No hotspots yet</p>
          <p class="text-[10px] mt-1">Click the viewer to add one</p>
        </div>

        <button
          v-for="hs in hotspots"
          :key="hs.id"
          @click="$emit('select', hs.id)"
          class="w-full group flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-left"
        >
          <div
            class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg text-white [&_svg]:w-3.5 [&_svg]:h-3.5"
            :class="hs.type === 'scene_link' ? 'bg-blue-600' : 'bg-white/10'"
            v-html="HOTSPOT_ICONS_BY_KEY[hs.icon || TYPE_DEFAULT_ICON[hs.type] || 'info']"
          >
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-white text-[11px] font-bold truncate leading-tight">{{ hs.label || 'Unnamed Hotspot' }}</p>
            <p class="text-white/40 text-[9px] font-bold uppercase tracking-wider mt-0.5 truncate">
              {{ hs.type === 'scene_link' ? 'Navigation' : hs.type === 'url' ? 'Web Link' : 'Information' }}
            </p>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <!-- Hotspot Editor (Visible when selected) -->
      <div v-else class="flex-1 flex flex-col min-h-0">
        <button
          @click="$emit('select', null)"
          class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white mb-4 transition-colors group"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" class="group-hover:-translate-x-0.5 transition-transform">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Back to list
        </button>

        <div class="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar pb-4">
          <!-- Type Toggle -->
          <div class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Type</span>
            <div class="flex flex-wrap gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <button
                v-for="t in (['info', 'scene_link', 'url', 'video', 'youtube'] as const)"
                :key="t"
                @click="updateDraft({ type: t })"
                class="flex-1 min-w-[30%] h-7 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                :class="draft.type === t ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white/60'"
              >
                {{ t === 'scene_link' ? 'Link' : t }}
              </button>
            </div>
          </div>

          <!-- Label -->
          <div class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Label</span>
            <input
              v-model="draft.label"
              type="text"
              placeholder="e.g. Living Room"
              class="w-full h-10 px-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-xs font-bold focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
            />
          </div>

          <!-- Description (Info only) -->
          <div v-if="draft.type === 'info'" class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Description</span>
            <textarea
              v-model="draft.description"
              rows="3"
              placeholder="Enter details..."
              class="w-full p-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-xs font-bold focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all resize-none"
            ></textarea>
          </div>

          <!-- Target Scene (Link only) -->
          <div v-if="draft.type === 'scene_link'" class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Target Scene</span>
            <select
              v-model="draft.targetSceneId"
              class="w-full h-10 px-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-xs font-bold focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all appearance-none cursor-pointer"
            >
              <option v-for="s in otherScenes" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
          </div>

          <!-- URL (URL, Video, YouTube) -->
          <div v-if="['url', 'video', 'youtube'].includes(draft.type)" class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
              {{ draft.type === 'youtube' ? 'YouTube URL or ID' : 'Web Address / Video URL' }}
            </span>
            <input
              v-model="draft.url"
              type="url"
              :placeholder="draft.type === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'"
              class="w-full h-10 px-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-xs font-bold focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
            />
          </div>

          <!-- Icon Picker -->
          <div class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Icon</span>
            <div class="grid grid-cols-4 gap-1">
              <button
                v-for="iconDef in HOTSPOT_ICON_DEFS"
                :key="iconDef.key"
                :title="iconDef.label"
                @click="updateDraft({ icon: iconDef.key })"
                class="flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all"
                :class="effectiveIcon === iconDef.key
                  ? 'bg-white/15 ring-1 ring-white/25'
                  : 'hover:bg-white/[0.06]'"
              >
                <span class="w-6 h-6 flex items-center justify-center text-white [&_svg]:w-full [&_svg]:h-full" v-html="iconDef.svg" />
                <span class="text-[8px] font-bold text-white/40 uppercase tracking-wider leading-none">{{ iconDef.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-4 border-t border-white/[0.08]">
          <button
            @click="$emit('save')"
            :disabled="saving"
            class="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-900/20"
          >
            <span v-if="saving" class="flex items-center justify-center">
              <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            <span v-else>Save Changes</span>
          </button>
          <button
            @click="$emit('delete')"
            :disabled="deleting"
            class="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EditorHotspot } from '../mappers'
import { HOTSPOT_ICON_DEFS, TYPE_DEFAULT_ICON, HOTSPOT_ICONS_BY_KEY } from '~/shared/utils/hotspotIcons'

const props = defineProps<{
  visible: boolean
  hotspots: EditorHotspot[]
  selectedId: string | null
  draft: { label: string; description: string; url: string; targetSceneId: string; type: 'info' | 'url' | 'scene_link' | 'video' | 'youtube'; icon: string }
  otherScenes: { id: string; label: string }[]
  saving: boolean
  deleting: boolean
}>()

const effectiveIcon = computed(() =>
  props.draft.icon || TYPE_DEFAULT_ICON[props.draft.type] || 'info'
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', id: string | null): void
  (e: 'update-draft', patch: Partial<typeof props.draft>): void
  (e: 'save'): void
  (e: 'delete'): void
}>()

function updateDraft(patch: Partial<typeof props.draft>) {
  emit('update-draft', patch)
}
</script>

<style scoped>
.panel-slide-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.panel-slide-leave-active { transition: all 0.2s ease-in; }
.panel-slide-enter-from    { opacity: 0; transform: translate(20px, -50%); }
.panel-slide-leave-to      { opacity: 0; transform: translate(20px, -50%); }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
</style>
