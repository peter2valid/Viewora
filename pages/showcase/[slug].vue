<template>
  <main class="showcase-shell">
    <header class="showcase-header">
      <NuxtLink to="/" class="showcase-brand" aria-label="Viewora home"><span class="showcase-mark">V</span><span>Viewora</span></NuxtLink>
      <span class="showcase-kicker">Curated virtual tours</span>
    </header>

    <section v-if="pending" class="showcase-frame" aria-busy="true">
      <div class="showcase-skeleton showcase-skeleton--hero" />
      <div class="showcase-skeleton showcase-skeleton--line" />
      <div class="showcase-skeleton showcase-skeleton--line short" />
      <div class="showcase-grid"><div v-for="n in 4" :key="n" class="showcase-skeleton showcase-skeleton--card" /></div>
    </section>

    <section v-else-if="showcase" class="showcase-frame">
      <div class="showcase-hero">
        <img v-if="showcase.cover_image || showcase.tours[0]?.cover_image_url" :src="showcase.cover_image || showcase.tours[0]?.cover_image_url" :alt="''" fetchpriority="high" class="showcase-hero__image" />
        <div v-else class="showcase-hero__fallback"><span v-for="n in 12" :key="n" /></div>
        <div class="showcase-hero__shade" />
        <div class="showcase-hero__body"><p class="showcase-eyebrow">{{ showcase.tours.length }} selected tour{{ showcase.tours.length === 1 ? '' : 's' }}</p><h1>{{ showcase.title }}</h1><p v-if="showcase.description">{{ showcase.description }}</p></div>
      </div>

      <div v-if="showcase.tours.length" class="showcase-intro"><p>Start with the highlighted tour, or choose a stop below. Each tour opens only when you select it, keeping this page quick on mobile data.</p><a :href="tourUrl(showcase.tours[0])" class="showcase-primary">Start with {{ showcase.tours[0].title }} <span aria-hidden="true">→</span></a></div>

      <ol v-if="showcase.tours.length" class="showcase-grid">
        <li v-for="tour in showcase.tours" :key="tour.id" class="showcase-card">
          <a :href="tourUrl(tour)" class="showcase-card__link">
            <div class="showcase-card__image"><img v-if="tour.cover_image_url" :src="tour.cover_image_url" :alt="''" loading="lazy" /><div v-else class="showcase-card__placeholder" /><span class="showcase-card__number">{{ String(tour.position + 1).padStart(2, '0') }}</span></div>
            <div class="showcase-card__body"><h2>{{ tour.title }}</h2><p>{{ tour.location_text || typeLabel(tour.property_type) }}</p><span>Open tour <span aria-hidden="true">→</span></span></div>
          </a>
        </li>
      </ol>
      <div v-else class="showcase-empty"><h1>This Showcase is being prepared</h1><p>The owner has not added a public tour yet. Please check back shortly.</p></div>
    </section>

    <section v-else class="showcase-missing"><div><p class="showcase-eyebrow">Not available</p><h1>This Showcase isn’t public</h1><p>It may have been unpublished, moved, or the link may be incomplete.</p><NuxtLink to="/" class="showcase-primary">Visit Viewora</NuxtLink></div></section>
    <footer class="showcase-footer">Presented with <NuxtLink to="/">Viewora</NuxtLink></footer>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

type PublicTour = { id: string; title: string; slug: string | null; cover_image_url: string | null; property_type: string | null; location_text: string | null; position: number }
type PublicShowcase = { title: string; slug: string; description: string | null; cover_image: string | null; tours: PublicTour[] }

const route = useRoute()
const { apiFetch } = useApiFetch()
const analytics = useAnalytics()
const slug = computed(() => String(route.params.slug || ''))
const { data, pending } = await useAsyncData(`showcase-${slug.value}`, () => apiFetch<PublicShowcase>(`/showcases/${encodeURIComponent(slug.value)}`), { default: () => null })
const showcase = computed(() => data.value)

useSeoMeta({
  title: () => showcase.value ? `${showcase.value.title} — Viewora Showcase` : 'Viewora Showcase',
  description: () => showcase.value?.description || 'A curated collection of Viewora virtual tours.',
  ogTitle: () => showcase.value ? `${showcase.value.title} — Viewora` : 'Viewora Showcase',
  ogDescription: () => showcase.value?.description || 'A curated collection of Viewora virtual tours.',
  ogImage: () => showcase.value?.cover_image || showcase.value?.tours[0]?.cover_image_url || undefined,
})

onMounted(() => {
  if (showcase.value) analytics.track('showcase_opened', { showcase_slug: showcase.value.slug, tour_count: showcase.value.tours.length })
})

function tourUrl(tour: PublicTour) { return tour.slug ? `/p/${tour.slug}` : '/' }
function typeLabel(type: string | null) { return type ? type.replace(/-/g, ' ') : 'Virtual tour' }
</script>

