// Tripod cover: the owner's logo drawn as a round "sticker" straight below the
// camera in every scene, hiding the tripod.
//
// Not baked into the panorama: it is a flat disc in the 3D scene, under the
// camera, facing up. Seen from the centre of the sphere a flat disc centred
// below the camera fills a perfect circle (a cone of `size` degrees), exactly
// where a baked nadir patch would sit, and the logo reads flat like a real
// sticker on the floor. Its own texture is full resolution, so it stays sharper
// than a patch baked into the floor tiles, and the owner can change it at any
// time without re-processing a single scene.
//
// Cost: one extra draw call per frame (~516 today), one 1024² texture.
//
// Room changes: the disc lives in world space, so it would stay behind while a
// walk moves the camera into the next room. It fades out when the next room
// starts loading and back in once the room has arrived (show()).

import * as THREE from 'three'

/** What the owner saves for the whole tour (property_360_settings.nadir_cover). */
export interface NadirCoverSettings {
  /** Master switch: off = no cover anywhere (choices below are kept). */
  enabled: boolean
  /** all: every scene, also scenes added later, except `hidden_scene_ids`.
   *  some: only the scenes in `scene_ids`. Absent (older saves) = all. */
  mode?: 'all' | 'some'
  /** Scenes chosen in 'some' mode. */
  scene_ids?: string[]
  /** The logo/image (already uploaded). */
  url: string
  /** Angular radius of the cover in degrees (how much floor it hides). */
  size: number
  /** Turn the logo on the floor, degrees. */
  rotation: number
  /** fill: the image fills the circle (square logos, corners cut off);
   *  fit: the whole image sits inside the circle on `bg`. */
  fit: 'fill' | 'fit'
  /** Circle colour behind the image (#rrggbb), null = transparent. */
  bg: string | null
  /** Scenes left out in 'all' mode (outdoor, drone…). */
  hidden_scene_ids: string[]
}

/** What one scene draws: the tour settings, resolved for that scene. */
export type NadirCover = Pick<NadirCoverSettings, 'url' | 'size' | 'rotation' | 'fit' | 'bg'>

export const NADIR_SIZE_MIN = 8
export const NADIR_SIZE_MAX = 40
export const NADIR_SIZE_DEFAULT = 18

export const DEFAULT_NADIR_COVER: Omit<NadirCoverSettings, 'url'> = {
  enabled: true,
  mode: 'all',
  scene_ids: [],
  size: NADIR_SIZE_DEFAULT,
  rotation: 0,
  fit: 'fill',
  bg: '#ffffff',
  hidden_scene_ids: [],
}

/** The cover a scene shows, or null (off, hidden here, or no image). */
export function resolveNadirCover(settings: Partial<NadirCoverSettings> | null | undefined, sceneId: string): NadirCover | null {
  if (!settings?.enabled || !settings.url) return null
  if (!nadirCoverShowsOn(settings, sceneId)) return null
  const size = Number(settings.size)
  return {
    url: settings.url,
    size: Number.isFinite(size) ? Math.min(NADIR_SIZE_MAX, Math.max(NADIR_SIZE_MIN, size)) : NADIR_SIZE_DEFAULT,
    rotation: Number(settings.rotation) || 0,
    fit: settings.fit === 'fit' ? 'fit' : 'fill',
    bg: typeof settings.bg === 'string' && /^#[0-9a-f]{6}$/i.test(settings.bg) ? settings.bg : null,
  }
}

/** Whether the cover's scene choice includes this scene (ignores the master switch). */
export function nadirCoverShowsOn(settings: Partial<NadirCoverSettings>, sceneId: string): boolean {
  if (settings.mode === 'some') return !!settings.scene_ids?.includes(sceneId)
  return !settings.hidden_scene_ids?.includes(sceneId)
}

/** Near-square images fill the circle; wide or tall ones fit inside it. */
export function suggestFit(width: number, height: number): 'fill' | 'fit' {
  if (!width || !height) return 'fill'
  const a = width / height
  return a > 0.85 && a < 1.18 ? 'fill' : 'fit'
}

/**
 * Where to draw a `w`×`h` image on a `px`² canvas whose circle has diameter px.
 * fill: cover the whole circle (centre crop). fit: the largest rectangle of the
 * image's shape inside the circle, with a margin so it doesn't touch the edge.
 */
export function coverRect(w: number, h: number, px: number, fit: 'fill' | 'fit'): { x: number; y: number; w: number; h: number } {
  const a = w > 0 && h > 0 ? w / h : 1
  let dw: number
  let dh: number
  if (fit === 'fill') {
    if (a >= 1) { dh = px; dw = px * a } else { dw = px; dh = px / a }
  } else {
    // Rectangle inscribed in the circle: its half-diagonal is the radius.
    const k = 0.86
    dw = (px * a / Math.hypot(a, 1)) * k
    dh = (px / Math.hypot(a, 1)) * k
  }
  return { x: (px - dw) / 2, y: (px - dh) / 2, w: dw, h: dh }
}

