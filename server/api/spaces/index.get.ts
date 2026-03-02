/**
 * GET /api/spaces
 * Returns all spaces owned by the authenticated user, newest first.
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = serverDb()

  const { data, error } = await db
    .from('spaces')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
