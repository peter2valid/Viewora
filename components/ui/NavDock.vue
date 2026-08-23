<template>
  <nav class="nav-dock" aria-label="Primary" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
    <div class="nav-dock__inner">
      <UiNavDockItem
        v-for="item in items"
        :key="item.key"
        :icon="item.icon"
        :label="item.label"
        :to="item.to"
        :disabled="item.disabled"
        :active="item.key === active"
        :mouse-x="mouseX"
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { useMotionValue } from 'motion-v'

defineProps<{
  active?: 'home' | 'search' | 'profile'
}>()

const mouseX = useMotionValue(Infinity)
function onMouseMove(e: MouseEvent) { mouseX.set(e.clientX) }
function onMouseLeave() { mouseX.set(Infinity) }

const HomeIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M3 11l9-8 9 8' }),
  h('path', { d: 'M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10' }),
])
const SearchIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('circle', { cx: '11', cy: '11', r: '7' }),
  h('path', { d: 'm21 21-4.3-4.3' }),
])
const ProfileIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('circle', { cx: '12', cy: '8', r: '4' }),
  h('path', { d: 'M4 21c0-4 4-6 8-6s8 2 8 6' }),
])

// No Chats tab — there's no real in-app chat, only WhatsApp handoff from a
// listing itself, so a nav item for it would just be a dead end.
const items = [
  { key: 'home' as const, icon: HomeIcon, label: 'Home', to: '/view' },
  { key: 'search' as const, icon: SearchIcon, label: 'Search', to: '/view/search' },
  { key: 'profile' as const, icon: ProfileIcon, label: 'Profile', to: '/view/profile' },
]
</script>

<style scoped>
.nav-dock {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
  display: flex; justify-content: center;
  padding-bottom: max(14px, env(safe-area-inset-bottom));
  pointer-events: none;
}
.nav-dock__inner {
  pointer-events: auto;
  display: flex; align-items: center; gap: 2px;
  padding: 6px; border-radius: 999px;
  background: var(--vo-glass, rgba(255,255,255,0.86));
  backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid var(--vo-border, rgba(28,29,33,0.06));
  box-shadow: 0 12px 32px rgba(0,0,0,0.18);
}
:global(.dark) .nav-dock__inner {
  background: var(--vo-glass, rgba(13,13,13,0.78));
  border-color: rgba(255,255,255,0.08);
}
</style>
