<template>
  <section class="seller-listings">
    <p class="seller-listings__label">Listings</p>

    <div v-if="pending" class="seller-listings__grid" aria-label="Loading listings" aria-busy="true">
      <div v-for="n in 4" :key="n" class="card card--skeleton">
        <div class="card__media skeleton" />
        <div class="card__body">
          <div class="skeleton skeleton--price" />
          <div class="skeleton skeleton--line" />
        </div>
      </div>
    </div>

    <p v-else-if="listings.length === 0" class="seller-listings__empty">No published listings yet.</p>

    <div v-else class="seller-listings__grid">
      <UiListingCard v-for="listing in listings" :key="listing.id" :listing="listing" />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Listing } from '~/utils/listingDisplay'

defineProps<{
  listings: Listing[]
  pending: boolean
}>()
</script>

<style scoped>
.seller-listings { padding: 20px; border-top: 1px solid var(--vo-border); }
.seller-listings__label {
  font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.68rem; font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--vo-muted); margin: 0 0 14px;
}
.seller-listings__empty { font-size: 0.85rem; color: var(--vo-muted); padding: 20px 0; text-align: center; }
.seller-listings__grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;
}
@media (min-width: 640px) {
  .seller-listings__grid { grid-template-columns: repeat(3, 1fr); }
}

.card { background: var(--vo-surface); border-radius: var(--vo-radius-lg); overflow: hidden; border: 1px solid var(--vo-border); }
.card__media { position: relative; aspect-ratio: 4 / 3; background: var(--vo-elevated); }
.card__body { padding: 14px; }
.card--skeleton { pointer-events: none; }
.skeleton {
  position: relative; overflow: hidden; background: var(--vo-elevated); border-radius: 4px;
}
.skeleton::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, var(--vo-border-strong) 50%, transparent);
  transform: translateX(-100%);
  animation: skeleton-sweep 1.6s ease-in-out infinite;
}
.skeleton--price { height: 20px; width: 55%; margin: 0 0 11px; }
.skeleton--line { height: 12px; width: 40%; }
@keyframes skeleton-sweep { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) {
  .skeleton::after { animation: none; }
}
</style>
