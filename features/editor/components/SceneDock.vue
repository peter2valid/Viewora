<template>
  <GlassDock
    v-if="visible"
    :items="dockItems"
    :active-id="activeSceneId"
    :show-add="showAdd"
    :add-disabled="addScenePending"
    glass-class="dock-glass"
    :bottom-px="20"
    :edge-inset-px="20"
    :max-strip-vw="74"
    :max-strip-px="840"
    :max-scale="1.62"
    :sigma-px="92"
    :lift-px="14"
    @select="$emit('select-scene', $event)"
    @add="$emit('add-scene')"
    @reorder="$emit('reorder-scenes', $event)"
    @context="$emit('rename-scene', $event)"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import GlassDock from '~/components/ui/GlassDock.vue'

const props = withDefaults(defineProps<{
  scenes: { id: string; label: string; ready: boolean; imageUrl: string | null; badge?: 'loading' | 'failed' | null }[]
  activeSceneId: string
  addScenePending: boolean
  showAdd?: boolean
}>(), {
  showAdd: true
})

defineEmits<{
  (e: 'select-scene', id: string): void
  (e: 'add-scene'): void
  (e: 'reorder-scenes', ids: string[]): void
  (e: 'rename-scene', id: string): void
}>()

const visible = ref(false)
onMounted(() => { visible.value = true })

const dockItems = computed(() =>
  (props.scenes ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    imageUrl: s.imageUrl,
    badge: s.badge ?? (s.ready ? null : 'loading'),
  }))
)
</script>

<style scoped></style>
