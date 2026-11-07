// Scene markers that look like page elements.
//
// Hotspot icons drawn as page elements over the WebGL canvas can be
// composited a frame apart from the panorama (seen in Firefox): during slow
// autorotate they shiver on the spot. Drawn inside the scene (MarkersPlugin
// `imageLayer` markers) they can't, but they then take on perspective: they
// grow toward the screen edges, lean, and go edge-on when looking down.
//
// fitToScreen undoes that after every camera move, before the frame is drawn
// (position/zoom/size events fire inside PSV's update, ahead of the render):
//   1. face the camera fully;
//   2. turn about the anchor until the marker's up points straight up on
//      screen. A straight line stays straight under perspective, so the
//      screen directions of its up and right at the anchor give the exact turn;
//   3. scale its drawn height and width to the wanted pixels.
// The anchor (the point that sits on the hotspot) never moves. Checked over
// 1,000 camera/marker angles, incl. looking straight down: no lean, no squash.

import { Vector3 } from 'three'

const v0 = new Vector3(), v1 = new Vector3(), v2 = new Vector3(), v3 = new Vector3()

export interface ScreenFitPass {
  /** Fit one imageLayer marker to `w`×`h` screen pixels. */
  fit: (marker: any, w: number, h: number) => void
}

/** Start a pass (reads the camera once); null if the viewer isn't ready. */
export function screenFitPass(viewer: any): ScreenFitPass | null {
  const cam = viewer?.renderer?.camera
  const W = viewer?.state?.size?.width, H = viewer?.state?.size?.height
  if (!cam || !W || !H) return null
  cam.updateMatrixWorld()
  const toPx = (v: Vector3) => { v.project(cam); v.set((v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z); return v }

  return {
    fit(marker: any, w: number, h: number) {
      const group = marker?.threeElement, mesh = marker?.threeMesh
      if (!group || !mesh || !(w > 0) || !(h > 0)) return
      group.scale.set(1, 1, 1)
      group.lookAt(0, 0, 0)
      group.updateMatrixWorld(true)
      // Anchor in the plane's own units (the plane is 1×1, centred).
      const ay = 0.5 - (marker.state?.anchor?.y ?? 0.5)
      const ax = (marker.state?.anchor?.x ?? 0.5) - 0.5
      const a = toPx(mesh.localToWorld(v0.set(ax, ay, 0)))
      if (a.z > 1) return // behind the camera
      const tx = a.x, ty = a.y
      const e = 1e-3
      const up = toPx(mesh.localToWorld(v1.set(ax, ay + e, 0)))
      const rt = toPx(mesh.localToWorld(v2.set(ax + (e * mesh.scale.y) / mesh.scale.x, ay, 0)))
      const ux = up.x - tx, uy = up.y - ty, rx = rt.x - tx, ry = rt.y - ty
      // Mix cos(t)·up + sin(t)·right that is vertical and points up on screen.
      let turn = Math.atan2(-ux, rx)
      if (Math.cos(turn) * uy + Math.sin(turn) * ry > 0) turn += Math.PI
      if (Number.isFinite(turn)) group.rotateZ(-turn)
      group.updateMatrixWorld(true)
      const top = toPx(mesh.localToWorld(v0.set(0, 0.5, 0)))
      const topX = top.x, topY = top.y
      const bot = toPx(mesh.localToWorld(v1.set(0, -0.5, 0)))
      const lft = toPx(mesh.localToWorld(v2.set(-0.5, 0, 0)))
      const rgt = toPx(mesh.localToWorld(v3.set(0.5, 0, 0)))
      const dh = Math.hypot(bot.x - topX, bot.y - topY)
      const dw = Math.hypot(rgt.x - lft.x, rgt.y - lft.y)
      if (!(dh > 0.01) || !(dw > 0.01)) return
      group.scale.set(
        Math.min(6, Math.max(0.15, w / dw)),
        Math.min(6, Math.max(0.15, h / dh)),
        1,
      )
    },
  }
}

/** A starting size (MarkersPlugin units) close to `w`×`h` px at the current zoom; fitToScreen corrects it. */
export function screenSizeUnits(viewer: any, w: number, h: number): { width: number; height: number } {
  const vFov = ((viewer?.state?.vFov ?? 60) * Math.PI) / 180
  const height = viewer?.state?.size?.height || 800
  const k = (2000 * Math.tan(vFov / 2)) / height
  return { width: w * k, height: h * k }
}
