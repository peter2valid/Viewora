<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { EditorHotspot } from '../mappers'
import { HOTSPOT_ICON_DEFS, HOTSPOT_ICONS_BY_KEY, ICON_GROUPS, TYPE_DEFAULT_ICON } from '~/shared/utils/hotspotIcons'

const props = defineProps<{
  visible: boolean
  hotspots: EditorHotspot[]
  selectedId: string | null
  draft: {
    label: string
    description: string
    url: string
    targetSceneId: string
    type: 'info' | 'url' | 'scene_link' | 'video' | 'youtube'
    icon: string
    scale: number
    hoverScale: number
    corners?: Array<{ yaw: number; pitch: number }>
  }
  otherScenes: Array<{ id: string; label: string }>
  saving: boolean
  deleting: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', id: string | null): void
  (e: 'update-draft', patch: Partial<typeof props.draft>): void
  (e: 'save'): void
  (e: 'delete'): void
  (e: 'start-tracing'): void
}>()

// User-facing type info
const USER_TYPES: Record<string, { label: string; color: string }> = {
  scene_link: { label: 'Move',  color: 'tp-badge--move' },
  info:       { label: 'Info',  color: 'tp-badge--info' },
  video:      { label: 'Media', color: 'tp-badge--media' },
  youtube:    { label: 'Media', color: 'tp-badge--media' },
  url:        { label: 'Link',  color: 'tp-badge--link' },
}

const showAdvanced = ref(false)

// Reset advanced when switching hotspots
watch(() => props.selectedId, () => { showAdvanced.value = false })

const effectiveIcon = computed(() =>
  props.draft.icon || TYPE_DEFAULT_ICON[props.draft.type] || 'info-3d-light'
)

const isMediaType = computed(() => props.draft.type === 'video' || props.draft.type === 'youtube')
const isYouTube = computed(() => props.draft.type === 'youtube')

function onUrlInput(val: string) {
  const isYT = /youtu(\.be|be\.com)/.test(val)
  emit('update-draft', { url: val, type: isYT ? 'youtube' : (isMediaType.value ? 'video' : props.draft.type) })
}

function updateDraft(patch: Partial<typeof props.draft>) {
  emit('update-draft', patch)
}
</script>

