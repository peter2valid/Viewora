<template>
  <div class="min-h-screen app-bg-premium font-sans antialiased text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white">
    <!-- Mobile Backdrop -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-300"
      @click="isSidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside 
      :class="[
        'fixed inset-y-0 left-0 w-64 bg-zinc-950 border-r border-zinc-900 z-[100] transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-hidden flex flex-col',
        isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full shadow-none'
      ]"
    >
      <!-- Sidebar Header / Brand -->
      <div class="h-16 flex items-center justify-between px-6 border-b border-zinc-900">
        <NuxtLink to="/app" class="flex items-center gap-3 transition-opacity hover:opacity-80" @click="isSidebarOpen = false">
          <div class="w-6 h-6 rounded-md bg-white flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
          </div>
          <span class="text-base font-bold tracking-tight text-white">Viewora</span>
        </NuxtLink>
        <button class="lg:hidden p-2 -mr-2 text-zinc-400 hover:text-white transition-colors" @click="isSidebarOpen = false">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <!-- Navigation Content -->
      <div class="flex-1 overflow-y-auto px-3 py-6 space-y-4">
        <nav class="space-y-1">
          <SidebarLink to="/app" icon="dashboard" label="Dashboard" :is-active="isExactRoute('/app')" @click="isSidebarOpen = false" />
          <SidebarLink to="/app/spaces" icon="spaces" label="Tours" :is-active="route.path.startsWith('/app/spaces')" @click="isSidebarOpen = false" />
          <SidebarLink to="/app/analytics" icon="analytics" label="Insights" :is-active="route.path.startsWith('/app/analytics') || route.path.startsWith('/app/leads')" @click="isSidebarOpen = false" />
        </nav>

        <div class="border-t border-zinc-900 mx-2"></div>

        <nav class="space-y-1">
          <SidebarLink to="/app/settings" icon="settings" label="Settings" :is-active="route.path.startsWith('/app/settings')" @click="isSidebarOpen = false" />
          <SidebarLink to="/app/billing" icon="billing" label="Billing" :is-active="route.path.startsWith('/app/billing')" @click="isSidebarOpen = false" />
        </nav>
      </div>

      <!-- User Profile Area -->
      <div class="p-4 border-t border-zinc-900 bg-zinc-950/50">
        <div class="flex items-center gap-3 mb-4 px-2">
           <div class="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-white">
             {{ authStore.avatarInitials }}
           </div>
           <div class="flex-1 min-w-0">
             <p class="text-sm font-medium text-zinc-200 truncate">{{ user?.email?.split('@')[0] }}</p>
             <p class="text-xs text-zinc-500 truncate">{{ planStore.plan?.name || 'Free' }} Plan</p>
           </div>
        </div>

        <!-- Theme toggle -->
        <button @click="toggleTheme" class="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 rounded-lg transition-colors mb-1">
          <!-- Sun icon (shown in dark mode) -->
          <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <!-- Moon icon (shown in light mode) -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          {{ isDark ? 'Light Mode' : 'Dark Mode' }}
        </button>

        <button @click="logout" class="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Sign Out
        </button>
      </div>
    </aside>

    <!-- Main Viewport -->
    <div class="lg:pl-64 flex flex-col min-h-screen">
      <!-- Topbar / Mobile Navigation -->
      <header class="h-16 flex items-center justify-between px-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-[80] lg:hidden">
        <NuxtLink to="/app" class="flex items-center gap-2">
           <div class="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
           </div>
           <span class="text-base font-bold tracking-tight text-zinc-900">Viewora</span>
        </NuxtLink>
        <div class="flex items-center gap-1">
          <button @click="toggleTheme" class="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button class="p-2 -mr-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors" @click="isSidebarOpen = true">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </header>

      <!-- App View -->
      <main class="flex-1 p-6 md:p-8 lg:p-10 max-w-6xl mx-auto w-full dark:text-zinc-100">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { usePlanStore } from '~/stores/plan'
import { useSupabaseUser, useSupabaseClient, useRoute } from '#imports'

const isSidebarOpen = ref(false)
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()

const authStore = useAuthStore()
const planStore = usePlanStore()

const { isDark, toggle: toggleTheme, init: initTheme } = useTheme()

const isExactRoute = (path: string) => route.path === path

// Initialize stores on mount
onMounted(async () => {
  initTheme()
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
/* Premium solid backgrounds */
.app-bg-premium {
  background-color: #fafafa;
}

:global(.dark .app-bg-premium) {
  background-color: #09090b;
}

/* Page crossfade transition */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease-in-out;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}

/* Minimal scrollbar */
aside::-webkit-scrollbar {
  width: 4px;
}
aside::-webkit-scrollbar-track {
  background: transparent;
}
aside::-webkit-scrollbar-thumb {
  background: #3f3f46;
  border-radius: 4px;
}
</style>
