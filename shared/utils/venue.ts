// Venue maps: a mall / campus directory with walkways on each floor plan, so
// visitors can search a shop and get a route to it from anywhere — across
// floors, through lifts, escalators and stairs, like indoor Google Maps.
//
// Stored per floor in floor_plans.venue (see the backend's
// migration-add-venue-maps.sql). Coordinates are fractions (0–1) of the plan
// image, like scene pins; walkways are a graph of points (nodes) and segments
// (edges). Lift / escalator / stair ends carry a `group`: the same group on
// two floors means "you can get from one to the other here".

export type VenueLinkKind = 'lift' | 'escalator' | 'stairs' | 'ramp'

/** Segment flag: has steps (stairs / escalator) — skipped for step-free routes. */
export const EDGE_STEPS = 1

export interface VenuePlace {
  id: string
  name: string
  category?: string
  x: number
  y: number
  /** Walkway points that are this place's doors. Empty → nearest walkway point. */
  entrances?: number[]
  url?: string
  logo?: string
  text?: string
  /** A 360 view of (or right outside) this place. */
  scene_id?: string
}

export interface VenueFloorData {
  places: VenuePlace[]
  nodes: Array<[number, number]>
  edges: Array<[number, number] | [number, number, number]>
  links: Array<{ node: number; group: string; kind?: VenueLinkKind }>
}

export interface VenueFloor {
  id: string
  name: string
  imageUrl: string
  width: number
  height: number
  order: number
  venue: VenueFloorData
}

export interface VenuePlaceRef extends VenuePlace {
  floorId: string
  floorName: string
}

export interface RoutePoint { x: number; y: number }

export interface RouteLeg {
  floorId: string
  points: RoutePoint[]
  /** How this leg ends when it isn't the last: the lift / escalator taken. */
  connector?: { kind: VenueLinkKind | null; toFloorId: string }
}

export interface VenueRoute {
  from: VenuePlaceRef
  to: VenuePlaceRef
  legs: RouteLeg[]
  steps: string[]
  /** Walking length in plan widths (only for comparing routes). */
  length: number
}

/** Cost of changing floors, in plan widths — a short walk, so routes don't hop floors for nothing. */
const FLOOR_CHANGE_COST = 0.06
/** A place without marked doors joins the nearest walkway point within this distance. */
const SNAP_DISTANCE = 0.08

export function isVenueData(v: any): v is VenueFloorData {
  return !!v && Array.isArray(v.places) && Array.isArray(v.nodes) && Array.isArray(v.edges) && Array.isArray(v.links)
}

/** Floors that carry a venue map, in floor order. Rows are raw floor_plans from the API. */
export function buildVenueFloors(floorPlans: any[] | null | undefined): VenueFloor[] {
  if (!Array.isArray(floorPlans)) return []
  return floorPlans
    .filter(f => f?.id && f.image_url && f.width && f.height && isVenueData(f.venue) && f.venue.places.length)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((f, i) => ({
      id: f.id,
      name: f.name || `Floor ${i + 1}`,
      imageUrl: f.image_url,
      width: f.width,
      height: f.height,
      order: i,
      venue: f.venue,
    }))
}

export function allPlaces(floors: VenueFloor[]): VenuePlaceRef[] {
  return floors.flatMap(f => f.venue.places.map(p => ({ ...p, floorId: f.id, floorName: f.name })))
}

