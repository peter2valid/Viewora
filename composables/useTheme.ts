import { ref, watch } from 'vue'

const isDark = ref(false)

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
    isDark.value = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(isDark.value)
  }

  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem('viewora-theme', isDark.value ? 'dark' : 'light')
    applyTheme(isDark.value)
  }

  return { isDark, toggle, init }
}
