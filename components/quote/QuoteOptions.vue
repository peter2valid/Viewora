<template>
  <div role="radiogroup" :aria-label="label" class="options" @keydown="onRadioArrows($event, options.length, i => emit('update:modelValue', options[i].tier))">
    <article
      v-for="o in options" :key="o.tier"
      role="radio" :aria-checked="modelValue === o.tier" :tabindex="modelValue === o.tier ? 0 : -1"
      class="option" :class="{ 'option--picked': modelValue === o.tier }"
      @click="emit('update:modelValue', o.tier)" @keydown.enter.space.prevent="emit('update:modelValue', o.tier)"
    >
      <header class="option__head">
        <span class="option__radio" aria-hidden="true"><UiIcon v-if="modelValue === o.tier" name="check" :size="14" :stroke-width="3" /></span>
        <h3 class="option__tier">{{ t(`tiers.${o.tier}`) }}</h3>
        <p v-if="options.length > 1" class="q-small">{{ notes?.[o.tier] ?? t(`tiers.${o.tier}Note`) }}</p>
      </header>
      <p class="option__total q-num">
        {{ money(o.total) }}<template v-if="o.totalHigh && o.totalHigh !== o.total"> – {{ money(o.totalHigh) }}</template>
      </p>
      <ul class="option__lines">
        <li v-for="(l, i) in o.lines.filter(x => x.amount !== 0 || x.kind === 'travel')" :key="l.key ?? i">
          <span>{{ l.label }}</span>
          <span class="q-num">{{ l.tbc ? t('result.tbc') : l.amount === 0 ? t('result.free') : money(l.amount) }}</span>
        </li>
      </ul>
      <p class="q-small q-num">{{ t('result.deposit', { percent: depositBp / 100, amount: money(o.deposit) }) }}</p>
    </article>
  </div>
</template>

<script setup lang="ts">
import { onRadioArrows } from '~/features/quote/keyboard'

export interface QuoteOptionView {
  tier: string
  total: number
  totalHigh?: number | null
  deposit: number
  lines: Array<{ key?: string; kind: string; label: string; amount: number; tbc?: boolean }>
}

const props = withDefaults(defineProps<{
  options: QuoteOptionView[]; modelValue: string; currency?: 'KES' | 'USD'; label?: string
  notes?: Record<string, string>   // line under each tier name; defaults to the form's wording
  depositBp?: number
}>(), { currency: 'KES', label: 'Pick an option', depositBp: 5000 })
const emit = defineEmits<{ 'update:modelValue': [tier: string] }>()
const { t } = useQuoteStrings()
const money = (n: number) => formatMoney(n, props.currency)
</script>

<style scoped>
.options { display: grid; gap: 12px; }
@media (min-width: 900px) { .options { grid-template-columns: repeat(3, 1fr); align-items: start; } }
.option { display: grid; gap: 12px; padding: 18px; background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius-lg); cursor: pointer; transition: border-color var(--q-fast) var(--q-ease); }
.option:hover { border-color: var(--q-ink-3); }
.option--picked, .option--picked:hover { border-color: var(--q-ink); box-shadow: inset 0 0 0 1px var(--q-ink); }
.option:focus-visible { outline: none; box-shadow: var(--q-focus); }
.option__head { display: grid; grid-template-columns: 1fr 24px; column-gap: 10px; }
.option__head > :not(.option__radio) { grid-column: 1; }
.option__radio {
  grid-column: 2; grid-row: 1 / span 2; display: grid; place-items: center;
  width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--q-border-strong);
}
.option--picked .option__radio { border-color: var(--q-ink); background: var(--q-ink); color: var(--q-accent); }
.option__tier { font-size: var(--q-text-md); font-weight: 700; }
.option__total { font: 700 var(--q-text-xl)/1.1 var(--q-font); }
.option__lines { display: grid; gap: 6px; padding: 12px 0; border-block: 1px solid var(--q-border); font-size: var(--q-text-sm); }
.option__lines li { display: flex; justify-content: space-between; gap: 12px; }
.option__lines li span:first-child { color: var(--q-ink-2); }
.option__lines li span:last-child { white-space: nowrap; }
</style>
