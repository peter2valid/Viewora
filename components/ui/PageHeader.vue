<template>
  <header class="mb-8 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-main">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-dim mt-1">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-col md:flex-row md:items-center gap-4">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>
