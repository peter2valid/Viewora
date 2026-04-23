<template>
  <EditorShell :space-id="spaceId" />
</template>

<script setup lang="ts">
import { definePageMeta, useSeoMeta, useRoute } from '#imports'
import EditorShell from '~/features/editor/EditorShell.vue'

definePageMeta({ layout: 'editor', middleware: 'auth' })
useSeoMeta({ title: 'Edit Tour | Viewora' })

const route = useRoute()
const spaceId = route.params.id as string
</script>
