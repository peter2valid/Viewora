<template>
  <!-- "Swipe to explore" (touch) / "Click & drag" (mouse) over the picture until the first touch.
       pointer-events:none, so that first touch or click also moves the view underneath.
       One hint for every viewer: the 360° tour (PsvViewer) and the car spin (VehicleSpinViewer). -->
  <Transition name="hint-fade">
    <div v-if="show" class="viewer-hint" aria-hidden="true">
      <div class="viewer-hint__content">
        <template v-if="touch">
          <div class="viewer-hint__icon-wrap">
            <!-- Single-finger swipe icon -->
            <svg class="viewer-hint__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9.5 4.5a1.5 1.5 0 0 1 3 0v6"/>
              <path d="M12.5 7a1.5 1.5 0 0 1 3 0v3.5"/>
              <path d="M6.5 9a1.5 1.5 0 0 1 3 0v1.5"/>
              <path d="M6.5 10.5v2a5.5 5.5 0 0 0 5.5 5.5h.5a5.5 5.5 0 0 0 5.5-5.5V10"/>
            </svg>
            <div class="viewer-hint__arrows">
              <svg class="viewer-hint__arrow viewer-hint__arrow--left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <svg class="viewer-hint__arrow viewer-hint__arrow--right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </div>
          <p class="viewer-hint__text">{{ touchText }}</p>
        </template>

        <template v-else>
          <div class="viewer-hint__icon-wrap">
            <!-- Mouse with the left button highlighted -->
            <svg class="viewer-hint__icon viewer-hint__icon--mouse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <rect x="7" y="2" width="10" height="15" rx="5"/>
              <path d="M12 2v7"/>
              <path d="M7 7.5h5" stroke-width="2"/>
              <line x1="12" y1="11" x2="12" y2="13.5" stroke-width="2"/>
            </svg>
            <div class="viewer-hint__arrows">
              <svg class="viewer-hint__arrow viewer-hint__arrow--left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <svg class="viewer-hint__arrow viewer-hint__arrow--right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </div>
          <p class="viewer-hint__text">{{ mouseText }}</p>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  show: boolean
  /** Touch screen: a swiping finger. Otherwise a mouse. */
  touch: boolean
  touchText?: string
  mouseText?: string
}>(), { touchText: 'Swipe to explore', mouseText: 'Click & drag' })
</script>

<style scoped>
.viewer-hint {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.22);
  pointer-events: none;
  user-select: none;
}

.viewer-hint__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  color: #ffffff;
}

.viewer-hint__icon-wrap {
  position: relative;
  width: 120px;
  height: 120px;
}

.viewer-hint__icon {
  width: 72px;
  height: 72px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: hint-swipe-move 2.4s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
}

.viewer-hint__icon--mouse {
  animation: hint-drag-move 2.4s ease-in-out infinite;
}

.viewer-hint__arrows {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.viewer-hint__arrow {
  width: 30px;
  height: 30px;
  opacity: 0.8;
  animation: hint-arrow-pulse 2.4s ease-in-out infinite;
}

.viewer-hint__arrow--left  { animation-delay: 0s; }
.viewer-hint__arrow--right { animation-delay: 0.18s; }

.viewer-hint__text {
  font-family: var(--font-outfit, sans-serif);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
  animation: hint-text-fade 2.4s ease-in-out infinite;
}

@keyframes hint-swipe-move {
  0%   { transform: translate(-80%, -50%) rotate(-6deg); }
  50%  { transform: translate(-20%, -50%) rotate( 6deg); }
  100% { transform: translate(-80%, -50%) rotate(-6deg); }
}

@keyframes hint-drag-move {
  0%   { transform: translate(-70%, -50%) rotate(-4deg); }
  50%  { transform: translate(-30%, -50%) rotate( 4deg); }
  100% { transform: translate(-70%, -50%) rotate(-4deg); }
}

@keyframes hint-arrow-pulse {
  0%, 100% { opacity: 0.1;  transform: scale(0.88); }
  50%       { opacity: 0.85; transform: scale(1.12); }
}

@keyframes hint-text-fade {
  0%, 100% { opacity: 0.65; transform: translateY(0); }
  50%       { opacity: 1;    transform: translateY(-3px); }
}

@media (prefers-reduced-motion: reduce) {
  .viewer-hint__icon, .viewer-hint__arrow, .viewer-hint__text { animation: none; }
}

.hint-fade-enter-active,
.hint-fade-leave-active { transition: opacity 0.5s ease; }
.hint-fade-enter-from,
.hint-fade-leave-to     { opacity: 0; }
</style>
