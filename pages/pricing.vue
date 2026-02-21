<template>
  <div>
    <section class="section section-bg">
      <div class="container text-center">
        <h1 class="section-title">Simple, Transparent Pricing</h1>
        <p class="section-subtitle mb-12" style="max-width: 600px; margin-left: auto; margin-right: auto;">
          Choose the plan that fits your property portfolio. No hidden setup fees or surprise charges.
        </p>

        <!-- Toggle -->
        <div class="mb-12" style="display: flex; justify-content: center; align-items: center; gap: 1rem;">
          <span :class="{'font-bold': billingFreq === 'monthly', 'text-muted': billingFreq !== 'monthly'}">Monthly</span>
          <div class="toggle-switch" @click="billingFreq = billingFreq === 'monthly' ? 'yearly' : 'monthly'" style="width: 48px; height: 24px; background: var(--primary); border-radius: 12px; position: relative; cursor: pointer;">
            <div style="width: 20px; height: 20px; background: white; border-radius: 50%; position: absolute; top: 2px; transition: 0.2s;" :style="{ left: billingFreq === 'monthly' ? '2px' : '26px' }"></div>
          </div>
          <span :class="{'font-bold': billingFreq === 'yearly', 'text-muted': billingFreq !== 'yearly'}">Yearly <span class="badge" style="margin-top: 0; margin-bottom: 0; margin-left: 0.5rem; font-size: 0.75rem;">Save 20%</span></span>
        </div>

        <div class="grid-3">
          <!-- Starter -->
          <div class="card" style="display: flex; flex-direction: column; text-align: left;">
            <h3 class="mb-2">Starter</h3>
            <p class="text-muted mb-6">Perfect for individual Airbnb hosts.</p>
            <div class="mb-6">
              <span style="font-size: 2.5rem; font-weight: 800; font-family: var(--font-display);">KSh {{ billingFreq === 'monthly' ? '1,500' : '14,400' }}</span>
              <span class="text-muted">/{{ billingFreq === 'monthly' ? 'mo' : 'yr' }}</span>
            </div>
            <NuxtLink to="/register" class="btn btn-secondary btn-block mb-8">Start Free Trial</NuxtLink>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 1rem; flex: 1;">
              <li style="display: flex; gap: 0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> 1 Active Property</li>
              <li style="display: flex; gap: 0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Up to 5 Rooms per property</li>
              <li style="display: flex; gap: 0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Standard Support</li>
            </ul>
          </div>

          <!-- Professional -->
          <div class="card" style="display: flex; flex-direction: column; text-align: left; border: 2px solid var(--primary); transform: scale(1.05); z-index: 1;">
            <div style="background: var(--primary); color: white; text-align: center; padding: 0.25rem; font-weight: bold; border-radius: 9999px; font-size: 0.875rem; width: max-content; margin: -3rem auto 1rem auto; padding: 0.25rem 1rem;">Most Popular</div>
            <h3 class="mb-2">Professional</h3>
            <p class="text-muted mb-6">For real estate agents and managers.</p>
            <div class="mb-6">
              <span style="font-size: 2.5rem; font-weight: 800; font-family: var(--font-display);">KSh {{ billingFreq === 'monthly' ? '4,500' : '43,200' }}</span>
              <span class="text-muted">/{{ billingFreq === 'monthly' ? 'mo' : 'yr' }}</span>
            </div>
            <NuxtLink to="/register" class="btn btn-primary btn-block mb-8">Start Free Trial</NuxtLink>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 1rem; flex: 1;">
              <li style="display: flex; gap: 0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Up to 10 Active Properties</li>
              <li style="display: flex; gap: 0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Up to 15 Rooms per property</li>
              <li style="display: flex; gap: 0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Priority Email Support</li>
              <li style="display: flex; gap: 0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Analytics Dashboard</li>
            </ul>
          </div>

          <!-- Business -->
          <div class="card" style="display: flex; flex-direction: column; text-align: left;">
            <h3 class="mb-2">Business</h3>
            <p class="text-muted mb-6">For developers and large agencies.</p>
            <div class="mb-6">
              <span style="font-size: 2.5rem; font-weight: 800; font-family: var(--font-display);">KSh {{ billingFreq === 'monthly' ? '12,000' : '115,200' }}</span>
              <span class="text-muted">/{{ billingFreq === 'monthly' ? 'mo' : 'yr' }}</span>
            </div>
            <NuxtLink to="/register" class="btn btn-secondary btn-block mb-8">Start Free Trial</NuxtLink>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 1rem; flex: 1;">
              <li style="display: flex; gap: 0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Unlimited Active Properties</li>
              <li style="display: flex; gap: 0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Unlimited Rooms</li>
              <li style="display: flex; gap: 0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Custom Agency Branding</li>
              <li style="display: flex; gap: 0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Dedicated Account Manager</li>
            </ul>
          </div>
        </div>

        <div class="mt-12 text-center text-muted" style="max-width: 600px; margin-left: auto; margin-right: auto; padding: 1.5rem; background: var(--bg-base); border-radius: 0.5rem; border: 1px dashed var(--border-color);">
          <p class="font-bold mb-2">Billing & Cancellation Policy</p>
          <p class="text-sm">Subscriptions are billed {{ billingFreq }}. Users may cancel anytime before the next billing cycle. Payments are securely processed by Paystack.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const billingFreq = ref('monthly');

useSeoMeta({
  title: 'Pricing & Plans | Viewora Virtual Tour Software',
  description: 'Transparent pricing for every property professional. Start your free trial today and scale your virtual real estate marketing.'
})
</script>