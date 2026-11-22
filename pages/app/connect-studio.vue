<template>
  <!-- Spotlight Studio asks to publish spotlights for you. Studio opens this
       page with ?port=&state=&device=; on Allow a Studio key is made and handed
       back to the Studio on this computer (127.0.0.1 only), in the URL fragment,
       which never reaches any server. Turn it off later in Settings. -->
  <div class="cs">
    <div class="cs-card">
      <div class="cs-logo" aria-hidden="true">◎</div>
      <h1 class="cs-title">Connect Spotlight Studio</h1>

      <template v-if="phase === 'checking'">
        <p class="cs-text">One moment…</p>
      </template>

      <template v-else-if="phase === 'signin'">
        <p class="cs-text">Sign in to Viewora first. Then press <b>Connect</b> in Spotlight Studio again.</p>
        <NuxtLink to="/login" class="cs-btn cs-btn--primary">Sign in</NuxtLink>
      </template>

      <template v-else-if="phase === 'ask'">
        <p class="cs-text">
          <b>{{ device }}</b> wants to publish Object Spotlights to your tours.
        </p>
        <ul class="cs-list">
          <li>It can add, change and remove spotlights on tours you own.</li>
          <li>It can't see or change anything else: not your leads, billing or settings.</li>
          <li>It stays connected for 90 days. Turn it off any time in Settings.</li>
        </ul>
        <p v-if="!portOk" class="cs-warn">This link didn't come from the Studio. You'll get a code to paste into it instead.</p>
        <div class="cs-actions">
          <button class="cs-btn cs-btn--primary" :disabled="busy" @click="allow">
            <span v-if="busy" class="cs-spin" />
            <template v-else>Allow</template>
          </button>
          <NuxtLink to="/app" class="cs-btn">Cancel</NuxtLink>
        </div>
        <p v-if="error" class="cs-error">{{ error }}</p>
      </template>

      <template v-else-if="phase === 'sent'">
        <p class="cs-text">Connected. Going back to Spotlight Studio…</p>
        <p class="cs-hint">Nothing happened? Make sure the Studio is still running, then press Connect there again.</p>
      </template>

      <template v-else-if="phase === 'code'">
        <p class="cs-text">Paste this code into Spotlight Studio (<b>Paste a code</b>). It's shown only once.</p>
        <div class="cs-code">
          <code>{{ key }}</code>
          <button class="cs-btn cs-btn--sm" @click="copy">{{ copied ? 'Copied' : 'Copy' }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { definePageMeta, useRoute, useSeoMeta, useSupabaseClient } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

definePageMeta({ layout: false })
useSeoMeta({ title: 'Connect Spotlight Studio | Viewora', robots: 'noindex' })

const route = useRoute()
const supabase = useSupabaseClient()
const { apiFetch } = useApiFetch()

const phase = ref<'checking' | 'signin' | 'ask' | 'sent' | 'code'>('checking')
const busy = ref(false)
const error = ref('')
const key = ref('')
const copied = ref(false)

const port = computed(() => Number(route.query.port))
const portOk = computed(() => Number.isInteger(port.value) && port.value >= 1024 && port.value <= 65535)
const state = computed(() => {
  const s = String(route.query.state ?? '')
  return /^[A-Za-z0-9_-]{16,64}$/.test(s) ? s : ''
})
const device = computed(() => {
  const d = String(route.query.device ?? '').replace(/[^\w .()'-]/g, '').trim().slice(0, 50)
  return d ? `Spotlight Studio on ${d}` : 'Spotlight Studio'
})

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  phase.value = session ? 'ask' : 'signin'
})

async function allow() {
  busy.value = true
  error.value = ''
  try {
    const r = await apiFetch('/studio-keys', { method: 'POST', body: { name: device.value } }) as any
    key.value = r.key
    if (portOk.value && state.value) {
      phase.value = 'sent'
      // Back to the Studio on this computer. Only ever 127.0.0.1, and the key
      // rides in the fragment (#), which browsers never send to a server.
      window.location.replace(`http://127.0.0.1:${port.value}/#connect=${encodeURIComponent(r.key)}&state=${state.value}`)
    } else {
      phase.value = 'code'
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not connect. Check your connection and try again.'
  } finally {
    busy.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(key.value)
    copied.value = true
  } catch { /* select it by hand */ }
}
</script>

<style scoped>
.cs { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; background: #0b1118; color: #e8eef3; font-family: inherit; }
.cs-card { width: 100%; max-width: 440px; background: #121b25; border: 1px solid #233241; border-radius: 16px; padding: 28px 24px; }
.cs-logo { color: #7fe7f7; font-size: 28px; line-height: 1; }
.cs-title { font-size: 20px; font-weight: 800; margin: 10px 0 12px; }
.cs-text { font-size: 14px; line-height: 1.5; color: rgba(232,238,243,0.85); margin: 0 0 14px; }
.cs-text b { color: #fff; }
.cs-list { margin: 0 0 18px; padding-left: 18px; font-size: 13px; line-height: 1.6; color: rgba(232,238,243,0.65); }
.cs-hint { font-size: 12px; color: rgba(232,238,243,0.5); margin: 0; }
.cs-warn { font-size: 12px; color: #f5c451; margin: 0 0 14px; }
.cs-error { font-size: 13px; color: #ff6b6b; margin: 12px 0 0; }
.cs-actions { display: flex; gap: 10px; }
.cs-btn { height: 40px; padding: 0 18px; border-radius: 10px; border: 1px solid #233241; background: #1b2a38; color: #e8eef3; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
.cs-btn--primary { background: #7fe7f7; color: #031016; border-color: #7fe7f7; font-weight: 800; }
.cs-btn--sm { height: 30px; padding: 0 12px; font-size: 12px; }
.cs-btn:disabled { opacity: 0.6; cursor: default; }
.cs-code { display: flex; gap: 8px; align-items: center; }
.cs-code code { flex: 1; min-width: 0; overflow-wrap: anywhere; background: #0a1017; border: 1px solid #233241; border-radius: 8px; padding: 8px 10px; font-size: 12.5px; }
.cs-spin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; animation: cs-spin .8s linear infinite; }
@keyframes cs-spin { to { transform: rotate(360deg); } }
</style>
