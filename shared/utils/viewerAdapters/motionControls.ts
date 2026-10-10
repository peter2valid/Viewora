// Phone motion ("gyroscope") control and VR (stereo) mode for the 360 viewer.
//
// Replaces the stock PSV GyroscopePlugin behaviour, which felt floaty and
// unreliable on real phones:
//  - it chased the sensor through PSV's speed/acceleration dynamics (and crept
//    at speed 1 for small moves), so the view trailed the phone and drifted
//    into place instead of being glued to it;
//  - any drag, pinch-zoom, arrow key or room change fired PSV's stopAll(),
//    which silently switched motion control off while our button still
//    showed it on;
//  - screen rotation came from the deprecated window.orientation (missing on
//    Firefox / some Android browsers → wrong axes in landscape);
//  - touch-drag offset subtracted the *pitch* from the yaw (upstream typo);
//  - our earlier patch low-passed alpha/beta/gamma separately, which is
//    mathematically wrong: those Euler angles flip by 180° around an upright
//    phone (beta ≈ 90°, the most common pose), so averaging them swung the
//    view. It also added a dead zone that made slow turns stutter.
//
// This version works in rotation space:
//  1. each sensor reading (+ the current screen rotation) becomes one
//     quaternion — continuous in every pose, no gimbal flips;
//  2. per rendered frame the displayed orientation slerps toward it with an
//     adaptive time constant: steady when the phone is held still (hand
//     tremor and sensor noise vanish), near-instant when it's turning, and
//     frame-rate independent (60/90/120 Hz screens behave the same);
//  3. the result is applied directly in the same frame — no chasing.
// Turning stays relative: it starts from whatever the buyer was looking at, a
// drag/arrow key re-aims horizontally while motion stays on, and walking into
// another room keeps it on.

import { events } from '@photo-sphere-viewer/core'
import { GyroscopePlugin, events as gyroEvents } from '@photo-sphere-viewer/gyroscope-plugin'
import { StereoPlugin } from '@photo-sphere-viewer/stereo-plugin'
import { Euler, Quaternion, Vector3 } from 'three'

export type MotionError = 'denied' | 'unavailable' | 'insecure'

const TWO_PI = Math.PI * 2
const DEG = Math.PI / 180

const _zee = new Vector3(0, 0, 1)
const _q0 = new Quaternion()
// −90° about X: device frame (screen facing up) → camera frame (looking out the back).
const _q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))
const _euler = new Euler()
const _dir = new Vector3()

/** Shortest signed angle from a to b, in (−π, π]. */
function angleDelta(a: number, b: number): number {
  let d = (b - a) % TWO_PI
  if (d > Math.PI) d -= TWO_PI
  if (d <= -Math.PI) d += TWO_PI
  return d
}
function wrapYaw(y: number): number {
  const w = y % TWO_PI
  return w < 0 ? w + TWO_PI : w
}
function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/** Current screen rotation in degrees (0, 90, 180, 270), on every browser. */
function screenAngle(): number {
  try {
    const a = (screen as any)?.orientation?.angle
    if (typeof a === 'number') return a
  } catch { /* noop */ }
  const w = (window as any).orientation
  return typeof w === 'number' ? w : 0
}

/** W3C device orientation (alpha, beta, gamma in degrees) + screen angle → camera quaternion. */
function deviceQuaternion(out: Quaternion, alpha: number, beta: number, gamma: number, screenDeg: number): Quaternion {
  _euler.set(beta * DEG, alpha * DEG, -gamma * DEG, 'YXZ')
  out.setFromEuler(_euler)
  out.multiply(_q1)
  out.multiply(_q0.setFromAxisAngle(_zee, -screenDeg * DEG))
  return out
}

function hasPermissionApi(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as any).DeviceOrientationEvent !== 'undefined'
    && typeof (window as any).DeviceOrientationEvent.requestPermission === 'function'
}

let _permission: Promise<'granted' | 'denied'> | null = null
/**
 * iOS 13+ shows its "Allow motion access" prompt only when this is called
 * synchronously inside the tap handler (WebKit forgets the gesture after an
 * await), so callers must reach this without awaiting anything first.
 * Elsewhere permission is implicit.
 */
