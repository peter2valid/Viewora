<template>
  <div class="vp-root">
    <input ref="oneInput" type="file" accept="image/jpeg,image/png,image/webp" class="vp-hidden" @change="onOne" />
    <input ref="manyInput" type="file" accept="image/jpeg,image/png,image/webp" multiple class="vp-hidden" @change="onMany" />

    <header class="vp-head">
      <NuxtLink to="/app/spaces" class="vp-back" title="Back to spaces" aria-label="Back to spaces">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </NuxtLink>
      <div class="vp-head__text">
        <h1 class="vp-title">Car exterior</h1>
        <p class="vp-sub">Normal photos, no 360° camera. Walk around the car and shoot each angle from the same distance. Buyers drag to turn it.</p>
      </div>
    </header>

    <div v-if="loading" class="vp-center"><span class="vp-spin" /></div>

    <div v-else-if="setupError" class="vp-center">
      <p class="vp-strong">Car photos aren't set up yet</p>
      <p class="vp-muted">{{ setupError }}</p>
      <button class="vp-btn" @click="init">Try again</button>
    </div>

    <div v-else class="vp-body">
      <div class="vp-progress">
        <p class="vp-progress__text">
          <strong class="vp-num">{{ filledSlots }} of {{ VEHICLE_SLOTS.length }}</strong> main angles added
          <span v-if="extras.length" class="vp-num"> · {{ extras.length }} extra</span>
        </p>
        <div class="vp-progress__actions">
          <button class="vp-btn vp-btn--primary" :disabled="busy" @click="manyInput?.click()">
            {{ views.length ? 'Add several photos' : 'Add all photos at once' }}
          </button>
        </div>
      </div>
      <p v-if="!views.length" class="vp-muted vp-bulkhint">
        Picking many at once? Choose them in this order: {{ VEHICLE_SLOTS.map(s => s.label).join(', ') }}. We fill the empty angles in that order, and you can swap any of them after.
      </p>

      <ul class="vp-grid">
        <li v-for="slot in VEHICLE_SLOTS" :key="slot.key" class="vp-slot" :class="{ 'is-filled': !!viewAt(slot.angle) }">
          <div class="vp-slot__img">
            <img v-if="viewAt(slot.angle)" :src="viewAt(slot.angle)!.image_url" :alt="slot.label" loading="lazy" />
            <div v-else class="vp-slot__empty">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: `rotate(${slot.angle}deg)` }" aria-hidden="true"><path d="M12 3v18M12 3l-4 5M12 3l4 5"/></svg>
            </div>
            <div v-if="pendingAngles.has(slot.angle)" class="vp-slot__busy"><span class="vp-spin" /></div>
          </div>
          <div class="vp-slot__meta">
            <p class="vp-slot__name">{{ slot.label }}</p>
            <p class="vp-slot__hint">{{ slot.hint }}</p>
            <div class="vp-slot__actions">
              <button class="vp-btn" :class="{ 'vp-btn--primary': !viewAt(slot.angle) }" :disabled="busy" @click="pick(slot.angle, viewAt(slot.angle)?.id)">
                {{ viewAt(slot.angle) ? 'Replace' : 'Add photo' }}
              </button>
              <button v-if="viewAt(slot.angle)" class="vp-btn vp-btn--danger" :disabled="busy" @click="remove(viewAt(slot.angle)!.id)">Remove</button>
            </div>
          </div>
        </li>
      </ul>

      <section class="vp-extras">
        <h2 class="vp-h2">Extra angles</h2>
        <p class="vp-muted">More photos make the turn smoother. Pick the angle, then add the photo. Up to {{ VEHICLE_MAX_VIEWS }} in total.</p>
        <div class="vp-extra-add">
          <label class="vp-label" for="vp-angle">Angle</label>
          <select id="vp-angle" v-model.number="extraAngle" class="vp-select">
            <option v-for="a in extraAngleOptions" :key="a.angle" :value="a.angle">{{ a.text }}</option>
          </select>
          <button class="vp-btn" :disabled="busy || views.length >= VEHICLE_MAX_VIEWS" @click="pick(extraAngle)">Add photo</button>
        </div>
        <ul v-if="extras.length" class="vp-extralist">
          <li v-for="v in extras" :key="v.id" class="vp-extra">
            <img :src="v.image_url" :alt="viewLabel(v)" loading="lazy" />
            <span class="vp-num">{{ v.angle }}° · {{ viewLabel(v) }}</span>
            <button class="vp-btn vp-btn--danger" :disabled="busy" @click="remove(v.id)">Remove</button>
          </li>
        </ul>
      </section>

      <p v-if="errorMsg" class="vp-error" role="alert">{{ errorMsg }}</p>

      <div class="vp-next">
        <NuxtLink :to="{ query: { tab: 'tour' } }" class="vp-link">Next: add the interior as a 360° photo →</NuxtLink>
        <NuxtLink :to="{ query: { tab: 'details' } }" class="vp-link">Then: Details &amp; Publish →</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useVehicleViews } from '~/features/vehicle/useVehicleViews'
