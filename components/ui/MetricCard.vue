<template>
  <UiCard padding="sm">
    <p class="text-[11px] font-bold text-dim uppercase tracking-wider mb-3">{{ label }}</p>
    <p class="text-3xl font-black text-main leading-none truncate" :title="String(value)">{{ value }}</p>
    <p class="text-xs text-dim mt-2">{{ sub }}</p>
  </UiCard>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  sub: string
}>()
</script>
