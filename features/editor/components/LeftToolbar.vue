<template>
  <Transition name="editor-panel--left">
    <aside
      v-if="visible"
      class="editor-glass fixed left-5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1 p-2 rounded-2xl pointer-events-auto max-h-[calc(100vh-2rem)] overflow-y-auto"
    >
      <div
        v-for="tool in tools"
        :key="tool.mode"
        class="relative group"
      >
        <button
          :ref="(el) => { buttonRefs.value[tool.mode] = el as HTMLButtonElement }"
          @click="store.setMode(tool.mode)"
          :aria-label="tool.label"
          :aria-pressed="store.mode === tool.mode"
          class="flex items-center justify-center w-11 h-11 rounded-xl hover:scale-[1.03] active:scale-[0.96] transition-all duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          :class="[
            store.mode === tool.mode
              ? 'bg-blue-600 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.5)]'
              : 'text-gray-400 hover:text-gray-100 hover:bg-white/[0.08]',
            flashedMode === tool.mode ? 'tool-flash' : ''
          ]"
        >
          <!-- View (cursor) -->
          <svg v-if="tool.mode === 'view'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m5 3 14 9-7 1-4 7z"/>
          </svg>

          <!-- Hotspot (map pin) -->
          <svg v-else-if="tool.mode === 'hotspot'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>

          <!-- Settings (sliders) -->
          <svg v-else-if="tool.mode === 'settings'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="4" y1="21" x2="4" y2="14"/>
            <line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/>
            <line x1="20" y1="12" x2="20" y2="3"/>
            <line x1="1" y1="14" x2="7" y2="14"/>
            <line x1="9" y1="8" x2="15" y2="8"/>
            <line x1="17" y1="16" x2="23" y2="16"/>
          </svg>
        </button>

        <!-- Active indicator -->
        <span
          v-if="store.mode === tool.mode"
          class="absolute -right-[5px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-blue-400 pointer-events-none"
        ></span>

        <!-- Tooltip (right side, desktop only — hidden on touch devices via CSS) -->
        <div class="tooltip" role="tooltip">
          <span class="tooltip__label">{{ tool.label }}</span>
          <kbd class="tooltip__key">{{ tool.key }}</kbd>
        </div>
      </div>

      <!-- Screen reader announcement region: announces mode changes from keyboard shortcuts -->
      <div aria-live="polite" aria-atomic="true" class="sr-only">{{ modeAnnouncement }}</div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from '#imports'
import { useEditorStore } from '~/features/editor/store/useEditorStore'
import type { EditorMode } from '~/features/editor/store/useEditorStore'

const route = useRoute()
const store = useEditorStore()
const visible = ref(false)
const flashedMode = ref<EditorMode | null>(null)
const buttonRefs = ref<Record<string, HTMLButtonElement | null>>({})
const modeAnnouncement = ref('')

const tools: { mode: EditorMode; label: string; key: string }[] = [
  { mode: 'view',     label: 'View',        key: 'V' },
  { mode: 'hotspot',  label: 'Add Hotspot', key: 'H' },
  { mode: 'settings', label: 'Settings',    key: 'S' },
]

const modeLabels: Record<EditorMode, string> = {
  view:     'View mode',
  hotspot:  'Hotspot placement mode',
  settings: 'Settings',
}

const keyMap: Record<string, EditorMode> = { v: 'view', h: 'hotspot', s: 'settings' }
let flashTimer: ReturnType<typeof setTimeout> | null = null

// Announce mode changes to screen readers (keyboard and click alike).
watch(() => store.mode, (mode) => {
  modeAnnouncement.value = modeLabels[mode]
})

function onKeydown(e: KeyboardEvent) {
  // Tab visibility — shortcuts must not fire when the page is hidden
  if (document.visibilityState !== 'visible') return
  // Route scope — only active on the editor page (Nuxt file-based name: app-spaces-id)
  if (route.name !== 'app-spaces-id') return
  // Modal guard — reactive, no DOM query
  if (store.isModalOpen) return
  // Modifier keys — do not intercept OS/browser shortcuts
  if (e.metaKey || e.ctrlKey || e.altKey) return
  // Text input guard — tagName + contenteditable covers all editable contexts
  const target = e.target as HTMLElement
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  ) return
  const next = keyMap[e.key.toLowerCase()]
  if (!next) return
  store.setMode(next)
  if (flashTimer) clearTimeout(flashTimer)
  flashedMode.value = next
  flashTimer = setTimeout(() => { flashedMode.value = null }, 120)
  nextTick(() => { buttonRefs.value[next]?.focus() })
}

onMounted(() => {
  visible.value = true
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (flashTimer) clearTimeout(flashTimer)
})
</script>

<style scoped>
/* Unified panel mount — left toolbar also floats up, not in from the side */
.editor-panel--left-enter-active  { transition: opacity 180ms ease, transform 180ms ease; }
/* Preserve -translate-y-1/2 centering while floating up 6px */
.editor-panel--left-enter-from    { opacity: 0; transform: translateY(calc(-50% + 6px)); }
.editor-panel--left-leave-active  { transition: opacity 140ms ease, transform 140ms ease; }
.editor-panel--left-leave-to      { opacity: 0; transform: translateY(calc(-50% + 6px)); }

/* Keyboard shortcut flash — micro press effect */
.tool-flash {
  animation: tool-flash 120ms ease forwards;
}

@keyframes tool-flash {
  0%   { transform: scale(1); }
  40%  { transform: scale(0.88); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

/* Tooltip — right side of pill */
.tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 8px;
  background: rgba(10, 12, 20, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.10);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease, transform 120ms ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.group:hover .tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* Hide tooltip on touch devices — no hover available */
@media (hover: none) {
  .tooltip { display: none; }
}

.tooltip__label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.tooltip__key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  font-family: ui-monospace, monospace;
}
</style>
