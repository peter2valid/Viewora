import posthog from 'posthog-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const key = config.public.posthogKey as string

  if (key) {
    posthog.init(key, {
      api_host: 'https://app.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      loaded: (ph) => {
        if (import.meta.env.DEV) ph.opt_out_capturing()
      },
    })
  }

  return {
    provide: {
      posthog,
    },
  }
})
