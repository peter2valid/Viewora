<template>
  <div class="car-spin-root">
    <div ref="containerEl" class="car-spin-canvas" />
    <div v-if="!frames.length" class="car-spin-empty">
      <p class="car-spin-empty__label">No frames loaded</p>
    </div>
    <div v-else class="car-spin-pending">
      <p class="car-spin-pending__label">Car viewer — integration pending</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  frames: string[]
}>()

// Car viewer integration is pending — placeholder component only.
// When @cloudimage/360-view is ready, restore initCarViewer / destroyCar from a new adapter.
const containerEl = ref<HTMLElement | null>(null)
</script>

<style scoped>
.car-spin-root {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
}
.car-spin-canvas { position: absolute; inset: 0; }
.car-spin-empty,
.car-spin-pending {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.car-spin-empty__label,
.car-spin-pending__label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
