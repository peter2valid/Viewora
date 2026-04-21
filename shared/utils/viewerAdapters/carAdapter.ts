// Car Adapter — isolates @cloudimage/360-view from all business logic.
// Viewer components import from here only. Never import the library directly in components.

import type { CarSpinConfig } from '~/domain/car'
import { CAR_SPIN_DEFAULTS } from '~/shared/constants'

// Opaque handle returned by initCarViewer.
export type CarViewerHandle = unknown

export interface CarInitOptions {
  folder?: string
  filename?: string
  amount?: number
  draggable?: boolean
  autoplay?: boolean
  autoplaySpeed?: number
  dragSpeed?: number
  fullscreen?: boolean
  magnifier?: number
  images?: string[]
}

export function buildCarInitOptions(
  frames: string[],
  overrides: Partial<CarSpinConfig> = {}
): Omit<CarInitOptions, 'container'> {
  return {
    images: frames,
    draggable: true,
    autoplay: overrides.autoplay ?? CAR_SPIN_DEFAULTS.autoplay,
    autoplaySpeed: overrides.autoplaySpeed ?? CAR_SPIN_DEFAULTS.autoplaySpeed,
    dragSpeed: overrides.dragSpeed ?? CAR_SPIN_DEFAULTS.dragSpeed,
    fullscreen: overrides.fullscreen ?? CAR_SPIN_DEFAULTS.fullscreen,
    magnifier: overrides.magnifier ?? CAR_SPIN_DEFAULTS.magnifier,
  }
}

// ---------- Lifecycle stubs — replace bodies when integrating @cloudimage/360-view ----------

/**
 * Mounts a 360 car-spin viewer into `container`.
 * Returns an opaque handle.
 * Throws if `frames` is empty.
 */
export function initCarViewer(
  container: HTMLElement,
  frames: string[],
  overrides: Partial<CarSpinConfig> = {}
): CarViewerHandle {
  if (!frames.length) throw new Error('initCarViewer: frames array is empty')
  // TODO: replace with real @cloudimage/360-view init
  // import CI360Viewer from '@cloudimage/360-view'
  // const viewer = new CI360Viewer(container, buildCarInitOptions(frames, overrides))
  // viewer.init()
  // return viewer
  return null
}

/**
 * Destroys the car viewer and removes event listeners.
 * Must be called in onUnmounted.
 */
export function destroyCar(handle: CarViewerHandle): void {
  if (!handle) return
  // TODO: (handle as CI360Viewer).destroy()
}
