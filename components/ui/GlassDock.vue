<template>
  <div style="display: contents;">
    <Transition name="glass-dock">
      <div
        v-if="visible && (items.length || showAdd)"
        ref="dockEl"
        class="glass-dock-container pointer-events-none"
        :class="[isCollapsed ? 'glass-dock-container--collapsed' : '']"
        :style="{
          bottom: `${bottomPx}px`,
          maxWidth: `calc(100vw - ${edgeInsetPx}px)`,
        }"
      >
        <!-- Navigation Controls: Prev, Collapse, Next -->
        <div
          v-if="showControls && items.length > 1"
          class="glass-dock__controls pointer-events-auto"
        >
          <button
            class="glass-dock__ctrl-btn"
            aria-label="Previous scene"
            @click="navigateLeft"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          
          <button
            class="glass-dock__ctrl-btn glass-dock__ctrl-btn--collapse"
            aria-label="Hide scenes"
            @click="isCollapsed = true"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          
          <button
            class="glass-dock__ctrl-btn"
            aria-label="Next scene"
            @click="navigateRight"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>

        <div
          class="glass-dock pointer-events-auto"
          :class="[glassClass, paddedClass, isSoloAdd ? 'glass-dock--solo' : '']"
          role="navigation"
          aria-label="Scene navigation"
        >
          <div v-if="items.length" ref="stripEl" class="glass-dock__strip" :style="{ maxWidth: `min(${maxStripVw}vw, ${maxStripPx}px)` }">
            <button
              v-for="item in items"
              :key="item.id"
              class="glass-dock__item"
              :data-dock-id="item.id"
              :class="[
                item.id === activeId ? 'glass-dock__item--active' : '',
              ]"
              :aria-current="item.id === activeId ? 'true' : 'false'"
              :aria-label="item.label"
              @click="emit('select', item.id)"
              @contextmenu.prevent="emit('context', item.id)"
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
                  draggable="false"
                  @load="onThumbLoad(item.imageUrl)"
                  @error="onThumbError(item.imageUrl)"
                />
                <span
                  v-if="item.imageUrl && !failedThumbUrls.has(item.imageUrl) && !loadedThumbUrls.has(item.imageUrl)"
                  class="glass-dock__thumbLoading"
                  aria-hidden="true"
                />
                <span
                  v-if="!item.imageUrl || failedThumbUrls.has(item.imageUrl)"
                  class="glass-dock__thumbFallback"
                  aria-hidden="true"
                >
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
                :class="item.badge === 'failed' ? 'glass-dock__badge--failed' : item.badge === 'warn' ? 'glass-dock__badge--warn' : ''"
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
      </div>
    </Transition>

    <!-- Expand Button -->
    <Transition name="fade-smooth">
      <button
        v-if="isCollapsed && visible"
        class="glass-dock-expand-trigger dock-glass pointer-events-auto fixed left-1/2 -translate-x-1/2 z-30"
        :style="{ bottom: `${bottomPx}px` }"
        aria-label="Show scenes"
        @click="isCollapsed = false"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m18 15-6-6-6 6"/>
        </svg>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import Sortable from 'sortablejs'

type DockItem = {
  id: string
  label: string
  imageUrl?: string | null
  ariaLabel?: string
  badge?: 'loading' | 'failed' | 'warn' | null
}

const props = withDefaults(defineProps<{
  items: DockItem[]
  activeId?: string
  showAdd?: boolean
  addDisabled?: boolean
  sortable?: boolean
  glassClass?: string
  bottomPx?: number
  edgeInsetPx?: number
  maxStripVw?: number
  maxStripPx?: number
  maxScale?: number
  sigmaPx?: number
  liftPx?: number
  collapsed?: boolean
  showControls?: boolean
}>(), {
  activeId: '',
  showAdd: false,
  addDisabled: false,
  sortable: true,
  glassClass: 'dock-glass',
  bottomPx: 20,
  edgeInsetPx: 20,
  maxStripVw: 74,
  maxStripPx: 820,
  maxScale: 1.55,
  sigmaPx: 86,
  liftPx: 12,
  collapsed: undefined,
  showControls: true,
})

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'add'): void
  (e: 'reorder', ids: string[]): void
  (e: 'context', id: string): void
  (e: 'update:collapsed', value: boolean): void
}>()

const visible = ref(false)
const isCollapsedLocal = ref(false)

const isCollapsed = computed({
  get() {
    return props.collapsed !== undefined ? props.collapsed : isCollapsedLocal.value
  },
  set(val) {
    if (props.collapsed !== undefined) {
      emit('update:collapsed', val)
    } else {
      isCollapsedLocal.value = val
    }
  }
})

