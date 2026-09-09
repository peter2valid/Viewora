<template>
  <section v-if="bio" class="seller-bio">
    <p class="seller-bio__label">About</p>
    <p class="seller-bio__text" :class="{ 'seller-bio__text--clamped': !expanded }">{{ bio }}</p>
    <button v-if="isLong" type="button" class="seller-bio__toggle" @click="expanded = !expanded">
      {{ expanded ? 'Show less' : 'Read More' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ bio: string | null }>()

const expanded = ref(false)
// Matches the 3-line clamp below — only worth a toggle button when the text
// would actually overflow it.
const isLong = computed(() => (props.bio?.length ?? 0) > 160)
</script>

<style scoped>
.seller-bio { padding: 20px; border-top: 1px solid var(--vo-border); }
.seller-bio__label {
  font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.68rem; font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--vo-muted); margin: 0 0 10px;
}
.seller-bio__text { font-size: 0.88rem; line-height: 1.6; color: var(--vo-secondary); margin: 0; white-space: pre-line; }
.seller-bio__text--clamped {
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.seller-bio__toggle {
  margin-top: 8px; background: none; border: none; padding: 0; cursor: pointer;
  font-size: 0.82rem; font-weight: 700; color: var(--vo-text);
}
</style>
