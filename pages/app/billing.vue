<template>
  <div class="h-full">

    <!-- Header -->
    <header class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-main">Billing & Plans</h1>
      <p class="text-sm text-dim mt-1">Manage your subscription and upgrade your agency's capabilities.</p>
    </header>

    <!-- Loading skeleton -->
    <div v-if="pending" class="space-y-6 animate-pulse">
      <div class="h-44 bg-surface-alt rounded-2xl"></div>
      <div class="h-32 bg-surface-alt rounded-2xl"></div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="h-56 bg-surface-alt rounded-2xl"></div>
      </div>
    </div>

    <div v-else class="space-y-6">

      <!-- ① CURRENT PLAN ──────────────────────────────────────────────────── -->
      <section class="card-glass p-6 md:p-8">
        <div class="flex flex-col md:flex-row md:items-start justify-between gap-6 overflow-hidden">

          <!-- Plan identity -->
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-[10px] font-bold uppercase tracking-widest text-dim">Current Plan</span>
              <span class="px-2 py-0.5 rounded-full border border-border text-[10px] font-bold uppercase tracking-wider" :class="statusBadgeClass">{{ statusLabel }}</span>
            </div>
            <h2 class="text-3xl font-bold tracking-tight text-main tracking-tight">{{ plan?.name || 'Free' }}</h2>
            <p class="text-sm text-dim mt-1">{{ planSubtitles[plan?.name] || 'Basic access' }}</p>
            <p v-if="subscription?.current_period_end" class="text-xs text-dim mt-2 font-medium">
              Renews {{ formatDate(subscription.current_period_end) }}
            </p>
          </div>

          <!-- Usage stats -->
          <div class="flex items-start gap-8 md:gap-10 flex-shrink-0">
            <div class="text-center">
              <div class="text-2xl font-bold tabular-nums text-main leading-none">{{ usage?.active_spaces_count || 0 }}</div>
              <div class="text-[10px] font-bold uppercase tracking-wider text-dim mt-2">Tours</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold tabular-nums text-main leading-none">{{ formatBytes(usage?.storage_used_bytes || 0) }}</div>
              <div class="text-[10px] font-bold uppercase tracking-wider text-dim mt-2">Storage</div>
            </div>
          </div>
        </div>

        <!-- Usage progress bars -->
        <div class="mt-8 grid grid-cols-2 gap-4">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[10px] font-bold uppercase tracking-tight text-dim">Active Tours Capacity</span>
              <span class="text-xs font-bold tabular-nums" :class="spaceUsagePct >= 80 ? 'text-amber-500' : 'text-main'">{{ spaceUsagePct }}%</span>
            </div>
            <div class="h-1.5 bg-surface-alt rounded-full overflow-hidden border border-border">
              <div class="h-full rounded-full transition-all duration-1000" :class="spaceUsagePct >= 80 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-main'" :style="{ width: spaceUsagePct + '%' }"></div>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[10px] font-bold uppercase tracking-tight text-dim">Cloud Storage</span>
              <span class="text-xs font-bold tabular-nums" :class="storageUsagePct >= 80 ? 'text-amber-500' : 'text-main'">{{ storageUsagePct }}%</span>
            </div>
            <div class="h-1.5 bg-surface-alt rounded-full overflow-hidden border border-border">
              <div class="h-full rounded-full transition-all duration-1000" :class="storageUsagePct >= 80 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-main'" :style="{ width: storageUsagePct + '%' }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- ② UPGRADE TRIGGER ──────────────────────────────────────────────── -->
      <div v-if="isNearLimit && recommendedPlan" class="flex items-start gap-4 p-6 card-glass border-amber-500/20 bg-amber-500/5 shadow-xl animate-in fade-in slide-in-from-bottom-5">
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 border border-amber-500/20 text-amber-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="flex-1">
          <p class="text-sm font-black text-amber-500 uppercase tracking-widest">Quota Threshold Notice</p>
          <p class="text-xs text-amber-200/60 mt-1 font-bold leading-relaxed">{{ limitMessage }}</p>
        </div>
        <button @click="scrollToPlans" class="btn btn-secondary !px-5 !py-2.5 !rounded-xl !text-amber-500 !border-amber-500/20 hover:!bg-amber-500 hover:!text-bg text-xs">Upgrade Fleet</button>
      </div>

      <!-- ③ RECOMMENDED UPGRADE ──────────────────────────────────────────── -->
      <section v-if="recommendedPlan" class="relative card-glass p-8 md:p-12 overflow-hidden shadow-2xl group border-main/20">
        <div class="absolute top-0 right-0 w-96 h-96 bg-main/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none transition-transform group-hover:scale-110 duration-1000"></div>
        <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-main/10 via-main to-main/10"></div>

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-10 relative z-10">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-6">
              <span class="px-4 py-1.5 bg-main text-bg text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl">Exclusive Accelerator</span>
            </div>
            <h3 class="text-4xl font-black mb-2 tracking-tighter text-main">Scale to {{ recommendedPlan.name }}</h3>
            <p class="text-sm text-dim font-bold max-w-lg leading-relaxed">{{ planSubtitles[recommendedPlan.name] || 'Professional agency tools and increased quotas.' }}</p>

            <!-- Value diff chips -->
                Lead capture
              </span>
              <span v-if="recommendedPlan.branding_customization_enabled && !plan?.branding_customization_enabled" class="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-full">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Agency branding
              </span>
              <span v-if="shootsDiff > 0" class="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-full">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                +{{ shootsDiff }} photo shoot{{ shootsDiff > 1 ? 's' : '' }} / mo
              </span>
            </div>
          </div>

          <!-- Price + CTA -->
          <div class="flex flex-col items-start md:items-end gap-4 flex-shrink-0">
            <div>
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-bold tabular-nums">
                  KES {{ billingCycle === 'yearly'
                    ? formatPricePM(recommendedPlan.price_yearly_kes)
                    : recommendedPlan.price_monthly_kes.toLocaleString() }}
                </span>
                <span class="text-sm text-zinc-400">/mo</span>
              </div>
              <div v-if="billingCycle === 'yearly' && yearlySavingsPct > 0" class="text-xs text-emerald-400 mt-0.5 text-right">Saving {{ yearlySavingsPct }}% vs monthly</div>
            </div>
            <button
              @click="subscribeTo(recommendedPlan.id)"
              :disabled="subscribing === recommendedPlan.id"
              class="btn bg-bg text-main border border-border shadow-sm"
            >
              <div v-if="subscribing === recommendedPlan.id" class="w-4 h-4 border-2 border-muted border-t-main rounded-full animate-spin"></div>
              Upgrade to {{ recommendedPlan.name }} →
            </button>
          </div>
        </div>
      </section>

      <!-- ④ MONTHLY / YEARLY TOGGLE + ALL PLANS ───────────────────────────── -->
      <section ref="plansSection">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-base font-semibold text-main">All plans</h3>
          <!-- Toggle -->
          <div class="flex items-center gap-3 p-1 bg-surface-alt rounded-xl border border-border">
            <button
              @click="billingCycle = 'monthly'"
              class="px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200"
              :class="billingCycle === 'monthly' ? 'bg-main text-bg shadow-sm' : 'text-dim hover:text-main'"
            >Monthly</button>
            <button
              @click="billingCycle = 'yearly'"
              class="px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 flex items-center gap-2"
              :class="billingCycle === 'yearly' ? 'bg-main text-bg shadow-sm' : 'text-dim hover:text-main'"
            >
              Yearly
              <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold rounded-md border border-emerald-500/30">Save 20%</span>
            </button>
          </div>
        </div>

        <!-- Plans grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="p in availablePlans"
            :key="p.id"
            class="relative p-6 flex flex-col transition-all duration-300 card-glass"
            :class="[
              p.id === plan?.id
                ? 'border-main ring-1 ring-main shadow-xl'
                : 'border-border'
            ]"
          >
            <!-- Badges -->
            <div class="absolute -top-3 left-4 flex gap-1.5">
              <span v-if="p.id === plan?.id" class="px-2.5 py-1 bg-main text-bg text-[10px] font-bold rounded-lg shadow-lg border border-border">Current Plan</span>
              <span v-if="p.id === recommendedPlan?.id && p.id !== plan?.id" class="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg shadow-lg border border-emerald-500">Recommended</span>
              <span v-if="planHighlight[p.name]" class="px-2.5 py-1 bg-surface-alt text-main text-[10px] font-bold rounded-lg shadow-lg border border-border">{{ planHighlight[p.name] }}</span>
            </div>

            <div class="mb-4 mt-2">
              <span class="text-[10px] font-bold text-dim uppercase tracking-wider block mb-0.5">{{ planSubtitles[p.name] || '' }}</span>
              <h4 class="text-base font-bold text-main">{{ p.name }}</h4>
              <div class="mt-2 flex items-baseline gap-1">
                <template v-if="p.price_monthly_kes === 0">
                  <span class="text-xl font-bold text-main">Free</span>
                </template>
                <template v-else-if="billingCycle === 'yearly'">
                  <span class="text-xl font-bold text-main">KES {{ formatPricePM(p.price_yearly_kes) }}</span>
                  <span class="text-xs text-dim">/mo</span>
                </template>
                <template v-else>
                  <span class="text-xl font-bold text-main">KES {{ p.price_monthly_kes.toLocaleString() }}</span>
                  <span class="text-xs text-dim">/mo</span>
                </template>
              </div>
              <div v-if="billingCycle === 'yearly' && p.price_monthly_kes > 0" class="text-[11px] text-dim mt-0.5">
                KES {{ p.price_yearly_kes.toLocaleString() }} billed annually
              </div>
            </div>

            <ul class="space-y-3 mb-8 flex-1 text-[13px]">
              <li class="flex items-center gap-2.5 text-dim">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                <span class="font-bold text-main">{{ p.max_active_spaces }}</span> active tours
              </li>
              <li class="flex items-center gap-2.5 text-dim">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                <span class="font-bold text-main">{{ formatBytes(p.max_storage_bytes) }}</span> storage
              </li>
              <li v-if="p.lead_capture_enabled" class="flex items-center gap-2.5 text-dim">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                Lead capture
              </li>
              <li v-else class="flex items-center gap-2.5 text-dim/30">
                <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Lead capture
              </li>
              <li v-if="p.branding_customization_enabled" class="flex items-center gap-2.5 text-dim">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                Agency branding
              </li>
              <li v-if="SHOOT_ALLOWANCES[p.name] > 0" class="flex items-center gap-2.5 text-dim">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                <span class="font-bold text-main">{{ SHOOT_ALLOWANCES[p.name] }}</span> photo shoots/mo
              </li>
            </ul>

            <!-- CTA -->
            <button
              v-if="p.price_monthly_kes > 0 && p.id !== plan?.id"
              @click="subscribeTo(p.id)"
              :disabled="subscribing === p.id"
              class="btn w-full !rounded-xl"
              <div v-if="subscribing === p.id" class="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
              {{ subscribing === p.id ? 'Redirecting...' : 'Get ' + p.name }}
            </button>
            <div v-else-if="p.id === plan?.id" class="w-full py-2 text-center text-xs font-semibold text-dim border border-border rounded-lg">
              Your current plan
            </div>
          </div>
        </div>
      </section>

      <!-- ⑤ BILLING CLARITY ───────────────────────────────────────────────── -->
      <section class="p-5 bg-surface-alt rounded-2xl border border-border">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div>
            <p class="font-semibold text-muted mb-1">Prorated billing</p>
            <p class="text-dim leading-relaxed">When you upgrade mid-cycle, you're only charged for the remaining days in your current period.</p>
          </div>
          <div>
            <p class="font-semibold text-muted mb-1">Cancel anytime</p>
            <p class="text-dim leading-relaxed">Your plan stays active until the end of the billing period. No surprise charges or hidden fees.</p>
          </div>
          <div>
            <p class="font-semibold text-muted mb-1">Downgrade rules</p>
            <p class="text-dim leading-relaxed">Downgrades take effect at renewal. All existing spaces remain accessible until you exceed plan limits.</p>
          </div>
        </div>
      </section>

    </div>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast" :class="['fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold whitespace-nowrap', toast.type === 'success' ? 'bg-zinc-950 text-white' : 'bg-red-600 text-white']">
          <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :class="toast.type === 'success' ? 'bg-zinc-700/20 text-emerald-400' : 'bg-white  text-white'">
            <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { definePageMeta, useSeoMeta } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Billing | Viewora' })

