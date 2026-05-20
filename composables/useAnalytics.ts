// Central analytics wrapper for PostHog.
// Always use this composable in pages/components — never call $posthog directly.
//
// Usage:
//   const analytics = useAnalytics()
//   analytics.track('space_created', { space_type: 'residential' })

export function useAnalytics() {
  const { $posthog } = useNuxtApp()

  function track(event: string, properties?: Record<string, any>) {
    if (!$posthog) return
    $posthog.capture(event, properties)
  }

  return { track }
}
