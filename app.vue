<template>
  <NuxtLayout>
    <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
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
