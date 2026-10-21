<template>
  <Transition name="panel-slide">
    <aside
      v-if="isOpen"
      class="ai-panel editor-glass fixed z-40 flex flex-col pointer-events-auto shadow-2xl overflow-hidden
             inset-x-4 bottom-24 max-h-[78vh] rounded-[2rem]
             sm:inset-auto sm:right-5 sm:top-1/2 sm:-translate-y-1/2 sm:w-[380px] sm:max-h-[88vh] sm:rounded-3xl"
      aria-label="AI assistant"
    >
      <!-- Header -->
      <div class="ai-header">
        <div>
          <p class="ai-title">AI Assistant</p>
          <p v-if="usage" class="ai-meter">
            {{ meter(usage.prompts) }} requests · {{ usage.imageEdits.limit === 0 ? 'no photo edits on ' + usage.planName : meter(usage.imageEdits) + ' photo edits' }} this month
          </p>
        </div>
        <div class="ai-header__actions">
          <button v-if="messages.length" class="ai-icon-btn" aria-label="New conversation" title="New conversation" @click="clearConversation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button class="ai-icon-btn" aria-label="Close AI assistant" @click="emit('close')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Scope -->
      <div class="ai-scope" role="tablist" aria-label="What should the AI work on?">
        <button
          v-for="opt in scopeOptions"
          :key="opt.value"
          role="tab"
          :aria-selected="scope === opt.value"
          class="ai-scope__btn"
          :class="{ 'ai-scope__btn--on': scope === opt.value }"
          :disabled="opt.value !== 'tour' && !sceneId"
          @click="setScope(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
      <p class="ai-scope__hint">
        <template v-if="scope === 'tour'">Works across every scene and your listing text.</template>
        <template v-else-if="scope === 'scene'">Works on <strong>{{ sceneName || 'this scene' }}</strong>.</template>
        <template v-else>
          <template v-if="region">Area selected on <strong>{{ sceneName || 'this scene' }}</strong> · <button class="ai-link" @click="startDrawing">Redraw</button></template>
          <template v-else-if="isDrawing">Drag a box on the photo…</template>
          <template v-else><button class="ai-link" @click="startDrawing">Draw an area</button> on the photo first.</template>
        </template>
      </p>

      <!-- Body -->
      <div ref="bodyEl" class="ai-body">
        <div v-if="!messages.length" class="ai-empty">
          <p class="ai-empty__title">What would you like to change?</p>
          <div class="ai-chips">
            <button v-for="s in suggestions" :key="s" class="ai-chip" @click="prompt = s">{{ s }}</button>
          </div>
        </div>

        <div v-for="(m, i) in messages" :key="i" class="ai-msg" :class="`ai-msg--${m.role}`">{{ m.text }}</div>
        <div v-if="isSending" class="ai-msg ai-msg--ai ai-msg--typing"><span /><span /><span /></div>

        <!-- Proposed edits -->
        <template v-if="applicable.length">
          <p class="ai-section">Proposed changes</p>
          <ul class="ai-list">
            <li v-for="p in applicable" :key="p.id" class="ai-item" :class="{ 'ai-item--danger': p.kind === 'delete_hotspot' }">
              <label class="ai-item__label">
                <input type="checkbox" class="ai-check" :checked="selected.has(p.id)" @change="toggle(p.id)" />
                <span>
                  <span class="ai-item__summary">{{ p.summary }}</span>
                  <span v-if="p.payload?.content?.text" class="ai-item__detail">“{{ p.payload.content.text }}”</span>
                  <span v-if="p.kind === 'update_listing' && p.payload?.description" class="ai-item__detail ai-item__detail--long">{{ p.payload.description }}</span>
                  <span v-if="p.why" class="ai-item__why">{{ p.why }}</span>
                </span>
              </label>
            </li>
          </ul>
          <button class="ai-btn ai-btn--primary ai-btn--block" :disabled="isApplying || !selectedCount" @click="emit('apply')">
            <span v-if="isApplying" class="ai-spinner" />
            <template v-else>Apply {{ selectedCount }} change{{ selectedCount === 1 ? '' : 's' }}</template>
          </button>
        </template>

        <!-- Photo edits -->
        <template v-if="photoProposals.length">
          <p class="ai-section">Photo edits</p>
          <div v-for="p in photoProposals" :key="p.id" class="ai-photo">
            <p class="ai-item__summary">{{ p.instruction }}</p>
            <p v-if="p.why && p.why !== 'Your instruction'" class="ai-item__why">{{ p.why }}</p>

            <template v-if="photoEdits[p.id]?.status === 'idle'">
              <button class="ai-btn ai-btn--primary ai-btn--block" :disabled="!canEditPhotos" @click="previewPhotoEdit(p as any)">
                Preview edit · uses 1 photo edit{{ editsLeft !== null ? ` (${editsLeft} left)` : '' }}
              </button>
            </template>

            <p v-else-if="photoEdits[p.id]?.status === 'generating'" class="ai-status"><span class="ai-spinner" /> Editing the photo — about 20 seconds…</p>

            <template v-else-if="photoEdits[p.id]?.status === 'ready' || photoEdits[p.id]?.status === 'applying' || photoEdits[p.id]?.status === 'applied'">
              <div class="ai-compare">
                <img :src="showBefore[p.id] ? photoEdits[p.id].beforeUrl : photoEdits[p.id].afterUrl" alt="Edited area preview" class="ai-compare__img" />
                <button class="ai-compare__toggle" @pointerdown="showBefore[p.id] = true" @pointerup="showBefore[p.id] = false" @pointerleave="showBefore[p.id] = false">
                  Hold to see before
                </button>
              </div>
              <div v-if="photoEdits[p.id].status === 'ready'" class="ai-row">
                <button class="ai-btn ai-btn--secondary" @click="discardPhotoEdit(p.id)">Discard</button>
                <button class="ai-btn ai-btn--primary" @click="emit('apply-photo', p)">Apply to photo</button>
              </div>
              <p v-else-if="photoEdits[p.id].status === 'applying'" class="ai-status"><span class="ai-spinner" /> Applying to the full photo — about a minute…</p>
              <p v-else class="ai-status ai-status--ok">✓ Applied. You can restore the original photo any time.</p>
            </template>

            <template v-else-if="photoEdits[p.id]?.status === 'error'">
              <p class="ai-error">{{ photoEdits[p.id].error }}</p>
              <div class="ai-row">
                <button class="ai-btn ai-btn--secondary" @click="discardPhotoEdit(p.id)">Dismiss</button>
                <button v-if="!photoEdits[p.id].editId" class="ai-btn ai-btn--primary" :disabled="!canEditPhotos" @click="previewPhotoEdit(p as any)">Try again</button>
              </div>
            </template>
          </div>
        </template>

        <p v-if="usage && usage.imageEdits.limit === 0 && scope !== 'tour'" class="ai-note">
          Removing or adding objects in photos is available on paid plans.
        </p>
      </div>

      <!-- Composer -->
      <div class="ai-composer">
        <p v-if="error" class="ai-error">{{ error }}</p>
        <textarea
          v-model="prompt"
          class="ai-input"
          rows="2"
          maxlength="1000"
          :placeholder="placeholder"
          :disabled="isSending"
          @keydown.enter.exact.prevent="send(sceneId)"
        />
        <div class="ai-row">
          <button
            v-if="scope === 'region'"
            class="ai-btn ai-btn--secondary"
            :disabled="!region || prompt.trim().length < 3 || !canEditPhotos || isSending"
            :title="canEditPhotos ? 'Send straight to the photo editor (uses 1 photo edit, no AI request)' : 'No photo edits left on your plan'"
            @click="sceneId && editDrawnArea(sceneId)"
          >
            🖌️ Edit photo
          </button>
          <button class="ai-btn ai-btn--primary" :disabled="isSending || prompt.trim().length < 2 || promptsLeft === 0" @click="send(sceneId)">
            <span v-if="isSending" class="ai-spinner" />
            <template v-else>Ask AI</template>
          </button>
        </div>
        <button v-if="sceneHasEdits && scope !== 'tour'" class="ai-link ai-restore" :disabled="restoring" @click="emit('revert-photo')">
          {{ restoring ? 'Restoring original photo…' : '↺ Restore this scene’s original photo' }}
        </button>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { AiAllowance, AiProposal, AiScope, useAiAssistant } from '~/features/editor/composables/useAiAssistant'

