/**
 * server/services/permissions.ts
 *
 * Server-side permission and entitlement enforcement.
 * All protected API routes must call these helpers before touching the database.
 *
 * The model is user-owned resources (no org/membership layer):
 *   1. requireUser(event)                    → verify JWT, get userId
 *   2. requirePropertyOwner(event, propId)   → verify property.user_id === userId
 *   3. requirePlan(userId)                   → get plan + subscription + usage
 *   4. requireEntitlement(plan, feature)     → boolean feature gate
 *   5. requireUnderLimit(current, max, name) → quota guard
 */

import type { H3Event } from 'h3'
import { createError } from 'h3'
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'
import type { Plan } from '~/stores/plan'

// ── Types ──────────────────────────────────────────────────────────────────

export interface UserContext {
  userId: string
  email?: string
}

export interface PlanContext {
  userId: string
  plan: Plan
  subscription: {
    id: string
    status: string
    grace_period_ends_at: string | null
  } | null
  usage: {
    active_properties_count: number
    storage_used_bytes: number
  }
}

// ── Core helpers ───────────────────────────────────────────────────────────

/**
 * Verify the caller owns a property. Throws 403/404 if not.
 * Returns the userId for downstream use.
 */
export async function requirePropertyOwner(
  event: H3Event,
  propertyId: string,
): Promise<string> {
  const { id: userId } = await requireUser(event)
  const db = serverDb()

  const { data: property, error } = await db
    .from('properties')
    .select('user_id')
    .eq('id', propertyId)
    .single()

  if (error || !property) {
    throw createError({ statusCode: 404, statusMessage: 'Property not found' })
  }

  if (property.user_id !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  return userId
}

/**
 * Load a user's active subscription, plan, and usage counters.
 * Never throws — returns free-tier defaults when no subscription exists.
 */
export async function requirePlan(userId: string): Promise<PlanContext> {
  const db = serverDb()

  const [subResult, usageResult] = await Promise.all([
    db
      .from('subscriptions')
      .select('id, status, grace_period_ends_at, plan_id, plans(*)')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    db
      .from('usage_counters')
      .select('active_properties_count, storage_used_bytes')
      .eq('user_id', userId)
      .single(),
  ])

  const usage = usageResult.data ?? { active_properties_count: 0, storage_used_bytes: 0 }

  if (!subResult.data) {
    return { userId, plan: _freePlan(), subscription: null, usage }
  }

  const sub = subResult.data as any
  const plan: Plan = sub.plans ?? _freePlan()

  return {
    userId,
    plan,
    subscription: {
      id: sub.id,
      status: sub.status,
      grace_period_ends_at: sub.grace_period_ends_at,
    },
    usage,
  }
}

/**
 * Guard a boolean plan feature. Throws 403 if not entitled.
 */
export function requireEntitlement(plan: Plan, feature: keyof Plan): void {
  if (!plan[feature]) {
    throw createError({
      statusCode: 403,
      statusMessage: `Your plan does not include: ${feature}. Please upgrade.`,
    })
  }
}

/**
 * Guard a numeric usage limit. Throws 403 if at or above the maximum.
 * max <= 0 is treated as unlimited.
 */
export function requireUnderLimit(current: number, max: number, resource: string): void {
  if (max > 0 && current >= max) {
    throw createError({
      statusCode: 403,
      statusMessage: `Plan limit reached: ${resource} (${current}/${max}). Upgrade to continue.`,
    })
  }
}

/**
 * Guard upload/publish actions — blocked during grace period.
 */
export function requireCanUpload(ctx: PlanContext): void {
  const { subscription } = ctx
  if (!subscription) return // free tier — allow (enforced by limits, not status)
  const inGrace =
    subscription.grace_period_ends_at &&
    new Date(subscription.grace_period_ends_at) > new Date()
  if (inGrace) {
    throw createError({
      statusCode: 402,
      statusMessage: 'Your subscription is in a grace period. Renew to upload or publish.',
    })
  }
  if (!['active', 'trialing'].includes(subscription.status)) {
    throw createError({
      statusCode: 402,
      statusMessage: 'An active subscription is required to upload or publish.',
    })
  }
}

// ── Internal ───────────────────────────────────────────────────────────────

function _freePlan(): Plan {
  return {
    id: 'free',
    name: 'Free',
    price_monthly_kes: 0,
    price_yearly_kes: 0,
    max_active_properties: 2,
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
