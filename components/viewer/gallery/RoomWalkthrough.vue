<template>
  <section id="walkthrough" class="wrap">
    <div class="section__head">
      <p class="mono-tag">The Walkthrough</p>
      <h2 class="section__title">The path you'd actually walk.</h2>
      <p class="section__lede">{{ rooms.length }} rooms, in the order you'd move through them in person.</p>
    </div>
    <div class="rooms">
      <div v-for="(room, idx) in rooms" :key="room.id" class="room-card">
        <img loading="lazy" :src="room.thumbnail_url" :alt="room.name" />
        <div class="room-card__scrim" />
        <div class="room-card__label">
          <span class="room-card__index">{{ String(idx + 1).padStart(2, '0') }}</span>
          <span class="room-card__name">{{ room.name }}</span>
        </div>
      </div>
    </div>
    <p class="rooms-hint mono-tag">← Swipe through the rooms →</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  rooms: Array<{ id: string; name: string; thumbnail_url: string }>
}>()
</script>

<style scoped>
.wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding: 88px 24px;
}
.mono-tag {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brass);
  margin: 0;
}
.section__head {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 40px;
}
.section__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.7rem, 3.4vw, 2.5rem);
  margin: 0;
  letter-spacing: -0.01em;
  text-wrap: balance;
  color: var(--ink);
}
.section__lede {
  font-family: var(--font-body);
  font-size: 1.02rem;
  color: var(--ink-soft);
  max-width: 56ch;
  margin: 0;
}
.rooms {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 8px;
  margin: 0 -24px;
  padding-left: 24px;
  padding-right: 24px;
  scrollbar-width: none;
}
.rooms::-webkit-scrollbar { display: none; }
.room-card {
  position: relative;
  flex: 0 0 auto;
  width: min(72vw, 300px);
  aspect-ratio: 4 / 5;
  border-radius: 18px;
  overflow: hidden;
  scroll-snap-align: start;
  background: var(--ground-raised);
  box-shadow: 0 12px 30px var(--shadow);
}
.room-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.room-card__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 55%, rgba(10, 8, 5, 0.88) 100%);
}
.room-card__label {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.room-card__index {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  color: #E8C98A;
}
.room-card__name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.2rem;
  color: #F7F1E4;
}
.rooms-hint {
  margin-top: 16px;
  color: var(--ink-soft);
}

@media (min-width: 780px) {
  .wrap { padding: 128px 48px; }
  .rooms { margin: 0 -48px; padding-left: 48px; padding-right: 48px; }
}
</style>
