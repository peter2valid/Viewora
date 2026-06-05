<template>
  <!-- Inline strip variant (default) -->
  <NuxtLink
    v-if="variant === 'strip'"
    to="/app/capture"
    class="capture-nudge-strip"
  >
    <span class="capture-nudge-strip__icon">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    </span>
    <span class="capture-nudge-strip__text">
      Don't have 360° photos? <strong>We'll shoot it for you</strong> — from KES 5,000
    </span>
    <span class="capture-nudge-strip__cta">Book a Shoot →</span>
  </NuxtLink>

  <!-- Card variant (editor / empty state) -->
  <div v-else-if="variant === 'card'" class="capture-nudge-card">
    <div class="capture-nudge-card__icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    </div>
    <div class="capture-nudge-card__body">
      <p class="capture-nudge-card__title">No photos? We'll shoot it for you</p>
      <p class="capture-nudge-card__sub">Professional 360° capture from <strong>KES 5,000</strong>. We dispatch a photographer to your property.</p>
    </div>
    <NuxtLink to="/app/capture" class="capture-nudge-card__btn">Book a Shoot</NuxtLink>
  </div>

  <!-- Button variant (inline next to another button) -->
  <NuxtLink
    v-else-if="variant === 'btn'"
    to="/app/capture"
    class="capture-nudge-btn"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
    Book a Shoot
  </NuxtLink>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'strip' | 'card' | 'btn' }>(), { variant: 'strip' })
</script>

<style scoped>
/* ── Strip ─────────────────────────────────────── */
.capture-nudge-strip {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 16px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(37,211,102,0.07) 0%, rgba(59,130,246,0.07) 100%);
  border: 1px solid rgba(37,211,102,0.18);
  text-decoration: none; transition: border-color 150ms ease, background 150ms ease;
  cursor: pointer;
}
.capture-nudge-strip:hover { border-color: rgba(37,211,102,0.35); background: linear-gradient(135deg, rgba(37,211,102,0.12) 0%, rgba(59,130,246,0.10) 100%); }
.capture-nudge-strip__icon {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 8px;
  background: rgba(37,211,102,0.15); border: 1px solid rgba(37,211,102,0.25);
  display: flex; align-items: center; justify-content: center; color: #25d366;
}
.capture-nudge-strip__text { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.65); flex: 1; }
.capture-nudge-strip__text strong { color: rgba(255,255,255,0.9); font-weight: 800; }
.capture-nudge-strip__cta {
  flex-shrink: 0; font-size: 11px; font-weight: 800; letter-spacing: 0.04em;
  color: #25d366; text-transform: uppercase;
  padding: 4px 10px; border-radius: 8px;
  background: rgba(37,211,102,0.12); border: 1px solid rgba(37,211,102,0.25);
  transition: background 140ms ease;
}
.capture-nudge-strip:hover .capture-nudge-strip__cta { background: rgba(37,211,102,0.2); }

/* ── Card ──────────────────────────────────────── */
.capture-nudge-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 16px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(37,211,102,0.06) 0%, rgba(59,130,246,0.06) 100%);
  border: 1px solid rgba(37,211,102,0.18);
  margin-top: 10px;
}
.capture-nudge-card__icon {
  flex-shrink: 0; width: 32px; height: 32px; border-radius: 10px;
  background: rgba(37,211,102,0.15); border: 1px solid rgba(37,211,102,0.25);
  display: flex; align-items: center; justify-content: center; color: #25d366;
}
.capture-nudge-card__body { flex: 1; min-width: 0; }
.capture-nudge-card__title { font-size: 12px; font-weight: 800; color: rgba(255,255,255,0.9); margin-bottom: 2px; }
.capture-nudge-card__sub { font-size: 11px; color: rgba(255,255,255,0.45); line-height: 1.5; font-weight: 500; }
.capture-nudge-card__sub strong { color: rgba(255,255,255,0.7); font-weight: 800; }
.capture-nudge-card__btn {
  flex-shrink: 0; align-self: center; font-size: 10px; font-weight: 800;
  letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none;
  padding: 6px 12px; border-radius: 9px;
  background: #25d366; color: #0a0a0a;
  transition: background 140ms ease, transform 140ms ease;
  white-space: nowrap;
}
.capture-nudge-card__btn:hover { background: #20bd5a; transform: translateY(-1px); }

/* ── Button ────────────────────────────────────── */
.capture-nudge-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 40px; padding: 0 16px; border-radius: 12px;
  font-size: 12px; font-weight: 700; letter-spacing: 0.02em; text-decoration: none;
  background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.25);
  color: #25d366; transition: all 140ms ease; white-space: nowrap;
}
.capture-nudge-btn:hover { background: rgba(37,211,102,0.18); border-color: rgba(37,211,102,0.45); transform: translateY(-1px); }
</style>
