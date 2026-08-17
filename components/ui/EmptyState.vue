<template>
  <div class="flex flex-col items-center text-center py-16 px-6" :class="bordered ? 'border border-dashed border-border rounded-xl' : ''">
    <div class="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center text-dim mb-4">
      <UiIcon :name="icon" :size="20" />
    </div>
    <h3 class="text-base font-bold text-main mb-1.5">{{ title }}</h3>
    <p class="text-sm text-dim max-w-sm leading-relaxed">{{ description }}</p>
    <div v-if="$slots.actions" class="flex flex-wrap items-center justify-center gap-3 mt-6">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IconName } from '~/types/icon'

withDefaults(defineProps<{
  icon: IconName
  title: string
  description: string
  bordered?: boolean
}>(), {
  bordered: false,
})
</script>
