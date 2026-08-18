<template>
  <component
    :is="tag"
    :to="tag !== 'span' ? to : undefined"
    class="tab"
    :class="{ 'tab--active': active, 'tab--disabled': disabled }"
    :title="disabled ? 'Coming soon' : undefined"
  >
    <span ref="iconEl" class="tab__icon" :style="iconStyle">
      <component :is="icon" />
    </span>
    <span class="tab__label">{{ label }}</span>
  </component>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Component } from 'vue'
import { useSpring, useTransform, type MotionValue } from 'motion-v'
import { NuxtLink } from '#components'

const props = withDefaults(defineProps<{
  icon: Component
  label: string
  to?: string
  disabled?: boolean
  active?: boolean
  mouseX: MotionValue<number>
  baseSize?: number
  maxSize?: number
  distance?: number
}>(), {
  baseSize: 22,
  maxSize: 30,
  distance: 90,
})

const tag = computed(() => (props.disabled || props.active ? 'span' : NuxtLink))
const iconEl = ref<HTMLElement>()

// Magnification is a desktop/pointer-only enhancement — mouseX stays at
// Infinity on touch devices (no mousemove ever fires), so currentSize just
// stays at baseSize there and the row renders as a plain static nav.
const dist = useTransform(props.mouseX, (val: number) => {
  const rect = iconEl.value?.getBoundingClientRect()
  if (!rect || !Number.isFinite(val)) return Infinity
  return val - (rect.left + rect.width / 2)
})
const targetSize = useTransform(dist, (d: number) => {
  if (!Number.isFinite(d)) return props.baseSize
  const clamped = Math.max(-props.distance, Math.min(props.distance, d))
  const t = 1 - Math.abs(clamped) / props.distance
  return props.baseSize + (props.maxSize - props.baseSize) * t
})
const size = useSpring(targetSize, { mass: 0.1, stiffness: 170, damping: 14 })

const currentSize = ref(props.baseSize)
let unsub: (() => void) | undefined
onMounted(() => {
  unsub = size.on('change', (v: number) => { currentSize.value = v })
})
onUnmounted(() => unsub?.())

const iconStyle = computed(() => {
  const scale = currentSize.value / props.baseSize
  const lift = (currentSize.value - props.baseSize) * 0.55
  return {
    transform: `translateY(${-lift}px) scale(${scale})`,
  }
})
</script>

<style scoped>
.tab {
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 9px 0 8px;
  color: var(--vo-muted, var(--text-dim));
  text-decoration: none;
}
.tab__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 21px;
  height: 21px;
  transform-origin: bottom center;
  will-change: transform;
}
.tab__icon :deep(svg) { width: 21px; height: 21px; display: block; }
.tab__label { font-size: 0.62rem; font-weight: 700; }
.tab--active { color: var(--vo-text, var(--accent)); }
.tab--disabled { opacity: 0.45; }
</style>
