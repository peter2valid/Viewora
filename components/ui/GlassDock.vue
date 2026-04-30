<template>
  <Transition name="glass-dock">
    <div
      v-if="visible && (items.length || showAdd)"
      ref="dockEl"
      class="glass-dock pointer-events-auto fixed left-1/2 -translate-x-1/2 z-30"
      :class="[glassClass, paddedClass, isSoloAdd ? 'glass-dock--solo' : '']"
      :style="{
        bottom: `${bottomPx}px`,
        maxWidth: `calc(100vw - ${edgeInsetPx}px)`,
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
          draggable="true"
          :class="[
            item.id === activeId ? 'glass-dock__item--active' : '',
            item.id === dragSrcId ? 'glass-dock__item--dragging' : '',
            item.id === dragOverId ? 'glass-dock__item--drag-over' : '',
          ]"
          :aria-current="item.id === activeId ? 'true' : 'false'"
          :aria-label="item.ariaLabel || item.label"
          @click="emit('select', item.id)"
          @contextmenu.prevent="emit('context', item.id)"
          @dragstart="onDragStart(item.id, $event)"
          @dragenter.prevent="onDragEnter(item.id)"
          @dragover.prevent
          @dragleave="onDragLeave(item.id, $event)"
          @drop.prevent="onDrop(item.id)"
          @dragend="onDragEnd"
        >
          <span class="glass-dock__thumb">
            <span class="glass-dock__thumbNav" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 11.5 21 3l-8.5 18-1.8-7.7z" />
              </svg>
            </span>
            <NuxtImg
              v-if="item.imageUrl && !failedThumbUrls.has(item.imageUrl)"
              :src="item.imageUrl"
              :alt="item.label"
              class="glass-dock__thumbImg"
              width="108"
              height="58"
              format="webp"
              quality="80"
              loading="lazy"
              decoding="async"
              crossorigin="anonymous"
              draggable="false"
              @load="onThumbLoad(item.imageUrl)"
              @error="onThumbError(item.imageUrl)"
            />
            <span
              v-if="item.imageUrl && !failedThumbUrls.has(item.imageUrl) && !loadedThumbUrls.has(item.imageUrl)"
              class="glass-dock__thumbLoading"
              aria-hidden="true"
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

          <span
            v-if="item.badge"
            class="glass-dock__badge"
            :class="item.badge === 'failed' ? 'glass-dock__badge--failed' : ''"
            aria-hidden="true"
          />
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
import { computed, onMounted, reactive, ref, watch } from 'vue'

type DockItem = {
  id: string
  label: string
  imageUrl?: string | null
  ariaLabel?: string
  badge?: 'loading' | 'failed' | null
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
  (e: 'reorder', ids: string[]): void
  (e: 'context', id: string): void
}>()

const visible = ref(false)
onMounted(() => { visible.value = true })

const dockEl = ref<HTMLElement | null>(null)
const dragSrcId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)
const loadedThumbUrls = reactive(new Set<string>())
const failedThumbUrls = reactive(new Set<string>())

watch(() => props.items, (items) => {
  const live = new Set(items.map((i) => i.imageUrl).filter(Boolean) as string[])
  for (const url of loadedThumbUrls) { if (!live.has(url)) loadedThumbUrls.delete(url) }
  for (const url of failedThumbUrls) { if (!live.has(url)) failedThumbUrls.delete(url) }
})

function onThumbLoad(url: string | null | undefined) {
  if (!url) return
  loadedThumbUrls.add(url)
  failedThumbUrls.delete(url)
}

function onThumbError(url: string | null | undefined) {
  if (!url) return
  failedThumbUrls.add(url)
}

function onDragStart(id: string, e: DragEvent) {
  dragSrcId.value = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
}

function onDragEnter(id: string) {
  if (!dragSrcId.value || id === dragSrcId.value) return
  dragOverId.value = id
}

function onDragLeave(id: string, e: DragEvent) {
  // Ignore leave events when the cursor moves to a child element within the same button.
  const related = e.relatedTarget as Node | null
  if (related && (e.currentTarget as HTMLElement | null)?.contains(related)) return
  if (dragOverId.value === id) dragOverId.value = null
}

function onDrop(id: string) {
  if (!dragSrcId.value || id === dragSrcId.value) return
  const ids = props.items.map((i) => i.id)
  const fromIdx = ids.indexOf(dragSrcId.value)
  const toIdx = ids.indexOf(id)
  if (fromIdx !== -1 && toIdx !== -1) {
    const newIds = [...ids]
    newIds.splice(fromIdx, 1)
    newIds.splice(toIdx, 0, dragSrcId.value)
    emit('reorder', newIds)
  }
  dragSrcId.value = null
  dragOverId.value = null
}

function onDragEnd() {
  dragSrcId.value = null
  dragOverId.value = null
}

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
  padding: 8px;
}

@media (min-width: 640px) {
  .glass-dock--padded {
    padding: 14px;
  }
}

.glass-dock--solo {
  padding: 10px;
  border-radius: 18px;
}

@media (min-width: 640px) {
  .glass-dock--solo {
    padding: 12px;
  }
}

.glass-dock__strip {
  display: flex;
  align-items: stretch;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

@media (min-width: 640px) {
  .glass-dock__strip {
    gap: 14px;
  }
}
.glass-dock__strip::-webkit-scrollbar { display: none; }

.glass-dock__item {
  --thumb-w: 80px;
  --thumb-h: 44px;
  width: 100px;
  min-width: 100px;
  max-width: 100px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 10px;
  border-radius: 14px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.82);
  cursor: pointer;
  flex-shrink: 0;
  transform-origin: 50% 100%;
  will-change: auto;
  transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease, color 140ms ease;
}

@media (min-width: 640px) {
  .glass-dock__item {
    --thumb-w: 108px;
    --thumb-h: 58px;
    width: 132px;
    min-width: 132px;
    max-width: 132px;
    gap: 10px;
    padding: 10px 10px 12px;
    border-radius: 16px;
  }
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
  position: relative;
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

.glass-dock__thumbNav {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.92);
  background: rgba(0,0,0,0.38);
  border: 1px solid rgba(255,255,255,0.16);
  backdrop-filter: blur(3px);
  z-index: 2;
  pointer-events: none;
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

.glass-dock__thumbLoading {
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, rgba(255,255,255,0.02) 20%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.02) 80%);
  background-size: 220% 100%;
  animation: thumb-shimmer 1.25s ease-in-out infinite;
  z-index: 1;
}

.glass-dock__thumbFallback {
  color: rgba(255,255,255,0.20);
}

.glass-dock__label {
  max-width: 100%;
  font-size: 9px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.62);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 640px) {
  .glass-dock__label {
    font-size: 10px;
    max-width: 120px;
  }
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

.glass-dock__badge--failed {
  background: rgba(248,113,113,0.95);
  animation: none;
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
@keyframes thumb-shimmer {
  from { background-position: 180% 0; }
  to { background-position: -40% 0; }
}
@keyframes pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.95; }
}

.glass-dock__item--dragging { opacity: 0.35; cursor: grabbing; }
.glass-dock__item--drag-over {
  border-color: rgba(59, 130, 246, 0.55) !important;
  background: rgba(59, 130, 246, 0.07) !important;
}

@media (prefers-reduced-motion: reduce) {
  .glass-dock__item { transition: none; }
  .glass-dock__badge { animation: none; }
  .glass-dock__spinner { animation: none; }
}
</style>
