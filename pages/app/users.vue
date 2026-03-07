<template>
  <NuxtLayout name="app">
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Users</h1>
        <p class="page-description">Manage team members and user access.</p>
      </div>
      
      <div class="page-content">
        <div class="placeholder-card">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="placeholder-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <h3>Team Management Coming Soon</h3>
          <p>You will soon be able to invite team members and manage collaborators for your spaces here.</p>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Users | Viewora',
  description: 'Manage users and team members'
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
