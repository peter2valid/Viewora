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
  active?: 'home' | 'search' | 'chats' | 'profile'
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
const ChatIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' }),
])
const ProfileIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('circle', { cx: '12', cy: '8', r: '4' }),
  h('path', { d: 'M4 21c0-4 4-6 8-6s8 2 8 6' }),
])

const items = [
  { key: 'home' as const, icon: HomeIcon, label: 'Home', to: '/view' },
  { key: 'search' as const, icon: SearchIcon, label: 'Search', to: '/view/search' },
  { key: 'chats' as const, icon: ChatIcon, label: 'Chats', to: undefined, disabled: true },
  { key: 'profile' as const, icon: ProfileIcon, label: 'Profile', to: undefined, disabled: true },
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
  background: rgba(255,255,255,0.86);
  backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(28,29,33,0.06);
  box-shadow: 0 12px 32px rgba(15,13,10,0.28);
}
@media (prefers-color-scheme: dark) {
  .nav-dock__inner { background: rgba(28,30,34,0.78); border-color: rgba(255,255,255,0.08); }
}
</style>
