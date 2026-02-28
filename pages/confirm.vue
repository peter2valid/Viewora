<template>
  <div class="auth-page section-bg">
    <div class="container" style="max-width: 500px; margin: 6rem auto; text-align: center;">
      <div class="card" style="padding: 2.5rem;">
        <!-- Loading -->
        <div v-if="loading">
          <div class="confirm-spinner" aria-label="Verifying account"></div>
          <p class="text-lg font-semibold mb-2" style="margin-top: 1.5rem;">Verifying your account…</p>
          <p class="text-muted">Please wait a moment.</p>
        </div>

        <!-- Error -->
        <div v-else-if="errorMsg">
          <div style="color: #ef4444; margin-bottom: 1rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <p class="text-lg font-semibold mb-2" style="color: #ef4444;">Confirmation Failed</p>
          <p class="text-muted mb-6">{{ errorMsg }}</p>
          <NuxtLink to="/login" class="btn btn-primary">Back to Login</NuxtLink>
        </div>

        <!-- Success — auto-redirects, shows briefly -->
        <div v-else>
          <div style="color: #16a34a; margin-bottom: 1rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <p class="text-lg font-semibold mb-2" style="color: #16a34a;">Account Confirmed!</p>
          <p class="text-muted mb-6">Redirecting you to your dashboard…</p>
          <NuxtLink to="/app/spaces" class="btn btn-primary">Go to Dashboard →</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const user = useSupabaseUser()
const router = useRouter()

const loading = ref(true)
const errorMsg = ref('')

// Watch for the Supabase session to settle (the module exchanges the token
// automatically on mount). Once the user is populated, redirect to the app.
const unwatch = watch(
  user,
  (u) => {
    if (u) {
      loading.value = false
      unwatch()
      navigateTo('/app/spaces')
    }
  },
  { immediate: true }
)

// Fallback: if the user is still null after 4 seconds, the link likely expired
if (!user.value) {
  setTimeout(() => {
    if (!user.value) {
      loading.value = false
      errorMsg.value = 'Could not verify your email. The link may have expired — please try logging in.'
    }
  }, 4000)
}

useSeoMeta({
  title: 'Confirm Email | Viewora',
  description: 'Confirming your Viewora account email address.',
})
</script>
