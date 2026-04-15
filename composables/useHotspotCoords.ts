/**
 * Pure math utilities: 360° world-space ↔ screen-space pixel coordinates.
 *
 * Coordinate conventions (matches PanoViewer v3 equirectangular):
 *   yaw   — 0 = forward (−Z axis), positive = right (clockwise from above)
 *   pitch — 0 = horizontal, positive = up
 *   fov   — vertical field of view in degrees
 *
 * 3D unit-sphere mapping:
 *   x = cos(pitch) · sin(yaw)    (right)
 *   y = sin(pitch)               (up)
 *   z = −cos(pitch) · cos(yaw)   (forward → −Z)
 */

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

/**
 * Project a world-space (yaw, pitch) point onto screen pixels.
 *
 * Returns `visible: false` when the point is behind or on the camera plane,
 * or when it falls outside the container bounds (with a small margin so
 * markers at the very edge don't flicker).
 */
export function worldToScreen(
  hsYaw: number,
  hsPitch: number,
  camYaw: number,
  camPitch: number,
  camFov: number,         // vertical FOV in degrees
  containerWidth: number,
  containerHeight: number,
): { x: number; y: number; visible: boolean } {
  // ── World-space unit vector for the hotspot ──────────────────
  const yr = toRad(hsYaw)
  const pr = toRad(hsPitch)
  const wx = Math.cos(pr) * Math.sin(yr)
  const wy = Math.sin(pr)
  const wz = -Math.cos(pr) * Math.cos(yr)

  // ── Transform to camera space ─────────────────────────────────
  // Step 1 — undo camera yaw: Ry(+camYaw)
  const cy = toRad(camYaw)
  const r1x = wx * Math.cos(cy) + wz * Math.sin(cy)
  const r1y = wy
  const r1z = -wx * Math.sin(cy) + wz * Math.cos(cy)

  // Step 2 — undo camera pitch: Rx(−camPitch)
  const cp = toRad(-camPitch)
  const r2x = r1x
  const r2y = r1y * Math.cos(cp) - r1z * Math.sin(cp)
  const r2z = r1y * Math.sin(cp) + r1z * Math.cos(cp)

  // Camera looks along −Z; r2z ≥ 0 → behind (or on) the camera plane
  if (r2z >= 0) return { x: 0, y: 0, visible: false }

  // ── Perspective projection ────────────────────────────────────
  const f = (containerHeight / 2) / Math.tan(toRad(camFov / 2))
  const px = containerWidth / 2 + f * (r2x / -r2z)
  const py = containerHeight / 2 - f * (r2y / -r2z)

  // Allow a margin equal to the marker radius so edge hotspots don't flash
  const margin = 22
  const visible =
    px > -margin &&
    px < containerWidth + margin &&
    py > -margin &&
    py < containerHeight + margin

  return { x: px, y: py, visible }
}

/**
 * Unproject a screen click (px, py) back to world-space (yaw, pitch).
 * Inverse of `worldToScreen`.
 */
export function screenToWorld(
  px: number,
  py: number,
  camYaw: number,
  camPitch: number,
  camFov: number,
  containerWidth: number,
  containerHeight: number,
): { yaw: number; pitch: number } {
  const f = (containerHeight / 2) / Math.tan(toRad(camFov / 2))

  // Unproject pixel → normalised camera-space ray
  const cx = (px - containerWidth / 2) / f
  const cy = -(py - containerHeight / 2) / f
  const cz = -1 // unit focal depth

  const len = Math.sqrt(cx * cx + cy * cy + cz * cz)
  const nx = cx / len
  const ny = cy / len
  const nz = cz / len

  // Inverse of Rx(−camPitch) = Rx(+camPitch)
  const cp = toRad(camPitch)
  const r1x = nx
  const r1y = ny * Math.cos(cp) - nz * Math.sin(cp)
  const r1z = ny * Math.sin(cp) + nz * Math.cos(cp)

  // Inverse of Ry(+camYaw) = Ry(−camYaw)
  const cy2 = toRad(-camYaw)
  const r2x = r1x * Math.cos(cy2) + r1z * Math.sin(cy2)
  const r2y = r1y
  const r2z = -r1x * Math.sin(cy2) + r1z * Math.cos(cy2)

  const pitch = toDeg(Math.asin(Math.max(-1, Math.min(1, r2y))))
  const yaw = toDeg(Math.atan2(r2x, -r2z))

  return { yaw, pitch }
}
