/**
 * Copy text to the clipboard. Works inside cross-origin iframes (where
 * navigator.clipboard throws unless the host page grants clipboard-write) and on
 * older iOS Safari, by falling back to a hidden textarea + execCommand('copy').
 * Must be called from a user gesture (a click handler).
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof document === 'undefined') return false
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Permissions policy or no gesture: fall through to the legacy path.
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.setAttribute('aria-hidden', 'true')
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;'
  document.body.appendChild(ta)
  try {
    ta.focus({ preventScroll: true })
    ta.select()
    ta.setSelectionRange(0, text.length) // iOS needs an explicit range
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(ta)
  }
}
