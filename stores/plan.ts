/**
 * stores/plan.ts
 *
 * Single source of truth for the authenticated user's subscription, plan limits,
 * and feature entitlements. Populated on login via fetchSubscriptionStatus().
 *
 * Usage:
 *   const planStore = usePlanStore()
 *   planStore.plan                         // plan details + limits
 *   planStore.subscription                 // active subscription row
 *   planStore.usage                        // active_properties_count, storage_used_bytes
 *   planStore.isGracePeriod                // true when in 7-day grace window
 *   planStore.can('lead_capture_enabled')  // boolean entitlement check
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Plan {
  id: string
  name: string
  price_monthly_kes: number
  price_yearly_kes: number
  max_active_spaces: number
  max_storage_bytes: number
  qr_download_enabled: boolean
  qr_svg_enabled: boolean
  embeds_enabled: boolean
  advanced_embeds_enabled: boolean
  lead_capture_enabled: boolean
  advanced_analytics_enabled: boolean
  branding_customization_enabled: boolean
  max_team_members: number
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  billing_cycle: string
  current_period_start: string | null
  current_period_end: string | null
  grace_period_ends_at: string | null
}

export interface UsageCounters {
  active_spaces_count: number
  storage_used_bytes: number
}

export const usePlanStore = defineStore('plan', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const plan = ref<Plan | null>(null)
  const subscription = ref<Subscription | null>(null)
  const usage = ref<UsageCounters>({ active_spaces_count: 0, storage_used_bytes: 0 })
  const pending = ref(false)
  const error = ref<string | null>(null)

  // ... (computed and can helper) ...
  const isActive = computed(() => {
    const s = subscription.value?.status
    return s === 'active' || s === 'trialing'
  })

  const isGracePeriod = computed(() => {
    const g = subscription.value?.grace_period_ends_at
    if (!g) return false
    return new Date(g) > new Date()
  })

  const entitlements = computed(() => plan.value)

  function can(feature: keyof Plan): boolean {
    return Boolean(plan.value?.[feature])
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async function fetchSubscriptionStatus() {
    pending.value = true
    error.value = null
    try {
      const { apiFetch } = useApiFetch()
      const data = await apiFetch<{
        plan: Plan
        subscription: Subscription | null
        usage: UsageCounters
      }>('/billing/status')
      plan.value = data.plan
      subscription.value = data.subscription
      usage.value = data.usage ?? { active_spaces_count: 0, storage_used_bytes: 0 }
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      if (!plan.value) plan.value = _freePlan()
    } finally {
      pending.value = false
    }
  }

  function $reset() {
    plan.value = null
    subscription.value = null
    usage.value = { active_spaces_count: 0, storage_used_bytes: 0 }
    pending.value = false
    error.value = null
  }

  return {
    plan,
    subscription,
    usage,
    pending,
    error,
    isActive,
    isGracePeriod,
    entitlements,
    can,
    fetchSubscriptionStatus,
    $reset,
  }
})

function _freePlan(): Plan {
  return {
    id: 'free',
    name: 'Free',
    price_monthly_kes: 0,
    price_yearly_kes: 0,
    max_active_spaces: 2,
    max_storage_bytes: 536870912,
    qr_download_enabled: false,
    qr_svg_enabled: false,
    embeds_enabled: false,
    advanced_embeds_enabled: false,
    lead_capture_enabled: false,
    advanced_analytics_enabled: false,
    branding_customization_enabled: false,
    max_team_members: 1,
  }
}