const props = defineProps<{
  ai: ReturnType<typeof useAiAssistant>
  sceneId: string | null
  sceneName: string
  spaceType?: string | null
  sceneHasEdits?: boolean
  restoring?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'apply'): void
  (e: 'apply-photo', p: AiProposal): void
  (e: 'revert-photo'): void
}>()

// Top-level bindings so the template unwraps the composable's refs
const {
  isOpen, scope, prompt, isSending, isApplying, error, messages, selected, usage,
  isDrawing, region, photoEdits, canEditPhotos, promptsLeft, editsLeft, applicable, photoProposals,
  setScope, startDrawing, send, toggle, previewPhotoEdit, editDrawnArea, discardPhotoEdit, clearConversation,
} = props.ai

const showBefore = reactive<Record<string, boolean>>({})
const bodyEl = ref<HTMLElement | null>(null)

const scopeOptions: Array<{ value: AiScope; label: string }> = [
  { value: 'tour',   label: 'Whole tour' },
  { value: 'scene',  label: 'This scene' },
  { value: 'region', label: 'An area' },
]

const selectedCount = computed(() => applicable.value.filter(p => selected.value.has(p.id)).length)

function meter(a: AiAllowance): string {
  return a.limit === null ? `${a.used} used` : `${a.used}/${a.limit}`
}

