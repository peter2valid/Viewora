import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshBasicMaterial } from 'three'
import type { WebGLRenderer } from 'three'
import { SceneSafeTilesAdapter } from './SceneSafeTilesAdapter'

// Singleton — initialised once per app lifecycle
let ktx2Loader: KTX2Loader | null = null

export function initKtx2Loader(renderer: WebGLRenderer): void {
  if (ktx2Loader) return
  ktx2Loader = new KTX2Loader()
    .setTranscoderPath('/basis/')
    .detectSupport(renderer)
}

/**
 * Detects GPU compressed-texture support using a temporary WebGL context.
 * Called before PSV viewer is created to avoid the chicken-and-egg problem
 * of needing a renderer to check support before choosing the adapter class.
 */
export function detectKtx2GpuSupport(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    return !!(
      gl.getExtension('WEBGL_compressed_texture_etc') ||
      gl.getExtension('WEBGL_compressed_texture_s3tc') ||
      gl.getExtension('EXT_texture_compression_bptc') ||
      gl.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc')
    )
  } catch {
    return false
  }
}

/**
 * Extends SceneSafeTilesAdapter (PSV's tiles adapter that keeps each scene's
 * tiles on its own sphere) to load .ktx2 tiles via KTX2Loader when GPU
 * compressed texture support is available.
 *
 * Falls back to WebP transparently when:
 * - GPU does not support any compressed texture format
 * - initKtx2Loader has not been called yet
 * - KTX2Loader throws for any reason (per-tile WebP fallback)
 */
export class KtxEquirectangularTilesAdapter extends SceneSafeTilesAdapter {
  // @ts-ignore — __loadTile is an implementation detail not in PSV's public types
  __loadTile(tile: any, task: any): Promise<void> {
    if (tile.url?.endsWith?.('.ktx2') && ktx2Loader) {
      return ktx2Loader.loadAsync(tile.url).then((texture: any) => {
        if (task.isCancelled()) { texture.dispose(); return }
        const material = new MeshBasicMaterial({ map: texture })
        // __swapMaterial drops (and disposes) it if the scene has changed meanwhile.
        // @ts-ignore
        this.__swapMaterial(tile, material, false)
        // @ts-ignore
        this.viewer.needsUpdate()
      }).catch(() => {
        if (task.isCancelled()) return
        // KTX2 load failed — derive the WebP fallback URL and retry via parent
        const webpUrl = tile.url
          .replace(/tiles_medium_ktx2\//, 'tiles_medium/')
          .replace(/\.ktx2$/, '.webp')
        return super.__loadTile({ ...tile, url: webpUrl }, task)
      })
    }
    return super.__loadTile(tile, task)
  }
}
