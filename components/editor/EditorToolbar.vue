<template>
  <div class="editor-toolbar">
    <!-- Left: Action buttons -->
    <div class="editor-toolbar__left">
      <button class="editor-toolbar__btn" @click="$emit('add-logo')" disabled title="Coming soon">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        ADD LOGO
      </button>

      <button class="editor-toolbar__btn" @click="$emit('add-hotspot')" disabled title="Coming soon">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        ADD HOTSPOT
      </button>

      <div class="editor-toolbar__divider"></div>

      <!-- Decorative pill placeholders -->
      <div class="editor-toolbar__pill"></div>
      <div class="editor-toolbar__pill editor-toolbar__pill--wide"></div>
    </div>

    <!-- Right: Decorative controls -->
    <div class="editor-toolbar__right">
      <div class="editor-toolbar__pill"></div>
      <div class="editor-toolbar__pill"></div>
      <div class="editor-toolbar__pill editor-toolbar__pill--icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M5 12H3M21 12h-2M12 5V3M12 21v-2"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'add-logo'): void
  (e: 'add-hotspot'): void
}>()
</script>

<style scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 16px;
  height: 56px;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.editor-toolbar__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-toolbar__right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.editor-toolbar__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.editor-toolbar__btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.editor-toolbar__btn:hover:not(:disabled) {
  background: #f3f4f6;
  color: #111827;
  border-color: #9ca3af;
}

.editor-toolbar__divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  flex-shrink: 0;
  margin: 0 2px;
}

/* Decorative placeholder pills */
.editor-toolbar__pill {
  height: 26px;
  width: 48px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 99px;
  flex-shrink: 0;
}

.editor-toolbar__pill--wide {
  width: 72px;
}

.editor-toolbar__pill--icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

@media (max-width: 480px) {
  .editor-toolbar__pill,
  .editor-toolbar__pill--wide {
    display: none;
  }

  .editor-toolbar__btn {
    padding: 6px 10px;
    font-size: 0.68rem;
  }
}
</style>