// What owners in each industry typically ask for
const INDUSTRY_TOUR: Record<string, string[]> = {
  residential: ['Add info hotspots for the best features in every room', 'Write a warmer listing description'],
  commercial:  ['Point out meeting rooms, reception and facilities', 'Write a listing description for businesses'],
  hospitality: ['Point out what guests will love in each room', 'Write a description that makes people want to stay'],
  education:   ['Show parents the key facilities in every scene', 'Write a description for parents'],
  automotive:  ['Highlight the interior and exterior features', 'Write a description for car buyers'],
  land:        ['Mark the access road, beacons and views', 'Write a description for land buyers'],
  other:       ['Point out what visitors should notice in each scene', 'Write a better listing description'],
}

const suggestions = computed(() => {
  const ind = INDUSTRY_TOUR[props.spaceType || 'other'] || INDUSTRY_TOUR.other
  if (scope.value === 'tour') return [...ind, 'Make all labels friendlier and consistent', 'Put every scene in the right category']
  if (scope.value === 'scene') return ['Point out the key features here', 'Fix any hotspots that look wrong', 'Choose the best opening view', 'Remove clutter from this scene']
  return ['Remove this', 'Add a hotspot explaining this', 'Add a potted plant here', 'Replace this with a neat bookshelf']
})

const placeholder = computed(() =>
  scope.value === 'tour'  ? 'e.g. “Add a hotspot on every kitchen appliance”'
  : scope.value === 'scene' ? 'e.g. “Remove the bucket by the door and label the fireplace”'
  : 'e.g. “Remove this chair” or “Put a stack of books here”',
)

// Keep the newest message in view
watch(() => [messages.value.length, isSending.value], async () => {
  await nextTick()
  bodyEl.value?.scrollTo({ top: bodyEl.value.scrollHeight, behavior: 'smooth' })
})
</script>

<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 26%, rgba(0,0,0,0.14) 100%),
    rgba(10, 12, 20, 0.42);
  backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  -webkit-backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  border: 1px solid rgba(255,255,255,0.14);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 28px 72px rgba(0, 0, 0, 0.42);
  color: #fff;
}

.ai-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  padding: 18px 18px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ai-title { font-size: 13px; font-weight: 800; letter-spacing: 0.02em; }
.ai-meter { margin-top: 3px; font-size: 10.5px; color: rgba(255,255,255,0.45); }
.ai-header__actions { display: flex; gap: 6px; }
.ai-icon-btn {
  width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center;
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7);
}
.ai-icon-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

