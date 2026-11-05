<template>
  <div class="lf-overlay" role="presentation" @click.self="emit('close')" @click.stop @keydown.stop @keydown.esc="emit('close')">
    <div ref="cardEl" class="lf-card" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1">
      <button type="button" class="lf-close" aria-label="Close" @click="emit('close')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>

      <!-- Sent -->
      <div v-if="state === 'sent'" class="lf-done" aria-live="polite">
        <h2 :id="titleId" class="lf-title">{{ T.sentTitle(firstName) }}</h2>
        <p class="lf-note">{{ T.sentBody(email) }}</p>
        <button type="button" class="lf-btn lf-btn--primary" @click="emit('close')">{{ T.close }}</button>
      </div>

      <!-- Form -->
      <form v-else novalidate @submit.prevent="submit">
        <h2 :id="titleId" class="lf-title">{{ T.title }}</h2>
        <p class="lf-sub">{{ spaceTitle }}</p>

        <!-- Failure: say what happened and give the visitor another way to reach the owner. -->
        <div v-if="state === 'failed'" class="lf-fail" role="alert">
          <p class="lf-fail__text">{{ failText }}</p>
          <a v-if="whatsappHref" :href="whatsappHref" class="lf-btn lf-btn--wa" target="_blank" rel="noopener noreferrer" @click="onFallbackClick">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.49 2 2 6.48 2 12c0 1.89.52 3.66 1.42 5.18L2 22l4.98-1.39A9.96 9.96 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm5.8 14.16c-.24.68-1.44 1.32-1.98 1.39-.52.07-1.2.1-1.95-.12-.45-.14-1.03-.33-1.78-.65-3.13-1.35-5.16-4.5-5.32-4.71-.15-.21-1.27-1.69-1.27-3.23 0-1.54.8-2.29 1.09-2.6.28-.31.62-.39.82-.39h.59c.19 0 .45-.07.7.53.26.62.88 2.16.96 2.32.08.15.13.34.03.55-.1.2-.15.33-.3.5-.15.18-.31.39-.45.52-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.05 1.13 1 2.09 1.31 2.39 1.46.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.76.83 2.06.98.3.15.5.23.57.35.08.13.08.73-.17 1.41Z" /></svg>
            {{ T.whatsapp }}
          </a>
          <a v-else-if="ownerEmail" :href="mailtoHref" class="lf-btn lf-btn--ghost">{{ T.emailOwner }}</a>
        </div>

        <div class="lf-field">
          <label :for="id('name')">{{ T.name }}</label>
          <input :id="id('name')" ref="nameEl" v-model.trim="name" type="text" autocomplete="name" maxlength="100" required :aria-invalid="!!errors.name" :aria-describedby="errors.name ? id('name-err') : undefined" />
          <p v-if="errors.name" :id="id('name-err')" class="lf-err">{{ errors.name }}</p>
        </div>
        <div class="lf-field">
          <label :for="id('email')">{{ T.email }}</label>
          <input :id="id('email')" v-model.trim="email" type="email" inputmode="email" autocomplete="email" maxlength="254" required :aria-invalid="!!errors.email" :aria-describedby="errors.email ? id('email-err') : undefined" />
          <p v-if="errors.email" :id="id('email-err')" class="lf-err">{{ errors.email }}</p>
        </div>
        <div class="lf-field">
          <label :for="id('phone')">{{ T.phone }} <span class="lf-opt">{{ T.optional }}</span></label>
          <input :id="id('phone')" v-model.trim="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="0712 345 678" />
        </div>
        <div class="lf-field">
          <label :for="id('msg')">{{ T.message }} <span class="lf-opt">{{ T.optional }}</span></label>
          <textarea :id="id('msg')" v-model="message" rows="3" maxlength="1000"></textarea>
        </div>

        <p class="lf-consent">{{ T.consent }}</p>

        <button type="submit" class="lf-btn lf-btn--primary" :disabled="state === 'sending'">
          {{ state === 'sending' ? T.sending : T.send }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'

const props = defineProps<{
  spaceId: string
  spaceTitle: string
  /** Owner's WhatsApp number, digits only with country code. Null when not set. */
  whatsappNumber: string | null
  ownerEmail?: string | null
  shareUrl?: string
  /** Where the visitor is: inside an iframe embed or on the tour page. */
  source: 'embed' | 'direct'
  /** White-label tours must not mention Viewora in anything the visitor reads. */
  whiteLabel?: boolean
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

// All visitor-facing text in one place so it can be translated later.
const T = {
  title: 'Send an enquiry',
  name: 'Your name',
  email: 'Email',
  phone: 'Phone',
  message: 'Message',
  optional: '(optional)',
  consent: 'The owner of this tour will see these details so they can reply to you.',
  send: 'Send enquiry',
  sending: 'Sending…',
  close: 'Close',
  whatsapp: 'Message on WhatsApp instead',
  emailOwner: 'Email the owner instead',
  nameErr: 'Please enter your name.',
  emailErr: 'Please enter an email address the owner can reply to.',
  sentTitle: (n: string) => `Thanks${n ? `, ${n}` : ''}. Your enquiry is sent.`,
  sentBody: (e: string) => `The owner will reply to ${e}. If it is urgent, contact them directly.`,
  failGeneric: 'We could not send your enquiry.',
  failBlocked: 'Enquiries by form are not available for this tour right now.',
  failBusy: 'Too many attempts from this connection. Wait a minute and try again.',
}

const { apiFetch } = useApiFetch()
const { $posthog } = useNuxtApp() as any

const uid = Math.random().toString(36).slice(2, 8)
const titleId = `lf-title-${uid}`
const id = (k: string) => `lf-${k}-${uid}`

const name = ref('')
const email = ref('')
const phone = ref('')
const message = ref('')
const errors = reactive<{ name: string; email: string }>({ name: '', email: '' })
const state = ref<'idle' | 'sending' | 'sent' | 'failed'>('idle')
const failText = ref('')
const cardEl = ref<HTMLElement | null>(null)
const nameEl = ref<HTMLInputElement | null>(null)

const firstName = computed(() => name.value.split(/\s+/)[0] || '')

const via = computed(() => (props.whiteLabel ? '' : ' on Viewora'))
const whatsappHref = computed(() => {
  if (!props.whatsappNumber) return null
  const lines = [`Hi, I just viewed "${props.spaceTitle}"${via.value} and I'm interested.`]
  if (message.value.trim()) lines.push('', message.value.trim())
  if (name.value) lines.push('', `Name: ${name.value}`)
  if (props.shareUrl) lines.push('', `Tour link: ${props.shareUrl}`)
  return `https://wa.me/${props.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`
})
const mailtoHref = computed(() =>
  `mailto:${props.ownerEmail}?subject=${encodeURIComponent(`Enquiry: ${props.spaceTitle}`)}&body=${encodeURIComponent(message.value)}`,
)

onMounted(async () => {
  $posthog?.capture('lead_form_opened', { space_id: props.spaceId, source: props.source })
  await nextTick()
  nameEl.value?.focus({ preventScroll: true })
})

function validate(): boolean {
  errors.name = name.value.length < 2 ? T.nameErr : ''
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? '' : T.emailErr
  return !errors.name && !errors.email
}

async function submit() {
  if (state.value === 'sending') return
  if (!validate()) {
    ;(cardEl.value?.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus()
    return
  }
  state.value = 'sending'
  try {
    await apiFetch('/leads', {
      method: 'POST',
      body: {
        spaceId: props.spaceId,
        name: name.value,
        email: email.value,
        ...(phone.value ? { phone: phone.value } : {}),
        ...(message.value.trim() ? { message: message.value.trim() } : {}),
        source: props.source,
      },
    })
    state.value = 'sent'
    $posthog?.capture('lead_form_sent', { space_id: props.spaceId, source: props.source }) // no personal data
  } catch (err: any) {
    const code = err?.statusCode ?? err?.status ?? err?.response?.status
    failText.value = code === 403 ? T.failBlocked : code === 429 ? T.failBusy : T.failGeneric
    state.value = 'failed'
    $posthog?.capture('lead_form_failed', { space_id: props.spaceId, status: code ?? null })
  }
}

function onFallbackClick() {
  $posthog?.capture('lead_form_whatsapp_fallback', { space_id: props.spaceId })
  // Same as the main WhatsApp button: the click shows up in the owner's lead list.
  apiFetch('/leads', { method: 'POST', body: { spaceId: props.spaceId, source: 'whatsapp' } }).catch(() => {})
}
</script>

<style scoped>
.lf-overlay {
  position: absolute; inset: 0; z-index: 160;
  display: flex; align-items: center; justify-content: center;
  padding: 12px;
  background: rgba(4, 5, 10, 0.72);
  overflow-y: auto; overscroll-behavior: contain;
}
.lf-card {
  position: relative; width: 100%; max-width: 380px; max-height: 100%;
  overflow-y: auto;
  background: #0f1014; color: #f2f3f5;
  border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px;
  padding: 22px 18px 18px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  outline: none;
}
.lf-close {
  position: absolute; top: 6px; right: 6px; width: 44px; height: 44px;
  display: grid; place-items: center; border: 0; border-radius: 10px;
  background: transparent; color: #aeb2ba; cursor: pointer;
}
.lf-close:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }
.lf-title { margin: 0 40px 2px 0; font-size: 1.15rem; line-height: 1.25; font-weight: 700; }
.lf-sub { margin: 0 0 14px; font-size: 0.85rem; color: #aeb2ba; }
.lf-field { margin-bottom: 12px; }
.lf-field label { display: block; margin-bottom: 4px; font-size: 0.85rem; font-weight: 600; }
.lf-opt { font-weight: 400; color: #aeb2ba; }
.lf-field input, .lf-field textarea {
  width: 100%; min-height: 48px; padding: 10px 12px;
  font: inherit; font-size: 16px; /* 16px stops iOS zooming into the field */
  color: #fff; background: #181a20;
  border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 8px;
  box-sizing: border-box;
}
.lf-field textarea { resize: vertical; min-height: 84px; }
.lf-field input[aria-invalid='true'] { border-color: #f87171; }
.lf-field input:focus-visible, .lf-field textarea:focus-visible,
.lf-btn:focus-visible, .lf-close:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.lf-err { margin: 4px 0 0; font-size: 0.8rem; color: #fca5a5; }
.lf-consent { margin: 2px 0 12px; font-size: 0.78rem; color: #aeb2ba; }
.lf-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; min-height: 48px; padding: 0 16px;
  font: inherit; font-weight: 700; font-size: 0.95rem; text-decoration: none;
  border: 0; border-radius: 8px; cursor: pointer;
  transition: transform 120ms ease, opacity 120ms ease;
}
.lf-btn:active { transform: scale(0.985); }
.lf-btn:disabled { opacity: 0.6; cursor: default; }
.lf-btn--primary { background: #fff; color: #0f1014; }
.lf-btn--wa { background: #25d366; color: #06210f; }
.lf-btn--ghost { background: transparent; color: #fff; border: 1px solid rgba(255, 255, 255, 0.3); }
.lf-fail { margin: 0 0 14px; padding: 12px; border: 1px solid rgba(248, 113, 113, 0.5); border-radius: 8px; }
.lf-fail__text { margin: 0 0 10px; font-size: 0.9rem; }
.lf-done { padding: 8px 0 0; }
.lf-note { margin: 6px 0 16px; font-size: 0.9rem; color: #c9ccd1; }
@media (prefers-reduced-motion: reduce) { .lf-btn { transition: none; } }
</style>
