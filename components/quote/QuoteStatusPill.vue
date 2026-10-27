<template>
  <span class="q-pill" :class="`q-pill--${tone}`">
    <span class="q-pill__dot" aria-hidden="true" />{{ t(`stages.${stage}`) }}
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{ stage: 'new' | 'contacted' | 'quoted' | 'booked' | 'delivered' | 'paid' | 'lost' }>()
const { t } = useQuoteStrings()

const tone = computed(() => ({
  new: 'new', contacted: 'warn', quoted: 'warn', booked: 'good', delivered: 'good', paid: 'good', lost: 'quiet',
}[props.stage]))
</script>

<style scoped>
.q-pill {
  display: inline-flex; align-items: center; gap: 6px;
  height: 24px; padding: 0 10px; border-radius: 999px;
  font-size: var(--q-text-xs); font-weight: 600; white-space: nowrap;
}
.q-pill__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.q-pill--new { color: var(--q-new); background: var(--q-new-bg); }
.q-pill--warn { color: var(--q-warn); background: var(--q-warn-bg); }
.q-pill--good { color: var(--q-good); background: var(--q-good-bg); }
.q-pill--bad { color: var(--q-bad); background: var(--q-bad-bg); }
.q-pill--quiet { color: var(--q-quiet); background: var(--q-quiet-bg); }
</style>
