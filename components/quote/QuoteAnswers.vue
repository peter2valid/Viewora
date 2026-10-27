<template>
  <section class="q-answers" :aria-label="t('answersTitle')">
    <h3 class="q-answers__title">{{ t('answersTitle') }}</h3>
    <dl class="q-answers__list">
      <div v-for="a in answers" :key="a.step + a.label" class="q-answers__row">
        <UiIcon :name="a.icon" :size="18" class="q-answers__icon" aria-hidden="true" />
        <dt class="q-answers__label">{{ a.label }}</dt>
        <dd class="q-answers__value">{{ a.value }}</dd>
        <button type="button" class="q-answers__edit" @click="$emit('edit', a.step)">
          {{ t('edit') }}<span class="sr-only"> {{ a.label }}</span>
        </button>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import type { IconName } from '~/types/icon'

defineProps<{ answers: Array<{ step: string; icon: IconName; label: string; value: string }> }>()
defineEmits<{ edit: [step: string] }>()
const { t } = useQuoteStrings()
</script>

<style scoped>
.q-answers { display: grid; gap: 8px; }
.q-answers__title { font-size: var(--q-text-sm); font-weight: 700; }
.q-answers__list { display: grid; background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius); }
.q-answers__row {
  display: grid; grid-template-columns: 18px 1fr auto; column-gap: 10px; align-items: center;
  padding: 4px 4px 4px 12px; border-bottom: 1px solid var(--q-border);
}
.q-answers__row:last-child { border-bottom: 0; }
.q-answers__icon { color: var(--q-ink-2); grid-row: span 2; }
.q-answers__label { font-size: var(--q-text-xs); color: var(--q-ink-2); padding-top: 6px; }
.q-answers__value { grid-column: 2; font-size: var(--q-text-sm); font-weight: 600; padding-bottom: 6px; }
.q-answers__edit {
  grid-column: 3; grid-row: 1 / span 2;
  min-height: 44px; padding: 0 12px; border: 0; border-radius: var(--q-radius-sm);
  background: transparent; color: var(--q-ink); font: 600 var(--q-text-sm)/1 var(--q-font);
  text-decoration: underline; text-underline-offset: 3px; cursor: pointer;
}
.q-answers__edit:hover { background: var(--q-sunken); }
.q-answers__edit:focus-visible { outline: none; box-shadow: var(--q-focus); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
