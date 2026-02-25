<template>
  <div>
    <main class="section">
      <div class="container" style="max-width: 800px; margin: 0 auto;">
        <ContentDoc v-slot="{ doc }">
          <article>
            <div class="mb-8 text-center">
              <NuxtLink to="/blog" class="text-primary text-sm font-bold mb-4 inline-block">&larr; Back to Blog</NuxtLink>
              <h1 class="mb-4" style="font-size: 2.5rem; line-height: 1.2;">{{ doc.title }}</h1>
              <p class="text-muted text-lg mb-6">{{ doc.description }}</p>
              
              <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.875rem;">
                <span>Published on {{ new Date(doc.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }}</span>
                <span v-if="doc.author">&bull; By {{ doc.author }}</span>
              </div>
            </div>

            <div v-if="doc.image" class="mb-12" style="border-radius: 1rem; overflow: hidden; box-shadow: var(--shadow-lg);">
              <img :src="doc.image" :alt="doc.title" style="width: 100%; height: auto; max-height: 500px; object-fit: cover; display: block;">
            </div>

            <div class="prose prose-slate max-w-none" style="font-size: 1.125rem; line-height: 1.8; color: var(--text-secondary);">
              <ContentRenderer :value="doc" />
            </div>
            
            <div class="mt-16 pt-8 text-center" style="border-top: 1px solid var(--border-color);">
              <h3 class="mb-4">Ready to create your own virtual tour?</h3>
              <NuxtLink to="/register" class="btn btn-primary">Start Free Trial</NuxtLink>
            </div>
          </article>
        </ContentDoc>
      </div>
    </main>
  </div>
</template>

<!-- Basic styling for markdown content within the prose class -->
<style>
  .prose h2 { font-size: 1.75rem; margin-top: 2.5rem; margin-bottom: 1rem; color: var(--text-primary); }
  .prose h3 { font-size: 1.25rem; margin-top: 2rem; margin-bottom: 0.75rem; color: var(--text-primary); }
  .prose p { margin-bottom: 1.5rem; }
  .prose ul, .prose ol { margin-bottom: 1.5rem; padding-left: 1.5rem; }
  .prose li { margin-bottom: 0.5rem; }
  .prose a { color: var(--primary); text-decoration: underline; }
  .prose blockquote { border-left: 4px solid var(--primary); padding-left: 1rem; font-style: italic; color: var(--text-muted); margin-bottom: 1.5rem; }
  .prose img { border-radius: 0.5rem; box-shadow: var(--shadow-md); margin-bottom: 1.5rem; max-width: 100%; height: auto; }
</style>

<script setup lang="ts">
const route = useRoute()

// Fetch doc for SEO meta
const { data: doc } = await useAsyncData(`blog-${route.params.slug}`, () =>
  queryContent('/blog', route.params.slug as string).findOne()
)

if (doc.value) {
  useSeoMeta({
    title: `${doc.value.title} | Viewora Blog`,
    description: doc.value.description,
    ogTitle: doc.value.title,
    ogDescription: doc.value.description,
    ogImage: doc.value.image,
    twitterCard: 'summary_large_image',
  })
}
</script>

