<template>
  <Transition name="lt-slide">
    <aside v-if="visible" class="lt-bar">

      <!-- Info hotspot -->
      <div class="lt-item">
        <button
          class="lt-btn"
          :class="{ 'lt-btn--on': activePlacementType === 'info' }"
          aria-label="Add info hotspot (I)"
          @click="handleInfo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span class="lt-label">Info</span>
        </button>
        <div class="lt-tip">
          <span class="lt-tip__text">Info Hotspot</span>
          <kbd class="lt-tip__key">I</kbd>
        </div>
      </div>

      <!-- Navigation hotspot -->
      <div class="lt-item">
        <button
          class="lt-btn"
          :class="{ 'lt-btn--on': activePlacementType === 'nav' }"
          aria-label="Add navigation hotspot (N)"
          @click="handleNav"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 8 16 12 12 16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          <span class="lt-label">Navigate</span>
        </button>
        <div class="lt-tip">
          <span class="lt-tip__text">Navigation Hotspot</span>
          <kbd class="lt-tip__key">N</kbd>
        </div>
      </div>

      <div class="lt-divider"/>

      <!-- AI Auto-link -->
      <div class="lt-item">
        <button
          class="lt-btn"
          aria-label="Auto-link scenes with AI (L)"
          @click="handleAutoLink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"/>
            <path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14z"/>
            <path d="M5 18l.5 1.5L7 20l-1.5.5L5 22l-.5-1.5L3 20l1.5-.5L5 18z"/>
          </svg>
          <span class="lt-label">AI Link</span>
        </button>
        <div class="lt-tip">
          <span class="lt-tip__text">Auto-link Scenes</span>
          <kbd class="lt-tip__key">L</kbd>
        </div>
      </div>

      <div class="lt-divider"/>

      <!-- Settings -->
      <div class="lt-item">
        <button
          class="lt-btn"
          :class="{ 'lt-btn--on': settingsOpen }"
          aria-label="Tour settings (S)"
          @click="handleSettings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
          <span class="lt-label">Settings</span>
        </button>
        <div class="lt-tip">
          <span class="lt-tip__text">Tour Settings</span>
          <kbd class="lt-tip__key">S</kbd>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" class="sr-only">{{ announcement }}</div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from '#imports'
import { useEditorStore } from '~/features/editor/store/useEditorStore'

const props = defineProps<{
  activePlacementType?: 'info' | 'nav' | null
  settingsOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'place-hotspot', type: 'info' | 'nav'): void
  (e: 'open-settings'): void
  (e: 'cancel-placement'): void
  (e: 'auto-link'): void
}>()

const route = useRoute()
const store = useEditorStore()
const visible = ref(false)
const announcement = ref('')

function handleInfo() {
  if (props.activePlacementType === 'info') {
    emit('cancel-placement')
  } else {
    emit('place-hotspot', 'info')
    announcement.value = 'Info hotspot placement mode'
  }
}

function handleNav() {
  if (props.activePlacementType === 'nav') {
    emit('cancel-placement')
  } else {
    emit('place-hotspot', 'nav')
    announcement.value = 'Navigation hotspot placement mode'
  }
}

function handleSettings() {
  emit('open-settings')
}

function handleAutoLink() {
  emit('auto-link')
}

const keyMap: Record<string, () => void> = {
  i: handleInfo,
  n: handleNav,
  s: handleSettings,
  l: handleAutoLink,
}

function onKeydown(e: KeyboardEvent) {
  if (document.visibilityState !== 'visible') return
  if (route.name !== 'app-spaces-id') return
  if (store.isModalOpen) return
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const target = e.target as HTMLElement
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  ) return

  const fn = keyMap[e.key.toLowerCase()]
  if (!fn) return
  e.preventDefault()
  fn()
}

onMounted(() => {
  visible.value = true
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.lt-bar {
  position: fixed;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  background: rgba(14, 14, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  backdrop-filter: blur(20px) saturate(1.1);
  -webkit-backdrop-filter: blur(20px) saturate(1.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.lt-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 3px 4px;
}

.lt-item {
  position: relative;
}

.lt-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

@media (max-width: 768px) {
  .lt-bar {
    left: 50%;
    top: auto;
    bottom: 18px;
    transform: translateX(-50%);
    flex-direction: row;
    align-items: stretch;
    gap: 6px;
    padding: 6px;
    border-radius: 18px;
    width: calc(100vw - 24px);
    max-width: 420px;
    justify-content: space-between;
  }

  .lt-item {
    flex: 1;
  }

  .lt-btn {
    width: 100%;
    height: 44px;
    border-radius: 12px;
  }

  .lt-label,
  .lt-tip,
  .lt-btn--on::after {
    display: none;
  }

  .lt-divider {
    width: 1px;
    height: auto;
    margin: 4px 0;
  }
}

@media (max-width: 420px) {
  .lt-bar {
    gap: 4px;
    max-width: none;
  }

  .lt-btn {
    height: 42px;
  }
}
  gap: 4px;
  width: 52px;
  height: 52px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: color 140ms, background 140ms;
  padding: 0;
}

.lt-btn:hover {
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.07);
}

.lt-btn:active {
  transform: scale(0.95);
}

.lt-btn--on {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.lt-btn--on::after {
  content: '';
  position: absolute;
  right: -7px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 2px;
}

.lt-label {
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
}

/* Tooltip */
.lt-tip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 7px;
  background: rgba(14, 14, 18, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease, transform 120ms ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.lt-item:hover .lt-tip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

@media (hover: none) {
  .lt-tip { display: none; }
}

.lt-tip__text {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.lt-tip__key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  font-family: ui-monospace, monospace;
}

/* Transition */
.lt-slide-enter-active { transition: opacity 180ms ease, transform 180ms ease; }
.lt-slide-enter-from   { opacity: 0; transform: translateY(-50%) translateX(-8px); }
.lt-slide-leave-active { transition: opacity 140ms ease, transform 140ms ease; }
.lt-slide-leave-to     { opacity: 0; transform: translateY(-50%) translateX(-8px); }
</style>
