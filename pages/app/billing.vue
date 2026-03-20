<template>
  <div class="app-page">
    <div class="app-page-header">
      <div>
        <h1 class="app-page-title">Billing & Plan</h1>
        <p class="app-page-subtitle">Manage your subscription and premium features.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="app-state-box">
      <div class="btn-spinner-sm" style="margin-bottom:1rem"></div>
      <p>Loading billing details…</p>
    </div>

    <template v-else>
      <!-- Current Status Card -->
      <div class="billing-grid">
        <div class="billing-card card">
          <div class="billing-card-header">
            <h3 class="billing-card-title">Current Plan</h3>
            <span :class="['status-badge', subscription ? 'status-badge--active' : 'status-badge--free']">
              {{ subscription ? subscription.status.toUpperCase() : 'FREE' }}
            </span>
          </div>
          
          <div class="plan-details">
            <h2 class="plan-name">{{ plan?.name || 'Free' }}</h2>
            <p v-if="subscription" class="plan-renews">
              Renews on {{ formatDate(subscription.current_period_end) }}
            </p>
            <p v-else class="plan-renews">No active paid subscription</p>
          </div>

          <div class="usage-summary">
            <div class="usage-item">
              <span class="usage-label">Active Spaces</span>
              <span class="usage-value">{{ usage?.active_spaces_count || 0 }} / {{ plan?.max_active_spaces || 0 }}</span>
            </div>
            <div class="usage-item">
              <span class="usage-label">Storage</span>
              <span class="usage-value">{{ formatBytes(usage?.storage_used_bytes || 0) }} / {{ formatBytes(plan?.max_storage_bytes || 0) }}</span>
            </div>
          </div>
        </div>

        <!-- Upgrade / Change Plan -->
        <div class="billing-card card">
          <h3 class="billing-card-title">Upgrade or Change Plan</h3>
          <p class="billing-text text-sm mb-4">Select a plan to unlock more spaces and premium features.</p>
          
          <div class="plan-toggle">
            <button 
              v-for="p in availablePlans" 
              :key="p.id" 
              :class="['plan-btn', p.id === selectedPlanId ? 'plan-btn--active' : '']"
              @click="selectedPlanId = p.id"
            >
              {{ p.name }}
            </button>
          </div>

          <div v-if="selectedPlan" class="selected-plan-info">
            <div class="plan-price">
              <span class="price-val">KES {{ selectedPlan.price_monthly_kes }}</span>
              <span class="price-unit">/ month</span>
            </div>
            
            <ul class="plan-features">
              <li><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> {{ selectedPlan.max_active_spaces }} Active Spaces</li>
              <li><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> {{ formatBytes(selectedPlan.max_storage_bytes) }} Storage</li>
              <li v-if="selectedPlan.lead_capture_enabled"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Lead Capture</li>
              <li v-if="selectedPlan.branding_customization_enabled"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Custom Branding</li>
            </ul>

            <button 
              v-if="selectedPlan.price_monthly_kes > 0"
              class="btn btn-dark w-full mt-4" 
              @click="handleSubscribe" 
              :disabled="subscribing || selectedPlanId === plan?.id"
            >
              <span v-if="subscribing" class="btn-spinner-xs mr-2"></span>
              {{ selectedPlanId === plan?.id ? 'Current Plan' : 'Subscribe with Paystack' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
import { ref, onMounted, computed } from 'vue'
import { definePageMeta as _, useSeoMeta, useSupabaseUser, useSupabaseClient, navigateTo } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { usePlanStore } from '~/stores/plan'

const { apiFetch } = useApiFetch()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const planStore = usePlanStore()

const pending = ref(true)
const subscribing = ref(false)
const plan = ref<any>(null)
const subscription = ref<any>(null)
const usage = ref<any>(null)
const availablePlans = ref<any[]>([])
const selectedPlanId = ref<string | null>(null)

const selectedPlan = computed(() => availablePlans.value.find(p => p.id === selectedPlanId.value))

onMounted(async () => {
  await fetchBillingData()
})

async function fetchBillingData() {
  pending.value = true
  try {
    const [statusData, plansData] = await Promise.all([
      apiFetch<any>('/billing/status'),
      apiFetch<any[]>('/plans')
    ])

    plan.value = statusData.plan
    subscription.value = statusData.subscription
    usage.value = statusData.usage
    availablePlans.value = plansData.sort((a, b) => a.price_monthly_kes - b.price_monthly_kes)
    
    // Default selected plan to next tier or current
    selectedPlanId.value = plan.value?.id
  } catch {
    // handled by pending state
  } finally {
    pending.value = false
  }
}

async function handleSubscribe() {
  if (!selectedPlanId.value) return
  subscribing.value = true
  
  try {
    const data = await apiFetch<any>('/billing/initialize-paystack', {
      method: 'POST',
      body: { planId: selectedPlanId.value, billingCycle: 'monthly' }
    })
    
    if (data.authorization_url) {
      // Redirect to Paystack
      window.location.href = data.authorization_url
    }
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Failed to initialize payment')
  } finally {
    subscribing.value = false
  }
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
/* Any specific billing styles if needed */
</style>
