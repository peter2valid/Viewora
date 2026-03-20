<template>
  <div class="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 antialiased text-zinc-900">
    <div class="w-full max-w-[400px] space-y-8">
      <!-- Logo -->
      <div class="flex flex-col items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-zinc-900">Create your Account</h1>
      </div>

      <div class="bg-white rounded-xl border border-zinc-200 shadow-sm p-8">
        <form @submit.prevent="signUp" class="space-y-6">
          <div v-if="errorMsg" class="p-3 bg-red-50 border border-red-100 rounded-md text-sm font-medium text-red-600 text-center">
            {{ errorMsg }}
          </div>
          <div v-if="successMsg" class="p-3 bg-emerald-50 border border-emerald-100 rounded-md text-sm font-medium text-emerald-600 text-center">
            {{ successMsg }}
          </div>

          <!-- Social Signup -->
          <button 
            type="button" 
            @click="signInWithGoogle" 
            class="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div class="flex items-center gap-4 py-2">
            <div class="flex-1 h-px bg-zinc-100"></div>
            <span class="text-xs font-medium text-zinc-400 uppercase tracking-widest">or</span>
            <div class="flex-1 h-px bg-zinc-100"></div>
          </div>

          <!-- Form Fields -->
          <div class="space-y-4">
            <div class="flex flex-col gap-1.5">
              <label for="fullName" class="text-sm font-medium text-zinc-700">Full Name</label>
              <input 
                id="fullName" 
                type="text" 
                v-model="fullName" 
                placeholder="Peter Njoroge" 
                class="w-full px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm transition-shadow" 
                required 
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="email" class="text-sm font-medium text-zinc-700">Email Address</label>
              <input 
                id="email" 
                type="email" 
                v-model="email" 
                placeholder="you@example.com" 
                class="w-full px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm transition-shadow" 
                required 
              />
            </div>
            
            <div class="flex flex-col gap-1.5">
              <label for="password" class="text-sm font-medium text-zinc-700">Password</label>
              <input 
                id="password" 
                type="password" 
                v-model="password" 
                placeholder="At least 6 characters" 
                class="w-full px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm transition-shadow" 
                required 
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="confirm-password" class="text-sm font-medium text-zinc-700">Confirm Password</label>
              <input 
                id="confirm-password" 
                type="password" 
                v-model="confirmPassword" 
                placeholder="Repeat your password" 
                class="w-full px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm transition-shadow" 
                required 
              />
            </div>
          </div>

          <div class="flex items-start gap-2">
            <input type="checkbox" id="terms" v-model="agreedToTerms" class="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 mt-0.5" />
            <label for="terms" class="text-xs text-zinc-500 leading-normal cursor-pointer">
              I agree to the <NuxtLink to="/legal/terms" class="text-zinc-900 font-medium hover:underline">Terms of Service</NuxtLink> and <NuxtLink to="/legal/privacy" class="text-zinc-900 font-medium hover:underline">Privacy Policy</NuxtLink>.
            </label>
          </div>

          <button 
            type="submit" 
            class="w-full py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50" 
            :disabled="isLoading"
          >
            {{ isLoading ? 'Creating account...' : 'Create Account' }}
          </button>
        </form>
      </div>

      <p class="text-center text-sm text-zinc-500">
        Already have an account? 
        <NuxtLink to="/login" class="font-medium text-zinc-900 hover:underline">Log In</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta, useSupabaseClient, navigateTo, useSeoMeta } from '#imports'

definePageMeta({
  middleware: 'guest'
})

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
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          full_name: fullName.value,
        }
      }
    })
    
    if (error) throw error
    
    if (data.session) {
      await navigateTo('/app')
    } else {
      successMsg.value = 'Account created! Check your email for the confirmation link.'
    }
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
  title: 'Create Account | Viewora',
  description: 'Sign up for a Viewora account and start creating virtual tours today.'
})
</script>
