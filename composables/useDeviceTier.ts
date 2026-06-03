/**
 * Detects the device performance tier and applies a CSS class to <html>.
 *
 * Tiers:
 *   device-tier-high  — flagship / recent mid-range (iPhone 12+, Galaxy S21+, Pixel 6+)
 *                       Can handle light backdrop-filter, smooth animations.
 *   device-tier-mid   — mid-range Android (Samsung A series, Xiaomi Note, Redmi 10+)
 *                       Reduce heavy blurs, keep light animations.
 *   device-tier-low   — budget Android (Redmi 9, Tecno, Infinix, 2GB RAM devices)
 *                       Zero backdrop-filter, zero CSS animations, bare minimum.
 *
 * Detection signals:
 *   navigator.deviceMemory  — RAM in GB (Chrome/Edge only, rounds to nearest power-of-2)
 *   navigator.hardwareConcurrency — logical CPU cores
 *   connection.effectiveType / downlink — network speed proxy for old devices
 *   screen resolution + devicePixelRatio — high-DPR on small screens = flagship
 */
export type DeviceTier = 'high' | 'mid' | 'low'

function detectTier(): DeviceTier {
  if (typeof window === 'undefined') return 'high'

  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { effectiveType?: string; downlink?: number; saveData?: boolean }
  }

  const ram    = nav.deviceMemory           ?? null   // GB or null
  const cores  = navigator.hardwareConcurrency ?? 0
  const conn   = nav.connection
  const slow   = conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g' || conn?.saveData
  const touch  = navigator.maxTouchPoints > 0

  // Not a touch device → always high (desktop/laptop)
  if (!touch) return 'high'

  // Network-constrained = treat as low-end regardless of hardware
  if (slow) return 'low'

  // RAM is the most reliable signal on Android Chrome
  if (ram !== null) {
    if (ram >= 6 && cores >= 6)  return 'high'   // flagship: 6GB+ RAM, 6+ cores
    if (ram >= 3 && cores >= 4)  return 'mid'    // mid-range: 3-4GB, 4+ cores
    if (ram <= 2 || cores <= 2)  return 'low'    // budget: ≤2GB or ≤2 cores
  }

  // Fallback: screen resolution + DPR as proxy
  // High-end phones have high DPR on physically small screens
  const dpr    = window.devicePixelRatio || 1
  const width  = window.screen.width
  const height = window.screen.height
  const physW  = width / dpr
  const physH  = height / dpr

  // High-res display on a small physical screen = flagship
  if (dpr >= 3 && physW >= 360 && cores >= 6)  return 'high'
  if (dpr >= 2 && physW >= 360 && cores >= 4)  return 'mid'
  if (cores <= 2)                               return 'low'

  return 'mid'
}

export function useDeviceTier() {
  if (typeof window === 'undefined') return

  const tier = detectTier()

  // Remove any existing tier class
  document.documentElement.classList.remove('device-tier-high', 'device-tier-mid', 'device-tier-low')
  document.documentElement.classList.add(`device-tier-${tier}`)

  // Also expose as CSS custom property for programmatic use
  document.documentElement.style.setProperty('--device-tier', tier)

  return tier
}
