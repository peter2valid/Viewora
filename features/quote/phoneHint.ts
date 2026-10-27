// Instant, friendly phone feedback while the visitor types. Mirrors
// normalisePhone in viewora-backend/src/quote/engine/phone.ts (which has the
// tests); the server re-validates every number, so this is a hint only.

export type PhoneProblem = 'empty' | 'too_short' | 'too_long' | 'not_mobile' | 'invalid'

export function normalisePhoneHint(input: string): PhoneProblem | null {
  const raw = (input ?? '').trim()
  if (!raw) return 'empty'
  if (/[^\d\s+()\-.]/.test(raw)) return 'invalid'

  const hasPlus = raw.startsWith('+') || raw.startsWith('00')
  let digits = raw.replace(/\D/g, '')
  if (raw.startsWith('00')) digits = digits.slice(2)

  let national: string | null = null
  if (digits.startsWith('254')) national = digits.slice(3)
  else if (!hasPlus && digits.startsWith('0')) national = digits.slice(1)
  else if (!hasPlus && digits.length === 9) national = digits

  if (national !== null) {
    if (national.startsWith('0')) national = national.slice(1)
    if (national.length < 9) return 'too_short'
    if (national.length > 9) return 'too_long'
    return /^[17]/.test(national) ? null : 'not_mobile'
  }
  if (!hasPlus) return 'invalid'
  if (digits.length < 8) return 'too_short'
  if (digits.length > 15) return 'too_long'
  return null
}
