<template>
  <div class="hts" role="radiogroup" aria-label="Hotspot type">
    <button
      v-for="t in USER_HOTSPOT_TYPES"
      :key="t.key"
      type="button"
      role="radio"
      class="hts-btn"
      :class="{ 'hts-btn--on': current === t.key }"
      :aria-checked="current === t.key"
      :title="t.hint"
      :disabled="t.key === 'move' && !canMove"
      @click="current !== t.key && emit('change', t.key)"
    >
      <svg v-if="t.key === 'move'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      <svg v-else-if="t.key === 'info'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
      <svg v-else-if="t.key === 'media'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>
      <span>{{ t.label }}</span>
    </button>
  </div>
  <p v-if="!canMove" class="hts-note">Add another scene to make this a Move hotspot.</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { USER_HOTSPOT_TYPES, userTypeOf, type UserHotspotType } from '~/features/editor/hotspotTypeSwitch'
import type { HotspotType } from '~/features/editor/hotspotPayload'

const props = defineProps<{ type: HotspotType; canMove: boolean }>()
const emit = defineEmits<{ (e: 'change', to: UserHotspotType): void }>()

const current = computed(() => userTypeOf(props.type))
</script>

<style scoped>
.hts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 8px; }
.hts-btn {
  min-height: 44px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.6);
  font-size: 11px; font-weight: 700;
  transition: background 120ms, color 120ms, border-color 120ms;
}
.hts-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #fff; }
.hts-btn:active:not(:disabled) { background: rgba(255,255,255,0.12); }
.hts-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.hts-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.hts-btn--on { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.7); color: #fff; }
.hts-note { margin: 6px 0 0; font-size: 10.5px; color: rgba(255,255,255,0.4); }
@media (prefers-reduced-motion: reduce) { .hts-btn { transition: none; } }
</style>
