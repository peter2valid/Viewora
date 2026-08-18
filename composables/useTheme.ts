import { ref, watch } from 'vue'

const isDark = ref(false)
let mediaListenerAttached = false

function applyTheme(dark: boolean) {
  if (typeof document === 'undefined') return
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useTheme() {
  function init() {
    if (typeof localStorage === 'undefined') return
    const stored = localStorage.getItem('viewora-theme')
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    isDark.value = stored ? stored === 'dark' : media.matches
    applyTheme(isDark.value)

    // Buyer-facing pages have no manual toggle and just follow the phone's
    // theme live. Only listens while there's no explicit stored preference,
    // so it never fights a page (e.g. the dashboard) that does let someone
    // toggle manually — that stored choice always wins once it exists.
    // Guarded to attach once — init() re-runs on every buyer-page mount in
    // this SPA, which would otherwise stack up duplicate listeners.
    if (!mediaListenerAttached) {
      mediaListenerAttached = true
      media.addEventListener('change', (e) => {
        if (localStorage.getItem('viewora-theme')) return
        isDark.value = e.matches
        applyTheme(isDark.value)
      })
    }
  }

  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem('viewora-theme', isDark.value ? 'dark' : 'light')
    applyTheme(isDark.value)
  }

  return { isDark, toggle, init }
}
