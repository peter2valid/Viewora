export default defineNuxtRouteMiddleware((to) => {
  // Redirect /app/properties/* to /app/spaces/*
  if (to.path.startsWith('/app/properties')) {
    const newPath = to.path.replace('/app/properties', '/app/spaces')
    return navigateTo(newPath, { redirectCode: 301 })
  }

  // tst.viewora.software is a second domain on the same Vercel project, used
  // for social-media demo/ad traffic. Its root should land straight on the
  // demo page instead of the normal / -> /app or /login redirect.
  const host = useRequestURL().hostname
  if (host === 'tst.viewora.software' && to.path === '/') {
    return navigateTo('/demo/house', { redirectCode: 302 })
  }
})
