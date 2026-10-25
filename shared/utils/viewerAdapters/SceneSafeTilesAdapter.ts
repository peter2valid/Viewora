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
export class SceneSafeTilesAdapter extends EquirectangularTilesAdapter {
  /** Panorama of the sphere tiles are currently drawn onto (state.geom). */
  protected vwPanorama: unknown = undefined

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
    return viewer.textureLoader.loadImage(tile.url, null, viewer.state.textureData?.cacheKey).then((image: any) => {
      if (task.isCancelled()) return
      // @ts-ignore
      const mipmaps = this.config.antialias && tile.config.level > 0
      const material = new MeshBasicMaterial({ map: utils.createTexture(image, mipmaps) })
      this.__swapMaterial(tile, material, false)
      viewer.needsUpdate()
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
