<template>
  <section v-if="claims.length || notice" class="flex flex-col gap-3" :aria-labelledby="claims.length ? 'pc-title' : undefined">
    <h2 v-if="claims.length" id="pc-title" class="text-sm font-bold text-main">{{ T.title(claims.length) }}</h2>
    <p v-if="notice" class="text-sm text-dim" role="status" aria-live="polite">{{ notice }}</p>

    <article
      v-for="c in claims" :key="c.id"
      class="flex flex-col gap-3 px-4 py-3 bg-surface-alt rounded-lg border-l-2 border-main"
    >
      <div class="flex flex-col gap-1">
        <p class="text-sm text-main">
          <strong>{{ c.partner_name }}</strong> {{ T.wants }} <strong>{{ c.tour_title }}</strong>
        </p>
        <p class="text-xs text-dim">{{ T.explain(c.partner_name) }}</p>
        <p v-if="c.note" class="text-xs text-dim">{{ T.theySaid }} “{{ c.note }}”</p>
        <p class="text-xs text-dim">{{ T.theirId }} <span class="font-mono">{{ c.external_id }}</span> · {{ T.expires(daysLeft(c.expires_at)) }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiButton size="sm" :disabled="busy === c.id" @click="answer(c, true)">{{ busy === c.id ? T.saving : T.approve }}</UiButton>
        <UiButton size="sm" variant="secondary" :disabled="busy === c.id" @click="answer(c, false)">{{ T.decline }}</UiButton>
        <UiButton size="sm" variant="ghost" :to="`/app/spaces/${c.tour_id}`">{{ T.view }}</UiButton>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import { unwrapApiData } from '~/shared/utils/api'

// Requests from property and car apps to manage a tour this agent made in
// Viewora. Shown on the dashboard only while some are waiting.

type Claim = { id: string; partner_name: string; tour_id: string; tour_title: string; external_id: string; note: string | null; expires_at: string }

// Visitor-facing text in one place so it can be translated.
const T = {
  title: (n: number) => (n === 1 ? 'A partner app wants to manage one of your tours' : `Partner apps want to manage ${n} of your tours`),
  wants: 'wants to manage',
  explain: (p: string) => `If you approve, ${p} keeps the price, availability and photos up to date from their system. The tour, its views and enquiries stay in your account.`,
  theySaid: 'Their note:',
  theirId: 'Their listing number:',
  expires: (d: number) => (d <= 1 ? 'request ends today' : `request ends in ${d} days`),
  approve: 'Approve',
  decline: 'Decline',
  view: 'View tour',
  saving: 'Saving…',
  approved: (p: string) => `Approved. ${p} can now manage this tour.`,
  declined: 'Declined. Nothing has changed on your tour.',
  loadFail: 'Could not load requests from partner apps. Refresh the page to try again.',
  answerFail: 'That did not save. Check your connection and try again.',
}

const { apiFetch } = useApiFetch()
const claims = ref<Claim[]>([])
const busy = ref<string | null>(null)
const notice = ref("")
const { $posthog } = useNuxtApp() as any

const daysLeft = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000))

onMounted(async () => {
  try {
    const res: any = await apiFetch('/partner/claims')
    claims.value = unwrapApiData<any>(res)?.claims ?? []
  } catch (e: any) {
    // 404: the listing platform is switched off; nothing to show.
    const code = e?.statusCode ?? e?.status ?? e?.response?.status
    if (code && code !== 404) notice.value = T.loadFail
  }
})

async function answer(c: Claim, approve: boolean) {
  busy.value = c.id
  notice.value = ''
  try {
    await apiFetch(`/partner/claims/${c.id}/${approve ? 'approve' : 'decline'}`, { method: 'POST', body: {} })
    claims.value = claims.value.filter(x => x.id !== c.id)
    $posthog?.capture(approve ? 'partner_claim_approved' : 'partner_claim_declined') // no ids or names
    notice.value = approve ? T.approved(c.partner_name) : T.declined
  } catch {
    notice.value = T.answerFail
  } finally { busy.value = null }
}
</script>
