<template>
  <Teleport to="body">
    <Transition name="onboard-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-bg"
        aria-modal="true"
        role="dialog"
      >
        <!-- Step 1 — Name -->
        <div
          v-if="step === 1"
          class="w-full max-w-md px-6 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div class="w-14 h-14 rounded-2xl bg-main flex items-center justify-center mb-6 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-bg"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
          <h1 class="text-3xl font-extrabold text-main tracking-tight mb-2">Welcome to Viewora</h1>
          <p class="text-dim text-sm mb-10">Let's get you set up in two quick steps.</p>

          <div class="w-full space-y-4 text-left">
            <div class="space-y-1.5">
              <label class="text-sm font-bold text-main">Your Name <span class="text-dim font-normal">(Optional)</span></label>
              <input
                v-model="fullName"
                type="text"
                placeholder="e.g. David Kamau"
                maxlength="120"
                class="w-full px-4 py-3.5 bg-surface-alt border border-border rounded-xl text-main text-base outline-none focus:bg-surface focus:border-main focus:ring-1 focus:ring-main transition-all placeholder:text-dim"
                @keydown.enter="goToStep2"
              />
            </div>
          </div>

          <button
            class="btn btn-primary w-full !h-14 !rounded-xl mt-8"
            @click="goToStep2"
          >
            Continue
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </button>

          <!-- Step dots -->
          <div class="flex gap-2 mt-8">
            <span class="w-6 h-1.5 rounded-full bg-main"></span>
            <span class="w-2 h-1.5 rounded-full bg-border"></span>
          </div>
        </div>

        <!-- Step 2 — Create first tour -->
        <div
          v-else-if="step === 2"
          class="w-full max-w-[640px] px-6 flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-300"
        >
          <div class="text-center mb-8">
            <h1 class="text-3xl font-extrabold text-main tracking-tight mb-2">
              {{ fullName ? `Hi ${firstName}, let's` : "Let's" }} create your first tour
            </h1>
            <p class="text-dim text-sm">Pick a type and give it a name.</p>
          </div>

          <!-- Type grid -->
          <div class="grid grid-cols-2 gap-3 w-full mb-6">
            <button
              v-for="opt in typeOptions"
              :key="opt.id"
              class="flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer"
              :class="selectedType === opt.id
                ? 'border-main bg-main/5 ring-1 ring-main'
                : 'border-border bg-surface-alt hover:border-main/30 hover:bg-surface'"
              @click="selectedType = opt.id"
            >
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                :class="selectedType === opt.id ? 'bg-main text-bg' : 'bg-surface text-dim'"
              >
                <svg v-if="opt.id === 'residential'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <svg v-else-if="opt.id === 'automotive'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                <svg v-else-if="opt.id === 'commercial'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="8" height="8" rx="2"/><rect x="14" y="2" width="8" height="8" rx="2"/><rect x="2" y="14" width="8" height="8" rx="2"/><rect x="14" y="14" width="8" height="8" rx="2"/></svg>
              </div>
              <div>
                <p class="text-sm font-bold text-main leading-tight">{{ opt.title }}</p>
                <p class="text-[11px] text-dim mt-0.5">{{ opt.description }}</p>
              </div>
            </button>
          </div>

          <!-- Tour name -->
          <div class="w-full space-y-1.5 mb-2">
            <label class="text-sm font-bold text-main">Tour Name <span class="text-red-500">*</span></label>
            <input
              v-model="tourName"
              type="text"
              placeholder="e.g. 3 Bedroom Apartment, Karen"
              maxlength="200"
              class="w-full px-4 py-3.5 bg-surface-alt border border-border rounded-xl text-main text-base outline-none focus:bg-surface focus:border-main focus:ring-1 focus:ring-main transition-all placeholder:text-dim"
              @keydown.enter="handleCreate"
            />
          </div>

          <p v-if="errorMsg" class="text-red-500 text-sm mt-2 w-full">{{ errorMsg }}</p>

          <div class="flex gap-3 w-full mt-6">
            <button
              class="btn btn-secondary !h-12 px-5 !rounded-xl"
              @click="step = 1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button
              class="btn btn-primary flex-1 !h-12 !rounded-xl"
              :disabled="!tourName.trim() || !selectedType || creating"
              @click="handleCreate"
            >
              <div v-if="creating" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              {{ creating ? 'Creating...' : 'Create Tour & Start Uploading' }}
            </button>
          </div>

          <!-- Step dots -->
          <div class="flex gap-2 mt-8">
            <span class="w-2 h-1.5 rounded-full bg-border"></span>
            <span class="w-6 h-1.5 rounded-full bg-main"></span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo } from '#imports'
import { useSpaces } from '~/composables/useSpaces'
import { useApiFetch } from '~/composables/useApiFetch'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'done'): void }>()

const { createSpace } = useSpaces()
const { apiFetch } = useApiFetch()

const step = ref(1)
const fullName = ref('')
const selectedType = ref('residential')
const tourName = ref('')
const creating = ref(false)
const errorMsg = ref('')

const firstName = computed(() => fullName.value.trim().split(' ')[0] || '')

const typeOptions = [
  { id: 'residential', title: 'Property / Space', description: 'Apartments, hotels, Airbnb' },
  { id: 'automotive', title: 'Car / Vehicle', description: 'Interior & exterior views' },
  { id: 'commercial', title: 'Business / Office', description: 'Schools, offices, shops' },
  { id: 'other', title: 'Other / Multiple', description: 'Multiple items or custom' },
]

function goToStep2() {
  if (fullName.value.trim()) {
    apiFetch('/profile', { method: 'PATCH', body: { full_name: fullName.value.trim() } }).catch(() => {})
  }
  step.value = 2
}

async function handleCreate() {
  if (!tourName.value.trim() || !selectedType.value) return
  creating.value = true
  errorMsg.value = ''
  try {
    const space = await createSpace({
      title: tourName.value.trim(),
      space_type: selectedType.value,
    })
    emit('done')
    navigateTo(`/app/spaces/${space.id}?tab=360`)
  } catch (e: any) {
    errorMsg.value = e.data?.statusMessage ?? e.message ?? 'Failed to create tour.'
    creating.value = false
  }
}
</script>

<style scoped>
.onboard-fade-enter-active,
.onboard-fade-leave-active {
  transition: opacity 0.25s ease;
}
.onboard-fade-enter-from,
.onboard-fade-leave-to {
  opacity: 0;
}
</style>
