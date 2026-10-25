<template>
  <Teleport to="body">
    <div class="rp-backdrop" role="dialog" aria-modal="true" aria-label="Room preview" @click.self="emit('close')">
      <div class="rp-dialog">
        <div class="rp-header">
          <div class="rp-title">
            <span class="rp-name">{{ scene?.label }}</span>
            <span class="rp-count">{{ index + 1 }} / {{ scenes.length }}</span>
          </div>
          <button class="rp-close" aria-label="Close preview" @click="emit('close')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- The whole panorama, height-fitted and repeated sideways: drag to turn around the room. -->
        <div
          ref="stageEl"
          class="rp-stage"
          :class="{ 'rp-stage--dragging': dragging }"
          :style="{ backgroundImage: scene?.imageUrl ? `url('${scene.imageUrl}')` : 'none', backgroundPositionX: `${offset}px` }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <span v-if="!scene?.imageUrl" class="rp-empty">No photo for this room yet</span>
          <button class="rp-arrow rp-arrow--left" title="Previous room" aria-label="Previous room" @pointerdown.stop @click="step(-1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button class="rp-arrow rp-arrow--right" title="Next room" aria-label="Next room" @pointerdown.stop @click="step(1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <span class="rp-hint">Drag to look around</span>
        </div>

        <div class="rp-footer">
          <button class="rp-btn rp-btn--ghost" @click="emit('close')">Cancel</button>
          <button class="rp-btn rp-btn--primary" :disabled="!scene" @click="scene && emit('choose', scene.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            Link this room
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  scenes: Array<{ id: string; label: string; imageUrl?: string | null }>
  startIndex: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'choose', id: string): void
}>()

const index = ref(Math.max(0, props.startIndex))
const scene = computed(() => props.scenes[index.value])

const stageEl = ref<HTMLElement | null>(null)
const offset = ref(0)
const dragging = ref(false)
let startX = 0
let startOffset = 0

/** Middle of the panorama (the scene's front) in the middle of the stage; the image is 2:1, height-fitted. */
function centre() {
  const el = stageEl.value
  if (!el) return
  offset.value = Math.round(el.clientWidth / 2 - el.clientHeight)
}

function step(dir: 1 | -1) {
  const n = props.scenes.length
  if (!n) return
  index.value = (index.value + dir + n) % n
}

watch(index, () => nextTick(centre))

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  startX = e.clientX
  startOffset = offset.value
  stageEl.value?.setPointerCapture(e.pointerId)
}
function onPointerMove(e: PointerEvent) {
  if (dragging.value) offset.value = startOffset + (e.clientX - startX)
}
function onPointerUp() {
  dragging.value = false
}

// Capture phase on window: runs before the quick editor's own keydown
// listener, so Escape closes only the preview, not the hotspot editor.
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'Enter' && scene.value) emit('choose', scene.value.id)
  else return
  e.preventDefault()
  e.stopImmediatePropagation()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown, { capture: true })
  window.addEventListener('resize', centre)
  nextTick(centre)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, { capture: true })
  window.removeEventListener('resize', centre)
})
</script>

<style scoped>
.rp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(5, 7, 12, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.rp-dialog {
  width: min(1200px, 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 20px;
  background: rgba(12, 14, 22, 0.86);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 24px 60px rgba(0,0,0,0.45);
}
.rp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.rp-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
.rp-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  overflow-wrap: anywhere;
}
.rp-count {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  font-variant-numeric: tabular-nums;
}
.rp-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.85);
  cursor: pointer;
}
.rp-close:hover { background: rgba(255,255,255,0.16); }

.rp-stage {
  position: relative;
  height: min(62vh, 560px);
  border-radius: 14px;
  overflow: hidden;
  background-color: rgba(255,255,255,0.05);
  background-size: auto 100%;
  background-repeat: repeat-x;
  cursor: grab;
  touch-action: none;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rp-stage--dragging { cursor: grabbing; }
.rp-empty {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
}
.rp-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(12, 14, 22, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.25);
  color: #fff;
  cursor: pointer;
  transition: background 130ms;
}
.rp-arrow:hover { background: rgba(12, 14, 22, 0.82); }
.rp-arrow--left { left: 12px; }
.rp-arrow--right { right: 12px; }
.rp-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(12, 14, 22, 0.6);
  color: rgba(255,255,255,0.85);
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
}

.rp-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.rp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}
.rp-btn--ghost {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.75);
}
.rp-btn--ghost:hover { background: rgba(255,255,255,0.11); }
.rp-btn--primary {
  background: #4f46e5;
  color: #fff;
}
.rp-btn--primary:hover { background: #5b52f0; }
.rp-btn--primary:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 640px) {
  .rp-dialog { padding: 10px; gap: 10px; }
  .rp-stage { height: min(48vh, 360px); }
  .rp-arrow { width: 38px; height: 38px; }
}
</style>
