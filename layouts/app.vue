<template>
  <div class="app-shell">
    <!-- Mobile Backdrop -->
    <div 
      v-if="isSidebarOpen" 
      class="app-sidebar-backdrop" 
      @click="isSidebarOpen = false"
    ></div>

    <aside :class="['app-sidebar', { 'app-sidebar--open': isSidebarOpen }]">
      <div class="sidebar-brand">
        <NuxtLink to="/app/spaces" class="sidebar-logo">Viewora</NuxtLink>
        <button class="sidebar-close-btn" @click="isSidebarOpen = false" aria-label="Close menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink to="/app/spaces" class="sidebar-link" active-class="sidebar-link--active" @click="isSidebarOpen = false">
          Spaces
        </NuxtLink>
        <NuxtLink to="/app/settings" class="sidebar-link" active-class="sidebar-link--active" @click="isSidebarOpen = false">
          Settings
        </NuxtLink>
        <NuxtLink to="/app/billing" class="sidebar-link" active-class="sidebar-link--active" @click="isSidebarOpen = false">
          Billing
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user" v-if="user">
          <div class="sidebar-avatar">{{ user.email?.charAt(0).toUpperCase() }}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-email">{{ user.email }}</div>
            <div class="sidebar-user-plan">Free Plan</div>
          </div>
        </div>
        <button @click="logout" class="sidebar-signout">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
           Log Out
        </button>
      </div>
    </aside>

    <div class="app-main-wrapper">
      <header class="app-topbar">
        <button class="app-topbar-menu" @click="isSidebarOpen = true" aria-label="Open menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <NuxtLink to="/app/spaces" class="app-topbar-logo">Viewora</NuxtLink>
      </header>
      
      <main class="app-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isSidebarOpen = ref(false)
const user = useSupabaseUser()
const supabase = useSupabaseClient()

const logout = async () => {
  await supabase.auth.signOut()
  const router = useRouter()
  router.push('/')
}
</script>