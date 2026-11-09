<template>
  <section class="csc" aria-labelledby="csc-title">
    <div class="csc__head">
      <h2 id="csc-title" class="csc__title">Your car tour</h2>
      <span class="csc__count">{{ doneCount }} of {{ steps.length }}</span>
    </div>
    <p class="csc__lead">
      Add each part below. Viewora puts them together into one tour: buyers spin the car, step inside, flick through the close-ups.
    </p>
    <ol class="csc__list">
      <li v-for="st in steps" :key="st.key" class="csc__item" :class="{ 'is-done': st.done, 'is-next': nextStep?.key === st.key }">
        <span class="csc__n" aria-hidden="true">
          <svg v-if="st.done" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17 19 7"/></svg>
          <template v-else>{{ st.n }}</template>
        </span>
        <div class="csc__body">
          <p class="csc__name">
            {{ st.title }}<span v-if="st.optional" class="csc__opt"> · optional</span>
            <span class="sr-only">{{ st.done ? ' (done)' : '' }}</span>
          </p>
          <p class="csc__status">{{ st.status }}</p>
        </div>
        <NuxtLink
          v-if="st.tab !== currentTab || st.key === 'publish'"
          :to="{ query: { tab: st.tab } }"
          class="csc__go"
          :aria-label="`${st.done ? 'Edit' : 'Do'} ${st.title}`"
        >{{ st.done ? 'Edit' : nextStep?.key === st.key ? 'Start' : 'Open' }}</NuxtLink>
      </li>
    </ol>
    <a v-if="tourUrl" :href="tourUrl" target="_blank" rel="noopener" class="csc__cta">Open the car tour ↗</a>
    <NuxtLink v-else :to="{ query: { tab: 'details' } }" class="csc__cta csc__cta--quiet">Publish to see the full tour</NuxtLink>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useCarSetup } from '~/features/vehicle/useCarSetup'

const props = defineProps<{ spaceId: string; currentTab: string }>()
const { steps, doneCount, nextStep, tourUrl, refresh } = useCarSetup(props.spaceId)
onMounted(refresh)
defineExpose({ refresh })
</script>

<style scoped>
.csc {
  padding: 14px; border-radius: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
}
.csc__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.csc__title { margin: 0; font-size: 15px; font-weight: 800; }
.csc__count { font-size: 12px; color: rgba(255,255,255,0.6); font-variant-numeric: tabular-nums; }
.csc__lead { margin: 6px 0 10px; font-size: 12.5px; line-height: 1.45; color: rgba(255,255,255,0.66); }
.csc__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.csc__item {
  display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px;
}
.csc__item.is-next { background: rgba(255,255,255,0.07); }
.csc__n {
  width: 24px; height: 24px; border-radius: 50%; flex: none; display: grid; place-items: center;
  font-size: 11px; font-weight: 800; border: 1.5px solid rgba(255,255,255,0.5); color: #fff;
}
.csc__item.is-done .csc__n { background: #3ccf7a; border-color: #3ccf7a; color: #06210f; }
.csc__body { flex: 1; min-width: 0; }
.csc__name { margin: 0; font-size: 13px; font-weight: 700; }
.csc__opt { font-weight: 500; color: rgba(255,255,255,0.55); }
.csc__status { margin: 1px 0 0; font-size: 12px; color: rgba(255,255,255,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.csc__go {
  flex: none; min-height: 36px; min-width: 56px; padding: 0 12px; border-radius: 9px; display: inline-grid; place-items: center;
  font-size: 12px; font-weight: 700; color: #fff; text-decoration: none;
  background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.12);
}
.csc__item.is-next .csc__go { background: #fff; color: #0e0e10; border-color: #fff; }
.csc__go:focus-visible, .csc__cta:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.csc__cta {
  margin-top: 10px; display: flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 10px;
  background: #fff; color: #0e0e10; font-size: 13px; font-weight: 800; text-decoration: none;
}
.csc__cta--quiet { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.18); font-weight: 700; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
