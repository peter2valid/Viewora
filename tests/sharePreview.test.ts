import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isPreviewBot, previewHtml, shareRoute } from '../server/utils/sharePreview.ts'

const meta = {
  slug: 'toyota', title: 'Toyota', vehicle: '2018 Toyota Prado TX', description: null,
  image: { url: 'https://media.viewora.software/og/a/b.jpg', width: 1200, height: 630 }, white_label: false, space_type: 'automotive',
}

test('share preview: chat and social crawlers only, not people or search engines', () => {
  assert.ok(isPreviewBot('WhatsApp/2.23.20.0 A'))
  assert.ok(isPreviewBot('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'))
  assert.ok(isPreviewBot('Mozilla/5.0 (compatible; Twitterbot/1.0)'))
  assert.ok(isPreviewBot('TelegramBot (like TwitterBot)'))
  assert.ok(!isPreviewBot('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'))
  assert.ok(!isPreviewBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'))
  assert.ok(!isPreviewBot(undefined))
})

test('share preview: only the share pages', () => {
  assert.deepEqual(shareRoute('/spin/toyota'), { kind: 'spin', slug: 'toyota' })
  assert.deepEqual(shareRoute('/view/p/toyota?utm_source=wa'), { kind: 'view', slug: 'toyota' })
  assert.deepEqual(shareRoute('/p/simba-saloon/'), { kind: 'p', slug: 'simba-saloon' })
  assert.deepEqual(shareRoute('/embed/toyota'), { kind: 'embed', slug: 'toyota' })
  assert.equal(shareRoute('/app/spaces/123'), null)
  assert.equal(shareRoute('/p/toyota/extra'), null)
  assert.equal(shareRoute('/spin/"><script>'), null)
})

test('share preview: the tags carry the cached picture and its size', () => {
  const html = previewHtml(meta, 'spin', '/spin/toyota', 'https://app.viewora.software/')
  assert.match(html, /<meta property="og:image" content="https:\/\/media\.viewora\.software\/og\/a\/b\.jpg">/)
  assert.match(html, /og:image:width" content="1200"/)
  assert.match(html, /og:url" content="https:\/\/app\.viewora\.software\/spin\/toyota"/)
  assert.match(html, /<title>2018 Toyota Prado TX — Viewora<\/title>/)
  assert.match(html, /twitter:card" content="summary_large_image"/)
})

test('share preview: white-label has no Viewora name; text is escaped', () => {
  const html = previewHtml({ ...meta, white_label: true, vehicle: null, title: 'A "quoted" <b>name</b>', description: 'x & y' }, 'view', '/view/p/toyota', 'https://app.viewora.software')
  assert.ok(!/Viewora/.test(html.replace(/viewora\.software/g, '')), 'no Viewora branding')
  assert.match(html, /A &quot;quoted&quot; &lt;b&gt;name&lt;\/b&gt;/)
  assert.match(html, /x &amp; y/)
})
