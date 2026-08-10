<template>
  <div
    class="group relative flex flex-col bg-card border border-border dark:border-transparent rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer"
    @click="$emit('open')"
  >
    <!-- Thumbnail -->
    <div class="relative aspect-[16/9] w-full bg-surface-alt overflow-hidden border-b border-border dark:border-white/5 flex-shrink-0">
      <NuxtImg
        v-if="space.cover_image_url && !imgFailed"
        :src="space.cover_image_url"
        :alt="space.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        width="400"
        height="225"
        format="webp"
        quality="80"
        loading="lazy"
        @error="imgFailed = true"
      />
      <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1.5 text-dim/40">
        <UiIcon name="image" :size="28" :stroke-width="1.5" />
        <span class="text-[10px] font-bold uppercase tracking-widest">360&deg; Tour</span>
      </div>

      <div class="absolute top-3 left-3">
        <UiBadge :status="space.is_published ? 'published' : 'draft'" dot>
          {{ space.is_published ? 'Published' : 'Draft' }}
        </UiBadge>
      </div>

      <div v-if="$slots.overlay" class="absolute inset-0 bg-bg/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 backdrop-blur-[2px]">
        <slot name="overlay" />
      </div>
    </div>

    <!-- Info -->
    <div class="flex-1 p-4 flex items-center justify-between gap-2" :class="selected ? 'bg-surface-alt' : ''">
      <div class="min-w-0">
        <h3 class="text-sm font-bold text-main truncate" :title="space.title">{{ space.title }}</h3>
        <p class="text-xs text-dim mt-0.5">{{ metaText }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-0.5 flex-shrink-0" @click.stop>
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Space } from '~/composables/useSpaces'

const props = withDefaults(defineProps<{
  space: Space
  selected?: boolean
  views?: number
}>(), {
  selected: false,
})

defineEmits<{ open: [] }>()

const imgFailed = ref(false)

const metaText = computed(() => {
  if (typeof props.views === 'number') return `${props.views} view${props.views === 1 ? '' : 's'}`
  return new Date(props.space.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
})
</script>