import { VEHICLE_SLOTS, VEHICLE_MAX_VIEWS, viewLabel, nearestSlot, type VehicleView } from '~/shared/utils/vehicleViews'

const props = defineProps<{ spaceId: string }>()

const { views, loading, load, addView, removeView, replaceView } = useVehicleViews(props.spaceId)

const oneInput = ref<HTMLInputElement | null>(null)
const manyInput = ref<HTMLInputElement | null>(null)
const setupError = ref('')
const errorMsg = ref('')
const busy = ref(false)
const pendingAngles = ref<Set<number>>(new Set())
const extraAngle = ref(15)
let pickAngle = 0
let pickReplaceId: string | undefined

const slotAngles = new Set(VEHICLE_SLOTS.map(s => s.angle))
function viewAt(angle: number): VehicleView | undefined {
  return views.value.find(v => v.angle === angle)
}
const filledSlots = computed(() => VEHICLE_SLOTS.filter(s => viewAt(s.angle)).length)
const extras = computed(() => views.value.filter(v => !slotAngles.has(v.angle)))

// Every 15° that isn't taken, described by the main angle it sits closest to.
const extraAngleOptions = computed(() => {
  const out: Array<{ angle: number; text: string }> = []
  for (let a = 0; a < 360; a += 15) {
    if (slotAngles.has(a) || views.value.some(v => v.angle === a)) continue
    out.push({ angle: a, text: `${a}° · near ${nearestSlot(a).label.toLowerCase()}` })
  }
  return out
})

async function init() {
  setupError.value = ''
  try {
    await load()
  } catch (e: any) {
    setupError.value = /404|not found|relation|table/i.test(e?.message || '')
      ? 'The database update for car photos has not been applied yet.'
      : (e?.data?.statusMessage || e?.message || 'Could not load car photos.')
  }
}
onMounted(init)

function pick(angle: number, replaceId?: string) {
  pickAngle = angle
  pickReplaceId = replaceId
  if (oneInput.value) { oneInput.value.value = ''; oneInput.value.click() }
}

async function withBusy(angle: number, fn: () => Promise<unknown>) {
  busy.value = true
  errorMsg.value = ''
  pendingAngles.value = new Set(pendingAngles.value).add(angle)
  try {
    await fn()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.message || 'Upload failed'
    errorMsg.value = `${msg}. Check your connection and try that photo again.`
    toast.error(msg)
  } finally {
    const next = new Set(pendingAngles.value); next.delete(angle); pendingAngles.value = next
    busy.value = false
  }
}

async function onOne(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const angle = pickAngle
  const rid = pickReplaceId
  await withBusy(angle, () => (rid ? replaceView(rid, file) : addView(file, angle)))
}

async function onMany(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  ;(e.target as HTMLInputElement).value = ''
  if (!files.length) return
  const free = VEHICLE_SLOTS.filter(s => !viewAt(s.angle))
  if (files.length > free.length) {
    errorMsg.value = `Only ${free.length} main angle${free.length === 1 ? ' is' : 's are'} still empty. The first ${free.length} photo${free.length === 1 ? '' : 's'} will be used; add the rest as extra angles.`
  }
  for (let i = 0; i < Math.min(files.length, free.length); i++) {
    await withBusy(free[i].angle, () => addView(files[i], free[i].angle))
    if (errorMsg.value && /Check your connection/.test(errorMsg.value)) break
  }
}