export function requestMotionPermission(): Promise<'granted' | 'denied'> {
  if (!hasPermissionApi()) return Promise.resolve('granted')
  if (_permission) return _permission
  const p = (window as any).DeviceOrientationEvent.requestPermission()
    .then((r: string) => (r === 'granted' ? 'granted' : 'denied'))
    .catch(() => 'denied')
  // Only remember a grant; a dismissed prompt may be retried on the next tap.
  _permission = p.then((r: 'granted' | 'denied') => { if (r !== 'granted') _permission = null; return r })
  return _permission!
}

/** Best guess, without prompting, whether this device can steer by motion. */
export function motionLikelySupported(): boolean {
  if (typeof window === 'undefined') return false
  if (!('DeviceOrientationEvent' in window)) return false
  if (hasPermissionApi()) return true // iOS / iPadOS
  return (navigator.maxTouchPoints ?? 0) > 0 && !!window.matchMedia?.('(pointer: coarse)').matches
}

type Reading = { alpha: number; beta: number; gamma: number; at: number }

export class VieworaGyroscopePlugin extends GyroscopePlugin {
  /** Why the last start() failed, for a helpful message in the UI. */
  lastError: MotionError | null = null

  private m = {
    enabled: false,
    fast: false,
    savedInertia: 0.8,
    listening: false,
    rel: null as Reading | null,
    abs: null as Reading | null,
    source: null as 'rel' | 'abs' | null,
    target: new Quaternion(),
    smooth: new Quaternion(),
    primed: false,
    yawOffset: 0,
    anchored: false,
    // glide from the pre-motion view into the phone's pose
    blendFrom: null as { yaw: number; pitch: number } | null,
    blendStart: 0,
    // screen rotation settle window
    screenDeg: 0,
    holdUntil: 0,
    // programmatic re-aim (walking into a room)
    align: null as { from: number; to: number; start: number; dur: number } | null,
    lastOut: { yaw: 0, pitch: 0, roll: 0 },
    supported: null as Promise<boolean> | null,
  }

