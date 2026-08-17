<template>
  <NuxtLink
    :to="to"
    :title="collapsed ? label : undefined"
    class="flex items-center h-10 rounded-lg text-sm font-semibold transition-all duration-150 group"
    :class="[
      isActive
        ? 'bg-main text-bg dark:bg-white/[0.15] dark:text-white'
        : 'text-dim hover:text-main hover:bg-main/5 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800/60',
      collapsed ? 'justify-center px-0' : 'gap-3 px-3'
    ]"
  >
    <UiIcon :name="iconName" :size="16" class="flex-shrink-0" :class="isActive ? 'text-bg dark:text-white' : 'text-dim group-hover:text-main dark:group-hover:text-white'" />
    <span v-if="!collapsed" class="tracking-tight truncate">{{ label }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { IconName } from '~/types/icon'

const props = defineProps<{
  to: string
  label: string
  icon: 'dashboard' | 'spaces' | 'leads' | 'analytics' | 'billing' | 'settings' | 'capture'
  isActive?: boolean
  collapsed?: boolean
}>()

const iconMap: Record<typeof props.icon, IconName> = {
  dashboard: 'dashboard',
  spaces: 'spaces',
  leads: 'users',
  analytics: 'bar-chart',
  billing: 'billing',
  settings: 'settings',
  capture: 'camera',
}

const iconName = iconMap[props.icon]
</script>
