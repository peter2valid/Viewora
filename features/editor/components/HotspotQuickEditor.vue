<template>
  <Transition name="qe">
    <div
      v-if="visible"
      class="qe-card"
      :style="posStyle"
      ref="cardEl"
    >
      <!-- Header -->
      <div class="qe-header">
        <div class="qe-header-left">
          <span class="qe-type-badge" :class="`qe-type-badge--${userType}`">
            {{ TYPE_LABELS[userType] }}
          </span>
          <span class="qe-header-hint">{{ TYPE_HINTS[userType] }}</span>
        </div>
        <button class="qe-close" @click="$emit('cancel')" aria-label="Cancel">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="qe-body qe-scrollbar">

        <!-- ══ NAV ══ -->
        <template v-if="userType === 'nav'">
          <!-- Destination room selector with thumbnails -->
          <div class="qe-section">
            <span class="qe-section-label">Destination Room</span>
            <div v-if="otherScenes.length === 0" class="qe-empty-box">
              Add another scene first to use navigation hotspots.
            </div>
            <template v-else>
              <button class="qe-room-trigger" @click="roomDropOpen = !roomDropOpen">
                <div
                  class="qe-room-thumb"
                  :style="selectedScene?.imageUrl ? `background-image: url('${selectedScene.imageUrl}')` : ''"
                >
                  <span v-if="!selectedScene?.imageUrl" class="qe-room-thumb-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </span>
                </div>
                <span class="qe-room-name">{{ selectedScene?.label || 'Select destination…' }}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="qe-room-chevron" :style="{ transform: roomDropOpen ? 'rotate(180deg)' : '' }">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              <div v-if="roomDropOpen" class="qe-room-dropdown">
                <button
                  v-for="s in otherScenes"
                  :key="s.id"
                  class="qe-room-item"
                  :class="draft.targetSceneId === s.id ? 'qe-room-item--active' : ''"
                  @click="selectRoom(s.id)"
                >
                  <div
                    class="qe-room-item-thumb"
                    :style="s.imageUrl ? `background-image: url('${s.imageUrl}')` : ''"
                  >
                    <span v-if="!s.imageUrl" class="qe-room-item-thumb-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                    </span>
                  </div>
                  <span class="qe-room-item-name">{{ s.label }}</span>
                  <svg v-if="draft.targetSceneId === s.id" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="qe-room-check">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>
            </template>
          </div>

          <!-- Navigation icons — all 3 shown directly, no "Edit more" -->
          <div class="qe-section">
            <span class="qe-section-label">Navigation Icon</span>
            <div class="qe-nav-icons">
              <button
                v-for="icon in NAV_ICONS"
                :key="icon.key"
                class="qe-nav-icon-btn"
                :class="effectiveIcon === icon.key ? 'qe-nav-icon-btn--active' : ''"
                :title="icon.label"
                @click="emit('update-draft', { icon: icon.key })"
              >
                <img :src="icon.url" :alt="icon.label" />
                <span class="qe-nav-icon-label">{{ icon.label }}</span>
              </button>
            </div>
          </div>

          <!-- Size + Hover -->
          <div class="qe-section">
            <span class="qe-section-label">Size & Hover</span>
            <div class="qe-slider-row">
              <label class="qe-slider-label">Size</label>
              <span class="qe-slider-val">{{ Math.round(draft.scale * 100) }}%</span>
            </div>
            <input class="qe-range" type="range" :value="draft.scale" min="0.5" max="2.5" step="0.05"
              @input="emit('update-draft', { scale: Number(($event.target as HTMLInputElement).value) })" />
            <div class="qe-slider-row" style="margin-top: 8px">
              <label class="qe-slider-label">Hover zoom</label>
              <span class="qe-slider-val">{{ draft.hoverScale }}×</span>
            </div>
            <input class="qe-range" type="range" :value="draft.hoverScale" min="1" max="2.5" step="0.1"
              @input="emit('update-draft', { hoverScale: Number(($event.target as HTMLInputElement).value) })" />
          </div>
        </template>

        <!-- ══ INFO ══ -->
        <template v-else-if="userType === 'info'">
          <!-- Label -->
          <div class="qe-section">
            <span class="qe-section-label">Label</span>
            <input
              class="qe-input"
              :value="draft.label"
              placeholder="e.g. Living Room"
              maxlength="80"
              @input="emit('update-draft', { label: ($event.target as HTMLInputElement).value })"
            />
          </div>

          <!-- Description -->
          <div class="qe-section">
            <span class="qe-section-label">Description <span class="qe-optional">optional</span></span>
            <textarea
              class="qe-textarea"
              :value="draft.description"
              placeholder="Add a short description…"
              rows="2"
              @input="emit('update-draft', { description: ($event.target as HTMLTextAreaElement).value })"
            />
          </div>

          <!-- Optional link URL -->
          <div class="qe-section">
            <span class="qe-section-label">Link URL <span class="qe-optional">optional</span></span>
            <input
              class="qe-input"
              :value="draft.url"
              placeholder="https://… or tel: or mailto:"
              @input="onInfoUrlInput(($event.target as HTMLInputElement).value)"
            />
            <div class="qe-shortcuts">
              <button v-for="sc in LINK_SHORTCUTS" :key="sc.label" class="qe-shortcut" @click="applyShortcut(sc.prefix)">{{ sc.label }}</button>
            </div>
          </div>

          <!-- Icon style — all icons in a scrollable grid -->
          <div class="qe-section">
            <span class="qe-section-label">Hotspot Icon Style</span>
            <div class="qe-icon-scroll">
              <template v-for="group in ICON_GROUPS" :key="group.key">
                <span class="qe-icon-group-label">{{ group.label }}</span>
                <div class="qe-icon-row">
                  <button
                    v-for="iconDef in HOTSPOT_ICON_DEFS.filter(d => d.group === group.key)"
                    :key="iconDef.key"
                    class="qe-icon-btn"
                    :class="effectiveIcon === iconDef.key ? 'qe-icon-btn--active' : ''"
                    :title="iconDef.label"
                    @click="emit('update-draft', { icon: iconDef.key })"
                  >
                    <img :src="iconDef.url" :alt="iconDef.label" />
                  </button>
                </div>
              </template>
            </div>
          </div>

          <!-- Size + Hover -->
          <div class="qe-section">
            <span class="qe-section-label">Size & Hover</span>
            <div class="qe-slider-row">
              <label class="qe-slider-label">Size</label>
              <span class="qe-slider-val">{{ Math.round(draft.scale * 100) }}%</span>
            </div>
            <input class="qe-range" type="range" :value="draft.scale" min="0.5" max="2.5" step="0.05"
              @input="emit('update-draft', { scale: Number(($event.target as HTMLInputElement).value) })" />
            <div class="qe-slider-row" style="margin-top: 8px">
              <label class="qe-slider-label">Hover zoom</label>
              <span class="qe-slider-val">{{ draft.hoverScale }}×</span>
            </div>
            <input class="qe-range" type="range" :value="draft.hoverScale" min="1" max="2.5" step="0.1"
              @input="emit('update-draft', { hoverScale: Number(($event.target as HTMLInputElement).value) })" />
          </div>
        </template>


      </div><!-- end scrollable body -->

      <!-- Footer actions -->
      <div class="qe-footer">
        <button class="qe-btn-cancel" @click="$emit('cancel')">Cancel</button>
        <button class="qe-btn-done" :disabled="saving" @click="$emit('done')">
          <span v-if="saving" class="qe-spin" />
          <template v-else>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Save Hotspot
          </template>
        </button>
      </div>

    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { HOTSPOT_ICON_DEFS, ICON_GROUPS, TYPE_DEFAULT_ICON } from '~/shared/utils/hotspotIcons'

