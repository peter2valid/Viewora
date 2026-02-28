<template>
  <div class="app-page">
    <div class="app-page-header">
      <div>
        <h1 class="app-page-title">Settings</h1>
        <p class="app-page-subtitle">Manage your account and preferences.</p>
      </div>
    </div>

    <!-- Profile section -->
    <div class="card settings-section">
      <h2 class="settings-section-title">Profile</h2>

      <div class="form-group mb-4">
        <label class="form-label" for="settings-email">Email Address</label>
        <input
          id="settings-email"
          type="email"
          class="form-input"
          :value="user?.email"
          disabled
          style="background: var(--paper-dim); color: var(--text-secondary);"
        />
        <p class="form-hint">Email address cannot be changed here.</p>
      </div>

      <div class="form-group mb-6">
        <label class="form-label" for="settings-name">Full Name</label>
        <input
          id="settings-name"
          type="text"
          class="form-input"
          :value="user?.user_metadata?.full_name ?? ''"
          placeholder="Your full name"
          disabled
        />
        <p class="form-hint">Profile editing coming soon.</p>
      </div>

      <button class="btn btn-secondary" disabled>
        Save Changes (coming soon)
      </button>
    </div>

    <!-- Danger zone -->
    <div class="card settings-section settings-section--danger">
      <h2 class="settings-section-title settings-section-title--danger">Danger Zone</h2>
      <p class="text-muted text-sm" style="margin-bottom: 1.25rem;">
        Permanently delete your account and all associated spaces and tours. This action cannot be undone.
      </p>
      <button class="btn btn-danger" disabled>
        Delete Account (coming soon)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

useSeoMeta({ title: 'Settings | Viewora' })

const user = useSupabaseUser()
</script>
