<template>
  <div class="flex min-h-screen flex-col" style="display: flex; flex-direction: column; min-height: 100vh;">
    <NavBar />
    <main style="flex: 1;">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
// Default Layout
</script>