const { apiFetch } = useApiFetch()

// ── State ──────────────────────────────────────────────────────────────────
const pending = ref(true)
const subscribing = ref<string | null>(null)
const billingCycle = ref<'monthly' | 'yearly'>('monthly')
const plan = ref<any>(null)
const subscription = ref<any>(null)
const usage = ref<any>(null)
const availablePlans = ref<any[]>([])
const plansSection = ref<HTMLElement | null>(null)

function unwrapApiData<T = any>(value: any): T {
  if (value && typeof value === 'object' && 'data' in value && value.data !== undefined) {
    return value.data as T
  }
  if (value && typeof value === 'object' && 'result' in value && value.result !== undefined) {
    return value.result as T
  }
  return value as T
}

function toArray<T = any>(value: any): T[] {
  const unwrapped = unwrapApiData<any>(value)
  if (Array.isArray(unwrapped)) return unwrapped
  if (unwrapped && typeof unwrapped === 'object') {
    if (Array.isArray(unwrapped.items)) return unwrapped.items
    if (Array.isArray(unwrapped.rows)) return unwrapped.rows
  }
  return []
}

// ── Toast ──────────────────────────────────────────────────────────────────
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}

// ── Plan metadata ──────────────────────────────────────────────────────────
const planSubtitles: Record<string, string> = {
  Free:    'Getting started',
  Starter: 'For solo agents',
  Plus:    'Most popular',
  Pro:     'For growing agencies',
  Elite:   'Enterprise',
}
const planHighlight: Record<string, string> = {
  Plus:  'Popular',
  Elite: 'Best value',
}
const SHOOT_ALLOWANCES: Record<string, number> = {
  Free: 0, Starter: 0, Plus: 1, Pro: 2, Elite: 4,
}

