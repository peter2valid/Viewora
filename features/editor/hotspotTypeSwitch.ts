// Changing an existing hotspot's type (Move ⇄ Info ⇄ Media ⇄ Link) without
// losing what the owner typed. Pure — tested in tests/hotspotTypeSwitch.test.ts.
// The server checks the same rules (viewora-backend src/utils/hotspotType.ts).

import type { EditDraft, HotspotType } from './hotspotPayload'

export type UserHotspotType = 'move' | 'info' | 'media' | 'link'

export const USER_HOTSPOT_TYPES: Array<{ key: UserHotspotType; label: string; hint: string }> = [
  { key: 'move',  label: 'Move',  hint: 'Go to another scene' },
  { key: 'info',  label: 'Info',  hint: 'Title and description' },
  { key: 'media', label: 'Media', hint: 'Play a video' },
  { key: 'link',  label: 'Link',  hint: 'Open a website, call or WhatsApp' },
]

const AUTO_LABELS = new Set(['', 'go to next room', 'see interior', 'info hotspot'])
const YOUTUBE = /youtu(\.be|be\.com)/i

export function userTypeOf(type: HotspotType): UserHotspotType {
  if (type === 'scene_link') return 'move'
  if (type === 'video' || type === 'youtube') return 'media'
  if (type === 'url') return 'link'
  return 'info'
}

/**
 * Returns the draft as the new type. Label, description and URL carry over;
 * a label the editor filled in by itself is swapped for the new type's one.
 * `defaultTargetId` is the room a Move goes to when it had none before.
 */
export function switchDraftType(d: EditDraft, to: UserHotspotType, defaultTargetId = ''): EditDraft {
  if (userTypeOf(d.type) === to || d.kind) return d

  const url = d.url.trim()
  const type: HotspotType =
    to === 'move'  ? 'scene_link' :
    to === 'link'  ? 'url' :
    to === 'media' ? (YOUTUBE.test(url) ? 'youtube' : 'video') :
    'info'

  const wasMove = d.type === 'scene_link'
  const isMove  = type === 'scene_link'
  const autoLabel = AUTO_LABELS.has(d.label.trim().toLowerCase())

  return {
    ...d,
    type,
    // Kept while not a Move (never saved then — see buildHotspotPayload), so switching back restores it.
    targetSceneId: isMove ? (d.targetSceneId || defaultTargetId) : d.targetSceneId,
    linkStyle:     isMove ? d.linkStyle : undefined,
    // Floor arrows and info icons are different sets: crossing over resets to the type's default.
    icon:          wasMove !== isMove ? '' : d.icon,
    label:         autoLabel ? (isMove ? 'Go to next room' : '') : d.label,
    // A Media link must be a video; a website URL would not play.
    url:           to === 'media' && url && !looksLikeVideo(url) ? '' : d.url,
  }
}

function looksLikeVideo(url: string): boolean {
  return YOUTUBE.test(url) || /vimeo\.com|\.(mp4|webm|mov|m3u8)(\?|$)/i.test(url)
}

/** What still stops this draft saving, in words the owner can act on. Null = ready. */
export function draftProblem(d: EditDraft): string | null {
  if (d.kind) return null
  const url = d.url.trim()
  if (d.type === 'scene_link' && !d.targetSceneId) return 'Pick the room this hotspot goes to.'
  if (d.type === 'url' && !url) return 'Add the link this hotspot opens.'
  if ((d.type === 'video' || d.type === 'youtube') && !url) return 'Paste the video link first.'
  return null
}
