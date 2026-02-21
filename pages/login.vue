<template>
  <div class="auth-page section-bg">
    <div class="container auth-container">
      <div class="card auth-card" style="margin: 4rem auto; max-width: 450px;">
        <h1 class="auth-title mb-6 text-center" style="font-size: 1.75rem;">Log In to Viewora</h1>
        <form @submit.prevent="signIn">
          <div v-if="errorMsg" class="mb-4" style="background: #fee2e2; color: #ef4444; padding: 0.75rem; border-radius: 0.5rem; text-align: center; font-size: 0.875rem;">
            {{ errorMsg }}
          </div>
          <div class="form-group mb-4">
            <div class="label-row" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <label for="email" class="font-semibold text-sm">Email Address</label>
              <NuxtLink to="/register" class="auth-link text-sm text-primary">(Create an account)</NuxtLink>
            </div>
            <input id="email" type="email" v-model="email" placeholder="Email address" class="form-input w-full p-3 border rounded-lg outline-none" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem;">
          </div>
          
          <div class="form-group mb-6">
            <div class="label-row" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <label for="password" class="font-semibold text-sm">Password</label>
              <NuxtLink to="#" class="auth-link text-sm text-primary">(Forgot Password?)</NuxtLink>
            </div>
            <input id="password" type="password" v-model="password" placeholder="Password" class="form-input w-full p-3 border rounded-lg outline-none" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem;">
          </div>

          <div class="form-group checkbox-group mb-6" style="display: flex; align-items: center; gap: 0.5rem;">
            <input type="checkbox" id="remember" style="width: 1rem; height: 1rem;">
            <label for="remember" class="text-sm cursor-pointer">Remember me for 30 days</label>
          </div>

          <button type="submit" class="btn btn-primary btn-block mb-6" :disabled="isLoading">
            {{ isLoading ? 'Logging in...' : 'Log In' }}
          </button>

          <div class="auth-divider" style="display: flex; align-items: center; margin: 1.5rem 0; color: var(--text-muted); font-size: 0.875rem;">
            <span style="flex: 1; height: 1px; background: var(--border-color);"></span>
            <span style="padding: 0 1rem;">OR</span>
            <span style="flex: 1; height: 1px; background: var(--border-color);"></span>
          </div>

          <button type="button" @click="signInWithGoogle" class="btn btn-secondary btn-block" style="display: flex; align-items: center; justify-content: center; gap: 0.75rem;">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const supabase = useSupabaseClient()
const email = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

const signIn = async () => {
  errorMsg.value = ''
  isLoading.value = true

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    
    if (error) throw error
    
    const router = useRouter()
    router.push('/')
  } catch (err: any) {
    errorMsg.value = err.message || 'An error occurred during log in.'
  } finally {
    isLoading.value = false
  }
}

const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/confirm`
    }
  })
  if (error) {
    errorMsg.value = error.message
  }
}

useSeoMeta({
  title: 'Log In',
  description: 'Log in to your Viewora account to manage your virtual tours.'
})
</script>