<template>
  <div class="qs">
    <section class="qs__state" :class="{ 'qs__state--error': status === 'invalid' || status === 'failed' }" :role="status === 'checking' ? 'status' : undefined" aria-live="polite">
      <h1 class="q-h2">{{ t('stop.title') }}</h1>
      <p v-if="status === 'checking'" class="q-body">{{ t('stop.checking') }}</p>
      <template v-else-if="status === 'ask'">
        <p class="q-body">{{ t('stop.ask') }}</p>
        <div class="qs__row">
          <QuoteButton :disabled="saving" @click="stop">{{ saving ? t('stop.saving') : t('stop.confirm') }}</QuoteButton>
        </div>
      </template>
      <p v-else-if="status === 'done'" class="q-body" role="alert">{{ t('stop.done') }}</p>
      <template v-else>
        <p class="q-body" role="alert">{{ status === 'failed' ? t('stop.failed') : t('stop.invalid') }}</p>
        <div class="qs__row">
          <QuoteButton v-if="status === 'failed'" variant="secondary" icon="refresh" @click="stop">{{ t('actions.retry') }}</QuoteButton>
          <QuoteButton variant="secondary" icon="brand-whatsapp" :href="`https://wa.me/${runtime.quoteWhatsapp}`">{{ t('actions.chatWhatsapp') }}</QuoteButton>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
// The "do not want these emails?" link. The address carries the lead id and
// a signature the backend checks; nothing is stopped until they press the
// button, so a link preview or a mail scanner opening it changes nothing.
definePageMeta({ layout: 'quote' })
useSeoMeta({ title: 'Stop messages | Viewora Capture', robots: 'noindex, nofollow' })

const runtime = useRuntimeConfig().public
if (!runtime.quoteEngine) throw createError({ statusCode: 404, statusMessage: 'Not found' })

const { t } = useQuoteStrings()
const route = useRoute()
const l = String(route.query.l ?? '')
const s = String(route.query.s ?? '')
const valid = /^[0-9a-f-]{36}$/.test(l) && /^[A-Za-z0-9_-]{32}$/.test(s)
const status = ref<'checking' | 'ask' | 'done' | 'invalid' | 'failed'>(valid ? 'checking' : 'invalid')
const saving = ref(false)

async function stop() {
  saving.value = true
  try {
    await $fetch('/api/quote/stop', { method: 'POST', body: { l, s } })
    status.value = 'done'
  } catch (e: any) {
    status.value = (e?.statusCode ?? e?.response?.status) === 404 ? 'invalid' : 'failed'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!valid) return
  try {
    const r = await $fetch<{ optedOut: boolean }>(`/api/quote/stop?l=${encodeURIComponent(l)}&s=${encodeURIComponent(s)}`)
    status.value = r.optedOut ? 'done' : 'ask'
  } catch (e: any) {
    status.value = (e?.statusCode ?? e?.response?.status) === 404 ? 'invalid' : 'ask'
  }
})
</script>

<style scoped>
.qs { max-width: 560px; margin: 0 auto; }
.qs__state { display: grid; gap: 12px; padding: 18px; background: var(--q-surface); border: 1px solid var(--q-border); border-radius: var(--q-radius); }
.qs__state--error { border-color: var(--q-bad); background: var(--q-bad-bg); }
.qs__row { display: flex; flex-wrap: wrap; gap: 10px; }
</style>
