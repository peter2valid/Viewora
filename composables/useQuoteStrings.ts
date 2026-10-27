// Strings for the quote engine. One JSON file per locale so Swahili can be
// added by dropping in quote.sw.json — no i18n dependency for one feature.
import en from '~/locales/quote.en.json'

const locales: Record<string, unknown> = { en }

function lookup(tree: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<any>((node, part) => node?.[part], tree)
  return typeof value === 'string' ? value : undefined
}

export function useQuoteStrings(locale = 'en') {
  const t = (key: string, params: Record<string, string | number> = {}) => {
    const template = lookup(locales[locale], key) ?? lookup(en, key) ?? key
    return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`))
  }
  return { t }
}

// Money arrives as integers: whole KES, or USD cents.
export function formatMoney(amount: number, currency: 'KES' | 'USD' = 'KES'): string {
  if (amount < 0) return `−${formatMoney(-amount, currency)}`   // discounts: −KES 7,020
  if (currency === 'USD') {
    return `USD ${(amount / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `KES ${amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
}
