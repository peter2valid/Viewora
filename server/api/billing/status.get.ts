/**
 * GET /api/billing/status
 *
 * Returns the authenticated user's current subscription, plan details, and
 * usage counters. This is the single source of truth for billing state.
 *
 * When no subscription exists, returns free-tier plan defaults so the UI
 * always has a valid plan object to render.
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'
import type { Plan, Subscription, UsageCounters } from '~/stores/plan'

const FREE_PLAN: Plan = {
  id: 'free',
  name: 'Free',
  price_monthly_kes: 0,
  price_yearly_kes: 0,
  max_active_properties: 2,
  max_storage_bytes: 536870912, // 512 MB
  qr_download_enabled: false,
  qr_svg_enabled: false,
  embeds_enabled: false,
  advanced_embeds_enabled: false,
  lead_capture_enabled: false,
  advanced_analytics_enabled: false,
  branding_customization_enabled: false,
  max_team_members: 1,
}

export default defineEventHandler(async (event) => {
  const { id: userId } = await requireUser(event)
  const db = serverDb()

  const [subResult, usageResult] = await Promise.all([
    db
      .from('subscriptions')
      .select(`
        id, status, billing_cycle,
        current_period_start, current_period_end, grace_period_ends_at,
        user_id, plan_id,
        plans (
          id, name, price_monthly_kes, price_yearly_kes,
          max_active_properties, max_storage_bytes,
          qr_download_enabled, qr_svg_enabled,
          embeds_enabled, advanced_embeds_enabled,
          lead_capture_enabled, advanced_analytics_enabled,
          branding_customization_enabled, max_team_members
        )
      `)
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('usage_counters')
      .select('active_properties_count, storage_used_bytes')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const usage: UsageCounters = usageResult.data ?? {
    active_properties_count: 0,
    storage_used_bytes: 0,
  }

  if (!subResult.data) {
    return { plan: FREE_PLAN, subscription: null, usage }
  }

  const sub = subResult.data as any
  const plan: Plan = sub.plans ?? FREE_PLAN

  const subscription: Subscription = {
    id: sub.id,
    user_id: sub.user_id,
    plan_id: sub.plan_id,
    status: sub.status,
    billing_cycle: sub.billing_cycle,
    current_period_start: sub.current_period_start,
    current_period_end: sub.current_period_end,
    grace_period_ends_at: sub.grace_period_ends_at,
  }

  return { plan, subscription, usage }
})
