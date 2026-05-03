import { useAuthStore } from '~/stores/auth'
import { usePlanStore } from '~/stores/plan'

export default defineNuxtPlugin({
  name: 'app-init',
  enforce: 'post',
  setup() {
    const user = useSupabaseUser()

    // Exit early for unauthenticated visitors (marketing pages, etc.)
    const authStore = useAuthStore()
    const planStore = usePlanStore()

    const route = useRoute()
    const isPublicTour = route.path.startsWith('/p/')

    if (user.value && !isPublicTour) {
      authStore.setUser(user.value)
      planStore.fetchSubscriptionStatus().catch(() => {})
      authStore.fetchProfile().catch(() => {})
    } else if (user.value) {
      // Still set the user state so we know they are logged in, 
      // but don't fetch heavy metadata on the tour viewer.
      authStore.setUser(user.value)
    }

    // Re-sync on auth state changes
    watch(user, async (newUser) => {
      if (newUser) {
        authStore.setUser(newUser)
        await planStore.fetchSubscriptionStatus()
        authStore.fetchProfile().catch(() => {})
      } else {
        authStore.$reset()
        planStore.$reset()
      }
    })
  },
})
