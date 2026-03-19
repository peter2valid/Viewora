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
        <NuxtLink to="/app" class="sidebar-logo">Viewora</NuxtLink>
        <button class="sidebar-close-btn" @click="isSidebarOpen = false" aria-label="Close menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Plan context pill -->
      <div v-if="planStore.plan" class="sidebar-org-pill">
        <div class="sidebar-org-avatar">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <span class="sidebar-org-name">{{ planStore.plan.name }} Plan</span>
        <span v-if="planStore.isGracePeriod" class="sidebar-org-plan" style="color: #ef4444;">Grace</span>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-section-label">Overview</div>
        <NuxtLink to="/app" class="sidebar-link" :class="{ 'sidebar-link--active': isExactRoute('/app') }" @click="isSidebarOpen = false">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
          Dashboard
        </NuxtLink>

        <div class="sidebar-section-label">Content</div>
        <NuxtLink to="/app/spaces" class="sidebar-link" active-class="sidebar-link--active" @click="isSidebarOpen = false">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Spaces
        </NuxtLink>
        <NuxtLink to="/app/leads" class="sidebar-link" active-class="sidebar-link--active" @click="isSidebarOpen = false">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="23 21 23 19 19 19 19 21"></polyline><path d="M19 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path></svg>
          Leads
        </NuxtLink>
        <NuxtLink to="/app/analytics" class="sidebar-link" active-class="sidebar-link--active" @click="isSidebarOpen = false">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><rect x="4" y="16" width="4" height="4"></rect><rect x="10" y="8" width="4" height="12"></rect><rect x="16" y="2" width="4" height="18"></rect></svg>
          Analytics
        </NuxtLink>

        <div class="sidebar-section-label">Account</div>
        <NuxtLink to="/app/billing" class="sidebar-link" active-class="sidebar-link--active" @click="isSidebarOpen = false">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          Billing
        </NuxtLink>
        <NuxtLink to="/app/settings" class="sidebar-link" active-class="sidebar-link--active" @click="isSidebarOpen = false">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          Settings
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user" v-if="user">
          <div class="sidebar-avatar">{{ authStore.avatarInitials }}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-email">{{ user.email }}</div>
            <div class="sidebar-user-plan" v-if="planStore.plan">{{ planStore.plan.name }} plan</div>
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
        <NuxtLink to="/app" class="app-topbar-logo">Viewora</NuxtLink>
      </header>

      <main class="app-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { usePlanStore } from '~/stores/plan'

const isSidebarOpen = ref(false)
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()

const authStore = useAuthStore()
const planStore = usePlanStore()

const isExactRoute = (path: string) => route.path === path

// Initialize stores on mount
onMounted(async () => {
  if (user.value && !planStore.plan && !planStore.pending) {
    authStore.setUser(user.value)
    await planStore.fetchSubscriptionStatus()
    authStore.fetchProfile().catch(() => {})
  }
})

const logout = async () => {
  authStore.$reset()
  planStore.$reset()
  await supabase.auth.signOut()
  await navigateTo('/')
}
</script>

<style scoped>
.sidebar-section-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  padding: 0.9rem 1rem 0.25rem;
}

.sidebar-org-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0.75rem 0;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
}

.sidebar-org-avatar {
  width: 24px;
  height: 24px;
  border-radius: 0.25rem;
  background: var(--accent);
  color: var(--ink);
  font-size: 0.65rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-org-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.sidebar-org-plan {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent);
  flex-shrink: 0;
}
</style>
