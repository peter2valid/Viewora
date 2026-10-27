<template>
  <div class="qv" :class="{ 'qv--wide': priced && quote!.options!.length > 1 }">
    <div v-if="pending" class="qv__state" aria-busy="true">
      <span class="qv__skeleton" /><span class="qv__skeleton qv__skeleton--short" />
    </div>

    <!-- Not found, or the backend could not be reached -->
    <section v-else-if="!quote" class="qv__state" :class="{ 'qv__state--error': !notFound }" role="alert">
      <h1 class="q-h2">{{ notFound ? t('view.notFoundTitle') : t('view.loadFailed') }}</h1>
      <p v-if="notFound" class="q-body">{{ t('view.notFound') }}</p>
      <div class="qv__row">
        <QuoteButton v-if="!notFound" variant="secondary" icon="refresh" @click="refresh()">{{ t('actions.retry') }}</QuoteButton>
        <QuoteButton :variant="notFound ? 'primary' : 'quiet'" icon="brand-whatsapp" :href="wa(t('view.again'))">{{ t('actions.chatWhatsapp') }}</QuoteButton>
      </div>
    </section>

    <!-- Replaced, closed or expired link: nothing priced is shown -->
    <section v-else-if="!priced" class="qv__state" role="status">
      <h1 class="q-h2">{{ t(`view.${quote.state}Title`) }}</h1>
      <p class="q-body">{{ unpricedMessage }}</p>
      <QuoteButton class="qv__solo" icon="brand-whatsapp" :href="wa(quote.state === 'replaced' ? t('view.askLatest') : t('view.again'))">
        {{ quote.state === 'replaced' ? t('actions.chatWhatsapp') : t('view.newQuote') }}
      </QuoteButton>
    </section>

    <!-- The quote -->
    <section v-else class="qv__quote" aria-labelledby="qv-title">
      <header class="qv__head">
        <h1 id="qv-title" class="q-h1">{{ quote.firstName ? t('view.title', { name: quote.firstName }) : t('view.titleNoName') }}</h1>
        <p class="q-small">
          {{ t('view.meta', { industry: quote.industry ?? '', ref: quote.ref ?? '' }) }}<template v-if="quote.sentAt"> · {{ t('view.sent', { date: longDate(quote.sentAt) }) }}</template>
        </p>
      </header>

      <div v-if="quote.state === 'expired'" class="qv__notice" role="status">
        <p class="qv__notice-title">{{ t('view.expiredTitle') }}</p>
        <p>{{ t('view.expired', { date: longDate(quote.validUntil!) }) }}</p>
      </div>
      <p v-else-if="quote.state === 'accepted'" class="qv__notice qv__notice--good" role="status">{{ t('view.accepted') }}</p>

      <aside v-if="quote.clientNote" class="qv__note" :aria-label="t('view.noteFrom')">
        <p class="q-small qv__note-label">{{ t('view.noteFrom') }}</p>
        <p class="qv__note-body">{{ quote.clientNote }}</p>
      </aside>

      <QuoteOptions
        v-model="tier" :options="optionViews" :currency="quote.currency" :deposit-bp="quote.depositBp"
        :notes="tierNotes" :label="t('result.titleNoName')"
      />

      <!-- The one action, in thumb reach on phones -->
      <div class="qv__book">
        <p v-if="picked" class="qv__book-summary q-num">
          <span class="q-small">{{ t(`tiers.${picked.tier}`) }}</span>
          <strong>{{ money(picked.total) }}</strong>
        </p>
        <QuoteButton
          v-if="quote.state === 'expired'" class="qv__book-btn" icon="brand-whatsapp"
          :href="wa(t('view.update', { ref: quote.ref ?? '' }))"
        >{{ t('view.askUpdate') }}</QuoteButton>
        <QuoteButton
          v-else class="qv__book-btn" icon="brand-whatsapp" :href="bookLink"
          @click="track('quote_view_book_clicked', { tier, state: quote.state })"
        >{{ t('actions.bookWhatsapp') }}</QuoteButton>
      </div>

      <div class="qv__fine q-small">
        <p v-if="quote.state === 'open'">{{ t('result.paymentLater') }}</p>
        <p>
          <template v-if="quote.validUntil && quote.state === 'open'">{{ t('view.validUntil', { date: longDate(quote.validUntil) }) }} </template>
          {{ quote.vatCharged ? t('result.vatIncluded', { rate: (quote.vatRateBp ?? 0) / 100 }) : t('result.vatExcluded') }}
        </p>
        <p v-if="quote.depositBp">{{ t('view.deposit', { percent: quote.depositBp / 100 }) }}</p>
        <p>{{ t('result.included') }}</p>
      </div>

      <div class="qv__row">
        <QuoteButton variant="secondary" icon="file-download" :href="`/api/quote/view/${token}/pdf`" @click="track('quote_pdf_downloaded', { state: quote.state })">{{ t('view.pdf') }}</QuoteButton>
        <QuoteButton variant="quiet" icon="brand-whatsapp" :href="wa(t('view.ask', { ref: quote.ref ?? '' }))">{{ t('actions.chatWhatsapp') }}</QuoteButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// The client's quote link: /quote/view/<token>. The token is the only key
// (the backend stores its hash). The page is server-rendered so it opens
// fast on a slow phone; the view is counted from the browser after it
// renders, so WhatsApp's link preview does not mark the quote as viewed.
import type { QuoteOptionView } from '~/components/quote/QuoteOptions.vue'

definePageMeta({ layout: 'quote' })
useSeoMeta({ title: 'Your quote | Viewora Capture', robots: 'noindex, nofollow' })

