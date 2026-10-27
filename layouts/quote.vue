<template>
  <div class="q-root q-shell">
    <header class="q-shell__bar">
      <a :href="marketingUrl" class="q-shell__brand">Viewora</a>
      <span class="q-shell__product">Capture</span>
    </header>
    <main class="q-shell__main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import '~/assets/css/quote.css'

const marketingUrl = useRuntimeConfig().public.marketingUrl
</script>

<style scoped>
.q-shell { min-height: 100dvh; }
.q-shell__bar {
  display: flex; align-items: center; gap: 8px;
  padding: 2px var(--q-gutter);
  border-bottom: 1px solid var(--q-border);
  background: var(--q-surface);
}
/* Text wordmark: the logo PNGs are ~2000px and too heavy for 3G */
.q-shell__brand { display: inline-flex; align-items: center; min-height: var(--q-tap); font: 700 1.125rem/1 var(--q-font-display); color: var(--q-ink); text-decoration: none; letter-spacing: -0.01em; }
.q-shell__brand:focus-visible { outline: none; box-shadow: var(--q-focus); border-radius: 4px; }
.q-shell__product { font-size: var(--q-text-sm); color: var(--q-ink-2); }
.q-shell__main { padding: 20px var(--q-gutter) 48px; }
</style>