<template>
  <Transition name="panel-slide">
    <aside
      v-if="visible"
      class="hs-panel editor-glass fixed z-40 flex flex-col pointer-events-auto shadow-2xl overflow-hidden
             inset-x-4 bottom-24 max-h-[75vh] rounded-[2rem]
             sm:inset-auto sm:right-5 sm:top-1/2 sm:-translate-y-1/2 sm:w-[300px] sm:max-h-[88vh] sm:rounded-3xl"
    >

      <!-- ── Header ── -->
      <div class="hs-header">
        <div>
          <h2 class="hs-title">{{ selectedId ? 'Edit Hotspot' : 'Hotspots' }}</h2>
          <p class="hs-subtitle">{{ selectedId ? 'Changes preview live' : `${hotspots.length} on this scene` }}</p>
        </div>
        <button class="hs-close" @click="$emit('close')" aria-label="Close panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- ══════════════════════════════════
           LIST VIEW (no hotspot selected)
      ══════════════════════════════════ -->
      <div v-if="!selectedId" class="hs-list custom-scrollbar">
        <div v-if="hotspots.length === 0" class="hs-empty">
          <div class="hs-empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p class="hs-empty-title">No hotspots yet</p>
          <p class="hs-empty-hint">Click the hotspot tool, pick a type, then click on the scene to place one.</p>
        </div>

        <button
          v-for="hs in hotspots"
          :key="hs.id"
          class="hs-item"
          @click="$emit('select', hs.id)"
        >
          <div class="hs-item-icon">
            <img
              :src="HOTSPOT_ICONS_BY_KEY[hs.icon || TYPE_DEFAULT_ICON[hs.type] || 'info-3d-light']"
              class="w-full h-full object-contain"
              draggable="false"
              alt=""
            />
          </div>
          <div class="hs-item-body">
            <p class="hs-item-label">{{ hs.label || 'Unnamed hotspot' }}</p>
            <p class="hs-item-type">{{ USER_TYPES[hs.type]?.label ?? hs.type }}</p>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="hs-item-arrow">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <!-- ══════════════════════════════════
           EDIT VIEW (hotspot selected)
      ══════════════════════════════════ -->
      <template v-else>
        <!-- Back -->
        <button class="hs-back" @click="$emit('select', null)">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="hs-back-arrow">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          All hotspots
        </button>

        <!-- Scrollable body -->
        <div class="hs-edit-scroll custom-scrollbar">

          <!-- ── TYPE (read-only) ── -->
          <div class="hs-section">
            <span class="hs-section-title">Type</span>
            <span class="hs-type-badge" :class="USER_TYPES[draft.type]?.color">
              {{ USER_TYPES[draft.type]?.label ?? draft.type }}
            </span>
          </div>

          <div class="hs-divider" />

          <!-- ── CONTENT ── -->
          <div class="hs-section hs-section--gap">
            <span class="hs-section-title">Content</span>

            <!-- Label (all types) -->
            <div class="hs-field">
              <label class="hs-field-label">Label</label>
              <input
                class="hs-input"
                :value="draft.label"
                placeholder="e.g. Living Room"
                maxlength="80"
                @input="updateDraft({ label: ($event.target as HTMLInputElement).value })"
              />
            </div>

            <!-- Info: description -->
            <div v-if="draft.type === 'info'" class="hs-field">
              <label class="hs-field-label">Description</label>
              <textarea
                class="hs-input hs-input--textarea"
                :value="draft.description"
                placeholder="Add a description…"
                rows="4"
                @input="updateDraft({ description: ($event.target as HTMLTextAreaElement).value })"
              />
            </div>

            <!-- Scene link: destination -->
            <div v-if="draft.type === 'scene_link'" class="hs-field">
              <label class="hs-field-label">Destination</label>
              <div v-if="otherScenes.length === 0" class="hs-hint-box">
                Add another scene to enable navigation hotspots.
              </div>
              <select
                v-else
                class="hs-input hs-input--select"
                :value="draft.targetSceneId"
                @change="updateDraft({ targetSceneId: ($event.target as HTMLSelectElement).value })"
              >
                <option value="">Select destination…</option>
                <option v-for="s in otherScenes" :key="s.id" :value="s.id">{{ s.label }}</option>
              </select>
            </div>

            <!-- Media: URL -->
            <div v-if="isMediaType" class="hs-field">
              <label class="hs-field-label">
                Video URL
                <span v-if="isYouTube" class="hs-yt-tag">YouTube</span>
              </label>
              <input
                class="hs-input"
                :value="draft.url"
                placeholder="Paste YouTube or video URL…"
                @input="onUrlInput(($event.target as HTMLInputElement).value)"
              />
            </div>

            <!-- Link: URL + shortcuts -->
            <div v-if="draft.type === 'url'" class="hs-field">
              <label class="hs-field-label">Link URL</label>
              <input
                class="hs-input"
                :value="draft.url"
                type="url"
                placeholder="https://…"
                @input="updateDraft({ url: ($event.target as HTMLInputElement).value })"
              />
              <div class="hs-shortcuts">
                <button class="hs-shortcut" @click="updateDraft({ url: 'https://wa.me/' })">WhatsApp</button>
                <button class="hs-shortcut" @click="updateDraft({ url: 'tel:' })">Call</button>
                <button class="hs-shortcut" @click="updateDraft({ url: 'mailto:' })">Email</button>
              </div>
            </div>
          </div>

          <div class="hs-divider" />

          <!-- ── APPEARANCE ── -->
          <div class="hs-section hs-section--gap">
            <span class="hs-section-title">Appearance</span>

            <!-- Icon grid -->
            <div class="hs-field">
              <label class="hs-field-label">Icon</label>
              <div class="hs-icon-groups">
                <div v-for="group in ICON_GROUPS" :key="group.key" class="hs-icon-group">
                  <span class="hs-icon-group-label">{{ group.label }}</span>
                  <div class="hs-icon-grid">
                    <button
                      v-for="iconDef in HOTSPOT_ICON_DEFS.filter(d => d.group === group.key)"
                      :key="iconDef.key"
                      :title="iconDef.label"
                      class="hs-icon-btn"
                      :class="effectiveIcon === iconDef.key ? 'hs-icon-btn--active' : ''"
                      @click="updateDraft({ icon: iconDef.key })"
                    >
                      <img :src="iconDef.url" class="w-full h-full object-contain" draggable="false" :alt="iconDef.label" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Size slider -->
            <div class="hs-field">
              <div class="hs-slider-header">
                <label class="hs-field-label">Size</label>
                <span class="hs-slider-val">{{ Math.round(draft.scale * 100) }}%</span>
              </div>
              <input
                class="hs-range"
                type="range"
                :value="draft.scale"
                min="0.5" max="2.5" step="0.05"
                @input="updateDraft({ scale: Number(($event.target as HTMLInputElement).value) })"
              />
            </div>

            <!-- Hover scale slider -->
            <div class="hs-field">
              <div class="hs-slider-header">
                <label class="hs-field-label">Hover zoom</label>
                <span class="hs-slider-val">{{ draft.hoverScale }}×</span>
              </div>
              <input
                class="hs-range"
                type="range"
                :value="draft.hoverScale"
                min="1" max="2.5" step="0.1"
                @input="updateDraft({ hoverScale: Number(($event.target as HTMLInputElement).value) })"
              />
            </div>
          </div>

          <!-- ── ADVANCED (collapsed) ── -->
          <div class="hs-divider" />
          <div class="hs-section">
            <button class="hs-advanced-toggle" @click="showAdvanced = !showAdvanced">
              <span class="hs-section-title">Advanced</span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                :style="{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>

          <Transition name="adv">
            <div v-if="showAdvanced" class="hs-section hs-section--gap">
              <!-- 3D Spatial Mapping (video only) -->
              <template v-if="isMediaType">
                <div class="hs-spatial-box">
                  <p class="hs-spatial-title">3D Surface Mapping</p>
                  <p class="hs-spatial-hint">Pin the video to a wall, screen, or floor by tracing its 4 corners.</p>
                  <div class="hs-spatial-actions">
                    <button class="hs-btn-trace" @click="$emit('start-tracing')">
                      {{ draft.corners?.length === 4 ? 'Re-trace surface' : 'Trace surface' }}
                    </button>
                    <button
                      v-if="draft.corners?.length === 4"
                      class="hs-btn-clear-trace"
                      @click="updateDraft({ corners: undefined })"
                      aria-label="Remove surface mapping"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  <span class="hs-spatial-status" :class="draft.corners?.length === 4 ? 'hs-spatial-status--mapped' : ''">
                    {{ draft.corners?.length === 4 ? 'Mapped to 3D surface' : 'Floating (no surface)' }}
                  </span>
                </div>
              </template>
              <p v-else class="hs-advanced-empty">
                Advanced options like 3D mapping are only available for Media hotspots.
              </p>
            </div>
          </Transition>

          <!-- Bottom padding -->
          <div class="h-4" />
        </div>

        <!-- ── Footer ── -->
        <div class="hs-footer">
          <button
            class="hs-btn-save"
            :disabled="saving"
            @click="$emit('save')"
          >
            <span v-if="saving" class="hs-save-spin" />
            <span v-else>Apply Changes</span>
          </button>
          <button
            class="hs-btn-delete"
            :disabled="deleting"
            @click="$emit('delete')"
            aria-label="Delete hotspot"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </template>

    </aside>
  </Transition>
