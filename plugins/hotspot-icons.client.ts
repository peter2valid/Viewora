import { HOTSPOT_ICON_DEFS } from '~/shared/utils/hotspotIcons'

// Warms the icon picker's images for the editor. Previously ran on every page,
// including public tours, where ~250 KB of icons competed with the 360's own
// first images on mobile data — the viewer loads the few icons it uses itself.
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const warm = () => {
    HOTSPOT_ICON_DEFS.forEach(({ url }) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
    })
  }
  let done = false
  const maybeWarm = (path: string) => {
    if (done || !path.startsWith('/app')) return
    done = true
    const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1500))
    idle(warm)
  }
  maybeWarm(router.currentRoute.value.path)
  router.afterEach(to => maybeWarm(to.path))
})
