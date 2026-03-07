<template>
  <NuxtLayout name="app">
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-description">Overview of your activity and recent tours.</p>
      </div>
      
      <div class="page-content">
        <div class="placeholder-card">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="placeholder-icon"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
          <h3>Dashboard Coming Soon</h3>
          <p>We're building an overview of your activity. For now, head over to <NuxtLink to="/app/spaces">All Spaces</NuxtLink> to manage your tours.</p>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({
  title: 'Dashboard | Viewora',
  description: 'Viewora Dashboard overview'
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

.placeholder-card a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}

.placeholder-card a:hover {
  text-decoration: underline;
}
</style>