  private onRel = (e: DeviceOrientationEvent) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return
    this.m.rel = { alpha: e.alpha, beta: e.beta, gamma: e.gamma, at: performance.now() }
  }
  private onAbs = (e: DeviceOrientationEvent) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return
    this.m.abs = { alpha: e.alpha, beta: e.beta, gamma: e.gamma, at: performance.now() }
  }
  private onScreen = () => {
    // The sensor axes and the reported screen angle don't switch on the same
    // frame; hold still briefly, then snap to the settled pose.
    this.m.holdUntil = performance.now() + 280
    this.m.primed = false
  }
  private onVisibility = () => {
    if (document.visibilityState === 'visible') this.m.primed = false
  }

  override isSupported(): Promise<boolean> {
    if (this.m.supported) return this.m.supported
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      this.m.supported = Promise.resolve(false)
    } else if (hasPermissionApi()) {
      this.m.supported = Promise.resolve(true)
    } else {
      // Desktop browsers fire one empty event; phones fire real readings.
      this.m.supported = new Promise<boolean>((resolve) => {
        let done = false
        const finish = (v: boolean) => {
          if (done) return
          done = true
          window.removeEventListener('deviceorientation', l)
          window.removeEventListener('deviceorientationabsolute' as any, l)
          resolve(v)
        }
        const l = (e: any) => { if (e && e.alpha != null && !Number.isNaN(e.alpha)) finish(true) }
        window.addEventListener('deviceorientation', l)
        window.addEventListener('deviceorientationabsolute' as any, l)
        setTimeout(() => finish(false), 2500)
      })
    }
    return this.m.supported
  }

  override isEnabled(): boolean {
    return this.m.enabled
  }

  /**
   * Turn motion control on. `fast` (VR) uses a shorter filter for the lowest
   * latency. Rejects with lastError set when it can't run.
   */
  override start(moveMode: 'smooth' | 'fast' = 'smooth'): Promise<void> {
    // Must be first and synchronous (iOS gesture rule).
    const permission = requestMotionPermission()
    this.lastError = null
    if (this.m.enabled) {
      this.m.fast = moveMode === 'fast'
      return Promise.resolve()
    }
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      this.lastError = 'insecure'
      return Promise.reject(new Error('insecure'))
    }
    return permission.then((res) => {
      if (res !== 'granted') {
        this.lastError = 'denied'
        throw new Error('denied')
      }
      this.listen(true)
      return this.waitForReading(2500)
    }).then((ok) => {
      if (!ok) {
        this.listen(false)
        this.lastError = 'unavailable'
        throw new Error('unavailable')
      }
      const v: any = this.viewer
      this.m.fast = moveMode === 'fast'
      this.m.savedInertia = v.config.moveInertia
      v.config.moveInertia = 0
      // Stops auto-rotate / running animations and the idle auto-rotate timer.
      try { (this.viewer as any).stopAll() } catch { /* noop */ }
      const pos = this.viewer.getPosition()
      this.m.blendFrom = { yaw: pos.yaw, pitch: pos.pitch }
      this.m.blendStart = 0
      this.m.anchored = false
      this.m.primed = false
      this.m.align = null
      this.m.enabled = true
      this.dispatchEvent(new (gyroEvents.GyroscopeUpdatedEvent as any)(true))
    })
  }

  override stop(): void {
    if (!this.m.enabled) return
    this.m.enabled = false
    this.listen(false)
    const v: any = this.viewer
    v.config.moveInertia = this.m.savedInertia
    try { v.dynamics.roll.goto(0, 30) } catch { /* noop */ }
    this.dispatchEvent(new (gyroEvents.GyroscopeUpdatedEvent as any)(false))
    try { (this.viewer as any).resetIdleTimer() } catch { /* noop */ }
  }

  override toggle(): void {
    if (this.m.enabled) this.stop()
    else this.start().catch(() => { /* lastError tells the UI why */ })
  }

  /** Smoothly re-aim so the view faces `yaw` (used when walking into a room). */
  alignYaw(yaw: number, durationMs = 550): void {
    if (!this.m.enabled || !this.m.anchored) return
    const d = angleDelta(this.m.lastOut.yaw, yaw)
    this.m.align = { from: this.m.yawOffset, to: this.m.yawOffset + d, start: performance.now(), dur: Math.max(1, durationMs) }
  }

  /** Make "where the phone points now" the centre of the current view again. */
  recenter(): void {
    this.m.anchored = false
  }

  /** @internal PSV event hub. Deliberately ignores StopAllEvent. */
  handleEvent(e: Event): void {
    if (e instanceof events.BeforeRenderEvent) this.frame((e as any).elapsed ?? 16)
    else if (e instanceof events.BeforeRotateEvent) this.beforeRotate(e as any)
    else if (e instanceof events.BeforeAnimateEvent) this.beforeAnimate(e as any)
  }

  override init(): void {
    super.init()
    this.viewer.addEventListener(events.BeforeAnimateEvent.type, this as any)
  }

  override destroy(): void {
    this.m.enabled = false
    this.listen(false)
    this.viewer.removeEventListener(events.BeforeAnimateEvent.type, this as any)
    super.destroy()
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private listen(on: boolean) {
    if (typeof window === 'undefined' || on === this.m.listening) return
    this.m.listening = on
    const fn = on ? 'addEventListener' : 'removeEventListener'
    window[fn]('deviceorientation', this.onRel as any)
    window[fn]('deviceorientationabsolute' as any, this.onAbs as any)
    window[fn]('orientationchange', this.onScreen)
    try { (screen as any).orientation?.[fn]('change', this.onScreen) } catch { /* noop */ }
    document[fn]('visibilitychange', this.onVisibility)
    if (!on) { this.m.rel = null; this.m.abs = null; this.m.source = null }
    this.m.screenDeg = screenAngle()
  }

  private waitForReading(ms: number): Promise<boolean> {
    const t0 = performance.now()
    return new Promise((resolve) => {
      const tick = () => {
        if (this.m.rel || this.m.abs) return resolve(true)
        if (performance.now() - t0 > ms) return resolve(false)
        setTimeout(tick, 40)
      }
      tick()
    })
  }

  /** Prefer the gyro-based relative stream (smooth, no compass jitter); fall
   *  back to the absolute one on phones whose browser only provides that. */
  private reading(now: number): Reading | null {
    const { rel, abs } = this.m
    const relFresh = rel && now - rel.at < 600
    const src: 'rel' | 'abs' | null = relFresh ? 'rel' : (abs ? 'abs' : (rel ? 'rel' : null))
    if (src && src !== this.m.source) {
      if (this.m.source) { this.m.anchored = false; this.m.primed = false }
      this.m.source = src
    }
    return src === 'rel' ? rel : src === 'abs' ? abs : null
  }

  private frame(elapsedMs: number) {
    if (!this.m.enabled) return
    const v: any = this.viewer
    // Idle auto-rotate must never start while the phone steers.
    if (v.state.idleTime > 0) v.disableIdleTimer?.()
    const now = performance.now()
    if (now < this.m.holdUntil) return
    const r = this.reading(now)
    if (!r) return

    this.m.screenDeg = screenAngle()
    deviceQuaternion(this.m.target, r.alpha, r.beta, r.gamma, this.m.screenDeg)

    if (!this.m.primed) {
      this.m.smooth.copy(this.m.target)
      this.m.primed = true
    } else {
      const dt = Math.min(0.1, Math.max(0.001, elapsedMs / 1000))
      const dot = Math.min(1, Math.abs(this.m.smooth.dot(this.m.target)))
      const deg = 2 * Math.acos(dot) / DEG
      // Still → long time constant (kills tremor/noise); turning → short (no lag).
      const moving = smoothstep(0.12, 2.5, deg)
      const tau = this.m.fast
        ? 0.045 + (0.008 - 0.045) * moving
        : 0.09 + (0.016 - 0.09) * moving
      this.m.smooth.slerp(this.m.target, 1 - Math.exp(-dt / tau))
    }

    // Orientation → PSV yaw / pitch / roll (same conventions as PSV's plugin).
    _dir.set(0, 0, 1).applyQuaternion(this.m.smooth)
    const sph = v.dataHelper.vector3ToSphericalCoords(_dir)
    _euler.setFromQuaternion(this.m.smooth, 'YXZ')
    const devYaw = sph.yaw
    let pitch = -sph.pitch
    const roll = this.config.roll ? -_euler.z : 0

    if (!this.m.anchored) {
      // Keep looking where the buyer was looking: only the heading is relative.
      const ref = this.m.blendFrom ? this.m.blendFrom.yaw : this.m.lastOut.yaw
      this.m.yawOffset = angleDelta(devYaw, ref)
      this.m.anchored = true
    }
    if (this.m.align) {
      const p = Math.min(1, (now - this.m.align.start) / this.m.align.dur)
      this.m.yawOffset = this.m.align.from + (this.m.align.to - this.m.align.from) * easeInOut(p)
      if (p >= 1) this.m.align = null
    }
    let yaw = wrapYaw(devYaw + this.m.yawOffset)

    // Short glide from the previous view into the phone's tilt on start.
    if (this.m.blendFrom) {
      if (!this.m.blendStart) this.m.blendStart = now
      const p = Math.min(1, (now - this.m.blendStart) / 420)
      const k = easeInOut(p)
      yaw = wrapYaw(this.m.blendFrom.yaw + angleDelta(this.m.blendFrom.yaw, yaw) * k)
      pitch = this.m.blendFrom.pitch + (pitch - this.m.blendFrom.pitch) * k
      if (p >= 1) this.m.blendFrom = null
    }

    this.m.lastOut = { yaw, pitch, roll }
    v.dynamics.position.setValue({ yaw, pitch })
    if (this.config.roll) v.dynamics.roll.setValue(roll)
  }

  /** Camera moves made by the tour (focus a hotspot, face into a room) would
   *  fight the sensor; with motion on they turn the heading instead, and the
   *  tilt stays with the phone. Zoom still animates. */
  private beforeAnimate(e: any) {
    if (!this.m.enabled) return
    // In VR the field of view is fixed: drop zoom-only moves too.
    if (!e.position) { if (this.m.fast) e.preventDefault(); return }
    e.preventDefault()
    this.alignYaw(e.position.yaw, 650)
    if (e.zoomLevel != null && !this.m.fast) {
      try { this.viewer.animate({ zoom: e.zoomLevel, speed: 650 } as any) } catch { /* noop */ }
    }
  }

  /** Drags / arrow keys while motion is on re-aim the heading instead of fighting the sensor. */
  private beforeRotate(e: any) {
    if (!this.m.enabled) return
    e.preventDefault()
    if (!this.config.touchmove || !this.m.anchored) return
    const d = angleDelta(this.viewer.getPosition().yaw, e.position.yaw)
    this.m.yawOffset += d
    if (this.m.align) { this.m.align.from += d; this.m.align.to += d }
  }
}

