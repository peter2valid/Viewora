<template>
  <div
    ref="rootEl"
    class="rs"
    :class="{ 'rs--dragging': dragging, 'rs--flat': failed }"
    :style="failed && imageUrl ? { backgroundImage: `url('${imageUrl}')` } : undefined"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @wheel.prevent="onWheel"
  >
    <canvas v-show="!failed" ref="canvasEl" class="rs__canvas" />
    <span v-if="loading" class="rs__loading" aria-hidden="true" />
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * A small look-around 360° view of one scene photo, for choosing a room.
 *
 * Kept light on purpose (the editor already runs a full panorama viewer):
 * - one WebGL context, one sphere, one texture for the component's lifetime;
 *   switching rooms redraws into the same 2048×1024 canvas and re-uploads it;
 * - draws only when something changes (drag, zoom, new photo, resize), never in
 *   a loop, so an idle picker costs nothing;
 * - big source photos are shrunk to 2048×1024 while decoding and the decoded
 *   bitmap is closed straight away;
 * - everything is disposed and the context released on unmount.
 * If WebGL or the image can't be used, it falls back to the flat photo.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'

const props = defineProps<{
  imageUrl?: string | null
  /** Bump to recentre the view (e.g. a different room was chosen). */
  resetKey?: string | number
}>()

const rootEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const dragging = ref(false)
const loading = ref(false)
const failed = ref(false)

const TEX_W = 2048
const TEX_H = 1024
const FOV_MIN = 40
const FOV_MAX = 95

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let geometry: THREE.SphereGeometry | null = null
let material: THREE.MeshBasicMaterial | null = null
let texture: THREE.CanvasTexture | null = null
let texCanvas: HTMLCanvasElement | null = null
let ro: ResizeObserver | null = null
let raf = 0
let loadToken = 0

// yaw 0 = the middle of the photo (the scene's front).
let yaw = 0
let pitch = 0
let fov = 80

function requestRender() {
  if (raf || !renderer) return
  raf = requestAnimationFrame(() => {
    raf = 0
    if (!renderer || !scene || !camera) return
    const cp = Math.cos(pitch)
    camera.fov = fov
    camera.updateProjectionMatrix()
    camera.lookAt(-Math.cos(yaw) * cp, Math.sin(pitch), -Math.sin(yaw) * cp)
    renderer.render(scene, camera)
  })
}

function resize() {
  const el = rootEl.value
  if (!el || !renderer || !camera) return
  const w = Math.max(1, el.clientWidth)
  const h = Math.max(1, el.clientHeight)
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  requestRender()
}

function init(): boolean {
  if (!canvasEl.value) return false
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl.value, antialias: false, alpha: false, powerPreference: 'low-power' })
  } catch {
    return false
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100)
  geometry = new THREE.SphereGeometry(10, 48, 32)
  geometry.scale(-1, 1, 1) // look at the inside
  texCanvas = document.createElement('canvas')
  texCanvas.width = TEX_W
  texCanvas.height = TEX_H
  texture = new THREE.CanvasTexture(texCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  material = new THREE.MeshBasicMaterial({ map: texture })
  scene.add(new THREE.Mesh(geometry, material))
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    ro = new ResizeObserver(resize)
    ro.observe(rootEl.value)
  }
  resize()
  return true
}

async function load(url: string | null | undefined) {
  const token = ++loadToken
  yaw = 0; pitch = 0; fov = 80
  if (!url) { failed.value = true; return }
  if (!renderer && !init()) { failed.value = true; return }
  loading.value = true
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    if (token !== loadToken) return
    const bmp = await createImageBitmap(blob, { resizeWidth: TEX_W, resizeHeight: TEX_H, resizeQuality: 'high' } as ImageBitmapOptions)
    if (token !== loadToken || !texCanvas || !texture) { bmp.close(); return }
    texCanvas.getContext('2d')!.drawImage(bmp, 0, 0, TEX_W, TEX_H)
    bmp.close()
    texture.needsUpdate = true
    failed.value = false
    requestRender()
  } catch {
    if (token === loadToken) failed.value = true
  } finally {
    if (token === loadToken) loading.value = false
  }
}

watch(() => props.imageUrl, (u) => { void load(u) })
watch(() => props.resetKey, () => { yaw = 0; pitch = 0; fov = 80; requestRender() })

let lastX = 0
let lastY = 0
function onDown(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button')) return
  dragging.value = true
  lastX = e.clientX
  lastY = e.clientY
  rootEl.value?.setPointerCapture(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!dragging.value || !rootEl.value) return
  // Grab-the-photo feel: one view width of drag turns by one field of view.
  const radPerPx = (fov * Math.PI / 180) / Math.max(1, rootEl.value.clientHeight)
  yaw -= (e.clientX - lastX) * radPerPx
  pitch = Math.max(-1.45, Math.min(1.45, pitch + (e.clientY - lastY) * radPerPx))
  lastX = e.clientX
  lastY = e.clientY
  requestRender()
}
function onUp() {
  dragging.value = false
}
function onWheel(e: WheelEvent) {
  fov = Math.max(FOV_MIN, Math.min(FOV_MAX, fov + e.deltaY * 0.05))
  requestRender()
}

onMounted(() => { void load(props.imageUrl) })

onBeforeUnmount(() => {
  loadToken++
  if (raf) cancelAnimationFrame(raf)
  ro?.disconnect()
  texture?.dispose()
  material?.dispose()
  geometry?.dispose()
  if (texCanvas) { texCanvas.width = 0; texCanvas.height = 0 }
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
  }
  renderer = null; scene = null; camera = null; texture = null; material = null; geometry = null; texCanvas = null
})
</script>

<style scoped>
.rs {
  position: relative;
  overflow: hidden;
  background: #0d0f16 center / cover no-repeat;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.rs--dragging { cursor: grabbing; }
.rs--flat { cursor: default; }
.rs__canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.rs__loading {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top-color: #fff;
  animation: rs-spin 0.8s linear infinite;
  pointer-events: none;
}
@keyframes rs-spin { to { transform: rotate(360deg); } }
</style>
