<template>
  <Teleport to="body">
    <Transition name="confirm-modal">
      <div v-if="isOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" @click="handleCancel"></div>
        <div class="relative w-full max-w-sm bg-card border border-border dark:border-transparent rounded-2xl shadow-lg overflow-hidden animate-modal-in">
          <!-- Header -->
          <div class="px-6 pt-6 pb-5 text-center">
            <!-- Icon -->
            <div :class="['w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4',
                          isDangerous ? 'bg-danger-bg text-danger' : 'bg-surface-alt text-dim']">
              <slot name="icon">
                <UiIcon :name="isDangerous ? 'trash' : 'check'" :size="20" />
              </slot>
            </div>

            <!-- Title & Description -->
            <h3 class="text-base font-bold text-main mb-1.5">{{ title }}</h3>
            <p class="text-sm text-dim leading-relaxed">{{ message }}</p>
          </div>

          <!-- Actions -->
          <div class="px-6 pb-6 flex flex-col gap-2">
            <UiButton :variant="isDangerous ? 'danger' : 'primary'" :loading="loading" @click="handleConfirm">
              {{ loading ? 'Processing...' : confirmText }}
            </UiButton>
            <UiButton variant="ghost" :disabled="loading" @click="handleCancel">
              {{ cancelText }}
            </UiButton>
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
