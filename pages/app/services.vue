<template>
  <NuxtLayout name="app">
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Capture Services</h1>
        <p class="page-description">Order professional capture services for your property.</p>
      </div>
      
      <div class="page-content">
        <div class="placeholder-card">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="placeholder-icon"><rect x="3" y="8" width="10" height="8" rx="2" ry="2"></rect><path d="M13 14l4-2-4-2z"></path><path d="M21 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <h3>Capture Services Down for Maintenance</h3>
          <p>We are currently revamping our capture professional network. Stay tuned!</p>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({
  title: 'Capture Services | Viewora',
  description: 'Order Viewora capture professionals'
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
