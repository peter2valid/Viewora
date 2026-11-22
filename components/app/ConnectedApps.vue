<template>
  <!-- Connected apps: computers where Spotlight Studio can publish spotlights
       (Studio keys, viewora-backend routes/spotlights.ts). Hidden until there
       is one, so most accounts never see it. -->
  <section v-if="keys.length" class="bg-card rounded-2xl border border-border dark:border-transparent overflow-hidden">
    <div class="p-6 border-b border-black/[0.08] dark:border-white/20">
      <h3 class="text-base font-bold text-main">Connected apps</h3>
      <p class="text-sm text-dim mt-1">Computers where Spotlight Studio can publish Object Spotlights to your tours. Turn one off if you no longer use it, or if that computer is lost.</p>
    </div>
    <ul class="divide-y divide-black/[0.06] dark:divide-white/10">
      <li v-for="k in keys" :key="k.id" class="px-6 py-4 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-main truncate">{{ k.name }}</div>
          <div class="text-xs text-dim mt-0.5">
            Connected {{ day(k.created_at) }}
            · {{ k.last_used_at ? `last used ${day(k.last_used_at)}` : 'not used yet' }}
            · <span :class="k.expired ? 'text-rose-500' : ''">{{ k.expired ? 'expired' : `until ${day(k.expires_at)}` }}</span>
          </div>
        </div>
        <button class="btn btn-secondary !h-9 !px-4 text-sm shrink-0" :disabled="busy === k.id" @click="turnOff(k)">
          {{ busy === k.id ? 'Turning off…' : 'Turn off' }}
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApiFetch } from '~/composables/useApiFetch'

interface StudioKey { id: string; name: string; created_at: string; last_used_at: string | null; expires_at: string; expired: boolean }

const { apiFetch } = useApiFetch()
const keys = ref<StudioKey[]>([])
const busy = ref('')

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(async () => {
  try {
    const r = await apiFetch('/studio-keys') as any
    keys.value = r.keys ?? []
  } catch { /* nothing to show */ }
})

async function turnOff(k: StudioKey) {
  busy.value = k.id
  try {
    await apiFetch(`/studio-keys/${k.id}`, { method: 'DELETE' })
    keys.value = keys.value.filter(x => x.id !== k.id)
    toast.success(`${k.name} can no longer publish`)
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Could not turn it off. Try again.')
  } finally {
    busy.value = ''
  }
}
</script>
