<template>
  <div class="q-field" :class="{ 'q-field--error': !!error }">
    <label :for="id" class="q-field__label">{{ label }}</label>
    <div class="q-field__control">
      <input
        v-if="!multiline"
        :id="id"
        :value="modelValue"
        :type="type"
        :inputmode="inputmode"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :aria-invalid="!!error || undefined"
        :aria-describedby="describedBy"
        class="q-field__input"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur')"
      >
      <textarea
        v-else
        :id="id"
        :value="modelValue"
        rows="3"
        :placeholder="placeholder"
        :aria-invalid="!!error || undefined"
        :aria-describedby="describedBy"
        class="q-field__input q-field__input--multi"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @blur="$emit('blur')"
      />
      <button
        v-if="voice"
        type="button"
        class="q-field__mic"
        :class="{ 'q-field__mic--on': recording }"
        :aria-label="recording ? t('actions.stopRecording') : t('actions.record')"
        :aria-pressed="recording"
        @click="$emit('voice')"
      >
        <UiIcon name="microphone" :size="20" />
      </button>
    </div>
    <p v-if="help && !error" :id="`${id}-help`" class="q-field__help">{{ help }}</p>
    <p v-if="error" :id="`${id}-error`" class="q-field__error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  id: string
  label: string
  modelValue?: string
  type?: string
  inputmode?: 'text' | 'tel' | 'email' | 'numeric'
  autocomplete?: string
  placeholder?: string
  help?: string
  error?: string
  multiline?: boolean
  voice?: boolean       // free-text fields get a mic button
  recording?: boolean
}>(), { modelValue: '', type: 'text', inputmode: 'text', multiline: false, voice: false, recording: false })

defineEmits<{ 'update:modelValue': [string]; blur: []; voice: [] }>()

const { t } = useQuoteStrings()
const describedBy = computed(() => props.error ? `${props.id}-error` : props.help ? `${props.id}-help` : undefined)
</script>

<style scoped>
.q-field { display: grid; gap: 6px; }
.q-field__label { font-size: var(--q-text-sm); font-weight: 600; color: var(--q-ink); }
.q-field__control { position: relative; display: flex; }
.q-field__input {
  width: 100%;
  min-height: var(--q-tap);
  padding: 12px 14px;
  border: 1px solid var(--q-border-strong);
  border-radius: var(--q-radius);
  background: var(--q-surface);
  color: var(--q-ink);
  font: 400 var(--q-text-md)/1.4 var(--q-font);
  transition: border-color var(--q-fast) var(--q-ease);
}
.q-field__input--multi { resize: vertical; min-height: 96px; }
.q-field__input::placeholder { color: var(--q-ink-3); }
.q-field__input:hover { border-color: var(--q-ink-3); }
.q-field__input:focus { outline: none; border-color: var(--q-ink); box-shadow: 0 0 0 1px var(--q-ink); }
.q-field--error .q-field__input { border-color: var(--q-bad); }
.q-field--error .q-field__input:focus { box-shadow: 0 0 0 1px var(--q-bad); }
.q-field:has(.q-field__mic) .q-field__input { padding-right: 56px; }

.q-field__mic {
  position: absolute; right: 0; top: 0;
  width: var(--q-tap); height: var(--q-tap);
  display: grid; place-items: center;
  border: 0; background: transparent; color: var(--q-ink-2);
  border-radius: var(--q-radius); cursor: pointer;
}
.q-field__mic:hover { color: var(--q-ink); }
.q-field__mic:focus-visible { outline: none; box-shadow: var(--q-focus); }
.q-field__mic--on { color: var(--q-bad); }

.q-field__help { font-size: var(--q-text-sm); color: var(--q-ink-2); }
.q-field__error { font-size: var(--q-text-sm); color: var(--q-bad); font-weight: 500; }
</style>
