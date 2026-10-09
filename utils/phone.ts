/**
 * Normalises a seller-entered phone number to bare international digits, as
 * wa.me and tel:+ links need (e.g. "0712 345 678" → "254712345678").
 *
 * Kenyan local mobile numbers (07xx / 01xx, 10 digits) get the 254 country
 * code — they were previously passed through as-is, producing wa.me/0712…
 * links WhatsApp can't open. Other inputs keep their digits unchanged.
 */
export function toIntlPhoneDigits(raw: string | null | undefined): string {
  let digits = (raw || '').trim()
  if (digits.startsWith('00')) digits = digits.slice(2)
  digits = digits.replace(/[^0-9]/g, '')
  if (/^0[17]\d{8}$/.test(digits)) digits = '254' + digits.slice(1)
  return digits
}