/** Categories in use, most places first. */
export function venueCategories(places: VenuePlace[]): Array<{ name: string; count: number }> {
  const c = new Map<string, number>()
  for (const p of places) {
    for (const name of splitCategories(p.category)) c.set(name, (c.get(name) ?? 0) + 1)
  }
  return [...c.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function splitCategories(category?: string): string[] {
  return (category ?? '').split(/\s*[,/]\s*/).map(s => s.trim()).filter(Boolean)
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Search by name, category or floor. Ranked: name starts with the query,
 * then a word in the name starts with it, then anywhere in name / category.
 */
export function searchPlaces(places: VenuePlaceRef[], query: string, limit = 30): VenuePlaceRef[] {
  const q = norm(query)
  if (!q) return []
  const scored: Array<{ p: VenuePlaceRef; s: number }> = []
  for (const p of places) {
    const name = norm(p.name)
    let s = -1
    if (name.startsWith(q)) s = 0
    else if (name.split(' ').some(w => w.startsWith(q))) s = 1
    else if (name.includes(q)) s = 2
    else if (norm(p.category ?? '').includes(q)) s = 3
    else if (norm(p.floorName).includes(q)) s = 4
    if (s >= 0) scored.push({ p, s })
  }
  return scored.sort((a, b) => a.s - b.s || a.p.name.localeCompare(b.p.name)).slice(0, limit).map(x => x.p)
}

// ── Routing ───────────────────────────────────────────────────

interface GraphNode { floor: number; x: number; y: number; link?: { group: string; kind: VenueLinkKind | null } }
interface GraphEdge { to: number; cost: number; steps: boolean }

export interface VenueGraph {
  floors: VenueFloor[]
  nodes: GraphNode[]
  adj: GraphEdge[][]
  /** Per floor: index of its first node in `nodes`. */
  offsets: number[]
}

/** One graph over every floor; floors are joined where lift / escalator groups match. */
export function buildVenueGraph(floors: VenueFloor[]): VenueGraph {
  const nodes: GraphNode[] = []
  const adj: GraphEdge[][] = []
  const offsets: number[] = []
  const byGroup = new Map<string, number[]>()

  floors.forEach((f, fi) => {
    const off = nodes.length
    offsets.push(off)
    // Distances in plan widths, keeping the plan's aspect (fractions of a wide plan aren't square).
    const ax = 1, ay = f.height / f.width
    for (const [x, y] of f.venue.nodes) { nodes.push({ floor: fi, x, y }); adj.push([]) }
    for (const e of f.venue.edges) {
      const a = off + e[0], b = off + e[1]
      if (!nodes[a] || !nodes[b] || a === b) continue
      const cost = Math.hypot((nodes[a].x - nodes[b].x) * ax, (nodes[a].y - nodes[b].y) * ay)
      const steps = ((e[2] ?? 0) & EDGE_STEPS) !== 0
      adj[a].push({ to: b, cost, steps })
      adj[b].push({ to: a, cost, steps })
    }
    for (const l of f.venue.links) {
      const n = off + l.node
      if (!nodes[n]) continue
      nodes[n].link = { group: l.group, kind: l.kind ?? null }
      const list = byGroup.get(l.group) ?? []
      list.push(n)
      byGroup.set(l.group, list)
    }
  })

  for (const list of byGroup.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j]
        if (nodes[a].floor === nodes[b].floor) continue
        const kind = nodes[a].link?.kind ?? nodes[b].link?.kind
        const steps = kind === 'escalator' || kind === 'stairs'
        const cost = FLOOR_CHANGE_COST * Math.max(1, Math.abs(nodes[a].floor - nodes[b].floor))
        adj[a].push({ to: b, cost, steps })
        adj[b].push({ to: a, cost, steps })
      }
    }
  }
  return { floors, nodes, adj, offsets }
}

/** Graph nodes a place is reached through: its doors, else the nearest walkway point. */
function placeNodes(g: VenueGraph, place: VenuePlaceRef): number[] {
  const fi = g.floors.findIndex(f => f.id === place.floorId)
  if (fi < 0) return []
  const off = g.offsets[fi]
  const count = g.floors[fi].venue.nodes.length
  const doors = (place.entrances ?? []).filter(i => i >= 0 && i < count).map(i => off + i)
  if (doors.length) return doors
  let best = -1, bestD = SNAP_DISTANCE
  for (let i = 0; i < count; i++) {
    const n = g.nodes[off + i]
    const d = Math.hypot(n.x - place.x, n.y - place.y)
    if (d < bestD && g.adj[off + i].length) { bestD = d; best = off + i }
  }
  return best >= 0 ? [best] : []
}

