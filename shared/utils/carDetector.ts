// Finds cars in a picture, in the browser (editor only). Google's MediaPipe object detector
// (EfficientDet-Lite0, Apache-2.0): about 7 MB, downloaded once when an owner makes a video spin,
// then cached by the browser. Nothing is sent anywhere; the video never leaves the device.
//
// Everything here may fail (offline, old browser, blocked download): callers get null and make the
// spin from the frames as recorded.

import type { Box } from './spinStabilize'

// Pinned with the npm package version, so the JS and its WebAssembly always match.
const MEDIAPIPE_VERSION = '0.10.14'
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite'
/** Long edge of the picture the detector looks at (it works at 320 px inside; more is wasted). */
export const DETECT_EDGE = 640

export interface CarDetector {
  /** Car-like boxes in the picture, as fractions of it. */
  detect(source: HTMLCanvasElement): Box[]
  close(): void
}

/** Loads the detector, or null when it cannot run here. Gives up after `timeoutMs`. */
export async function loadCarDetector(timeoutMs = 30000): Promise<CarDetector | null> {
  if (typeof window === 'undefined' || typeof WebAssembly === 'undefined') return null
  const load = async (): Promise<CarDetector | null> => {
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
  try {
    return await Promise.race([
      load(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
    ])
  } catch {
    return null
  }
}
