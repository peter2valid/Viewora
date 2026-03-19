/**
 * server/utils/db.ts
 *
 * Server-side Supabase client for use in all API route handlers.
 * Uses the service role key (bypasses RLS) because the server routes
 * implement their own ownership checks via requireUser() before any DB call.
 *
 * Usage:
 *   import { serverDb } from '~/server/utils/db'
 *   const { data, error } = await serverDb().from('spaces').select('*')
 */

import { createClient } from '@supabase/supabase-js'

export function serverDb() {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY

    if (!url || !key) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Supabase environment variables are not configured',
        })
    }

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    })
}
