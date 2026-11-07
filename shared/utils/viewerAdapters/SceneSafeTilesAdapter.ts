import { EquirectangularTilesAdapter } from '@photo-sphere-viewer/equirectangular-tiles-adapter'
import { utils } from '@photo-sphere-viewer/core'
import { MeshBasicMaterial } from 'three'

/**
 * EquirectangularTilesAdapter that never paints one scene's tiles onto another
 * scene's sphere.
 *
 * Why tiles from two scenes mixed (PSV 5.14.1): setPanorama() switches
 * viewer.config.panorama to the new scene at once, but the adapter keeps
 * drawing onto the old scene's sphere until the crossfade completes. Any
 * refresh in between — every camera move or zoom: our walk-in animation,
 * autorotate, the gyroscope, a drag — computed the NEW scene's tile URLs and
 * pasted them onto the OLD sphere on screen. An interrupted switch (a second
 * click mid-fade) left the adapter on the old sphere and kept doing it with
 * the newest scene. Also, tile downloads aborted by a scene change were
 * marked done forever, leaving blurry patches if that scene stayed up.
 *
 * Fix: each sphere remembers its panorama; tiles are computed from, and only
 * drawn onto, the sphere of the panorama they belong to. Everything else is
 * PSV's own code.
 */
/** Small pool of tile decode workers. Resolves null when workers are unavailable
 *  or the tile failed there, so the caller falls back to the main-thread path. */
const DECODE_WORKERS = 2
let decodePool: Worker[] | null | undefined
let decodeNext = 0
let decodeSeq = 0
const decodePending = new Map<number, (bitmap: ImageBitmap | null) => void>()

/** Debug switch for A/B tests: ?tiledecode=main (bitmap on the main thread) or =img (plain image). */
const decodeMode = (): string => {
  try { return new URLSearchParams(location.search).get('tiledecode') || '' } catch { return '' }
}

function getDecodePool(): Worker[] | null {
  if (decodePool !== undefined) return decodePool
  decodePool = null
  if (decodeMode()) return null
  if (typeof Worker === 'undefined' || typeof createImageBitmap !== 'function') return null
  try {
    const pool: Worker[] = []
    for (let k = 0; k < DECODE_WORKERS; k++) {
      const w = new Worker(new URL('./tileDecode.worker.ts', import.meta.url), { type: 'module' })
      w.onmessage = (e: MessageEvent<{ id: number; bitmap?: ImageBitmap; error?: string }>) => {
        const done = decodePending.get(e.data.id)
        if (!done) { e.data.bitmap?.close(); return }
        decodePending.delete(e.data.id)
        done(e.data.bitmap ?? null)
      }
      w.onerror = () => {
        // Worker died: fail what it was doing and stop using the pool.
        decodePool = null
        for (const [id, done] of decodePending) { decodePending.delete(id); done(null) }
      }
      pool.push(w)
    }
    decodePool = pool
  } catch { decodePool = null }
  return decodePool
}

function decodeTileInWorker(url: string): Promise<ImageBitmap | null> {
  const pool = getDecodePool()
  if (!pool) return Promise.resolve(null)
  return new Promise(resolve => {
    const id = ++decodeSeq
    decodePending.set(id, resolve)
    pool[decodeNext++ % pool.length]!.postMessage({ id, url })
  })
}

/**
 * Tiles are put on the sphere a few per frame, not all as they arrive.
 * Three.js uploads a texture to the GPU in the first frame that draws it, so
 * tiles finishing together were all uploaded inside one frame (2-5 ms each on
 * an Intel HD 620), and a frame that already runs near its budget turns into a
 * 80-120 ms hitch. Steady beats fast: while the view moves, or after a slow
 * frame, only one tile goes up and the rest wait for the next frame.
 */
const FRAME_SLOW_MS = 30      // a frame this long means the GPU/CPU has no spare time
const MOVING_MS = 150         // the view counts as moving this long after the last camera update
const STARVE_MS = 200         // never hold a ready tile back longer than this between uploads

export class SceneSafeTilesAdapter extends EquirectangularTilesAdapter {
  /** Panorama of the sphere tiles are currently drawn onto (state.geom). */
  protected vwPanorama: unknown = undefined

