<template>
  <div class="max-w-6xl mx-auto">
    <UiPageHeader title="Showcases" subtitle="Share a curated, ordered set of tours in one link.">
      <template #actions>
        <UiButton variant="primary" class="w-full sm:w-auto" @click="navigateTo('/app/showcases/new')">
          <UiIcon name="plus" :size="16" />
          Create Showcase
        </UiButton>
      </template>
    </UiPageHeader>

    <div v-if="pending && !showcases.length" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
      <div v-for="n in 3" :key="n" class="h-52 rounded-xl bg-card border border-border" />
    </div>

    <UiEmptyState
      v-else-if="!showcases.length"
      icon="grid"
      title="Make your first Showcase"
      description="Put the right tours in the right order, then share one polished link with a client."
    >
      <template #actions>
        <UiButton variant="primary" @click="navigateTo('/app/showcases/new')">Create Showcase</UiButton>
      </template>
    </UiEmptyState>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <article v-for="showcase in showcases" :key="showcase.id" class="group border border-border rounded-xl bg-card overflow-hidden">
        <div class="aspect-[16/8] bg-surface-alt relative overflow-hidden">
          <img v-if="showcase.cover_image" :src="showcase.cover_image" :alt="''" class="w-full h-full object-cover" loading="lazy" />
          <div v-else class="absolute inset-0 grid grid-cols-4 gap-1 p-3 opacity-40">
            <span v-for="n in 8" :key="n" class="bg-border rounded-sm" />
          </div>
          <span class="absolute top-3 left-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-card/95 border border-border text-main">
            {{ showcase.is_published ? 'Live' : 'Draft' }}
          </span>
        </div>
        <div class="p-4">
          <div class="flex gap-3 justify-between items-start">
            <div class="min-w-0">
              <h2 class="font-bold text-main truncate">{{ showcase.title }}</h2>
              <p class="text-xs text-dim mt-1">{{ showcase.tour_count || 0 }} tour{{ showcase.tour_count === 1 ? '' : 's' }} · Updated {{ dateLabel(showcase.updated_at) }}</p>
            </div>
            <NuxtLink :to="`/app/showcases/${showcase.id}`" class="shrink-0 h-10 px-3 inline-flex items-center text-xs font-bold text-main border border-border rounded-lg hover:bg-surface-alt transition-colors">Manage</NuxtLink>
          </div>
          <a v-if="showcase.is_published" :href="publicUrl(showcase.slug)" target="_blank" rel="noopener" class="mt-4 text-xs font-semibold text-dim hover:text-main inline-flex items-center gap-1">
            Open public page <UiIcon name="external-link" :size="13" />
          </a>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { showcases, pending, fetchShowcases } = useShowcases()
const config = useRuntimeConfig()

await fetchShowcases()

function publicUrl(slug: string) {
  return `${String(config.public.appUrl).replace(/\/$/, '')}/showcase/${slug}`
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' }).format(new Date(value))
}
</script>
