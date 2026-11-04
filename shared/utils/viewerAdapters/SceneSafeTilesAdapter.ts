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

export class SceneSafeTilesAdapter extends EquirectangularTilesAdapter {
  /** Panorama of the sphere tiles are currently drawn onto (state.geom). */
  protected vwPanorama: unknown = undefined

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

  /** Same as PSV's, plus: an aborted download is retried later instead of
   *  being marked done; a failed one leaves the preview photo showing (no ⚠ tile). */
  // @ts-ignore
  __loadTile(tile: any, task: any): Promise<void> {
    // @ts-ignore
    const viewer = this.viewer
    const finish = (source: any, bitmap: ImageBitmap | null) => {
      if (task.isCancelled()) { bitmap?.close(); return }
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
