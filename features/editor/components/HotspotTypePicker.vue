<template>
  <Teleport to="body">
    <Transition name="tp">
      <div
        v-if="visible"
        class="tp-backdrop"
        @click.self="$emit('cancel')"
        ref="backdropRef"
      >
        <div class="tp-card" role="dialog" aria-modal="true" aria-label="Add hotspot">
          <div class="tp-header">
            <p class="tp-title">What are you adding?</p>
            <button class="tp-close" @click="$emit('cancel')" aria-label="Cancel">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <p class="tp-hint">Pick a type — then click anywhere on the scene to place it</p>
          <div class="tp-grid">
            <button
              v-for="t in TYPES"
              :key="t.key"
              class="tp-type"
              @click="$emit('select', t.key)"
            >
              <div class="tp-icon-wrap" :class="`tp-icon-wrap--${t.key}`">
                <!-- Move -->
                <svg v-if="t.key === 'move'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                <!-- Info -->
                <svg v-else-if="t.key === 'info'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <!-- Media -->
                <svg v-else-if="t.key === 'media'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <!-- Link -->
                <svg v-else-if="t.key === 'link'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <span class="tp-type-name">{{ t.label }}</span>
              <span class="tp-type-desc">{{ t.desc }}</span>
            </button>
          </div>
          <p class="tp-esc">Press <kbd>Esc</kbd> to cancel</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'select', type: 'move' | 'info' | 'media' | 'link'): void
  (e: 'cancel'): void
}>()

const backdropRef = ref<HTMLElement | null>(null)

const TYPES = [
  { key: 'move' as const,  label: 'Move',  desc: 'Navigate to another scene' },
  { key: 'info' as const,  label: 'Info',  desc: 'Show a title & description' },
  { key: 'media' as const, label: 'Media', desc: 'Embed a video or audio' },
  { key: 'link' as const,  label: 'Link',  desc: 'Open a website or form' },
]

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.tp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.tp-card {
  background: rgba(14, 16, 26, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 24px;
  padding: 24px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.04);
}

.tp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.tp-title {
  font-size: 15px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: -0.01em;
}

.tp-close {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.35);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 140ms, background 140ms;
}
.tp-close:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.08); }

.tp-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 500;
  margin-bottom: 20px;
  line-height: 1.5;
}

.tp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.tp-type {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
  text-align: left;
  transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
}
.tp-type:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}
.tp-type:active { transform: scale(0.97); }

.tp-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tp-icon-wrap--move  { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
.tp-icon-wrap--info  { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.tp-icon-wrap--media { background: rgba(239, 68, 68, 0.15);  color: #f87171; }
.tp-icon-wrap--link  { background: rgba(16, 185, 129, 0.15); color: #34d399; }

.tp-type-name {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.88);
}
.tp-type-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 500;
  line-height: 1.4;
}

.tp-esc {
  font-size: 10px;
  color: rgba(255,255,255,0.2);
  text-align: center;
}
.tp-esc kbd {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.35);
}

/* Transitions */
.tp-enter-active { animation: tp-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.tp-leave-active { animation: tp-out 140ms ease-in forwards; }

@keyframes tp-in {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes tp-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}
</style>
