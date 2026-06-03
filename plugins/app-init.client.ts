import { useAuthStore } from '~/stores/auth'
import { usePlanStore } from '~/stores/plan'
import { useDeviceTier } from '~/composables/useDeviceTier'

export default defineNuxtPlugin({
  name: 'app-init',
  enforce: 'post',
  setup() {
    // Detect device performance tier and apply class to <html> immediately.
    // CSS in main.css uses .device-tier-low / .device-tier-mid / .device-tier-high
    // to apply the right level of visual effects for the user's hardware.
    useDeviceTier()
    const user = useSupabaseUser()
    const authStore = useAuthStore()
    const planStore = usePlanStore()
    const { $posthog } = useNuxtApp()

    const route = useRoute()
    const isPublicTour = route.path.startsWith('/p/')

    function identifyUser(u: any) {
      if (!$posthog || !u) return
      $posthog.identify(u.sub, {
        email: u.email,
        name: u.user_metadata?.full_name || u.user_metadata?.name || null,
      })
    }

    if (user.value && !isPublicTour) {
      authStore.setUser(user.value)
      identifyUser(user.value)
      planStore.fetchSubscriptionStatus().catch(() => {})
      authStore.fetchProfile().catch(() => {})
    } else if (user.value) {
      // Still set the user state so we know they are logged in,
      // but don't fetch heavy metadata on the tour viewer.
      authStore.setUser(user.value)
      identifyUser(user.value)
    }

    // Re-sync on auth state changes
    watch(user, async (newUser) => {
      if (newUser) {
        authStore.setUser(newUser)
        identifyUser(newUser)
        await planStore.fetchSubscriptionStatus()
        authStore.fetchProfile().catch(() => {})
      } else {
        // Reset PostHog so next anonymous session is not linked to this user
        if ($posthog) $posthog.reset()
        authStore.$reset()
        planStore.$reset()
      }
    })
  },
})