/** Binary-heap Dijkstra from several sources to the nearest of several targets. */
function shortestPath(g: VenueGraph, sources: number[], targets: number[], stepFree: boolean): { path: number[]; cost: number } | null {
  const n = g.nodes.length
  const dist = new Float64Array(n).fill(Infinity)
  const prev = new Int32Array(n).fill(-1)
  const isTarget = new Uint8Array(n)
  for (const t of targets) isTarget[t] = 1
  const heap: Array<[number, number]> = []
  const push = (d: number, v: number) => {
    heap.push([d, v])
    let i = heap.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p][0] <= heap[i][0]) break
      ;[heap[p], heap[i]] = [heap[i], heap[p]]
      i = p
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1, r = l + 1
        let m = i
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r
        if (m === i) break
        ;[heap[m], heap[i]] = [heap[i], heap[m]]
        i = m
      }
    }
    return top
  }
  for (const s of sources) { dist[s] = 0; push(0, s) }
  while (heap.length) {
    const [d, u] = pop()
    if (d > dist[u]) continue
    if (isTarget[u]) {
      const path: number[] = []
      for (let v = u; v !== -1; v = prev[v]) path.unshift(v)
      return { path, cost: d }
    }
    for (const e of g.adj[u]) {
      if (stepFree && e.steps) continue
      const nd = d + e.cost
      if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = u; push(nd, e.to) }
    }
  }
  return null
}

const KIND_LABEL: Record<VenueLinkKind, string> = { lift: 'lift', escalator: 'escalator', stairs: 'stairs', ramp: 'ramp' }

/**
 * Route from one place to another, split into one leg per floor. Null when
 * the two aren't connected (or not step-free connected, with `stepFree`).
 */
export function findRoute(g: VenueGraph, from: VenuePlaceRef, to: VenuePlaceRef, opts: { stepFree?: boolean } = {}): VenueRoute | null {
  const src = placeNodes(g, from), dst = placeNodes(g, to)
  if (!src.length || !dst.length) return null
  const found = shortestPath(g, src, dst, !!opts.stepFree)
  if (!found) return null

  const legs: RouteLeg[] = []
  let leg: RouteLeg | null = null
  for (let i = 0; i < found.path.length; i++) {
    const node = g.nodes[found.path[i]]
    const floorId = g.floors[node.floor].id
    if (!leg || leg.floorId !== floorId) {
      if (leg) {
        const last = g.nodes[found.path[i - 1]]
        leg.connector = { kind: last.link?.kind ?? node.link?.kind ?? null, toFloorId: floorId }
      }
      leg = { floorId, points: [] }
      legs.push(leg)
    }
    leg.points.push({ x: node.x, y: node.y })
  }
  // Start at the shop's pin, end at the destination's pin.
  legs[0].points.unshift({ x: from.x, y: from.y })
  legs[legs.length - 1].points.push({ x: to.x, y: to.y })

  return { from, to, legs, steps: routeSteps(g.floors, from, to, legs), length: found.cost }
}

export function routeSteps(floors: VenueFloor[], from: VenuePlaceRef, to: VenuePlaceRef, legs: RouteLeg[]): string[] {
  const floorOf = (id: string) => floors.find(f => f.id === id)
  const steps = [`Start at ${from.name}, ${from.floorName}`]
  for (const leg of legs) {
    if (!leg.connector) continue
    const a = floorOf(leg.floorId), b = floorOf(leg.connector.toFloorId)
    if (!a || !b) continue
    const dir = b.order > a.order ? 'up' : 'down'
    const what = leg.connector.kind ? KIND_LABEL[leg.connector.kind] : 'lift or escalator'
    const the = leg.connector.kind === 'stairs' ? 'the stairs' : `the ${what}`
    steps.push(`Walk to ${the}`, `Take ${the} ${dir} to ${b.name}`)
  }
  steps.push(legs.length > 1 ? `Walk to ${to.name}` : `Walk to ${to.name}, on this floor`, `Arrive at ${to.name}`)
  return steps
}

