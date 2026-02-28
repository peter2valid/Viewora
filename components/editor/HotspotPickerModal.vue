<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('cancel')">
      <div class="modal-card" style="max-width: 420px;">
        <div class="modal-header">
          <h2 class="modal-title">Add Hotspot</h2>
          <button class="modal-close-btn" @click="$emit('cancel')" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Hotspot type -->
          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label class="form-label">Hotspot Type</label>
            <div class="hotspot-type-row">
              <button
                type="button"
                class="hotspot-type-btn"
                :class="{ 'hotspot-type-btn--active': type === 'nav' }"
                @click="type = 'nav'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                </svg>
                Navigation
              </button>
              <button
                type="button"
                class="hotspot-type-btn"
                :class="{ 'hotspot-type-btn--active': type === 'info' }"
                @click="type = 'info'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Info
              </button>
            </div>
          </div>

          <!-- Target scene (nav only) -->
          <div v-if="type === 'nav'" class="form-group" style="margin-bottom: 1.25rem;">
            <label class="form-label">Destination Scene <span style="color: #ef4444;">*</span></label>
            <select v-model="targetSceneId" class="form-select">
              <option value="">— Select a scene —</option>
              <option
                v-for="scene in otherScenes"
                :key="scene.id"
                :value="scene.id"
              >
                {{ scene.name }}
              </option>
            </select>
            <p v-if="!otherScenes.length" class="form-hint">
              Add more scenes to create navigation hotspots.
            </p>
          </div>

          <!-- Label (optional) -->
          <div class="form-group">
            <label class="form-label">Label <span class="form-label-optional">(optional)</span></label>
            <input
              v-model="label"
              type="text"
              class="form-input"
              placeholder="e.g. Living Room, Enter here…"
              maxlength="60"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('cancel')">Cancel</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="type === 'nav' && !targetSceneId"
            @click="confirm"
          >
            Place Hotspot
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Database } from '~/types/database.types'

type Scene = Database['public']['Tables']['scenes']['Row']

const props = defineProps<{
  scenes: Scene[]
  currentSceneId: string | null
}>()

const emit = defineEmits<{
  (e: 'confirm', payload: { type: 'nav' | 'info'; targetSceneId: string | null; label: string }): void
  (e: 'cancel'): void
}>()

const type = ref<'nav' | 'info'>('nav')
const targetSceneId = ref('')
const label = ref('')

const otherScenes = computed(() =>
  props.scenes.filter(s => s.id !== props.currentSceneId)
)

function confirm() {
  emit('confirm', {
    type: type.value,
    targetSceneId: type.value === 'nav' ? targetSceneId.value || null : null,
    label: label.value.trim(),
  })
}
</script>