  private vwReady: Array<() => void> = []
  private vwRaf = 0
  private vwLastFrame = 0
  private vwLastApply = 0
  private vwLastMove = 0
  private vwOnMove = () => { this.vwLastMove = performance.now() }
  /** True while walking out of the room: no new tiles are requested or drawn. */
  private vwHeld = false

  /** Hold tile loading while leaving a room; on release, catch up with the current view. */
  vwHoldTiles(on: boolean) {
    if (this.vwHeld === on) return
    this.vwHeld = on
    if (!on) {
      // @ts-ignore
      try { this.__refresh() } catch { /* viewer gone */ }
      if (this.vwReady.length && !this.vwRaf) this.vwRaf = requestAnimationFrame(this.vwPump)
    }
  }

  // @ts-ignore
  constructor(viewer: any, config: any) {
    // @ts-ignore
    super(viewer, config)
    try { viewer.addEventListener('position-updated', this.vwOnMove) } catch { /* ignore */ }
  }

  // @ts-ignore
  destroy() {
    cancelAnimationFrame(this.vwRaf); this.vwRaf = 0
    this.vwReady.length = 0
    this.vwInflight.clear()
    // @ts-ignore
    try { this.viewer?.removeEventListener('position-updated', this.vwOnMove) } catch { /* ignore */ }
    // @ts-ignore
    return super.destroy()
  }

  /** Run `apply` (puts one decoded tile on the sphere) in a later frame, within the per-frame budget. */
  private vwEnqueue(apply: () => void) {
    this.vwReady.push(apply)
    if (!this.vwRaf) this.vwRaf = requestAnimationFrame(this.vwPump)
  }

  private vwPump = (t: number) => {
    this.vwRaf = 0
    if (this.vwHeld) return // resumed by vwHoldTiles(false)
    const dt = this.vwLastFrame ? t - this.vwLastFrame : 0
    this.vwLastFrame = t
    const moving = t - this.vwLastMove < MOVING_MS
    const starved = t - this.vwLastApply > STARVE_MS
    if (dt > FRAME_SLOW_MS && !starved) {
      // Last frame was slow: let the GPU catch up before adding more upload work.
    } else {
      const n = moving || dt > FRAME_SLOW_MS ? 1 : 3
      for (let i = 0; i < n && this.vwReady.length; i++) {
        try { this.vwReady.shift()!() } catch { /* one bad tile must not stop the queue */ }
        this.vwLastApply = t
      }
    }
    if (this.vwReady.length) this.vwRaf = requestAnimationFrame(this.vwPump)
    else this.vwLastFrame = 0
  }

  /**
   * The panorama spheres are never hit-tested. PSV finds the point under the
   * mouse on its own invisible sphere (renderer.raycasterMesh), and only that
   * hit and marker hits are ever used. Yet every mousemove (with 3D markers on
   * screen) and every viewerCoordsToSphericalCoords call raycast the whole
   * scene, testing ~4,000 triangles on each of these two meshes for nothing:
   * about a third of the script time during a desktop drag.
   */
  // @ts-ignore
  createMesh(panoData: any) {
    // @ts-ignore
    const group = super.createMesh(panoData)
    group.traverse((obj: any) => { if (obj.isMesh) obj.raycast = () => {} })
    return group
  }

  // @ts-ignore — PSV internals below are not in its public types
  setTexture(group: any, textureData: any, transition: boolean) {
    group.userData.vwPanorama = textureData.panorama
    // @ts-ignore
    return super.setTexture(group, textureData, transition)
  }

  // @ts-ignore
  __switchMesh(group: any) {
    this.vwPanorama = group.userData.vwPanorama
    // @ts-ignore
    return super.__switchMesh(group)
  }

  // @ts-ignore
  __refresh() {
    // PSV computes tile URLs from viewer.config.panorama, which already names
    // the next scene while the old sphere is still on screen (and stays that
    // way after an interrupted or failed switch). Compute them from the
    // sphere's own panorama instead, so the scene on screen keeps getting its
    // own tiles. Synchronous swap, restored straight after.
    // @ts-ignore
    const config = this.viewer.config
    if (this.vwHeld) return
    const next = config.panorama
    if (this.vwPanorama === undefined || this.vwPanorama === next) {
      // @ts-ignore
      return super.__refresh()
    }
    config.panorama = this.vwPanorama
    try {
      // @ts-ignore
      return super.__refresh()
    } finally {
      config.panorama = next
    }
  }

