<template>
  <!-- One option in a radiogroup; the parent owns arrow-key movement. -->
  <button
    type="button"
    role="radio"
    :aria-checked="selected"
    :tabindex="focusable ? 0 : -1"
    class="q-tile"
    :class="[`q-tile--${size}`, { 'q-tile--selected': selected, 'q-tile--media': !!image, 'q-tile--stack': stack }]"
    @click="$emit('select')"
  >
    <span v-if="icon && !image" class="q-tile__icon" aria-hidden="true"><UiIcon :name="icon" :size="size === 'default' ? 26 : 22" :stroke-width="1.75" /></span>
    <img v-if="image" :src="image" :alt="''" class="q-tile__img" loading="lazy" width="320" height="160">
    <span class="q-tile__text">
      <span class="q-tile__title">{{ title }}</span>
      <span v-if="sub" class="q-tile__sub q-num">{{ sub }}</span>
    </span>
    <span class="q-tile__mark" aria-hidden="true">
      <UiIcon v-if="selected" name="check" :size="16" :stroke-width="3" />
    </span>
  </button>
</template>

<script setup lang="ts">
import type { IconName } from '~/types/icon'

withDefaults(defineProps<{
  title: string
  icon?: IconName     // recognisable at a glance, so visitors don't have to read
  sub?: string
  image?: string      // a frame from a real Viewora tour of this industry
  selected?: boolean
  focusable?: boolean
  stack?: boolean     // icon above the label, for 2-up grids on phones
  size?: 'default' | 'compact' | 'small'   // compact: many choices on one phone screen; small: one-line choices
}>(), { selected: false, focusable: true, stack: false, size: 'default' })

defineEmits<{ select: [] }>()
</script>

<style scoped>
.q-tile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 14px 16px;
  border: 1px solid var(--q-border-strong);
  border-radius: var(--q-radius);
  background: var(--q-surface);
  color: var(--q-ink);
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color var(--q-fast) var(--q-ease), background-color var(--q-fast) var(--q-ease), transform var(--q-fast) var(--q-ease);
}
.q-tile:hover { border-color: var(--q-ink-3); }
.q-tile:active { transform: scale(0.99); }
.q-tile:focus-visible { outline: none; box-shadow: var(--q-focus); }

/* Selected: ink outline (the contrast carrier) plus the accent as a fill hint */
.q-tile--selected { border-color: var(--q-ink); box-shadow: inset 0 0 0 1px var(--q-ink); background: var(--q-accent-tint); }

.q-tile--media { flex-direction: column; align-items: stretch; padding: 0; overflow: hidden; }
.q-tile--media .q-tile__text { padding: 12px 14px 14px; }
.q-tile__img { display: block; width: 100%; aspect-ratio: 2 / 1; object-fit: cover; background: var(--q-sunken); }

.q-tile__icon {
  flex: none; display: grid; place-items: center;
  width: 44px; height: 44px; border-radius: var(--q-radius-sm);
  background: var(--q-sunken); color: var(--q-ink);
}
.q-tile--selected .q-tile__icon { background: var(--q-surface); }
.q-tile { min-width: 0; }
.q-tile--stack { flex-direction: column; align-items: flex-start; gap: 10px; min-height: 96px; }
.q-tile--stack .q-tile__mark { position: absolute; top: 12px; right: 12px; }
.q-tile--stack .q-tile__text { width: 100%; }
.q-tile__text { display: grid; gap: 2px; flex: 1; min-width: 0; }
.q-tile__title { font-size: var(--q-text-md); font-weight: 600; line-height: 1.3; }
.q-tile__sub { font-size: var(--q-text-sm); color: var(--q-ink-2); }

/* Compact: icon beside a short label, so ten industries fit one phone screen.
   Selection shows as the outline and fill; the round mark is dropped for room. */
.q-tile--compact { gap: 8px; min-height: 60px; padding: 8px; }
.q-tile--compact .q-tile__icon, .q-tile--small .q-tile__icon { width: 36px; height: 36px; }
.q-tile--compact .q-tile__icon { width: 28px; height: 28px; }
.q-tile--compact .q-tile__title { font-size: var(--q-text-sm); line-height: 1.2; }
.q-tile--compact .q-tile__sub { font-size: var(--q-text-xs); line-height: 1.3; white-space: nowrap; }
.q-tile--compact .q-tile__mark, .q-tile--small .q-tile__mark { display: none; }
/* Small: one line, still a 48 px target */
.q-tile--small { min-height: var(--q-tap); padding: 6px 10px; gap: 10px; }
.q-tile--small .q-tile__title { font-size: var(--q-text-sm); }

.q-tile__mark {
  flex: none;
  display: grid; place-items: center;
  width: 24px; height: 24px;
  border-radius: 50%;
  border: 1.5px solid var(--q-border-strong);
  background: var(--q-surface);
}
.q-tile--selected .q-tile__mark { border-color: var(--q-ink); background: var(--q-ink); color: var(--q-accent); }
.q-tile--media .q-tile__mark { position: absolute; top: 10px; right: 10px; }
</style>
