<template>
  <div class="min-h-screen bg-slate-50 font-sans antialiased text-zinc-950 selection:bg-zinc-950 selection:text-white">
    <!-- Mobile Backdrop -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-300"
      @click="isSidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside 
      :class="[
        'fixed inset-y-0 left-0 w-72 bg-zinc-950 border-r border-zinc-900 z-[100] transition-all duration-500 ease-in-out lg:translate-x-0 overflow-hidden flex flex-col',
        isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full shadow-none'
      ]"
    >
      <!-- Sidebar Header / Brand -->
      <div class="h-20 flex items-center justify-between px-8 border-b border-zinc-900/50">
        <NuxtLink to="/app/spaces" class="flex items-center gap-3 active:scale-95 transition-transform" @click="isSidebarOpen = false">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-white to-slate-200 flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
          </div>
          <span class="text-xl font-black tracking-tighter text-white uppercase italic">Viewora</span>
        </NuxtLink>
        <button class="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all" @click="isSidebarOpen = false">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <!-- Navigation Content -->
      <div class="flex-1 overflow-y-auto px-4 py-8 space-y-12">
        <!-- Section: Overview -->
        <article class="space-y-3">
          <span class="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Overview</span>
          <nav class="space-y-1">
            <SidebarLink to="/app" icon="dashboard" label="Console" :is-active="isExactRoute('/app')" @click="isSidebarOpen = false" />
          </nav>
        </article>

        <!-- Section: Creator Studio -->
        <article class="space-y-3">
           <span class="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Experience Engine</span>
           <nav class="space-y-1">
             <SidebarLink to="/app/spaces" icon="spaces" label="My Spaces" :is-active="route.path.startsWith('/app/spaces')" @click="isSidebarOpen = false" />
             <SidebarLink to="/app/leads" icon="leads" label="Lead Hub" :is-active="route.path.startsWith('/app/leads')" @click="isSidebarOpen = false" />
             <SidebarLink to="/app/analytics" icon="analytics" label="Intelligence" :is-active="route.path.startsWith('/app/analytics')" @click="isSidebarOpen = false" />
           </nav>
        </article>

        <!-- Section: Management -->
        <article class="space-y-3">
           <span class="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Governance</span>
           <nav class="space-y-1">
             <SidebarLink to="/app/billing" icon="billing" label="Subscription" :is-active="route.path.startsWith('/app/billing')" @click="isSidebarOpen = false" />
             <SidebarLink to="/app/settings" icon="settings" label="Agency Settings" :is-active="route.path.startsWith('/app/settings')" @click="isSidebarOpen = false" />
           </nav>
        </article>
      </div>

      <!-- User Profile Area -->
      <div class="p-6 bg-zinc-950/50 border-t border-zinc-900 space-y-6">
        <div v-if="planStore.plan" class="space-y-3">
           <div class="flex items-center justify-between">
              <span class="text-[9px] font-black uppercase tracking-widest text-zinc-500">{{ planStore.plan.name }} Intelligence</span>
              <span v-if="planStore.isGracePeriod" class="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1">
                <span class="w-1 h-1 rounded-full bg-rose-500 animate-ping"></span>
                Grace Period
              </span>
           </div>
           <div class="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden shadow-inner border border-zinc-800">
              <div class="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" :style="{ width: '35%' }"></div>
           </div>
        </div>

        <div class="flex items-center gap-4">
           <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700 flex items-center justify-center text-sm font-black text-white shadow-xl shadow-zinc-950/50">
             {{ authStore.avatarInitials }}
           </div>
           <div class="flex-1 min-w-0">
             <p class="text-[13px] font-black text-white truncate">{{ user?.email?.split('@')[0] }}</p>
             <p class="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate line-clamp-1 italic">{{ user?.email }}</p>
           </div>
        </div>

        <button @click="logout" class="flex items-center justify-center gap-2 w-full py-4 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 group">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="group-hover:translate-x-0.5 transition-transform"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Sign Out Experience
        </button>
      </div>
    </aside>

    <!-- Main Viewport -->
    <div class="lg:pl-72 flex flex-col min-h-screen">
      <!-- Topbar / Mobile Navigation -->
      <header class="h-20 flex items-center justify-between px-8 bg-white/60 backdrop-blur-3xl border-b border-slate-200 sticky top-0 z-[80] lg:hidden">
        <NuxtLink to="/app/spaces" class="flex items-center gap-3">
           <div class="w-8 h-8 rounded-xl bg-zinc-950 flex items-center justify-center shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
           </div>
           <span class="text-xl font-black tracking-tighter text-zinc-950 uppercase italic">Viewora</span>
        </NuxtLink>
        <button class="w-12 h-12 bg-zinc-950 text-white rounded-2xl flex items-center justify-center shadow-2xl active:scale-90 transition-all" @click="isSidebarOpen = true">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </header>

      <!-- App View -->
      <main class="flex-1 p-6 lg:p-12 xl:p-16 2xl:p-20 max-w-screen-2xl mx-auto w-full">
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
/* Custom scrollbar for sidebar */
aside::-webkit-scrollbar {
  width: 4px;
}
aside::-webkit-scrollbar-track {
  background: transparent;
}
aside::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}
</style>
