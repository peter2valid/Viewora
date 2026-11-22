<template>
  <div class="max-w-3xl mx-auto pb-10">
    <UiPageHeader :title="showcase?.title || 'Showcase'" subtitle="Keep the public collection focused and in the right order.">
      <template #actions>
        <NuxtLink to="/app/showcases" class="h-11 px-4 inline-flex items-center justify-center text-sm font-semibold text-dim hover:text-main">All Showcases</NuxtLink>
      </template>
    </UiPageHeader>

    <div v-if="pending" class="space-y-4 animate-pulse"><div class="h-40 rounded-xl bg-card" /><div class="h-56 rounded-xl bg-card" /></div>
    <template v-else-if="showcase">
      <section class="border border-border rounded-xl bg-card p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div><p class="text-[11px] uppercase tracking-widest font-bold text-dim">Public status</p><p class="mt-1 font-bold text-main">{{ showcase.is_published ? 'Live and shareable' : 'Draft — only you can see it' }}</p></div>
          <UiButton :variant="showcase.is_published ? 'secondary' : 'primary'" @click="togglePublish">{{ showcase.is_published ? 'Unpublish' : 'Publish Showcase' }}</UiButton>
        </div>
        <div v-if="showcase.is_published" class="mt-5 flex flex-col sm:flex-row gap-2">
          <input :value="publicUrl" readonly class="flex-1 h-11 px-3 text-sm rounded-lg border border-border bg-surface text-main min-w-0" aria-label="Public Showcase link" />
          <UiButton variant="secondary" @click="copyLink">{{ copied ? 'Copied' : 'Copy link' }}</UiButton>
          <a :href="publicUrl" target="_blank" rel="noopener" class="h-11 px-4 inline-flex justify-center items-center border border-border rounded-lg text-sm font-semibold text-main hover:bg-surface-alt">Open</a>
        </div>
      </section>

      <section class="mt-5 border border-border rounded-xl bg-card p-4 sm:p-6">
        <label class="text-sm font-semibold text-main" for="edit-title">Name</label>
        <input id="edit-title" v-model.trim="title" maxlength="120" class="mt-2 w-full h-12 px-3 rounded-lg border border-border bg-surface text-main outline-none focus:ring-2 focus:ring-main/20" />
        <label class="block mt-5 text-sm font-semibold text-main" for="edit-description">Introduction</label>
        <textarea id="edit-description" v-model.trim="description" rows="3" maxlength="500" class="mt-2 w-full px-3 py-3 rounded-lg border border-border bg-surface text-main outline-none focus:ring-2 focus:ring-main/20 resize-y" />
        <div class="mt-5 flex justify-end"><UiButton variant="secondary" :disabled="saving" @click="saveDetails">{{ saving ? 'Saving…' : 'Save details' }}</UiButton></div>
      </section>

      <section class="mt-5 border border-border rounded-xl bg-card p-4 sm:p-6">
        <div class="flex items-end justify-between gap-3"><div><p class="text-[11px] uppercase tracking-widest font-bold text-dim">Viewing order</p><h2 class="mt-1 font-bold text-main">{{ selectedIds.length }} tours</h2></div><NuxtLink to="/app/spaces" class="text-xs font-semibold text-dim hover:text-main">Manage tours</NuxtLink></div>
        <ol class="mt-4 space-y-2">
          <li v-for="(tour, index) in selectedTours" :key="tour.id" class="min-h-14 px-3 py-2 bg-surface-alt rounded-lg flex items-center gap-3"><span class="font-mono text-xs text-dim w-5">{{ String(index + 1).padStart(2, '0') }}</span><span class="min-w-0 flex-1 font-semibold text-sm text-main truncate">{{ tour.title }}</span><div class="flex gap-1"><button type="button" class="w-10 h-10 border border-border rounded-lg disabled:opacity-30 hover:bg-card" :disabled="index === 0" @click="move(index, -1)"><UiIcon name="chevron-left" :size="15" /></button><button type="button" class="w-10 h-10 border border-border rounded-lg disabled:opacity-30 hover:bg-card" :disabled="index === selectedTours.length - 1" @click="move(index, 1)"><UiIcon name="chevron-right" :size="15" /></button></div></li>
        </ol>
        <div class="mt-5 flex justify-end"><UiButton variant="secondary" :disabled="saving" @click="saveOrder">Save order</UiButton></div>
      </section>
    </template>
    <UiEmptyState v-else icon="grid" title="Showcase not found" description="It may have been deleted or you may not have access to it."><template #actions><NuxtLink to="/app/showcases" class="btn btn-primary">Back to Showcases</NuxtLink></template></UiEmptyState>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ middleware: 'auth' })
const route = useRoute()
const config = useRuntimeConfig()
const { fetchShowcase, updateShowcase } = useShowcases()
const showcase = ref<Showcase | null>(null)
const pending = ref(true)
const saving = ref(false)
const copied = ref(false)
const title = ref('')
const description = ref('')
const selectedIds = ref<string[]>([])

const id = computed(() => String(route.params.id || ''))
const publicUrl = computed(() => `${String(config.public.appUrl).replace(/\/$/, '')}/showcase/${showcase.value?.slug || ''}`)
const selectedTours = computed(() => selectedIds.value.map((tourId) => showcase.value?.tours?.find((tour) => tour.id === tourId)).filter(Boolean) as ShowcaseTour[])

try {
  const data = await fetchShowcase(id.value)
  showcase.value = data
  title.value = data.title
  description.value = data.description || ''
  selectedIds.value = (data.tours || []).map((tour) => tour.id)
} catch { showcase.value = null } finally { pending.value = false }

function move(index: number, direction: -1 | 1) { const next = [...selectedIds.value]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; selectedIds.value = next }
async function saveDetails() { if (!showcase.value || !title.value) return; saving.value = true; try { const updated = await updateShowcase(showcase.value.id, { title: title.value, description: description.value || null }); showcase.value = { ...showcase.value, ...updated }; toast.success('Showcase details saved.') } catch (error: any) { toast.error(error?.data?.statusMessage || 'Could not save Showcase details.') } finally { saving.value = false } }
async function saveOrder() { if (!showcase.value) return; saving.value = true; try { await updateShowcase(showcase.value.id, { property_ids: selectedIds.value }); showcase.value = { ...showcase.value, tours: selectedTours.value.map((tour, position) => ({ ...tour, position })) }; toast.success('Viewing order saved.') } catch (error: any) { toast.error(error?.data?.statusMessage || 'Could not save order.') } finally { saving.value = false } }
async function togglePublish() { if (!showcase.value) return; saving.value = true; try { const updated = await updateShowcase(showcase.value.id, { is_published: !showcase.value.is_published }); showcase.value = { ...showcase.value, ...updated }; toast.success(showcase.value.is_published ? 'Showcase is live.' : 'Showcase unpublished.') } catch (error: any) { toast.error(error?.data?.statusMessage || 'Could not change publishing status.') } finally { saving.value = false } }
async function copyLink() { try { await navigator.clipboard.writeText(publicUrl.value); copied.value = true; setTimeout(() => { copied.value = false }, 1800) } catch { toast.error('Could not copy the link.') } }
</script>
