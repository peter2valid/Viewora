<template>
  <!-- Phone: one button opens the list as a drawer -->
  <button
    v-if="compact && !open"
    type="button"
    class="ar-open"
    :aria-expanded="false"
    aria-controls="area-rail-list"
    @click.stop="open = true"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
    Areas
  </button>

  <div v-if="compact && open" class="ar-scrim" @click.stop="open = false" />

  <nav
    v-if="!compact || open"
    id="area-rail-list"
    class="ar"
    :class="{ 'ar--drawer': compact }"
    aria-label="Areas of the hospital"
    @click.stop
    @pointerdown.stop
    @wheel.stop
  >
    <div class="ar-head">
      <span class="ar-head__title">Areas</span>
      <button v-if="compact" type="button" class="ar-close" aria-label="Close the list" @click="open = false">×</button>
    </div>

    <div class="ar-actions">
      <button v-if="hasVisits" type="button" class="ar-action" @click="pick('visits')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        Guided visits
      </button>
      <button
        v-if="areas.length > 1"
        type="button"
        class="ar-action"
        :class="{ 'is-on': showRoute }"
        :aria-expanded="showRoute"
        @click="toggleRoute"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>
        Directions
      </button>
    </div>

    <!-- "I'm at A, take me to B" -->
    <form v-if="showRoute" class="ar-route" @submit.prevent="go">
      <!-- Not native selects: those cut long names off. These wrap. -->
      <div v-for="f in fields" :key="f.key" class="ar-field">
        <span :id="`ar-${f.key}-label`">{{ f.label }}</span>
        <button
          type="button" class="ar-pick" :class="{ 'is-open': openField === f.key, 'is-empty': !f.value }"
          :aria-expanded="openField === f.key" :aria-labelledby="`ar-${f.key}-label`"
          @click="openField = openField === f.key ? null : f.key"
        >
          <span class="ar-pick__text">{{ f.text }}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <ul v-if="openField === f.key" class="ar-opts" role="listbox" :aria-labelledby="`ar-${f.key}-label`">
          <li v-for="o in f.options" :key="o.id">
            <button
              type="button" role="option" class="ar-opt" :class="{ 'is-on': o.id === f.value }"
              :aria-selected="o.id === f.value" :disabled="o.disabled"
              @click="choose(f.key, o.id)"
            >{{ o.title }}</button>
          </li>
        </ul>
      </div>
      <button type="submit" class="ar-go" :disabled="!to || to === fromScene">Walk me there</button>
    </form>

    <ul class="ar-list">
      <li v-for="a in areas" :key="a.sceneId">
        <button
          type="button"
          class="ar-item"
          :class="{ 'is-here': a.sceneId === activeSceneId }"
          :aria-current="a.sceneId === activeSceneId ? 'location' : undefined"
          :title="a.guide ? `${a.title}: hear about it` : a.title"
          @click="pick(a)"
        >
          <span class="ar-thumb">
            <img v-if="a.thumb" :src="a.thumb" alt="" loading="lazy" decoding="async">
            <svg v-if="a.guide" class="ar-thumb__play" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
          </span>
          <span class="ar-name">{{ a.title }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
// The list of areas down the left of a hospital tour (as on the Countess of
// Chester's tour): each photo the guided visits use, once. Choosing one walks
// there and plays its guide. Above the list: the guided visits, and
// directions from one area to another. On a phone it's a drawer.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TourArea } from '~/shared/utils/journey'

const props = defineProps<{
  areas: TourArea[]
  activeSceneId: string | null
  hasVisits: boolean
}>()
const emit = defineEmits<{
  (e: 'area', a: TourArea): void
  (e: 'visits'): void
  /** from: a scene id, or null = where the visitor stands. */
  (e: 'route', from: string | null, to: string): void
}>()

const compact = ref(false)
const open = ref(false)
let mq: MediaQueryList | null = null
const onMq = () => { compact.value = !!mq?.matches; if (!compact.value) open.value = false }
onMounted(() => {
  mq = window.matchMedia('(max-width: 900px), (max-height: 520px)')
  onMq()
  mq.addEventListener?.('change', onMq)
})
onBeforeUnmount(() => mq?.removeEventListener?.('change', onMq))

const showRoute = ref(false)
const from = ref<string>('__here')
const to = ref<string>('')
const fromScene = computed(() => (from.value === '__here' ? props.activeSceneId : from.value))
watch(() => props.activeSceneId, (id) => { if (!id && from.value === '__here') from.value = props.areas[0]?.sceneId ?? '' }, { immediate: true })

// From / To pickers
const openField = ref<'from' | 'to' | null>(null)
const titleOf = (id: string) => (id === '__here' ? 'Where I am now' : props.areas.find(a => a.sceneId === id)?.title ?? '')
const fields = computed(() => [
  {
    key: 'from' as const, label: 'From', value: from.value, text: titleOf(from.value) || 'Choose a place',
    options: [
      ...(props.activeSceneId ? [{ id: '__here', title: 'Where I am now', disabled: false }] : []),
      ...props.areas.map(a => ({ id: a.sceneId, title: a.title, disabled: false })),
    ],
  },
  {
    key: 'to' as const, label: 'To', value: to.value, text: titleOf(to.value) || 'Choose a place',
    options: props.areas.map(a => ({ id: a.sceneId, title: a.title, disabled: a.sceneId === fromScene.value })),
  },
])
function choose(key: 'from' | 'to', id: string) {
  if (key === 'from') {
    from.value = id
    if (to.value && to.value === fromScene.value) to.value = props.areas.find(a => a.sceneId !== fromScene.value)?.sceneId ?? ''
  } else {
    to.value = id
  }
  openField.value = null
}

function toggleRoute() {
  openField.value = null
  showRoute.value = !showRoute.value
  if (showRoute.value && !to.value) {
    // Suggest somewhere other than here.
    to.value = props.areas.find(a => a.sceneId !== fromScene.value)?.sceneId ?? ''
  }
}

function pick(a: TourArea | 'visits') {
  if (a === 'visits') emit('visits')
  else emit('area', a)
  open.value = false
}

function go() {
  if (!to.value || to.value === fromScene.value) return
  emit('route', from.value === '__here' ? null : from.value, to.value)
  showRoute.value = false
  open.value = false
}
</script>

<style scoped>
.ar {
  position: absolute; z-index: 47; top: 12px; left: 12px; max-height: calc(100% - 24px);
  width: 148px; display: flex; flex-direction: column; gap: 8px; padding: 10px 8px;
  border-radius: 16px; background: rgba(12, 14, 20, 0.62); color: #fff;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.25);
  font-family: inherit;
}
.ar--drawer {
  z-index: 60; top: 0; left: auto; right: 0; bottom: 0; max-height: none; width: min(300px, 82vw); border-radius: 18px 0 0 18px;
  padding: calc(14px + env(safe-area-inset-top, 0px)) 12px calc(14px + env(safe-area-inset-bottom, 0px));
  background: rgba(12, 14, 20, 0.92);
}
.ar-scrim { position: absolute; inset: 0; z-index: 59; background: rgba(0, 0, 0, 0.35); }
.ar-open {
  /* Top right: the tour's brand card is top left. */
  position: absolute; z-index: 47; top: calc(12px + env(safe-area-inset-top, 0px)); right: 12px;
  display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px;
  border: 0; border-radius: 999px; background: rgba(12, 14, 20, 0.72); color: #fff;
  font: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}

.ar-head { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; }
.ar-head__title { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 255, 255, 0.7); }
.ar-close { width: 32px; height: 32px; border: 0; border-radius: 10px; background: rgba(255, 255, 255, 0.1); color: #fff; font-size: 22px; line-height: 1; cursor: pointer; }

.ar-actions { display: grid; gap: 6px; }
.ar-action {
  display: flex; align-items: center; gap: 7px; width: 100%; min-height: 36px; padding: 6px 10px;
  border: 0; border-radius: 10px; background: rgba(255, 255, 255, 0.12); color: #fff;
  font: inherit; font-size: 13px; font-weight: 700; text-align: left; cursor: pointer;
}
.ar-action:hover, .ar-action.is-on { background: #fff; color: #111827; }

.ar-route { flex-shrink: 0; display: grid; gap: 8px; padding: 10px 8px; border-radius: 12px; background: rgba(255, 255, 255, 0.08); }
.ar-field { display: grid; gap: 3px; font-size: 11px; font-weight: 700; color: rgba(255, 255, 255, 0.7); }
.ar-pick {
  display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%; min-height: 34px;
  padding: 6px 8px; border: 0; border-radius: 8px; background: #fff; color: #111827;
  font: inherit; font-size: 13px; font-weight: 600; line-height: 1.25; text-align: left; cursor: pointer;
}
.ar-pick__text { min-width: 0; overflow-wrap: anywhere; }
.ar-pick.is-empty { color: #6b7280; }
.ar-pick svg { flex-shrink: 0; transition: transform 0.15s; }
.ar-pick.is-open svg { transform: rotate(180deg); }
.ar-opts {
  list-style: none; margin: 4px 0 0; padding: 4px; display: grid; gap: 2px; border-radius: 8px;
  background: #fff; max-height: 220px; overflow-y: auto; overscroll-behavior: contain;
}
.ar-opt {
  display: block; width: 100%; padding: 7px 8px; border: 0; border-radius: 6px; background: transparent;
  color: #111827; font: inherit; font-size: 13px; font-weight: 600; line-height: 1.25; text-align: left;
  overflow-wrap: anywhere; cursor: pointer;
}
.ar-opt:hover:not(:disabled) { background: #f3f4f6; }
.ar-opt.is-on { background: #ffe4e6; color: #be123c; }
.ar-opt:disabled { color: #9ca3af; cursor: default; }
.ar-go {
  min-height: 36px; border: 0; border-radius: 10px; background: #e11d48; color: #fff;
  font: inherit; font-size: 13px; font-weight: 800; cursor: pointer;
}
.ar-go:disabled { opacity: 0.45; cursor: default; }

.ar-list { list-style: none; margin: 0; padding: 2px 0; display: grid; gap: 4px; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
.ar-item {
  display: flex; flex-direction: column; align-items: center; gap: 5px; width: 100%; padding: 6px 4px;
  border: 0; border-radius: 12px; background: transparent; color: #fff; font: inherit; cursor: pointer;
}
.ar-item:hover { background: rgba(255, 255, 255, 0.1); }
.ar-item.is-here { background: rgba(255, 255, 255, 0.16); }
.ar-thumb {
  position: relative; display: block; width: 64px; height: 64px; border-radius: 50%; overflow: hidden;
  background: rgba(255, 255, 255, 0.15); box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85);
}
.ar-item.is-here .ar-thumb { box-shadow: 0 0 0 3px #e11d48; }
.ar-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ar-thumb__play {
  position: absolute; right: 2px; bottom: 2px; padding: 3px; box-sizing: content-box;
  border-radius: 50%; background: #e11d48; color: #fff;
}
.ar-name { max-width: 100%; font-size: 12.5px; font-weight: 600; line-height: 1.25; text-align: center; overflow-wrap: anywhere; }
.ar-item.is-here .ar-name { font-weight: 800; }

/* Drawer: rows instead of a column of circles */
.ar--drawer .ar-item { flex-direction: row; justify-content: flex-start; gap: 12px; padding: 6px 8px; }
.ar--drawer .ar-thumb { width: 48px; height: 48px; flex-shrink: 0; }
.ar--drawer .ar-name { text-align: left; font-size: 14px; }
</style>
