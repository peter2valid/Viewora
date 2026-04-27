<template>
  <div class="h-full flex flex-col items-center justify-center animate-in fade-in duration-300">
    <div class="w-full max-w-[600px] mt-12 px-4 sm:px-6 flex flex-col items-center">
      <div class="mb-8 w-full">
        <button @click="navigateTo('/app/spaces')" class="text-sm font-semibold text-dim hover:text-main mb-8 flex items-center gap-1 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back
        </button>
        <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-alt text-main rounded-lg text-[13px] font-bold mb-4 border border-border">
          Creating: {{ selectedOptionData?.title }} {{ selectedOptionData?.emoji }}
        </div>
        <h1 class="text-3xl font-bold text-main mb-2 tracking-tight">Basic Setup</h1>
        <p class="text-base text-dim">Give your tour a name to start building.</p>
      </div>

      <div class="w-full card-glass p-6 md:p-10 rounded-2xl space-y-6">

        <div class="space-y-2">
          <label class="text-sm font-bold text-main">Tour Name <span class="text-red-500">*</span></label>
          <input
            v-model="tourName"
            type="text"
            placeholder="e.g. 123 Main Street"
            autofocus
            class="w-full px-4 py-3.5 bg-surface-alt border border-border rounded-xl text-main text-base outline-none focus:bg-surface focus:border-main focus:ring-1 focus:ring-main transition-all placeholder:text-dim"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-bold text-main">Location <span class="text-dim font-normal">(Optional)</span></label>
          <input
            v-model="locationText"
            type="text"
            placeholder="City, Neighborhood etc."
            class="w-full px-4 py-3.5 bg-surface-alt border border-border rounded-xl text-main text-base outline-none focus:bg-surface focus:border-main focus:ring-1 focus:ring-main transition-all placeholder:text-dim"
          />
        </div>

        <div v-if="errorMsg" class="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
          {{ errorMsg }}
        </div>

        <div class="pt-4">
          <button
            class="btn btn-primary w-full !h-14 !rounded-xl"
            :disabled="!tourName.trim() || creating"
            @click="handleCreateTour"
          >
            <div v-if="creating" class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            {{ creating ? 'Creating Tour...' : 'Create Tour' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta, navigateTo, useRoute } from '#imports'
import { useSpaces } from '~/composables/useSpaces'

definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const { createSpace } = useSpaces()
const route = useRoute()

const selectedType = computed(() => (route.query.type as string) || 'residential')
const tourName = ref('')
const locationText = ref('')
const creating = ref(false)
const errorMsg = ref<string | null>(null)

const typeLabels: Record<string, { title: string; emoji: string }> = {
  residential: { title: 'Property / Space', emoji: '🏠' },
  automotive:  { title: 'Car / Vehicle',       emoji: '🚗' },
  commercial:  { title: 'Business / Institution', emoji: '🏢' },
  other:       { title: 'Multiple Items',       emoji: '📦' },
}

const selectedOptionData = computed(() => typeLabels[selectedType.value])

const handleCreateTour = async () => {
  if (!tourName.value.trim()) return
  creating.value = true
  errorMsg.value = null
  try {
    const space = await createSpace({
      title: tourName.value,
      space_type: selectedType.value,
      location_text: locationText.value || undefined
    })
    navigateTo(`/app/spaces/${space.id}?tab=360`)
  } catch (e: any) {
    errorMsg.value = e.data?.statusMessage ?? e.message ?? 'Failed to create tour.'
    creating.value = false
  }
}
</script>
