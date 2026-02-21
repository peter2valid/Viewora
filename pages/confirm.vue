<template>
  <div class="auth-page section-bg">
    <div class="container" style="max-width: 500px; margin: 6rem auto; text-align: center;">
      <div class="card">
        <div v-if="loading" style="padding: 2rem;">
          <p class="text-lg font-semibold mb-2">Confirming your account...</p>
          <p class="text-muted">Please wait while we verify your email.</p>
        </div>
        <div v-else-if="error" style="padding: 2rem;">
          <p class="text-lg font-semibold mb-2" style="color: #ef4444;">Confirmation Failed</p>
          <p class="text-muted mb-6">{{ error }}</p>
          <NuxtLink to="/login" class="btn btn-primary">Go to Login</NuxtLink>
        </div>
        <div v-else style="padding: 2rem;">
          <p class="text-lg font-semibold mb-2" style="color: #16a34a;">Email Confirmed!</p>
          <p class="text-muted mb-6">Your account has been verified. You can now log in.</p>
          <NuxtLink to="/login" class="btn btn-primary">Log In</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)
const error = ref('')

onMounted(() => {
  // Supabase handles the token exchange automatically via the module.
  // After a short delay, we check the user state.
  setTimeout(() => {
    const user = useSupabaseUser()
    if (user.value) {
      loading.value = false
    } else {
      loading.value = false
      error.value = 'Could not verify your email. The link may have expired.'
    }
  }, 2000)
})

useSeoMeta({
  title: 'Confirm Email',
  description: 'Confirming your Viewora account email address.'
})
</script>