/** Load a cross-origin image usable as a WebGL texture. */
export function loadCoverImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Tripod cover image failed to load: ${url}`))
    // Its own URL: the same logo shown earlier by a plain <img> (the tour intro)
    // can sit in the cache without CORS headers, and WebGL refuses that copy.
    img.src = url.startsWith('data:') || url.startsWith('blob:') ? url : `${url}${url.includes('?') ? '&' : '?'}cover=1`
  })
}

/** The round cover as a canvas: circle clip, background, image. Also the editor's preview. */
export function drawCoverCanvas(
  img: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number | SVGAnimatedLength; height?: number | SVGAnimatedLength },
  cover: Pick<NadirCover, 'fit' | 'bg'>,
  px = 1024,
  canvas: HTMLCanvasElement = document.createElement('canvas'),
): HTMLCanvasElement {
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, px, px)
  ctx.save()
  ctx.beginPath()
  ctx.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  if (cover.bg) {
    ctx.fillStyle = cover.bg
    ctx.fillRect(0, 0, px, px)
  }
  const w = img.naturalWidth || Number(img.width) || px
  const h = img.naturalHeight || Number(img.height) || px
  const r = coverRect(w, h, px, cover.fit)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, r.x, r.y, r.w, r.h)
  ctx.restore()
  return canvas
}

/** Height of the disc below the camera. PSV's sphere radius is 10 and its far
 *  plane 20; close to the sphere so a walk's first creep moves it about as
 *  much as the floor of the photo. The material skips the depth test, so the
 *  rim may poke past the sphere without being cut. */
const DISC_DEPTH = 9
const FADE_MS = 220
/** Above the panorama (and the next room in a walk, renderOrder 1), below the WebGL nav arrows (999). */
const RENDER_ORDER = 998

export interface NadirCoverController {
  /** Show this cover (or none) for the room now on screen. */
  show(cover: NadirCover | null): void
  /** Fade out (the next room is loading). */
  hide(): void
  dispose(): void
}

export function installNadirCover(viewer: any): NadirCoverController {
  const scene3d: THREE.Scene = viewer.renderer.scene

  // Flat unit disc facing up, oriented so that looking straight down with
  // yaw 0 the image reads upright and not mirrored: in PSV yaw 0 is +z and
  // screen-right is then -x (see dataHelper.sphericalCoordsToVector3).
  const geometry = new THREE.CircleGeometry(1, 128)
  geometry.rotateX(Math.PI / 2)
  geometry.scale(-1, 1, 1)
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(0, -DISC_DEPTH, 0)
  mesh.renderOrder = RENDER_ORDER
  mesh.visible = false
  mesh.frustumCulled = false
  scene3d.add(mesh)

  let texture: THREE.CanvasTexture | null = null
  let textureKey = ''
  let wanted: NadirCover | null = null
  let loadSeq = 0
  let raf = 0
  let disposed = false

  const fadeTo = (target: number) => {
    cancelAnimationFrame(raf)
    const from = material.opacity
    if (from === target) { mesh.visible = target > 0; viewer.needsUpdate(); return }
    mesh.visible = true
    const t0 = performance.now()
    const tick = () => {
      if (disposed) return
      const k = Math.min(1, (performance.now() - t0) / FADE_MS)
      material.opacity = from + (target - from) * k
      if (k >= 1) mesh.visible = target > 0
      viewer.needsUpdate()
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  const place = (cover: NadirCover) => {
    const r = DISC_DEPTH * Math.tan((cover.size * Math.PI) / 180)
    mesh.scale.set(r, 1, r)
    // Negative: a positive angle turns the logo clockwise on screen, like CSS rotate() in the editor's preview.
    mesh.rotation.y = (-cover.rotation * Math.PI) / 180
  }

  const show = (cover: NadirCover | null) => {
    if (disposed) return
    wanted = cover
    if (!cover) { fadeTo(0); return }
    place(cover)
    const key = `${cover.url}|${cover.fit}|${cover.bg ?? ''}`
    if (key === textureKey && texture) { fadeTo(1); return }
    const seq = ++loadSeq
    loadCoverImage(cover.url).then((img) => {
      if (disposed || seq !== loadSeq) return
      const canvas = drawCoverCanvas(img, cover)
      const next = new THREE.CanvasTexture(canvas)
      next.colorSpace = THREE.SRGBColorSpace
      next.anisotropy = Math.min(4, viewer.renderer.renderer.capabilities.getMaxAnisotropy?.() ?? 1)
      texture?.dispose()
      texture = next
      textureKey = key
      material.map = next
      material.needsUpdate = true
      if (wanted) { place(wanted); fadeTo(1) }
    }).catch((err) => {
      if (seq !== loadSeq) return
      console.warn('[Viewora]', err?.message ?? err)
      fadeTo(0)
    })
  }

  return {
    show,
    hide: () => { if (!disposed) fadeTo(0) },
    dispose: () => {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(raf)
      scene3d.remove(mesh)
      geometry.dispose()
      material.dispose()
      texture?.dispose()
    },
  }
}