const NAV_ICONS = HOTSPOT_ICON_DEFS.filter(d => d.group === 'nav')

const props = defineProps<{
  visible: boolean
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
    imageUrl?: string
  }
  otherScenes: Array<{ id: string; label: string; imageUrl?: string | null }>
  screenX: number
  screenY: number
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update-draft', patch: Partial<typeof props.draft>): void
  (e: 'done'): void
  (e: 'cancel'): void
  (e: 'start-tracing'): void
}>()

const cardEl = ref<HTMLElement | null>(null)
const roomDropOpen = ref(false)
const showAdvanced = ref(false)

const CARD_W = 330

const TYPE_LABELS: Record<string, string> = {
  nav: 'Navigate', info: 'Info',
}
const TYPE_HINTS: Record<string, string> = {
  nav: 'Navigate to another scene',
  info: 'Show info + optional link',
}
const LINK_SHORTCUTS = [
  { label: 'WhatsApp', prefix: 'https://wa.me/' },
  { label: 'Call', prefix: 'tel:' },
  { label: 'Email', prefix: 'mailto:' },
]

const userType = computed(() => {
  if (props.draft.type === 'scene_link') return 'nav'
  return 'info'
})

const effectiveIcon = computed(() =>
  props.draft.icon || TYPE_DEFAULT_ICON[props.draft.type] || 'info-3d-light'
)

const selectedScene = computed(() =>
  props.otherScenes.find(s => s.id === props.draft.targetSceneId)
)