onMounted(() => { visible.value = true })

const dockEl = ref<HTMLElement | null>(null)
const stripEl = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null
const loadedThumbUrls = reactive(new Set<string>())
const failedThumbUrls = reactive(new Set<string>())

watch(() => props.items, (items) => {
  const live = new Set(items.map((i) => i.imageUrl).filter(Boolean) as string[])
  for (const url of loadedThumbUrls) { if (!live.has(url)) loadedThumbUrls.delete(url) }
  for (const url of failedThumbUrls) { if (!live.has(url)) failedThumbUrls.delete(url) }
})

// Auto-scroll active item into center view when activeId changes
watch(() => props.activeId, (newId) => {
  if (!newId || !stripEl.value) return
  nextTick(() => {
    const activeBtn = stripEl.value?.querySelector(`[data-dock-id="${CSS.escape(newId)}"]`) as HTMLElement | null
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  })
}, { immediate: true })

const activeIndex = computed(() => {
  if (!props.activeId) return -1
  return props.items.findIndex(item => item.id === props.activeId)
})

function navigateLeft() {
  if (props.items.length <= 1) return
  const prevIndex = activeIndex.value > 0 ? activeIndex.value - 1 : props.items.length - 1
  const prevItem = props.items[prevIndex]
  if (prevItem) {
    emit('select', prevItem.id)
  }
}

function navigateRight() {
  if (props.items.length <= 1) return
  const nextIndex = activeIndex.value < props.items.length - 1 ? activeIndex.value + 1 : 0
  const nextItem = props.items[nextIndex]
  if (nextItem) {
    emit('select', nextItem.id)
  }
}

function onThumbLoad(url: string | null | undefined) {
  if (!url) return
  loadedThumbUrls.add(url)
  failedThumbUrls.delete(url)
}

function onThumbError(url: string | null | undefined) {
  if (!url) return
  failedThumbUrls.add(url)
}

// ── Touch-scroll the strip on mobile (PSV intercepts touch events, so we
//    manually handle horizontal swipes and stop their propagation) ──────────
let touchStartX = 0
let touchStartY = 0
let touchStartScrollLeft = 0
let touchScrolling = false

function onStripTouchStart(e: TouchEvent) {
  if (!stripEl.value) return
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  touchStartScrollLeft = stripEl.value.scrollLeft
  touchScrolling = false
}

function onStripTouchMove(e: TouchEvent) {
  if (!stripEl.value) return
  const dx = touchStartX - e.touches[0].clientX
  const dy = touchStartY - e.touches[0].clientY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  // Wait until gesture is clear enough to classify
  if (!touchScrolling && absDx < 5 && absDy < 5) return
  // Vertical dominance — let the panorama handle it
  if (!touchScrolling && absDy > absDx) return
  touchScrolling = true
  e.stopPropagation()
  e.preventDefault()
  stripEl.value.scrollLeft = touchStartScrollLeft + dx
}

function onStripTouchEnd() {
  touchScrolling = false
}

function onStripWheel(e: WheelEvent) {
  if (!stripEl.value) return
  e.stopPropagation()
  e.preventDefault()
  // deltaX for horizontal trackpad swipe; fall back to deltaY for scroll wheel
  stripEl.value.scrollLeft += e.deltaX || e.deltaY
}

watch(stripEl, (el, oldEl) => {
  if (oldEl) {
    oldEl.removeEventListener('touchstart', onStripTouchStart)
    oldEl.removeEventListener('touchmove', onStripTouchMove)
    oldEl.removeEventListener('touchend', onStripTouchEnd)
    oldEl.removeEventListener('wheel', onStripWheel)
  }
  if (el) {
    el.addEventListener('touchstart', onStripTouchStart, { passive: true })
    el.addEventListener('touchmove', onStripTouchMove, { passive: false })
    el.addEventListener('touchend', onStripTouchEnd, { passive: true })
    el.addEventListener('wheel', onStripWheel, { passive: false })
  }
}, { immediate: true })

watch(stripEl, (el) => {
  if (el && !sortableInstance && props.sortable) {
    sortableInstance = Sortable.create(el, {
      animation: 150,
      filter: '.glass-dock__item--add',
      draggable: '.glass-dock__item:not(.glass-dock__item--add)',
      onEnd: (evt) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined || evt.oldIndex === evt.newIndex) return
        
        // Using the actual DOM order ensures we don't desync if items are added/removed.
        const currentDOMIds = Array.from(el.children)
          .map(node => node.getAttribute('data-dock-id'))
          .filter(Boolean) as string[]
          
        if (currentDOMIds.length === props.items.length) {
          emit('reorder', currentDOMIds)
        }
      }
    })
  } else if (!el && sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
})

