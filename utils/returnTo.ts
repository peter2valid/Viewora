// Where to go after signing in, when a page sent the visitor to /login.
// Only paths on this allowlist are accepted, so a crafted ?next= can never
// send someone off-site or anywhere unexpected. Kept in localStorage for an
// hour so it survives the Google round trip and an email confirmation.
const ALLOWED = [/^\/deliver\/[A-Za-z0-9_-]{43}$/]
const KEY = 'vo-return-to'
const MAX_AGE_MS = 60 * 60 * 1000

export function safeReturnPath(raw: unknown): string | null {
  return typeof raw === 'string' && ALLOWED.some(re => re.test(raw)) ? raw : null
}

export function rememberReturnTo(raw: unknown) {
  const path = safeReturnPath(raw)
  if (!path) return
  try { localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() })) } catch { /* private mode: the default page is used */ }
}

// Read once, then forgotten
export function takeReturnTo(): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    localStorage.removeItem(KEY)
    return saved && Date.now() - saved.at < MAX_AGE_MS ? safeReturnPath(saved.path) : null
  } catch {
    return null
  }
}
