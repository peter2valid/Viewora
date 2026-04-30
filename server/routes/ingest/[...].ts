import { proxyRequest } from 'h3'

export default defineEventHandler(async (event) => {
  const target = 'https://us.i.posthog.com'
  return proxyRequest(event, `${target}${event.path.replace(/^\/ingest/, '')}`)
})
