import posthog from 'posthog-js'
import { errorLogger } from '~/utils/errorLogger'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const key = config.public.posthogKey as string

  if (key) {
    posthog.init(key, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: true,
      },
      loaded: (ph) => {
        if (import.meta.env.DEV) ph.opt_out_capturing()
      },
    })

    // Connect errorLogger to PostHog
    errorLogger.setPosthogInstance(posthog)
  }

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
