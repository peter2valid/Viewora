<template>
  <NuxtLayout>
    <NuxtPage :keepalive="{ max: 10 }" :transition="{ name: 'fade' }" />
  </NuxtLayout>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Dashboard | Viewora',
  ogTitle: 'Viewora Dashboard',
  description: 'Manage your properties and virtual tours on Viewora.',
  robots: 'noindex, nofollow',
})
</script>

<style>
/* Page transition — shared across all routes */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
