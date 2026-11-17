// Which way to face when walking from one 360 photo to the next.
//
// A 360 camera can be pointing anywhere when the shot is taken, so the centre
// of one photo says nothing about the centre of the next. To arrive "still
// walking the same way", the next room's own frame is worked out from what the
// tour already knows, best source first:
//
//  1. back-link: the next room has an arrow back to this one. Facing directly
//     away from it is facing forward after walking through that doorway.
//  2. compass:   both rooms' orientation on the floor plan is known, so the
//     heading carries straight across.
//  3. plan:      the next room's orientation is known and both are pinned on
//     the same plan: face along the line from this pin to the next.
//  4. start-view: nothing to go on, so the room's chosen start view is used.
//
// A room's orientation on the plan is its hand-set facing direction
// (scenes.north_offset). Rooms without one are measured instead: each arrow
// sits on the real doorway in the photo and points at a pin on the plan, so
// (bearing to that pin) - (arrow yaw) is the way the photo's centre faces,
// however the camera was turned. On a real 55-room mall tour (2026-11-17),
// checked against its two-way arrows with those arrows hidden: this order put
// 14 of 22 arrivals within 30° and 2 of 22 facing backwards, against 12 of 22
// backwards with the start view. Measured-first did worse (6 of 22).
//
// Yaws are PSV radians (0..2π, + = turning right). north_offset is degrees
// clockwise from the top of the plan that the photo's centre faces, so a
// photo yaw y faces plan bearing (deg(y) + north_offset).

const TAU = Math.PI * 2
const rad = (deg: number) => (deg * Math.PI) / 180

export function normYaw(yaw: number): number {
  return ((yaw % TAU) + TAU) % TAU
}

export interface WalkScene {
  id: string
  north_offset?: number | null
  floor_plan_id?: string | null
  plan_x?: number | null
  plan_y?: number | null
}
export interface WalkPlan { id: string; width?: number | null; height?: number | null }
export interface WalkLink { type?: string; yaw: number; targetSceneId?: string | null; linkStyle?: string | null }

export interface WalkContext {
  scenes: WalkScene[]
  plans: WalkPlan[]
  linksByScene: Record<string, WalkLink[]>
}

export type HeadingSource = 'back-link' | 'compass' | 'plan' | 'start-view'

export interface WalkRoute {
  /** Which way to turn in this room before stepping; null = straight ahead. */
  travelYaw: number | null
  /** Yaw in the next room that faces the same way; null = use its start view. */
  arriveYaw: number | null
  source: HeadingSource
  /** Step length relative to a typical step in this tour (1 = typical). */
  stepScale: number
  /** False when stepping back out of a car: face it, with a plain crossfade. */
  step: boolean
}

const placed = (s?: WalkScene): s is WalkScene & { floor_plan_id: string; plan_x: number; plan_y: number } =>
  !!s?.floor_plan_id && typeof s.plan_x === 'number' && typeof s.plan_y === 'number'

function linkTo(ctx: WalkContext, fromId: string, toId: string): WalkLink | undefined {
  return (ctx.linksByScene[fromId] ?? []).find(l => l.type === 'scene_link' && l.targetSceneId === toId && Number.isFinite(l.yaw))
}

/** Pin-to-pin vector in plan pixels, or null when both aren't on the same floor. */
function planVector(ctx: WalkContext, a?: WalkScene, b?: WalkScene): { dx: number; dy: number } | null {
  if (!placed(a) || !placed(b) || a.floor_plan_id !== b.floor_plan_id) return null
  const plan = ctx.plans.find(p => p.id === a.floor_plan_id)
  const w = plan?.width || 1
  const h = plan?.height || 1
  const dx = (b.plan_x - a.plan_x) * w
  const dy = (b.plan_y - a.plan_y) * h
  return Math.hypot(dx, dy) > 1e-6 ? { dx, dy } : null
}

/** Degrees clockwise from the top of the plan (y grows downward on the image). */
const bearingDeg = (v: { dx: number; dy: number }) => (Math.atan2(v.dx, -v.dy) * 180) / Math.PI

