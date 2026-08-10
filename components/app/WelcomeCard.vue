<template>
  <div class="mx-auto max-w-xl w-full mt-12 md:mt-20">
    <div class="bg-card border border-border dark:border-transparent rounded-2xl p-8 sm:p-12 flex flex-col items-center text-center">
      <div class="w-11 h-11 rounded-full bg-main/5 flex items-center justify-center text-main mb-5">
        <UiIcon name="sparkle" :size="20" />
      </div>
      <h2 class="text-2xl font-bold text-main mb-2 tracking-tight">Welcome to Viewora</h2>
      <p class="text-dim mb-8 text-sm max-w-sm">Capturing reality has never been this simple. Create your first immersive experience in minutes.</p>

      <div class="flex items-center justify-center gap-3 sm:gap-6 mb-10 w-full">
        <div v-for="(step, i) in steps" :key="step" class="flex items-center gap-2">
          <template v-if="i > 0">
            <div class="w-4 md:w-8 h-px bg-border" />
          </template>
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-surface-alt border border-border flex items-center justify-center text-[11px] font-bold text-main flex-shrink-0">{{ i + 1 }}</div>
            <p class="hidden sm:block text-[13px] font-semibold text-main">{{ step }}</p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3 w-full max-w-sm">
        <div class="flex flex-col sm:flex-row gap-3 w-full">
          <UiButton variant="primary" class="flex-1" @click="$emit('create')">
            <UiIcon name="plus" :size="16" :stroke-width="2.5" />
            Start Creating
          </UiButton>
          <UiButton to="/app/spaces" variant="secondary" class="flex-1">
            <UiIcon name="spaces" :size="16" />
            My Portfolio
          </UiButton>
        </div>
        <AppCaptureNudge v-if="showCaptureNudge" variant="strip" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ showCaptureNudge?: boolean }>(), { showCaptureNudge: false })
defineEmits<{ create: [] }>()

const steps = ['Define', 'Upload', 'Share']
</script>
