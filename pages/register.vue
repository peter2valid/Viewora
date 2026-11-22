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
        <section v-if="confirmationPending" class="space-y-6" aria-labelledby="confirmation-title">
          <div class="space-y-3 text-left">
            <span class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>
            </span>
            <div>
              <h2 id="confirmation-title" class="text-xl font-bold tracking-tight text-zinc-900">Confirm your email</h2>
              <p class="mt-2 text-sm leading-6 text-zinc-600">
                Your Viewora account is ready to confirm. We asked to send a confirmation link to
                <strong class="font-semibold text-zinc-900">{{ verificationEmail }}</strong>.
              </p>
            </div>
          </div>

          <div class="border-l-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-900" role="status">
            Open the link in your inbox to finish creating your account. If it is not there after a few minutes, check Spam or request another link below.
          </div>

          <p v-if="resendMessage" class="text-sm font-medium" :class="resendError ? 'text-red-600' : 'text-emerald-700'" role="status" aria-live="polite">
            {{ resendMessage }}
          </p>

          <button
            type="button"
            class="w-full min-h-12 border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isResending || resendCooldown > 0"
            @click="resendConfirmation"
          >
            {{ isResending ? 'Requesting another link…' : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend confirmation link' }}
          </button>

          <button type="button" class="w-full text-sm font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2" @click="useDifferentEmail">
            Use a different email address
          </button>
        </section>

        <form v-else @submit.prevent="signUp" class="space-y-6">
          <div v-if="errorMsg" class="p-3 bg-red-50 border border-red-100 rounded-md text-sm font-medium text-red-600 text-center">
            {{ errorMsg }}
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
import { onBeforeUnmount, ref } from 'vue'
import { definePageMeta, useSupabaseClient, navigateTo, useSeoMeta } from '#imports'
import { rememberReturnTo, takeReturnTo } from '~/utils/returnTo'

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
const isLoading = ref(false)
const confirmationPending = ref(false)
const verificationEmail = ref('')
const isResending = ref(false)
const resendCooldown = ref(0)
const resendMessage = ref('')
const resendError = ref(false)
let resendCooldownTimer: ReturnType<typeof setInterval> | undefined

const analytics = useAnalytics()

const emailRedirectTo = () => `${window.location.origin}/confirm`

const startResendCooldown = () => {
  resendCooldown.value = 60
  if (resendCooldownTimer) clearInterval(resendCooldownTimer)
  resendCooldownTimer = setInterval(() => {
    resendCooldown.value -= 1
    if (resendCooldown.value <= 0 && resendCooldownTimer) {
      clearInterval(resendCooldownTimer)
      resendCooldownTimer = undefined
    }
  }, 1000)
}

const resendConfirmation = async () => {
  if (!verificationEmail.value || isResending.value || resendCooldown.value > 0) return

  isResending.value = true
  resendMessage.value = ''
  resendError.value = false

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: verificationEmail.value,
      options: { emailRedirectTo: emailRedirectTo() },
    })
    if (error) throw error

    resendMessage.value = 'Another confirmation link has been requested. Please check your inbox and Spam folder.'
    startResendCooldown()
  } catch (err: any) {
    resendError.value = true
    resendMessage.value = err.message || 'We could not request another confirmation link. Please try again shortly.'
  } finally {
    isResending.value = false
  }
}

const useDifferentEmail = () => {
  confirmationPending.value = false
  resendMessage.value = ''
  resendError.value = false
  resendCooldown.value = 0
  if (resendCooldownTimer) {
    clearInterval(resendCooldownTimer)
    resendCooldownTimer = undefined
  }
}

const signUp = async () => {
  errorMsg.value = ''

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
        },
        emailRedirectTo: emailRedirectTo(),
      },
    })

    if (error) throw error

    analytics.track('signup_completed', { method: 'email' })

    if (data.session) {
      // Email confirmation disabled — user is immediately logged in, send welcome now.
      // (If confirmation is required, welcome fires in confirm.vue instead.)
      useApiFetch().apiFetch('/profile/welcome', { method: 'POST' }).catch(() => {})
      await navigateTo(takeReturnTo() ?? '/app')
    } else {
      verificationEmail.value = email.value.trim()
      confirmationPending.value = true
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'An error occurred during registration.'
  } finally {
    isLoading.value = false
  }
}

onBeforeUnmount(() => {
  if (resendCooldownTimer) clearInterval(resendCooldownTimer)
})

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
