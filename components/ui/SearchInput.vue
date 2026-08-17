<template>
  <div class="relative flex items-center h-10 w-full">
    <span class="absolute left-3 text-dim pointer-events-none">
      <UiIcon name="search" :size="15" :stroke-width="2.5" />
    </span>
    <input
      ref="inputRef"
      :value="modelValue"
      type="text"
      class="w-full h-full pl-9 pr-8 bg-surface-alt border border-transparent rounded-lg text-sm text-main placeholder:text-dim outline-none transition-colors focus:bg-surface focus:border-border"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      v-if="modelValue"
      type="button"
      class="absolute right-2.5 text-dim hover:text-main transition-colors"
      aria-label="Clear search"
      @click="$emit('update:modelValue', '')"
    >
      <UiIcon name="close" :size="13" :stroke-width="2.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  modelValue: string
  placeholder?: string
}>()
defineEmits<{ 'update:modelValue': [value: string] }>()

const inputRef = ref<HTMLInputElement>()
defineExpose({ focus: () => inputRef.value?.focus() })
</script>