</template>

<style scoped>
/* ── Shell ── */
.hs-panel {
  display: flex;
  flex-direction: column;
  background: rgba(10, 12, 20, 0.94);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
}

/* ── Header ── */
.hs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 14px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.hs-title {
  font-size: 13px;
  font-weight: 800;
  color: rgba(255,255,255,0.92);
  letter-spacing: -0.01em;
}
.hs-subtitle {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 2px;
}
.hs-close {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 140ms, background 140ms;
  flex-shrink: 0;
}
.hs-close:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.08); }

/* ── List ── */
.hs-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}
.hs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  text-align: center;
  gap: 10px;
}
.hs-empty-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1.5px dashed rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.25);
}
.hs-empty-title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.5); }
.hs-empty-hint  { font-size: 11px; color: rgba(255,255,255,0.25); line-height: 1.5; }

.hs-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 130ms;
}
.hs-item:hover { background: rgba(255,255,255,0.05); }
.hs-item-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255,255,255,0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  flex-shrink: 0;
}
.hs-item-body { flex: 1; min-width: 0; }
.hs-item-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hs-item-type {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255,255,255,0.3);
  margin-top: 2px;
}
.hs-item-arrow { color: rgba(255,255,255,0.2); flex-shrink: 0; }

/* ── Back button ── */
.hs-back {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 18px 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255,255,255,0.35);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  transition: color 130ms;
  flex-shrink: 0;
}
.hs-back:hover { color: rgba(255,255,255,0.7); }
.hs-back-arrow { transition: transform 130ms; }
.hs-back:hover .hs-back-arrow { transform: translateX(-2px); }

/* ── Edit scroll ── */
.hs-edit-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* ── Sections ── */
.hs-section {
  padding: 14px 18px;
}
.hs-section--gap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.hs-section-title {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.3);
}
.hs-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 0; }