/**
 * VR (split-screen, for phone headsets). Differences from PSV's StereoPlugin:
 *  - stays on through room changes and animations (stopAll used to exit it);
 *  - a tap first goes to `onTap` (e.g. "walk through the door I'm looking
 *    at"); only when that doesn't use it does the tap exit VR;
 *  - fullscreens `fullscreenTarget` (our whole viewer, so our VR overlay is
 *    visible) instead of the bare PSV canvas;
 *  - holds a headset-friendly field of view and restores the zoom after.
 */
export class VieworaStereoPlugin extends StereoPlugin {
  onTap: (() => boolean) | null = null
  fullscreenTarget: HTMLElement | null = null
  private savedZoom: number | null = null

  override init(): void {
    super.init()
    this.viewer.addEventListener(events.BeforeRenderEvent.type, this as any)
  }

  override destroy(): void {
    this.viewer.removeEventListener(events.BeforeRenderEvent.type, this as any)
    super.destroy()
  }

  override start(): Promise<void> {
    // Permission first, synchronously inside the tap (iOS).
    void requestMotionPermission()
    if (this.isEnabled()) return Promise.resolve()
    try { this.savedZoom = this.viewer.getZoomLevel() } catch { this.savedZoom = null }
    const v: any = this.viewer
    const origEnter = v.enterFullscreen
    const origExit = v.exitFullscreen
    v.enterFullscreen = () => this.enterFs()
    v.exitFullscreen = () => this.exitFs()
    let p: Promise<void>
    try {
      p = super.start()
    } finally {
      v.enterFullscreen = origEnter
    }
    return p.finally(() => { v.exitFullscreen = origExit })
  }

