<template>
  <div class="auth-page section-bg">
    <div class="container auth-container">
      <div class="card auth-card" style="margin: 4rem auto; max-width: 450px;">
        <h1 class="auth-title mb-6 text-center" style="font-size: 1.75rem;">Create your Account</h1>
        <form @submit.prevent="signUp">
          <div v-if="errorMsg" class="mb-4" style="background: #fee2e2; color: #ef4444; padding: 0.75rem; border-radius: 0.5rem; text-align: center; font-size: 0.875rem;">
            {{ errorMsg }}
          </div>
          <div v-if="successMsg" class="mb-4" style="background: #dcfce7; color: #16a34a; padding: 0.75rem; border-radius: 0.5rem; text-align: center; font-size: 0.875rem;">
            {{ successMsg }}
          </div>

          <div class="form-group mb-4">
            <label for="fullName" class="font-semibold text-sm block mb-2">Full Name</label>
            <input id="fullName" type="text" v-model="fullName" placeholder="e.g. Peter Njoroge" required class="form-input" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; outline: none;">
          </div>

          <div class="form-group mb-4">
            <div class="label-row" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <label for="email" class="font-semibold text-sm">Email Address</label>
              <NuxtLink to="/login" class="auth-link text-sm text-primary">(Log In instead)</NuxtLink>
            </div>
            <input id="email" type="email" v-model="email" placeholder="you@example.com" required class="form-input" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; outline: none;">
          </div>
          
          <div class="form-group mb-4">
            <label for="password" class="font-semibold text-sm block mb-2">Password</label>
            <input id="password" type="password" v-model="password" placeholder="At least 6 characters" required class="form-input" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; outline: none;">
          </div>

          <div class="form-group mb-6">
            <label for="confirm-password" class="font-semibold text-sm block mb-2">Confirm Password</label>
            <input id="confirm-password" type="password" v-model="confirmPassword" placeholder="Repeat your password" required class="form-input" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; outline: none;">
          </div>

          <div class="form-group checkbox-group mb-4" style="display: flex; align-items: flex-start; gap: 0.5rem;">
            <input type="checkbox" id="terms" v-model="agreedToTerms" style="width: 1rem; height: 1rem; margin-top: 0.25rem;">
            <label for="terms" class="text-sm cursor-pointer" style="line-height: 1.4;">
              I agree to the <NuxtLink to="/legal/terms" class="text-primary">Terms of Service</NuxtLink> and <NuxtLink to="/legal/privacy" class="text-primary">Privacy Policy</NuxtLink>.
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-block mb-6" :disabled="isLoading">
            {{ isLoading ? 'Creating account...' : 'Create Account' }}
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
const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreedToTerms = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const isLoading = ref(false)

const signUp = async () => {
  errorMsg.value = ''
  successMsg.value = ''

  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match.'
    return
  }
  if (password.value.length < 6) {
    errorMsg.value = 'Password must be at least 6 characters.'
    return
  }
  if (!agreedToTerms.value) {
    errorMsg.value = 'You must agree to the Terms of Service.'
    return
  }

  isLoading.value = true

  try {
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          full_name: fullName.value,
        }
      }
    })
    
    if (error) throw error
    
    successMsg.value = 'Account created! Check your email for the confirmation link.'
  } catch (err: any) {
    errorMsg.value = err.message || 'An error occurred during registration.'
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
  title: 'Create Account',
  description: 'Sign up for a Viewora account and start creating virtual tours today.'
})
</script>