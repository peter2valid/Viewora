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

    if (user.value) {
      authStore.setUser(user.value)
      planStore.fetchSubscriptionStatus().catch(() => {})
      authStore.fetchProfile().catch(() => {})
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
