import { errorLogger } from '~/utils/errorLogger'

// PostHog loads in the background. This plugin used to `await import('posthog-js')`,
// and Nuxt waits for async plugins before it starts the app, so every page (embeds
// included) sat idle until PostHog had downloaded and run. Now the app gets a
// stand-in straight away that queues capture()/identify()/reset() calls, and the
// real library replays them, in order, once it has loaded. Nothing is lost
// (including the first $pageview); it just no longer holds up the tour.
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const key = config.public.posthogKey as string
  if (!key) return

  const route = useRoute()
  // /p/** and /embed/** are high-traffic, anonymous public tour views — session
  // recording there is pure cost (billed per-recording) with no product value,
  // and continuous DOM/mouse capture competes with the panorama render loop.
  // Pageviews still fire below so view counts are unaffected.
  const isPublicViewer = route.path.startsWith('/p/') || route.path.startsWith('/embed/')

  let real: any = null
  const queue: Array<[string, unknown[]]> = []
  const posthog: any = new Proxy({}, {
    get(_t, prop) {
      if (typeof prop !== 'string' || prop === 'then') return undefined
      if (real) {
        const v = real[prop]
        return typeof v === 'function' ? v.bind(real) : v
      }
      return (...args: unknown[]) => { queue.push([prop, args]) }
    },
  })

  async function load() {
    const { default: ph } = await import('posthog-js')

    ph.init(key, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: isPublicViewer,
      // Buyers' phones: don't download extra PostHog bundles (~125 KB) while
      // the tour is loading. Pageviews/events are unaffected.
      disable_surveys: isPublicViewer,
      capture_dead_clicks: !isPublicViewer,
      session_recording: {
        maskAllInputs: true,
      },
      loaded: (inst) => {
        if (import.meta.env.DEV) inst.opt_out_capturing()
      },
    })

    real = ph
    for (const [method, args] of queue.splice(0)) {
      try { (ph as any)[method]?.(...args) } catch { /* a bad queued call must not drop the rest */ }
    }
  }

  // Connect errorLogger to PostHog (the stand-in queues until the real one is ready)
  errorLogger.setPosthogInstance(posthog)

  // Fire a $pageview event on every client-side route change
  const router = useRouter()
  router.afterEach(() => {
    if (typeof window !== 'undefined') {
      posthog.capture('$pageview', { $current_url: window.location.href })
    }
  })

  // Public tours: wait until the page has loaded and the browser is idle, so
  // PostHog never competes with the panorama's own first requests.
  if (isPublicViewer && typeof window !== 'undefined') {
    const idle = (cb: () => void) =>
      'requestIdleCallback' in window ? (window as any).requestIdleCallback(cb, { timeout: 3000 }) : setTimeout(cb, 2000)
    const go = () => idle(() => { void load() })
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
  } else {
    void load()
  }

  return {
    provide: {
      posthog,
    },
  }
})