onBeforeUnmount(() => {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
  if (stripEl.value) {
    stripEl.value.removeEventListener('touchstart', onStripTouchStart)
    stripEl.value.removeEventListener('touchmove', onStripTouchMove)
    stripEl.value.removeEventListener('touchend', onStripTouchEnd)
    stripEl.value.removeEventListener('wheel', onStripWheel)
  }
})

const paddedClass = computed(() => 'glass-dock--padded')
const isSoloAdd = computed(() => props.showAdd && props.items.length === 0)
</script>

<style scoped>
.glass-dock-enter-active { transition: opacity 180ms ease, transform 180ms ease; }
.glass-dock-enter-from   { opacity: 0; transform: translate(-50%, 8px); }
.glass-dock-leave-active { transition: opacity 140ms ease, transform 140ms ease; }
.glass-dock-leave-to     { opacity: 0; transform: translate(-50%, 8px); }

.glass-dock-container {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transition: transform 0.38s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.38s ease;
}

.glass-dock-container--collapsed {
  transform: translate(-50%, calc(100% + 60px)) !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

.glass-dock__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 2px;
}

.glass-dock__ctrl-btn {
  height: 32px;
  width: 52px;
  border-radius: 999px;
  background: rgba(15, 18, 28, 0.65);
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
}

.glass-dock__ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.95);
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}

.glass-dock__ctrl-btn:active {
  transform: translateY(1px);
}

.glass-dock__ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}

.glass-dock {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 18px;
}

.dock-glass {
  background: rgba(10, 12, 20, 0.4);
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
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
  touch-action: pan-x;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
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
    width: 136px;
    min-width: 136px;
    max-width: 136px;
    padding: 12px 14px 14px;
    border-radius: 18px;
    gap: 10px;
  }
}

.glass-dock__item:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.12);
  color: #ffffff;
}

.glass-dock__item--active {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.18);
  box-shadow: 0 10px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05);
  color: #ffffff;
}

.glass-dock--solo .glass-dock__item--add {
  width: 100%;
  max-width: none;
}

.glass-dock--solo .glass-dock__thumb {
  width: 100%;
  height: 58px;
}

.glass-dock__thumb {
  width: var(--thumb-w);
  height: var(--thumb-h);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background: rgba(255,255,255,0.03);
  box-shadow: inset 0 1px 4px rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.04);
  transition: transform 140ms ease, border-color 140ms ease;
}

@media (min-width: 640px) {
  .glass-dock__thumb {
    border-radius: 12px;
  }
}

.glass-dock__thumbNav {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 6px;
  background: rgba(10,12,20,0.65);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.7);
  opacity: 0;
  transform: scale(0.85);
  transition: opacity 140ms ease, transform 140ms ease;
  z-index: 2;
}

.glass-dock__item:hover .glass-dock__thumbNav,
.glass-dock__item--active .glass-dock__thumbNav {
  opacity: 1;
  transform: none;
}

.glass-dock__thumb--dashed {
  border: 1px dashed rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.glass-dock__thumbImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
}

.glass-dock__thumbLoading {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 100%);
  background-size: 200% 100%;
  animation: thumb-shimmer 1.5s infinite;
}

.glass-dock__thumbFallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.25);
}

.glass-dock__label {
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  width: 100%;
  letter-spacing: -0.01em;
}

@media (min-width: 640px) {
  .glass-dock__label {
    font-size: 12px;
  }
}

.glass-dock__item--active .glass-dock__label {
  font-weight: 600;
}

.glass-dock__badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 8px #3b82f6;
  animation: pulse 2s infinite ease-in-out;
}

.glass-dock__badge--failed {
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444;
}

.glass-dock__badge--warn {
  background: #f59e0b;
  box-shadow: 0 0 8px #f59e0b;
}

.glass-dock__addIcon { color: rgba(229,231,235,0.78); }
.glass-dock__spinner {
  width: 14px;
  height: 14px;
  border: 1.8px solid rgba(255,255,255,0.18);
  border-top-color: rgba(255,255,255,0.85);
  border-radius: 50%;
  animation: spin 700ms linear infinite;
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

@media (prefers-reduced-motion: reduce) {
  .glass-dock__item { transition: none; }
  .glass-dock__badge { animation: none; }
  .glass-dock__spinner { animation: none; }
}

.glass-dock-expand-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 32px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  transition: background 140ms ease, transform 140ms ease, border-color 140ms ease;
}

.glass-dock-expand-trigger:hover {
  background: rgba(255, 255, 255, 0.08);
}

.fade-smooth-enter-active,
.fade-smooth-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.fade-smooth-enter-from,
.fade-smooth-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
