<template>
  <Teleport to="body">
    <Transition name="confirm-modal">
      <div v-if="isOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" @click="handleCancel"></div>
        <div class="relative w-full max-w-sm bg-white  rounded-xl shadow-xl overflow-hidden animate-modal-in border border-zinc-200 ">
          <!-- Header -->
          <div class="px-6 pt-6 pb-5 text-center">
            <!-- Icon -->
            <div :class="['w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4',
                          isDangerous ? 'bg-rose-50  text-rose-500' : 'bg-zinc-100  text-zinc-600 ']">
              <slot name="icon">
                <svg v-if="isDangerous" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </slot>
            </div>

            <!-- Title & Description -->
            <h3 class="text-base font-semibold text-zinc-900  mb-1.5">{{ title }}</h3>
            <p class="text-sm text-zinc-500  leading-relaxed">{{ message }}</p>
          </div>

          <!-- Actions -->
          <div class="px-6 pb-6 flex flex-col gap-2">
            <button
              :class="['w-full py-2.5 text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2',
                       isDangerous ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-zinc-900 text-white hover:bg-zinc-800']"
              @click="handleConfirm"
              :disabled="loading"
            >
              <svg v-if="loading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>{{ loading ? 'Processing...' : confirmText }}</span>
            </button>
            <button
              class="w-full py-2.5 bg-zinc-50  text-zinc-600  text-sm font-medium rounded-lg hover:bg-zinc-100  border border-transparent  transition-all disabled:opacity-50"
              @click="handleCancel"
              :disabled="loading"
            >
              {{ cancelText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  isDangerous: false,
  loading: false
})

const emit = defineEmits(['confirm', 'cancel'])

const handleConfirm = () => emit('confirm')
const handleCancel = () => emit('cancel')
</script>

<style scoped>
.confirm-modal-enter-active, .confirm-modal-leave-active {
  transition: opacity 0.3s ease;
}
.confirm-modal-enter-from, .confirm-modal-leave-to {
  opacity: 0;
}

@keyframes modal-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.animate-modal-in {
  animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
