<template>
  <section id="stepinside" class="wrap">
    <div class="section__head">
      <p class="mono-tag">Step Inside</p>
      <h2 class="section__title">This is what the real tour feels like.</h2>
      <p class="section__lede">Drag to look around. In the live tour, every room connects — walk from room to room.</p>
    </div>
    <div
      ref="panoEl"
      class="pano"
      :style="{ backgroundImage: `url('${imageUrl}')` }"
      role="img"
      :aria-label="`Draggable 360 preview of ${label}`"
      @mousedown="onPointerDown"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onPointerUp"
    >
      <span class="pano__chip"><span class="pano__dot" />360° · {{ label }}</span>
      <div class="pano__caption">
        <p class="pano__note">Drag anywhere in this frame — this is a preview. The full tour lets you walk between rooms.</p>
        <a class="btn btn--brass" :href="tourUrl" target="_blank" rel="noopener">Open the Full Tour ↗</a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps<{
  imageUrl: string
  label: string
  tourUrl: string
}>()

const panoEl = ref<HTMLElement | null>(null)
let dragging = false
let startX = 0
let startPos = 0

function currentPosX() {
  if (!panoEl.value) return 0
  return parseFloat(getComputedStyle(panoEl.value).backgroundPositionX) || 0
}

function onPointerDown(e: MouseEvent) {
  dragging = true
  startX = e.clientX
  startPos = currentPosX()
}
function onPointerMove(e: MouseEvent) {
  if (!dragging || !panoEl.value) return
  panoEl.value.style.backgroundPositionX = `${startPos + (e.clientX - startX)}px`
}
function onPointerUp() {
  dragging = false
}

function onTouchStart(e: TouchEvent) {
  dragging = true
  startX = e.touches[0].clientX
  startPos = currentPosX()
}
function onTouchMove(e: TouchEvent) {
  if (!dragging || !panoEl.value) return
  panoEl.value.style.backgroundPositionX = `${startPos + (e.touches[0].clientX - startX)}px`
}

onMounted(() => {
  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('mouseup', onPointerUp)
})
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onPointerMove)
  window.removeEventListener('mouseup', onPointerUp)
})
</script>

<style scoped>
.wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding: 88px 24px;
}
.mono-tag {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brass);
  margin: 0;
}
.section__head {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 40px;
}
.section__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.7rem, 3.4vw, 2.5rem);
  margin: 0;
  letter-spacing: -0.01em;
  text-wrap: balance;
  color: var(--ink);
}
.section__lede {
  font-family: var(--font-body);
  font-size: 1.02rem;
  color: var(--ink-soft);
  max-width: 56ch;
  margin: 0;
}
.pano {
  position: relative;
  height: min(64vh, 560px);
  border-radius: 22px;
  overflow: hidden;
  background-repeat: repeat-x;
  background-size: auto 100%;
  background-position: 0 center;
  cursor: grab;
  box-shadow: 0 24px 60px var(--shadow);
  touch-action: pan-y;
  user-select: none;
}
.pano:active { cursor: grabbing; }
.pano__chip {
  position: absolute;
  top: 20px;
  left: 20px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(10, 8, 5, 0.55);
  color: #F7F1E4;
  border: 1px solid rgba(247, 241, 228, 0.25);
  backdrop-filter: blur(10px);
  padding: 8px 14px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  pointer-events: none;
}
.pano__dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #6be08a;
  box-shadow: 0 0 8px #6be08a;
  display: inline-block;
}
.pano__caption {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  pointer-events: none;
}
.pano__note {
  font-family: var(--font-body);
  font-size: 0.92rem;
  color: rgba(247, 241, 228, 0.85);
  max-width: 32ch;
  margin: 0;
  text-shadow: 0 1px 8px rgba(0,0,0,0.5);
}
.btn--brass {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  border: 1px solid var(--brass);
  color: var(--brass-strong);
  background: transparent;
}

@media (min-width: 780px) {
  .wrap { padding: 128px 48px; }
}

@media (prefers-reduced-motion: reduce) {
  .pano { transition: none; }
}
</style>