<style scoped>
.showcase-shell { --ink: var(--vo-text); --muted: var(--vo-secondary); --line: var(--vo-border); --ground: var(--vo-page); --surface: var(--vo-surface); min-height: 100vh; background: var(--ground); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
.showcase-header { max-width: 1120px; margin: 0 auto; min-height: 72px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid var(--line); }
.showcase-brand { display: inline-flex; align-items: center; gap: 9px; color: var(--ink); text-decoration: none; font-weight: 800; letter-spacing: -.03em; }.showcase-mark { display: grid; place-items: center; width: 26px; height: 26px; color: var(--vo-inverse); background: var(--ink); border-radius: 7px; font-size: 12px; }.showcase-kicker, .showcase-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; font-weight: 700; color: var(--muted); }.showcase-frame { width: min(100% - 32px, 1080px); margin: 28px auto 0; }.showcase-hero { min-height: 410px; position: relative; display: flex; align-items: end; overflow: hidden; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); }.showcase-hero__image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }.showcase-hero__shade { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 26%, rgba(0,0,0,.8)); }.showcase-hero__fallback { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 2px; background: var(--surface); }.showcase-hero__fallback span { background: var(--vo-elevated); }.showcase-hero__body { position: relative; padding: 26px; max-width: 720px; color: white; }.showcase-hero__body .showcase-eyebrow { color: rgba(255,255,255,.72); }.showcase-hero h1, .showcase-empty h1, .showcase-missing h1 { margin: 8px 0 0; line-height: 1.02; letter-spacing: -.05em; font-size: clamp(2.25rem, 6vw, 4.75rem); }.showcase-hero__body p:last-child { margin: 14px 0 0; max-width: 60ch; color: rgba(255,255,255,.88); line-height: 1.55; }.showcase-intro { display: flex; gap: 24px; justify-content: space-between; align-items: center; padding: 24px 0; border-bottom: 1px solid var(--line); }.showcase-intro p { max-width: 62ch; margin: 0; color: var(--muted); font-size: 14px; line-height: 1.55; }.showcase-primary { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 18px; border-radius: 8px; background: var(--ink); color: var(--vo-inverse); text-decoration: none; font-size: 14px; font-weight: 750; transition: transform 150ms ease, opacity 150ms ease; }.showcase-primary:hover { transform: translateY(-1px); opacity: .9; }.showcase-grid { list-style: none; margin: 26px 0 0; padding: 0 0 40px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }.showcase-card { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--surface); }.showcase-card__link { color: inherit; text-decoration: none; display: block; height: 100%; }.showcase-card__image { position: relative; aspect-ratio: 4 / 3; background: var(--vo-elevated); overflow: hidden; }.showcase-card__image img { width: 100%; height: 100%; object-fit: cover; transition: transform 180ms ease; }.showcase-card__link:hover img { transform: scale(1.025); }.showcase-card__placeholder { position: absolute; inset: 0; background: repeating-linear-gradient(135deg, var(--vo-elevated) 0 12px, var(--surface) 12px 24px); }.showcase-card__number { position: absolute; top: 10px; left: 10px; min-width: 29px; height: 25px; padding: 0 7px; display: grid; place-items: center; background: rgba(255,255,255,.94); color: #111; font: 700 11px ui-monospace, SFMono-Regular, Menlo, monospace; border-radius: 5px; }.showcase-card__body { padding: 15px; }.showcase-card__body h2 { margin: 0; font-size: 15px; letter-spacing: -.015em; line-height: 1.3; }.showcase-card__body p { margin: 6px 0 0; color: var(--muted); font-size: 12px; text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }.showcase-card__body > span { display: block; margin-top: 17px; color: var(--ink); font-size: 12px; font-weight: 700; }.showcase-empty, .showcase-missing { max-width: 600px; margin: 120px auto; text-align: center; padding: 0 20px; }.showcase-empty p, .showcase-missing p { color: var(--muted); line-height: 1.6; }.showcase-missing .showcase-primary { margin-top: 20px; }.showcase-footer { max-width: 1120px; margin: 0 auto; border-top: 1px solid var(--line); padding: 22px 20px 38px; color: var(--muted); font-size: 12px; }.showcase-footer a { color: inherit; font-weight: 700; }.showcase-skeleton { position: relative; overflow: hidden; background: var(--surface); border-radius: 8px; }.showcase-skeleton::after { content: ''; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, var(--vo-elevated), transparent); animation: shine 1.6s ease-in-out infinite; }.showcase-skeleton--hero { height: 410px; border-radius: 14px; }.showcase-skeleton--line { height: 16px; width: 55%; margin-top: 25px; }.showcase-skeleton--line.short { width: 33%; margin-top: 10px; }.showcase-skeleton--card { height: 250px; } @keyframes shine { to { transform: translateX(100%); } } @media (max-width: 720px) { .showcase-header { min-height: 62px; }.showcase-kicker { display: none; }.showcase-frame { width: min(100% - 24px, 1080px); margin-top: 12px; }.showcase-hero { min-height: 430px; }.showcase-hero__body { padding: 20px; }.showcase-intro { align-items: stretch; flex-direction: column; padding: 20px 0; }.showcase-primary { width: 100%; }.showcase-grid { grid-template-columns: 1fr; gap: 12px; margin-top: 18px; }.showcase-card__link { display: grid; grid-template-columns: 125px 1fr; }.showcase-card__image { aspect-ratio: auto; min-height: 128px; }.showcase-card__body { align-self: center; }.showcase-card__body > span { margin-top: 10px; } } @media (prefers-reduced-motion: reduce) { .showcase-card__image img, .showcase-primary, .showcase-skeleton::after { transition: none; animation: none; } }
</style>
