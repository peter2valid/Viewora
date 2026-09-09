<template>
  <Teleport to="body">
    <Transition name="report-modal">
      <div v-if="open" class="report-overlay" @click.self="onClose">
        <div class="report-modal" role="dialog" aria-modal="true" aria-label="Report this listing">
          <div class="report-modal__topbar">
            <h2 class="report-modal__title">Report this listing</h2>
            <button class="report-modal__close" aria-label="Close" @click="onClose">
              <UiIcon name="close" :size="16" :stroke-width="2.4" />
            </button>
          </div>

          <div v-if="submitted" class="report-modal__success">
            <UiIcon name="check" :size="28" :stroke-width="2.4" />
            <p>Thanks — our team will review this listing.</p>
          </div>

          <form v-else class="report-modal__body" @submit.prevent="submit">
            <p class="report-modal__hint">Never send money before viewing a property in person. If something feels off, tell us why.</p>

            <div class="report-modal__reasons">
              <button
                v-for="opt in reasonOptions"
                :key="opt.value"
                type="button"
                class="report-modal__reason"
                :class="{ 'report-modal__reason--active': reason === opt.value }"
                @click="reason = opt.value"
              >{{ opt.label }}</button>
            </div>

            <textarea
              v-model="details"
              class="report-modal__textarea"
              placeholder="Anything else we should know? (optional)"
              maxlength="500"
              rows="3"
            />

            <p v-if="errorMsg" class="report-modal__error">{{ errorMsg }}</p>

            <button type="submit" class="report-modal__submit" :disabled="!reason || submitting">
              {{ submitting ? 'Submitting…' : 'Submit report' }}
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'

const props = defineProps<{
  open: boolean
  propertyId: string | null
}>()

const emit = defineEmits<{ close: [] }>()

const { apiFetch } = useApiFetch()

const reasonOptions = [
  { value: 'scam', label: 'Asking for payment before a viewing' },
  { value: 'spam', label: 'Spam or fake listing' },
  { value: 'incorrect_info', label: 'Incorrect information' },
  { value: 'impersonation', label: 'Impersonating someone else' },
  { value: 'inappropriate', label: 'Inappropriate content' },
] as const

const reason = ref('')
const details = ref('')
const submitting = ref(false)
const submitted = ref(false)
const errorMsg = ref('')

// Reset so a second report on a different listing (or a re-open) doesn't
// carry over the previous submission's state.
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    reason.value = ''
    details.value = ''
    submitting.value = false
    submitted.value = false
    errorMsg.value = ''
  }
})

function onClose() {
  emit('close')
}

async function submit() {
  if (!reason.value || !props.propertyId || submitting.value) return
  submitting.value = true
  errorMsg.value = ''
  try {
    await apiFetch('/reports', {
      method: 'POST',
      body: { propertyId: props.propertyId, reason: reason.value, details: details.value || undefined },
    })
    submitted.value = true
    setTimeout(onClose, 2200)
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Could not submit report — try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.report-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
}
@media (min-width: 640px) {
  .report-overlay { align-items: center; }
}

.report-modal {
  width: 100%; max-width: 420px;
  background: var(--vo-surface); color: var(--vo-text);
  border-radius: var(--vo-radius-lg) var(--vo-radius-lg) 0 0;
  box-shadow: var(--vo-shadow-lg);
  max-height: 85vh; overflow-y: auto;
}
@media (min-width: 640px) {
  .report-modal { border-radius: var(--vo-radius-lg); margin-bottom: 10vh; }
}

.report-modal__topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px 12px; border-bottom: 1px solid var(--vo-border);
}
.report-modal__title { font-size: 1rem; font-weight: 800; margin: 0; }
.report-modal__close {
  width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: none; border: none; color: var(--vo-muted); cursor: pointer;
}

.report-modal__body { padding: 16px 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.report-modal__hint { font-size: 0.82rem; color: var(--vo-secondary); margin: 0; line-height: 1.4; }

.report-modal__reasons { display: flex; flex-direction: column; gap: 6px; }
.report-modal__reason {
  text-align: left; padding: 10px 12px; border-radius: var(--vo-radius-md);
  border: 1px solid var(--vo-border-strong); background: var(--vo-elevated); color: var(--vo-text);
  font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: border-color 140ms ease, background 140ms ease;
}
.report-modal__reason--active { border-color: var(--vo-text); background: var(--vo-page); }

.report-modal__textarea {
  border: 1px solid var(--vo-border-strong); border-radius: var(--vo-radius-md); background: var(--vo-elevated);
  color: var(--vo-text); padding: 10px 12px; font-size: 0.85rem; font-family: inherit; resize: vertical;
}
.report-modal__error { font-size: 0.78rem; color: #e0463b; margin: 0; }

.report-modal__submit {
  height: 44px; border-radius: var(--vo-radius-pill); border: none; cursor: pointer;
  background: var(--vo-text); color: var(--vo-inverse); font-weight: 700; font-size: 0.88rem;
}
.report-modal__submit:disabled { opacity: 0.5; cursor: not-allowed; }

.report-modal__success {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 40px 24px; text-align: center; color: var(--vo-secondary); font-size: 0.9rem; font-weight: 600;
}
.report-modal__success svg { color: #16a34a; }

.report-modal-enter-active, .report-modal-leave-active { transition: opacity 160ms ease; }
.report-modal-enter-from, .report-modal-leave-to { opacity: 0; }
</style>
