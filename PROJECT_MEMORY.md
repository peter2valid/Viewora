# Viewora Project Memory

## Project Status
- **Current Phase:** Phase 11 — Polish and Premium Feel (Frontend UI ahead of backend)
- **Last Updated:** Wednesday, March 18, 2026

## Architecture Lock (Final)
- **Frontend:** Nuxt 3 (Vercel) — this repo
- **Backend:** Fastify on Railway — separate repo (trusted rules engine)
- **Database:** Supabase PostgreSQL — migration 012 is the canonical schema
- **Storage:** Cloudflare R2 — direct browser upload via backend-signed URLs
- **Viewer:** Pannellum 2.5.6 (CDN)
- **Payments:** Paystack (not yet wired)

## Key Architecture Decisions (Locked)
1. **Unified Property Model** — CloudPano, spaces, scenes, hotspots, and the org/multi-tenant model are all removed. The single entity is `properties` (owned by a user). Migration 012 is the source of truth.
2. **No Organizations** — Subscriptions are per-user, not per-org. No memberships, no teams (yet).
3. **Backend-First Rules** — Quota checks, plan enforcement, and publish validation run on the Fastify backend (Railway), not in Nitro server routes.
4. **Public URLs:** `/p/[slug]` for property page, `/embed/[slug]` for lightweight iframe embed.

## Completed ✅
- [x] Phase 0–4: Audit, cleanup, database foundation, backend planning
- [x] Phase 5: Storage — R2 bucket, signed upload flow, MIME validation, quota enforcement
- [x] Phase 6: Frontend shell — auth, layout, sidebar, all dashboard page skeletons
- [x] Phase 7: Media and publishing — 360 upload, 2D gallery upload, publish flow with checks
- [x] Phase 8: Public experience — `/p/[slug]` with Pannellum viewer, lead form, analytics event
- [x] Phase 9: Sharing, QR, embeds — `?src=qr|whatsapp|embed` tracking, on-demand QR, `/embed/[slug]`
- [x] Phase 10: Analytics + leads — `/app/analytics` with daily chart, `/app/leads` list

## Active (Phase 11 Polish) ⏳
- [ ] Rewrite stale Nitro server routes against migration 012 schema (properties, leads, analytics_daily)
- [ ] Replace `stores/organization.ts` with user-level subscription store
- [ ] Regenerate `types/database.types.ts` from migration 012
- [ ] Wire `/api/properties/*` CRUD routes
- [ ] Wire `/api/uploads/signed-url` for R2
- [ ] Implement plan-gated UI (hide embed/lead options on free plan)
- [ ] Paystack billing integration
- [ ] Loading states and smooth transitions
- [ ] Mobile responsiveness final audit
- [ ] Empty state designs

## What Is Stale (Needs Rewrite)
| File | Problem |
|------|---------|
| `stores/organization.ts` | Queries old org/membership model |
| `server/api/org/current.get.ts` | Queries `memberships` + `organizations` (dropped in 012) |
| `server/api/org/bootstrap.post.ts` | Creates orgs (dropped in 012) |
| `server/api/dashboard/summary.get.ts` | Queries `projects` + `project_analytics_daily` (dropped in 012) |
| `server/api/leads/*.ts` | Queries `project_leads` (dropped in 012; new table is `leads`) |
| `server/services/permissions.ts` | Org-based permission logic |
| `types/database.types.ts` | Reflects old schema; needs regeneration |

---
*See `memory/MEMORY.md` for full technical reference.*
