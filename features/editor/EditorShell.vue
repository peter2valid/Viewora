<template>
  <div class="editor-shell editor-root">

    <!-- Full-screen error overlay when initial space load fails -->
    <div v-if="spaceLoadFailed" class="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950 gap-4">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p class="text-white/60 text-sm font-medium">Failed to load tour — check your connection</p>
      <button
        class="px-4 h-9 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors"
        @click="fetchSpace(false)"
      >Retry</button>
    </div>

    <!-- Hidden file input — triggered by ViewerCanvas "Choose File" (empty state) -->
    <input
      ref="canvasFileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handlePanoramaUpload"
    />

    <!-- Hidden file input — triggered by SceneDock Add Scene -->
    <input
      ref="addSceneFileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handleAddSceneFileChange"
    />

    <!-- ── Full-viewport viewer ── -->
    <ViewerCanvas
      ref="viewerCanvasRef"
      :active-scene="activeViewerScene"
      :hide-nav-arrows="isPreviewMode && !dockCollapsed"
      :space-type="space?.space_type"
      :hotspots="activeSceneHotspotsWithPreview"
      :is-tracing="isTracing"
      :trace-points="tracePoints"
      @error="showToast($event.message, 'error')"
      @add-hotspot="handleViewerAddHotspot"
      @hotspot-click="handleHotspotClick"
      @hotspot-edit="handleHotspotEdit"
      @hotspot-delete="deleteHotspot"
      @hotspot-reposition="handleHotspotReposition"
      @hotspot-drag-drop="handleHotspotDragDrop"
      @request-upload="handleViewerCanvasUpload"
      @update-trace="handleUpdateTrace"
      @cancel-placement="onCancelPlacement"
    />

    <!-- ── Floating panels (position:fixed, above viewer) ── -->
    <TopBar
      v-if="editorStore.mode !== 'preview'"
      :space-name="space?.title || 'Edit Tour'"
      :is-published="Boolean(space?.is_published)"
      :publishing="publishing"
      :has-processing-scenes="hasProcessingScenes"
      :space-id="space?.id"
      :slug="space?.slug"
      @toggle-publish="handleTogglePublish"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
      @preview="editorStore.setMode('preview')"
      @share="showShareModal = true"
    />

    <HotspotPanel
      :visible="editorStore.activePanel === 'hotspots' && !isPreviewMode"
      :hotspots="activeSceneHotspots"
      :selected-id="editorStore.selectedHotspotId"
      :draft="editDraft"
      :other-scenes="otherScenesForHotspot"
      :saving="savingHotspot"
      :deleting="deletingHotspot"
      @close="closeHotspotPanel"
      @select="selectHotspot"
      @update-draft="patchHotspotDraft"
      @save="saveHotspotEdit"
      @delete="confirmDeleteHotspot"
      @start-tracing="startTracing"
    />

    <LeftToolbar
      v-if="editorStore.mode !== 'preview'"
      :active-placement-type="activePlacementType"
      :settings-open="showSettingsPanel"
      @place-hotspot="handlePlaceHotspot"
      @open-settings="showSettingsPanel = !showSettingsPanel"
      @cancel-placement="onCancelPlacement"
      @auto-link="openAutoLink"
    />

    <!-- Preview mode: identical GlassDock to what the public viewer shows -->
    <GlassDock
      v-if="isPreviewMode && scenes.length > 0"
      v-model:collapsed="dockCollapsed"
      :items="glassDockItems"
      :active-id="selectedSceneId"
      :bottom-px="20"
      :edge-inset-px="16"
      :max-strip-vw="80"
      :max-strip-px="860"
      :max-scale="1.6"
      :sigma-px="94"
      :lift-px="14"
      @select="selectScene"
    />

    <!-- Editor mode: SceneDock with rename, reorder, add -->
    <SceneDock
      v-else-if="!isPreviewMode"
      :scenes="sceneChips"
      :active-scene-id="selectedSceneId"
      :add-scene-pending="false"
      :show-add="true"
      @select-scene="selectScene"
      @add-scene="handleAddScene"
      @reorder-scenes="handleReorderScenes"
      @rename-scene="handleRenameScene"
    />

    <!-- Preview Mode Overlays -->
    <Transition name="fade-smooth">
      <div
        v-if="isPreviewMode"
        class="fixed top-5 left-5 z-30 flex flex-col gap-1 pointer-events-none"
      >
        <h1 class="text-white text-lg font-black tracking-tight drop-shadow-lg uppercase">{{ space?.title || 'Tour Preview' }}</h1>
        <p v-if="space?.location_text" class="text-white/60 text-[10px] font-bold tracking-[0.2em] drop-shadow-md uppercase">{{ space.location_text }}</p>
      </div>
    </Transition>

    <!-- Preview exit button -->
    <Transition name="fade-smooth">
      <button
        v-if="isPreviewMode"
        class="fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 h-10 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md text-white text-[12px] font-bold transition-all shadow-2xl pointer-events-auto"
        @click="editorStore.setMode('view')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
        Exit Preview
      </button>
    </Transition>

    <!-- Type picker + quick editor (floating, fixed-position) -->
    <HotspotTypePicker
      :visible="showTypePicker"
      @select="onTypePicked"
      @cancel="showTypePicker = false"
    />

    <HotspotQuickEditor
      :visible="quickEditHotspotId !== null"
      :draft="editDraft"
      :other-scenes="otherScenesForHotspot"
      :screen-x="quickEditScreenPos.x"
      :screen-y="quickEditScreenPos.y"
      :saving="addingHotspot"
      @update-draft="patchHotspotDraft"
      @done="onQuickEditDone"
      @cancel="onQuickEditCancel"
      @start-tracing="startTracing"
    />

    <!-- Toast + Share modal teleported to body -->
    <Teleport to="body">
      <Transition name="fade-smooth">
        <div v-if="renameCandidate" class="rename-popover" role="dialog" aria-label="Rename scene">
          <span class="rename-popover__label">Scene name</span>
          <input
            ref="renameInputRef"
            v-model="renameDraft"
            class="rename-popover__input"
            type="text"
            maxlength="64"
            placeholder="Scene name"
            @keydown.enter="saveRenameScene"
            @keydown.exact.escape="renameCandidate = null"
          />
          <div class="rename-popover__actions">
            <button class="rename-popover__save" :disabled="renameSaving" @click="saveRenameScene">Save</button>
            <button class="rename-popover__cancel" @click="renameCandidate = null">✕</button>
          </div>
          <div class="rename-popover__delete-row">
            <template v-if="sceneDeleteConfirm === renameCandidate.id">
              <button class="rename-popover__del-confirm" :disabled="deletingScene" @click="confirmDeleteScene(renameCandidate.id)">
                <span v-if="deletingScene" class="hs-edit-panel__spin" />
                <template v-else>Confirm delete</template>
              </button>
              <button class="rename-popover__del-abort" @click="sceneDeleteConfirm = null">Cancel</button>
            </template>
            <template v-else>
              <button
                class="rename-popover__del"
                @click="sceneDeleteConfirm = renameCandidate.id"
              >Delete scene</button>
            </template>
          </div>
        </div>
      </Transition>

      <!-- ── Tour Settings Panel ─────────────────────────────────────────── -->
      <Transition name="ts-slide">
        <div v-if="showSettingsPanel" class="ts-overlay" @click.self="showSettingsPanel = false" role="dialog" aria-modal="true" aria-label="Tour settings">
          <div class="ts-panel">

            <!-- Header -->
            <div class="ts-header">
              <span class="ts-header__title">Tour Settings</span>
              <button class="ts-close" @click="showSettingsPanel = false" aria-label="Close settings">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Scrollable body -->
            <div class="ts-body ts-scroll">

              <!-- SECTION: Tour Info -->
              <div class="ts-section">
                <div class="ts-section__label">Tour Info</div>

                <div class="ts-field">
                  <label class="ts-field__label">Name</label>
                  <input
                    class="ts-input"
                    v-model="settingsDraft.title"
                    placeholder="Enter tour name"
                    maxlength="120"
                  />
                </div>

                <div class="ts-field">
                  <label class="ts-field__label">Description <span class="ts-field__opt">optional</span></label>
                  <textarea
                    class="ts-textarea"
                    v-model="settingsDraft.description"
                    placeholder="Describe this tour…"
                    rows="3"
                  />
                </div>

                <div class="ts-field">
                  <label class="ts-field__label">Phone <span class="ts-field__opt">optional</span></label>
                  <input class="ts-input" v-model="settingsDraft.phone" placeholder="+1 (555) 000-0000" type="tel" />
                </div>

                <div class="ts-field">
                  <label class="ts-field__label">Email <span class="ts-field__opt">optional</span></label>
                  <input class="ts-input" v-model="settingsDraft.email" placeholder="contact@example.com" type="email" />
                </div>

                <!-- Location with map -->
                <div class="ts-field">
                  <label class="ts-field__label">
                    Location
                    <span class="ts-field__opt">optional</span>
                  </label>
                  <div class="ts-location-wrap">
                    <div class="ts-location-input-row">
                      <input
                        class="ts-input"
                        :value="settingsDraft.locationText"
                        placeholder="Search a location…"
                        @input="onLocationInput(($event.target as HTMLInputElement).value)"
                      />
                      <div v-if="locationSearching" class="ts-location-spin" />
                    </div>
                    <div v-if="locationDropOpen && locationResults.length" class="ts-location-drop">
                      <button
                        v-for="r in locationResults"
                        :key="r.lat + r.lon"
                        class="ts-location-result"
                        @click="selectLocation(r)"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ts-location-pin" aria-hidden="true">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span class="ts-location-text">{{ r.display_name }}</span>
                      </button>
                    </div>
                    <iframe
                      v-if="mapEmbedUrl"
                      :src="mapEmbedUrl"
                      class="ts-map"
                      frameborder="0"
                      scrolling="no"
                      title="Location map"
                    />
                  </div>
                </div>

                <!-- Logo upload -->
                <div class="ts-field">
                  <label class="ts-field__label">Brand Logo <span class="ts-field__opt">shows in viewer</span></label>
                  <input ref="logoFileInput" type="file" accept="image/*" class="ts-hidden-file" @change="handleLogoFileChange" />
                  <div class="ts-logo-area" @click="logoFileInput?.click()">
                    <template v-if="settingsDraft.logoUrl">
                      <img :src="settingsDraft.logoUrl" class="ts-logo-preview" alt="Logo" />
                      <button class="ts-logo-remove" @click.stop="clearLogo()" aria-label="Remove logo">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </template>
                    <template v-else>
                      <div class="ts-logo-placeholder">
                        <svg v-if="!logoUploading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <span v-if="logoUploading" class="ts-spin" />
                        <span class="ts-logo-hint">{{ logoUploading ? 'Uploading…' : 'Click to upload logo' }}</span>
                      </div>
                    </template>
                  </div>
                  <button
                    v-if="settingsDraft.logoUrl"
                    class="ts-bg-remove-btn"
                    :class="{ 'ts-bg-remove-btn--done': bgRemoved }"
                    :disabled="bgRemoving"
                    @click.prevent="handleRemoveBg"
                  >
                    <span v-if="bgRemoving" class="ts-spin ts-spin--invert" />
                    <template v-else-if="bgRemoved">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      Background removed
                    </template>
                    <template v-else>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                      Remove background
                    </template>
                  </button>
                </div>
              </div>

              <!-- SECTION: Viewer -->
              <div class="ts-section">
                <div class="ts-section__label">Viewer</div>

                <div class="ts-field">
                  <div class="ts-slider-header">
                    <label class="ts-field__label">Field of View</label>
                    <span class="ts-slider-val">{{ settingsDraft.hfov }}°</span>
                  </div>
                  <input type="range" class="ts-range" v-model.number="settingsDraft.hfov" min="30" max="120" step="1" />
                </div>

                <div class="ts-field">
                  <div class="ts-slider-header">
                    <label class="ts-field__label">Starting Yaw</label>
                    <span class="ts-slider-val">{{ settingsDraft.yaw }}°</span>
                  </div>
                  <input type="range" class="ts-range" v-model.number="settingsDraft.yaw" min="-180" max="180" step="1" />
                </div>

                <div class="ts-field">
                  <div class="ts-slider-header">
                    <label class="ts-field__label">Starting Pitch</label>
                    <span class="ts-slider-val">{{ settingsDraft.pitch }}°</span>
                  </div>
                  <input type="range" class="ts-range" v-model.number="settingsDraft.pitch" min="-90" max="90" step="1" />
                </div>

                <div class="ts-toggle-row">
                  <div>
                    <div class="ts-field__label">Auto-rotate</div>
                    <div class="ts-toggle-sub">Slowly pan the view on load</div>
                  </div>
                  <button
                    class="ts-toggle"
                    :class="{ 'ts-toggle--on': settingsDraft.autoRotate }"
                    role="switch"
                    :aria-checked="settingsDraft.autoRotate"
                    @click="settingsDraft.autoRotate = !settingsDraft.autoRotate"
                  >
                    <span class="ts-toggle-thumb" />
                  </button>
                </div>
              </div>

              <!-- SECTION: Lead Capture -->
              <div class="ts-section">
                <div class="ts-section__label">Lead Capture</div>

                <div class="ts-toggle-row">
                  <div>
                    <div class="ts-field__label">CTA Button</div>
                    <div class="ts-toggle-sub">Show a call-to-action button on the tour</div>
                  </div>
                  <button
                    class="ts-toggle"
                    :class="{ 'ts-toggle--on': settingsDraft.ctaEnabled }"
                    role="switch"
                    :aria-checked="settingsDraft.ctaEnabled"
                    @click="settingsDraft.ctaEnabled = !settingsDraft.ctaEnabled"
                  >
                    <span class="ts-toggle-thumb" />
                  </button>
                </div>

                <template v-if="settingsDraft.ctaEnabled">
                  <div class="ts-field">
                    <label class="ts-field__label">Button Text</label>
                    <input class="ts-input" v-model="settingsDraft.ctaButtonText" placeholder="Book a Viewing" maxlength="40" />
                  </div>

                  <div class="ts-field">
                    <label class="ts-field__label">Action</label>
                    <div class="ts-seg">
                      <button
                        v-for="opt in ctaActionOptions"
                        :key="opt.value"
                        class="ts-seg__btn"
                        :class="{ 'ts-seg__btn--active': settingsDraft.ctaAction === opt.value }"
                        type="button"
                        @click="settingsDraft.ctaAction = opt.value"
                      >{{ opt.label }}</button>
                    </div>
                  </div>

                  <div class="ts-field">
                    <label class="ts-field__label">
                      {{ settingsDraft.ctaAction === 'link' ? 'URL' : settingsDraft.ctaAction === 'email' ? 'Email Address' : 'Phone Number' }}
                    </label>
                    <input
                      class="ts-input"
                      v-model="settingsDraft.ctaDestination"
                      :placeholder="settingsDraft.ctaAction === 'link' ? 'https://...' : settingsDraft.ctaAction === 'email' ? 'agent@example.com' : '+1 (555) 000-0000'"
                      :type="settingsDraft.ctaAction === 'link' ? 'url' : settingsDraft.ctaAction === 'email' ? 'email' : 'tel'"
                    />
                  </div>
                </template>
              </div>

            </div><!-- end ts-body -->

            <!-- Footer -->
            <div class="ts-footer">
              <button class="ts-btn-save" :disabled="settingsSaving" @click="saveSettings">
                <span v-if="settingsSaving" class="ts-spin" />
                <template v-else>Save Changes</template>
              </button>
              <button class="ts-btn-cancel" @click="showSettingsPanel = false">Cancel</button>
            </div>

          </div>
        </div>
      </Transition>

      <Transition name="share-modal">
        <div v-if="showShareModal" class="share-overlay" @click.self="showShareModal = false">
          <div class="share-modal" role="dialog" aria-modal="true" aria-label="Share your tour">
            <div class="share-modal__topbar">
              <h2 class="share-modal__title">Share</h2>
              <button class="share-modal__close" @click="showShareModal = false" aria-label="Close share dialog">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="share-modal__tabs" role="tablist" aria-label="Share options">
              <button
                v-for="tab in shareTabs"
                :key="tab.id"
                type="button"
                class="share-modal__tab"
                :class="{ 'share-modal__tab--active': activeShareTab === tab.id }"
                :aria-selected="activeShareTab === tab.id"
                role="tab"
                @click="activeShareTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>

            <div class="share-modal__body">
              <div v-if="activeShareTab === 'link'" class="share-modal__panel" role="tabpanel">
                <p class="share-modal__eyebrow">Link to share</p>
                <div class="share-modal__link-row">
                  <span class="share-modal__link">{{ publicUrl }}</span>
                  <button class="share-modal__copy" @click="copyPublicUrl">
                    <template v-if="urlCopied">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      Copied
                    </template>
                    <template v-else>
                      Copy link
                    </template>
                  </button>
                </div>

                <div class="share-modal__share-row" aria-label="Share to apps">
                  <a
                    :href="shareWhatsappHref"
                    target="_blank"
                    rel="noopener"
                    class="share-modal__share-item"
                    @click="analytics.track('tour_shared', { method: 'whatsapp', space_id: space?.id })"
                  >
                    <span class="share-modal__share-icon share-modal__share-icon--whatsapp" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.49 2 2 6.48 2 12c0 1.89.52 3.66 1.42 5.18L2 22l4.98-1.39A9.96 9.96 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm5.8 14.16c-.24.68-1.44 1.32-1.98 1.39-.52.07-1.2.1-1.95-.12-.46-.14-1.05-.33-1.81-.66-3.18-1.38-5.24-4.6-5.39-4.81-.14-.21-1.3-1.73-1.3-3.3s.79-2.34 1.07-2.66c.28-.32.61-.4.82-.4h.58c.19 0 .45-.07.7.53.24.6.82 2.07.89 2.22.07.15.12.33.02.54-.1.21-.15.34-.3.52-.15.18-.31.4-.45.53-.15.16-.3.33-.13.63.16.31.71 1.17 1.52 1.9 1.04.92 1.9 1.21 2.22 1.37.31.16.49.14.67-.08.18-.22.77-.9.98-1.2.2-.31.4-.26.67-.16.28.1 1.74.82 2.04.97.3.14.5.22.58.34.08.12.08.74-.17 1.42Z"/></svg>
                    </span>
                    <span class="share-modal__share-label">WhatsApp</span>
                  </a>
                  <a
                    :href="shareXHref"
                    target="_blank"
                    rel="noopener"
                    class="share-modal__share-item"
                    @click="analytics.track('tour_shared', { method: 'x', space_id: space?.id })"
                  >
                    <span class="share-modal__share-icon share-modal__share-icon--x" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.78 7.72L23.2 22h-6.4l-5-6.58L5.98 22H2.84l7.2-8.2L.8 2h6.55l4.53 5.98L18.9 2Zm-1.12 18h1.72L6.42 3.94H4.58L17.78 20Z"/></svg>
                    </span>
                    <span class="share-modal__share-label">X</span>
                  </a>
                  <a
                    :href="shareGmailHref"
                    class="share-modal__share-item"
                    @click="analytics.track('tour_shared', { method: 'gmail', space_id: space?.id })"
                  >
                    <span class="share-modal__share-icon share-modal__share-icon--gmail" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none"><path d="M4 6.5h16v11H4z" fill="currentColor" opacity="0.16"/><path d="M4 6.5 12 12 20 6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 7.2 12 12.1 19.2 7.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <span class="share-modal__share-label">Gmail</span>
                  </a>
                </div>
              </div>

              <div v-else-if="activeShareTab === 'embed'" class="share-modal__panel" role="tabpanel">
                <p class="share-modal__eyebrow">Embed</p>
                <div class="share-modal__link-row share-modal__link-row--code">
                  <code class="share-modal__link share-modal__link--code">{{ shareEmbedCode }}</code>
                  <button class="share-modal__copy" @click="copyEmbedCode">
                    <template v-if="embedCopied">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      Copied
                    </template>
                    <template v-else>
                      Copy iframe
                    </template>
                  </button>
                </div>
                <div class="share-modal__preview-card">
                  <iframe
                    :src="embedUrl"
                    class="share-modal__preview-frame"
                    title="Tour embed preview"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  />
                </div>
              </div>

              <div v-else class="share-modal__panel share-modal__panel--qr" role="tabpanel">
                <p class="share-modal__eyebrow">QR code</p>
                <div class="share-modal__qr-card">
                  <div class="share-modal__qr-wrap">
                    <img v-if="!qrLoading && qrDataUrl" :src="qrDataUrl" alt="QR code for the tour link" class="share-modal__qr-image" />
                    <div v-else class="share-modal__qr-placeholder">
                      <span class="share-modal__qr-loading" />
                    </div>
                  </div>
                  <p class="share-modal__qr-text">Scan to open the tour on any device.</p>
                  <p class="share-modal__qr-url">{{ publicUrl }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── AI Auto-link modal ── -->
    <Teleport to="body">
      <Transition name="share-overlay">
        <div v-if="showAutoLinkModal" class="share-overlay" @click.self="closeAutoLink" role="dialog" aria-modal="true" aria-label="Auto-link scenes">
          <div class="al-modal">

            <div class="share-modal__topbar">
              <h2 class="share-modal__title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"/></svg>
                AI Scene Linking
              </h2>
              <button class="share-modal__close" @click="closeAutoLink" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Analysing state -->
            <div v-if="autoLinkAnalyzing" class="al-loading">
              <div class="al-spinner" />
              <p class="al-loading__text">Analysing your scenes with AI…</p>
              <p class="al-loading__sub">This takes a few seconds per scene</p>
            </div>

            <!-- Error state -->
            <div v-else-if="autoLinkError" class="al-error">
              <p>{{ autoLinkError }}</p>
              <button class="al-btn al-btn--secondary" @click="closeAutoLink">Close</button>
            </div>

            <!-- Results -->
            <div v-else>
              <!-- Scene rename suggestions -->
              <template v-if="autoLinkRenames.length">
                <p class="al-section-label">Rename scenes</p>
                <ul class="al-list">
                  <li v-for="r in autoLinkRenames" :key="r._id" class="al-item">
                    <label class="al-item__label">
                      <input
                        type="checkbox"
                        class="al-checkbox"
                        :checked="autoLinkSelectedRenames.has(r._id)"
                        @change="toggleAutoLinkRename(r._id)"
                      />
                      <span class="al-item__text">
                        <span class="al-item__from">{{ r.currentName }}</span>
                        <span class="al-item__arrow">→</span>
                        <strong>{{ r.suggestedName }}</strong>
                      </span>
                    </label>
                  </li>
                </ul>
              </template>

              <!-- Hotspot suggestions -->
              <template v-if="autoLinkSuggestions.length">
                <p class="al-section-label">Navigation hotspots to create</p>
                <ul class="al-list">
                  <li v-for="s in autoLinkSuggestions" :key="s._id" class="al-item">
                    <label class="al-item__label">
                      <input
                        type="checkbox"
                        class="al-checkbox"
                        :checked="autoLinkSelected.has(s._id)"
                        @change="toggleAutoLinkSuggestion(s._id)"
                      />
                      <span class="al-item__text">
                        <span class="al-item__from">{{ s.fromSceneName }}</span>
                        <span class="al-item__arrow">→</span>
                        <strong>{{ s.toSceneName }}</strong>
                        <span class="al-item__detail">{{ s.doorwayDescription }}</span>
                      </span>
                    </label>
                  </li>
                </ul>
              </template>

              <p v-if="!autoLinkRenames.length && !autoLinkSuggestions.length" class="al-empty">
                No suggestions — all scenes may already be linked.
              </p>

              <div class="al-actions">
                <button class="al-btn al-btn--secondary" @click="closeAutoLink">Cancel</button>
                <button
                  class="al-btn al-btn--primary"
                  :disabled="autoLinkApplying || (!autoLinkSelected.size && !autoLinkSelectedRenames.size)"
                  @click="handleAutoLinkApply"
                >
                  <span v-if="autoLinkApplying" class="al-spinner al-spinner--sm" />
                  <template v-else>Apply selected</template>
                </button>
              </div>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import QRCode from 'qrcode'
import { usePlanStore } from '~/stores/plan'
import { useApiFetch } from '~/composables/useApiFetch'
import { type EditorHotspot, mapDbHotspot, mapDbHotspots } from '~/features/editor/mappers'
import { useEditorStore } from '~/features/editor/store/useEditorStore'
import ViewerCanvas from '~/features/editor/components/ViewerCanvas.vue'
import TopBar from '~/features/editor/components/TopBar.vue'
import LeftToolbar from '~/features/editor/components/LeftToolbar.vue'
import SceneDock from '~/features/editor/components/SceneDock.vue'
import GlassDock from '~/components/ui/GlassDock.vue'
import { useSceneUpload } from '~/features/editor/composables/useSceneUpload'
import { useEditorRealtime } from '~/features/editor/composables/useEditorRealtime'
import { useEditorUpload, isLocalSceneId, type SceneUploadState } from '~/features/editor/composables/useEditorUpload'
import { useHotspotEditor } from '~/features/editor/composables/useHotspotEditor'
import { useEditorPublish } from '~/features/editor/composables/useEditorPublish'
import { useAutoLink } from '~/features/editor/composables/useAutoLink'
import HotspotPanel from '~/features/editor/components/HotspotPanel.vue'
import HotspotTypePicker from '~/features/editor/components/HotspotTypePicker.vue'
import HotspotQuickEditor from '~/features/editor/components/HotspotQuickEditor.vue'
import { toast } from 'vue-sonner'

const editorStore = useEditorStore()
const analytics = useAnalytics()

const props = defineProps<{
  spaceId: string
}>()

const { apiFetch } = useApiFetch()
const planStore = usePlanStore()

const {
  localUploads,
  uploadFile,
} = useSceneUpload(props.spaceId)

const space = ref<any>(null)
const placeholderPanoramaUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800" viewBox="0 0 1600 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23111627"/><stop offset="55%" stop-color="%231f2a44"/><stop offset="100%" stop-color="%232a4365"/></linearGradient></defs><rect width="1600" height="800" fill="url(%23g)"/><circle cx="1220" cy="230" r="180" fill="rgba(255,255,255,0.08)"/><circle cx="360" cy="600" r="260" fill="rgba(255,255,255,0.06)"/><g fill="none" stroke="rgba(255,255,255,0.35)"><path d="M0 540h1600"/><path d="M0 480h1600"/></g><text x="120" y="170" fill="rgba(255,255,255,0.88)" font-family="Arial" font-size="48" font-weight="700">Viewora 360 Tour Preview</text><text x="120" y="235" fill="rgba(255,255,255,0.7)" font-family="Arial" font-size="28">Upload your panorama to replace this placeholder instantly.</text></svg>'
const scenes = ref<any[]>([])
const selectedSceneId = ref('')
const dockCollapsed = ref(false)
const hotspotsByScene = ref<Record<string, EditorHotspot[]>>({})
const inlineEditMode = computed({
  get: () => editorStore.mode === 'hotspot',
  set: (val: boolean) => editorStore.setMode(val ? 'hotspot' : 'view'),
})

const {
  pendingScenePreviewById,
  localPanoramaUrlById,
  sceneUploadStateById,
  canvasFileInput,
  addSceneFileInput,
  backendSceneStatusToUploadState,
  sceneHasRenderableImage,
  scenePreviewUrl,
  replacePendingScenePreviewMap,
  deleteLocalPanoramaUrl,
  revokeAllLocalPanoramaUrls,
  createOptimisticLocalScene,
  removeOptimisticLocalScene,
  setSceneUploadState,
  removeSceneUploadState,
  mapSceneLinkTargets,
  createSceneWithPanorama,
  handlePanoramaUpload,
  handleViewerCanvasUpload,
  handleAddSceneFileChange,
  enqueuePanoramaFiles,
  hydrateRecoverySnapshot,
} = useEditorUpload(
  props.spaceId,
  uploadFile,
  scenes,
  selectedSceneId,
  hotspotsByScene,
  showToast,
  fetchScenes,
  inlineEditMode,
)

const sceneChips = computed(() => {
  if (!scenes.value.length) return []
  return scenes.value
    .slice()
    .sort((a, b) => {
      const orderDiff = Number(a.order_index || 0) - Number(b.order_index || 0)
      if (orderDiff !== 0) return orderDiff
      return String(a.id || '').localeCompare(String(b.id || ''))
    })
    .map((s, idx) => {
      const state: SceneUploadState = sceneUploadStateById.value[s.id] || backendSceneStatusToUploadState(s.status)
      const badge: 'loading' | 'failed' | null = state === 'failed' ? 'failed' : state === 'ready' ? null : 'loading'
      return {
        id: s.id,
        label: s.name || `Scene ${idx + 1}`,
        ready: state === 'ready',
        badge,
        imageUrl: scenePreviewUrl(s),
      }
    })
})

const {
  editDraft,
  savingHotspot,
  addingHotspot,
  deletingHotspot,
  quickEditHotspotId,
  quickEditScreenPos,
  repositioningHotspotId,
  hotspotDraftType,
  showTypePicker,
  isTracing,
  tracePoints,
  deleteCandidate,
  activeSceneHotspots,
  hotspotCount,
  activeSceneHotspotsWithPreview,
  otherScenesForHotspot,
  startTracing,
  handleUpdateTrace,
  placeHotspotDirect,
  onOpenTypePicker,
  onTypePicked,
  onCancelPlacement,
  onQuickEditCancel,
  handleViewerAddHotspot,
  onQuickEditDone,
  onQuickEditMore,
  handleHotspotEdit,
  deleteHotspot,
  handleHotspotReposition,
  handleHotspotDragDrop,
  selectHotspot,
  patchHotspotDraft,
  closeHotspotPanel,
  confirmDeleteHotspot,
  saveHotspotEdit,
} = useHotspotEditor(
  apiFetch,
  editorStore,
  inlineEditMode,
  selectedSceneId,
  hotspotsByScene,
  sceneChips,
  showToast,
  fetchHotspots,
)

const viewerCanvasRef = ref<InstanceType<typeof ViewerCanvas> | null>(null)

const {
  publishing,
  showSettingsPanel,
  settingsDraft,
  settingsSaving,
  showShareModal,
  handleTogglePublish,
  saveSettings,
} = useEditorPublish(
  props.spaceId,
  apiFetch,
  space,
  scenes,
  hotspotsByScene,
  sceneUploadStateById,
  backendSceneStatusToUploadState,
  fetchHotspots,
  showToast,
  editorStore,
  // Apply settings to the live viewer immediately after a successful save
  (settings) => viewerCanvasRef.value?.refreshSettings(settings),
)

// ── AI Auto-link ──────────────────────────────────────────────────────────────
const {
  showModal: showAutoLinkModal,
  isAnalyzing: autoLinkAnalyzing,
  isApplying: autoLinkApplying,
  errorMsg: autoLinkError,
  suggestions: autoLinkSuggestions,
  sceneRenames: autoLinkRenames,
  selectedSuggestions: autoLinkSelected,
  selectedRenames: autoLinkSelectedRenames,
  open: openAutoLink,
  close: closeAutoLink,
  toggleSuggestion: toggleAutoLinkSuggestion,
  toggleRename: toggleAutoLinkRename,
  apply: applyAutoLink,
} = useAutoLink(props.spaceId, apiFetch)

async function handleAutoLinkApply() {
  await applyAutoLink(
    // rename callback
    async (sceneId, name) => {
      const prev = scenes.value.slice()
      scenes.value = scenes.value.map(s => s.id === sceneId ? { ...s, name } : s)
      try {
        await apiFetch(`/scenes/${sceneId}`, { method: 'PATCH', body: { name } })
      } catch {
        scenes.value = prev
      }
    },
    // create hotspot callback
    async (sceneId, payload) => {
      const data = await apiFetch(`/scenes/${sceneId}/hotspots`, { method: 'POST', body: payload }) as any
      if (data?.hotspot) {
        const mapped = mapDbHotspot(data.hotspot)
        hotspotsByScene.value = {
          ...hotspotsByScene.value,
          [sceneId]: [...(hotspotsByScene.value[sceneId] ?? []), mapped],
        }
      }
    },
  )
  showToast('Scenes auto-linked!')
}

let isMounted = false
let fetchScenesVersion = 0
let fetchScenesController: AbortController | null = null
const spaceLoadFailed = ref(false)

const renameCandidate = ref<{ id: string; name: string } | null>(null)
const renameDraft = ref('')
const renameSaving = ref(false)
const renameInputRef = ref<HTMLInputElement | null>(null)
const sceneDeleteConfirm = ref<string | null>(null)
const deletingScene = ref(false)

const urlCopied = ref(false)
const embedCopied = ref(false)
const activeShareTab = ref<'link' | 'embed' | 'qr'>('link')
const qrDataUrl = ref('')
const qrLoading = ref(false)
const shareTabs = [
  { id: 'link', label: 'Send a link' },
  { id: 'embed', label: 'Embed' },
  { id: 'qr', label: 'QR code' },
] as const

const ctaActionOptions = [
  { value: 'link', label: 'Link' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
] as const

// ── Settings panel: location geocoding ──────────────────────────────────────
type NominatimResult = { display_name: string; lat: string; lon: string }
const locationResults = ref<NominatimResult[]>([])
const locationDropOpen = ref(false)
const locationSearching = ref(false)
let locationTimer: ReturnType<typeof setTimeout> | null = null

function onLocationInput(val: string) {
  settingsDraft.value.locationText = val
  locationDropOpen.value = false
  locationResults.value = []
  if (locationTimer) clearTimeout(locationTimer)
  if (!val.trim()) return
  locationTimer = setTimeout(() => fetchLocationResults(val), 600)
}

async function fetchLocationResults(query: string) {
  locationSearching.value = true
  try {
    const data: NominatimResult[] = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      { headers: { 'Accept-Language': 'en-US,en' } }
    ).then(r => r.json())
    locationResults.value = data
    if (data.length) locationDropOpen.value = true
  } catch { /* ignore */ } finally {
    locationSearching.value = false
  }
}

function selectLocation(result: NominatimResult) {
  settingsDraft.value.locationText = result.display_name
  settingsDraft.value.locationLat = parseFloat(result.lat)
  settingsDraft.value.locationLng = parseFloat(result.lon)
  locationDropOpen.value = false
  locationResults.value = []
}

const mapEmbedUrl = computed(() => {
  const lat = settingsDraft.value.locationLat
  const lng = settingsDraft.value.locationLng
  if (!lat || !lng) return null
  const d = 0.015
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`
})

// ── Settings panel: logo upload ──────────────────────────────────────────────
const logoFileInput = ref<HTMLInputElement | null>(null)
const logoUploading = ref(false)
const localLogoDataUrl = ref('')
const bgRemoving = ref(false)
const bgRemoved = ref(false)

function clearLogo() {
  settingsDraft.value.logoUrl = ''
  localLogoDataUrl.value = ''
  bgRemoved.value = false
}

async function handleLogoFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { showToast('Select an image file', 'error'); return }
  bgRemoved.value = false
  // Read as DataURL for background removal (no CORS restriction)
  const reader = new FileReader()
  reader.onload = (e) => { localLogoDataUrl.value = (e.target?.result as string) || '' }
  reader.readAsDataURL(file)
  logoUploading.value = true
  try {
    const { uploadUrl, publicUrl } = (await apiFetch(`/spaces/${props.spaceId}/logo-url`, {
      method: 'POST',
      body: { contentType: file.type, fileName: file.name },
    })) as { uploadUrl: string; publicUrl: string }
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    settingsDraft.value.logoUrl = publicUrl
    showToast('Logo uploaded')
  } catch (e: any) {
    if (e?.status === 404 || e?.statusCode === 404) {
      showToast('Logo upload requires backend update — coming soon', 'error')
    } else {
      showToast('Logo upload failed', 'error')
    }
  } finally {
    logoUploading.value = false
    if (logoFileInput.value) logoFileInput.value.value = ''
  }
}

function removeImageBackground(dataUrl: string, tolerance = 40): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('no 2d ctx')); return }
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = imageData.data
      const w = canvas.width
      const h = canvas.height

      const getPixelRgb = (x: number, y: number): [number, number, number] => {
        const i = (y * w + x) * 4
        return [pixels[i], pixels[i + 1], pixels[i + 2]]
      }

      const colorDist = (a: [number, number, number], b: [number, number, number]) =>
        Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)

      // Sample the four corners to estimate the background colour
      const samples = [getPixelRgb(0,0), getPixelRgb(w-1,0), getPixelRgb(0,h-1), getPixelRgb(w-1,h-1)]
      const bg: [number, number, number] = [
        Math.round(samples.reduce((s,c)=>s+c[0],0)/4),
        Math.round(samples.reduce((s,c)=>s+c[1],0)/4),
        Math.round(samples.reduce((s,c)=>s+c[2],0)/4),
      ]

      // BFS flood-fill from every edge pixel
      const visited = new Uint8Array(w * h)
      const qx: number[] = []
      const qy: number[] = []

      const tryEnqueue = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return
        const idx = y * w + x
        if (visited[idx]) return
        visited[idx] = 1
        if (colorDist(getPixelRgb(x, y), bg) <= tolerance) { qx.push(x); qy.push(y) }
      }

      for (let x = 0; x < w; x++) { tryEnqueue(x, 0); tryEnqueue(x, h-1) }
      for (let y = 0; y < h; y++) { tryEnqueue(0, y); tryEnqueue(w-1, y) }

      for (let i = 0; i < qx.length; i++) {
        const x = qx[i], y = qy[i]
        pixels[(y * w + x) * 4 + 3] = 0
        tryEnqueue(x-1, y); tryEnqueue(x+1, y); tryEnqueue(x, y-1); tryEnqueue(x, y+1)
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('image load failed'))
    if (dataUrl.startsWith('http')) img.crossOrigin = 'anonymous'
    img.src = dataUrl
  })
}

async function handleRemoveBg() {
  if (bgRemoving.value) return
  const source = localLogoDataUrl.value || settingsDraft.value.logoUrl
  if (!source) return
  bgRemoving.value = true
  try {
    const resultDataUrl = await removeImageBackground(source)
    const res = await fetch(resultDataUrl)
    const blob = await res.blob()
    const file = new File([blob], 'logo.png', { type: 'image/png' })
    const { uploadUrl, publicUrl } = (await apiFetch(`/spaces/${props.spaceId}/logo-url`, {
      method: 'POST',
      body: { contentType: 'image/png', fileName: 'logo.png' },
    })) as { uploadUrl: string; publicUrl: string }
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': 'image/png' } })
    settingsDraft.value.logoUrl = publicUrl
    localLogoDataUrl.value = resultDataUrl
    bgRemoved.value = true
    showToast('Background removed')
  } catch {
    showToast('Background removal failed', 'error')
  } finally {
    bgRemoving.value = false
  }
}

const isPreviewMode = computed(() => editorStore.mode === 'preview')

const glassDockItems = computed(() =>
  sceneChips.value.map(s => ({
    id: s.id,
    label: s.label,
    imageUrl: s.imageUrl || null,
    ariaLabel: `Go to ${s.label}`,
    badge: s.badge,
  }))
)

function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (type === 'error') {
    toast.error(message)
  } else {
    toast.success(message)
  }
}

const shareText = computed(() => `Check out this immersive virtual tour created with Viewora: ${publicUrl.value}`)
const shareWhatsappHref = computed(() => `https://wa.me/?text=${encodeURIComponent(shareText.value)}`)
const shareXHref = computed(() => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.value)}`)
const shareGmailHref = computed(() => `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('Viewora virtual tour')}&body=${encodeURIComponent(shareText.value)}`)
const shareEmbedCode = computed(() => {
  const brandingEnabled = space.value?.branding_enabled || false
  const backlink = brandingEnabled
    ? ''
    : `\n<div style="text-align: center; margin-top: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #64748b;">\n  Created with <a href="https://viewora.software/?utm_source=embed&utm_medium=virtual_tour&utm_campaign=platform_branding" target="_blank" rel="noopener" style="color: #3b82f6; text-decoration: none; font-weight: 600;">Viewora Virtual Tour Software</a>\n</div>`
  return `<iframe src="${embedUrl.value}" width="100%" height="600" frameborder="0" allowfullscreen style="border-radius:8px; border:none;"></iframe>${backlink}`
})

async function copyPublicUrl() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    urlCopied.value = true
    setTimeout(() => { urlCopied.value = false }, 2000)
    analytics.track('tour_shared', { method: 'link', space_id: space.value?.id })
  } catch {
    showToast('Could not copy — please copy manually', 'error')
  }
}

async function copyEmbedCode() {
  try {
    await navigator.clipboard.writeText(shareEmbedCode.value)
    embedCopied.value = true
    setTimeout(() => { embedCopied.value = false }, 2000)
    analytics.track('tour_shared', { method: 'embed', space_id: space.value?.id })
  } catch {
    showToast('Could not copy — please copy manually', 'error')
  }
}

const publicUrl = computed(() => {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/p/${space.value?.slug || space.value?.id}`
})
const embedUrl = computed(() => {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/embed/${space.value?.slug || space.value?.id}`
})

watch([showShareModal, publicUrl], async ([open, url]) => {
  activeShareTab.value = 'link'
  qrDataUrl.value = ''
  qrLoading.value = false
  if (!open || !url) return

  qrLoading.value = true
  try {
    qrDataUrl.value = await QRCode.toDataURL(url, {
      width: 192,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
  } catch {
    qrDataUrl.value = ''
  } finally {
    qrLoading.value = false
  }
}, { immediate: true })

const hasPanorama = computed(() => Boolean(scenes.value.length || Object.keys(pendingScenePreviewById.value).length))

const selectedScene = computed(() =>
  scenes.value.find((s) => s.id === selectedSceneId.value) || scenes.value[0] || null
)

const activeScene = computed(() => selectedScene.value)


const activePanoramaSrc = computed(() => {
  const sceneId = activeScene.value?.id
  if (!sceneId) return placeholderPanoramaUrl

  // Instant preview: full-resolution blob URL kept alive while the file is uploading.
  // PSV's default equirectangular adapter loads via <img>, which supports blob: URLs.
  const localBlob = localPanoramaUrlById.value[sceneId]
  if (localBlob) return localBlob

  // Pending https URL pushed by the upload flow before the realtime sync arrives.
  const pending = pendingScenePreviewById.value[sceneId]
  if (pending && pending.startsWith('https://')) return pending

  // Prefer thumbnail (2048×1024) — fits WebGL limits on all devices.
  // raw_image_url is kept as fallback for scenes that haven't been processed yet.
  if (activeScene.value?.thumbnail_url) return activeScene.value.thumbnail_url
  if (activeScene.value?.raw_image_url) return activeScene.value.raw_image_url
  return placeholderPanoramaUrl
})

const activeViewerScene = computed(() => {
  const url = activePanoramaSrc.value
  if (!url || url === placeholderPanoramaUrl) return null
  const s = space.value?.property_360_settings?.[0]
  return {
    id: activeScene.value?.id ?? 'editor-scene',
    imageUrl: url,
    tileManifestUrl: activeScene.value?.tile_manifest_url ?? undefined,
    tileCols: activeScene.value?.tile_cols ?? undefined,
    tileRows: activeScene.value?.tile_rows ?? undefined,
    tilesReady: activeScene.value?.tiles_ready ?? false,
    width: activeScene.value?.width,
    height: activeScene.value?.height,
    hotspots: activeSceneHotspots.value ?? [],
    settings: {
      hfov_default: s?.hfov_default ?? 90,
      pitch_default: s?.pitch_default ?? 0,
      yaw_default: s?.yaw_default ?? 0,
      auto_rotate_enabled: s?.auto_rotate_enabled ?? false,
    },
  }
})


const hasProcessingScenes = computed(() =>
  scenes.value.some((s: any) => {
    const state = sceneUploadStateById.value[s.id] || backendSceneStatusToUploadState(s.status)
    return state !== 'ready' && state !== 'failed'
  }) || localUploads.value.length > 0
)

function unwrapApiData<T = any>(value: any): T {
  if (value && typeof value === 'object' && 'data' in value && value.data !== undefined) return value.data as T
  if (value && typeof value === 'object' && 'result' in value && value.result !== undefined) return value.result as T
  return value as T
}

function toArrayPayload<T = any>(value: any, key: string): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as any)[key])) return (value as any)[key] as T[]
  return []
}

// Poll fetchScenes while scenes are still processing so a missed realtime event
// never leaves the editor permanently stuck with a "processing" badge.
let processingPollTimer: ReturnType<typeof setInterval> | null = null
watch(hasProcessingScenes, (isProcessing) => {
  if (isProcessing && !processingPollTimer) {
    processingPollTimer = setInterval(() => {
      if (isMounted) void fetchScenes()
    }, 6000)
  } else if (!isProcessing && processingPollTimer) {
    clearInterval(processingPollTimer)
    processingPollTimer = null
  }
}, { immediate: true })

// Track processing completion
watch(hasProcessingScenes, (sceneProcessing) => {
  if (sceneProcessing) {
    window.onbeforeunload = () => 'Uploads are still processing. Are you sure you want to leave?'
  } else {
    window.onbeforeunload = null
  }
}, { immediate: true })

watch(renameCandidate, async (val) => {
  if (!val) { sceneDeleteConfirm.value = null; return }
  await nextTick()
  renameInputRef.value?.focus()
  renameInputRef.value?.select()
})

function handleRenameScene(id: string) {
  const scene = scenes.value.find((s) => s.id === id)
  if (!scene) return
  deleteCandidate.value = null
  renameDraft.value = scene.name || ''
  renameCandidate.value = { id, name: scene.name || '' }
}

async function saveRenameScene() {
  if (!renameCandidate.value || renameSaving.value) return
  const name = renameDraft.value.trim()
  if (!name) return
  renameSaving.value = true
  const { id } = renameCandidate.value
  const prevScenes = scenes.value.slice()
  scenes.value = scenes.value.map((s) => s.id === id ? { ...s, name } : s)
  renameCandidate.value = null
  try {
    await apiFetch(`/scenes/${id}`, { method: 'PATCH', body: { name } })
    showToast('Scene renamed')
  } catch (e: any) {
    scenes.value = prevScenes
    showToast(e?.data?.statusMessage || 'Failed to rename scene', 'error')
  } finally {
    renameSaving.value = false
  }
}

async function confirmDeleteScene(id: string) {
  if (deletingScene.value) return
  deletingScene.value = true
  const prevScenes = scenes.value.slice()
  const prevHotspots = { ...hotspotsByScene.value }
  const prevSelectedId = selectedSceneId.value
  renameCandidate.value = null
  sceneDeleteConfirm.value = null
  scenes.value = scenes.value.filter((s) => s.id !== id)
  const { [id]: _removed, ...remainingHotspots } = hotspotsByScene.value
  hotspotsByScene.value = remainingHotspots
  if (selectedSceneId.value === id) selectedSceneId.value = scenes.value[0]?.id || ''
  try {
    await apiFetch(`/scenes/${id}`, { method: 'DELETE' })
    showToast('Scene deleted')
  } catch (e: any) {
    scenes.value = prevScenes
    hotspotsByScene.value = prevHotspots
    selectedSceneId.value = prevSelectedId
    showToast(e?.data?.statusMessage || 'Failed to delete scene', 'error')
  } finally {
    deletingScene.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (deleteCandidate.value) { e.preventDefault(); deleteCandidate.value = null; return }
    if (renameCandidate.value) { e.preventDefault(); renameCandidate.value = null; return }
    if (showSettingsPanel.value) { showSettingsPanel.value = false; return }
    if (showShareModal.value) { showShareModal.value = false; return }
    if (inlineEditMode.value) { e.preventDefault(); inlineEditMode.value = false }
    return
  }
  const target = e.target as HTMLElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
  if (editorStore.isModalOpen) return
}

function handlePlaceHotspot(type: 'info' | 'nav') {
  placeHotspotDirect(type)
}

const activePlacementType = computed<'info' | 'nav' | null>(() => {
  if (editorStore.mode !== 'hotspot') return null
  if (hotspotDraftType.value === 'scene_link') return 'nav'
  return 'info'
})

async function handleReorderScenes(orderedIds: string[]) {
  if (orderedIds.some(isLocalSceneId)) {
    showToast('Wait for all scenes to finish uploading before reordering.', 'error')
    return
  }
  const prevScenes = scenes.value.slice()
  const idToScene = new Map(scenes.value.map((s) => [s.id, s]))
  const reordered = orderedIds.map((id, idx) => {
    const scene = idToScene.get(id)
    if (scene) {
      return { ...scene, order_index: idx }
    }
    return null
  }).filter(Boolean) as any[]
  // Preserve any scenes not present in orderedIds (e.g. added by a concurrent realtime update).
  const orderedSet = new Set(orderedIds)
  const extra = scenes.value.filter((s) => !orderedSet.has(s.id))
  scenes.value = [...reordered, ...extra]
  try {
    await Promise.all(
      orderedIds.map((id, idx) =>
        apiFetch(`/scenes/${id}`, { method: 'PATCH', body: { order_index: idx } })
      )
    )
  } catch {
    scenes.value = prevScenes
    showToast('Failed to save scene order', 'error')
  }
}

onMounted(async () => {
  isMounted = true
  window.addEventListener('keydown', handleKeydown)
  hydrateRecoverySnapshot()
  if (!planStore.plan) await planStore.fetchSubscriptionStatus()
  await fetchSpace(true)
  startSceneRealtime()
})

onBeforeUnmount(() => {
  isMounted = false
  window.removeEventListener('keydown', handleKeydown)
  fetchScenesController?.abort()
  fetchScenesController = null
  stopSceneRealtime()
  replacePendingScenePreviewMap({})
  revokeAllLocalPanoramaUrls()
  if (processingPollTimer) { clearInterval(processingPollTimer); processingPollTimer = null }
})

async function fetchScenes() {
  const version = ++fetchScenesVersion
  fetchScenesController?.abort()
  fetchScenesController = new AbortController()
  const { signal } = fetchScenesController

  try {
    const result = await apiFetch<any>(`/spaces/${props.spaceId}/scenes`, { signal })
    if (version !== fetchScenesVersion) return

    // Re-read local scenes AFTER the fetch resolves so any scenes removed by a
    // concurrent upload-failure handler are not re-inserted here.
    const optimisticLocalScenes = scenes.value.filter((s) => isLocalSceneId(s?.id))
    const loadedScenes = toArrayPayload<any>(unwrapApiData<any>(result), 'scenes')
    const mergedScenes = [...loadedScenes]
    for (const localScene of optimisticLocalScenes) {
      if (!mergedScenes.some((s: any) => s.id === localScene.id)) {
        mergedScenes.push(localScene)
      }
    }
    scenes.value = mergedScenes

    const nextSceneUploadState = { ...sceneUploadStateById.value }
    const mergedSceneIds = new Set(mergedScenes.map((s: any) => s.id))
    for (const scene of loadedScenes) {
      const mapped = backendSceneStatusToUploadState(scene.status)
      if (mapped === 'ready') {
        delete nextSceneUploadState[scene.id]
      } else if (mapped === 'processing' && scene.thumbnail_url) {
        // Status field is missing or stale but thumbnail confirms processing is done.
        // Store 'ready' explicitly so sceneChips and hasProcessingScenes see the
        // correct state — deleting the entry would cause them to fall back to the
        // raw status string which still says 'processing'.
        nextSceneUploadState[scene.id] = 'ready'
      } else {
        nextSceneUploadState[scene.id] = mapped
      }
    }
    for (const id of Object.keys(nextSceneUploadState)) {
      if (!mergedSceneIds.has(id)) delete nextSceneUploadState[id]
    }
    sceneUploadStateById.value = nextSceneUploadState

    const newMap: Record<string, EditorHotspot[]> = {}
    const pendingPreviewNext = { ...pendingScenePreviewById.value }

    const hotspotTasks = loadedScenes.map(async (scene: any) => {
      // Release the local blob URL held for the PSV viewer once the server has a real URL.
      if (localPanoramaUrlById.value[scene.id] && scene?.raw_image_url) {
        deleteLocalPanoramaUrl(scene.id)
      }

      // Clear dock thumbnail blob:/data: previews once the server provides an HTTPS URL.
      const localPreview = pendingPreviewNext[scene.id]
      const isLocalPreview = localPreview?.startsWith('blob:') || localPreview?.startsWith('data:')
      if (isLocalPreview && (scene?.raw_image_url || scene?.thumbnail_url)) {
        delete pendingPreviewNext[scene.id]
      } else if (!isLocalPreview && scene?.thumbnail_url && backendSceneStatusToUploadState(scene.status) === 'ready') {
        delete pendingPreviewNext[scene.id]
      }

      if (Array.isArray(scene.hotspots)) {
        const dbHotspots = mapDbHotspots(scene.hotspots)
        const pending = (hotspotsByScene.value[scene.id] ?? []).filter((h) => h._pending === true)
        return {
          sceneId: scene.id,
          hotspots: pending.length ? [...dbHotspots, ...pending] : dbHotspots,
        }
      }

      if (hotspotsByScene.value[scene.id] !== undefined) {
        return {
          sceneId: scene.id,
          hotspots: hotspotsByScene.value[scene.id],
        }
      }

      // Only eager-load hotspots for the active scene; all others load on-demand via selectScene()
      const activeId = selectedSceneId.value || loadedScenes[0]?.id
      if (scene.id !== activeId) return null

      try {
        const hRes = await apiFetch<any>(`/scenes/${scene.id}/hotspots`, { signal })
        if (version !== fetchScenesVersion) return null
        return {
          sceneId: scene.id,
          hotspots: mapDbHotspots(toArrayPayload<any>(unwrapApiData<any>(hRes), 'hotspots')),
        }
      } catch (err: any) {
        if (isAbortError(err)) return null
        return {
          sceneId: scene.id,
          hotspots: hotspotsByScene.value[scene.id] ?? [],
        }
      }
    })

    const hotspotResults = await Promise.all(hotspotTasks)
    if (version !== fetchScenesVersion) return
    for (const result of hotspotResults) {
      if (!result) continue
      newMap[result.sceneId] = result.hotspots
    }
    // Preserve cached hotspot data for scenes deferred this cycle
    for (const scene of mergedScenes) {
      if (!(scene.id in newMap) && hotspotsByScene.value[scene.id] !== undefined) {
        newMap[scene.id] = hotspotsByScene.value[scene.id]
      }
    }

    hotspotsByScene.value = newMap
    replacePendingScenePreviewMap(pendingPreviewNext)
    fetchScenesController = null

    if (mergedScenes.length) {
      if (!selectedSceneId.value || !mergedScenes.some((s: any) => s.id === selectedSceneId.value)) {
        selectedSceneId.value = mergedScenes[0].id
      }
    } else {
      selectedSceneId.value = ''
    }
  } catch (err: any) {
    if (isAbortError(err)) return
    fetchScenesController = null
    showToast('Could not refresh scenes — showing last known state', 'error')
  }
}

function isAbortError(err: any): boolean {
  return err?.name === 'AbortError' || err?.cause?.name === 'AbortError' || err?.type === 'aborted'
}

const { start: startSceneRealtime, stop: stopSceneRealtime } = useEditorRealtime(
  props.spaceId,
  () => { if (isMounted) void fetchScenes() },
  () => isMounted,
)

async function fetchHotspots(sceneId: string) {
  if (isLocalSceneId(sceneId)) return
  try {
    const result = await apiFetch<any>(`/scenes/${sceneId}/hotspots`)
    const list = mapDbHotspots(toArrayPayload<any>(unwrapApiData<any>(result), 'hotspots'))
    const pending = (hotspotsByScene.value[sceneId] ?? []).filter((h) => h._pending === true)
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: pending.length ? [...list, ...pending] : list }
  } catch {
    hotspotsByScene.value = { ...hotspotsByScene.value, [sceneId]: hotspotsByScene.value[sceneId] || [] }
  }
}

async function selectScene(sceneId: string) {
  if (sceneId === selectedSceneId.value) return
  selectedSceneId.value = sceneId
  const selected = scenes.value.find((s) => s.id === sceneId)
  if (selected && !sceneHasRenderableImage(selected) && selected.status !== 'ready') {
    showToast('Scene is still preparing. Showing latest ready view.', 'error')
  }
  if (!hotspotsByScene.value[sceneId]) await fetchHotspots(sceneId)
}

function handleHotspotClick(id: string) {
  const hotspot = activeSceneHotspots.value.find(h => h.id === id)
  if (!hotspot) return

  // Scene-link hotspots always navigate — exactly like tapping a chip in the dock.
  // No preview-mode gate: if you can see a nav arrow, clicking it should move you there.
  if (hotspot.type === 'scene_link' && hotspot.targetSceneId) {
    void selectScene(hotspot.targetSceneId)
    return
  }

  // URL / info / media hotspots only act in preview mode so editing clicks don't
  // accidentally open browser tabs or trigger content panels.
  if (!isPreviewMode.value) return
  if (hotspot.type === 'url' && hotspot.url) {
    window.open(hotspot.url, '_blank', 'noopener,noreferrer')
  }
}

async function handleAddScene() {
  addSceneFileInput.value?.click()
}

function statusLabel(status?: string) {
  if (status === 'pending') return 'Queued'
  if (status === 'processing') return 'Processing'
  if (status === 'complete') return 'Complete'
  if (status === 'failed') return 'Failed'
  return 'Unknown'
}

function statusBadgeClass(status?: string) {
  if (status === 'pending') return 'canvas-badge--amber'
  if (status === 'processing') return 'canvas-badge--sky'
  if (status === 'failed') return 'canvas-badge--rose'
  return 'canvas-badge--emerald'
}

async function fetchSpace(silent = false) {
  try {
    const data = await apiFetch<any>(`/spaces/${props.spaceId}`)
    spaceLoadFailed.value = false
    space.value = data

    await fetchScenes()

    if (!selectedSceneId.value && scenes.value.length) selectedSceneId.value = scenes.value[0].id
  } catch (e: any) {
    if (!space.value) spaceLoadFailed.value = true
    if (!silent) showToast('Failed to load space data', 'error')
  }
}

// Expose for new UI components that need to read/drive editor state
defineExpose({
  space,
  scenes,
  sceneChips,
  selectedSceneId,
  activeScene,
  activeSceneHotspots,
  hotspotCount,
  publishing,
  inlineEditMode,
  hotspotDraftType,
  localUploads,
  selectScene,
  handleAddScene,
  handleTogglePublish,
  showToast,
  statusLabel,
  statusBadgeClass,
})
</script>

<style scoped>
.editor-shell {
  position: fixed;
  inset: 0;
  overflow: hidden;
  /* Pin the editor subtree to deep black regardless of the global app theme. */
  --bg: #000000;
  background: #000000;
}

/* ── Toast ─────────────────────────────────────────────────── */

/* ── Animations ────────────────────────────────────────────── */
.fade-smooth-enter-active, .fade-smooth-leave-active { transition: all 0.25s ease; }
.fade-smooth-enter-from, .fade-smooth-leave-to { opacity: 0; transform: translateY(6px); }

/* ── Share modal ───────────────────────────────────────────── */
.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(60, 64, 67, 0.32);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
.share-modal {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 8px 24px rgba(60, 64, 67, 0.18);
  color: #202124;
  overflow: hidden;
}
.share-modal__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
}
.share-modal__title { font-size: 22px; font-weight: 400; color: #202124; line-height: 1.2; }
.share-modal__close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #5f6368;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms, color 120ms;
}
.share-modal__close:hover { background: rgba(60, 64, 67, 0.08); color: #202124; }
.share-modal__tabs {
  display: flex;
  gap: 8px;
  padding: 0 20px;
  border-bottom: 1px solid #e8eaed;
}
.share-modal__tab {
  position: relative;
  padding: 12px 4px 11px;
  border: none;
  background: transparent;
  color: #5f6368;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.share-modal__tab--active {
  color: #1a73e8;
}
.share-modal__tab--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: #1a73e8;
}
.share-modal__body {
  padding: 16px 20px 20px;
}
.share-modal__panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.share-modal__eyebrow {
  font-size: 13px;
  font-weight: 500;
  color: #5f6368;
}
.share-modal__link-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  border: 1px solid #dadce0;
  border-radius: 10px;
  padding: 0 12px;
  background: #fff;
}
.share-modal__link-row--code {
  align-items: center;
  padding: 10px 12px;
}
.share-modal__link {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #3c4043;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  font-family: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}
.share-modal__link--scroll { scrollbar-width: thin; }
.share-modal__link--code {
  white-space: nowrap;
  word-break: normal;
}
.share-modal__copy {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #dadce0;
  background: #f8f9fa;
  color: #1a73e8;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms, color 120ms, border-color 120ms;
  flex-shrink: 0;
}
.share-modal__copy:hover { background: #eef3fd; border-color: #c6dafc; }
.share-modal__share-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding-top: 6px;
}
.share-modal__share-item {
  width: 76px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: #3c4043;
  text-decoration: none;
}
.share-modal__share-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.share-modal__share-icon svg { width: 22px; height: 22px; }
.share-modal__share-icon--whatsapp { color: #25d366; background: rgba(37, 211, 102, 0.12); }
.share-modal__share-icon--x { color: #111827; background: #f3f4f6; }
.share-modal__share-icon--gmail { color: #ea4335; background: rgba(234, 67, 53, 0.10); }
.share-modal__share-label { font-size: 12px; font-weight: 500; color: #3c4043; }
.share-modal__preview-card {
  border: 1px solid #dadce0;
  border-radius: 14px;
  overflow: hidden;
  background: #f8f9fa;
}
.share-modal__preview-frame {
  display: block;
  width: 100%;
  height: 300px;
  border: 0;
  background: #fff;
}
.share-modal__panel--qr {
  align-items: center;
}
.share-modal__qr-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border: 1px solid #dadce0;
  border-radius: 16px;
  padding: 20px;
  background: #fff;
}
.share-modal__qr-wrap {
  width: 192px;
  height: 192px;
  border-radius: 14px;
  border: 1px solid #e8eaed;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.share-modal__qr-image {
  width: 176px;
  height: 176px;
}
.share-modal__qr-placeholder {
  width: 176px;
  height: 176px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.share-modal__qr-loading {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid #e8eaed;
  border-top-color: #1a73e8;
  animation: share-spin 0.8s linear infinite;
}
.share-modal__qr-text {
  font-size: 13px;
  color: #5f6368;
  text-align: center;
}
.share-modal__qr-url {
  font-size: 12px;
  color: #80868b;
  text-align: center;
  word-break: break-all;
}

@keyframes share-spin { to { transform: rotate(360deg); } }

.share-modal-enter-active, .share-modal-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.share-modal-enter-active .share-modal, .share-modal-leave-active .share-modal {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.share-modal-enter-from { opacity: 0; }
.share-modal-enter-from .share-modal { transform: scale(0.92) translateY(12px); }
.share-modal-leave-to { opacity: 0; }
.share-modal-leave-to .share-modal { transform: scale(0.95) translateY(6px); }

/* ── Hotspot edit panel ──────────────────────────────────── */
.hs-edit-panel {
  position: fixed;
  bottom: 104px;
  left: 50%;
  transform: translateX(-50%);
  width: 308px;
  background: rgba(10, 12, 20, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 16px;
  padding: 14px;
  z-index: 400;
  backdrop-filter: blur(12px);
}
.hs-edit-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.hs-edit-panel__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.hs-edit-panel__dot--info { background: rgba(255, 255, 255, 0.85); }
.hs-edit-panel__dot--url { background: #3B82F6; }
.hs-edit-panel__dot--scene_link { background: #3B82F6; }
.hs-edit-panel__title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  flex: 1;
}
.hs-edit-panel__type-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  padding: 2px 7px;
}
.hs-edit-panel__close {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms, color 120ms;
}
.hs-edit-panel__close:hover { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.6); }
.hs-edit-panel__type-tabs {
  display: flex;
  gap: 3px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 12px;
}
.hs-edit-panel__type-tab {
  flex: 1;
  height: 24px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.38);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.hs-edit-panel__type-tab--active {
  background: rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.85);
}
.hs-edit-panel__fields { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.hs-edit-panel__field { display: flex; flex-direction: column; gap: 4px; }
.hs-edit-panel__label-text {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}
.hs-edit-panel__input {
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  font-weight: 500;
  outline: none;
  transition: border-color 120ms;
  width: 100%;
  box-sizing: border-box;
}
.hs-edit-panel__input:focus { border-color: rgba(59, 130, 246, 0.5); }
.hs-edit-panel__input::placeholder { color: rgba(255, 255, 255, 0.2); }
.hs-edit-panel__select { cursor: pointer; appearance: none; }
.hs-edit-panel__actions { display: flex; gap: 8px; }
.hs-edit-panel__save {
  flex: 1;
  height: 32px;
  border-radius: 8px;
  background: #3B82F6;
  border: none;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hs-edit-panel__save:hover { background: #2563EB; }
.hs-edit-panel__save:disabled { opacity: 0.5; cursor: not-allowed; }
.hs-edit-panel__del {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: #f87171;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
}
.hs-edit-panel__del:hover { background: rgba(239, 68, 68, 0.10); }
.hs-edit-panel__del:disabled { opacity: 0.5; cursor: not-allowed; }
.hs-edit-panel__spin {
  display: inline-block;
  width: 11px;
  height: 11px;
  border: 1.5px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: hs-spin 0.6s linear infinite;
}
@keyframes hs-spin { to { transform: rotate(360deg); } }

/* ── Scene rename popover ───────────────────────────────── */
.rename-popover {
  position: fixed;
  bottom: 104px;
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 26%, rgba(0,0,0,0.14) 100%),
    rgba(10, 12, 20, 0.42);
  backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  -webkit-backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  padding: 14px;
  z-index: 400;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.12),
    0 24px 60px rgba(0,0,0,0.40);
}
.rename-popover__label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 8px;
}
.rename-popover__input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  font-weight: 500;
  outline: none;
  transition: border-color 120ms;
  box-sizing: border-box;
  margin-bottom: 10px;
}
.rename-popover__input:focus { border-color: rgba(59, 130, 246, 0.5); }
.rename-popover__input::placeholder { color: rgba(255, 255, 255, 0.2); }
.rename-popover__actions { display: flex; gap: 8px; }
.rename-popover__save {
  flex: 1;
  height: 30px;
  border-radius: 8px;
  background: #3B82F6;
  border: none;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
}
.rename-popover__save:hover { background: #2563EB; }
.rename-popover__save:disabled { opacity: 0.5; cursor: not-allowed; }
.rename-popover__cancel {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms, color 120ms;
}
.rename-popover__cancel:hover { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.6); }

/* ── Share modal embed section ──────────────────────────── */
.share-modal__embed { margin-bottom: 16px; }
.share-modal__embed-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 8px;
}
.share-modal__embed-code { font-family: monospace; }

/* ── Settings modal (legacy — replaced by ts-* below) ───── */
.settings-modal {
  width: 100%;
  max-width: 380px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 26%, rgba(0,0,0,0.14) 100%),
    rgba(10,12,20,0.42);
  backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  -webkit-backdrop-filter: blur(30px) saturate(1.1) brightness(1.02);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 20px;
  padding: 24px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.12),
    0 28px 72px rgba(0,0,0,0.42);
}
.settings-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}
.settings-modal__title {
  font-size: 16px;
  font-weight: 800;
  color: rgba(255,255,255,0.9);
}
.settings-modal__field {
  margin-bottom: 18px;
}
.settings-modal__field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.settings-modal__label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.65);
}
.settings-modal__sublabel {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  margin-top: 2px;
}
.settings-modal__value {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.45);
  font-family: monospace;
  min-width: 40px;
  text-align: right;
}
.settings-modal__range {
  width: 100%;
  accent-color: #3B82F6;
  cursor: pointer;
}
.settings-modal__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 22px;
}
.settings-modal__toggle {
  width: 40px;
  height: 24px;
  border-radius: 12px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 2px;
  cursor: pointer;
  transition: background 180ms, border-color 180ms;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.settings-modal__toggle--on {
  background: #3B82F6;
  border-color: #3B82F6;
  justify-content: flex-end;
}
.settings-modal__toggle-thumb {
  width: 18px;
  height: 18px;
  border-radius: 9px;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transition: background 180ms;
}
.settings-modal__actions {
  display: flex;
  gap: 8px;
}
.settings-modal__save {
  flex: 1;
  height: 40px;
  border-radius: 10px;
  background: #3B82F6;
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
  display: flex;
  align-items: center;
  justify-content: center;
}
.settings-modal__save:hover { background: #2563EB; }
.settings-modal__save:disabled { opacity: 0.5; cursor: not-allowed; }
.settings-modal__cancel {
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.settings-modal__cancel:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); }

/* ── Rename popover delete section ──────────────────────── */
.rename-popover__delete-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.rename-popover__del {
  flex: 1;
  height: 28px;
  border-radius: 7px;
  background: transparent;
  border: 1px solid rgba(239,68,68,0.22);
  color: rgba(248,113,113,0.7);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms, color 120ms, border-color 120ms;
}
.rename-popover__del:hover:not(:disabled) { background: rgba(239,68,68,0.10); color: #f87171; border-color: rgba(239,68,68,0.40); }
.rename-popover__del:disabled { opacity: 0.35; cursor: not-allowed; }
.rename-popover__del-confirm {
  flex: 1;
  height: 28px;
  border-radius: 7px;
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.40);
  color: #f87171;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rename-popover__del-confirm:hover:not(:disabled) { background: rgba(239,68,68,0.25); }
.rename-popover__del-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.rename-popover__del-abort {
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.35);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.rename-popover__del-abort:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); }

/* ── Tour Settings Panel (ts-*) ─────────────────────────── */
.ts-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.ts-panel {
  width: 100%; max-width: 480px; max-height: 88vh;
  background: #0e0e12;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 40px 100px rgba(0,0,0,0.7);
}
.ts-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.ts-header__title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9); letter-spacing: -0.01em; }
.ts-close {
  width: 28px; height: 28px; border-radius: 6px;
  background: transparent; border: none; color: rgba(255,255,255,0.3);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: color 120ms, background 120ms;
}
.ts-close:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.07); }
.ts-body { flex: 1; overflow-y: auto; min-height: 0; }
.ts-scroll::-webkit-scrollbar { width: 3px; }
.ts-scroll::-webkit-scrollbar-track { background: transparent; }
.ts-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.ts-section { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.ts-section:last-child { border-bottom: none; }
.ts-section__label {
  font-size: 9px; font-weight: 800; letter-spacing: 0.12em;
  text-transform: uppercase; color: rgba(255,255,255,0.25); margin-bottom: 16px;
}
.ts-field { margin-bottom: 16px; }
.ts-field:last-child { margin-bottom: 0; }
.ts-field__label {
  display: block; font-size: 11px; font-weight: 600;
  color: rgba(255,255,255,0.55); margin-bottom: 7px; letter-spacing: 0.01em;
}
.ts-field__opt { font-weight: 400; color: rgba(255,255,255,0.22); margin-left: 4px; font-size: 10px; }
.ts-input {
  width: 100%; height: 38px; padding: 0 12px; border-radius: 7px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.88); font-size: 13px; font-weight: 500;
  outline: none; transition: border-color 140ms, background 140ms;
  box-sizing: border-box; font-family: inherit;
}
.ts-input:focus { border-color: rgba(255,255,255,0.22); background: rgba(255,255,255,0.08); }
.ts-input::placeholder { color: rgba(255,255,255,0.2); }
.ts-textarea {
  width: 100%; padding: 10px 12px; border-radius: 7px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.88); font-size: 13px; font-weight: 500;
  outline: none; resize: none; font-family: inherit; line-height: 1.5;
  box-sizing: border-box; transition: border-color 140ms;
}
.ts-textarea:focus { border-color: rgba(255,255,255,0.22); }
.ts-textarea::placeholder { color: rgba(255,255,255,0.2); }
.ts-location-wrap { display: flex; flex-direction: column; gap: 8px; }
.ts-location-input-row { position: relative; display: flex; align-items: center; }
.ts-location-input-row .ts-input { padding-right: 36px; }
.ts-location-spin {
  position: absolute; right: 12px;
  width: 12px; height: 12px;
  border: 1.5px solid rgba(255,255,255,0.15); border-top-color: rgba(255,255,255,0.6);
  border-radius: 50%; animation: ts-spin-anim 0.6s linear infinite; pointer-events: none;
}
.ts-location-drop { border-radius: 7px; background: #1a1a20; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
.ts-location-result {
  width: 100%; display: flex; align-items: flex-start; gap: 8px;
  padding: 9px 12px; background: transparent; border: none;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer; text-align: left; transition: background 120ms;
}
.ts-location-result:last-child { border-bottom: none; }
.ts-location-result:hover { background: rgba(255,255,255,0.05); }
.ts-location-pin { color: rgba(255,255,255,0.3); flex-shrink: 0; margin-top: 1px; }
.ts-location-text { font-size: 11px; color: rgba(255,255,255,0.75); font-weight: 500; line-height: 1.4; }
.ts-map { width: 100%; height: 150px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.08); display: block; }
.ts-hidden-file { display: none; }
.ts-logo-area {
  position: relative; min-height: 80px; border-radius: 7px;
  border: 1px dashed rgba(255,255,255,0.15); cursor: pointer;
  transition: border-color 140ms, background 140ms; overflow: hidden;
}
.ts-logo-area:hover { border-color: rgba(255,255,255,0.28); background: rgba(255,255,255,0.03); }
.ts-logo-placeholder {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; padding: 20px;
  color: rgba(255,255,255,0.3); min-height: 80px;
}
.ts-logo-hint { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.3); }
.ts-logo-preview {
  width: 100%; height: 80px; object-fit: contain; object-position: center; display: block;
  background-color: rgba(255,255,255,0.03);
  background-image:
    linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}
.ts-bg-remove-btn {
  margin-top: 7px;
  width: 100%; height: 30px; border-radius: 6px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: background 140ms, border-color 140ms, color 140ms; font-family: inherit;
}
.ts-bg-remove-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); color: rgba(255,255,255,0.8); }
.ts-bg-remove-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ts-bg-remove-btn--done { border-color: rgba(34,197,94,0.3); color: rgba(134,239,172,0.85); }
.ts-spin--invert { border-color: rgba(255,255,255,0.18); border-top-color: rgba(255,255,255,0.75); }
.ts-logo-remove {
  position: absolute; top: 6px; right: 6px; width: 22px; height: 22px;
  border-radius: 5px; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 120ms, color 120ms;
}
.ts-logo-remove:hover { background: rgba(220,38,38,0.7); color: #fff; border-color: transparent; }
.ts-slider-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
.ts-slider-val { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); font-family: ui-monospace, monospace; }
.ts-range {
  width: 100%; height: 3px; appearance: none;
  background: rgba(255,255,255,0.12); border-radius: 2px; cursor: pointer; outline: none;
}
.ts-range::-webkit-slider-thumb {
  appearance: none; width: 14px; height: 14px; border-radius: 50%;
  background: #fff; border: 2px solid rgba(0,0,0,0.4);
  box-shadow: 0 2px 6px rgba(0,0,0,0.5); cursor: pointer;
}
.ts-toggle-row {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.05);
}
.ts-toggle-sub { font-size: 10px; color: rgba(255,255,255,0.28); font-weight: 500; margin-top: 2px; }
.ts-toggle {
  width: 38px; height: 22px; border-radius: 11px;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1);
  padding: 2px; cursor: pointer; display: flex; align-items: center;
  justify-content: flex-start; flex-shrink: 0;
  transition: background 200ms, border-color 200ms;
}
.ts-toggle--on { background: rgba(255,255,255,0.9); border-color: transparent; justify-content: flex-end; }
.ts-toggle-thumb {
  width: 16px; height: 16px; border-radius: 50%;
  background: rgba(255,255,255,0.6); box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  transition: background 200ms;
}
.ts-toggle--on .ts-toggle-thumb { background: #111; }
.ts-footer {
  display: flex; gap: 8px; padding: 14px 20px;
  border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
}
.ts-btn-save {
  flex: 1; height: 38px; border-radius: 7px;
  background: #ffffff; border: none; color: #0e0e12;
  font-size: 12px; font-weight: 800; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  letter-spacing: 0.02em; transition: background 130ms; font-family: inherit;
}
.ts-btn-save:hover { background: rgba(255,255,255,0.88); }
.ts-btn-save:active { transform: scale(0.98); }
.ts-btn-save:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.ts-btn-cancel {
  height: 38px; padding: 0 16px; border-radius: 7px;
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.45); font-size: 12px; font-weight: 600;
  cursor: pointer; transition: border-color 130ms, color 130ms; font-family: inherit;
}
.ts-btn-cancel:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.75); }
.ts-spin {
  display: inline-block; width: 12px; height: 12px;
  border: 1.5px solid rgba(0,0,0,0.3); border-top-color: #000;
  border-radius: 50%; animation: ts-spin-anim 0.6s linear infinite;
}
@keyframes ts-spin-anim { to { transform: rotate(360deg); } }
.ts-slide-enter-active { animation: ts-panel-in 220ms cubic-bezier(0.34,1.4,0.64,1) forwards; }
.ts-slide-leave-active { animation: ts-panel-out 160ms ease-in forwards; }
@keyframes ts-panel-in  { from { opacity:0; transform:scale(0.94) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes ts-panel-out { from { opacity:1; transform:scale(1); } to { opacity:0; transform:scale(0.96); } }

@media (max-width: 768px) {
  .editor-shell {
    overflow: hidden;
  }

  .ts-overlay,
  .share-overlay {
    padding: 12px;
  }

  .ts-panel,
  .share-modal,
  .hs-edit-panel,
  .rename-popover {
    width: calc(100vw - 24px);
    max-width: none;
  }

  .ts-panel {
    max-height: calc(100vh - 24px);
  }

  .ts-body,
  .ts-scroll {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
  }

  .hs-edit-panel,
  .rename-popover {
    left: 12px;
    right: 12px;
    bottom: 12px;
    transform: none;
  }

  .share-modal {
    border-radius: 16px;
  }

  .share-modal__topbar,
  .share-modal__tabs,
  .share-modal__body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .share-modal__share-row {
    gap: 10px;
  }

  .share-modal__preview-frame {
    height: 220px;
  }
}

@media (max-width: 640px) {
  .ts-header,
  .ts-section,
  .ts-footer {
    padding-left: 14px;
    padding-right: 14px;
  }

  .ts-panel {
    border-radius: 18px;
  }
}

/* Segmented control (CTA action picker) */
.ts-seg {
  display: flex;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  overflow: hidden;
}
.ts-seg__btn {
  flex: 1;
  height: 34px;
  background: transparent;
  border: none;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.ts-seg__btn:last-child { border-right: none; }
.ts-seg__btn--active {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.95);
}
.ts-seg__btn:hover:not(.ts-seg__btn--active) {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
}

/* ── AI Auto-link modal ─────────────────────────────────────── */
.al-modal {
  background: #fff;
  border-radius: 16px;
  width: min(540px, calc(100vw - 32px));
  max-height: 80vh;
  overflow-y: auto;
  padding: 20px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.22);
}

.al-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 0;
}
.al-loading__text { font-size: 14px; font-weight: 600; color: #111; }
.al-loading__sub  { font-size: 12px; color: #888; }

.al-error {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 0;
  color: #c0392b;
  font-size: 13px;
}

.al-section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #888;
  margin: 18px 0 8px;
}
.al-section-label:first-child { margin-top: 4px; }

.al-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.al-item {
  border-radius: 8px;
  overflow: hidden;
}
.al-item__label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 10px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 120ms;
}
.al-item__label:hover { background: #f5f5f5; }

.al-checkbox {
  margin-top: 2px;
  width: 15px;
  height: 15px;
  accent-color: #3b82f6;
  flex-shrink: 0;
}

.al-item__text {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #222;
  line-height: 1.4;
}
.al-item__from   { color: #666; }
.al-item__arrow  { color: #999; font-size: 12px; }
.al-item__detail {
  display: block;
  width: 100%;
  font-size: 11px;
  color: #999;
  margin-top: 1px;
}

.al-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: #888;
}

.al-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.al-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 120ms, opacity 120ms;
}
.al-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.al-btn--secondary { background: #f0f0f0; color: #333; }
.al-btn--secondary:hover:not(:disabled) { background: #e5e5e5; }
.al-btn--primary { background: #3b82f6; color: #fff; }
.al-btn--primary:hover:not(:disabled) { background: #2563eb; }

.al-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(0,0,0,0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.al-spinner--sm {
  width: 14px;
  height: 14px;
  border-color: rgba(255,255,255,0.3);
  border-top-color: #fff;
}
</style>
