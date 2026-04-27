<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EditorHotspot } from '../mappers'
import { HOTSPOT_ICON_DEFS, TYPE_DEFAULT_ICON, HOTSPOT_ICONS_BY_KEY } from '~/shared/utils/hotspotIcons'

const props = defineProps<{
  visible: boolean
  hotspots: EditorHotspot[]
  selectedId: string | null
  draft: { label: string; description: string; url: string; targetSceneId: string; type: 'info' | 'url' | 'scene_link' | 'video' | 'youtube'; icon: string; scale: number; hoverScale: number; corners?: Array<{ yaw: number; pitch: number }> }
  otherScenes: { id: string; label: string }[]
  saving: boolean
  deleting: boolean
}>()

const activeTab = ref<'content' | 'style' | 'spatial'>('content')

const effectiveIcon = computed(() =>
  props.draft.icon || TYPE_DEFAULT_ICON[props.draft.type] || 'info'
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', id: string | null): void
  (e: 'update-draft', patch: Partial<typeof props.draft>): void
  (e: 'save'): void
  (e: 'delete'): void
  (e: 'start-tracing'): void
}>()

function updateDraft(patch: Partial<typeof props.draft>) {
  emit('update-draft', patch)
}
</script>

<template>
  <Transition name="panel-slide">
    <aside
      v-if="visible"
      class="editor-glass fixed z-40 flex flex-col p-4 pointer-events-auto overflow-hidden shadow-2xl transition-all duration-300
             inset-x-4 bottom-24 max-h-[75vh] rounded-[2rem]
             sm:inset-auto sm:right-5 sm:top-1/2 sm:-translate-y-1/2 sm:w-80 sm:max-h-[85vh] sm:rounded-3xl"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-white text-sm font-bold tracking-tight uppercase">Hotspot Editor</h2>
          <p class="text-white/40 text-[10px] font-bold tracking-wider uppercase mt-0.5">{{ selectedId ? 'Editing Marker' : `${hotspots.length} total` }}</p>
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

      <!-- Main List -->
      <div v-if="!selectedId" class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        <div v-if="hotspots.length === 0" class="flex flex-col items-center justify-center py-12 text-center opacity-40">
          <div class="w-12 h-12 rounded-2xl border border-dashed border-white/20 flex items-center justify-center mb-4 text-blue-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <p class="text-[11px] font-bold uppercase tracking-widest text-white/60">No hotspots yet</p>
          <p class="text-[10px] mt-1">Click the room to place one</p>
        </div>

        <button
          v-for="hs in hotspots"
          :key="hs.id"
          @click="$emit('select', hs.id)"
          class="w-full group flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-left"
        >
          <div
            class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg text-white [&_svg]:w-3.5 [&_svg]:h-3.5"
            :class="hs.type === 'scene_link' ? 'bg-blue-600' : hs.type === 'video' || hs.type === 'youtube' ? 'bg-purple-600' : 'bg-white/10'"
            v-html="HOTSPOT_ICONS_BY_KEY[hs.icon || TYPE_DEFAULT_ICON[hs.type] || 'info']"
          />
          <div class="min-w-0 flex-1">
            <p class="text-white text-[11px] font-bold truncate leading-tight">{{ hs.label || 'Unnamed Hotspot' }}</p>
            <p class="text-white/40 text-[9px] font-bold uppercase tracking-wider mt-0.5 truncate">
              {{ hs.type.replace('_', ' ') }}
            </p>
          </div>
        </button>
      </div>

      <!-- Tabbed Editor -->
      <div v-else class="flex-1 flex flex-col min-h-0">
        <!-- Back and Tabs -->
        <div class="flex flex-col gap-4 mb-5">
          <button
            @click="$emit('select', null)"
            class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors group"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" class="group-hover:-translate-x-0.5 transition-transform">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Back to list
          </button>

          <div class="flex p-1 rounded-xl bg-black/20 border border-white/5">
            <button
              v-for="tab in (['content', 'style', 'spatial'] as const)"
              :key="tab"
              @click="activeTab = tab"
              class="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
              :class="activeTab === tab ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white/60'"
            >
              {{ tab }}
            </button>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-4">
          <!-- TAB: CONTENT -->
          <div v-if="activeTab === 'content'" class="space-y-5">
            <!-- Type Toggle -->
            <div class="space-y-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Behavior</span>
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

            <div class="space-y-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Label</span>
              <input v-model="draft.label" type="text" placeholder="e.g. Living Room" class="editor-input" />
            </div>

            <div v-if="draft.type === 'info'" class="space-y-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Description</span>
              <textarea v-model="draft.description" rows="4" placeholder="Enter details..." class="editor-input resize-none h-28"></textarea>
            </div>

            <div v-if="draft.type === 'scene_link'" class="space-y-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Destination</span>
              <select v-model="draft.targetSceneId" class="editor-input appearance-none cursor-pointer">
                <option v-for="s in otherScenes" :key="s.id" :value="s.id">{{ s.label }}</option>
              </select>
            </div>

            <div v-if="['url', 'video', 'youtube'].includes(draft.type)" class="space-y-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
                {{ draft.type === 'youtube' ? 'YouTube URL' : 'Link / Video URL' }}
              </span>
              <input v-model="draft.url" type="url" placeholder="https://..." class="editor-input" />
            </div>
          </div>

          <!-- TAB: STYLE -->
          <div v-else-if="activeTab === 'style'" class="space-y-6">
            <div class="space-y-3">
              <div class="flex items-center justify-between ml-1">
                <span class="text-[10px] font-black uppercase tracking-widest text-white/30">Display Size</span>
                <span class="text-[10px] font-bold text-blue-400">{{ Math.round(draft.scale * 100) }}%</span>
              </div>
              <input v-model.number="draft.scale" type="range" min="0.5" max="2.5" step="0.1" class="editor-range" />
            </div>

            <div class="space-y-3 border-b border-white/5 pb-6">
              <div class="flex items-center justify-between ml-1">
                <span class="text-[10px] font-black uppercase tracking-widest text-white/30">Hover Animation</span>
                <span class="text-[10px] font-bold text-blue-400">{{ draft.hoverScale }}x</span>
              </div>
              <input v-model.number="draft.hoverScale" type="range" min="1" max="2.5" step="0.1" class="editor-range" />
            </div>

            <div class="space-y-3">
              <span class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Icon Style</span>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="iconDef in HOTSPOT_ICON_DEFS"
                  :key="iconDef.key"
                  @click="updateDraft({ icon: iconDef.key })"
                  class="flex flex-col items-center gap-2 py-3 rounded-2xl transition-all"
                  :class="effectiveIcon === iconDef.key ? 'bg-white/10 ring-1 ring-white/20 shadow-lg shadow-blue-900/10' : 'bg-black/10 hover:bg-white/[0.04]'"
                >
                  <div class="w-8 h-8 rounded-full flex items-center justify-center border border-white/5" :class="effectiveIcon === iconDef.key ? 'bg-blue-600 border-white/20' : 'bg-white/5'">
                    <span class="w-4 h-4 text-white [&_svg]:w-full [&_svg]:h-full" v-html="iconDef.svg" />
                  </div>
                  <span class="text-[8px] font-bold text-white/30 uppercase tracking-tight">{{ iconDef.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- TAB: SPATIAL -->
          <div v-else-if="activeTab === 'spatial'" class="space-y-5">
            <div v-if="['video', 'youtube'].includes(draft.type)" class="space-y-4">
              <div class="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20">
                <h3 class="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">3D Surface Mapping</h3>
                <p class="text-[10px] text-blue-200/60 leading-relaxed mb-4">
                  By default, videos float. Mapping allows you to "pin" them to a wall, TV screen, or floor.
                </p>
                <div class="flex gap-2">
                  <button @click="$emit('start-tracing')" class="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all">
                    {{ draft.corners?.length === 4 ? 'Re-Trace Surface' : 'Start Tracing' }}
                  </button>
                  <button v-if="draft.corners?.length === 4" @click="updateDraft({ corners: undefined })" class="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-rose-400 hover:bg-rose-500/10 transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
              
              <div class="flex items-center justify-between px-1">
                <span class="text-[10px] font-black uppercase tracking-widest text-white/30">Current State</span>
                <span :class="draft.corners?.length === 4 ? 'text-emerald-400' : 'text-blue-400'" class="text-[10px] font-black uppercase tracking-widest">
                  {{ draft.corners?.length === 4 ? 'Mapped to 3D' : 'Floating 2D' }}
                </span>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-12 text-center opacity-30">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
               <p class="text-[10px] font-black uppercase tracking-widest">Only for Video layers</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-4 border-t border-white/10">
          <button
            @click="$emit('save')"
            :disabled="saving"
            class="flex-1 h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl shadow-blue-900/20 active:scale-95"
          >
            <span v-if="saving" class="hs-edit-panel__spin" />
            <span v-else>Apply Changes</span>
          </button>
          <button
            @click="$emit('delete')"
            :disabled="deleting"
            class="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.panel-slide-enter-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.panel-slide-leave-active { transition: all 0.25s ease-in; }

/* Mobile: slide up from bottom */
.panel-slide-enter-from { opacity: 0; transform: translateY(40px); }
.panel-slide-leave-to   { opacity: 0; transform: translateY(40px); }

/* Desktop: slide from right */
@media (min-width: 640px) {
  .panel-slide-enter-from { opacity: 0; transform: translate(40px, -50%); }
  .panel-slide-leave-to   { opacity: 0; transform: translate(40px, -50%); }
}

.editor-input {
  width: 100%;
  padding: 0 16px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s;
}
.editor-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(59, 130, 246, 0.5);
}

.editor-range {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  appearance: none;
  cursor: pointer;
}
.editor-range::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: #3b82f6;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

.hs-edit-panel__spin {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
