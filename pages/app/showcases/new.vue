<template>
  <div class="max-w-3xl mx-auto pb-10">
    <UiPageHeader title="Create Showcase" subtitle="Choose the tours a client should see, in the order they should see them.">
      <template #actions>
        <NuxtLink to="/app/showcases" class="h-11 px-4 inline-flex items-center justify-center text-sm font-semibold text-dim hover:text-main">Cancel</NuxtLink>
      </template>
    </UiPageHeader>

    <form class="space-y-7" @submit.prevent="create">
      <section class="border border-border rounded-xl bg-card p-4 sm:p-6">
        <p class="text-[11px] uppercase tracking-widest font-bold text-dim">1 · Give it context</p>
        <label class="block mt-4 text-sm font-semibold text-main" for="showcase-title">Showcase name</label>
        <input id="showcase-title" ref="titleInput" v-model.trim="title" required maxlength="120" placeholder="Westlands homes for your shortlist" class="mt-2 w-full h-12 px-3 rounded-lg border border-border bg-surface text-main placeholder:text-dim outline-none focus:ring-2 focus:ring-main/20 focus:border-main" />
        <label class="block mt-5 text-sm font-semibold text-main" for="showcase-description">Short introduction <span class="text-dim font-normal">(optional)</span></label>
        <textarea id="showcase-description" v-model.trim="description" maxlength="500" rows="3" placeholder="A quick note that helps the recipient understand this selection." class="mt-2 w-full px-3 py-3 rounded-lg border border-border bg-surface text-main placeholder:text-dim outline-none focus:ring-2 focus:ring-main/20 focus:border-main resize-y" />
      </section>

      <section class="border border-border rounded-xl bg-card p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-end gap-2 justify-between">
          <div>
            <p class="text-[11px] uppercase tracking-widest font-bold text-dim">2 · Choose the route</p>
            <h2 class="mt-2 font-bold text-main">{{ selectedIds.length }} selected</h2>
          </div>
          <p class="text-xs text-dim">Tap a tour to add it. Use the arrows to set the viewing order.</p>
        </div>
        <div v-if="pendingSpaces" class="mt-5 space-y-2 animate-pulse"><div v-for="n in 3" :key="n" class="h-16 rounded-lg bg-surface-alt" /></div>
        <div v-else-if="!spaces.length" class="mt-5 p-5 rounded-lg bg-surface-alt text-sm text-dim">Create a tour first, then come back to build a Showcase.</div>
        <div v-else class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button v-for="space in spaces" :key="space.id" type="button" class="min-h-14 p-2 text-left border rounded-lg transition-colors flex gap-3 items-center" :class="isSelected(space.id) ? 'border-main bg-main/5' : 'border-border hover:bg-surface-alt'" @click="toggle(space.id)">
            <img v-if="space.cover_image_url" :src="space.cover_image_url" :alt="''" class="w-12 h-10 rounded object-cover bg-surface-alt" loading="lazy" />
            <span v-else class="w-12 h-10 rounded bg-surface-alt grid place-items-center"><UiIcon name="spaces" :size="16" class="text-dim" /></span>
            <span class="min-w-0 flex-1"><span class="block font-semibold text-sm text-main truncate">{{ space.title }}</span><span class="block text-[11px] text-dim mt-0.5">{{ space.is_published ? 'Published' : 'Draft' }}</span></span>
            <span v-if="isSelected(space.id)" class="w-6 h-6 rounded-full bg-main text-bg text-xs grid place-items-center font-bold">{{ selectedIds.indexOf(space.id) + 1 }}</span>
          </button>
        </div>
      </section>

      <section v-if="selectedTours.length" class="border border-border rounded-xl bg-card p-4 sm:p-6">
        <p class="text-[11px] uppercase tracking-widest font-bold text-dim">Viewing order</p>
        <ol class="mt-4 space-y-2">
          <li v-for="(space, index) in selectedTours" :key="space.id" class="min-h-14 px-3 py-2 bg-surface-alt rounded-lg flex items-center gap-3">
            <span class="font-mono text-xs text-dim w-5">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="min-w-0 flex-1 font-semibold text-sm text-main truncate">{{ space.title }}</span>
            <div class="flex gap-1">
              <button type="button" class="w-10 h-10 border border-border rounded-lg disabled:opacity-30 hover:bg-card" :disabled="index === 0" :aria-label="`Move ${space.title} earlier`" @click="move(index, -1)"><UiIcon name="chevron-left" :size="15" /></button>
              <button type="button" class="w-10 h-10 border border-border rounded-lg disabled:opacity-30 hover:bg-card" :disabled="index === selectedTours.length - 1" :aria-label="`Move ${space.title} later`" @click="move(index, 1)"><UiIcon name="chevron-right" :size="15" /></button>
            </div>
          </li>
        </ol>
      </section>

      <div class="sticky bottom-3 z-10 border border-border bg-card/95 backdrop-blur-sm rounded-xl p-3 flex flex-col-reverse sm:flex-row sm:items-center gap-3 justify-between shadow-sm">
        <label class="flex items-center gap-3 min-h-12 px-2 cursor-pointer text-sm text-main"><input v-model="isPublished" type="checkbox" class="w-4 h-4 accent-black" /><span><span class="font-semibold block">Publish when created</span><span class="text-xs text-dim">Only published Showcases have a public link.</span></span></label>
        <UiButton type="submit" variant="primary" :disabled="saving || !title || !selectedIds.length" class="w-full sm:w-auto">{{ saving ? 'Creating…' : 'Create Showcase' }}</UiButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ middleware: 'auth' })

const { spaces, pending: pendingSpaces, fetchSpaces } = useSpaces()
const { createShowcase } = useShowcases()
const titleInput = ref<HTMLInputElement | null>(null)
const title = ref('')
const description = ref('')
const selectedIds = ref<string[]>([])
const isPublished = ref(false)
const saving = ref(false)

await fetchSpaces()
onMounted(() => titleInput.value?.focus())

const selectedTours = computed(() => selectedIds.value.map((id) => spaces.value.find((space) => space.id === id)).filter(Boolean) as typeof spaces.value)
const isSelected = (id: string) => selectedIds.value.includes(id)

function toggle(id: string) {
  selectedIds.value = isSelected(id) ? selectedIds.value.filter((selected) => selected !== id) : [...selectedIds.value, id]
}

function move(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= selectedIds.value.length) return
  const next = [...selectedIds.value]
  ;[next[index], next[target]] = [next[target], next[index]]
  selectedIds.value = next
}

async function create() {
  if (!title.value || !selectedIds.value.length) return
  saving.value = true
  try {
    const showcase = await createShowcase({ title: title.value, description: description.value || null, property_ids: selectedIds.value, is_published: isPublished.value })
    toast.success(isPublished.value ? 'Showcase is live.' : 'Showcase saved as a draft.')
    await navigateTo(`/app/showcases/${showcase.id}`)
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Could not create the Showcase. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>