// ── Walking a route in 360 ────────────────────────────────────
// The 360 tour can only be walked along its hotspots (scene links), which
// are one-way: a scene shows only its own links. So the walk is planned on
// that link graph, and the map's red line is then drawn through the same
// stops, so the line and the 360 walk agree.

/** A 360 view this close to a place (plan widths) counts as "at" it. */
const WALK_NEAR = 0.05
/** Further than this, the tour doesn't reach the place at all. */
const WALK_PARTIAL = 0.1

export interface SceneGraph {
  /** sceneId → linked sceneIds (one-way, as the viewer shows them) */
  links: Map<string, string[]>
  pins: Map<string, { floorId: string; x: number; y: number }>
}

/** Raw tour scenes (with hotspots and floor-plan pins). */
export function buildSceneGraph(scenes: any[] | null | undefined): SceneGraph {
  const links = new Map<string, string[]>()
  const pins = new Map<string, { floorId: string; x: number; y: number }>()
  if (!Array.isArray(scenes)) return { links, pins }
  const ids = new Set(scenes.map(s => s?.id).filter(Boolean))
  for (const s of scenes) {
    if (!s?.id) continue
    const to = (Array.isArray(s.hotspots) ? s.hotspots : [])
      .filter((h: any) => h?.type === 'scene_link' && ids.has(h.target_scene_id ?? h.targetSceneId) && (h.target_scene_id ?? h.targetSceneId) !== s.id)
      .map((h: any) => h.target_scene_id ?? h.targetSceneId)
    links.set(s.id, [...new Set<string>(to)])
    if (s.floor_plan_id && typeof s.plan_x === 'number' && typeof s.plan_y === 'number') {
      pins.set(s.id, { floorId: s.floor_plan_id, x: s.plan_x, y: s.plan_y })
    }
  }
  return { links, pins }
}

function planDistance(floors: VenueFloor[], floorId: string, a: RoutePoint, b: RoutePoint): number {
  const f = floors.find(fl => fl.id === floorId)
  const ay = f ? f.height / f.width : 1
  return Math.hypot(a.x - b.x, (a.y - b.y) * ay)
}

/** Dijkstra over the scene links: cost to every reachable scene, and the way back. */
function sceneDistances(sg: SceneGraph, floors: VenueFloor[], start: string) {
  const dist = new Map<string, number>([[start, 0]])
  const prev = new Map<string, string>()
  const done = new Set<string>()
  for (;;) {
    let u: string | null = null, best = Infinity
    for (const [k, d] of dist) if (!done.has(k) && d < best) { best = d; u = k }
    if (u === null) break
    done.add(u)
    const pu = sg.pins.get(u)
    for (const v of sg.links.get(u) ?? []) {
      const pv = sg.pins.get(v)
      const w = pu && pv
        ? (pu.floorId === pv.floorId ? planDistance(floors, pu.floorId, pu, pv) : FLOOR_CHANGE_COST)
        : 0.05
      const nd = best + Math.max(w, 1e-4)
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u) }
    }
  }
  return { dist, prev }
}

function pathTo(prev: Map<string, string>, start: string, end: string): string[] {
  const path = [end]
  for (let v = end; v !== start;) {
    const p = prev.get(v)
    if (!p) return []
    path.unshift(p)
    v = p
  }
  return path
}

export interface WalkPlan {
  /**
   * full: the 360 walk reaches the destination; partial: it ends a short walk
   * away; none: the tour doesn't cover the destination (or can't get there
   * from the start).
   */
  status: 'full' | 'partial' | 'none'
  /** Scenes in walking order, starting where the visitor stands. */
  sceneIds: string[]
  /** Why there's no walk: the tour doesn't reach the destination, or can't get there from the start. */
  reason?: 'destination' | 'start'
}

/** Shortest walk through the 360 links from one scene to another (empty if unreachable). */
export function scenePath(sg: SceneGraph, floors: VenueFloor[], from: string, to: string): string[] {
  if (from === to) return [from]
  const { prev } = sceneDistances(sg, floors, from)
  return pathTo(prev, from, to)
}

