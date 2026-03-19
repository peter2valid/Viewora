/**
 * server/utils/auth.ts
 *
 * Extracts and verifies the caller's identity from every API request.
 * Every request must carry `Authorization: Bearer <jwt>` where the JWT
 * was issued by Supabase. We verify it by calling supabase.auth.getUser(token).
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY preferentially (if set in Cloudflare env vars)
 * — this is the recommended approach for server-side verification.
 * Falls back to the anon key if service role is not configured.
 */

import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

export interface AuthUser {
  id: string
  email?: string
}

export async function requireUser(event: H3Event): Promise<AuthUser> {
  // ── Extract Bearer token ──────────────────────────────────────────────────
  const authHeader = getHeader(event, 'authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing authorization token' })
  }

  // ── Verify with Supabase ──────────────────────────────────────────────────
  // Prefer service role key for server-side verification (bypasses RLS safely).
  // Falls back to anon key if SUPABASE_SERVICE_ROLE_KEY is not set yet.
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY!,
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  return { id: user.id, email: user.email ?? undefined }
}
