<template>
  <div class="qd">
    <div v-if="state === 'loading'" class="qd__card" aria-busy="true">
      <span class="qd__skeleton" /><span class="qd__skeleton qd__skeleton--short" />
      <p class="q-small">{{ t('deliver.checking') }}</p>
    </div>

    <!-- Not signed in, or a guest session from WhatsApp -->
    <section v-else-if="state === 'signin'" class="qd__card" aria-labelledby="qd-title">
      <h1 id="qd-title" class="q-h1">{{ t('deliver.signInTitle') }}</h1>
      <p class="q-body">{{ t('deliver.signInBody') }}</p>
      <QuoteButton class="qd__solo" icon="user" :href="`/login?next=${encodeURIComponent(`/deliver/${token}`)}`">{{ t('deliver.signIn') }}</QuoteButton>
      <p class="q-small">{{ t('deliver.signInThen') }}</p>
    </section>

    <!-- Waiting for them to accept -->
    <section v-else-if="state === 'pending' && view" class="qd__card" aria-labelledby="qd-title">
      <img v-if="view.tour?.coverUrl" :src="view.tour.coverUrl" alt="" class="qd__cover" width="560" height="315" loading="lazy">
      <h1 id="qd-title" class="q-h1">{{ t('deliver.title', { title: tourTitle }) }}</h1>
      <p class="q-body">{{ t('deliver.body') }}</p>
      <p class="q-small">{{ t('deliver.once', { date: longDate(view.expiresAt) }) }}</p>
      <p v-if="actionError" class="qd__error" role="alert">{{ actionError }}</p>
      <QuoteButton class="qd__solo" icon="check" :loading="accepting" @click="accept">{{ t('deliver.accept') }}</QuoteButton>
    </section>

    <!-- Done -->
    <section v-else-if="state === 'accepted'" class="qd__card qd__card--good" aria-labelledby="qd-title" role="status">
      <h1 id="qd-title" class="q-h1">{{ t('deliver.doneTitle') }}</h1>
      <p class="q-body">{{ t('deliver.done', { title: tourTitle }) }}</p>
      <QuoteButton class="qd__solo" icon="arrow-right" href="/app/spaces">{{ t('deliver.open') }}</QuoteButton>
    </section>

    <!-- Expired, used, another account, or the server could not be reached -->
    <section v-else class="qd__card qd__card--bad" role="alert">
      <h1 class="q-h2">{{ t('deliver.problemTitle') }}</h1>
      <p class="q-body">{{ problem }}</p>
      <div class="qd__row">
        <QuoteButton v-if="retryable" variant="secondary" icon="refresh" @click="load">{{ t('actions.retry') }}</QuoteButton>
        <QuoteButton :variant="retryable ? 'quiet' : 'primary'" icon="brand-whatsapp" :href="wa">{{ t('actions.chatWhatsapp') }}</QuoteButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// A finished tour handed over by the studio: /deliver/<token>. The token
// is the only key (the backend stores its hash). Opening the page changes
// nothing; the tour moves into the account only when they tap "Add".
definePageMeta({ layout: 'quote' })
useSeoMeta({ title: 'Your tour | Viewora', robots: 'noindex, nofollow' })

const runtime = useRuntimeConfig().public
if (!runtime.quoteEngine) throw createError({ statusCode: 404, statusMessage: 'Not found' })

interface DeliveryView { status: 'pending' | 'accepted'; expiresAt: string; tour: { id: string; title: string | null; coverUrl: string | null } | null }

const { t } = useQuoteStrings()
const { apiFetch } = useApiFetch()
const session = useSupabaseSession()
const user = useSupabaseUser()
const token = String(useRoute().params.token ?? '')

const state = ref<'loading' | 'signin' | 'pending' | 'accepted' | 'problem'>('loading')
const view = ref<DeliveryView | null>(null)
const problem = ref('')
const retryable = ref(false)
const accepting = ref(false)
const actionError = ref('')

const tourTitle = computed(() => view.value?.tour?.title || t('deliver.yourTour'))
const wa = computed(() => `https://wa.me/${runtime.quoteWhatsapp}?text=${encodeURIComponent(t('deliver.askNew'))}`)
const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' })

// The server's own words for an expired link or the wrong account; our words when it was not reached
function show(e: any) {
  const status = e?.statusCode ?? e?.response?.status
  if (status === 401 || (status === 403 && e?.data?.code === 'SIGN_IN')) { state.value = 'signin'; return }
  retryable.value = !status || status >= 500
  problem.value = retryable.value ? t('deliver.loadFailed') : (e?.data?.statusMessage ?? t('deliver.gone'))
  state.value = 'problem'
}

async function load() {
  state.value = 'loading'
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { problem.value = t('deliver.gone'); retryable.value = false; state.value = 'problem'; return }
  if (!session.value?.access_token || user.value?.is_anonymous) { state.value = 'signin'; return }
  try {
    view.value = await apiFetch<DeliveryView>(`/quote/account/deliveries/${token}`)
    state.value = view.value.status
  } catch (e) {
    show(e)
  }
}

async function accept() {
  accepting.value = true
  actionError.value = ''
  try {
    view.value = await apiFetch<DeliveryView>(`/quote/account/deliveries/${token}/accept`, { method: 'POST' })
    state.value = 'accepted'
  } catch (e: any) {
    // Still on the page: say what happened without losing the button
    const status = e?.statusCode ?? e?.response?.status
    if (status === 409 || !status || status >= 500) actionError.value = e?.data?.statusMessage ?? t('deliver.acceptFailed')
    else show(e)
  } finally {
    accepting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.qd { max-width: 560px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.qd__card { display: grid; gap: 12px; padding: 18px; background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius); }
.qd__card--good { border-color: var(--q-good); background: var(--q-good-bg); }
.qd__card--bad { border-color: var(--q-bad); background: var(--q-bad-bg); }
.qd__cover { width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--q-radius-sm); background: var(--q-sunken); }
.qd__solo { justify-self: start; }
.qd__row { display: flex; flex-wrap: wrap; gap: 10px; }
.qd__error { color: var(--q-bad); font-size: var(--q-text-sm); }
.qd__skeleton { display: block; height: 14px; border-radius: 4px; background: var(--q-sunken); }
.qd__skeleton--short { width: 60%; }
@media (max-width: 599px) { .qd__solo { justify-self: stretch; } }
</style>