  override stop(): void {
    const was = this.isEnabled()
    const v: any = this.viewer
    const origExit = v.exitFullscreen
    v.exitFullscreen = () => this.exitFs()
    try { super.stop() } finally { v.exitFullscreen = origExit }
    if (was && this.savedZoom != null) {
      try { this.viewer.zoom(this.savedZoom) } catch { /* noop */ }
      this.savedZoom = null
    }
  }

  override toggle(): void {
    if (this.isEnabled()) this.stop()
    else this.start().catch(() => { /* gyroscope.lastError tells the UI why */ })
  }

  /** @internal */
  handleEvent(e: Event): void {
    if (e instanceof events.BeforeRenderEvent) {
      // ~90° vertical per eye suits phone headsets; room changes and pinches
      // would otherwise change it.
      if (this.isEnabled()) {
        const d: any = (this.viewer as any).dynamics
        if (d.zoom.current !== 0) d.zoom.setValue(0)
      }
    } else if (e instanceof events.ClickEvent) {
      if (this.isEnabled() && this.onTap?.()) return
      this.stop()
    }
    // StopAllEvent intentionally ignored.
  }

  private enterFs() {
    const el: any = this.fullscreenTarget || this.viewer.container
    try {
      if (document.fullscreenElement) return
      const r = el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.()
      r?.catch?.(() => { /* iPhone: no element fullscreen — CSS covers the screen instead */ })
    } catch { /* noop */ }
  }

  private exitFs() {
    try {
      const d: any = document
      if (d.fullscreenElement) d.exitFullscreen?.()?.catch?.(() => {})
      else if (d.webkitFullscreenElement) d.webkitExitFullscreen?.()
    } catch { /* noop */ }
  }
}
