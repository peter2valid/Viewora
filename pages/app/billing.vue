<template>
  <div class="h-full flex flex-col bg-zinc-50/50">
    <!-- Page Header -->
    <header class="p-8 pb-0">
      <div class="space-y-1">
        <h1 class="text-3xl font-black tracking-tight text-zinc-950">Billing & Plan</h1>
        <p class="text-sm text-slate-500 font-medium">Manage your agency subscription, usage limits, and premium features.</p>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="pending" class="flex-1 flex flex-col items-center justify-center gap-4">
      <div class="w-12 h-12 border-4 border-zinc-100 border-t-zinc-950 rounded-full animate-spin"></div>
      <p class="text-[10px] font-black uppercase tracking-widest text-zinc-400">Loading subscription vault...</p>
    </div>

    <!-- ── Billing Dashboard ────────────────────────────────────────────── -->
    <section v-else class="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start overflow-y-auto flex-1">
      
      <!-- Current Status & Usage (Left Col) -->
      <div class="lg:col-span-4 space-y-8 h-full">
        <!-- Status Card -->
        <div class="bg-zinc-950 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-zinc-950/20 relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          
          <div class="flex items-center justify-between mb-8">
            <span class="text-[10px] font-black uppercase tracking-widest text-zinc-500">Active Membership</span>
            <div class="px-3 py-1 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider rounded-full">
               {{ subscription ? subscription.status : 'FREE' }}
            </div>
          </div>

          <div class="space-y-1 mb-8">
            <h2 class="text-4xl font-black tracking-tighter">{{ plan?.name || 'Free Tier' }}</h2>
            <p v-if="subscription" class="text-xs font-medium text-zinc-500">
               Renews on {{ formatDate(subscription.current_period_end) }}
            </p>
            <p v-else class="text-xs font-medium text-zinc-500 italic">No active billing cycle</p>
          </div>

          <button v-if="subscription" class="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors">
            Manage via Paystack →
          </button>
        </div>

        <!-- Usage Card -->
        <div class="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10">
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase tracking-widest text-zinc-400">Space Allocation</span>
              <span class="text-sm font-black text-zinc-950 italic">{{ usage?.active_spaces_count || 0 }} / {{ plan?.max_active_spaces || 0 }}</span>
            </div>
            <div class="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-[1px]">
               <div 
                 class="h-full bg-zinc-950 rounded-full transition-all duration-1000 ease-out"
                 :style="{ width: ((usage?.active_spaces_count || 0) / (plan?.max_active_spaces || 1) * 100) + '%' }"
               ></div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase tracking-widest text-zinc-400">Cloud Storage</span>
              <span class="text-sm font-black text-zinc-950 italic">{{ formatBytes(usage?.storage_used_bytes || 0) }} / {{ formatBytes(plan?.max_storage_bytes || 0) }}</span>
            </div>
            <div class="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-[1px]">
               <div 
                 class="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                 :style="{ width: ((usage?.storage_used_bytes || 0) / (plan?.max_storage_bytes || 1) * 100) + '%' }"
               ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Plan Selection (Right Col) -->
      <div class="lg:col-span-8 space-y-8">
        <div class="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
           <header class="p-10 border-b border-slate-100">
              <h3 class="text-xl font-black text-zinc-950 tracking-tight">Expand Your Agency</h3>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Select a plan that fits your growth</p>
           </header>

           <div class="p-4 md:p-10">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  v-for="p in availablePlans" 
                  :key="p.id" 
                  @click="selectedPlanId = p.id"
                  class="relative p-8 text-left rounded-[2rem] border-2 transition-all group active:scale-[0.98]"
                  :class="selectedPlanId === p.id ? 'border-zinc-950 bg-zinc-50' : 'border-slate-100 hover:border-slate-200 bg-white'"
                >
                  <div v-if="selectedPlanId === p.id" class="absolute top-4 right-4 w-6 h-6 bg-zinc-950 text-white rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  
                  <div class="space-y-1 mb-6">
                    <h4 class="text-lg font-black text-zinc-950 uppercase tracking-tight">{{ p.name }}</h4>
                    <div class="flex items-baseline gap-1">
                      <span class="text-2xl font-black text-zinc-950 italic">KES {{ p.price_monthly_kes }}</span>
                      <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">/mo</span>
                    </div>
                  </div>

                  <ul class="space-y-3 mb-8">
                    <li v-for="feat in [
                      `${p.max_active_spaces} Spaces`,
                      `${formatBytes(p.max_storage_bytes)} Storage`,
                      p.lead_capture_enabled ? 'Lead Hub Enabled' : 'No Lead Capture',
                      p.branding_customization_enabled ? 'Brand Pro Enabled' : 'Standard Branding'
                    ]" :key="feat" class="flex items-center gap-2">
                       <div class="w-4 h-4 rounded-full flex items-center justify-center" :class="feat.includes('No') || feat.includes('Standard') ? 'text-slate-300' : 'text-emerald-500'">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline v-if="!feat.includes('No') && !feat.includes('Standard')" points="20 6 9 17 4 12"/>
                            <line v-else x1="18" y1="6" x2="6" y2="18"/>
                          </svg>
                       </div>
                       <span class="text-xs font-bold" :class="feat.includes('No') || feat.includes('Standard') ? 'text-slate-400 line-through decoration-slate-200' : 'text-zinc-700'">{{ feat }}</span>
                    </li>
                  </ul>
                </button>
              </div>

              <div class="mt-10 p-8 bg-zinc-50 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div class="space-y-1">
                  <p class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Total Commitment</p>
                  <p class="text-xl font-black text-zinc-950 italic">KES {{ selectedPlan?.price_monthly_kes || 0 }} <span class="text-xs font-bold text-slate-400 not-italic">monthly</span></p>
                </div>
                
                <button 
                  v-if="selectedPlan?.price_monthly_kes > 0"
                  class="px-12 py-4 bg-zinc-950 text-white text-sm font-black rounded-2xl shadow-xl shadow-zinc-950/20 hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                  @click="handleSubscribe" 
                  :disabled="subscribing || selectedPlanId === plan?.id"
                >
                  <svg v-if="subscribing" class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {{ selectedPlanId === plan?.id ? 'Active Membership' : 'Upgrade to ' + selectedPlan?.name }}
                </button>
                <div v-else class="text-xs font-black uppercase tracking-widest text-zinc-400 italic">
                  Free Starter Plan
                </div>
              </div>
           </div>
        </div>
      </div>
    </section>
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
