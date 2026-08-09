<template>
  <div class="start-page h-screen flex flex-col items-center justify-center">

    <!-- STEP 1: Type Selection -->
    <div v-if="step === 1" class="w-full max-w-[900px] mt-6 md:mt-12 px-4 flex flex-col items-center">
      <div class="text-center mb-8 md:mb-12 w-full">
        <h1 class="text-3xl md:text-4xl font-extrabold text-main mb-3 md:mb-4 tracking-tighter">What are you creating?</h1>
        <p class="text-sm md:text-base text-dim max-w-lg mx-auto">No account needed yet — choose a type and start building. You can save it to an account later.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 w-full max-w-[800px] mx-auto min-h-[320px]">
        <div
          v-for="option in typeOptions"
          :key="option.id"
          class="flex items-center p-5 md:p-8 rounded-[2rem] transition-all duration-500 cursor-pointer border border-zinc-700/40 bg-zinc-800 hover:bg-zinc-700 group relative overflow-hidden"
          :class="[
            selectedType === option.id
              ? 'ring-1 ring-zinc-400 bg-[#121214] shadow-[0_0_40px_rgba(255,255,255,0.03)] scale-[1.02]'
              : 'hover:border-white/10'
          ]"
          @click="selectedType = option.id"
        >
          <div v-if="selectedType === option.id" class="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>
          <div
            class="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 z-10 text-2xl"
            :class="selectedType === option.id ? 'bg-white text-black' : 'bg-white/10 text-white group-hover:bg-white/20'"
          >
            {{ option.emoji }}
          </div>
          <div class="ml-5 md:ml-6 flex-1 z-10">
            <h3 class="text-base md:text-xl font-bold text-white leading-tight">{{ option.title }}</h3>
            <p class="text-[13px] md:text-sm text-zinc-300 mt-1.5 leading-snug group-hover:text-white transition-colors">{{ option.description }}</p>
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
    <div v-else-if="step === 2" class="w-full max-w-[600px] mt-12 px-4 sm:px-6 flex flex-col items-center animate-in slide-in-from-right-4 duration-300">
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
            {{ creating ? 'Setting up...' : 'Start Building' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { definePageMeta, navigateTo } from '#imports'
import { useSpaces } from '~/composables/useSpaces'
import { useAnonymousAuth } from '~/composables/useAnonymousAuth'

// Public — no auth guard, no dashboard layout. ensureSession() below
// silently starts an anonymous Supabase session if the visitor isn't
// signed in, so the existing authenticated /spaces and /uploads/* routes
// work completely unchanged.
definePageMeta({ layout: false })

const { createSpace } = useSpaces()
const { ensureSession } = useAnonymousAuth()

const step = ref(1)
const selectedType = ref<string>('')
const tourName = ref('')
const locationText = ref('')
const creating = ref(false)
const errorMsg = ref<string | null>(null)

const typeOptions = [
  { id: 'residential', title: 'Property / Space', description: 'Apartments, Airbnb, hotels', emoji: '🏠' },
  { id: 'automotive', title: 'Car / Vehicle', description: 'Show interior and exterior views', emoji: '🚗' },
  { id: 'commercial', title: 'Business / Institution', description: 'Schools, offices, facilities', emoji: '🏢' },
  { id: 'other', title: 'Multiple Items', description: 'Show multiple tours in one link', emoji: '📦' },
]

const selectedOptionData = computed(() => typeOptions.find(o => o.id === selectedType.value))

const handleCreateTour = async () => {
  if (!tourName.value.trim() || !selectedType.value) return

  creating.value = true
  errorMsg.value = null

  try {
    await ensureSession()

    const space = await createSpace({
      title: tourName.value,
      space_type: selectedType.value,
      location_text: locationText.value || undefined,
    })

    // Same editor real accounts use — anonymous sessions pass middleware/auth.ts
    // unchanged, so uploads, publishing, and the claim banner all work here too.
    navigateTo(`/app/spaces/${space.id}?tab=360`)
  } catch (e: any) {
    errorMsg.value = e.data?.statusMessage ?? e.message ?? 'Failed to start your tour.'
    creating.value = false
  }
}
</script>

<style scoped>
.start-page {
  background: var(--color-bg, #0a0a0a);
}
</style>