async function remove(id: string) {
  const v = views.value.find(x => x.id === id)
  if (!v) return
  await withBusy(v.angle, () => removeView(id))
}

defineExpose({ reload: init })
</script>

<style scoped>
.vp-root { position: absolute; inset: 0; overflow-y: auto; background: #0e0e10; color: #f2f2f3; padding: 140px 16px 40px; }
.vp-hidden { display: none; }
.vp-head { max-width: 960px; margin: 0 auto 20px; display: flex; gap: 12px; align-items: flex-start; }
.vp-back { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; color: #fff; background: rgba(255,255,255,0.08); flex: none; }
.vp-title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.vp-sub, .vp-muted { margin: 6px 0 0; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.62); max-width: 62ch; }
.vp-center { max-width: 420px; margin: 80px auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.vp-strong { font-weight: 700; margin: 0; }
.vp-body { max-width: 960px; margin: 0 auto; }
.vp-num { font-variant-numeric: tabular-nums; }
.vp-progress { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.vp-progress__text { margin: 0; font-size: 14px; }
.vp-bulkhint { margin: 0 0 16px; }
.vp-grid { list-style: none; margin: 16px 0 32px; padding: 0; display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 640px) { .vp-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1000px) { .vp-grid { grid-template-columns: repeat(4, 1fr); } }
.vp-slot { display: flex; gap: 12px; padding: 10px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: #161619; }
.vp-slot.is-filled { border-color: rgba(255,255,255,0.22); }
.vp-slot__img { position: relative; width: 112px; aspect-ratio: 4 / 3; flex: none; border-radius: 8px; overflow: hidden; background: #0b0b0c; }
.vp-slot__img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.vp-slot__empty { position: absolute; inset: 0; display: grid; place-items: center; color: rgba(255,255,255,0.35); }
.vp-slot__busy { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,0.55); }
.vp-slot__meta { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.vp-slot__name { margin: 0; font-size: 14px; font-weight: 700; }
.vp-slot__hint { margin: 0; font-size: 12px; line-height: 1.4; color: rgba(255,255,255,0.55); }
.vp-slot__actions { margin-top: auto; padding-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
@media (min-width: 1000px) {
  .vp-slot { flex-direction: column; }
  .vp-slot__img { width: 100%; }
}
.vp-btn {
  min-height: 44px; padding: 0 14px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer;
  background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.12);
  transition: background 120ms;
}
.vp-btn:hover:not(:disabled) { background: rgba(255,255,255,0.18); }
.vp-btn:active:not(:disabled) { background: rgba(255,255,255,0.26); }
.vp-btn:focus-visible, .vp-select:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.vp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.vp-btn--primary { background: #fff; color: #0e0e10; border-color: #fff; }
.vp-btn--primary:hover:not(:disabled) { background: #e6e6e8; }
.vp-btn--danger { color: #ff9b9b; }
.vp-extras { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
.vp-h2 { margin: 0; font-size: 15px; font-weight: 800; }
.vp-extra-add { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
.vp-label { font-size: 13px; color: rgba(255,255,255,0.7); }
.vp-select { min-height: 44px; padding: 0 10px; border-radius: 10px; background: #161619; color: #fff; border: 1px solid rgba(255,255,255,0.18); font-size: 13px; max-width: 100%; }
.vp-extralist { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 8px; }
.vp-extra { display: flex; align-items: center; gap: 12px; font-size: 13px; }
.vp-extra img { width: 64px; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 6px; }
.vp-extra .vp-num { flex: 1; min-width: 0; }
.vp-error { margin: 16px 0 0; padding: 10px 12px; border-radius: 10px; background: rgba(255,90,90,0.12); color: #ffb4b4; font-size: 13px; }
.vp-next { margin-top: 28px; display: flex; gap: 20px; flex-wrap: wrap; }
.vp-link { color: #fff; font-size: 13px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
.vp-spin { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff; border-radius: 50%; animation: vp-rot 0.8s linear infinite; display: inline-block; }
@keyframes vp-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .vp-spin { animation-duration: 2s; } .vp-btn { transition: none; } }
</style>
