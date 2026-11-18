<template>
  <div class="sp-toast" role="status" aria-live="polite">
    <div class="sp-toast__row">
      <span class="sp-toast__spinner" aria-hidden="true" />
      <span class="sp-toast__title">Preparing scenes</span>
      <span class="sp-toast__count">{{ progress.ready }} / {{ progress.total }}</span>
    </div>
    <div
      class="sp-toast__track"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="sp-toast__bar" :style="{ width: `${percent}%` }" />
    </div>
    <div class="sp-toast__meta">
      <span>{{ etaLabel }}</span>
      <span v-if="progress.failed" class="sp-toast__failed">{{ progress.failed }} failed</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface SceneProgressState {
  ready: number
  total: number
  failed: number
  /** Estimated ms until every scene is ready; null while there is no estimate yet. */
  etaMs: number | null
}

const props = defineProps<{ progress: SceneProgressState }>()

const percent = computed(() => {
  const { ready, total } = props.progress
  if (!total) return 0
  // Never show a full bar while something is still processing.
  return Math.min(99, Math.round((ready / total) * 100))
})

const etaLabel = computed(() => {
  const eta = props.progress.etaMs
  if (eta == null) return 'Estimating time left…'
  const s = Math.ceil(eta / 1000)
  if (s <= 10) return 'Almost done…'
  if (s < 60) return 'Less than a minute left'
  const m = Math.round(s / 60)
  return `About ${m} min left`
})
</script>

<style scoped>
.sp-toast {
  width: var(--width, 356px);
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 8px;
  background: #000d1f;
  border: 1px solid #002f5c;
  color: #c4daf6;
  font-size: 13px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
.sp-toast__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sp-toast__title {
  font-weight: 500;
  flex: 1;
}
.sp-toast__count {
  font-variant-numeric: tabular-nums;
  color: #8fb6e8;
  font-size: 12px;
}
.sp-toast__spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(96, 165, 250, 0.25);
  border-top-color: #60a5fa;
  animation: sp-spin 0.9s linear infinite;
  flex-shrink: 0;
}
.sp-toast__track {
  margin-top: 9px;
  height: 5px;
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.15);
  overflow: hidden;
}
.sp-toast__bar {
  height: 100%;
  border-radius: inherit;
  background: #3b82f6;
  transition: width 0.6s ease;
}
.sp-toast__meta {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
  color: #8fb6e8;
}
.sp-toast__failed {
  color: #f87171;
}
@keyframes sp-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .sp-toast__spinner { animation: none; }
  .sp-toast__bar { transition: none; }
}
</style>
