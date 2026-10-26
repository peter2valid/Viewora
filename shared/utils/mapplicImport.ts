// Import a mall map made with Mapplic (the WordPress plugin many malls use)
// plus its "Routes" wayfinding add-on, into Viewora venue floors.
//
// Mapplic keeps the directory in a JSON blob (levels, categories, locations
// with x/y fractions) and each floor as an SVG. The Routes add-on reads
// walkways from the SVG: children of `[id^=route]` groups (line / polyline /
// polygon), joined wherever two share an exact end coordinate. Ids on those
// elements mean:
//   p-<locationId>       this end is that shop's door
//   pf-<group>-<any>     lift / escalator / stair end; same group = linked floors
// and a red stroke marks a segment with steps (skipped by wheelchair routes).
// Dead ends that touch a corner of a `[id^=landmark]` polygon become that
// polygon's door. We read it all the same way, so routes match the original.

import { EDGE_STEPS, type VenueFloorData, type VenueLinkKind, type VenuePlace } from './venue'

export interface MapplicLevel {
  id: string
  title: string
  /** SVG file name / URL from the map JSON. */
  map: string
}

export interface MapplicData {
  levels: MapplicLevel[]
  /** category id → title */
  categories: Record<string, string>
  locations: any[]
}

export interface ImportedLevel {
  levelId: string
  title: string
  venue: VenueFloorData
  stats: { places: number; segments: number; doors: number; links: number; stepSegments: number }
}

/**
 * Accepts the map JSON itself, or a saved copy of the mall's map web page
 * (the JSON sits HTML-escaped in a data-mapdata attribute).
 */
