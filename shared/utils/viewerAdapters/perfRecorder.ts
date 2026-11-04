/**
 * ?perf=1 — a built-in recorder for diagnosing drag/scene-load smoothness on a
 * real device, without the browser profiler (which crashes on some laptops).
 *
 * Adds a small "REC" pill (bottom-left). Click it, or press Shift+P, to download
 * a JSON file with everything needed to see where time goes:
 *   - frame gaps (requestAnimationFrame) and main-thread stalls (message-channel heartbeat)
 *   - three.js render() CPU time per frame
 *   - every WebGL texture upload: duration, source kind (ImageBitmap / <img> / canvas), size
 *   - tile and preview downloads (PerformanceObserver) with sizes and durations
 *   - pointer down/up, drag, node changes and zoom as timeline markers
 *   - GPU / browser / screen info and the URL switches in use
 * Press Shift+M to drop a numbered marker ("now I clicked the scene"). Nothing is
 * sent anywhere: the file is only saved on the visitor's own machine.
 */
type Ev = [number, string, number?, string?]

export function installPerfRecorder(viewer: any): void {
  if (typeof window === 'undefined' || viewer.__perfRec) return
  try { if (new URLSearchParams(location.search).get('perf') !== '1') return } catch { return }
  viewer.__perfRec = true

  const t0 = performance.now()
  const now = () => Math.round((performance.now() - t0) * 10) / 10
  const frames: Array<[number, number]> = []   // [t, gap ms]
  const renders: Array<[number, number]> = []  // [t, render() ms]
  const uploads: Array<[number, number, string, number]> = [] // [t, ms, kind, pixels]
  const stalls: Array<[number, number]> = []   // [t, blocked ms]
  const events: Ev[] = []
  const resources: Array<[number, string, number, number]> = [] // [t, kind, duration, bytes]
  let drag = false

  // ── frame gaps ─────────────────────────────────────────────────────────
  let lastFrame = performance.now()
  let raf = 0
  const tick = () => { const n = performance.now(); frames.push([now(), Math.round((n - lastFrame) * 10) / 10]); lastFrame = n; raf = requestAnimationFrame(tick) }
  raf = requestAnimationFrame(tick)

  // ── main-thread stalls (a ping-pong that only runs when the thread is free) ──
  const ch = new MessageChannel()
  let lastPing = performance.now()
  let alive = true
  ch.port1.onmessage = () => {
    const n = performance.now()
    if (n - lastPing > 20) stalls.push([now(), Math.round(n - lastPing)])
    lastPing = n
    if (alive) ch.port2.postMessage(0)
  }
  ch.port2.postMessage(0)

  // ── three.js render() cost and texture uploads ─────────────────────────
  const three = viewer.renderer?.renderer
  const origRender = three?.render?.bind(three)
  if (origRender) three.render = (...a: any[]) => { const s = performance.now(); const r = origRender(...a); renders.push([now(), Math.round((performance.now() - s) * 10) / 10]); return r }
  const gl: any = three?.getContext?.()
  const restore: Array<() => void> = []
  const kindOf = (src: any): [string, number] => {
    if (!src) return ['none', 0]
    const n = src.constructor?.name ?? 'unknown'
    const w = src.width ?? src.naturalWidth ?? 0, h = src.height ?? src.naturalHeight ?? 0
    return [n, w * h]
  }
  if (gl) for (const fn of ['texImage2D', 'texSubImage2D'] as const) {
    const o = gl[fn]; if (typeof o !== 'function') continue
    gl[fn] = function (...a: any[]) {
      const [kind, px] = kindOf(a[a.length - 1])
      const s = performance.now(); const r = o.apply(this, a); const ms = performance.now() - s
      uploads.push([now(), Math.round(ms * 10) / 10, kind, px]); return r
    }
    restore.push(() => { gl[fn] = o })
  }

  // ── downloads ──────────────────────────────────────────────────────────
  let po: PerformanceObserver | null = null
  try {
    po = new PerformanceObserver((list) => {
      for (const e of list.getEntries() as PerformanceResourceTiming[]) {
        const u = e.name
        const kind = /\/tiles_medium\//.test(u) ? 'tile_medium' : /\/tiles\//.test(u) ? 'tile_full' : /thumbnail/.test(u) ? 'thumbnail_or_preview' : /\.(webp|jpe?g|png|ktx2)/.test(u) ? 'image_other' : ''
        if (kind) resources.push([Math.round(e.startTime - t0), kind, Math.round(e.duration), e.transferSize || e.encodedBodySize || 0])
      }
    })
    po.observe({ type: 'resource', buffered: true })
  } catch { po = null }

  // ── timeline markers ───────────────────────────────────────────────────
  const el: HTMLElement | null = viewer.container ?? null
  let moves = 0
  const onDown = () => { drag = true; events.push([now(), 'pointerdown']) }
  const onUp = () => { if (drag) events.push([now(), 'pointerup', moves]); drag = false; moves = 0 }
  const onPos = () => { if (drag) moves++ }
  el?.addEventListener('pointerdown', onDown, true)
  window.addEventListener('pointerup', onUp, true)
  viewer.addEventListener?.('position-updated', onPos)
  const onNode = () => events.push([now(), 'node-changed'])
  const onZoom = (e: any) => events.push([now(), 'zoom', Math.round(e?.zoomLevel ?? 0)])
  try { viewer.addEventListener('panorama-loaded', onNode); viewer.addEventListener('zoom-updated', onZoom) } catch { /* ignore */ }
  let markN = 0
  const mark = () => { markN++; events.push([now(), 'MARK', markN]); flash(`mark ${markN}`) }

  // ── report ─────────────────────────────────────────────────────────────
  const pct = (a: number[], p: number) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]! }
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
  function report() {
    const end = now()
    const secs: any[] = []
    for (let s = 0; s * 1000 < end; s++) {
      const inS = (t: number) => t >= s * 1000 && t < (s + 1) * 1000
      const f = frames.filter(([t]) => inS(t)).map(x => x[1])
      const r = renders.filter(([t]) => inS(t)).map(x => x[1])
      const u = uploads.filter(([t]) => inS(t))
      const st = stalls.filter(([t]) => inS(t)).map(x => x[1])
      secs.push({
        s, frames: f.length, gap_median: pct(f, .5), gap_p95: pct(f, .95), gaps_over_50: f.filter(x => x > 50).length,
        render_ms_sum: Math.round(sum(r)), render_ms_max: Math.max(0, ...r),
        uploads: u.length, upload_ms_sum: Math.round(sum(u.map(x => x[1]))), upload_ms_max: Math.max(0, ...u.map(x => x[1])),
        stalls_over_20: st.length, blocked_ms: sum(st),
      })
    }
    const gpu = (() => { try { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); const x: any = g?.getExtension('WEBGL_debug_renderer_info'); return x ? { renderer: g!.getParameter(x.UNMASKED_RENDERER_WEBGL), vendor: g!.getParameter(x.UNMASKED_VENDOR_WEBGL) } : null } catch { return null } })()
    const canvas = document.querySelector('.psv-canvas') as HTMLCanvasElement | null
    return {
      recorded_at: new Date().toISOString(), duration_ms: end, url: location.href,
      env: { ua: navigator.userAgent, cores: navigator.hardwareConcurrency, memory_gb: (navigator as any).deviceMemory ?? null, dpr: devicePixelRatio, screen: `${screen.width}x${screen.height}`, viewport: `${innerWidth}x${innerHeight}`, canvas: canvas ? `${canvas.width}x${canvas.height}` : null, gpu },
      per_second: secs,
      events,
      uploads_by_kind: Object.fromEntries([...new Set(uploads.map(u => u[2]))].map(k => { const u = uploads.filter(x => x[2] === k); return [k, { n: u.length, ms_sum: Math.round(sum(u.map(x => x[1]))), ms_max: Math.max(...u.map(x => x[1])), ms_median: pct(u.map(x => x[1]), .5) }] })),
      downloads_by_kind: Object.fromEntries([...new Set(resources.map(r => r[1]))].map(k => { const r = resources.filter(x => x[1] === k); return [k, { n: r.length, bytes: sum(r.map(x => x[3])), ms_median: pct(r.map(x => x[2]), .5) }] })),
      raw: { frames, renders, uploads, stalls, resources },
    }
  }
  function save() {
    const data = JSON.stringify(report())
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    a.download = `viewora-perf-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    document.body.appendChild(a); a.click(); a.remove()
    flash('saved')
  }

  // ── tiny overlay ───────────────────────────────────────────────────────
  const pill = document.createElement('button')
  pill.type = 'button'
  pill.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:rgba(190,30,30,.85);color:#fff;font:600 11px system-ui,sans-serif;cursor:pointer'
  const label = 'REC · click or Shift+P to save · Shift+M = mark'
  pill.textContent = label
  pill.addEventListener('click', save)
  document.body.appendChild(pill)
  let flashT: ReturnType<typeof setTimeout> | undefined
  function flash(msg: string) { pill.textContent = msg; clearTimeout(flashT); flashT = setTimeout(() => { pill.textContent = label }, 1500) }
  const onKey = (e: KeyboardEvent) => { if (!e.shiftKey) return; if (e.key === 'P') save(); else if (e.key === 'M') mark() }
  window.addEventListener('keydown', onKey)
  ;(window as any).__vwPerf = { save, mark, report }

  const destroy = viewer.destroy?.bind(viewer)
  if (destroy) viewer.destroy = (...a: any[]) => {
    alive = false; cancelAnimationFrame(raf); po?.disconnect(); pill.remove()
    window.removeEventListener('keydown', onKey); window.removeEventListener('pointerup', onUp, true)
    el?.removeEventListener('pointerdown', onDown, true)
    restore.forEach(f => f()); if (origRender) three.render = origRender
    return destroy(...a)
  }
}
