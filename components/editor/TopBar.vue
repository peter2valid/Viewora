<template>
  <div class="editor-topbar">
    <!-- Back to space -->
    <NuxtLink :to="`/app/spaces/${spaceId}`" class="editor-back-btn" title="Back to space">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </NuxtLink>

    <!-- Divider -->
    <div class="editor-topbar-divider"></div>

    <!-- Tour title -->
    <div class="editor-tour-title">
      <span v-if="!editingTitle" @dblclick="startEditTitle" class="editor-tour-title-text" title="Double-click to rename">
        {{ title || 'Untitled Tour' }}
      </span>
      <input
        v-else
        ref="titleInputEl"
        v-model="localTitle"
        class="editor-tour-title-input"
        @blur="commitTitle"
        @keydown.enter="commitTitle"
        @keydown.esc="cancelEditTitle"
        maxlength="80"
      />
    </div>

    <!-- Status badge -->
    <span class="editor-status-badge" :class="status === 'published' ? 'editor-status-badge--live' : 'editor-status-badge--draft'">
      {{ status === 'published' ? 'Live' : 'Draft' }}
    </span>

    <!-- Spacer -->
    <div style="flex: 1;"></div>

    <!-- Add Hotspot toggle -->
    <button
      class="editor-action-btn"
      :class="{ 'editor-action-btn--active': addHotspotMode }"
      @click="$emit('toggle-hotspot-mode')"
      :title="addHotspotMode ? 'Cancel — click viewer to place hotspot' : 'Add hotspot (click on viewer)'"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
      {{ addHotspotMode ? 'Cancel' : 'Add Hotspot' }}
    </button>

    <!-- Save / Publish -->
    <button
      class="editor-action-btn editor-action-btn--secondary"
      @click="$emit('publish')"
      :disabled="saving"
    >
      {{ status === 'published' ? 'Unpublish' : 'Publish' }}
    </button>

    <button
      class="editor-action-btn editor-action-btn--primary"
      @click="$emit('save')"
      :disabled="saving"
    >
      <span v-if="saving" class="btn-spinner-xs"></span>
      {{ saving ? 'Saving…' : 'Save' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  title: string
  status: string
  spaceId: string
  addHotspotMode: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'save'): void
  (e: 'publish'): void
  (e: 'toggle-hotspot-mode'): void
}>()

const editingTitle = ref(false)
const localTitle = ref(props.title)
const titleInputEl = ref<HTMLInputElement | null>(null)

watch(() => props.title, (v) => { localTitle.value = v })

async function startEditTitle() {
  localTitle.value = props.title
  editingTitle.value = true
  await nextTick()
  titleInputEl.value?.select()
}

function commitTitle() {
  const trimmed = localTitle.value.trim()
  if (trimmed && trimmed !== props.title) {
    emit('update:title', trimmed)
  }
  editingTitle.value = false
}

function cancelEditTitle() {
  localTitle.value = props.title
  editingTitle.value = false
}
</script>
