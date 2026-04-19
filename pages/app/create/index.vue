<template>
  <div class="h-full flex flex-col items-center justify-center animate-in fade-in duration-300">
    
    <!-- STEP 1: Type Selection -->
    <div v-if="step === 1" class="w-full max-w-[900px] mt-12 px-4 sm:px-6 flex flex-col items-center">
      <div class="text-center mb-10 w-full">
        <h1 class="text-3xl font-bold text-main mb-2 tracking-tight">What are you creating?</h1>
        <p class="text-base text-dim">Choose the type of tour to get the best setup</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 w-full max-w-[800px] mx-auto">
        <div 
          v-for="option in typeOptions" 
          :key="option.id"
          class="flex items-center h-[160px] p-6 rounded-2xl transition-all duration-300 cursor-pointer card-glass"
          :class="[
            selectedType === option.id 
              ? 'border-main ring-1 ring-main shadow-lg' 
              : 'border-border'
          ]"
          @click="selectedType = option.id"
        >
          <div 
            class="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300"
            :class="selectedType === option.id ? 'bg-main text-bg' : 'bg-surface-alt text-dim group-hover:bg-surface border border-border'"
          >
            <!-- Property -->
            <svg v-if="option.id === 'property'" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
            <!-- Car -->
            <svg v-else-if="option.id === 'car'" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
            <!-- Business -->
            <svg v-else-if="option.id === 'business'" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
            <!-- Multiple -->
            <svg v-else-if="option.id === 'multiple'" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="8" height="8" rx="2" ry="2"/><rect x="14" y="2" width="8" height="8" rx="2" ry="2"/><rect x="2" y="14" width="8" height="8" rx="2" ry="2"/><rect x="14" y="14" width="8" height="8" rx="2" ry="2"/></svg>
          </div>
          <div class="ml-5 flex-1">
            <h3 class="text-[17px] font-bold text-main leading-tight">{{ option.title }}</h3>
            <p class="text-[14px] text-dim mt-1.5 leading-snug">{{ option.description }}</p>
          </div>
        </div>
      </div>

      <div class="mt-10 w-full flex flex-col items-center">
        <p class="text-[13px] text-dim font-medium mb-6 text-center">Not sure? Start with Property — you can change later.</p>
        <button 
          class="btn btn-primary w-full md:w-[240px] !h-[54px] !rounded-xl"
          :disabled="!selectedType"
          @click="step = 2"
        >
          Continue
        </button>
      </div>
    </div>

    <!-- STEP 2: Basic Setup -->
    <div v-if="step === 2" class="w-full max-w-[600px] mt-12 px-4 sm:px-6 flex flex-col items-center animate-in slide-in-from-right-4 duration-300">
      <div class="mb-8 w-full">
        <button @click="step = 1" class="text-sm font-semibold text-dim hover:text-main mb-8 flex items-center gap-1 transition-colors">
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
import { definePageMeta, navigateTo } from '#imports'
import { useSpaces } from '~/composables/useSpaces'

definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const { createSpace } = useSpaces()

const step = ref(1)
const selectedType = ref<string>('')
const tourName = ref('')
const locationText = ref('')
const creating = ref(false)
const errorMsg = ref<string | null>(null)

const typeOptions = [
  { id: 'property', title: 'Property / Space', description: 'Apartments, Airbnb, hotels', emoji: '🏠' },
  { id: 'car', title: 'Car / Vehicle', description: 'Show interior and exterior views', emoji: '🚗' },
  { id: 'business', title: 'Business / Institution', description: 'Schools, offices, facilities', emoji: '🏢' },
  { id: 'multiple', title: 'Multiple Items', description: 'Show multiple tours in one link', emoji: '📦' },
]

const selectedOptionData = computed(() => typeOptions.find(o => o.id === selectedType.value))

const handleCreateTour = async () => {
  if (!tourName.value.trim() || !selectedType.value) return
  
  creating.value = true
  errorMsg.value = null
  
  try {
    const space = await createSpace({
      title: tourName.value,
      space_type: selectedType.value,
      location_text: locationText.value || undefined
    })
    
    // Auto route to the UPLOAD SCREEN! (360 Tab within the Editor)
    navigateTo(`/app/spaces/${space.id}?tab=360`)
  } catch (e: any) {
    errorMsg.value = e.data?.statusMessage ?? e.message ?? 'Failed to create tour.'
    creating.value = false
  }
}
</script>