const posStyle = computed(() => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const margin = 12
  const topClear = 60
  const CARD_H = 480

  let left = props.screenX - CARD_W / 2
  let top = props.screenY + 50

  if (top + CARD_H > vh - margin) top = props.screenY - CARD_H - 50
  left = Math.max(margin, Math.min(left, vw - CARD_W - margin))
  top = Math.max(topClear + margin, Math.min(top, vh - CARD_H - margin))

  return { position: 'fixed' as const, left: `${left}px`, top: `${top}px`, width: `${CARD_W}px` }
})

function selectRoom(id: string) {
  emit('update-draft', { targetSceneId: id })
  roomDropOpen.value = false
}

function onInfoUrlInput(val: string) {
  emit('update-draft', { url: val, type: val.trim() ? 'url' : 'info' })
}

function applyShortcut(prefix: string) {
  if (!props.draft.url.startsWith(prefix)) {
    emit('update-draft', { url: prefix })
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) emit('done')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.qe-card {
  z-index: 150;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 28%, rgba(0,0,0,0.16) 100%),
    rgba(10, 12, 20, 0.40);
  backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  -webkit-backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 22px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.12),
    0 28px 70px rgba(0, 0, 0, 0.42);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow: hidden;
}

/* ── Header ── */
.qe-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
  gap: 8px;
}
.qe-header-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.qe-type-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  padding: 3px 9px;
  border-radius: 7px;
  display: inline-block;
  width: fit-content;
}
.qe-type-badge--nav  { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
.qe-type-badge--info { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }

.qe-header-hint {
  font-size: 10px;
  color: rgba(255,255,255,0.25);
  font-weight: 500;
}

.qe-close {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.3);
  transition: color 120ms, background 120ms;
  flex-shrink: 0;
  margin-top: 1px;
}
.qe-close:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.08); }

/* ── Scrollable body ── */
.qe-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.qe-scrollbar::-webkit-scrollbar { width: 3px; }
.qe-scrollbar::-webkit-scrollbar-track { background: transparent; }
.qe-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }

/* ── Sections ── */
.qe-section {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.qe-section:last-child { border-bottom: none; }
.qe-section-label {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  gap: 5px;
}
.qe-optional { font-weight: 500; text-transform: none; letter-spacing: 0; color: rgba(255,255,255,0.18); }

/* ── Inputs ── */
.qe-input {
  width: 100%;
  height: 36px;
  padding: 0 11px;
  border-radius: 10px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  outline: none;
  transition: border-color 150ms, background 150ms;
  box-sizing: border-box;
  font-family: inherit;
}
.qe-input:focus { border-color: rgba(99,102,241,0.55); background: rgba(255,255,255,0.11); }

.qe-textarea {
  width: 100%;
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
  transition: border-color 150ms;
}
.qe-textarea:focus { border-color: rgba(99,102,241,0.5); }

/* ── Image field ── */
.qe-image-field { display: flex; flex-direction: column; gap: 6px; }
.qe-image-preview {
  width: 100%;
  height: 70px;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  background-color: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
}

/* ── Empty state ── */
.qe-empty-box {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px dashed rgba(255,255,255,0.12);
  line-height: 1.5;
}

/* ── Room picker ── */
.qe-room-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px 7px 7px;
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  cursor: pointer;
  transition: background 130ms, border-color 130ms;
  text-align: left;
}
.qe-room-trigger:hover { background: rgba(255,255,255,0.11); border-color: rgba(255,255,255,0.18); }