/**
 * Plan a 360 walk from `from` to `to`. `startSceneId` is the scene the visitor
 * is standing in (when the route starts at "your 360 view"); otherwise the
 * walk starts at the 360 view nearest the start place.
 */
export function planWalk(
  sg: SceneGraph, floors: VenueFloor[], from: VenuePlaceRef, to: VenuePlaceRef, startSceneId?: string | null,
): WalkPlan {
  const near = (p: VenuePlaceRef, max: number) => [...sg.pins.entries()]
    .filter(([, pin]) => pin.floorId === p.floorId)
    .map(([id, pin]) => ({ id, d: planDistance(floors, p.floorId, pin, p) }))
    .filter(c => c.d <= max)
    .sort((a, b) => a.d - b.d)

  // The destination's own 360 view (a place can name one) counts as at it.
  const own = to.scene_id && sg.pins.has(to.scene_id) ? to.scene_id : null
  const starts = startSceneId && sg.links.has(startSceneId) ? [startSceneId] : near(from, 0.08).map(c => c.id)
  for (const start of starts) {
    const { dist, prev } = sceneDistances(sg, floors, start)
    let best: { id: string; d: number } | null = null
    for (const id of dist.keys()) {
      const pin = sg.pins.get(id)
      if (!pin || pin.floorId !== to.floorId) continue
      const d = id === own ? 0 : planDistance(floors, to.floorId, pin, to)
      // Equal-ish distances: prefer the shorter walk.
      if (!best || d < best.d - 0.005 || (Math.abs(d - best.d) <= 0.005 && dist.get(id)! < dist.get(best.id)!)) best = { id, d }
    }
    if (!best || best.d > WALK_PARTIAL) continue
    const sceneIds = pathTo(prev, start, best.id)
    if (!sceneIds.length) continue
    return { status: best.d <= WALK_NEAR ? 'full' : 'partial', sceneIds }
  }
  const covered = !!own || near(to, WALK_PARTIAL).length > 0
  return { status: 'none', sceneIds: [], reason: covered ? 'start' : 'destination' }
}

/**
 * The map route drawn through the walk's 360 stops, in order, so the red line
 * follows the hotspots. Stops the walkways can't reach are skipped. Null when
 * no route fits (the caller keeps the plain shortest route).
 */
export function routeThroughScenes(
  g: VenueGraph, sg: SceneGraph, from: VenuePlaceRef, to: VenuePlaceRef, sceneIds: string[], opts: { stepFree?: boolean } = {},
): VenueRoute | null {
  const floorName = (id: string) => g.floors.find(f => f.id === id)?.name ?? ''
  const stops: VenuePlaceRef[] = [from]
  for (const id of sceneIds) {
    const pin = sg.pins.get(id)
    if (!pin || !g.floors.some(f => f.id === pin.floorId)) continue
    stops.push({ id: `scene:${id}`, name: '', x: pin.x, y: pin.y, floorId: pin.floorId, floorName: floorName(pin.floorId) })
  }
  stops.push(to)

  const legs: RouteLeg[] = []
  let length = 0
  let a = stops[0]
  for (let i = 1; i < stops.length; i++) {
    const b = stops[i]
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-4 && a.floorId === b.floorId) continue
    const part = findRoute(g, a, b, opts)
    if (!part) {
      if (i === stops.length - 1) return null // can't reach the destination itself
      continue // skip a stop off the walkways
    }
    length += part.length
    for (const leg of part.legs) {
      const last = legs[legs.length - 1]
      if (last && last.floorId === leg.floorId && !last.connector) last.points.push(...leg.points)
      else legs.push({ floorId: leg.floorId, points: [...leg.points] })
      if (leg.connector) legs[legs.length - 1].connector = leg.connector
    }
    a = b
  }
  if (!legs.length) return null
  return { from, to, legs, steps: routeSteps(g.floors, from, to, legs), length }
}
