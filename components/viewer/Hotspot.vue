<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

interface Props {
  id: string
  type: 'info' | 'scene_link' | 'url'
  label?: string | null
  x: number
  y: number
  visible: boolean
  isEditing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  isEditing: false
})

const emit = defineEmits<{
  (e: 'click', id: string): void
  (e: 'remove', id: string): void
}>()

const style = computed<CSSProperties>(() => ({
  transform: `translate3d(${props.x}px, ${props.y}px, 0)`,
  opacity: props.visible ? 1 : 0,
  pointerEvents: props.visible ? 'auto' : 'none',
  zIndex: props.visible ? 10 : -1
}))

const icons = {
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  scene_link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  url: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`
}
</script>

<template>
  <div
    class="absolute top-0 left-0 transition-opacity duration-200"
    :style="style"
  >
    <div class="relative group -translate-x-1/2 -translate-y-1/2">
      <!-- Pulsing ring -->
      <div 
        class="absolute inset-0 rounded-full bg-emerald-500/20 border border-emerald-500/40 animate-ping opacity-40 group-hover:opacity-60"
        style="animation-duration: 2s"
      />

      <!-- Core marker -->
      <button
        @click.stop="emit('click', id)"
        class="relative flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900/80 border border-white/20 text-white shadow-xl backdrop-blur-md transition-transform hover:scale-110 active:scale-95 overflow-hidden"
        :class="{ 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-900': isEditing }"
      >
        <div 
          class="w-4 h-4" 
          v-html="icons[type] || icons.info" 
        />
        
        <!-- Ripple effect overlay -->
        <div class="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
      </button>

      <!-- Label -->
      <div 
        v-if="label"
        class="absolute top-full left-1/2 mt-2 -translate-x-1/2 px-2 py-1 rounded-md bg-zinc-900/90 border border-white/10 text-[11px] font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm shadow-lg"
      >
        {{ label }}
      </div>

      <!-- Remove button (only in edit mode, shown on hover) -->
      <button
        v-if="isEditing"
        @click.stop="emit('remove', id)"
        class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md scale-0 group-hover:scale-100 transition-transform origin-bottom-left"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="w-2.5 h-2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>
