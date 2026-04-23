<template>
  <div class="editor-layout">
    <slot />
  </div>
</template>

<style>
/* Prevent body scroll when editor is mounted */
body {
  overflow: hidden;
}
</style>

<style scoped>
.editor-layout {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #0a0a0b;
  display: flex;
  flex-direction: column;
  /* Prevent any inherited padding/margin from app layout */
  padding: 0;
  margin: 0;
  /* Contain all stacking contexts — keeps modals/toasts from leaking */
  isolation: isolate;
}
</style>
