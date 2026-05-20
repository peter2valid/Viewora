// Patches @pinia/nuxt@0.11.3 plugin to fix Nuxt 3.21 incompatibility.
// useNuxtApp() has no async context inside defineNuxtPlugin's hooks:{} block in Nuxt 3.21+.
// Fix: register the app:rendered hook inside setup() using the captured nuxtApp closure.
const fs = require('fs')
const path = require('path')

const pluginPath = path.join(__dirname, '../node_modules/@pinia/nuxt/dist/runtime/plugin.vue3.js')

const patched = `import { createPinia, setActivePinia } from "pinia";
import { defineNuxtPlugin } from "#app";
import { toRaw } from "vue";
const plugin = defineNuxtPlugin({
  name: "pinia",
  setup(nuxtApp) {
    const pinia = createPinia();
    nuxtApp.vueApp.use(pinia);
    setActivePinia(pinia);
    if (nuxtApp.payload && nuxtApp.payload.pinia) {
      pinia.state.value = nuxtApp.payload.pinia;
    }
    // Fix: capture nuxtApp from closure — useNuxtApp() has no context in Nuxt 3.21 plugin hooks
    nuxtApp.hook("app:rendered", () => {
      nuxtApp.payload.pinia = toRaw(pinia).state.value;
      setActivePinia(void 0);
    });
    return {
      provide: {
        pinia
      }
    };
  }
});
export default plugin;
`

try {
  fs.writeFileSync(pluginPath, patched)
  console.log('✓ @pinia/nuxt plugin patched for Nuxt 3.21 compatibility')
} catch (e) {
  console.warn('⚠ Could not patch @pinia/nuxt plugin:', e.message)
}
