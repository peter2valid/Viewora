<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <!-- Header -->
        <div class="modal-header">
          <h2 id="modal-title" class="modal-title">Create New Space</h2>
          <button class="modal-close" @click="$emit('close')" aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit">
          <div v-if="errorMsg" class="modal-error">
            {{ errorMsg }}
          </div>

          <div class="modal-body">
            <!-- Space Name -->
            <div class="form-group mb-4">
              <label for="space-name" class="form-label">
                Space Name <span class="required">*</span>
              </label>
              <input
                id="space-name"
                ref="nameInputRef"
                v-model="form.name"
                type="text"
                class="form-input"
                placeholder="e.g. Luxury Nairobi Apartment"
                required
                :disabled="submitting"
              />
            </div>

            <!-- Space Type -->
            <div class="form-group mb-4">
              <label for="space-type" class="form-label">Space Type</label>
              <select
                id="space-type"
                v-model="form.property_type"
                class="form-input"
                :disabled="submitting"
              >
                <option value="residential">Residential Property</option>
                <option value="hospitality">Hotel / Airbnb / Rental</option>
                <option value="commercial">Commercial / Retail</option>
                <option value="automotive">Car / Vehicle</option>
                <option value="events">Event Space / Venue</option>
                <option value="general">Other / General</option>
              </select>
            </div>

            <!-- Description (future DB field — captured for UX) -->
            <div class="form-group">
              <label for="space-desc" class="form-label">
                Description
                <span class="form-label-optional">(optional)</span>
              </label>
              <textarea
                id="space-desc"
                v-model="form.description"
                class="form-input"
                rows="3"
                placeholder="Short description of the space..."
                :disabled="submitting"
                style="resize: vertical;"
              ></textarea>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="$emit('close')"
              :disabled="submitting"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="submitting || !form.name.trim()"
            >
              <span v-if="submitting" class="btn-spinner"></span>
              {{ submitting ? 'Creating…' : 'Create Space' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { CreateSpaceInput } from '~/composables/useSpaces'

const emit = defineEmits<{
  close: []
  created: []
}>()

const { createSpace } = useSpaces()

const nameInputRef = ref<HTMLInputElement | null>(null)
const submitting = ref(false)
const errorMsg = ref('')

const form = reactive<CreateSpaceInput>({
  name: '',
  property_type: 'residential',
  description: '',
})

onMounted(() => {
  nameInputRef.value?.focus()
})

async function handleSubmit() {
  if (!form.name.trim()) return

  submitting.value = true
  errorMsg.value = ''

  try {
    await createSpace({
      name: form.name.trim(),
      property_type: form.property_type,
      description: form.description,
    })
    emit('created')
    emit('close')
  } catch (e: any) {
    errorMsg.value = e.message ?? 'Failed to create space. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>
