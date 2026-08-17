<template>
  <section class="closing">
    <div class="wrap closing__inner">
      <p class="closing__kicker">Some homes you have to feel.</p>
      <h2 class="closing__title">Message the owner. Right now.</h2>
      <a class="btn btn--whatsapp" :href="whatsappUrl" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2m0 18.1a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.18 8.18 0 0 1-1.26-4.4c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.27-8.24 8.27m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.36-.77-1.86-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28"/></svg>
        Chat on WhatsApp
      </a>
      <p class="closing__phone">{{ phoneDisplay }} · replies usually within minutes</p>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  whatsappUrl: string
  phoneDisplay: string
}>()
</script>

<style scoped>
.closing {
  background: var(--ground-raised);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding: 88px 24px;
}
.closing__inner {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
.closing__kicker {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(1.2rem, 2.6vw, 1.6rem);
  color: var(--brass-strong);
  margin: 0;
}
.closing__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(2rem, 4.4vw, 3rem);
  margin: 0;
  text-wrap: balance;
  max-width: 18ch;
  color: var(--ink);
}
.btn--whatsapp {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 60px;
  padding: 0 34px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 1.05rem;
  text-decoration: none;
  background: var(--whatsapp);
  color: var(--whatsapp-ink);
  box-shadow: 0 10px 28px rgba(31, 168, 85, 0.28);
}
.closing__phone {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--ink-soft);
  letter-spacing: 0.04em;
  margin-top: 4px;
}

@media (min-width: 780px) {
  .wrap { padding: 128px 48px; }
}
</style>
