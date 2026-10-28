<template>
  <div />
</template>

<script setup lang="ts">
// Short links staff send in DMs and print on QR codes: /q/:code opens the
// quote form, which looks the code up and fills in what the link carries.
// A redirect on the server, so it works before any JS loads.
definePageMeta({ layout: false })

const runtime = useRuntimeConfig().public
if (!runtime.quoteEngine) throw createError({ statusCode: 404, statusMessage: 'Not found' })

const route = useRoute()
const code = String(route.params.code ?? '')
await navigateTo(
  { path: '/quote', query: { ...route.query, ...(/^[A-Za-z0-9_-]{3,40}$/.test(code) ? { e: code } : {}) } },
  { replace: true, redirectCode: 302 },
)
</script>
