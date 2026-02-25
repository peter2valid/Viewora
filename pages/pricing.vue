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

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem;">
          <!-- Basic -->
          <div class="card" style="display: flex; flex-direction: column; text-align: left;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #22c55e;"></div>
              <h3 style="margin: 0;">Basic</h3>
            </div>
            <p class="text-muted mb-6" style="font-size: 0.9rem;">For landlords, small agents, budget users</p>
            <div class="mb-6">
              <span style="font-size: 2rem; font-weight: 800; font-family: var(--font-display);">KES {{ billingFreq === 'monthly' ? '1,500' : '15,000' }}</span>
              <span class="text-muted text-sm">/{{ billingFreq === 'monthly' ? 'mo' : 'yr' }}</span>
            </div>
            <NuxtLink to="/register" class="btn btn-secondary btn-block mb-6">Start Free Trial</NuxtLink>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.75rem; flex: 1; margin-bottom: 1.5rem; font-size: 0.9rem;">
              <li style="display: flex; gap: 0.5rem; font-weight: bold;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> 2 Active 360 Tours</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Standard image quality</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Shareable tour link & QR code</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Property info panel & map</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Basic analytics (views)</li>
              <li style="display: flex; gap: 0.5rem; color: var(--text-muted);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Viewora branding</li>
              <li style="display: flex; gap: 0.5rem; color: var(--text-muted);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> 2 GB storage</li>
            </ul>
            <div style="border-top: 1px solid var(--border); padding-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
              <strong>Add-ons:</strong> Extra tour (200), HD upgrade (300), Photography (4,000)
            </div>
          </div>

          <!-- Plus -->
          <div class="card" style="display: flex; flex-direction: column; text-align: left; border: 2px solid var(--primary); position: relative;">
            <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); color: white; padding: 2px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; white-space: nowrap;">Most Popular</div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #3b82f6;"></div>
              <h3 style="margin: 0;">Plus</h3>
            </div>
            <p class="text-muted mb-6" style="font-size: 0.9rem;">For active agents</p>
            <div class="mb-6">
              <span style="font-size: 2rem; font-weight: 800; font-family: var(--font-display);">KES {{ billingFreq === 'monthly' ? '4,000' : '40,000' }}</span>
              <span class="text-muted text-sm">/{{ billingFreq === 'monthly' ? 'mo' : 'yr' }}</span>
            </div>
            <NuxtLink to="/register" class="btn btn-primary btn-block mb-6">Start Free Trial</NuxtLink>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.75rem; flex: 1; margin-bottom: 1.5rem; font-size: 0.9rem;">
              <li style="display: flex; gap: 0.5rem; font-weight: bold;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> 15 Active Tours</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> HD panoramas</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Website embed & Photo gallery</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Lead capture button</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Hotspot navigation</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Advanced analytics & Branded pages</li>
              <li style="display: flex; gap: 0.5rem; color: var(--text-muted);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> 8 GB storage</li>
            </ul>
            <div style="border-top: 1px solid var(--border); padding-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
              <strong>Add-ons:</strong> Extra tour (150), Photography (3,800)
            </div>
          </div>

          <!-- Pro -->
          <div class="card" style="display: flex; flex-direction: column; text-align: left;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #a855f7;"></div>
              <h3 style="margin: 0;">Pro</h3>
            </div>
            <p class="text-muted mb-6" style="font-size: 0.9rem;">For agencies & serious sellers</p>
            <div class="mb-6">
              <span style="font-size: 2rem; font-weight: 800; font-family: var(--font-display);">KES {{ billingFreq === 'monthly' ? '8,500' : '85,000' }}</span>
              <span class="text-muted text-sm">/{{ billingFreq === 'monthly' ? 'mo' : 'yr' }}</span>
            </div>
            <NuxtLink to="/register" class="btn btn-secondary btn-block mb-6">Start Free Trial</NuxtLink>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.75rem; flex: 1; margin-bottom: 1.5rem; font-size: 0.9rem;">
              <li style="display: flex; gap: 0.5rem; font-weight: bold;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> 40 Active Tours</li>
              <li style="display: flex; gap: 0.5rem; font-weight: bold; color: var(--primary);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Includes {{ billingFreq === 'monthly' ? '1 photo shoot / mo' : '12 photo shoots / yr' }}</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Branding control (your logo)</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Google Street View publishing</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Multi-property dashboard</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Project / apartment mode</li>
              <li style="display: flex; gap: 0.5rem; color: var(--text-muted);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Priority hosting & 20 GB storage</li>
            </ul>
            <div style="border-top: 1px solid var(--border); padding-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
              <strong>Add-ons:</strong> Extra shoots (3,500)
            </div>
          </div>

          <!-- Elite -->
          <div class="card" style="display: flex; flex-direction: column; text-align: left;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #eab308;"></div>
              <h3 style="margin: 0;">Elite</h3>
            </div>
            <p class="text-muted mb-6" style="font-size: 0.9rem;">For developers & large orgs</p>
            <div class="mb-6">
              <span style="font-size: 2rem; font-weight: 800; font-family: var(--font-display);">KES {{ billingFreq === 'monthly' ? '18,000' : '180,000' }}</span>
              <span class="text-muted text-sm">/{{ billingFreq === 'monthly' ? 'mo' : 'yr' }}</span>
            </div>
            <NuxtLink to="/contact" class="btn btn-secondary btn-block mb-6">Contact Sales</NuxtLink>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.75rem; flex: 1; margin-bottom: 1.5rem; font-size: 0.9rem;">
              <li style="display: flex; gap: 0.5rem; font-weight: bold;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> 120 Active Tours</li>
              <li style="display: flex; gap: 0.5rem; font-weight: bold; color: var(--primary);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Includes {{ billingFreq === 'monthly' ? '3 photo shoots / mo' : '36 photo shoots / yr' }}</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Custom domain option</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> White-label viewer</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Team accounts & Analytics suite</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Nearby amenities map</li>
              <li style="display: flex; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Featured property badges</li>
              <li style="display: flex; gap: 0.5rem; color: var(--text-muted);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Priority support & 50 GB storage</li>
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