// ── Computed ───────────────────────────────────────────────────────────────
const currentPlanIndex = computed(() =>
  availablePlans.value.findIndex(p => p.id === plan.value?.id)
)
const recommendedPlan = computed(() => {
  const idx = currentPlanIndex.value
  if (idx === -1 || idx >= availablePlans.value.length - 1) return null
  return availablePlans.value[idx + 1]
})

const spaceUsagePct = computed(() =>
  Math.min(Math.round(((usage.value?.active_spaces_count || 0) / (plan.value?.max_active_spaces || 1)) * 100), 100)
)
const storageUsagePct = computed(() =>
  Math.min(Math.round(((usage.value?.storage_used_bytes || 0) / (plan.value?.max_storage_bytes || 1)) * 100), 100)
)
const isNearLimit = computed(() => spaceUsagePct.value >= 70 || storageUsagePct.value >= 70)
const limitMessage = computed(() =>
  spaceUsagePct.value >= storageUsagePct.value
    ? `You've used ${spaceUsagePct.value}% of your spaces allocation. Upgrade to add more tours.`
    : `You've used ${storageUsagePct.value}% of your storage. Upgrade for more capacity.`
)

const statusBadgeClass = computed(() => {
  const s = subscription.value?.status
  if (s === 'active' || s === 'trialing') return 'bg-zinc-700/15 text-emerald-400 border-emerald-500/20'
  if (s === 'past_due') return 'bg-amber-500/15 text-amber-400 border-amber-500/20'
  return 'bg-zinc-700/50 text-zinc-400 border-zinc-600'
})
const statusLabel = computed(() => {
  const s = subscription.value?.status
  if (!s) return 'Free'
  const labels: Record<string, string> = { active: 'Active', trialing: 'Trial', past_due: 'Past Due', canceled: 'Canceled', unpaid: 'Unpaid' }
  return labels[s] ?? s.charAt(0).toUpperCase() + s.slice(1)
})

