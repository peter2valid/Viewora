<template>
  <div
    class="min-h-screen bg-bg font-sans antialiased text-main selection:bg-main selection:text-bg"
  >
    <!-- Mobile Backdrop -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-300"
      @click="isSidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 bg-surface border-r border-border z-[100] transition-all duration-300 ease-in-out lg:translate-x-0 overflow-hidden flex flex-col',
        'dark:bg-[#09090c] dark:border-white/5',
        isSidebarCollapsed ? 'w-16' : 'w-64',
        isSidebarOpen
          ? 'translate-x-0 shadow-2xl'
          : '-translate-x-full lg:translate-x-0 shadow-none',
      ]"
    >
      <!-- Sidebar Header / Brand -->
      <div
        :class="[
          'h-16 flex items-center border-b border-border dark:border-white/5',
          isSidebarCollapsed ? 'justify-center' : 'px-3 gap-2'
        ]"
      >
        <!-- Logo — hidden when collapsed -->
        <NuxtLink
          v-if="!isSidebarCollapsed"
          to="/app"
          class="flex items-center gap-3 transition-opacity hover:opacity-80 flex-1 min-w-0"
          @click="isSidebarOpen = false"
        >
          <div
            class="w-6 h-6 rounded-md bg-main flex items-center justify-center flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-bg"
            >
              <path
                d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
              />
            </svg>
          </div>
          <span class="text-base font-bold tracking-tight text-main dark:text-white whitespace-nowrap">Viewora</span>
        </NuxtLink>

        <!-- Desktop collapse toggle -->
        <button
          class="hidden lg:flex items-center justify-center w-8 h-8 flex-shrink-0 text-dim hover:text-main hover:bg-main/5 dark:hover:bg-white/5 rounded-lg transition-all"
          :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="toggleSidebarCollapse"
        >
          <svg
            v-if="!isSidebarCollapsed"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <path d="M15 9l-3 3 3 3" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <path d="M13 9l3 3-3 3" />
          </svg>
        </button>

        <!-- Mobile close button -->
        <button
          class="lg:hidden p-2 -mr-1 text-dim hover:text-main transition-colors"
          @click="isSidebarOpen = false"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Navigation Content -->
      <div class="flex-1 overflow-y-auto px-2 py-6 space-y-4">
        <nav class="space-y-1">
          <SidebarLink
            to="/app"
            icon="dashboard"
            label="Dashboard"
            :is-active="isExactRoute('/app')"
            :collapsed="isSidebarCollapsed"
            @click="isSidebarOpen = false"
          />
          <SidebarLink
            to="/app/spaces"
            icon="spaces"
            label="Tours"
            :is-active="route.path.startsWith('/app/spaces')"
            :collapsed="isSidebarCollapsed"
            @click="isSidebarOpen = false"
          />
          <SidebarLink
            to="/app/analytics"
            icon="analytics"
            label="Insights"
            :is-active="
              route.path.startsWith('/app/analytics') ||
              route.path.startsWith('/app/leads')
            "
            :collapsed="isSidebarCollapsed"
            @click="isSidebarOpen = false"
          />
        </nav>

        <div class="border-t border-border dark:border-white/5 mx-2"></div>

        <nav class="space-y-1">
          <SidebarLink
            to="/app/settings"
            icon="settings"
            label="Settings"
            :is-active="route.path.startsWith('/app/settings')"
            :collapsed="isSidebarCollapsed"
            @click="isSidebarOpen = false"
          />
          <SidebarLink
            to="/app/billing"
            icon="billing"
            label="Billing"
            :is-active="route.path.startsWith('/app/billing')"
            :collapsed="isSidebarCollapsed"
            @click="isSidebarOpen = false"
          />
        </nav>
      </div>

      <!-- User Profile Area -->
      <div
        class="p-3 border-t border-border dark:border-white/5 bg-surface-alt/50 dark:bg-white/5"
      >
        <!-- Expanded profile -->
        <div
          v-if="!isSidebarCollapsed"
          class="flex items-center gap-3 mb-3 px-2 py-2 bg-white rounded-xl shadow-md dark:bg-white/[0.06] dark:shadow-none"
        >
          <div
            class="w-9 h-9 rounded-full bg-surface-alt dark:bg-white/5 border border-border dark:border-white/10 flex items-center justify-center text-xs font-bold text-main dark:text-white shadow-sm flex-shrink-0"
          >
            {{ authStore.avatarInitials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-main dark:text-white truncate">
              {{ user?.email?.split("@")[0] }}
            </p>
            <p
              class="text-[10px] font-extrabold uppercase tracking-widest text-dim truncate"
            >
              {{ planStore.plan?.name || "Free" }} Plan
            </p>
          </div>
        </div>
        <!-- Collapsed avatar -->
        <div v-else class="flex justify-center mb-3">
          <div
            class="w-8 h-8 rounded-full bg-surface-alt dark:bg-white/5 border border-border dark:border-white/10 flex items-center justify-center text-xs font-bold text-main dark:text-white shadow-sm"
            :title="user?.email?.split('@')[0]"
          >
            {{ authStore.avatarInitials }}
          </div>
        </div>

        <!-- Theme toggle -->
        <button
          @click="toggleTheme"
          :title="
            isSidebarCollapsed
              ? isDark
                ? 'Light Appearance'
                : 'Dark Appearance'
              : undefined
          "
          :class="[
            'flex items-center w-full py-2.5 text-xs font-black uppercase tracking-widest text-dim hover:text-main dark:text-zinc-400 dark:hover:text-white hover:bg-main/5 dark:hover:bg-white/5 rounded-2xl transition-all mb-1 group active:scale-95',
            isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4',
          ]"
        >
          <svg
            v-if="isDark"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="group-hover:rotate-45 transition-transform duration-500 flex-shrink-0"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="group-hover:-rotate-12 transition-transform duration-500 flex-shrink-0"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span v-if="!isSidebarCollapsed"
            >{{ isDark ? "Light" : "Dark" }} Appearance</span
          >
        </button>

        <button
          @click="logout"
          :title="isSidebarCollapsed ? 'Sign Out' : undefined"
          :class="[
            'flex items-center w-full py-2.5 text-xs font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-95 group',
            isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4',
          ]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="group-hover:translate-x-0.5 transition-transform flex-shrink-0"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span v-if="!isSidebarCollapsed">Sign Out</span>
        </button>
      </div>
    </aside>

    <!-- Main Viewport -->
    <div
      :class="[
        'flex flex-col min-h-screen transition-all duration-300',
        isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64',
      ]"
    >
      <!-- Topbar / Mobile Navigation -->
      <header
        class="h-16 flex items-center justify-between px-6 bg-surface border-b border-border sticky top-0 z-[80] lg:hidden"
      >
        <NuxtLink to="/app" class="flex items-center gap-2">
          <div
            class="w-6 h-6 rounded-md bg-main flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              class="text-bg"
            >
              <path
                d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
              />
            </svg>
          </div>
          <span class="text-base font-bold tracking-tight text-main"
            >Viewora</span
          >
        </NuxtLink>
        <div class="flex items-center gap-1">
          <button
            @click="toggleTheme"
            class="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <svg
              v-if="isDark"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
          <button
            class="p-2 -mr-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            @click="isSidebarOpen = true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <!-- App View -->
      <main
        class="flex-1 px-4 sm:px-8 md:px-12 lg:px-16 py-8 md:py-12 w-full max-w-[1600px] mx-auto overflow-x-hidden"
      >
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { navigateTo } from "#imports";
import { useAuthStore } from "~/stores/auth";
import { usePlanStore } from "~/stores/plan";
import { useSupabaseUser, useSupabaseClient, useRoute } from "#imports";

const isSidebarOpen = ref(false);
const isSidebarCollapsed = ref(false);

const toggleSidebarCollapse = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  if (import.meta.client) {
    localStorage.setItem("sidebar-collapsed", String(isSidebarCollapsed.value));
  }
};
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const route = useRoute();

const authStore = useAuthStore();
const planStore = usePlanStore();

const { isDark, toggle: toggleTheme, init: initTheme } = useTheme();

const isExactRoute = (path: string) => route.path === path;

// Initialize stores on mount
onMounted(async () => {
  initTheme();
  isSidebarCollapsed.value =
    localStorage.getItem("sidebar-collapsed") === "true";
  if (user.value && !planStore.plan && !planStore.pending) {
    authStore.setUser(user.value);
    await planStore.fetchSubscriptionStatus();
    authStore.fetchProfile().catch(() => {});
  }
});

const logout = async () => {
  authStore.$reset();
  planStore.$reset();
  await supabase.auth.signOut();
  await navigateTo("/");
};
</script>

<style scoped>
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
