<template>
  <div class="h-full flex flex-col">
    <!-- Page Header -->
    <header class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-zinc-950">Billing & Plan</h1>
      <p class="text-sm text-zinc-500 mt-1">Manage your agency subscription and usage limits.</p>
    </header>

    <!-- Loading State -->
    <div v-if="pending" class="flex-1 flex flex-col items-center justify-center gap-3">
      <div class="w-8 h-8 border-2 border-zinc-100 border-t-zinc-900 rounded-full animate-spin"></div>
      <p class="text-xs font-medium text-zinc-400">Loading subscription details...</p>
    </div>

    <!-- ── Billing Dashboard ────────────────────────────────────────────── -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- Current Status & Usage (Left Col) -->
      <div class="lg:col-span-4 space-y-6">
        <!-- Status Card -->
        <section class="bg-zinc-900 rounded-xl p-6 text-white shadow-sm border border-zinc-800">
          <div class="flex items-center justify-between mb-6">
            <span class="text-xs font-medium text-zinc-400">Current Plan</span>
            <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-500/20">
               {{ subscription ? subscription.status : 'FREE' }}
            </span>
          </div>

          <div class="mb-6">
            <h2 class="text-2xl font-bold tracking-tight">{{ plan?.name || 'Free Tier' }}</h2>
            <p v-if="subscription" class="text-xs text-zinc-500 mt-1">
               Renews on {{ formatDate(subscription.current_period_end) }}
            </p>
            <p v-else class="text-xs text-zinc-500 mt-1">No active subscription</p>
          </div>

          <button v-if="subscription" class="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1">
            Manage billing <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
        </section>

        <!-- Usage Card -->
        <section class="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-6">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-zinc-500">Space Allocation</span>
              <span class="text-sm font-semibold text-zinc-900">{{ usage?.active_spaces_count || 0 }} / {{ plan?.max_active_spaces || 0 }}</span>
            </div>
            <div class="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
               <div 
                 class="h-full bg-zinc-900 rounded-full transition-all duration-1000"
                 :style="{ width: Math.min(((usage?.active_spaces_count || 0) / (plan?.max_active_spaces || 1) * 100), 100) + '%' }"
               ></div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-zinc-500">Storage Usage</span>
              <span class="text-sm font-semibold text-zinc-900">{{ formatBytes(usage?.storage_used_bytes || 0) }} / {{ formatBytes(plan?.max_storage_bytes || 0) }}</span>
            </div>
            <div class="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
               <div 
                 class="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                 :style="{ width: Math.min(((usage?.storage_used_bytes || 0) / (plan?.max_storage_bytes || 1) * 100), 100) + '%' }"
               ></div>
            </div>
          </div>
        </section>
      </div>

      <!-- Plan Selection (Right Col) -->
      <div class="lg:col-span-8">
        <section class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
           <div class="p-6 border-b border-zinc-100">
              <h3 class="text-base font-semibold text-zinc-900">Select Your Plan</h3>
              <p class="text-sm text-zinc-500 mt-1">Upgrade your agency's capabilities.</p>
           </div>

           <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  v-for="p in availablePlans" 
                  :key="p.id" 
                  @click="selectedPlanId = p.id"
                  class="relative p-6 text-left rounded-lg border transition-all text-sm group"
                  :class="selectedPlanId === p.id ? 'border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 bg-white'"
                >
                  <div v-if="selectedPlanId === p.id" class="absolute top-4 right-4 w-5 h-5 bg-zinc-900 text-white rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  
                  <div class="mb-4">
                    <h4 class="font-semibold text-zinc-900">{{ p.name }}</h4>
                    <div class="flex items-baseline gap-1 mt-1">
                      <span class="text-xl font-bold text-zinc-900">KES {{ p.price_monthly_kes }}</span>
                      <span class="text-xs text-zinc-500">/mo</span>
                    </div>
                  </div>

                  <ul class="space-y-2">
                    <li v-for="feat in [
                      { label: `${p.max_active_spaces} Spaces`, enabled: true },
                      { label: `${formatBytes(p.max_storage_bytes)} Storage`, enabled: true },
                      { label: 'Lead Capture', enabled: p.lead_capture_enabled },
                      { label: 'Custom Branding', enabled: p.branding_customization_enabled }
                    ]" :key="feat.label" class="flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" :class="feat.enabled ? 'text-emerald-500' : 'text-zinc-300'"><polyline points="20 6 9 17 4 12"/></svg>
                       <span :class="feat.enabled ? 'text-zinc-700' : 'text-zinc-400 font-normal'">{{ feat.label }}</span>
                    </li>
                  </ul>
                </button>
              </div>

              <!-- Total Commitment & CTA -->
              <div class="mt-8 p-6 bg-zinc-50 rounded-lg border border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <p class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Due Today</p>
                  <p class="text-xl font-bold text-zinc-900 mt-1">KES {{ selectedPlan?.price_monthly_kes || 0 }} <span class="text-sm font-medium text-zinc-500">monthly</span></p>
                </div>
                
                <button 
                  v-if="selectedPlan?.price_monthly_kes > 0"
                  class="w-full md:w-auto px-8 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  @click="handleSubscribe" 
                  :disabled="subscribing || selectedPlanId === plan?.id"
                >
                  <svg v-if="subscribing" class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {{ selectedPlanId === plan?.id ? 'Active Membership' : 'Upgrade Plan' }}
                </button>
                <div v-else class="text-sm font-medium text-zinc-500 italic">
                  Free Starter Plan
                </div>
              </div>
           </div>
        </section>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="toast" :class="['fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold', toast.type === 'success' ? 'bg-zinc-950 text-white' : 'bg-red-600 text-white']">
        <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :class="toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/20 text-white'">
          <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        {{ toast.message }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { definePageMeta, useSeoMeta, useSupabaseUser, useSupabaseClient, navigateTo } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { usePlanStore } from '~/stores/plan'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Billing | Viewora' })

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
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}

const selectedPlan = computed(() => availablePlans.value.find(p => p.id === selectedPlanId.value))

onMounted(async () => {
  await fetchBillingData()
})

async function fetchBillingData() {
  pending.value = true
  try {
    const [statusData, plansData] = await Promise.all([
      apiFetch<any>('/billing/status'),
      apiFetch<any[]>('/billing/plans')
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
    showToast(e.data?.statusMessage || 'Failed to initialize payment', 'error')
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
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }
</style>
