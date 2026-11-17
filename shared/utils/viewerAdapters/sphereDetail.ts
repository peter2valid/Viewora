import { BufferAttribute, BufferGeometry } from 'three'

/**
 * Denser panorama sphere for the same number of draw calls.
 *
 * The tiles adapter draws each of its sphere pieces with its own draw call, so
 * we keep it at 32 × 16 pieces (512 calls) for smooth drags. But with pieces
 * that large, the image is stretched linearly across big flat triangles, and
 * near the floor and ceiling straight lines come out wavy (up to ~9% at the
 * nadir). Here each piece is cut into DETAIL × DETAIL smaller triangles inside
 * the SAME draw group, so the picture is as accurate as a 128 × 64 sphere
 * (~1.6% max at the nadir) while the draw calls stay at 512.
 *
 * Vertices sit on exactly the same sphere with the same yaw/pitch → image
 * mapping, so hotspots and coordinates are unaffected.
 *
 * Kill switch: SPHERE_DETAIL = 1, or ?spheredetail=off on any viewer URL.
 */
export const SPHERE_DETAIL = 4

export function sphereDetail(): number {
  try {
    if (new URLSearchParams(location.search).get('spheredetail') === 'off') return 1
  } catch { /* SSR */ }
  return SPHERE_DETAIL
}

/** Per-vertex position inside its coarse piece (0..1 across, 0..1 down). */
export interface DenseSphere {
  geometry: BufferGeometry
  /** fraction across the piece, left → right */
  fu: Float32Array
  /** fraction down the piece, top → bottom */
  fv: Float32Array
}

/**
 * Builds the dense, non-indexed sphere matching PSV's tile mesh:
 * SphereGeometry(radius, segments, segments/2, -PI/2).scale(-1, 1, 1),
 * with group k (= row * segments + col) covering coarse piece (row, col) and
 * using material index k, the same as PSV's groups.
 */
export function buildDenseSphere(radius: number, segments: number, detail: number): DenseSphere {
  const W = segments
  const H = segments / 2
  const FW = W * detail
  const FH = H * detail
  const PHI0 = -Math.PI / 2
  // 2 triangles per fine cell, minus 1 in the top and bottom fine rows.
  const nTris = FW * FH * 2 - 2 * FW
  const pos = new Float32Array(nTris * 9)
  const uv = new Float32Array(nTris * 6)
  const fu = new Float32Array(nTris * 3)
  const fv = new Float32Array(nTris * 3)
  const geometry = new BufferGeometry()

  let n = 0 // vertices written
  // Fine-grid vertex (iy, ix) exactly as three's SphereGeometry places it,
  // including its half-cell u offset for the pole vertices.
  const put = (iy: number, ix: number, row: number, col: number) => {
    const uOff = iy === 0 ? 0.5 / FW : iy === FH ? -0.5 / FW : 0
    const u = ix / FW + uOff
    const v = iy / FH
    const phi = PHI0 + u * 2 * Math.PI
    const theta = v * Math.PI
    // scale(-1, 1, 1) of three's  x = -r cos(phi) sin(theta)
    pos[n * 3] = radius * Math.cos(phi) * Math.sin(theta)
    pos[n * 3 + 1] = radius * Math.cos(theta)
    pos[n * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    uv[n * 2] = u
    uv[n * 2 + 1] = 1 - v
    fu[n] = u * W - col
    fv[n] = v * H - row
    n++
  }

  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const start = n
      for (let j = 0; j < detail; j++) {
        const iy = row * detail + j
        for (let i = 0; i < detail; i++) {
          const ix = col * detail + i
          // three's SphereGeometry faces: a=(iy,ix+1) b=(iy,ix) c=(iy+1,ix) d=(iy+1,ix+1)
          if (iy !== 0) { put(iy, ix + 1, row, col); put(iy, ix, row, col); put(iy + 1, ix + 1, row, col) }
          if (iy !== FH - 1) { put(iy, ix, row, col); put(iy + 1, ix, row, col); put(iy + 1, ix + 1, row, col) }
        }
      }
      geometry.addGroup(start, n - start, row * W + col)
    }
  }

  geometry.setAttribute('position', new BufferAttribute(pos, 3))
  geometry.setAttribute('uv', new BufferAttribute(uv, 2))
  return { geometry, fu, fv }
}

/**
 * Copies the texture rectangle PSV just gave coarse piece `k` onto the dense
 * piece `k`. PSV's UVs are linear in yaw/pitch within a piece, so the
 * rectangle (min/max of the coarse UVs) defines every dense UV exactly.
 */
export function mirrorPieceUvs(coarse: BufferGeometry, dense: DenseSphere, k: number): void {
  const cg = coarse.groups[k]
  const dg = dense.geometry.groups[k]
  if (!cg || !dg) return
  const cuv = coarse.getAttribute('uv') as BufferAttribute
  let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity
  for (let i = cg.start; i < cg.start + cg.count; i++) {
    const u = cuv.getX(i), v = cuv.getY(i)
    if (u < left) left = u
    if (u > right) right = u
    if (v < bottom) bottom = v
    if (v > top) top = v
  }
  const duv = dense.geometry.getAttribute('uv') as BufferAttribute
  for (let i = dg.start; i < dg.start + dg.count; i++) {
    duv.setXY(i, left + dense.fu[i]! * (right - left), top + dense.fv[i]! * (bottom - top))
  }
  // Upload only this piece's UVs (~0.8 KB), not the whole buffer, on each tile swap.
  duv.addUpdateRange(dg.start * 2, dg.count * 2)
  duv.needsUpdate = true
}
