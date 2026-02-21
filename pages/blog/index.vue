<template>
  <div>
    <section class="section section-bg text-center">
      <div class="container">
        <h1 class="section-title">Viewora Blog & Resources</h1>
        <p class="section-subtitle mb-0" style="max-width: 600px; margin-left: auto; margin-right: auto;">
          Insights, guides, and property marketing strategies to help you close more deals.
        </p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <ContentList path="/blog" v-slot="{ list = [] }">
          <div class="grid-3" v-if="list?.length">
            <div v-for="article in list" :key="article._path" class="card" style="display: flex; flex-direction: column; height: 100%;">
              <div v-if="article.image" style="margin: -1.5rem -1.5rem 1.5rem -1.5rem; height: 200px; overflow: hidden; border-radius: 1rem 1rem 0 0;">
                <img :src="article.image" :alt="article.title" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
              <div style="flex: 1; display: flex; flex-direction: column;">
                <NuxtLink :to="article._path" class="text-primary text-sm font-bold mb-2">{{ article.category || 'Guides' }}</NuxtLink>
                <h3 class="mb-3" style="font-size: 1.25rem; line-height: 1.4;">
                  <NuxtLink :to="article._path" style="color: inherit; text-decoration: none;">{{ article.title }}</NuxtLink>
                </h3>
                <p class="text-muted text-sm mb-4" style="flex: 1; line-height: 1.6;">{{ article.description }}</p>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="text-xs text-muted">{{ new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}</span>
                  </div>
                  <NuxtLink :to="article._path" class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">Read More &rarr;</NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </ContentList>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Blog & Resources',
  description: 'Learn how to market properties better with virtual tours, 360° panoramas, and SaaS tools for real estate and Airbnb.'
})
</script>
