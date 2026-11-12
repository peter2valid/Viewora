<template>
  <!-- The owner's brand over a tour: logo, business name and contact lines. Decorative overlay:
       it never takes taps, so the tour underneath keeps working. -->
  <div class="tbc" :class="{ 'tbc--compact': compact }" aria-label="Tour branding">
    <NuxtImg
      v-if="space?.logo_url"
      :src="space.logo_url"
      width="140"
      height="52"
      fit="contain"
      class="tbc__logo"
      :alt="name || 'Logo'"
    />
    <div v-if="name || lines.length" class="tbc__body">
      <p v-if="name" class="tbc__name">{{ name }}</p>
      <p v-for="l in lines" :key="l" class="tbc__line">{{ l }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** The tour's space (logo_url, location_text, phone, email). */
  space: any
  /** Business name to show; a car's title is the car, so pages pass the dealer's name instead. */
  name?: string | null
  /** Phones and short panes: logo and name only. */
  compact?: boolean
}>(), { name: null, compact: false })

const lines = computed(() => {
  const s = props.space
  return [s?.location_text, s?.phone, s?.email].filter((v): v is string => typeof v === 'string' && v.trim() !== '')
})
</script>

<style scoped>
.tbc {
  display: flex; flex-direction: column; gap: 6px;
  max-width: 200px;
  pointer-events: none;
}
.tbc__logo {
  display: block;
  width: auto; max-width: 140px; max-height: 52px;
  object-fit: contain; object-position: left center;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6));
}
.tbc__body { display: flex; flex-direction: column; gap: 2px; }
.tbc__name {
  margin: 0; font-size: 14px; font-weight: 800; line-height: 1.2; letter-spacing: -0.01em;
  color: #fff; text-shadow: 0 1px 10px rgba(0, 0, 0, 0.8);
}
.tbc__line {
  margin: 0; font-size: 11px; font-weight: 500; line-height: 1.4;
  color: rgba(255, 255, 255, 0.78); text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
  overflow-wrap: anywhere;
}
.tbc--compact { gap: 4px; max-width: 150px; }
.tbc--compact .tbc__logo { max-width: 104px; max-height: 36px; }
.tbc--compact .tbc__name { font-size: 12px; }
.tbc--compact .tbc__line { display: none; }
/* Phones: logo and name only, so it never crowds the tour. */
@media (max-width: 480px) {
  .tbc { gap: 4px; max-width: 150px; }
  .tbc__logo { max-width: 104px; max-height: 36px; }
  .tbc__name { font-size: 12px; }
  .tbc__line { display: none; }
}
</style>
