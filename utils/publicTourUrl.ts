// Where a listing's real public link points depends on what it actually
// has and where the share/publish action was triggered from:
//
// - No 360 scenes at all (photo-only) → always view.viewora.software.
//   The classic /p/[slug] page (pages/p/[slug].vue) is built entirely
//   around PsvViewer/360 scenes with no gallery-carousel fallback, so it
//   dead-ends ("No Scenes Yet") for a gallery-only listing even when
//   published. /view/p/[slug] renders both panorama and gallery-only
//   listings correctly.
// - 360 scenes, no gallery photos → always app.viewora.software/p/. There's
//   nothing to lose by using the classic single-tour page here.
// - Both 360 scenes and gallery photos → depends on context: the 360° Tour
//   tab (EditorShell) shares the classic app.viewora.software experience
//   since that's what's actually being edited there; the Details tab
//   shares the richer view.viewora.software split-screen experience
//   (price/facts/contact/gallery) since Details is about the listing as a
//   whole, not just the panorama.
export function resolvePublicTourUrl(
  space: { slug?: string | null; id: string; has_360?: boolean | null; has_gallery?: boolean | null },
  context: 'tour' | 'details',
): string {
  const slug = space.slug || space.id
  const hasScenes = !!space.has_360
  const hasGallery = !!space.has_gallery

  if (!hasScenes) return `https://view.viewora.software/view/p/${slug}`
  if (!hasGallery) return `https://app.viewora.software/p/${slug}`
  return context === 'tour'
    ? `https://app.viewora.software/p/${slug}`
    : `https://view.viewora.software/view/p/${slug}`
}