const deg = (r: number) => (r * 180) / Math.PI

/**
 * Plan bearing (degrees) that the photo's centre faces: the hand-set
 * north_offset, else the circular mean of what each arrow to a pinned room says.
 */
function facing(ctx: WalkContext, byId: Map<string, WalkScene>, id: string): number | null {
  const s = byId.get(id)
  if (typeof s?.north_offset === 'number' && Number.isFinite(s.north_offset)) return s.north_offset
  let x = 0
  let y = 0
  let n = 0
  for (const l of ctx.linksByScene[id] ?? []) {
    if (l.type !== 'scene_link' || !l.targetSceneId || !Number.isFinite(l.yaw)) continue
    const v = planVector(ctx, s, byId.get(l.targetSceneId))
    if (!v) continue
    const est = rad(bearingDeg(v) - deg(l.yaw))
    x += Math.cos(est); y += Math.sin(est); n++
  }
  return n && Math.hypot(x, y) > 1e-6 ? deg(Math.atan2(y, x)) : null
}

/** Typical distance between linked rooms on the plan, to scale each step. */
function typicalStep(ctx: WalkContext, byId: Map<string, WalkScene>): number | null {
  const lengths: number[] = []
  for (const [fromId, links] of Object.entries(ctx.linksByScene)) {
    for (const l of links) {
      if (l.type !== 'scene_link' || !l.targetSceneId) continue
      const v = planVector(ctx, byId.get(fromId), byId.get(l.targetSceneId))
      if (v) lengths.push(Math.hypot(v.dx, v.dy))
    }
  }
  if (!lengths.length) return null
  lengths.sort((x, y) => x - y)
  return lengths[Math.floor(lengths.length / 2)]
}

/**
 * Plan a walk from `fromId` to `toId`. `clickedYaw` is the arrow the visitor
 * clicked in this room, when there was one.
 */
export function planWalk(ctx: WalkContext, fromId: string | null, toId: string, clickedYaw?: number | null): WalkRoute {
  const byId = new Map(ctx.scenes.map(s => [s.id, s]))
  const a = fromId ? byId.get(fromId) : undefined
  const b = byId.get(toId)
  const vec = planVector(ctx, a, b)
  const bearing = vec ? bearingDeg(vec) : null
  const northA = fromId ? facing(ctx, byId, fromId) : null
  const northB = facing(ctx, byId, toId)

  // Which way the next room lies, in this room's photo.
  const forward = fromId ? linkTo(ctx, fromId, toId) : undefined
  let travelYaw: number | null = null
  if (typeof clickedYaw === 'number' && Number.isFinite(clickedYaw)) travelYaw = normYaw(clickedYaw)
  else if (forward) travelYaw = normYaw(forward.yaw)
  else if (bearing !== null && northA !== null) travelYaw = normYaw(rad(bearing - northA))

  let arriveYaw: number | null = null
  let source: HeadingSource = 'start-view'
  const back = fromId ? linkTo(ctx, toId, fromId) : undefined
  if (back?.linkStyle === 'interior') {
    // Leaving a car by an arrow: face the car you just got out of.
    return { travelYaw: null, arriveYaw: normYaw(back.yaw), source: 'back-link', stepScale: 1, step: false }
  }
  if (back) {
    arriveYaw = normYaw(back.yaw + Math.PI); source = 'back-link'
  } else if (travelYaw !== null && northA !== null && northB !== null) {
    arriveYaw = normYaw(travelYaw + rad(northA - northB)); source = 'compass'
  } else if (bearing !== null && northB !== null) {
    arriveYaw = normYaw(rad(bearing - northB)); source = 'plan'
  }

  let stepScale = 1
  if (vec) {
    const typical = typicalStep(ctx, byId)
    if (typical) stepScale = Math.min(1.35, Math.max(0.7, Math.sqrt(Math.hypot(vec.dx, vec.dy) / typical)))
  }

  return { travelYaw, arriveYaw, source, stepScale, step: true }
}