export function parseMapplicSource(text: string): MapplicData {
  let raw: any = null
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) raw = JSON.parse(trimmed)
  else {
    const m = /data-mapdata=(["'])([\s\S]*?)\1/.exec(text)
    if (!m) throw new Error('No Mapplic map data found in this file')
    const el = document.createElement('textarea')
    el.innerHTML = m[2] // decodes &quot; etc. (textarea content is never parsed as HTML)
    raw = JSON.parse(el.value)
  }
  if (!raw || !Array.isArray(raw.levels)) throw new Error('This file has no map levels')

  const categories: Record<string, string> = {}
  for (const c of raw.categories ?? []) if (c?.id) categories[String(c.id)] = String(c.title ?? c.id)
  // Mapplic 7 keeps locations at the top; older versions nest them in levels.
  const locations: any[] = Array.isArray(raw.locations) ? [...raw.locations] : []
  for (const l of raw.levels) {
    for (const loc of l.locations ?? []) locations.push({ ...loc, level: loc.level ?? l.id })
  }
  return {
    levels: raw.levels.filter((l: any) => l?.id).map((l: any) => ({ id: String(l.id), title: String(l.title || l.id), map: String(l.map || '') })),
    categories,
    locations,
  }
}

/** File name a level's SVG is matched on ("…/LEVEL82_GROUND_FLOOR.svg" → "level82_ground_floor.svg"). */
export function levelFileName(level: MapplicLevel): string {
  return (level.map.split(/[?#]/)[0].split('/').pop() || '').toLowerCase()
}

const RED = /^(red|#f00|#ff0000|rgb\(\s*255\s*,\s*0\s*,\s*0\s*\))$/i

function strokeOf(el: Element): string {
  const style = el.getAttribute('style') || ''
  const m = /(?:^|;)\s*stroke\s*:\s*([^;]+)/i.exec(style)
  return (m?.[1] || el.getAttribute('stroke') || '').trim()
}

function htmlToText(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('style,script').forEach(n => n.remove())
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

function safeHttpUrl(u: any): string | undefined {
  if (typeof u !== 'string' || !u.trim()) return undefined
  let s = u.trim()
  if (s.startsWith('//')) s = `https:${s}`
  return /^https?:\/\/[^\s]+$/i.test(s) && s.length <= 500 ? s : undefined
}

function pointsOf(attr: string | null): Array<[string, string]> {
  const nums = (attr || '').trim().split(/[\s,]+/).filter(Boolean)
  const out: Array<[string, string]> = []
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i], nums[i + 1]])
  return out
}

/**
 * Optional measurements from the SVG rendered on screen (transforms applied),
 * in SVG viewBox units: lets us centre pins of shops that only have a shape,
 * and tell lifts from escalators / stairs.
 */
export interface SvgMeasure {
  bbox(el: Element): { x: number; y: number; width: number; height: number } | null
}

export function importMapplicLevel(data: MapplicData, level: MapplicLevel, svgText: string, measure?: SvgMeasure): ImportedLevel {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const svg = doc.documentElement
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error(`${level.title}: not a valid SVG`)
  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number)
  const [vx, vy, vw, vh] = vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0
    ? vb
    : [0, 0, parseFloat(svg.getAttribute('width') || '0'), parseFloat(svg.getAttribute('height') || '0')]
  if (!(vw > 0 && vh > 0)) throw new Error(`${level.title}: the SVG has no size`)
  const fx = (x: number) => Math.round(((x - vx) / vw) * 1e5) / 1e5
  const fy = (y: number) => Math.round(((y - vy) / vh) * 1e5) / 1e5

  // ── Walkway graph, built exactly like Mapplic Routes ──
  const nodes: Array<[number, number]> = []
  const nodeIds: Array<string | null> = []
  const byCoord = new Map<string, number>()
  const edgeKey = new Set<string>()
  const edges: VenueFloorData['edges'] = []
  const degree: number[] = []

  const addPoint = (xs: string, ys: string, id: string | null) => {
    const x = parseFloat(xs), y = parseFloat(ys)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return -1
    const key = `${x},${y}`
    let i = byCoord.get(key)
    if (i === undefined) {
      i = nodes.length
      nodes.push([fx(x), fy(y)])
      nodeIds.push(id)
      degree.push(0)
      byCoord.set(key, i)
    }
    return i
  }
  const link = (a: number, b: number, steps: boolean) => {
    if (a < 0 || b < 0 || a === b) return
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (edgeKey.has(key)) return
    edgeKey.add(key)
    edges.push(steps ? [a, b, EDGE_STEPS] : [a, b])
    degree[a]++
    degree[b]++
  }

  let stepSegments = 0
  const routeGroups = [...svg.querySelectorAll('[id^="route"]')]
  for (const group of routeGroups) {
    for (const el of [...group.children]) {
      const tag = el.tagName.toLowerCase()
      const id = (el.getAttribute('id') || '').replace(/_[1-9]+_$/, '') || null
      const steps = RED.test(strokeOf(el))
      if (tag === 'line') {
        const a = addPoint(el.getAttribute('x1') || '', el.getAttribute('y1') || '', id)
        const b = addPoint(el.getAttribute('x2') || '', el.getAttribute('y2') || '', id)
        link(a, b, steps)
        if (steps) stepSegments++
      } else if (tag === 'polyline' || tag === 'polygon') {
        const list = pointsOf(el.getAttribute('points')).map(([x, y]) => addPoint(x, y, id))
        const filled = tag === 'polygon' && (el.getAttribute('fill') || '').toLowerCase() !== 'none'
        for (let i = 1; i < list.length; i++) {
          link(list[i], list[i - 1], steps)
          // A filled polygon is an open area: every corner reaches every other.
          if (filled) for (let j = i - 2; j >= 0; j--) link(list[i], list[j], steps)
        }
        if (tag === 'polygon' && list.length > 2) link(list[list.length - 1], list[0], steps)
        if (steps) stepSegments++
      }
    }
  }

  // Dead ends on a landmark polygon's corner are that landmark's door.
  const cornerOwner = new Map<string, string>()
  svg.querySelectorAll('[id^="landmark"] > [points], [id^="landmark"] > g > [points]').forEach(el => {
    const id = el.getAttribute('id')
    if (!id) return
    for (const [x, y] of pointsOf(el.getAttribute('points'))) cornerOwner.set(`${parseFloat(x)},${parseFloat(y)}`, id)
  })
  if (cornerOwner.size) {
    for (const [key, i] of byCoord) {
      if (degree[i] === 1 && !nodeIds[i] && cornerOwner.has(key)) nodeIds[i] = `p-${cornerOwner.get(key)}`
    }
  }

  // ── Places ──
  const levelLocs = data.locations.filter(l => l && l.id && (l.level ?? '') === level.id)
  const locIds = new Set(levelLocs.map(l => String(l.id)))
  const doors = new Map<string, number[]>()
  const links: VenueFloorData['links'] = []
  nodeIds.forEach((id, i) => {
    if (!id) return
    if (id.startsWith('pf-')) {
      const group = id.split('-').slice(0, 2).join('-')
      links.push({ node: i, group })
    } else if (id.startsWith('p-')) {
      let loc = id.slice(2)
      // "p-shop-2": a second door of "shop" (when "shop-2" isn't a place itself).
      if (!locIds.has(loc)) {
        const base = loc.replace(/-\d+$/, '')
        if (locIds.has(base)) loc = base
      }
      const list = doors.get(loc) ?? []
      list.push(i)
      doors.set(loc, list)
    }
  })

  const usedIds = new Set<string>()
  const places: VenuePlace[] = []
  for (const l of levelLocs) {
    const name = htmlToText(String(l.title ?? '')).slice(0, 120)
    if (!name) continue
    let x = parseFloat(l.x), y = parseFloat(l.y)
    if (!(Number.isFinite(x) && Number.isFinite(y)) && measure) {
      const shape = svg.querySelector(`[id="${CSS.escape(String(l.id))}"]`)
      const box = shape && measure.bbox(shape)
      if (box) { x = fx(box.x + box.width / 2); y = fy(box.y + box.height / 2) }
    }
    if (!(Number.isFinite(x) && Number.isFinite(y))) {
      const d = doors.get(String(l.id))?.[0]
      if (d !== undefined) [x, y] = nodes[d]
    }
    if (!(Number.isFinite(x) && Number.isFinite(y))) continue
    let id = String(l.id).replace(/[^\w.-]/g, '-').slice(0, 80)
    while (usedIds.has(id)) id = `${id}-x`.slice(-80)
    usedIds.add(id)

    const cats = String(l.category ?? '').split(',').map(c => c.trim()).filter(Boolean)
      .map(c => data.categories[c] ?? c).filter(c => !/^home$/i.test(c))
    const text = htmlToText(String(l.about || '') || String(l.description || '')).slice(0, 600)
    const place: VenuePlace = {
      id,
      name,
      x: Math.round(x * 1e5) / 1e5,
      y: Math.round(y * 1e5) / 1e5,
    }
    if (cats.length) place.category = [...new Set(cats)].join(', ').slice(0, 60)
    const entrances = doors.get(String(l.id))
    if (entrances?.length) place.entrances = entrances.slice(0, 20)
    const url = safeHttpUrl(l.link)
    if (url) place.url = url
    // Shop photos stay on the mall's site: hotlinking them breaks (our CSP,
    // their hotlink rules) — the map shows initials until logos are uploaded.
    if (text) place.text = text
    places.push(place)
  }

  // ── Lift / escalator / stairs: from the groups the connector sits in ──
  if (measure && links.length) {
    const kinds: Array<{ kind: VenueLinkKind; box: { x: number; y: number; width: number; height: number } }> = []
    const KIND_RE: Array<[RegExp, VenueLinkKind]> = [[/lift|elevator/i, 'lift'], [/escalator/i, 'escalator'], [/stair/i, 'stairs'], [/ramp/i, 'ramp']]
    svg.querySelectorAll('g[id]').forEach(g => {
      const id = g.getAttribute('id') || ''
      if (/^route|^landmark/i.test(id)) return
      const hit = KIND_RE.find(([re]) => re.test(id))
      if (!hit) return
      for (const child of [...g.children]) {
        const box = measure.bbox(child)
        if (box && box.width > 0 && box.height > 0) kinds.push({ kind: hit[1], box })
      }
    })
    for (const l of links) {
      const [nx, ny] = nodes[l.node]
      const px = vx + nx * vw, py = vy + ny * vh
      let best: VenueLinkKind | null = null, bestD = vw * 0.02
      for (const k of kinds) {
        const dx = Math.max(k.box.x - px, 0, px - (k.box.x + k.box.width))
        const dy = Math.max(k.box.y - py, 0, py - (k.box.y + k.box.height))
        const d = Math.hypot(dx, dy)
        if (d < bestD) { bestD = d; best = k.kind }
      }
      if (best) l.kind = best
    }
  }
  // Still unknown: a connector reached over a stepped segment is an escalator / stairs.
  for (const l of links) {
    if (l.kind) continue
    const stepped = edges.some(e => (e[0] === l.node || e[1] === l.node) && ((e[2] ?? 0) & EDGE_STEPS))
    if (stepped) l.kind = 'escalator'
  }

  return {
    levelId: level.id,
    title: level.title.slice(0, 60),
    venue: { places, nodes, edges, links },
    stats: {
      places: places.length,
      segments: edges.length,
      doors: places.filter(p => p.entrances?.length).length,
      links: links.length,
      stepSegments,
    },
  }
}

/**
 * The floor drawing as it should look to visitors: Mapplic's walkway lines
 * are hidden by its stylesheet on the live site, so they're removed here.
 */
export function cleanFloorSvg(svgText: string): string {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  doc.querySelectorAll('[id^="route"], script, foreignObject').forEach(n => n.remove())
  return new XMLSerializer().serializeToString(doc)
}

/** Draws an SVG to a PNG file (longest side `maxSide` px), on white. */
export async function rasterizeSvg(svgText: string, fileName: string, maxSide = 4096): Promise<File> {
  const blobUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }))
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = () => reject(new Error('Could not draw this SVG'))
      im.src = blobUrl
    })
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement
    const vb = (doc.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number)
    const w0 = vb.length === 4 && vb[2] > 0 ? vb[2] : (img.naturalWidth || 1200)
    const h0 = vb.length === 4 && vb[3] > 0 ? vb[3] : (img.naturalHeight || 800)
    const k = maxSide / Math.max(w0, h0)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w0 * k)
    canvas.height = Math.round(h0 * k)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
    if (!blob) throw new Error('Could not draw this SVG')
    return new File([blob], fileName.replace(/\.svg$/i, '') + '.png', { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}

/**
 * Renders an SVG off-screen so shapes can be measured with transforms
 * applied. Scripts / event handlers are stripped first. Call dispose() after.
 */
export function measureSvg(svgText: string): SvgMeasure & { dispose(): void } {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  // Neutralise rather than remove, so element positions match a plain parse
  // of the same text (bbox() finds elements by their path from the root).
  doc.querySelectorAll('script, foreignObject').forEach(n => n.replaceWith(doc.createElementNS('http://www.w3.org/2000/svg', 'g')))
  doc.querySelectorAll('*').forEach(el => {
    for (const a of [...el.attributes]) {
      if (/^on/i.test(a.name) || (/href$/i.test(a.name) && !/^(#|data:image\/)/i.test(a.value.trim()))) el.removeAttribute(a.name)
    }
  })
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none'
  const svg = document.importNode(doc.documentElement, true) as unknown as SVGSVGElement
  const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number)
  const [vx, vy, vw, vh] = vb.length === 4 && vb[2] > 0 ? vb : [0, 0, parseFloat(svg.getAttribute('width') || '1200'), parseFloat(svg.getAttribute('height') || '800')]
  svg.setAttribute('width', String(vw))
  svg.setAttribute('height', String(vh))
  host.appendChild(svg)
  document.body.appendChild(host)
  const root = svg.getBoundingClientRect()
  const kx = vw / (root.width || vw), ky = vh / (root.height || vh)

  const twin = (el: Element): Element | null => {
    const path: number[] = []
    for (let n: Element | null = el; n && n.parentElement; n = n.parentElement) {
      path.unshift([...n.parentElement.children].indexOf(n))
    }
    let cur: Element | null = svg
    for (const i of path) cur = cur?.children[i] ?? null
    return cur
  }
  return {
    bbox(el: Element) {
      const target = twin(el)
      if (!target) return null
      const r = target.getBoundingClientRect()
      if (!r.width && !r.height) return null
      return { x: vx + (r.left - root.left) * kx, y: vy + (r.top - root.top) * ky, width: r.width * kx, height: r.height * ky }
    },
    dispose() { host.remove() },
  }
}
