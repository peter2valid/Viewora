<template>
  <div class="space-pill" :title="name">
    <span class="space-pill__label">{{ name || 'MY TOUR' }}</span>
    <span class="space-pill__dot hidden sm:inline">•</span>
    <span class="space-pill__mode hidden sm:inline">{{ mode }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  mode: string
}>()
</script>

<style scoped>
.space-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06));
  border: 1px solid rgba(255,255,255,0.15);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
  max-width: 280px;
}

.space-pill__label {
  font-size: 11px;
  letter-spacing: 0.18em;
  font-weight: 700;
  color: rgba(255,255,255,0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 210px;
}

.space-pill__dot {
  color: rgba(255,255,255,0.45);
  font-size: 11px;
}

.space-pill__mode {
  font-size: 10px;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: rgba(255,255,255,0.65);
}

@media (max-width: 768px) {
  .space-pill { max-width: 40vw; }
  .space-pill__label { max-width: 26vw; }
}

@media (max-width: 480px) {
  .space-pill { max-width: 34vw; }
  .space-pill__label { max-width: 20vw; }
}
</style>
