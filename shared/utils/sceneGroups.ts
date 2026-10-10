// Categories ("Kitchen", "Master bedroom", "Phase 2 plots"…) turn the flat
// scene strip into a directory: one folder card per category; opening it shows
// that category's shots plus a back card. Scenes without a category stay as
// normal cards, so tours that never use categories look exactly as before.

export const GROUP_ITEM_PREFIX = 'group:'
export const BACK_ITEM_ID = 'group:__back'

export const CATEGORY_SUGGESTIONS = [
  'Entrance', 'Living room', 'Kitchen', 'Dining', 'Master bedroom', 'Bedroom', 'Bathroom',
  'Balcony', 'Outside', 'Compound', 'Aerial', 'Access road', 'Phase 1', 'Phase 2',
]

export interface GroupableScene {
  id: string
  label: string
  group?: string | null
  imageUrl?: string | null
  badge?: 'loading' | 'failed' | 'warn' | null
  tooltip?: string | null
}

export interface DockEntry {
  id: string
  label: string
  imageUrl?: string | null
  ariaLabel?: string
  badge?: 'loading' | 'failed' | 'warn' | null
  tooltip?: string | null
  kind?: 'group' | 'back'
  count?: number
}

export function normalizeGroup(g: string | null | undefined): string {
  return (g ?? '').trim()
}

export function hasGroups(scenes: GroupableScene[]): boolean {
  // A category only becomes a folder when it holds 2+ shots; a single-shot
  // category is shown as a normal card (a folder of one is just friction).
  const counts = new Map<string, number>()
  for (const s of scenes) {
    const g = normalizeGroup(s.group)
    if (g) counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  return [...counts.values()].some(n => n >= 2)
}

export function groupOf(scenes: GroupableScene[], sceneId: string): string | null {
  const g = normalizeGroup(scenes.find(s => s.id === sceneId)?.group)
  if (!g) return null
  return scenes.filter(s => normalizeGroup(s.group) === g).length >= 2 ? g : null
}

export function scenesInGroup(scenes: GroupableScene[], group: string): GroupableScene[] {
  return scenes.filter(s => normalizeGroup(s.group) === group)
}

/**
 * Dock entries for the current folder state. `openGroup` = the category being
 * browsed, or null for the top level. `activeItemId` is what the dock should
 * highlight (the folder card when the active shot is inside a closed folder).
 */
export function buildDockEntries(
  scenes: GroupableScene[],
  openGroup: string | null,
  activeSceneId: string,
): { items: DockEntry[]; activeItemId: string } {
  const toEntry = (s: GroupableScene): DockEntry => ({
    id: s.id, label: s.label, imageUrl: s.imageUrl, badge: s.badge ?? null, tooltip: s.tooltip ?? null,
    ariaLabel: `Go to ${s.label}`,
  })

  if (!hasGroups(scenes)) return { items: scenes.map(toEntry), activeItemId: activeSceneId }

  if (openGroup) {
    const inGroup = scenesInGroup(scenes, openGroup)
    if (inGroup.length >= 2) {
      return {
        items: [
          { id: BACK_ITEM_ID, label: 'All rooms', kind: 'back', ariaLabel: 'Back to all rooms' },
          ...inGroup.map((s, i) => ({ ...toEntry(s), label: s.label || `${openGroup} ${i + 1}` })),
        ],
        activeItemId: activeSceneId,
      }
    }
  }

  // Top level: folders appear where their first shot sits in the tour order.
  const items: DockEntry[] = []
  const seen = new Set<string>()
  for (const s of scenes) {
    const g = groupOf(scenes, s.id)
    if (!g) { items.push(toEntry(s)); continue }
    if (seen.has(g)) continue
    seen.add(g)
    const members = scenesInGroup(scenes, g)
    items.push({
      id: `${GROUP_ITEM_PREFIX}${g}`,
      label: g,
      imageUrl: members.find(m => m.imageUrl)?.imageUrl ?? null,
      kind: 'group',
      count: members.length,
      ariaLabel: `Open ${g} (${members.length} shots)`,
      badge: members.some(m => m.badge === 'failed') ? 'failed' : null,
    })
  }
  const activeGroup = groupOf(scenes, activeSceneId)
  return { items, activeItemId: activeGroup ? `${GROUP_ITEM_PREFIX}${activeGroup}` : activeSceneId }
}

/** "Kitchen · 2 of 3" style position label for a scene inside a category. */
export function positionLabel(scenes: GroupableScene[], sceneId: string): string | null {
  const g = groupOf(scenes, sceneId)
  if (!g) return null
  const members = scenesInGroup(scenes, g)
  const i = members.findIndex(m => m.id === sceneId)
  return `${g} · ${i + 1} of ${members.length}`
}
