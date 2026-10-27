<template>
  <button
    type="button"
    class="q-chip"
    :class="{ 'q-chip--on': on }"
    :aria-pressed="on"
    @click="$emit('toggle')"
  >
    <span class="q-chip__box" aria-hidden="true">
      <UiIcon v-if="on" name="check" :size="14" :stroke-width="3" />
      <UiIcon v-else name="plus" :size="14" :stroke-width="2.5" />
    </span>
    <span class="q-chip__label">{{ label }}</span>
    <span v-if="price" class="q-chip__price q-num">{{ price }}</span>
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ label: string; price?: string; on?: boolean }>(), { on: false })
defineEmits<{ toggle: [] }>()
</script>

<style scoped>
.q-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--q-tap);
  padding: 0 14px 0 10px;
  border: 1px solid var(--q-border-strong);
  border-radius: 999px;
  background: var(--q-surface);
  color: var(--q-ink);
  font: 500 var(--q-text-sm)/1.25 var(--q-font);
  text-align: left;
  max-width: 100%;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color var(--q-fast) var(--q-ease), background-color var(--q-fast) var(--q-ease), transform var(--q-fast) var(--q-ease);
}
.q-chip:hover { border-color: var(--q-ink-3); }
.q-chip:active { transform: scale(0.98); }
.q-chip:focus-visible { outline: none; box-shadow: var(--q-focus); }
.q-chip--on { border-color: var(--q-ink); background: var(--q-accent-tint); box-shadow: inset 0 0 0 1px var(--q-ink); }

.q-chip__box {
  display: grid; place-items: center;
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--q-sunken); color: var(--q-ink-2);
}
.q-chip--on .q-chip__box { background: var(--q-ink); color: var(--q-accent); }
.q-chip__box { flex: none; }
.q-chip__label { padding: 6px 0; }
.q-chip__price { color: var(--q-ink-2); white-space: nowrap; margin-left: auto; }
.q-chip--on .q-chip__price { color: var(--q-ink); }
</style>
