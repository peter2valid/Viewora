// The "step forward" when walking between rooms.
//
// PSV keeps its camera at the centre of the photo sphere, so turning and
// zooming never look like moving. For a walk the camera is moved forward
// through the current room instead: what lies ahead grows and the sides slide
// past. The next room is drawn on its own sphere, centred where the step
// ends, and fades in while the camera travels there, the same idea Street View
// uses. When the crossfade finishes, PSV moves the new room to the centre and
// the camera goes back with it in the same frame, so nothing jumps.
//
// Verified against @photo-sphere-viewer/core 5.14.1 internals:
//   renderer.camera, renderer.scene, renderer.__onPositionUpdated() (resets the
//   camera to the origin) and renderer.transition() (adds the next room as a new
//   Group on renderer.scene and returns the crossfade Animation).

import { Vector3 } from 'three'

/** PSV's sphere radius is 10; a typical step goes ~45% of the way to the wall. */
export const WALK_STEP = 4.5

export interface WalkMotion {
  /** Put the camera back at the centre and remove the hooks. Safe to call twice. */
  stop(): void
}

const smooth = (k: number) => k * k * (3 - 2 * k)

/**
 * Start easing the camera forward toward `yaw` (level) while the next room
 * loads; the next PSV crossfade then carries it the rest of the way, `depth`
 * sphere units in all.
 */
export function startWalkMotion(viewer: any, yaw: number, depth: number): WalkMotion {
  const renderer = viewer?.renderer
  const camera = renderer?.camera
  const origTransition = renderer?.transition
  const origPositionUpdated = renderer?.__onPositionUpdated
  if (!camera || typeof origTransition !== 'function' || typeof origPositionUpdated !== 'function') {
    return { stop() {} }
  }

  const dir = new Vector3()
  viewer.dataHelper.sphericalCoordsToVector3({ yaw, pitch: 0 }, dir, 1)
  let offset = 0
  let raf = 0
  let stopped = false
  const reordered: Array<[any, number]> = []

  // PSV aims the camera with camera.lookAt(), which measures from the camera's
  // last world matrix, not its position. PSV never moves the camera, so that is
  // always the origin for it; once the step has moved it, the matrix has to be
  // re-centred before every aim or the view turns a few degrees off target
  // (and stays off after the step ends).
  const aim = () => {
    camera.position.set(0, 0, 0)
    camera.updateMatrix()
    camera.updateMatrixWorld()
    origPositionUpdated.call(renderer)
    if (offset) {
      camera.position.addScaledVector(dir, offset)
      camera.updateMatrix()
      camera.updateMatrixWorld()
    }
  }
  const place = () => {
    aim()
    viewer.needsUpdate()
  }

  // Any camera turn while stepping (PSV re-centres the camera on each one) keeps the step.
  renderer.__onPositionUpdated = aim

  const run = (from: number, to: number, ms: number, ease: (k: number) => number) => {
    cancelAnimationFrame(raf)
    const t0 = performance.now()
    // performance.now(), not the rAF timestamp: that can be earlier than t0.
    const tick = () => {
      if (stopped) return
      const k = Math.min(1, Math.max(0, (performance.now() - t0) / ms))
      offset = from + (to - from) * ease(k)
      place()
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  // While the next room downloads: a slow first step that never reaches the wall.
  const creep = depth * 0.22
  {
    const t0 = performance.now()
    const tick = () => {
      if (stopped) return
      offset = creep * (1 - Math.exp(-Math.max(0, performance.now() - t0) / 380))
      place()
      if (offset < creep * 0.995) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  // The crossfade: next room on a sphere centred at the end of the step.
  renderer.transition = function (textureData: any, options: any, transition: any) {
    renderer.transition = origTransition
    const before = new Set(renderer.scene.children)
    const anim = origTransition.call(renderer, textureData, options, transition)
    const next = renderer.scene.children.find((c: any) => !before.has(c))
    if (!next || stopped) return anim
    next.position.copy(dir).multiplyScalar(depth)
    // Panorama materials skip the depth test, so whichever is drawn last shows.
    // three.js sorts opaque objects by distance, and with the next room moved
    // ahead it would put the old room last the moment the fade reaches full
    // opacity, flashing it back for the last frames. Keep the next room last.
    next.traverse((o: any) => { reordered.push([o, o.renderOrder]); o.renderOrder = 1 })
    const ms = typeof transition?.speed === 'number' ? transition.speed : 700
    run(offset, depth, ms, smooth)
    // Runs right after PSV's own .then (registered first), which moves the room
    // to the centre: both happen before the next frame is drawn.
    anim.then(() => api.stop())
    return anim
  }

  const api: WalkMotion = {
    stop() {
      if (stopped) return
      stopped = true
      cancelAnimationFrame(raf)
      if (renderer.transition !== origTransition) renderer.transition = origTransition
      renderer.__onPositionUpdated = origPositionUpdated
      for (const [o, order] of reordered) o.renderOrder = order
      offset = 0
      place()
    },
  }
  return api
}
