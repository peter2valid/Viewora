<template>
  <div class="editor-canvas">
    <div class="editor-canvas__frame">
      <!-- Slot for Marzipano viewer or other custom viewer -->
      <template v-if="activeScene?.hasImage">
        <slot name="viewer">
          <!-- Fallback: panorama placeholder when no real viewer -->
          <div class="editor-canvas__panorama">
            <div class="editor-canvas__panorama-gradient"></div>
            <div class="editor-canvas__panorama-content">
              <div class="editor-canvas__panorama-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                </svg>
              </div>
              <p class="editor-canvas__panorama-label">{{ activeScene.name }}</p>
              <p class="editor-canvas__panorama-sub">360° panorama preview</p>
            </div>
          </div>
        </slot>
      </template>

      <!-- No image: upload prompt -->
      <template v-else>
        <div class="editor-canvas__upload">
          <div class="editor-canvas__upload-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <div class="editor-canvas__upload-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="8"></line>
              <polyline points="8 12 12 8 16 12"></polyline>
            </svg>
          </div>
        </div>
      </template>

      <!-- Scene name badge (top-left) -->
      <div v-if="activeScene" class="editor-canvas__badge">
        {{ activeScene.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Scene {
  id: string
  name: string
  hasImage: boolean
}

defineProps<{
  activeScene: Scene | null
}>()
</script>

<style scoped>
.editor-canvas {
  flex: 1;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  padding: 16px;
  background: #f0f0f0;
  overflow: hidden;
}

.editor-canvas__frame {
  position: relative;
  width: 100%;
  height: 100%;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Panorama placeholder (has scene) ── */
.editor-canvas__panorama {
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #dde5ef 0%, #c8d5e2 35%, #b8cad9 65%, #cfdce9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.editor-canvas__panorama-gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 50% at 50% 50%, rgba(255,255,255,0.07) 0%, transparent 70%),
    repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.03) 40px),
    repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.03) 40px);
}

.editor-canvas__panorama-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #4b6080;
  text-align: center;
  padding: 0 1.5rem;
}

.editor-canvas__panorama-icon {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.editor-canvas__panorama-label {
  font-size: 1rem;
  font-weight: 700;
  color: #2d3f55;
  letter-spacing: -0.015em;
}

.editor-canvas__panorama-sub {
  font-size: 0.775rem;
  color: #6b80a0;
}

/* ── Upload empty state ── */
.editor-canvas__upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: #b0b8c4;
}

.editor-canvas__upload-icon-wrapper {
  width: 72px;
  height: 72px;
  background: #e8ecf0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b0b8c4;
}

.editor-canvas__upload-arrow {
  color: #4a6fa5;
}

/* ── Scene badge ── */
.editor-canvas__badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 9px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 99px;
  font-size: 0.68rem;
  font-weight: 600;
  color: #374151;
  letter-spacing: 0.01em;
}

/* ── Mobile: tighter padding ── */
@media (max-width: 600px) {
  .editor-canvas {
    padding: 10px;
  }

  .editor-canvas__frame {
    border-radius: 8px;
  }

  .editor-canvas__upload-icon-wrapper {
    width: 52px;
    height: 52px;
  }

  .editor-canvas__panorama-icon {
    width: 48px;
    height: 48px;
  }

  .editor-canvas__panorama-label {
    font-size: 0.875rem;
  }
}
</style>
