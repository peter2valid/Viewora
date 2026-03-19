/**
 * GET /api/profile
 * Returns the authenticated user's profile row.
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { id: userId } = await requireUser(event)
  const db = serverDb()

  const { data, error } = await db
    .from('profiles')
    .select('id, full_name, avatar_url, phone, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })

  return data
})
