import { encodeQueryItem, joinURL } from 'ufo'
import { createOperationsGenerator, defineProvider } from '@nuxt/image/runtime'

/**
 * Cloudflare Images transformations on the media zone:
 *   https://media.viewora.software/cdn-cgi/image/width=1024,format=webp,…/<path>
 *
 * Only images on the media domain are resized — anything else (local /public
 * files like /globe-icon.png, external avatars) is returned untouched, which the
 * stock `cloudflare` provider would instead rewrite onto the media domain.
 *
 * Every URL carries onerror=redirect: if Cloudflare can't transform the image
 * (free quota used up, bad source…) it 307s to the original instead of failing,
 * so a quota can never black out a tour again (see the Vercel 402 outage).
 */
const operationsGenerator = createOperationsGenerator({
  keyMap: {
    width: 'width',
    height: 'height',
    quality: 'quality',
    format: 'format',
    fit: 'fit',
  },
  valueMap: {
    fit: {
      cover: 'cover',
      contain: 'contain',
      fill: 'scale-down',
      outside: 'crop',
      inside: 'pad',
    },
  },
  joinWith: ',',
  formatter: (key: string, value: string | number) => encodeQueryItem(key, value),
})

export default defineProvider<{ baseURL?: string }>({
  getImage: (src, { modifiers, baseURL = 'https://media.viewora.software' }) => {
    if (!src.startsWith(`${baseURL}/`)) return { url: src }
    const operations = operationsGenerator({ ...modifiers, onerror: 'redirect' } as any)
    return { url: joinURL(baseURL, 'cdn-cgi/image', operations, src.slice(baseURL.length + 1)) }
  },
})
