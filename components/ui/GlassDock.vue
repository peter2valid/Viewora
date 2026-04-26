<template>
  <Transition name="glass-dock">
    <div
      v-if="visible && (items.length || showAdd)"
      ref="dockEl"
      class="glass-dock pointer-events-auto fixed left-1/2 -translate-x-1/2 z-30"
      :class="[glassClass, paddedClass, isSoloAdd ? 'glass-dock--solo' : '']"
      :style="{
        bottom: `${bottomPx}px`,
        maxWidth: `calc(100vw - ${edgeInsetPx * 2}px)`,
      }"
      role="navigation"
      aria-label="Scene navigation"
    >
      <div v-if="items.length" class="glass-dock__strip" :style="{ maxWidth: `min(${maxStripVw}vw, ${maxStripPx}px)` }">
        <button
          v-for="item in items"
          :key="item.id"
          class="glass-dock__item"
          data-dock-item="true"
          :class="item.id === activeId ? 'glass-dock__item--active' : ''"
          :aria-current="item.id === activeId ? 'true' : 'false'"
          :aria-label="item.ariaLabel || item.label"
          @click="emit('select', item.id)"
        >
          <span class="glass-dock__thumb">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.label"
              class="glass-dock__thumbImg"
              draggable="false"
            />
            <span v-else class="glass-dock__thumbFallback" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </span>
          </span>

          <span class="glass-dock__label" :title="item.label">
            {{ item.label }}
          </span>

          <span v-if="item.badge === 'loading'" class="glass-dock__badge" aria-hidden="true" />
        </button>
        <button
          v-if="showAdd"
          class="glass-dock__item glass-dock__item--add"
          data-dock-item="true"
          :disabled="addDisabled"
          aria-label="Add scene"
          @click="emit('add')"
        >
          <span class="glass-dock__thumb glass-dock__thumb--dashed">
            <svg
              v-if="!addDisabled"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="glass-dock__addIcon"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span v-else class="glass-dock__spinner" aria-hidden="true" />
          </span>
          <span class="glass-dock__label">{{ addDisabled ? 'Adding…' : 'Add scene' }}</span>
        </button>
      </div>

      <button
        v-else-if="showAdd"
        class="glass-dock__soloAdd"
        :disabled="addDisabled"
        aria-label="Add scene"
        @click="emit('add')"
      >
        <span class="glass-dock__soloThumb">
          <svg
            v-if="!addDisabled"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="glass-dock__addIcon"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span v-else class="glass-dock__spinner" aria-hidden="true" />
        </span>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type DockItem = {
  id: string
  label: string
  imageUrl?: string | null
  ariaLabel?: string
  badge?: 'loading' | null
}

const props = withDefaults(defineProps<{
  items: DockItem[]
  activeId?: string
  showAdd?: boolean
  addDisabled?: boolean
  glassClass?: string
  bottomPx?: number
  edgeInsetPx?: number
  maxStripVw?: number
  maxStripPx?: number
  maxScale?: number
  sigmaPx?: number
  liftPx?: number
}>(), {
  activeId: '',
  showAdd: false,
  addDisabled: false,
  glassClass: 'dock-glass',
  bottomPx: 20,
  edgeInsetPx: 20,
  maxStripVw: 74,
  maxStripPx: 820,
  maxScale: 1.55,
  sigmaPx: 86,
  liftPx: 12,
})

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'add'): void
}>()

const visible = ref(false)
onMounted(() => { visible.value = true })

const dockEl = ref<HTMLElement | null>(null)

const paddedClass = computed(() => 'glass-dock--padded')
const isSoloAdd = computed(() => props.showAdd && props.items.length === 0)
</script>

<style scoped>
.glass-dock-enter-active { transition: opacity 180ms ease, transform 180ms ease; }
.glass-dock-enter-from   { opacity: 0; transform: translate(-50%, 8px); }
.glass-dock-leave-active { transition: opacity 140ms ease, transform 140ms ease; }
.glass-dock-leave-to     { opacity: 0; transform: translate(-50%, 8px); }

.glass-dock {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 18px;
}

.glass-dock--padded {
  padding: 14px;
}

.glass-dock--solo {
  padding: 12px;
  border-radius: 18px;
}

.glass-dock__strip {
  display: flex;
  align-items: stretch;
  gap: 14px;
  overflow-x: auto;
  scrollbar-width: none;
}
.glass-dock__strip::-webkit-scrollbar { display: none; }

.glass-dock__item {
  --thumb-w: 108px;
  --thumb-h: 58px;
  width: 132px;
  min-width: 132px;
  max-width: 132px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 12px;
  border-radius: 16px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.82);
  cursor: pointer;
  flex-shrink: 0;
  transform-origin: 50% 100%;
  will-change: auto;
  transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease, color 140ms ease;
}

.glass-dock__item:hover {
  background: rgba(255,255,255,0.035);
}

.glass-dock__item--active {
  border-color: rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.07);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.05),
    0 10px 20px rgba(0,0,0,0.22);
}

.glass-dock--solo .glass-dock__item--add {
  padding: 8px;
  border-radius: 20px;
}

.glass-dock--solo .glass-dock__thumb {
  width: 64px;
  height: 46px;
  border-radius: 16px;
}

.glass-dock__thumb {
  width: var(--thumb-w);
  height: var(--thumb-h);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 8px 18px rgba(0,0,0,0.25),
    inset 0 1px 0 rgba(255,255,255,0.06);
}

.glass-dock__thumb--dashed {
  background: rgba(255,255,255,0.015);
  border: 1px dashed rgba(255,255,255,0.16);
  box-shadow: none;
}

.glass-dock__thumbImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.glass-dock__thumbFallback {
  color: rgba(255,255,255,0.20);
}

.glass-dock__label {
  max-width: 120px;
  font-size: 10px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.62);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glass-dock__item--active .glass-dock__label {
  color: rgba(255,255,255,0.92);
}

.glass-dock__badge {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(229,231,235,0.95);
  box-shadow: 0 0 0 2px rgba(10,12,20,0.7);
  animation: pulse 1.4s ease-in-out infinite;
}

.glass-dock__addIcon { color: rgba(229,231,235,0.78); }
.glass-dock__spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(229,231,235,0.45);
  border-top-color: transparent;
  animation: spin 0.7s linear infinite;
}

.glass-dock__item--add:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.glass-dock__soloAdd {
  width: 86px;
  height: 64px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease;
}
.glass-dock__soloAdd:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.14); }
.glass-dock__soloAdd:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
.glass-dock__soloThumb {
  width: 56px;
  height: 40px;
  border-radius: 14px;
  border: 1px dashed rgba(255,255,255,0.22);
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.95; }
}

@media (prefers-reduced-motion: reduce) {
  .glass-dock__item { transition: none; }
  .glass-dock__badge { animation: none; }
  .glass-dock__spinner { animation: none; }
}
</style>
