// Finds cars in a picture, in the browser (editor only). Google's MediaPipe object detector
// (EfficientDet-Lite0, Apache-2.0): a 7 MB model + 9 MB WebAssembly (about 4 MB compressed), both
// served from our own site and cached for a year, so an owner downloads them once. Nothing is sent
// anywhere; the video never leaves the device.
//
// Everything here may fail (offline, old browser, blocked download): callers get null and make the
// spin from the frames as recorded.

import type { Box } from './spinStabilize'

// The WebAssembly is copied from the installed package at build time (nuxt.config.ts publicAssets);
// keep this folder name in step with the exact version pinned in package.json.
const WASM_BASE = '/mediapipe/wasm-0.10.14'
// public/mediapipe: Google's efficientdet_lite0 float16 v1 (Apache-2.0). The int8 one found no cars in testing.
const MODEL_URL = '/mediapipe/efficientdet_lite0_f16_v1.tflite'
/** Long edge of the picture the detector looks at (it works at 320 px inside; more is wasted). */
export const DETECT_EDGE = 640

export interface CarDetector {
  /** Car-like boxes in the picture, as fractions of it. */
  detect(source: HTMLCanvasElement): Box[]
  close(): void
}

let pending: Promise<CarDetector | null> | null = null

/**
 * Starts loading the detector (once per page; later calls share it) and resolves to it, or to null
 * when it cannot run here. Call it early (when the video dialog opens) so the download happens while
 * the owner picks or records the video.
 */
export function preloadCarDetector(): Promise<CarDetector | null> {
  if (typeof window === 'undefined' || typeof WebAssembly === 'undefined') return Promise.resolve(null)
  if (!pending) {
    pending = createDetector().catch(() => null)
    // A failed load (offline) may succeed later: let the next spin try again.
    pending.then((d) => { if (!d) pending = null })
  }
  return pending
}

/** Frees the detector's memory; the next preload makes a new one (its files are in the browser cache). */
export function releaseCarDetector() {
  const p = pending
  pending = null
  p?.then(d => d?.close()).catch(() => {})
}

async function createDetector(): Promise<CarDetector | null> {
  const { FilesetResolver, ObjectDetector } = await import('@mediapipe/tasks-vision')
  const files = await FilesetResolver.forVisionTasks(WASM_BASE)
  const make = (delegate: 'GPU' | 'CPU') => ObjectDetector.createFromOptions(files, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'IMAGE',
    // Low on purpose: a car seen dead-on scores low; the tracker throws out boxes that do not fit.
    scoreThreshold: 0.05,
    maxResults: 8,
    categoryAllowlist: ['car', 'truck', 'bus'],
  })
  const det = await make('GPU').catch(() => make('CPU'))
  return {
    detect(source) {
      const w = source.width || 1
      const h = source.height || 1
      return det.detect(source).detections.map((d) => {
        const b = d.boundingBox!
        return { x: b.originX / w, y: b.originY / h, w: b.width / w, h: b.height / h, score: d.categories[0]?.score ?? 0 }
      })
    },
    close() { try { det.close() } catch { /* already gone */ } },
  }
}
