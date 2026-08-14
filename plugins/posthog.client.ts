import { errorLogger } from '~/utils/errorLogger'

// Dynamic import — keeps posthog-js out of the eager entry bundle, especially
// on the panorama viewer routes where every KB competes with PSV/Three.js for
// the critical path.
export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const key = config.public.posthogKey as string
  if (!key) return

  const route = useRoute()
  // /p/** and /embed/** are high-traffic, anonymous public tour views — session
  // recording there is pure cost (billed per-recording) with no product value,
  // and continuous DOM/mouse capture competes with the panorama render loop.
  // Pageviews still fire below so view counts are unaffected.
  const isPublicViewer = route.path.startsWith('/p/') || route.path.startsWith('/embed/')

  const { default: posthog } = await import('posthog-js')

  posthog.init(key, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    disable_session_recording: isPublicViewer,
    session_recording: {
      maskAllInputs: true,
    },
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing()
    },
  })

  // Connect errorLogger to PostHog
  errorLogger.setPosthogInstance(posthog)

  // Fire a $pageview event on every client-side route change
  const router = useRouter()
  router.afterEach(() => {
    if (typeof window !== 'undefined') {
      posthog.capture('$pageview', { $current_url: window.location.href })
    }
  })

  return {
    provide: {
      posthog,
    },
  }
})
