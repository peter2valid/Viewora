<template>
  <!-- Inline strip variant (default) -->
  <NuxtLink
    v-if="variant === 'strip'"
    to="/app/capture"
    class="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl bg-success-bg/60 border border-success/20 hover:border-success/40 transition-colors"
  >
    <span class="flex-shrink-0 w-7 h-7 rounded-lg bg-success-bg border border-success/25 flex items-center justify-center text-success">
      <UiIcon name="camera" :size="14" :stroke-width="2.2" />
    </span>
    <span class="flex-1 min-w-[200px] text-xs font-medium text-dim">
      No 360&deg; photos? <strong class="text-main font-bold">Claim your free demo shoot</strong> — we come to your property, capture it, upload it.
    </span>
    <span class="flex-shrink-0 text-[11px] font-bold uppercase tracking-wide text-success px-2.5 py-1 rounded-md bg-success-bg border border-success/25">
      Claim Free &rarr;
    </span>
  </NuxtLink>

  <!-- Card variant (editor / empty state) -->
  <div v-else-if="variant === 'card'" class="flex items-start gap-3 mt-2.5 p-4 rounded-xl bg-success-bg/60 border border-success/20">
    <span class="flex-shrink-0 w-8 h-8 rounded-lg bg-success-bg border border-success/25 flex items-center justify-center text-success">
      <UiIcon name="camera" :size="16" :stroke-width="2" />
    </span>
    <div class="flex-1 min-w-0">
      <p class="text-xs font-bold text-main mb-0.5">Claim your free demo shoot</p>
      <p class="text-xs text-dim leading-relaxed">No 360&deg; camera needed. One free professional shoot per account — we come to you.</p>
    </div>
    <UiButton to="/app/capture" variant="success" size="sm" class="flex-shrink-0 self-center">Book a Shoot</UiButton>
  </div>

  <!-- Button variant (inline next to another button) -->
  <UiButton
    v-else-if="variant === 'btn'"
    to="/app/capture"
    variant="success"
  >
    <UiIcon name="camera" :size="14" :stroke-width="2.2" />
    Book a Shoot
  </UiButton>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'strip' | 'card' | 'btn' }>(), { variant: 'strip' })
</script>
