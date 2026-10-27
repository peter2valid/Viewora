<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href"
    :type="href ? undefined : type"
    :disabled="href ? undefined : disabled || loading"
    :aria-disabled="disabled || loading || undefined"
    :aria-busy="loading || undefined"
    class="q-btn"
    :class="[`q-btn--${variant}`, { 'q-btn--block': block }]"
  >
    <span v-if="loading" class="q-btn__spinner" aria-hidden="true" />
    <UiIcon v-else-if="icon" :name="icon" :size="20" aria-hidden="true" />
    <span><slot /></span>
  </component>
</template>

<script setup lang="ts">
import type { IconName } from '~/types/icon'

withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'quiet'
  type?: 'button' | 'submit'
  href?: string
  icon?: IconName
  block?: boolean
  disabled?: boolean
  loading?: boolean
}>(), { variant: 'primary', type: 'button', block: false, disabled: false, loading: false })
</script>

<style scoped>
.q-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--q-tap);
  padding: 0 20px;
  border-radius: var(--q-radius);
  border: 1px solid transparent;
  font: 600 var(--q-text-md)/1 var(--q-font);
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background-color var(--q-fast) var(--q-ease), transform var(--q-fast) var(--q-ease), border-color var(--q-fast) var(--q-ease);
}
.q-btn--block { width: 100%; }
.q-btn:focus-visible { outline: none; box-shadow: var(--q-focus); }
.q-btn:active:not(:disabled) { transform: translateY(1px); }
.q-btn:disabled, .q-btn[aria-disabled='true'] { cursor: not-allowed; opacity: 0.45; }
/* Busy is not broken: keep full strength while saving */
.q-btn[aria-busy='true'] { opacity: 1; cursor: progress; }

.q-btn--primary { background: var(--q-ink); color: var(--q-inverse); }
.q-btn--primary:hover:not(:disabled) { background: #2a2a2a; }
.q-btn--primary:active:not(:disabled) { background: #000; }

.q-btn--secondary { background: var(--q-surface); color: var(--q-ink); border-color: var(--q-border-strong); }
.q-btn--secondary:hover:not(:disabled) { background: var(--q-sunken); }
.q-btn--secondary:active:not(:disabled) { background: var(--q-border); }

.q-btn--quiet { background: transparent; color: var(--q-ink); padding: 0 12px; text-decoration: underline; text-underline-offset: 3px; }
.q-btn--quiet:hover:not(:disabled) { background: var(--q-sunken); }

.q-btn__spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid currentColor; border-right-color: transparent;
  animation: q-spin 0.7s linear infinite;
}
@keyframes q-spin { to { transform: rotate(360deg); } }
</style>
