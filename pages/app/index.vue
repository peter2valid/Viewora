<template>
  <div>
    <!-- Redirect to spaces for now, until we build the summary dashboard -->
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { navigateTo } from '#imports'

definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

onMounted(() => {
  navigateTo('/app/spaces')
})
</script>
