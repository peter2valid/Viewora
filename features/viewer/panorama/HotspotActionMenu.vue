<template>
  <Transition name="hsm">
    <div
      v-if="visible"
      class="hsm-root"
      :style="{ left: x + 'px', top: y + 'px' }"
      @mouseenter="$emit('menu-enter')"
      @mouseleave="$emit('menu-leave')"
    >
      <!-- Reposition (top) -->
      <button class="hsm-btn hsm-btn--top" @click.stop="$emit('reposition')" aria-label="Reposition hotspot">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/>
          <polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/>
          <line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
        </svg>
      </button>

      <!-- Edit (right) -->
      <button class="hsm-btn hsm-btn--right" @click.stop="$emit('edit')" aria-label="Edit hotspot">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      <!-- Delete (bottom) -->
      <button class="hsm-btn hsm-btn--bottom hsm-btn--danger" @click.stop="$emit('delete')" aria-label="Delete hotspot">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  x: number
  y: number
}>()

defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'reposition'): void
  (e: 'menu-enter'): void
  (e: 'menu-leave'): void
}>()
</script>

<style scoped>
/* ── Container ───────────────────────────────────────────── */
.hsm-root {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 100;
}

/* ── Base button ─────────────────────────────────────────── */
.hsm-btn {
  position: absolute;
  top: 0;
  left: 0;
  width: 38px;
  height: 38px;
  margin-left: -19px;
  margin-top: -19px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
  color: #1a1a1a;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14), 0 1px 4px rgba(0, 0, 0, 0.08);
  opacity: 0;
  transform: scale(0.4);
  transition: background 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

.hsm-btn:hover {
  background: #f4f4f4;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.1);
  transform: scale(1.12) !important; /* override animated value */
}

.hsm-btn--danger { color: #ef4444; }
.hsm-btn--danger:hover { background: #fff1f1; }

/* ── Radial positions (58px radius) ──────────────────────── */
.hsm-btn--top    { margin-top: calc(-19px - 58px); }
.hsm-btn--right  { margin-left: calc(-19px + 58px); }
.hsm-btn--bottom { margin-top: calc(-19px + 58px); }

/* ── Button pop-in animation ─────────────────────────────── */
.hsm-btn--top    { animation: btn-pop 210ms cubic-bezier(0.34, 1.56, 0.64, 1) 0ms   forwards; }
.hsm-btn--right  { animation: btn-pop 210ms cubic-bezier(0.34, 1.56, 0.64, 1) 45ms  forwards; }
.hsm-btn--bottom { animation: btn-pop 210ms cubic-bezier(0.34, 1.56, 0.64, 1) 90ms  forwards; }

@keyframes btn-pop {
  0%   { opacity: 0; transform: scale(0.3); }
  65%  { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}

/* ── Vue transition for the whole menu ───────────────────── */
.hsm-enter-active { animation: hsm-in 180ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.hsm-leave-active { animation: hsm-out 130ms ease-in forwards; }

@keyframes hsm-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes hsm-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
</style>
