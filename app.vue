<template>
  <NuxtLayout>
    <NuxtPage :keepalive="{ max: 10 }" :transition="{ name: 'fade' }" />
  </NuxtLayout>
  <ClientOnly>
    <Toaster position="bottom-right" theme="dark" richColors expand class="z-[99999]" />
  </ClientOnly>
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'

// Main application entry component
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
