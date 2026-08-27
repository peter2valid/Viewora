<template>
  <Transition name="claim-banner">
    <div v-if="visible" class="claim-banner" role="status">
      <div class="claim-banner__text">
        <strong>This tour isn't saved to an account yet.</strong>
        <span>Sign in to keep it and edit it anytime.</span>
      </div>
      <div class="claim-banner__actions">
        <button class="claim-banner__btn claim-banner__btn--primary" :disabled="claiming" @click="handleClaim">
          {{ claiming ? 'Opening Google…' : 'Save with Google' }}
        </button>
        <button class="claim-banner__dismiss" aria-label="Dismiss" @click="dismissed = true">✕</button>
      </div>
      <p v-if="errorMsg" class="claim-banner__error">{{ errorMsg }}</p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnonymousAuth } from '~/composables/useAnonymousAuth'

const { isAnonymous, claimWithGoogle, readAuthErrorFromHash } = useAnonymousAuth()

const dismissed = ref(false)
const claiming = ref(false)
const errorMsg = ref<string | null>(null)

// claimWithGoogle() redirects to Google and back — a failure Supabase only
// detects after that round-trip (e.g. this Google account is already
// linked to a different account) arrives as an error in the URL hash on
// this remount, not as something the try/catch in handleClaim() below
// could ever see.
onMounted(() => {
  const hashError = readAuthErrorFromHash()
  if (hashError) errorMsg.value = hashError
})

const visible = computed(() => isAnonymous.value && !dismissed.value)

const handleClaim = async () => {
  claiming.value = true
  errorMsg.value = null
  try {
    await claimWithGoogle(typeof window !== 'undefined' ? window.location.href : undefined)
  } catch (e: any) {
    errorMsg.value = e.message ?? 'Could not start sign-in. Try again.'
    claiming.value = false
  }
}
</script>

<style scoped>
.claim-banner {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 10px;
  gap: 16px;
  max-width: calc(100vw - 32px);
  padding: 14px 18px;
  border-radius: 16px;
  background: rgba(18, 18, 20, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(14px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  color: #fff;
  font-family: 'Inter', -apple-system, sans-serif;
}
/* No min-width here previously meant this column had nothing stopping it
   shrinking arbitrarily narrow once claim-banner__actions (flex-shrink: 0,
   ~180px with the Google button + dismiss X) claimed its share of the
   16px-gapped row inside the banner's max-width cap — on a phone that
   squeezed the text into a one-or-two-word-per-line column. Giving it a
   real minimum, combined with flex-wrap above, means the actions block
   drops to its own row below instead once there isn't enough width left. */
.claim-banner__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  flex: 1 1 180px;
  min-width: 180px;
}
.claim-banner__text strong { font-weight: 700; }
.claim-banner__text span { color: rgba(255, 255, 255, 0.6); }
.claim-banner__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.claim-banner__btn {
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.claim-banner__btn--primary {
  background: #fff;
  color: #0a0a0a;
}
.claim-banner__btn:disabled { opacity: 0.6; cursor: default; }
.claim-banner__dismiss {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
}
.claim-banner__error {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 6px;
  font-size: 12px;
  color: #ff8080;
}

.claim-banner-enter-active, .claim-banner-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.claim-banner-enter-from, .claim-banner-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .claim-banner-enter-active, .claim-banner-leave-active { transition: none; }
}
</style>
