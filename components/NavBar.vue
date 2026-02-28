<template>
  <header class="nav">
    <div class="container">
      <NuxtLink to="/" class="logo">Viewora</NuxtLink>
      
      <!-- Desktop Navigation -->
      <nav class="nav-links">
        <NuxtLink to="/product" class="nav-link">Product</NuxtLink>
        <NuxtLink to="/blog" class="nav-link">Blog</NuxtLink>
        <NuxtLink to="/pricing" class="nav-link">Pricing</NuxtLink>
        <NuxtLink to="/about" class="nav-link">About</NuxtLink>
        <NuxtLink to="/contact" class="nav-link">Contact</NuxtLink>
      </nav>

      <div class="nav-actions">
        <!-- Logged Out View -->
        <template v-if="!user">
          <NuxtLink to="/login" class="nav-link">Log in</NuxtLink>
          <NuxtLink to="/register" class="btn btn-dark" style="padding: 0.5rem 1rem; font-size: 0.875rem;">Start Free</NuxtLink>
        </template>
        <!-- Logged In View -->
        <template v-else>
          <NuxtLink to="/app/spaces" class="nav-link">Dashboard</NuxtLink>
          <button @click="signOut" class="btn btn-outline" style="padding: 0.5rem 1rem;">Log Out</button>
        </template>
      </div>

      <!-- Mobile Menu Button -->
      <button class="mobile-menu-btn" aria-label="Toggle menu" @click="isMobileMenuOpen = !isMobileMenuOpen">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
    </div>
    
    <!-- Mobile Navigation Overlay -->
    <Transition name="mobile-menu">
      <div v-show="isMobileMenuOpen" class="mobile-menu-overlay" style="position: absolute; top: 100%; left: 0; right: 0; background: var(--paper); padding: 1.25rem; border-bottom: 1px solid var(--border); box-shadow: var(--shadow-float); z-index: 99; transform-origin: top;">
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <NuxtLink to="/product" class="nav-link" @click="isMobileMenuOpen = false">Product</NuxtLink>
          <NuxtLink to="/pricing" class="nav-link" @click="isMobileMenuOpen = false">Pricing</NuxtLink>
          <NuxtLink to="/about" class="nav-link" @click="isMobileMenuOpen = false">About</NuxtLink>
          <NuxtLink to="/contact" class="nav-link" @click="isMobileMenuOpen = false">Contact</NuxtLink>
          <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 0.5rem 0;" />
          
          <template v-if="!user">
            <NuxtLink to="/login" class="nav-link" @click="isMobileMenuOpen = false">Log in</NuxtLink>
            <NuxtLink to="/register" class="btn btn-dark btn-block" @click="isMobileMenuOpen = false">Start Free</NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/app/spaces" class="nav-link font-bold text-primary" @click="isMobileMenuOpen = false">Dashboard</NuxtLink>
            <button @click="signOut(); isMobileMenuOpen = false" class="btn btn-outline btn-block text-center">Log Out</button>
          </template>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isMobileMenuOpen = ref(false);
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const signOut = async () => {
  await supabase.auth.signOut()
  const router = useRouter()
  router.push('/')
}
</script>

<style scoped>
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.95);
}
</style>