/* Type badge */
.hs-type-badge {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 10px;
  border-radius: 8px;
}
.tp-badge--move  { background: rgba(99,102,241,0.15); color: #818cf8; }
.tp-badge--info  { background: rgba(59,130,246,0.15); color: #60a5fa; }
.tp-badge--media { background: rgba(239,68,68,0.15);  color: #f87171; }
.tp-badge--link  { background: rgba(16,185,129,0.15); color: #34d399; }

/* ── Fields ── */
.hs-field { display: flex; flex-direction: column; gap: 6px; }
.hs-field-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.35);
  display: flex;
  align-items: center;
  gap: 6px;
}
.hs-yt-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(239,68,68,0.15);
  color: #f87171;
  text-transform: none;
}

.hs-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms, background 150ms;
  font-family: inherit;
}
.hs-input:focus {
  border-color: rgba(99,102,241,0.5);
  background: rgba(255,255,255,0.08);
}
.hs-input--textarea {
  height: auto;
  padding: 10px 12px;
  resize: none;
  line-height: 1.55;
}
.hs-input--select { appearance: none; cursor: pointer; }

.hs-hint-box {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px dashed rgba(255,255,255,0.1);
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  line-height: 1.5;
}

.hs-shortcuts {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.hs-shortcut {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.45);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.hs-shortcut:hover { background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.8); }

/* ── Icon grid ── */
.hs-icon-groups { display: flex; flex-direction: column; gap: 10px; }
.hs-icon-group-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255,255,255,0.2);
  margin-bottom: 4px;
}
.hs-icon-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
}
.hs-icon-btn {
  aspect-ratio: 1;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid transparent;
  padding: 6px;
  cursor: pointer;
  transition: background 130ms, border-color 130ms, transform 100ms;
}
.hs-icon-btn:hover { background: rgba(255,255,255,0.08); transform: scale(1.06); }
.hs-icon-btn--active {
  background: rgba(255,255,255,0.10);
  border-color: rgba(99,102,241,0.5);
  box-shadow: 0 0 0 2px rgba(99,102,241,0.15);
}

/* ── Sliders ── */
.hs-slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hs-slider-val {
  font-size: 11px;
  font-weight: 700;
  color: #818cf8;
}
.hs-range {
  width: 100%;
  height: 5px;
  appearance: none;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  cursor: pointer;
}
.hs-range::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #6366f1;
  border-radius: 50%;
  border: 2.5px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

/* ── Advanced ── */
.hs-advanced-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}
.hs-advanced-empty {
  font-size: 11px;
  color: rgba(255,255,255,0.25);
  line-height: 1.5;
}

/* Spatial mapping */
.hs-spatial-box {
  padding: 14px;
  border-radius: 14px;
  background: rgba(59,130,246,0.07);
  border: 1px solid rgba(59,130,246,0.18);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hs-spatial-title { font-size: 11px; font-weight: 800; color: rgba(59,130,246,0.9); text-transform: uppercase; letter-spacing: 0.06em; }
.hs-spatial-hint  { font-size: 11px; color: rgba(255,255,255,0.45); line-height: 1.5; }
.hs-spatial-actions { display: flex; gap: 8px; }
.hs-btn-trace {
  flex: 1;
  height: 34px;
  border-radius: 10px;
  background: #3b82f6;
  border: none;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 140ms;
}
.hs-btn-trace:hover { background: #2563eb; }
.hs-btn-clear-trace {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #f87171;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 140ms;
}
.hs-btn-clear-trace:hover { background: rgba(239,68,68,0.12); }
.hs-spatial-status {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.3);
}
.hs-spatial-status--mapped { color: #34d399; }

/* ── Footer ── */
.hs-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.hs-btn-save {
  flex: 1;
  height: 42px;
  border-radius: 14px;
  background: #4f46e5;
  border: none;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 140ms, transform 100ms;
  box-shadow: 0 8px 24px rgba(79,70,229,0.3);
}
.hs-btn-save:hover { background: #4338ca; }
.hs-btn-save:active { transform: scale(0.97); }
.hs-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.hs-save-spin {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.hs-btn-delete {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(239,68,68,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 140ms, color 140ms;
}
.hs-btn-delete:hover { background: rgba(239,68,68,0.1); color: #f87171; }
.hs-btn-delete:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Transitions ── */
.panel-slide-enter-active { transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.panel-slide-leave-active { transition: all 0.22s ease-in; }
.panel-slide-enter-from   { opacity: 0; transform: translateY(36px); }
.panel-slide-leave-to     { opacity: 0; transform: translateY(36px); }

@media (min-width: 640px) {
  .panel-slide-enter-from { opacity: 0; transform: translate(28px, -50%); }
  .panel-slide-leave-to   { opacity: 0; transform: translate(28px, -50%); }
}

.adv-enter-active { transition: all 200ms ease; }
.adv-leave-active { transition: all 150ms ease; }
.adv-enter-from   { opacity: 0; transform: translateY(-6px); }
.adv-leave-to     { opacity: 0; }

/* ── Scrollbar ── */
.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.08);
  border-radius: 10px;
}
</style>
