<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-card">
        <div class="modal-header">
          <h2 class="modal-title">Create Tour</h2>
          <button class="modal-close-btn" @click="$emit('close')" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form @submit.prevent="submit">
          <div class="modal-body">
            <div v-if="errorMsg" class="form-error-box">{{ errorMsg }}</div>

            <div class="form-group">
              <label for="tour-title" class="form-label">Tour Name <span style="color: #ef4444;">*</span></label>
              <input
                id="tour-title"
                ref="titleEl"
                v-model="title"
                type="text"
                class="form-input"
                placeholder="e.g. Main Floor Tour, Exterior Walkthrough…"
                maxlength="80"
                required
                autofocus
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="isLoading || !title.trim()">
              <span v-if="isLoading" class="btn-spinner-xs"></span>
              {{ isLoading ? 'Creating…' : 'Create Tour' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  spaceId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', tourId: string): void
}>()

const title = ref('')
const isLoading = ref(false)
const errorMsg = ref('')
const titleEl = ref<HTMLInputElement | null>(null)

onMounted(() => titleEl.value?.focus())

const { createTour } = useTours()

async function submit() {
  if (!title.value.trim()) return

  isLoading.value = true
  errorMsg.value = ''

  try {
    const tour = await createTour({
      title: title.value.trim(),
      property_id: props.spaceId,
    })
    emit('created', tour.id)
  } catch (e: any) {
    errorMsg.value = e.message ?? 'Failed to create tour.'
  } finally {
    isLoading.value = false
  }
}
</script>
