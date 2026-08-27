import type { IconName } from '~/types/icon'

// Sellers type amenities as free text (see the amenity input in
// DetailsPanel.vue) — there's no fixed enum, so matching an icon means
// scanning for keywords rather than an exact lookup. First rule that
// matches wins, so more specific terms are listed before generic ones
// (e.g. "cctv"/"camera" before the broader "security").
const AMENITY_ICON_RULES: ReadonlyArray<{ icon: IconName; keywords: readonly string[] }> = [
  { icon: 'parking', keywords: ['parking', 'garage', 'carport'] },
  { icon: 'wifi', keywords: ['wifi', 'wi-fi', 'internet', 'broadband'] },
  { icon: 'pool', keywords: ['pool', 'swimming'] },
  { icon: 'camera', keywords: ['cctv', 'camera', 'surveillance'] },
  { icon: 'shield-check', keywords: ['security', 'guard', 'gated', 'alarm', 'fence'] },
  { icon: 'droplet', keywords: ['water', 'borehole', 'well'] },
  { icon: 'bolt', keywords: ['generator', 'backup power', 'solar', 'electricity', 'power'] },
  { icon: 'barbell', keywords: ['gym', 'fitness'] },
  { icon: 'paw', keywords: ['pet'] },
  { icon: 'elevator', keywords: ['elevator', 'lift'] },
  { icon: 'trees', keywords: ['garden', 'compound', 'yard', 'lawn'] },
  { icon: 'snowflake', keywords: ['air condition', 'air-condition', 'a/c', 'cooling'] },
  { icon: 'flame', keywords: ['heating', 'fireplace', 'gas cooker', 'gas stove'] },
  { icon: 'washing-machine', keywords: ['laundry', 'washing machine'] },
  { icon: 'sofa', keywords: ['furnished', 'furniture'] },
  { icon: 'building-community', keywords: ['community', 'clubhouse'] },
]

// Falls back to 'check' (a plain checkmark) for anything unrecognized —
// still communicates "this listing has it", just without a specific
// pictogram, rather than showing nothing or guessing wrong.
export function amenityIcon(label: string): IconName {
  const lower = label.toLowerCase()
  for (const rule of AMENITY_ICON_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.icon
  }
  return 'check'
}
