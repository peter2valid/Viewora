/**
 * DELETE /api/leads/:id
 * Hard-deletes a lead. Only the property owner may delete.
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { id: userId } = await requireUser(event)
  const leadId = getRouterParam(event, 'id')!

  const db = serverDb()

  // Verify ownership via joined property
  const { data: lead } = await db
    .from('leads')
    .select('id, properties(user_id)')
    .eq('id', leadId)
    .single()

  if (!lead) throw createError({ statusCode: 404, statusMessage: 'Lead not found' })
  if ((lead.properties as any)?.user_id !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const { error } = await db.from('leads').delete().eq('id', leadId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { deleted: true }
})
