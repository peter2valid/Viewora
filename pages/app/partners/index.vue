<template>
  <div class="h-full flex flex-col">
    <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-1">
        <div class="flex items-center gap-4">
          <h1 class="text-3xl font-black tracking-tight text-main">Partners</h1>
          <span v-if="me" class="px-3 py-1 bg-surface-alt text-main text-[10px] font-black uppercase tracking-widest rounded-lg border border-border shadow-sm">
            {{ partners.length }} {{ partners.length === 1 ? 'partner' : 'partners' }}
          </span>
        </div>
        <p class="text-sm text-dim font-bold max-w-2xl">
          Affiliates who bring clients. Each one gets a quote link with their code; every client quoted through it is credited to them,
          and their commission is owed once that client's balance is paid.
        </p>
      </div>
      <button v-if="canWrite" class="btn btn-primary shadow-lg" @click="openNew">
        <UiIcon name="plus" :size="16" class="mr-2" /> Add partner
      </button>
    </header>

    <div v-if="pending" class="space-y-3 animate-pulse">
      <div v-for="i in 4" :key="i" class="h-20 bg-card rounded-2xl" />
    </div>

    <div v-else-if="blocked" class="flex-1 flex items-center justify-center p-12 text-center">
      <p class="text-sm text-dim font-bold max-w-sm">{{ blocked }}</p>
    </div>

    <template v-else>
      <!-- Commission totals (admins only) -->
      <section v-if="canSeeMoney" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div v-for="t in totalTiles" :key="t.label" class="card-glass p-5">
          <p class="text-[10px] font-black uppercase tracking-widest text-dim">{{ t.label }}</p>
          <p class="text-2xl font-black text-main mt-1 tabular-nums">{{ t.value }}</p>
          <p class="text-xs text-dim font-bold mt-1">{{ t.hint }}</p>
        </div>
      </section>

      <!-- New / edit partner -->
      <section v-if="form" class="card-glass p-6 mb-8">
        <h2 class="text-lg font-black text-main mb-4">{{ form.id ? `Edit ${form.originalName}` : 'New partner' }}</h2>
        <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="savePartner">
          <label class="space-y-1">
            <span class="text-[11px] font-black uppercase tracking-widest text-dim">Name</span>
            <input v-model="form.name" class="input-glass w-full" maxlength="80" placeholder="Douglas Otieno" required>
            <span v-if="fieldErrors.name" class="text-xs font-bold text-red-500">{{ fieldErrors.name }}</span>
          </label>
          <label class="space-y-1">
            <span class="text-[11px] font-black uppercase tracking-widest text-dim">Code</span>
            <input v-model="form.code" class="input-glass w-full uppercase" maxlength="20" placeholder="DOUGLAS" required>
            <span class="text-xs text-dim font-bold block">Goes on the end of their link. 2 to 20 letters, digits or dashes.</span>
            <span v-if="fieldErrors.code" class="text-xs font-bold text-red-500">{{ fieldErrors.code }}</span>
          </label>
          <label class="space-y-1">
            <span class="text-[11px] font-black uppercase tracking-widest text-dim">Commission</span>
            <select v-model="form.commissionType" class="input-glass w-full">
              <option value="percent">Percentage of the job price</option>
              <option value="fixed">Fixed amount per job (KES)</option>
            </select>
          </label>
          <label class="space-y-1">
            <span class="text-[11px] font-black uppercase tracking-widest text-dim">
              {{ form.commissionType === 'percent' ? 'Percent' : 'KES per job' }}
            </span>
            <input v-model.number="form.amount" type="number" class="input-glass w-full" :min="0"
              :max="form.commissionType === 'percent' ? 50 : undefined" :step="form.commissionType === 'percent' ? 0.5 : 100" required>
            <span class="text-xs text-dim font-bold block">
              {{ form.commissionType === 'percent'
                ? `Worked out on the price after discount, before VAT. A KES 9,000 tour pays ${kes(Math.round(9000 * (form.amount || 0) / 100))}.`
                : 'Paid per job in KES. A job priced in USD is agreed by hand.' }}
            </span>
            <span v-if="fieldErrors.commissionValue" class="text-xs font-bold text-red-500">{{ fieldErrors.commissionValue }}</span>
          </label>
          <label v-if="form.id" class="flex items-center gap-3 md:col-span-2">
            <input v-model="form.active" type="checkbox" class="w-4 h-4">
            <span class="text-sm font-bold text-main">Active</span>
            <span class="text-xs text-dim font-bold">An inactive partner's link stops crediting new clients. Clients already credited stay theirs.</span>
          </label>
          <p v-if="formError" class="md:col-span-2 text-sm font-bold text-red-500">{{ formError }}</p>
          <div class="md:col-span-2 flex gap-3">
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save partner' }}</button>
            <button type="button" class="btn btn-secondary" @click="form = null">Cancel</button>
          </div>
        </form>
      </section>

      <!-- Partner list -->
      <section class="mb-10">
        <div v-if="!partners.length" class="card-glass p-10 text-center">
          <p class="text-sm text-dim font-bold">
            No partners yet.{{ canWrite ? ' Add one to give them a link that credits the clients they bring.' : '' }}
          </p>
        </div>
        <div v-else class="space-y-3">
          <article v-for="p in partners" :key="p.id" class="card-glass p-5 flex flex-col lg:flex-row lg:items-center gap-4" :class="{ 'opacity-60': !p.active }">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 flex-wrap">
                <h3 class="text-base font-black text-main truncate">{{ p.name }}</h3>
                <span class="px-2 py-0.5 rounded-md bg-surface-alt border border-border text-[10px] font-black tracking-widest text-main">{{ p.code }}</span>
                <span v-if="!p.active" class="px-2 py-0.5 rounded-md bg-surface-alt border border-border text-[10px] font-black uppercase tracking-widest text-dim">Inactive</span>
              </div>
              <p class="text-xs text-dim font-bold mt-1">{{ rateLabel(p) }} · since {{ shortDate(p.createdAt) }}</p>
              <p class="text-xs font-mono text-dim mt-2 truncate">{{ linkFor(p) }}</p>
            </div>
            <dl class="flex gap-6 text-center">
              <div>
                <dt class="text-[10px] font-black uppercase tracking-widest text-dim">Clients</dt>
                <dd class="text-xl font-black text-main tabular-nums">{{ p.leads }}</dd>
              </div>
              <template v-if="canSeeMoney">
                <div>
                  <dt class="text-[10px] font-black uppercase tracking-widest text-dim">Jobs</dt>
                  <dd class="text-xl font-black text-main tabular-nums">{{ byPartner(p.id).jobs }}</dd>
                </div>
                <div>
                  <dt class="text-[10px] font-black uppercase tracking-widest text-dim">Owed</dt>
                  <dd class="text-xl font-black tabular-nums" :class="byPartner(p.id).owed ? 'text-amber-500' : 'text-main'">{{ kes(byPartner(p.id).owed) }}</dd>
                </div>
              </template>
            </dl>
            <div class="flex gap-2 flex-wrap">
              <button class="btn btn-secondary !py-2 text-xs" @click="copyLink(p)">
                <UiIcon :name="copied === p.id ? 'check' : 'share'" :size="14" class="mr-1.5" />
                {{ copied === p.id ? 'Copied' : 'Copy link' }}
              </button>
              <button v-if="canSeeMoney" class="btn btn-secondary !py-2 text-xs" @click="partnerFilter = p.id">Commission</button>
              <button v-if="canWrite" class="btn btn-secondary !py-2 text-xs" @click="openEdit(p)">
                <UiIcon name="edit" :size="14" class="mr-1.5" /> Edit
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- Commission -->
      <section v-if="canSeeMoney" class="mb-10">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 class="text-xl font-black text-main">Commission</h2>
            <p class="text-xs text-dim font-bold">One row per job a partner's client booked. Tick owed rows and record the payment once you have paid them.</p>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <select v-model="partnerFilter" class="input-glass !px-4 !py-2.5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer pr-10">
              <option value="">All partners</option>
              <option v-for="p in partners" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <select v-model="statusFilter" class="input-glass !px-4 !py-2.5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer pr-10">
              <option value="">Any status</option>
              <option value="owed">Owed</option>
              <option value="waiting">Waiting</option>
              <option value="paid">Paid</option>
              <option value="none">Nothing owed</option>
            </select>
            <button class="btn btn-secondary !py-2.5 text-xs" :disabled="downloading" @click="downloadCsv">
              <UiIcon name="file-download" :size="14" class="mr-1.5" /> {{ downloading ? 'Preparing…' : 'Spreadsheet' }}
            </button>
          </div>
        </div>

        <div v-if="canWrite && selected.length" class="card-glass p-4 mb-4 flex flex-col md:flex-row md:items-center gap-3">
          <p class="text-sm font-black text-main flex-1">
            {{ selected.length }} {{ selected.length === 1 ? 'job' : 'jobs' }} selected · {{ kes(selectedTotal) }}
          </p>
          <input v-model="payoutRef" class="input-glass md:w-64" maxlength="80" placeholder="M-Pesa or bank reference">
          <button class="btn btn-primary !py-2.5 text-xs" :disabled="paying" @click="recordPayout">
            {{ paying ? 'Recording…' : 'Record as paid' }}
          </button>
        </div>
        <p v-if="payoutError" class="text-sm font-bold text-red-500 mb-4">{{ payoutError }}</p>
        <p v-if="commissionError" class="card-glass p-4 mb-4 text-sm font-bold text-red-500">Commission could not load: {{ commissionError }}</p>

        <div v-if="commissionError" />
        <div v-else-if="!visibleRows.length" class="card-glass p-10 text-center">
          <p class="text-sm text-dim font-bold">
            {{ rows.length ? 'Nothing matches that filter.' : 'No partner jobs yet. When a credited client books, the job shows up here.' }}
          </p>
        </div>
        <div v-else class="card-glass overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] font-black uppercase tracking-widest text-dim border-b border-border">
                <th v-if="canWrite" class="p-3 w-8" />
                <th class="p-3">Partner</th>
                <th class="p-3">Job</th>
                <th class="p-3">Client</th>
                <th class="p-3 text-right">Price before VAT</th>
                <th class="p-3 text-right">Commission</th>
                <th class="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in visibleRows" :key="r.jobId" class="border-b border-border last:border-0">
                <td v-if="canWrite" class="p-3">
                  <input v-if="r.commissionStatus === 'owed'" v-model="selected" type="checkbox" :value="r.jobId" class="w-4 h-4" :aria-label="`Select ${r.jobRef}`">
                </td>
                <td class="p-3 font-bold text-main whitespace-nowrap">{{ r.partnerName }}</td>
                <td class="p-3 font-mono text-xs text-main whitespace-nowrap">{{ r.jobRef }}</td>
                <td class="p-3 text-main">{{ r.leadName || '—' }}</td>
                <td class="p-3 text-right tabular-nums text-main whitespace-nowrap">{{ money(r.net, r.currency) }}</td>
                <td class="p-3 text-right tabular-nums font-black text-main whitespace-nowrap">
                  {{ r.commission === null ? 'Agree by hand' : money(r.commission, r.currency) }}
                </td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border whitespace-nowrap" :class="statusClass[r.commissionStatus]">
                    {{ statusLabel[r.commissionStatus] }}
                  </span>
                  <p v-if="r.commissionStatus === 'paid' && r.payout" class="text-[11px] text-dim font-bold mt-1 whitespace-nowrap">
                    {{ shortDate(r.payout.paidAt) }}{{ r.payout.reference ? ` · ${r.payout.reference}` : '' }}
                  </p>
                  <p v-else-if="r.reason" class="text-[11px] text-dim font-bold mt-1">{{ r.reason }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { definePageMeta, useRuntimeConfig, useSeoMeta } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Partners | Viewora' })

type Role = 'admin' | 'sales' | 'viewer'
type CommissionStatus = 'owed' | 'paid' | 'waiting' | 'none'

interface Partner {
  id: string
  name: string
  code: string
  commissionType: 'percent' | 'fixed'
  commissionValue: number          // basis points for percent, whole KES for fixed
  active: boolean
  createdAt: string
  leads: number
}

interface CommissionRow {
  jobId: string
  jobRef: string
  leadName: string | null
  partnerId: string
  partnerName: string
  currency: 'KES' | 'USD'
  net: number
  commission: number | null
  commissionStatus: CommissionStatus
  reason: string | null
  payout: { amount: number; reference: string | null; paidAt: string } | null
}

interface PartnerForm {
  id?: string
  originalName?: string
  name: string
  code: string
  commissionType: 'percent' | 'fixed'
  amount: number                   // percent as typed (10 = 10%), or KES
  active: boolean
}

const { apiFetch } = useApiFetch()
const config = useRuntimeConfig()

const pending = ref(true)
const blocked = ref<string | null>(null)
const me = ref<{ role: Role; displayName: string | null } | null>(null)  // set only for staff
const partners = ref<Partner[]>([])
const formUrl = ref('')
const rows = ref<CommissionRow[]>([])
const totals = ref<Record<string, { owed: number; paid: number; waiting: number }>>({})

// The backend enforces these too; the page only hides what would be refused
const canWrite = computed(() => me.value?.role === 'admin')
const canSeeMoney = computed(() => me.value?.role === 'admin')

const errMessage = (e: any, fallback: string) => e?.data?.statusMessage || e?.statusMessage || fallback

async function load() {
  if (!config.public.quoteEngine) {
    blocked.value = 'The quote engine is switched off, so there are no partner links yet.'
    pending.value = false
    return
  }
  try {
    const res = await apiFetch<{ role: Role | null; displayName: string | null }>('/staff/quote/me')
    if (!res.role) {
      blocked.value = 'Only Viewora staff can see partners.'
      pending.value = false
      return
    }
    me.value = { role: res.role, displayName: res.displayName }
  } catch (e: any) {
    blocked.value = errMessage(e, 'Could not load partners. Try again in a moment.')
    pending.value = false
    return
  }
  // Partners and commission load apart, so a commission problem still shows the partners
  const [partnersRes] = await Promise.allSettled([loadPartners(), canSeeMoney.value ? loadCommission() : null])
  if (partnersRes.status === 'rejected') blocked.value = errMessage(partnersRes.reason, 'Could not load partners. Try again in a moment.')
  pending.value = false
}

async function loadPartners() {
  const res = await apiFetch<{ partners: Partner[]; formUrl: string }>('/staff/quote/partners')
  partners.value = [...res.partners].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
  formUrl.value = res.formUrl
}

const commissionError = ref<string | null>(null)
async function loadCommission() {
  let res: { rows: CommissionRow[]; totals: typeof totals.value }
  try {
    res = await apiFetch('/staff/quote/commission')
    commissionError.value = null
  } catch (e: any) {
    commissionError.value = errMessage(e, 'Could not load commission.')
    return
  }
  rows.value = res.rows
  totals.value = res.totals
  const owed = new Set(res.rows.filter(r => r.commissionStatus === 'owed').map(r => r.jobId))
  selected.value = selected.value.filter(id => owed.has(id))
}

load()

// ── Display helpers ─────────────────────────────────────────────────────
const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`
const money = (n: number, currency: 'KES' | 'USD') => currency === 'KES' ? kes(n) : `USD ${n.toLocaleString('en-US')}`
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
const rateLabel = (p: Partner) => p.commissionType === 'percent'
  ? `${p.commissionValue / 100}% of each job`
  : `${kes(p.commissionValue)} per job`
const linkFor = (p: Partner) => `${formUrl.value}?p=${p.code}`

const statusLabel: Record<CommissionStatus, string> = { owed: 'Owed', waiting: 'Waiting', paid: 'Paid', none: 'Nothing owed' }
const statusClass: Record<CommissionStatus, string> = {
  owed: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  waiting: 'bg-surface-alt text-dim border-border',
  paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  none: 'bg-surface-alt text-dim border-border',
}

const totalTiles = computed(() => {
  const t = totals.value.KES ?? { owed: 0, paid: 0, waiting: 0 }
  const usd = totals.value.USD
  const extra = usd && (usd.owed || usd.waiting || usd.paid) ? ' Plus USD jobs, listed below.' : ''
  return [
    { label: 'Owed now', value: kes(t.owed), hint: `Clients have paid in full; pay these partners.${extra}` },
    { label: 'Waiting', value: kes(t.waiting), hint: 'Booked jobs whose balance is not paid yet.' },
    { label: 'Paid out', value: kes(t.paid), hint: 'Recorded payments to partners.' },
  ]
})

function byPartner(id: string) {
  const mine = rows.value.filter(r => r.partnerId === id && r.currency === 'KES')
  return {
    jobs: rows.value.filter(r => r.partnerId === id && r.commissionStatus !== 'none').length,
    owed: mine.filter(r => r.commissionStatus === 'owed').reduce((s, r) => s + (r.commission ?? 0), 0),
  }
}

// ── Copy link ───────────────────────────────────────────────────────────
const copied = ref<string | null>(null)
async function copyLink(p: Partner) {
  try {
    await navigator.clipboard.writeText(linkFor(p))
    copied.value = p.id
    setTimeout(() => { if (copied.value === p.id) copied.value = null }, 2000)
  } catch {
    window.prompt('Copy this link', linkFor(p))
  }
}

// ── Add / edit ──────────────────────────────────────────────────────────
const form = ref<PartnerForm | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

function openNew() {
  form.value = { name: '', code: '', commissionType: 'percent', amount: 10, active: true }
  formError.value = null
  fieldErrors.value = {}
}
function openEdit(p: Partner) {
  form.value = {
    id: p.id, originalName: p.name, name: p.name, code: p.code, commissionType: p.commissionType,
    amount: p.commissionType === 'percent' ? p.commissionValue / 100 : p.commissionValue, active: p.active,
  }
  formError.value = null
  fieldErrors.value = {}
}
// Changing the type clears an amount that made sense only for the other one
watch(() => form.value?.commissionType, (type, before) => {
  if (form.value && before && type !== before) form.value.amount = type === 'percent' ? 10 : 1000
})

async function savePartner() {
  const f = form.value
  if (!f) return
  formError.value = null
  fieldErrors.value = {}
  const amount = Number(f.amount)
  if (!Number.isFinite(amount) || amount < 0) { fieldErrors.value.commissionValue = 'Type a number of 0 or more.'; return }
  if (f.commissionType === 'percent' && amount > 50) { fieldErrors.value.commissionValue = 'A percentage is at most 50%.'; return }
  const body = {
    name: f.name.trim(),
    code: f.code.trim().toUpperCase(),
    commissionType: f.commissionType,
    commissionValue: f.commissionType === 'percent' ? Math.round(amount * 100) : Math.round(amount),
    ...(f.id ? { active: f.active } : {}),
  }
  saving.value = true
  try {
    await apiFetch(f.id ? `/staff/quote/partners/${f.id}` : '/staff/quote/partners', { method: f.id ? 'PATCH' : 'POST', body })
    form.value = null
    await Promise.all([loadPartners(), canSeeMoney.value ? loadCommission() : null])
  } catch (e: any) {
    const fields = e?.data?.fields as Array<{ field: string; message: string }> | undefined
    if (fields?.length) for (const x of fields) fieldErrors.value[x.field] = x.message
    else formError.value = errMessage(e, 'Could not save the partner.')
  } finally {
    saving.value = false
  }
}

// ── Commission table and payouts ────────────────────────────────────────
const partnerFilter = ref('')
const statusFilter = ref<'' | CommissionStatus>('')
const visibleRows = computed(() => rows.value.filter(r =>
  (!partnerFilter.value || r.partnerId === partnerFilter.value) && (!statusFilter.value || r.commissionStatus === statusFilter.value)))

const selected = ref<string[]>([])
const selectedTotal = computed(() => rows.value.filter(r => selected.value.includes(r.jobId)).reduce((s, r) => s + (r.commission ?? 0), 0))
const payoutRef = ref('')
const paying = ref(false)
const payoutError = ref<string | null>(null)

async function recordPayout() {
  if (!selected.value.length) return
  payoutError.value = null
  paying.value = true
  try {
    await apiFetch('/staff/quote/commission/payouts', { method: 'POST', body: { jobIds: selected.value, reference: payoutRef.value.trim() || null } })
    selected.value = []
    payoutRef.value = ''
    await loadCommission()
  } catch (e: any) {
    payoutError.value = errMessage(e, 'Could not record the payment.')
    await loadCommission().catch(() => {})
  } finally {
    paying.value = false
  }
}

const downloading = ref(false)
async function downloadCsv() {
  downloading.value = true
  try {
    const q = partnerFilter.value ? `?partner=${partnerFilter.value}` : ''
    const csv = await apiFetch<string>(`/staff/quote/commission.csv${q}`, { responseType: 'text' })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `viewora-commission-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    payoutError.value = errMessage(e, 'Could not make the spreadsheet.')
  } finally {
    downloading.value = false
  }
}
</script>