.qe-room-thumb {
  width: 54px;
  height: 36px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-color: rgba(255,255,255,0.06);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.qe-room-thumb-icon { color: rgba(255,255,255,0.2); }

.qe-room-name {
  flex: 1;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.qe-room-chevron {
  color: rgba(255,255,255,0.3);
  flex-shrink: 0;
  transition: transform 180ms;
}

.qe-room-dropdown {
  border-radius: 12px;
  background: rgba(12, 14, 22, 0.48);
  backdrop-filter: blur(26px);
  -webkit-backdrop-filter: blur(26px);
  border: 1px solid rgba(255,255,255,0.12);
  overflow: hidden;
  margin-top: -2px;
}
.qe-room-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px 7px 7px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 120ms;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.qe-room-item:last-child { border-bottom: none; }
.qe-room-item:hover { background: rgba(255,255,255,0.05); }
.qe-room-item--active { background: rgba(99,102,241,0.08); }

.qe-room-item-thumb {
  width: 50px;
  height: 34px;
  border-radius: 7px;
  background-size: cover;
  background-position: center;
  background-color: rgba(255,255,255,0.06);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qe-room-item-thumb-icon { color: rgba(255,255,255,0.2); }
.qe-room-item-name {
  flex: 1;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.qe-room-check { color: #818cf8; flex-shrink: 0; }

/* ── Navigation icons (Move type) ── */
.qe-nav-icons {
  display: flex;
  gap: 6px;
}
.qe-nav-icon-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px 6px;
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: background 130ms, border-color 130ms, transform 100ms;
}
.qe-nav-icon-btn:hover { background: rgba(255,255,255,0.12); transform: scale(1.04); }
.qe-nav-icon-btn--active {
  background: rgba(99,102,241,0.12);
  border-color: rgba(99,102,241,0.5);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}
.qe-nav-icon-btn img { width: 36px; height: 36px; object-fit: contain; }
.qe-nav-icon-label {
  font-size: 9px;
  font-weight: 700;
  color: rgba(255,255,255,0.4);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.qe-nav-icon-btn--active .qe-nav-icon-label { color: #818cf8; }

/* ── Icon grid (Info / Link types) ── */
.qe-icon-scroll {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.qe-icon-group-label {
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.2);
  margin-top: 3px;
}
.qe-icon-row {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.qe-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 1.5px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  transition: background 120ms, border-color 120ms, transform 100ms;
}
.qe-icon-btn:hover { background: rgba(255,255,255,0.12); transform: scale(1.07); }
.qe-icon-btn--active {
  background: rgba(99,102,241,0.12);
  border-color: rgba(99,102,241,0.55);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}
.qe-icon-btn img { width: 100%; height: 100%; object-fit: contain; }

/* ── Sliders ── */
.qe-slider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.qe-slider-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.4);
}
.qe-slider-val {
  font-size: 11px;
  font-weight: 700;
  color: #818cf8;
}
.qe-range {
  width: 100%;
  height: 4px;
  appearance: none;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  cursor: pointer;
  margin-top: 2px;
}
.qe-range::-webkit-slider-thumb {
  appearance: none;
  width: 15px;
  height: 15px;
  background: #6366f1;
  border-radius: 50%;
  border: 2.5px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

/* ── Link shortcuts ── */
.qe-shortcuts { display: flex; gap: 5px; flex-wrap: wrap; }
.qe-shortcut {
  padding: 4px 9px;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.qe-shortcut:hover { background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.85); }

/* ── YouTube badge ── */
.qe-youtube-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 800;
  color: #f87171;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(239,68,68,0.12);
  text-transform: none;
  letter-spacing: 0;
}

/* ── Advanced / Spatial ── */
.qe-adv-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  color: inherit;
}
.qe-spatial-box {
  padding: 12px;
  border-radius: 12px;
  background: rgba(59,130,246,0.07);
  border: 1px solid rgba(59,130,246,0.18);
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 4px;
}
.qe-spatial-title { font-size: 10px; font-weight: 800; color: rgba(59,130,246,0.9); text-transform: uppercase; letter-spacing: 0.06em; }
.qe-spatial-hint  { font-size: 10px; color: rgba(255,255,255,0.4); line-height: 1.5; }
.qe-spatial-row { display: flex; gap: 6px; }
.qe-btn-trace {
  flex: 1;
  height: 32px;
  border-radius: 9px;
  background: #3b82f6;
  border: none;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 130ms;
}
.qe-btn-trace:hover { background: #2563eb; }
.qe-btn-clear-trace {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #f87171;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.qe-btn-clear-trace:hover { background: rgba(239,68,68,0.12); }
.qe-spatial-status { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.25); }
.qe-spatial-status--ok { color: #34d399; }

/* ── Footer actions ── */
.qe-footer {
  display: flex;
  gap: 7px;
  padding: 11px 14px;
  border-top: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.qe-btn-cancel {
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 130ms, color 130ms;
  font-family: inherit;
}
.qe-btn-cancel:hover { background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.8); }

.qe-btn-done {
  flex: 1;
  height: 36px;
  border-radius: 10px;
  background: #4f46e5;
  border: none;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 130ms, transform 100ms;
  box-shadow: 0 6px 20px rgba(79,70,229,0.3);
  font-family: inherit;
}
.qe-btn-done:hover { background: #4338ca; }
.qe-btn-done:active { transform: scale(0.97); }
.qe-btn-done:disabled { opacity: 0.5; cursor: not-allowed; }

.qe-spin {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: qe-spin 0.6s linear infinite;
  display: inline-block;
}
@keyframes qe-spin { to { transform: rotate(360deg); } }

/* ── Transition ── */
.qe-enter-active { animation: qe-in 220ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.qe-leave-active { animation: qe-out 140ms ease-in forwards; }
@keyframes qe-in {
  from { opacity: 0; transform: scale(0.87) translateY(8px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}
@keyframes qe-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.93); }
}

/* ── Advanced section transition ── */
.adv-enter-active { transition: all 200ms ease; }
.adv-leave-active { transition: all 140ms ease; }
.adv-enter-from   { opacity: 0; transform: translateY(-5px); }
.adv-leave-to     { opacity: 0; }
</style>
