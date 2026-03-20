export default defineNuxtRouteMiddleware((to) => {
  // Redirect /app/properties/* to /app/spaces/*
  if (to.path.startsWith('/app/properties')) {
    const newPath = to.path.replace('/app/properties', '/app/spaces')
    return navigateTo(newPath, { redirectCode: 301 })
  }
})