const spaceDiff = computed(() =>
  (recommendedPlan.value?.max_active_spaces || 0) - (plan.value?.max_active_spaces || 0)
)
const storageDiffGB = computed(() =>
  Math.round(((recommendedPlan.value?.max_storage_bytes || 0) - (plan.value?.max_storage_bytes || 0)) / (1024 ** 3))
)
const shootsDiff = computed(() =>
  (SHOOT_ALLOWANCES[recommendedPlan.value?.name] || 0) - (SHOOT_ALLOWANCES[plan.value?.name] || 0)
)
const yearlySavingsPct = computed(() => {
  const p = recommendedPlan.value
  if (!p?.price_monthly_kes || !p?.price_yearly_kes) return 0
  return Math.round((1 - p.price_yearly_kes / (p.price_monthly_kes * 12)) * 100)
})

function formatPricePM(yearlyTotal: number) {
  return Math.round(yearlyTotal / 12).toLocaleString()
}

// ── Data ───────────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchBillingData()
})

async function fetchBillingData() {
  pending.value = true
  try {
    const [statusRaw, plansRaw] = await Promise.all([
      apiFetch<any>('/billing/status'),
      apiFetch<any[]>('/billing/plans'),
    ])
    const statusData = unwrapApiData<any>(statusRaw)
    const plansData = toArray<any>(plansRaw)
    plan.value = statusData.plan
    subscription.value = statusData.subscription
    usage.value = statusData.usage
    availablePlans.value = plansData.sort((a, b) => a.price_monthly_kes - b.price_monthly_kes)
  } catch {
    // pending handles UI
  } finally {
    pending.value = false
  }
}

async function subscribeTo(planId: string) {
  subscribing.value = planId
  try {
    const raw = await apiFetch<any>('/billing/initialize-paystack', {
      method: 'POST',
      body: { planId, billingCycle: billingCycle.value },
    })
    const data = unwrapApiData<any>(raw)
    if (data.authorization_url) {
      window.location.href = data.authorization_url
      return
    }
    showToast('Missing payment authorization URL from billing service.', 'error')
  } catch (e: any) {
    showToast(e.data?.statusMessage || 'Failed to initialize payment', 'error')
  } finally {
    subscribing.value = null
  }
}

function scrollToPlans() {
  plansSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }
</style>
