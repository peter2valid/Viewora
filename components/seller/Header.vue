<template>
  <section class="seller-header">
    <img v-if="avatarUrl" :src="avatarUrl" class="seller-header__avatar" :alt="sellerName" referrerpolicy="no-referrer" />
    <div v-else class="seller-header__avatar seller-header__avatar--fallback">{{ initial }}</div>
    <h1 class="seller-header__name">{{ sellerName }}</h1>
    <p class="seller-header__meta">{{ listingCount }} {{ listingCount === 1 ? 'listing' : 'listings' }} on Viewora</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  sellerName: string
  avatarUrl: string | null
  listingCount: number
}>()

const initial = computed(() => (props.sellerName || '?').charAt(0).toUpperCase())
</script>

<style scoped>
.seller-header {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 28px 20px 8px;
}
.seller-header__avatar {
  width: 88px; height: 88px; border-radius: 50%; object-fit: cover;
  border: 1px solid var(--vo-border);
}
.seller-header__avatar--fallback {
  display: flex; align-items: center; justify-content: center;
  background: var(--vo-elevated); color: var(--vo-secondary);
  font-weight: 800; font-size: 2rem;
}
.seller-header__name { font-size: 1.15rem; font-weight: 800; margin: 14px 0 0; letter-spacing: -0.01em; }
.seller-header__meta { font-size: 0.8rem; color: var(--vo-muted); margin: 4px 0 0; }
</style>
