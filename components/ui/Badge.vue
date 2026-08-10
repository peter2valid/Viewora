<template>
  <span
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
    :class="variantClasses"
  >
    <span v-if="dot" class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="dotClasses" />
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  status?: 'published' | 'draft' | 'archived'
  dot?: boolean
}>(), {
  status: 'draft',
  dot: false,
})

const variantClasses = computed(() => ({
  published: 'bg-success-bg text-success',
  draft: 'bg-surface-alt text-dim',
  archived: 'bg-surface-alt text-dim/70',
}[props.status]))

const dotClasses = computed(() => ({
  published: 'bg-success',
  draft: 'bg-dim/50',
  archived: 'bg-dim/40',
}[props.status]))
</script>
