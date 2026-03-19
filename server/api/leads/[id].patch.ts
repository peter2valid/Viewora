/**
 * PATCH /api/leads/:id
 * Updates the status of a lead. Only the property owner may update.
 * Body: { status: 'new' | 'contacted' | 'qualified' | 'closed' }
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'closed'] as const

export default defineEventHandler(async (event) => {
  const { id: userId } = await requireUser(event)
  const leadId = getRouterParam(event, 'id')!
  const body = await readBody(event)

  if (!body?.status || !VALID_STATUSES.includes(body.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: `status must be one of: ${VALID_STATUSES.join(', ')}`,
    })
  }

  const db = serverDb()

  // Verify the lead belongs to one of this user's properties
  const { data: lead } = await db
    .from('leads')
    .select('id, properties(user_id)')
    .eq('id', leadId)
    .single()

  if (!lead) throw createError({ statusCode: 404, statusMessage: 'Lead not found' })
  if ((lead.properties as any)?.user_id !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const { data, error } = await db
    .from('leads')
    .update({ status: body.status })
    .eq('id', leadId)
    .select('id, status, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
