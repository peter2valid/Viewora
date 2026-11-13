// Run with: tsx --test tests/hotspotTypeSwitch.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { switchDraftType, draftProblem, userTypeOf } from '../features/editor/hotspotTypeSwitch.ts'
import { buildHotspotPayload, type EditDraft } from '../features/editor/hotspotPayload.ts'

const base: EditDraft = {
  label: '', description: '', url: '', targetSceneId: '', type: 'info', icon: '',
  labelColor: '', labelBold: false, scale: 1, hoverScale: 1.3, strokeScale: 1, imageUrl: '',
}

test('Move → Info drops the destination and the floor icon, keeps typed text', () => {
  const move = { ...base, type: 'scene_link' as const, targetSceneId: 's2', icon: 'nav-floor-up', label: 'Kitchen', linkStyle: 'interior' as const }
  const info = switchDraftType(move, 'info')
  assert.equal(info.type, 'info')
  assert.equal(buildHotspotPayload(info, { yaw: 0, pitch: 0 }).target_scene_id, undefined, 'destination not saved')
  assert.equal(switchDraftType(info, 'move', 's9').targetSceneId, 's2', 'switching back restores the room')
  assert.equal(info.icon, '')
  assert.equal(info.linkStyle, undefined)
  assert.equal(info.label, 'Kitchen')
})

test('Info → Move gets a destination and the default label', () => {
  const move = switchDraftType({ ...base, label: 'Info hotspot', icon: 'star-yellow' }, 'move', 's3')
  assert.equal(move.type, 'scene_link')
  assert.equal(move.targetSceneId, 's3')
  assert.equal(move.label, 'Go to next room')
  assert.equal(move.icon, '')
})

test('Media picks YouTube from the link and clears a non-video link', () => {
  assert.equal(switchDraftType({ ...base, type: 'url', url: 'https://youtu.be/abc' }, 'media').type, 'youtube')
  const web = switchDraftType({ ...base, type: 'url', url: 'https://example.co.ke' }, 'media')
  assert.equal(web.type, 'video')
  assert.equal(web.url, '')
})

test('Link ⇄ Info keeps the URL and icon', () => {
  const link = switchDraftType({ ...base, url: 'tel:+254700000000', icon: 'star-yellow' }, 'link')
  assert.equal(link.type, 'url')
  assert.equal(link.url, 'tel:+254700000000')
  assert.equal(link.icon, 'star-yellow')
})

test('land markers and same-type picks are left alone', () => {
  const plot = { ...base, kind: 'plot' as const }
  assert.equal(switchDraftType(plot, 'move', 's2'), plot)
  assert.equal(switchDraftType(base, 'info'), base)
  assert.equal(userTypeOf('youtube'), 'media')
})

test('draftProblem says what is missing', () => {
  assert.match(draftProblem({ ...base, type: 'scene_link' })!, /room/)
  assert.match(draftProblem({ ...base, type: 'url' })!, /link/)
  assert.match(draftProblem({ ...base, type: 'video' })!, /video/)
  assert.equal(draftProblem({ ...base, type: 'url', url: 'https://x.co' }), null)
})
