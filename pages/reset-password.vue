<template>
  <div class="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 antialiased text-zinc-900">
    <div class="w-full max-w-[400px] space-y-8">
      <!-- Logo -->
      <div class="flex flex-col items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-zinc-900">Reset your Password</h1>
      </div>

      <div class="bg-white rounded-xl border border-zinc-200 shadow-sm p-8">
        <!-- Success State -->
        <div v-if="sent" class="flex flex-col items-center text-center gap-4">
          <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <p class="text-base font-semibold text-zinc-900">Check your inbox</p>
            <p class="text-sm text-zinc-500 mt-1">We sent a reset link to <span class="font-medium text-zinc-700">{{ email }}</span></p>
          </div>
          <NuxtLink to="/login" class="w-full text-center py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors shadow-sm mt-2">
            Back to Login
          </NuxtLink>
        </div>

        <!-- Form State -->
        <form v-else @submit.prevent="sendReset" class="space-y-6">
          <div>
            <p class="text-sm text-zinc-500 leading-relaxed">
              Enter your account email and we'll send you a link to reset your password.
            </p>
          </div>

          <div v-if="errorMsg" class="p-3 bg-red-50 border border-red-100 rounded-md text-sm font-medium text-red-600 text-center">
            {{ errorMsg }}
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="reset-email" class="text-sm font-medium text-zinc-700">Email Address</label>
            <input
              id="reset-email"
              type="email"
              v-model="email"
              placeholder="you@example.com"
              required
              class="w-full px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm transition-shadow"
            />
          </div>

          <button
            type="submit"
            class="w-full py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            :disabled="loading"
          >
            <svg v-if="loading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ loading ? 'Sending…' : 'Send Reset Link' }}
          </button>
        </form>
      </div>

      <p class="text-center text-sm text-zinc-500">
        Remembered it?
        <NuxtLink to="/login" class="font-medium text-zinc-900 hover:underline">Back to Login</NuxtLink>
      </p>
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
