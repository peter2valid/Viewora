<template>
  <Transition name="qe">
    <div
      v-if="visible"
      class="qe-card"
      :style="posStyle"
      ref="cardEl"
    >
      <!-- Type label + close -->
      <div class="qe-header">
        <span class="qe-type-badge" :class="`qe-type-badge--${userType}`">
          {{ TYPE_LABELS[userType] }}
        </span>
        <button class="qe-close" @click="$emit('cancel')" aria-label="Cancel">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- ── MOVE ── -->
      <template v-if="userType === 'move'">
        <label class="qe-label">Where should this take visitors?</label>
        <div v-if="otherScenes.length === 0" class="qe-empty">
          Add another scene first to use navigation hotspots.
        </div>
        <select
          v-else
          class="qe-input"
          :value="draft.targetSceneId"
          @change="emit('update-draft', { targetSceneId: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">Select destination…</option>
          <option v-for="s in otherScenes" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
      </template>

      <!-- ── INFO ── -->
      <template v-else-if="userType === 'info'">
        <label class="qe-label">Label</label>
        <input
          class="qe-input"
          :value="draft.label"
          placeholder="e.g. Living Room"
          maxlength="80"
          @input="emit('update-draft', { label: ($event.target as HTMLInputElement).value })"
        />
        <label class="qe-label qe-label--mt">Description <span class="qe-optional">optional</span></label>
        <textarea
          class="qe-textarea"
          :value="draft.description"
          placeholder="Add a short description…"
          rows="3"
          @input="emit('update-draft', { description: ($event.target as HTMLTextAreaElement).value })"
        />
      </template>

      <!-- ── MEDIA ── -->
      <template v-else-if="userType === 'media'">
        <label class="qe-label">Video URL</label>
        <div class="qe-input-row">
          <input
            class="qe-input"
            :value="draft.url"
            placeholder="Paste YouTube or video URL…"
            @input="onMediaInput(($event.target as HTMLInputElement).value)"
          />
        </div>
        <div v-if="isYouTube" class="qe-detect-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z"/></svg>
          YouTube detected
        </div>
      </template>

      <!-- ── LINK ── -->
      <template v-else-if="userType === 'link'">
        <label class="qe-label">Link URL</label>
        <input
          class="qe-input"
          :value="draft.url"
          placeholder="https://…"
          @input="emit('update-draft', { url: ($event.target as HTMLInputElement).value })"
        />
        <div class="qe-shortcuts">
          <button
            v-for="sc in LINK_SHORTCUTS"
            :key="sc.label"
            class="qe-shortcut"
            @click="applyShortcut(sc.prefix)"
          >
            {{ sc.label }}
          </button>
        </div>
      </template>

      <!-- Actions -->
      <div class="qe-actions">
        <button class="qe-btn-more" @click="$emit('more')">
          Edit more
        </button>
        <button
          class="qe-btn-done"
          :disabled="saving"
          @click="$emit('done')"
        >
          <span v-if="saving" class="qe-spin" />
          <span v-else>Done</span>
          <svg v-if="!saving" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  visible: boolean
  draft: {
    label: string
    description: string
    url: string
    targetSceneId: string
    type: 'info' | 'url' | 'scene_link' | 'video' | 'youtube'
  }
  otherScenes: Array<{ id: string; label: string }>
  screenX: number
  screenY: number
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update-draft', patch: Partial<typeof props.draft>): void
  (e: 'done'): void
  (e: 'more'): void
  (e: 'cancel'): void
}>()

const cardEl = ref<HTMLElement | null>(null)
const CARD_W = 280
const CARD_H = 220

const TYPE_LABELS: Record<string, string> = {
  move: 'Move', info: 'Info', media: 'Media', link: 'Link',
}
const LINK_SHORTCUTS = [
  { label: 'WhatsApp', prefix: 'https://wa.me/' },
  { label: 'Call', prefix: 'tel:' },
  { label: 'Email', prefix: 'mailto:' },
]

const userType = computed(() => {
  const t = props.draft.type
  if (t === 'scene_link') return 'move'
  if (t === 'video' || t === 'youtube') return 'media'
  if (t === 'url') return 'link'
  return 'info'
})

const isYouTube = computed(() => props.draft.type === 'youtube')

// Smart viewport-clamped positioning
const posStyle = computed(() => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const margin = 16
  const topClear = 60

  // Default: appear below-right of hotspot
  let left = props.screenX - CARD_W / 2
  let top  = props.screenY + 44

  // Flip above if too close to bottom
  if (top + CARD_H > vh - margin) top = props.screenY - CARD_H - 44

  // Clamp
  left = Math.max(margin, Math.min(left, vw - CARD_W - margin))
  top  = Math.max(topClear + margin, Math.min(top, vh - CARD_H - margin))

  return { position: 'fixed' as const, left: `${left}px`, top: `${top}px`, width: `${CARD_W}px` }
})

function onMediaInput(val: string) {
  const isYT = /youtu(\.be|be\.com)/.test(val)
  emit('update-draft', {
    url: val,
    type: isYT ? 'youtube' : 'video',
  })
}

function applyShortcut(prefix: string) {
  if (!props.draft.url.startsWith(prefix)) {
    emit('update-draft', { url: prefix })
  }
  // Focus the input after shortcut applied
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.qe-card {
  z-index: 150;
  background: rgba(14, 16, 26, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.qe-type-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border-radius: 6px;
}
.qe-type-badge--move  { background: rgba(99,102,241,0.15); color: #818cf8; }
.qe-type-badge--info  { background: rgba(59,130,246,0.15); color: #60a5fa; }
.qe-type-badge--media { background: rgba(239,68,68,0.15);  color: #f87171; }
.qe-type-badge--link  { background: rgba(16,185,129,0.15); color: #34d399; }

.qe-close {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.3);
  transition: color 120ms, background 120ms;
}
.qe-close:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.08); }

.qe-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.35);
  display: block;
}
.qe-label--mt { margin-top: 2px; }
.qe-optional { font-weight: 500; text-transform: none; letter-spacing: 0; color: rgba(255,255,255,0.2); }

.qe-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.09);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  transition: border-color 150ms, background 150ms;
  box-sizing: border-box;
}
.qe-input:focus {
  border-color: rgba(99,102,241,0.5);
  background: rgba(255,255,255,0.08);
}

.qe-textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.09);
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

.qe-input-row { position: relative; }

.qe-detect-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  color: #f87171;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(239,68,68,0.12);
  margin-top: -4px;
}

.qe-empty {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  padding: 10px 0;
  line-height: 1.5;
}

.qe-shortcuts {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.qe-shortcut {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
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

.qe-actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.qe-btn-more {
  flex: 1;
  height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.55);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 140ms, color 140ms;
}
.qe-btn-more:hover { background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.85); }

.qe-btn-done {
  flex: 2;
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
  transition: background 140ms, transform 100ms;
}
.qe-btn-done:hover { background: #4338ca; }
.qe-btn-done:active { transform: scale(0.97); }
.qe-btn-done:disabled { opacity: 0.5; cursor: not-allowed; }

.qe-spin {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Transition */
.qe-enter-active {
  animation: qe-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.qe-leave-active {
  animation: qe-out 130ms ease-in forwards;
}
@keyframes qe-in {
  from { opacity: 0; transform: scale(0.88) translateY(6px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}
@keyframes qe-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.94); }
}
</style>
