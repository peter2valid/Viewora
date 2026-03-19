<template>
  <div class="auth-page section-bg">
    <div class="container" style="max-width: 500px; margin: 6rem auto;">
      <div class="card" style="padding: 2.5rem;">
        <h1 class="auth-title mb-6 text-center" style="font-size: 1.75rem;">Reset Password</h1>

        <div v-if="sent" style="text-align: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
            fill="none" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
            style="margin-bottom: 1rem;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <p style="font-size: 1rem; font-weight: 600; color: #16a34a; margin-bottom: 0.5rem;">Email sent!</p>
          <p class="text-muted">Check your inbox for a password reset link.</p>
          <NuxtLink to="/login" class="btn btn-secondary" style="margin-top: 1.5rem; display: inline-block;">
            Back to Login
          </NuxtLink>
        </div>

        <form v-else @submit.prevent="sendReset">
          <div v-if="errorMsg" style="background: #fee2e2; color: #ef4444; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.875rem; text-align: center;">
            {{ errorMsg }}
          </div>

          <p class="text-muted" style="margin-bottom: 1.5rem; font-size: 0.9rem;">
            Enter your account email and we'll send you a link to reset your password.
          </p>

          <div class="form-group mb-6">
            <label for="reset-email" class="font-semibold text-sm block mb-2">Email Address</label>
            <input
              id="reset-email"
              type="email"
              v-model="email"
              placeholder="you@example.com"
              required
              class="form-input"
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; outline: none;"
            />
          </div>

          <button type="submit" class="btn btn-primary btn-block mb-4" :disabled="loading">
            {{ loading ? 'Sending…' : 'Send Reset Link' }}
          </button>

          <div style="text-align: center;">
            <NuxtLink to="/login" class="auth-link text-sm text-primary">← Back to Login</NuxtLink>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({ middleware: 'guest' })

const supabase = useSupabaseClient()
const email = ref('')
const loading = ref(false)
const errorMsg = ref('')
const sent = ref(false)

const sendReset = async () => {
  errorMsg.value = ''
  loading.value = true
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) throw error
    sent.value = true
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to send reset email. Please try again.'
  } finally {
    loading.value = false
  }
}

useSeoMeta({
  title: 'Reset Password | Viewora',
  description: 'Send a password reset link to your Viewora account email.',
})
</script>
