<template>
  <div class="qp">
    <section class="qp__state" :class="{ 'qp__state--error': status === 'failed' || status === 'mismatch' }" :role="status === 'checking' ? 'status' : 'alert'" aria-live="polite">
      <h1 class="q-h2">{{ t('paid.title') }}</h1>
      <p v-if="status === 'missing'" class="q-body">{{ t('paid.missing') }}</p>
      <p v-else-if="status === 'checking'" class="qp__checking"><span class="qp__spinner" aria-hidden="true" />{{ t('pay.checking') }}</p>
      <p v-else-if="status === 'paid'" class="q-body">{{ kind === 'balance' ? t('paid.paidBalance') : t('paid.paid') }}</p>
      <template v-else>
        <p class="qp__title">{{ t(`pay.${status}Title`) }}</p>
        <p class="q-body">{{ t(`pay.${status}`) }}</p>
      </template>
      <div v-if="status !== 'checking'" class="qp__row">
        <QuoteButton v-if="status === 'pending'" variant="secondary" icon="refresh" @click="check">{{ t('actions.retry') }}</QuoteButton>
        <QuoteButton :variant="status === 'paid' ? 'secondary' : 'primary'" icon="brand-whatsapp" :href="`https://wa.me/${runtime.quoteWhatsapp}`">{{ t('actions.chatWhatsapp') }}</QuoteButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Where Paystack sends the client after paying a balance link from staff.
// The reference in the address is checked with the backend, which asks
// Paystack; nothing on this page is trusted on its own.
definePageMeta({ layout: 'quote' })
useSeoMeta({ title: 'Payment | Viewora Capture', robots: 'noindex, nofollow' })

const runtime = useRuntimeConfig().public
if (!runtime.quoteEngine) throw createError({ statusCode: 404, statusMessage: 'Not found' })

const { t } = useQuoteStrings()
const route = useRoute()
const reference = String(route.query.reference ?? route.query.trxref ?? '')
const valid = /^qp_[A-Za-z0-9_-]{24}$/.test(reference)
const status = ref<'missing' | 'checking' | 'paid' | 'pending' | 'failed' | 'mismatch'>(valid ? 'checking' : 'missing')
const kind = ref<string | undefined>()

async function check() {
  status.value = 'checking'
  for (let i = 0; i < 6; i++) {
    try {
      const r = await $fetch<{ status: string; kind?: string }>('/api/quote/payments/verify', { method: 'POST', body: { reference } })
      kind.value = r.kind
      if (r.status === 'paid' || r.status === 'failed' || r.status === 'mismatch') { status.value = r.status; return }
    } catch { /* still waiting */ }
    await new Promise(r => setTimeout(r, 2500))
  }
  status.value = 'pending'
}

onMounted(() => { if (valid) check() })
</script>

<style scoped>
.qp { max-width: 560px; margin: 0 auto; }
.qp__state { display: grid; gap: 12px; padding: 18px; background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius); }
.qp__state--error { border-color: var(--q-bad); background: var(--q-bad-bg); }
.qp__title { font-weight: 600; }
.qp__row { display: flex; flex-wrap: wrap; gap: 10px; }
.qp__checking { display: flex; align-items: center; gap: 10px; }
.qp__spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--q-border-strong); border-top-color: var(--q-ink); animation: qp-spin 0.9s linear infinite; }
@keyframes qp-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .qp__spinner { animation-duration: 3s; } }
</style>
