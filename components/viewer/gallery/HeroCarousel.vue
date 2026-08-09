<template>
  <header class="hero">
    <img class="hero__img" :src="heroImage" :alt="`Entrance of ${title}`" />
    <div class="hero__scrim" />
    <div class="hero__inner">
      <p class="hero__eyebrow">A Viewora Walkthrough · {{ roomCount }} Rooms in 360°</p>
      <h1 class="hero__title">Walk the house<br />before you visit.</h1>
      <p class="hero__sub">Move through every room from wherever you are. When something catches your eye, ask about it — right there, on WhatsApp.</p>
      <div class="hero__ctas">
        <a class="btn btn--whatsapp" :href="whatsappUrl" target="_blank" rel="noopener" @click="$emit('chat-click')">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2m0 18.1a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.18 8.18 0 0 1-1.26-4.4c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.27-8.24 8.27m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.36-.77-1.86-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28"/></svg>
          <span>Chat on WhatsApp</span>
        </a>
        <div class="hero__secondary">
          <button class="btn btn--ghost" @click="$emit('explore-rooms')">See the Rooms</button>
          <button class="btn btn--ghost" @click="$emit('explore-tour')">Step Inside →</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  heroImage: string
  whatsappUrl: string
  roomCount: number
}>()

defineEmits<{
  (e: 'chat-click'): void
  (e: 'explore-rooms'): void
  (e: 'explore-tour'): void
}>()
</script>

<style scoped>
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  background: #10100d;
}
.hero__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 40%;
}
.hero__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--scrim-top) 0%, transparent 38%, var(--scrim-bottom) 100%);
}
.hero__inner {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 48px 24px 64px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.hero__eyebrow {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #E8C98A;
  margin: 0;
}
.hero__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(2.6rem, 8vw, 4.6rem);
  line-height: 1.02;
  letter-spacing: -0.01em;
  color: #F7F1E4;
  margin: 0;
  max-width: 14ch;
  text-wrap: balance;
}
.hero__sub {
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: rgba(247, 241, 228, 0.82);
  max-width: 46ch;
  margin: 0;
  font-family: var(--font-body);
}
.hero__ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 54px;
  padding: 0 26px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.98rem;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}
.btn--whatsapp {
  background: var(--whatsapp);
  color: var(--whatsapp-ink);
  box-shadow: 0 10px 28px rgba(31, 168, 85, 0.28);
}
.btn--ghost {
  background: rgba(247, 241, 228, 0.08);
  border-color: rgba(247, 241, 228, 0.3);
  color: #F7F1E4;
  backdrop-filter: blur(8px);
}
.hero__secondary {
  display: flex;
  gap: 10px;
}

@media (min-width: 780px) {
  .hero__inner { padding: 64px 48px 96px; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
</style>
