import { HOTSPOT_ICON_DEFS } from '~/shared/utils/hotspotIcons'

export default defineNuxtPlugin(() => {
  HOTSPOT_ICON_DEFS.forEach(({ url }) => {
    const img = new Image()
    img.src = url
  })
})
