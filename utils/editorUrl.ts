// Where clicking a space in the dashboard (pages/app/spaces/index.vue)
// should land in the editor — whichever content tab actually has
// something in it, so a photo-only listing doesn't dump the seller into
// an empty 360° tab (and vice versa) and waste their time. Mirrors
// pages/view/p/[slug].vue's ownerEditHref, which does the same thing for
// the buyer-facing page's owner-only Edit button, just driven by the
// has_360/has_gallery flags already on the dashboard's space list rather
// than a fetched scenes array.
export function editorHref(space: { id: string; has_360?: boolean; has_gallery?: boolean }): string {
  if (!space.has_360 && space.has_gallery) return `/app/spaces/${space.id}?tab=photos`
  return `/app/spaces/${space.id}`
}
