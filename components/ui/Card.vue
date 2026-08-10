<template>
  <div class="bg-card border border-border dark:border-transparent rounded-xl" :class="paddingClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  padding?: 'none' | 'sm' | 'md'
}>(), {
  padding: 'md',
})

const paddingClass = computed(() => ({
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
}[props.padding]))
</script>
