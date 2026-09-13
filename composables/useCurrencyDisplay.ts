/**
 * composables/useCurrencyDisplay.ts
 *
 * Display-only KES → visitor-local-currency conversion for pricing UI.
 *
 * IMPORTANT: this never touches actual billing amounts. Paystack checkout is
 * always initialized with the raw KES price from the API
 * (price_monthly_kes / price_yearly_kes). This composable only produces a
 * secondary "≈ $19.30/month" label next to the KES price.
 *
 * Approach (per PRICING_CANONICAL_SPEC.md):
 *  1. Detect the visitor's likely currency from navigator.language / Intl.
 *     Kenya (or an unrecognized locale) shows KES only — formatPrice returns
 *     null and the caller just renders the KES price alone.
 *  2. Fetch a live KES-based FX rate table from open.er-api.com, cached in
 *     sessionStorage for the tab session.
 *  3. Fall back to a small static rate table if the fetch fails, is
 *     unavailable (SSR / no sessionStorage), or is blocked.
 *  4. Never throw, never block rendering — worst case formatPrice returns
 *     null and no secondary line is shown.
 */

const SESSION_STORAGE_KEY = 'viewora:fx-rates:kes'

// Fallback static KES-based rates — approximate, as of writing this composable.
// Update periodically; these only kick in if the live fetch fails.
const FALLBACK_RATES: Record<string, number> = {
  USD: 0.0077,
  EUR: 0.0071,
  GBP: 0.0061,
  NGN: 0.0117,
  ZAR: 0.14,
  INR: 0.65,
}

// Common locale → currency lookup. Doesn't need to be exhaustive — covers the
// common visitor locales this product is likely to see. `en-KE` (and any
// unmapped locale) intentionally falls through to KES-only (no conversion).
const LOCALE_CURRENCY_MAP: Record<string, string> = {
  'en-US': 'USD',
  'en-CA': 'USD',
  'en-GB': 'GBP',
  'en-IE': 'EUR',
  'en-AU': 'USD',
  'en-NZ': 'USD',
  'en-NG': 'NGN',
  'en-ZA': 'ZAR',
  'en-IN': 'INR',
  'de-DE': 'EUR',
  'de-AT': 'EUR',
  'fr-FR': 'EUR',
  'fr-BE': 'EUR',
  'es-ES': 'EUR',
  'it-IT': 'EUR',
  'nl-NL': 'EUR',
  'pt-PT': 'EUR',
  'pt-BR': 'EUR',
}

type RatesResponse = {
  result?: string
  rates?: Record<string, number>
}

type CachedRates = {
  fetchedAt: number
  rates: Record<string, number>
}

function detectCurrency(): string | null {
  try {
    const locale =
      (typeof navigator !== 'undefined' && (navigator.language || navigator.languages?.[0])) || ''
    if (!locale) return null

    // Visitor is already KES-local — no conversion needed, show KES only.
    if (/-KE$/i.test(locale) || locale.toLowerCase() === 'sw-ke' || locale.toLowerCase() === 'sw') {
      return null
    }

    if (LOCALE_CURRENCY_MAP[locale]) return LOCALE_CURRENCY_MAP[locale]

    // Try the Intl currency resolution as a secondary signal (not all browsers
    // populate this meaningfully for a locale without a region).
    try {
      const resolved = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).resolvedOptions()
      const region = (resolved as any).locale?.split('-')?.[1]
      if (region && LOCALE_CURRENCY_MAP[`en-${region}`]) return LOCALE_CURRENCY_MAP[`en-${region}`]
    } catch {
      // ignore — fall through
    }

    return null
  } catch {
    return null
  }
}

function readSessionCache(): CachedRates | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedRates
    if (!parsed?.rates || typeof parsed.fetchedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function writeSessionCache(rates: Record<string, number>) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    const payload: CachedRates = { fetchedAt: Date.now(), rates }
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // sessionStorage unavailable (private mode, SSR, etc.) — safe to ignore
  }
}

async function fetchLiveRates(): Promise<Record<string, number> | null> {
  try {
    const cached = readSessionCache()
    if (cached) return cached.rates

    if (typeof fetch === 'undefined') return null

    const res = await fetch('https://open.er-api.com/v6/latest/KES')
    if (!res.ok) return null
    const data = (await res.json()) as RatesResponse
    if (data?.result !== 'success' || !data.rates) return null

    writeSessionCache(data.rates)
    return data.rates
  } catch {
    return null
  }
}

export function useCurrencyDisplay() {
  const currency = detectCurrency()

  /**
   * Format a KES amount as an approximate secondary currency string, e.g.
   * "≈ $19.30/month". Returns null when the visitor is already KES-local or
   * conversion isn't available (never throws, never blocks rendering).
   */
  async function formatPrice(kesAmount: number, options?: { suffix?: string }): Promise<string | null> {
    if (!currency) return null
    if (typeof kesAmount !== 'number' || Number.isNaN(kesAmount) || kesAmount <= 0) return null

    try {
      const liveRates = await fetchLiveRates()
      const rates = liveRates || FALLBACK_RATES
      const rate = rates[currency]
      if (!rate) return null

      const converted = kesAmount * rate
      const locale = (typeof navigator !== 'undefined' && navigator.language) || 'en-US'
      const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: converted < 100 ? 2 : 0,
      }).format(converted)

      return `≈ ${formatted}${options?.suffix || ''}`
    } catch {
      return null
    }
  }

  return {
    /** Detected visitor currency (e.g. "USD"), or null when KES-local / undetected. */
    currency,
    formatPrice,
  }
}
