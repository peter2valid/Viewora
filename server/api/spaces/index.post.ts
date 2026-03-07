/**
 * POST /api/spaces
 * Body: { title: string, description?: string }
 * Creates a new space for the authenticated user.
 */
import { requireUser } from '~/server/utils/auth'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  if (!body?.title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'title is required' })
  }

  const db = await serverSupabaseClient(event)

  const { data, error } = await db
    .from('spaces')
    .insert({
      owner_id: user.id,
      title: body.title.trim(),
      description: body.description ?? null,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