  // @ts-ignore
  __loadTiles(tiles: any[]) {
    for (const tile of tiles) tile.vwPanorama = this.vwPanorama
    // @ts-ignore
    return super.__loadTiles(tiles)
  }

  /** Last check before drawing: drop a tile whose scene is no longer on the sphere. */
  // @ts-ignore
  __swapMaterial(tile: any, material: any, isError: boolean) {
    if (tile.vwPanorama !== this.vwPanorama) {
      if (!isError) { material.map?.dispose(); material.dispose() }
      return
    }
    // @ts-ignore
    return super.__swapMaterial(tile, material, isError)
  }

  /**
   * One load per tile at a time. PSV's queue (shared/Queue.ts, 5.14) restarts
   * tiles that are already downloading: every view refresh sets all tasks,
   * running ones included, to "disabled", and the tiles still in view are then
   * set back to "pending" and started again. A drag refreshes every frame, so
   * the same tile was fetched, decoded and uploaded to the GPU up to 4 times
   * (1,400 uploads in two minutes on a 2-room run), which was most of the
   * stutter while dragging and for seconds after. Keyed by URL so a tile of the
   * next scene with the same row/col is never mistaken for one of this scene.
   */
  private vwInflight = new Map<string, { p: Promise<void>; task: any }>()

  // @ts-ignore
  __loadTile(tile: any, task: any): Promise<void> {
    const key = String(tile.url)
    const running = this.vwInflight.get(key)
    // A load whose task was cancelled (scene left and re-entered) won't draw: start a fresh one.
    if (running && !running.task.isCancelled()) return running.p
    const entry = { p: Promise.resolve(), task }
    entry.p = this.vwLoadTile(tile, task).finally(() => {
      if (this.vwInflight.get(key) === entry) this.vwInflight.delete(key)
    })
    this.vwInflight.set(key, entry)
    return entry.p
  }

  /** Same as PSV's, plus: an aborted download is retried later instead of
   *  being marked done; a failed one leaves the preview photo showing (no ⚠ tile). */
  private vwLoadTile(tile: any, task: any): Promise<void> {
    // @ts-ignore
    const viewer = this.viewer
    const finish = (source: any, bitmap: ImageBitmap | null) => {
      if (task.isCancelled()) { bitmap?.close(); return }
      this.vwEnqueue(() => {
        if (task.isCancelled()) { bitmap?.close(); return }
        place(source, bitmap)
      })
    }
    const place = (source: any, bitmap: ImageBitmap | null) => {
      // @ts-ignore
      const mipmaps = this.config.antialias && tile.config.level > 0
      const texture = utils.createTexture(source, mipmaps)
      if (bitmap) {
        // WebGL ignores UNPACK_FLIP_Y for bitmaps: they were flipped when created.
        texture.flipY = false
        texture.addEventListener('dispose', () => { try { bitmap.close() } catch { /* already closed */ } })
      }
      this.__swapMaterial(tile, new MeshBasicMaterial({ map: texture }), false)
      viewer.needsUpdate()
    }
    // Preferred: fetched and decoded in a worker, so no decode runs on the main thread.
    return decodeTileInWorker(tile.url).then(async (bitmap) => {
      if (bitmap) return finish(bitmap, bitmap)
      // Fallback: PSV's loader, then a main-thread bitmap (or the plain image).
      const image: any = await viewer.textureLoader.loadImage(tile.url, null, viewer.state.textureData?.cacheKey)
      if (task.isCancelled()) return
      let bm: ImageBitmap | null = null
      if (typeof createImageBitmap === 'function' && decodeMode() !== 'img') {
        try { bm = await createImageBitmap(image, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }) } catch { bm = null }
      }
      finish(bm ?? image, bm)
    }).catch((err: unknown) => {
      if (!task.isCancelled() && utils.isAbortError(err)) this.forgetTile(tile)
    })
  }

  /** Let the next refresh request this tile again. */
  protected forgetTile(tile: any) {
    if (tile.vwPanorama !== this.vwPanorama) return
    // @ts-ignore
    delete this.state.tiles[`${tile.col}x${tile.row}/${tile.config.level}`]
  }
}
