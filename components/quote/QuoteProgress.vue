<template>
  <div class="q-progress">
    <p class="q-progress__text">{{ t('progress', { step, total }) }}</p>
    <div
      class="q-progress__bar"
      role="progressbar"
      :aria-valuenow="step"
      :aria-valuemin="1"
      :aria-valuemax="total"
      :aria-valuetext="t('progress', { step, total })"
    >
      <span v-for="n in total" :key="n" class="q-progress__seg" :class="{ 'q-progress__seg--done': n < step, 'q-progress__seg--now': n === step }" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ step: number; total: number }>()
const { t } = useQuoteStrings()
</script>

<style scoped>
.q-progress { display: grid; gap: 8px; }
.q-progress__text { font-size: var(--q-text-sm); font-weight: 600; color: var(--q-ink-2); }
.q-progress__bar { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; }
.q-progress__seg { height: 4px; border-radius: 2px; background: var(--q-border); transition: background-color var(--q-base) var(--q-ease); }
.q-progress__seg--done { background: var(--q-ink); }
.q-progress__seg--now { background: var(--q-accent); }
</style>
