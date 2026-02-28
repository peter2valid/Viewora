<template>
  <div class="app-layout">
    <aside class="app-sidebar">
      <div class="sidebar-brand">
        <NuxtLink to="/app/spaces" class="logo text-xl font-bold">Viewora</NuxtLink>
      </div>
      <nav class="sidebar-nav">
        <NuxtLink to="/app/spaces" class="nav-item">Spaces</NuxtLink>
        <NuxtLink to="/app/settings" class="nav-item">Settings</NuxtLink>
      </nav>
      <div class="sidebar-footer">
        <button @click="logout" class="nav-item text-red-500 w-full text-left">
          Log Out
        </button>
      </div>
    </aside>

    <main class="app-main">
      <header class="app-header">
        <div class="user-profile">
          {{ user?.email }}
        </div>
      </header>
      <div class="app-content">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()

const logout = async () => {
  await supabase.auth.signOut()
  await navigateTo('/')
}
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f9fafb;
}
.app-sidebar {
  width: 250px;
  background-color: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}
.sidebar-brand {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
.sidebar-nav {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.nav-item {
  display: block;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  color: #374151;
  text-decoration: none;
  transition: background-color 0.2s;
  cursor: pointer;
  border: none;
  background: transparent;
  font-size: 1rem;
}
.nav-item:hover, .router-link-active {
  background-color: #f3f4f6;
  color: #111827;
}
.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
}
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.app-header {
  height: 64px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 1.5rem;
}
.app-content {
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
}
</style>