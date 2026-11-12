import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carFrontFrame, tourShareImage } from '../shared/utils/shareImage.ts'

test('share image: the API preview wins, with its size', () => {
  const img = tourShareImage({ share_image: { url: 'https://media/og/a.jpg', width: 1200, height: 630 }, space: { cover_image_url: 'https://m/c.jpg' } })
  assert.deepEqual(img, { url: 'https://media/og/a.jpg', width: 1200, height: 630 })
})

test('share image: a car falls back to its front exterior frame', () => {
  const tour = { space: {}, vehicle_spins: [{ start_angle: 0, views: [
    { angle: 180, image_url: 'https://m/back.jpg' }, { angle: 358, image_url: 'https://m/front.jpg' },
  ] }] }
  assert.equal(carFrontFrame(tour), 'https://m/front.jpg')
  assert.deepEqual(tourShareImage(tour), { url: 'https://m/front.jpg' })
})

test('share image: other listings fall back to cover, room, gallery; nothing gives null', () => {
  assert.equal(tourShareImage({ space: { cover_image_url: 'https://m/c.jpg' } })?.url, 'https://m/c.jpg')
  assert.equal(tourShareImage({ space: {}, scenes: [{ thumbnail_url: 'https://m/s.jpg' }] })?.url, 'https://m/s.jpg')
  assert.equal(tourShareImage({ space: {}, gallery: [{ url: 'https://m/g.jpg' }] })?.url, 'https://m/g.jpg')
  assert.equal(tourShareImage({ space: {} }), null)
})
