<template>
  <NuxtLayout name="app">
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Analytics</h1>
        <p class="page-description">Track performance and views across your tours.</p>
      </div>
      
      <div class="page-content">
        <div class="placeholder-card">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="placeholder-icon"><rect x="4" y="16" width="4" height="4"></rect><rect x="10" y="8" width="4" height="12"></rect><rect x="16" y="2" width="4" height="18"></rect></svg>
          <h3>Analytics Coming Soon</h3>
          <p>We're building comprehensive analytics to help you understand your audience. Check back later!</p>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({
  title: 'Analytics | Viewora',
  description: 'Viewora user analytics'
})
</script>

<style scoped>
.page-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.025em;
  margin-bottom: 0.5rem;
}

.page-description {
  color: #64748b;
  font-size: 1rem;
}

.placeholder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: var(--paper);
  border: 1px dashed var(--border);
  border-radius: 1rem;
  text-align: center;
}

.placeholder-icon {
  color: #94a3b8;
  margin-bottom: 1.5rem;
}

.placeholder-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.5rem;
}

.placeholder-card p {
  color: #64748b;
  max-width: 400px;
  line-height: 1.5;
}
</style>