const runtime = useRuntimeConfig().public
if (!runtime.quoteEngine) throw createError({ statusCode: 404, statusMessage: 'Not found' })

interface PublicLine { kind: string; label: string; qty: number; unit: number; amount: number }
interface PublicOption { tier: string; recommended: boolean; lines: PublicLine[]; subtotal: number; discount: number; net: number; vat: number; total: number; deposit: number }
interface PublicQuote {
  state: 'open' | 'expired' | 'accepted' | 'replaced' | 'closed' | 'gone'
  replacedAt?: string | null; ref?: string; version?: number; firstName?: string | null; industry?: string
  sentAt?: string | null; validUntil?: string | null; currency?: 'KES' | 'USD'; vatCharged?: boolean
  vatRateBp?: number; depositBp?: number; clientNote?: string | null; options?: PublicOption[]
}

const { t } = useQuoteStrings()
const { track } = useAnalytics()
const route = useRoute()
const token = String(route.params.token ?? '')
const validToken = /^[A-Za-z0-9_-]{43}$/.test(token)

const { data, pending, error, refresh } = await useFetch<{ quote: PublicQuote; whatsapp: string }>(
  () => `/api/quote/view/${token}`,
  { key: `quote-view-${token}`, immediate: validToken },
)
const quote = computed(() => data.value?.quote ?? null)
const notFound = computed(() => !validToken || [400, 404].includes(error.value?.statusCode ?? 0))
const priced = computed(() => !!quote.value?.options?.length)
if (import.meta.server && notFound.value) setResponseStatus(useRequestEvent()!, 404)

const money = (n: number) => formatMoney(n, quote.value?.currency ?? 'KES')
const whatsapp = computed(() => data.value?.whatsapp || runtime.quoteWhatsapp)
const wa = (text: string) => `https://wa.me/${whatsapp.value}?text=${encodeURIComponent(text)}`
// Plain dates (valid until) are read at noon so no time zone moves them;
// timestamps (sent at) are shown on the Nairobi calendar
const longDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' })

const tier = ref(quote.value?.options?.find(o => o.recommended)?.tier ?? quote.value?.options?.[0]?.tier ?? 'standard')
const optionViews = computed<QuoteOptionView[]>(() => (quote.value?.options ?? []).map(o => ({
  tier: o.tier, total: o.total, deposit: o.deposit,
  lines: o.lines.map(l => ({ kind: l.kind, label: l.qty > 1 ? `${l.label} × ${l.qty}` : l.label, amount: l.amount })),
})))
const tierNotes = computed(() => Object.fromEntries((quote.value?.options ?? []).map(o => [o.tier, o.recommended ? t('view.recommended') : t(`tiers.${o.tier}Note`)])))
const picked = computed(() => quote.value?.options?.find(o => o.tier === tier.value))
const bookLink = computed(() => wa(t('view.book', { tier: t(`tiers.${tier.value}`), amount: picked.value ? money(picked.value.total) : '', ref: quote.value?.ref ?? '' })))

const unpricedMessage = computed(() => {
  const q = quote.value!
  if (q.state === 'replaced') return q.replacedAt ? t('view.replaced', { date: longDate(q.replacedAt) }) : t('view.replacedNoDate')
  return t(`view.${q.state}`)
})

onMounted(() => {
  if (!quote.value || quote.value.state === 'gone') return
  // Count the view once per page load; analytics carry no personal data
  $fetch(`/api/quote/view/${token}/seen`, { method: 'POST' }).catch(() => {})
  track('quote_view_opened', { state: quote.value.state, options: quote.value.options?.length ?? 0 })
})
</script>

<style scoped>
.qv { max-width: 560px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.qv--wide { max-width: 1040px; }
.qv__quote { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
.qv__head { display: grid; gap: 6px; }
.qv__row { display: flex; flex-wrap: wrap; gap: 10px; }
.qv__solo { justify-self: start; }

.qv__note { display: grid; gap: 4px; padding: 14px 16px; background: var(--q-surface); border-left: 3px solid var(--q-accent); border-radius: var(--q-radius-sm); max-width: 640px; }
.qv__note-label { font-weight: 600; color: var(--q-ink-2); }
.qv__note-body { white-space: pre-line; }

.qv__notice { display: grid; gap: 2px; padding: 12px 14px; background: var(--q-warn-bg); color: var(--q-ink); border-radius: var(--q-radius-sm); font-size: var(--q-text-sm); max-width: 640px; }
.qv__notice-title { font-weight: 600; }
.qv__notice--good { background: var(--q-good-bg); }

.qv__fine { display: grid; gap: 6px; max-width: 640px; color: var(--q-ink-2); }

.qv__book { display: flex; align-items: center; gap: 16px; max-width: 560px; }
.qv__book-summary { display: grid; gap: 2px; white-space: nowrap; }
.qv__book-summary strong { font-size: var(--q-text-lg); }
.qv__book-btn { flex: 1; white-space: nowrap; }
@media (max-width: 899px) {
  .qv__book-summary strong { font-size: var(--q-text-md); }
  .qv__book {
    gap: 12px;
    position: sticky; bottom: 0; z-index: 2; max-width: none;
    margin: 0 calc(-1 * var(--q-gutter)); padding: 12px var(--q-gutter) calc(12px + env(safe-area-inset-bottom));
    background: var(--q-surface); border-top: 1px solid var(--q-border);
  }
}

.qv__state { display: grid; gap: 12px; padding: 18px; background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius); }
.qv__state--error { border-color: var(--q-bad); background: var(--q-bad-bg); }
.qv__skeleton { display: block; height: 14px; border-radius: 4px; background: var(--q-sunken); }
.qv__skeleton--short { width: 60%; }
</style>
