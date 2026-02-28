<template>
  <div class="app-page">
    <div class="app-page-header">
      <div>
        <h1 class="app-page-title">Billing</h1>
        <p class="app-page-subtitle">Manage your subscription and payment details.</p>
      </div>
    </div>

    <!-- Current plan card -->
    <div class="billing-plan-card card">
      <div class="billing-plan-header">
        <div>
          <div class="billing-plan-label">Current Plan</div>
          <div class="billing-plan-name">Free</div>
        </div>
        <span class="badge">Active</span>
      </div>

      <div class="billing-plan-limits">
        <div class="billing-limit-item">
          <span class="billing-limit-value">0 / 0</span>
          <span class="billing-limit-label">Tours used</span>
        </div>
        <div class="billing-limit-item">
          <span class="billing-limit-value">0 MB / 0 GB</span>
          <span class="billing-limit-label">Storage used</span>
        </div>
      </div>

      <NuxtLink to="/pricing" class="btn btn-primary" style="align-self: flex-start;">
        Upgrade Plan →
      </NuxtLink>
    </div>

    <!-- Coming soon notice -->
    <div class="app-state-box app-state-box--info" style="margin-top: 2rem;">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>
        Paystack billing integration is coming soon. <br />
        Contact <a href="mailto:support@viewora.software">support@viewora.software</a> to activate a plan manually.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

useSeoMeta({ title: 'Billing | Viewora' })
</script>
