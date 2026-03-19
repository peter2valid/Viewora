/**
 * GET /api/health
 * Verifies D1 and R2 bindings are reachable.
 * Use after deployment to confirm the wrangler.toml bindings are wired correctly.
 */
export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare?.env

  // ── D1 ────────────────────────────────────────────────────────────────────
  let d1: { ok: boolean; result?: unknown; error?: string }
  try {
    const row = await cf?.DB?.prepare('SELECT 1 AS ok').first()
    d1 = { ok: true, result: row }
  } catch (e: any) {
    d1 = { ok: false, error: e?.message ?? 'D1 binding not available' }
  }

  // ── R2 ────────────────────────────────────────────────────────────────────
  const r2 = {
    ok: typeof cf?.R2?.put === 'function',
    binding: cf?.R2 ? 'present' : 'missing',
  }

  return {
    status: d1.ok && r2.ok ? 'ok' : 'degraded',
    d1,
    r2,
  }
})
