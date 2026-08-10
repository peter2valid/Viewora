<template>
  <component
    :is="tag"
    :to="to"
    :type="to ? undefined : type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
    :class="[sizeClasses, variantClasses]"
  >
    <svg v-if="loading" class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, resolveComponent } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'danger'
  size?: 'sm' | 'md'
  to?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
})

const NuxtLink = resolveComponent('NuxtLink')
const tag = computed(() => (props.to ? NuxtLink : 'button'))

const sizeClasses = computed(() => ({
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-10 px-4 text-sm',
}[props.size]))

const variantClasses = computed(() => ({
  primary: 'bg-main text-bg hover:opacity-90 shadow-sm',
  secondary: 'bg-surface text-main border border-border hover:bg-surface-alt',
  ghost: 'bg-transparent text-dim hover:text-main hover:bg-surface-alt',
  success: 'bg-success-bg text-success border border-success/20 hover:bg-success/15',
  danger: 'bg-danger-bg text-danger border border-danger/20 hover:bg-danger/15',
}[props.variant]))
</script>