.ai-scope { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: 12px 18px 0; padding: 3px; border-radius: 11px; background: rgba(255,255,255,0.05); }
.ai-scope__btn { height: 28px; border-radius: 8px; font-size: 11.5px; font-weight: 700; color: rgba(255,255,255,0.55); }
.ai-scope__btn--on { background: rgba(255,255,255,0.14); color: #fff; }
.ai-scope__btn:disabled { opacity: 0.35; cursor: not-allowed; }
.ai-scope__hint { margin: 8px 18px 0; font-size: 11px; color: rgba(255,255,255,0.5); }
.ai-link { color: #93c5fd; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
.ai-link:disabled { opacity: 0.5; }

.ai-body { flex: 1; min-height: 120px; overflow-y: auto; padding: 12px 18px; display: flex; flex-direction: column; gap: 8px; }
.ai-empty__title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
.ai-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ai-chip {
  padding: 6px 10px; border-radius: 999px; font-size: 11.5px; text-align: left;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.8);
}
.ai-chip:hover { background: rgba(255,255,255,0.12); }

.ai-msg { max-width: 88%; padding: 8px 12px; border-radius: 14px; font-size: 12.5px; line-height: 1.45; white-space: pre-wrap; }
.ai-msg--user { align-self: flex-end; background: #3b82f6; border-bottom-right-radius: 4px; }
.ai-msg--ai { align-self: flex-start; background: rgba(255,255,255,0.08); border-bottom-left-radius: 4px; }
.ai-msg--typing { display: flex; gap: 4px; padding: 12px 14px; }
.ai-msg--typing span { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.6); animation: ai-dot 1s infinite ease-in-out; }
.ai-msg--typing span:nth-child(2) { animation-delay: 0.15s; }
.ai-msg--typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes ai-dot { 0%, 80%, 100% { opacity: 0.25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }

.ai-section { margin-top: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.4); }
.ai-list { display: flex; flex-direction: column; gap: 6px; }
.ai-item { padding: 9px 10px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); }
.ai-item--danger { border-color: rgba(248,113,113,0.3); }
.ai-item__label { display: flex; gap: 9px; align-items: flex-start; cursor: pointer; }
.ai-check { margin-top: 2px; accent-color: #3b82f6; flex-shrink: 0; }
.ai-item__summary { display: block; font-size: 12px; font-weight: 600; line-height: 1.4; }
.ai-item__detail { display: block; margin-top: 3px; font-size: 11.5px; color: rgba(255,255,255,0.65); line-height: 1.4; }
.ai-item__detail--long { max-height: 120px; overflow-y: auto; white-space: pre-wrap; }
.ai-item__why { display: block; margin-top: 3px; font-size: 10.5px; color: rgba(255,255,255,0.4); }

.ai-photo { padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); display: flex; flex-direction: column; gap: 8px; }
.ai-compare { position: relative; border-radius: 10px; overflow: hidden; }
.ai-compare__img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; }
.ai-compare__toggle {
  position: absolute; left: 8px; bottom: 8px; padding: 5px 9px; border-radius: 999px;
  background: rgba(0,0,0,0.6); font-size: 10.5px; font-weight: 700; user-select: none; touch-action: none;
}

.ai-status { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: rgba(255,255,255,0.65); }
.ai-status--ok { color: #4ade80; }
.ai-error { font-size: 11.5px; color: #f87171; }
.ai-note { font-size: 11px; color: rgba(255,255,255,0.45); }

.ai-composer { padding: 12px 18px 16px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 8px; }
.ai-input {
  width: 100%; resize: none; padding: 10px 12px; border-radius: 12px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: #fff; font-size: 12.5px; line-height: 1.45;
}
.ai-input:focus { outline: none; border-color: #3b82f6; }
.ai-row { display: flex; gap: 8px; justify-content: flex-end; }
.ai-row .ai-btn { flex: 1; }
.ai-restore { align-self: center; font-size: 11px; }

.ai-btn {
  height: 34px; padding: 0 14px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 11.5px; font-weight: 800; transition: background 140ms, opacity 140ms;
}
.ai-btn--primary { background: #3b82f6; color: #fff; }
.ai-btn--primary:hover:not(:disabled) { background: #2563eb; }
.ai-btn--secondary { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); }
.ai-btn--secondary:hover:not(:disabled) { background: rgba(255,255,255,0.14); }
.ai-btn--block { width: 100%; }
.ai-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.ai-spinner {
  width: 13px; height: 13px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
  animation: ai-spin 0.8s linear infinite;
}
@keyframes ai-spin { to { transform: rotate(360deg); } }

.panel-slide-enter-active, .panel-slide-leave-active { transition: opacity 220ms ease, transform 220ms ease; }
.panel-slide-enter-from, .panel-slide-leave-to { opacity: 0; transform: translateY(16px); }
@media (min-width: 640px) {
  .panel-slide-enter-from, .panel-slide-leave-to { opacity: 0; transform: translate(28px, -50%); }
}

@media (prefers-reduced-motion: reduce) {
  .ai-msg--typing span, .ai-spinner { animation: none; }
}
</style>
