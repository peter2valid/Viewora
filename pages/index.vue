<script setup>
const user = useSupabaseUser()
if (user.value) {
  navigateTo('/app')
} else {
  navigateTo('/login')
}
</script>
<template><div></div></template>
