<template>
  <div ref="viewerRootEl" class="public-viewer" :class="{ 'public-viewer--chrome-hidden': chromeHidden }" @click="onViewerClick">

    <!-- Loading progress bar -->
    <Transition name="viewer-progress">
      <div v-if="loadProgressVisible" class="viewer-progress">
        <div class="viewer-progress__bar" :style="{ width: loadProgressValue + '%' }" />
      </div>
    </Transition>

    <!-- Scene name toast -->
    <Transition name="scene-toast">
      <div v-if="sceneToastVisible" class="scene-toast">
        <span class="scene-toast__dot" />
        {{ sceneToastText }}
      </div>
    </Transition>

    <!-- Initial tour loading overlay — covers the black vt-canvas until first panorama is ready -->
    <Transition name="vt-init-load">
      <div v-if="hasTourData && !vtReady && !vtError" class="vt-init-overlay">
        <div class="vt-init-overlay__logo-wrap">
          <img :src="optimizedLoadingLogo" class="vt-init-overlay__logo" alt="" />
        </div>
        <p class="vt-init-overlay__label">Loading Tour</p>
      </div>
    </Transition>

    <!-- Interaction hint — pointer-events:none so the first touch/click ALSO rotates the panorama -->
    <Transition name="hint-fade">
      <div v-if="showInteractionHint" class="viewer-hint">
        <div class="viewer-hint__content">

          <!-- ── Touch / swipe ── -->
          <template v-if="isTouchInput">
            <div class="viewer-hint__icon-wrap">
              <!-- Single-finger swipe icon -->
              <svg class="viewer-hint__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.5 4.5a1.5 1.5 0 0 1 3 0v6"/>
                <path d="M12.5 7a1.5 1.5 0 0 1 3 0v3.5"/>
                <path d="M6.5 9a1.5 1.5 0 0 1 3 0v1.5"/>
                <path d="M6.5 10.5v2a5.5 5.5 0 0 0 5.5 5.5h.5a5.5 5.5 0 0 0 5.5-5.5V10"/>
              </svg>
              <div class="viewer-hint__arrows">
                <svg class="viewer-hint__arrow viewer-hint__arrow--left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                <svg class="viewer-hint__arrow viewer-hint__arrow--right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </div>
            <p class="viewer-hint__text">Swipe to explore</p>
          </template>

          <!-- ── Mouse / desktop ── -->
          <template v-else>
            <div class="viewer-hint__icon-wrap">
              <!-- Mouse icon with left-button highlight -->
              <svg class="viewer-hint__icon viewer-hint__icon--mouse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <!-- Mouse body -->
                <rect x="7" y="2" width="10" height="15" rx="5"/>
                <!-- Button divider -->
                <path d="M12 2v7"/>
                <!-- Left button highlighted -->
                <path d="M7 7.5h5" stroke-width="2"/>
                <!-- Scroll wheel -->
                <line x1="12" y1="11" x2="12" y2="13.5" stroke-width="2"/>
              </svg>
              <div class="viewer-hint__arrows">
                <svg class="viewer-hint__arrow viewer-hint__arrow--left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                <svg class="viewer-hint__arrow viewer-hint__arrow--right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </div>
            <p class="viewer-hint__text">Click &amp; drag</p>
          </template>

        </div>
      </div>
    </Transition>

    <!-- Control stack: toggle always visible, rail hides with chrome -->
    <div ref="controlStackEl" class="viewer-control-stack">

      <!-- Always-visible chrome toggle (lives outside the rail so opacity:0 never touches it) -->
      <button
        class="viewer-rail__btn viewer-rail__chrome-toggle"
        :class="{ 'viewer-rail__btn--active': chromeHidden }"
        type="button"
        aria-label="Toggle viewer chrome"
        :aria-pressed="chromeHidden"
        :data-tooltip="chromeHidden ? 'Show Controls' : 'Hide Controls'"
        @click.stop="toggleChrome"
      >
        <span class="chrome-switch" :class="{ 'chrome-switch--off': chromeHidden }">
          <span class="chrome-switch__thumb" />
        </span>
      </button>

      <!-- Rail (hides when chrome hidden) -->
      <div class="viewer-rail" aria-label="Viewer controls">

      <!-- VR Mode -->
      <button class="viewer-rail__btn" type="button" aria-label="VR mode" data-tooltip="VR Mode" @click.stop="toggleStereoView">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4.5 8.5h4a2.5 2.5 0 0 1 2.5 2.5v2a2.5 2.5 0 0 1-2.5 2.5h-4V8.5Z" />
          <path d="M19.5 8.5h-4a2.5 2.5 0 0 0-2.5 2.5v2a2.5 2.5 0 0 0 2.5 2.5h4V8.5Z" />
          <path d="M11 13h2" />
        </svg>
      </button>

      <!-- Share -->
      <button class="viewer-rail__btn" type="button" aria-label="Share tour" data-tooltip="Share" @click.stop="shareTour">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M16 8a3 3 0 1 0-2.83-4" />
          <path d="M8 12l8-4" />
          <path d="M8 12l8 4" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
        </svg>
      </button>

      <!-- Guided Tour (multi-scene only) -->
      <button v-if="sceneCount > 1 && hasTourData" class="viewer-rail__btn" :class="{ 'viewer-rail__btn--active': autoplaying }" type="button" aria-label="Guided tour" :aria-pressed="autoplaying" data-tooltip="Guided Tour" @click.stop="toggleAutoplay">
        <svg v-if="!autoplaying" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6 6h4v12H6zM14 6h4v12h-4z" />
        </svg>
      </button>

      <!-- Auto Rotate -->
      <button class="viewer-rail__btn" :class="{ 'viewer-rail__btn--active': autoRotateActive }" type="button" aria-label="Toggle auto rotate" :aria-pressed="autoRotateActive" data-tooltip="Auto Rotate" @click.stop="toggleAutoRotate">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21.5 2v6h-6" />
          <path d="M21.5 8A10 10 0 1 1 8 2.5" />
        </svg>
      </button>

      <!-- Gyroscope (shown only on touch/motion capable devices) -->
      <button v-if="gyroscopeSupported" class="viewer-rail__btn" :class="{ 'viewer-rail__btn--active': gyroscopeActive }" type="button" aria-label="Toggle gyroscope" :aria-pressed="gyroscopeActive" data-tooltip="Gyroscope" @click.stop="handleGyroscopeToggle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <ellipse cx="12" cy="12" rx="4" ry="10" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
      </button>

      <!-- Fullscreen -->
      <button class="viewer-rail__btn" type="button" aria-label="Fullscreen" data-tooltip="Fullscreen" @click.stop="toggleFullscreen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 3H3v5" />
          <path d="M16 3h5v5" />
          <path d="M21 16v5h-5" />
          <path d="M3 16v5h5" />
        </svg>
      </button>

      </div><!-- end .viewer-rail -->
    </div><!-- end .viewer-control-stack -->

    <!-- WhatsApp Contact Button — left side, opposite the control rail -->
    <Transition name="wa-btn">
      <a
        v-if="whatsappHref && !chromeHidden"
        :href="whatsappHref"
        class="viewer-wa-btn"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        data-tooltip="Chat on WhatsApp"
        @click.stop="onWhatsappClick"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2C6.49 2 2 6.48 2 12c0 1.89.52 3.66 1.42 5.18L2 22l4.98-1.39A9.96 9.96 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm5.8 14.16c-.24.68-1.44 1.32-1.98 1.39-.52.07-1.2.1-1.95-.12-.46-.14-1.05-.33-1.81-.66-3.18-1.38-5.24-4.6-5.39-4.81-.14-.21-1.3-1.73-1.3-3.3s.79-2.34 1.07-2.66c.28-.32.61-.4.82-.4h.58c.19 0 .45-.07.7.53.24.6.82 2.07.89 2.22.07.15.12.33.02.54-.1.21-.15.34-.3.52-.15.18-.31.4-.45.53-.15.16-.3.33-.13.63.16.31.71 1.17 1.52 1.9 1.04.92 1.9 1.21 2.22 1.37.31.16.49.14.67-.08.18-.22.77-.9.98-1.2.2-.31.4-.26.67-.16.28.1 1.74.82 2.04.97.3.14.5.22.58.34.08.12.08.74-.17 1.42Z"/>
        </svg>
      </a>
    </Transition>

    <!-- Floating CTA button (bottom-left, always above dock) -->
    <Transition name="viewer-cta-fade">
      <a
        v-if="ctaEnabled && !chromeHidden"
        :href="ctaHref"
        class="viewer-cta-btn"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
        aria-label="Call to action"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {{ ctaButtonText }}
      </a>
    </Transition>

    <!-- Post-guided-tour modal -->
    <Transition name="post-tour">
      <div v-if="showPostTourModal" class="post-tour-overlay" @click.self="showPostTourModal = false">
        <div class="post-tour-card">
          <button class="post-tour__close" aria-label="Close" @click="showPostTourModal = false">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <img v-if="props.tour?.space?.logo_url" :src="props.tour.space.logo_url" class="post-tour__logo" alt="" />
          <div class="post-tour__body">
            <p class="post-tour__eyebrow">Tour complete</p>
            <h2 class="post-tour__title">{{ props.tour?.space?.title }}</h2>
            <p v-if="props.tour?.space?.description" class="post-tour__desc">{{ props.tour.space.description }}</p>
          </div>
          <a v-if="ctaEnabled" :href="ctaHref" class="post-tour__cta" target="_blank" rel="noopener noreferrer" @click="showPostTourModal = false">
            {{ ctaButtonText }}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <a v-else-if="whatsappHref" :href="whatsappHref" class="post-tour__cta post-tour__cta--whatsapp" target="_blank" rel="noopener noreferrer" @click="showPostTourModal = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.49 2 2 6.48 2 12c0 1.89.52 3.66 1.42 5.18L2 22l4.98-1.39A9.96 9.96 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm5.8 14.16c-.24.68-1.44 1.32-1.98 1.39-.52.07-1.2.1-1.95-.12-.46-.14-1.05-.33-1.81-.66-3.18-1.38-5.24-4.6-5.39-4.81-.14-.21-1.3-1.73-1.3-3.3s.79-2.34 1.07-2.66c.28-.32.61-.4.82-.4h.58c.19 0 .45-.07.7.53.24.6.82 2.07.89 2.22.07.15.12.33.02.54-.1.21-.15.34-.3.52-.15.18-.31.4-.45.53-.15.16-.3.33-.13.63.16.31.71 1.17 1.52 1.9 1.04.92 1.9 1.21 2.22 1.37.31.16.49.14.67-.08.18-.22.77-.9.98-1.2.2-.31.4-.26.67-.16.28.1 1.74.82 2.04.97.3.14.5.22.58.34.08.12.08.74-.17 1.42Z"/></svg>
            Chat on WhatsApp
          </a>
          <button class="post-tour__dismiss" @click="showPostTourModal = false">Maybe later</button>
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
                <span class="share-modal__link share-modal__link--scroll">{{ publicUrl }}</span>
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
                >
                  <span class="share-modal__share-icon share-modal__share-icon--whatsapp" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.49 2 2 6.48 2 12c0 1.89.52 3.66 1.42 5.18L2 22l4.98-1.39A9.96 9.96 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm5.8 14.16c-.24.68-1.44 1.32-1.98 1.39-.52.07-1.2.1-1.95-.12-.46-.14-1.05-.33-1.81-.66-3.18-1.38-5.24-4.6-5.39-4.81-.14-.21-1.3-1.73-1.3-3.3s.79-2.34 1.07-2.66c.28-.32.61-.4.82-.4h.58c.19 0 .45-.07.7.53.24.6.82 2.07.89 2.22.07.15.12.33.02.54-.1.21-.15.34-.3.52-.15.18-.31.4-.45.53-.15.16-.3.33-.13.63.16.31.71 1.17 1.52 1.9 1.04.92 1.9 1.21 2.22 1.37.31.16.49.14.67-.08.18-.22.77-.9.98-1.2.2-.31.4-.26.67-.16.28.1 1.74.82 2.04.97.3.14.5.22.58.34.08.12.08.74-.17 1.42Z"/></svg>
                  </span>
                  <span class="share-modal__share-label">WhatsApp</span>
                </a>
                <a
                  :href="shareFacebookHref"
                  target="_blank"
                  rel="noopener"
                  class="share-modal__share-item"
                >
                  <span class="share-modal__share-icon share-modal__share-icon--facebook" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
                  </span>
                  <span class="share-modal__share-label">Facebook</span>
                </a>
                <a
                  :href="shareLinkedInHref"
                  target="_blank"
                  rel="noopener"
                  class="share-modal__share-item"
                >
                  <span class="share-modal__share-icon share-modal__share-icon--linkedin" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </span>
                  <span class="share-modal__share-label">LinkedIn</span>
                </a>
                <a
                  :href="shareXHref"
                  target="_blank"
                  rel="noopener"
                  class="share-modal__share-item"
                >
                  <span class="share-modal__share-icon share-modal__share-icon--x" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.78 7.72L23.2 22h-6.4l-5-6.58L5.98 22H2.84l7.2-8.2L.8 2h6.55l4.53 5.98L18.9 2Zm-1.12 18h1.72L6.42 3.94H4.58L17.78 20Z"/></svg>
                  </span>
                  <span class="share-modal__share-label">X</span>
                </a>
                <a
                  :href="shareGmailHref"
                  class="share-modal__share-item"
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

    <!-- ── VirtualTour mode: full multi-scene tour ── -->
    <ClientOnly v-if="hasTourData">
      <div
        ref="vtContainerEl"
        class="vt-canvas"
        :class="{
          'vt-canvas--ready': vtReady,
          'vt-canvas--focused': vtFocusing,
          'hide-nav-arrows': !dockCollapsed
        }"
      />

      <!-- VT error -->
      <div v-if="vtError" class="vt-overlay vt-overlay--error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="vt-overlay-icon">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <p class="vt-overlay-msg">{{ vtError }}</p>
      </div>

      <template #fallback>
        <div class="vt-overlay-fallback" />
      </template>
    </ClientOnly>

    <!-- ── Single panorama mode: direct imageUrl prop ── -->
    <ViewerShell
      v-if="!hasTourData"
      ref="viewerShellRef"
      :active-scene="singleScene"
      :hotspots="props.hotspots"
      :is-editing="false"
      @loaded="emit('loaded')"
      @error="emit('error', $event)"
      @hotspot-click="emit('hotspot-click', $event)"
    />

    <!-- ── Scene dock (both modes) ── -->
    <GlassDock
      v-if="sceneCount > 0 && !chromeHidden"
      v-model:collapsed="dockCollapsed"
      :items="dockItems"
      :active-id="activeSceneId"
      glass-class="dock-glass-superdark"
      :sortable="false"
      :bottom-px="20"
      :edge-inset-px="16"
      :max-strip-vw="80"
      :max-strip-px="860"
      :max-scale="1.6"
      :sigma-px="94"
      :lift-px="14"
      @select="handleDockSelect"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import QRCode from 'qrcode'
import { useImage } from '#imports'
import type { Hotspot } from '~/domain/hotspot'
import type { TourScene } from '~/domain/scene'
import { safeHotspots } from '~/shared/utils/guards'
import ViewerShell from '~/features/viewer/ViewerShell.vue'
import GlassDock from '~/components/ui/GlassDock.vue'
import {
  initVirtualTourViewer,
  vtGoToNode,
  vtToggleMarkerActive,
  focusHotspot,
  destroy,
  detectViewerPerformanceMode,
  toggleStereo,
  toggleAutorotate,
  isAutorotateEnabled,
  toggleGyroscope,
  isGyroscopeEnabled,
  loadScene,
  type PsvViewerHandle,
} from '~/shared/utils/viewerAdapters/psvAdapter'

const props = defineProps<{
  tour?: any
  shareUrl?: string
  imageUrl?: string
  isEditing?: boolean
  hotspots?: Hotspot[]
}>()

const img = useImage()
const optimizedLoadingLogo = computed(() => img('/globe-icon.png', { width: 80, height: 80, format: 'webp' }))

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', err: Error): void
  (e: 'add-hotspot', payload: { yaw: number; pitch: number }): void
  (e: 'hotspot-click', id: string): void
  (e: 'remove-hotspot', id: string): void
  (e: 'chrome-toggle', hidden: boolean): void
}>()

const { $posthog } = useNuxtApp()
const analytics = useAnalytics()
const { apiFetch } = useApiFetch()

const viewerRootEl = ref<HTMLElement | null>(null)
const viewerShellRef = ref<InstanceType<typeof ViewerShell> | null>(null)
const controlStackEl = ref<HTMLElement | null>(null)

// ── VirtualTour state ──────────────────────────────────────────────────────
const vtContainerEl = ref<HTMLElement | null>(null)
const vtHandle = ref<PsvViewerHandle | null>(null)
const vtReady = ref(false)
const vtError = ref('')
const vtFocusing = ref(false)
const vtTransitioning = ref(false)
const vtActiveNodeId = ref('')
const dockCollapsed = ref(true)

let _removeVisibility = () => {}
let _removeInterruptAnimation = () => {}

// ── Smart entry direction ──────────────────────────────────────────────────
// When navigating via a hotspot, store the entry context so the camera can
// face the door you just walked through instead of the scene default yaw.
type EntryContext = {
  fromSceneId:  string   // scene we're leaving
  clickedYaw:   number   // yaw of the hotspot that was clicked (in scene A)
  targetSceneId: string  // scene we're heading to
}
let pendingEntry: EntryContext | null = null
const chromeHidden = ref(false)
const autoRotateActive = ref(false)
const gyroscopeActive = ref(false)
const autoplaying = ref(false)
const showPostTourModal = ref(false)
const sceneToastText = ref('')
const sceneToastVisible = ref(false)
const loadProgressValue = ref(0)
const loadProgressVisible = ref(false)
let sceneToastTimer: ReturnType<typeof setTimeout> | null = null
let progressTimer: ReturnType<typeof setInterval> | null = null
let autoplayTimer: ReturnType<typeof setTimeout> | null = null
let autoplayFromButton = false
const viewerPerformanceMode = ref<'lite' | 'full'>('full')
let vtInitVersion = 0
const showShareModal = ref(false)
const activeShareTab = ref<'link' | 'embed' | 'qr'>('link')
const urlCopied = ref(false)
const embedCopied = ref(false)
const qrDataUrl = ref('')
const qrLoading = ref(false)

// ── Interaction hint ───────────────────────────────────────────────────────
const showInteractionHint = ref(false)
// true = touch/swipe UI, false = mouse/drag UI — set in onMounted to avoid SSR mismatch
const isTouchInput = ref(false)

function dismissHint() {
  if (!showInteractionHint.value) return
  showInteractionHint.value = false
  try { window.localStorage.setItem('viewora-hint-dismissed', 'true') } catch { /* noop */ }
}

let hintDismissHandler: (() => void) | null = null

function setupHintDismissListener() {
  if (!viewerRootEl.value || hintDismissHandler) return
  hintDismissHandler = () => {
    dismissHint()
    hintDismissHandler = null
  }
  // passive + once: fires on the very first pointer contact, doesn't block PSV's own handler
  viewerRootEl.value.addEventListener('pointerdown', hintDismissHandler, { once: true, passive: true })
}

function teardownHintDismissListener() {
  if (hintDismissHandler && viewerRootEl.value) {
    viewerRootEl.value.removeEventListener('pointerdown', hintDismissHandler)
    hintDismissHandler = null
  }
}

const shareTabs = [
  { id: 'link', label: 'Send a link' },
  { id: 'embed', label: 'Embed' },
  { id: 'qr', label: 'QR code' },
] as const

// ── Determines which mode we're in ────────────────────────────────────────
const hasTourData = computed(() => (props.tour?.scenes?.length ?? 0) > 0)
const isLiteMode = computed(() => viewerPerformanceMode.value === 'lite')

// Gyroscope only shown on devices that have motion sensors — handled in onMounted to avoid hydration mismatch
const gyroscopeSupported = ref(false)

// ── Scene list from tour ───────────────────────────────────────────────────
const tourScenes = computed<any[]>(() => {
  const raw = props.tour?.scenes ?? []
  return raw.slice().sort((a: any, b: any) => {
    const orderDiff = Number(a.order_index || 0) - Number(b.order_index || 0)
    if (orderDiff !== 0) return orderDiff
    return String(a.id || '').localeCompare(String(b.id || ''))
  })
})
const sceneCount = computed(() => tourScenes.value.length)
const tourLoadKey = computed(() => {
  if (!hasTourData.value) return ''

  const sceneKey = tourScenes.value.map((scene: any) => scene?.id ?? '').filter(Boolean).join('|')
  const sceneImageKey = tourScenes.value.map((scene: any) => {
    if (!scene) return ''
    return scene.thumbnail_url || scene.raw_image_url || scene.tile_manifest_url || ''
  }).join('|')
  const hotspotKey = tourScenes.value
    .map((scene: any) => `${scene?.id ?? ''}:${Array.isArray(scene?.hotspots) ? scene.hotspots.length : 0}`)
    .join('|')
  const spaceKey = props.tour?.space?.id ?? props.tour?.space?.slug ?? ''

  return `${spaceKey}:${sceneKey}:${sceneImageKey}:${hotspotKey}:${viewerPerformanceMode.value}`
})

const activeSceneId = computed(() =>
  hasTourData.value
    ? (vtActiveNodeId.value || tourScenes.value[0]?.id || '')
    : ''
)

const dockItems = computed(() =>
  tourScenes.value.map((s: any, idx: number) => ({
    id: s.id,
    label: s.name || `Scene ${idx + 1}`,
    imageUrl: s.thumbnail_url || null,
    ariaLabel: `Go to ${s.name || `Scene ${idx + 1}`}`,
    // If tiles are ready or we have a thumbnail, the scene is functional.
    // Only show 'loading' if it's genuinely pending, and skip 'failed' if it actually works.
    badge: (s.tiles_ready || s.thumbnail_url || s.status === 'ready') 
      ? null 
      : (s.status === 'failed' || s.status === 'error' ? 'failed' : 'loading'),
  })) as any[]
)

const ctaEnabled = computed(() =>
  !!(props.tour?.space?.cta_enabled && props.tour?.space?.cta_destination)
)
const ctaButtonText = computed(() =>
  (props.tour?.space?.cta_button_text as string) || 'Book a Viewing'
)
const ctaHref = computed(() => {
  const action = props.tour?.space?.cta_action as string
  const dest = (props.tour?.space?.cta_destination as string) || ''
  if (!dest) return '#'
  if (action === 'email') return `mailto:${dest}`
  if (action === 'phone') return `tel:${dest}`
  return dest.startsWith('http') ? dest : `https://${dest}`
})

const whatsappHref = computed(() => {
  const raw = ((props.tour?.space as any)?.phone as string | undefined)?.trim()
  if (!raw) return null

  // Normalise to E.164-compatible digits:
  // 1. Strip every character that isn't a digit, +, or leading whitespace
  // 2. Replace international-dial prefix "00" with "+"
  // 3. Strip all remaining non-digit chars except a leading "+"
  let clean = raw.replace(/[\s\-().\/]/g, '')          // remove common separators
  if (clean.startsWith('00')) clean = '+' + clean.slice(2) // 00XX → +XX
  clean = clean.replace(/[^0-9+]/g, '')                // strip anything else
  // Remove inline "+" (only a leading + is valid in E.164)
  if (clean.includes('+')) {
    clean = '+' + clean.replace(/\+/g, '')
  }

  if (!clean) return null
  const title = ((props.tour?.space as any)?.title as string) || 'this property'
  const link = props.shareUrl || ''
  const msg = link
    ? `Hi, I just viewed "${title}" on Viewora and I'm interested.\n\nTour link: ${link}\n\nCould you please share more details?`
    : `Hi, I just viewed "${title}" on Viewora and I'm interested. Could you please share more details?`
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
})

function onWhatsappClick() {
  const spaceId = (props.tour?.space as any)?.id
  if (!spaceId) return
  // Fire-and-forget: record a WhatsApp click as a lead so it appears in the Lead Hub
  apiFetch('/leads', {
    method: 'POST',
    body: { spaceId, source: 'whatsapp' },
  }).catch(() => {})
}

// ── Single-scene mode (no tour) ────────────────────────────────────────────
const singleScene = computed<TourScene | null>(() => {
  if (!props.imageUrl) return null
  return {
    id: 'direct',
    imageUrl: props.imageUrl,
    title: undefined,
    hotspots: props.hotspots ?? [],
    settings: { hfov_default: 90, pitch_default: 0, yaw_default: 0, auto_rotate_enabled: false },
  }
})

const publicUrl = computed(() => {
  if (props.shareUrl) return props.shareUrl
  return typeof window !== 'undefined' ? window.location.href : ''
})

const shareText = computed(() => `Check out this immersive virtual tour created with Viewora: ${publicUrl.value}`)
const shareWhatsappHref = computed(() => `https://wa.me/?text=${encodeURIComponent(shareText.value)}`)
const shareXHref = computed(() => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.value)}`)
const shareFacebookHref = computed(() => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl.value)}`)
const shareLinkedInHref = computed(() => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl.value)}`)
const shareGmailHref = computed(() => `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('Viewora virtual tour')}&body=${encodeURIComponent(shareText.value)}`)
const embedUrl = computed(() => {
  if (!publicUrl.value) return ''
  try {
    const target = new URL(publicUrl.value, typeof window !== 'undefined' ? window.location.origin : 'https://viewora.software')
    const slug = target.pathname.split('/').filter(Boolean).pop() || ''
    return `${target.origin}/embed/${slug}`
  } catch {
    return publicUrl.value.replace('/p/', '/embed/')
  }
})
const shareEmbedCode = computed(() => {
  const title = props.tour?.space?.title || 'Viewora tour'
  const brandingEnabled = props.tour?.space?.branding_enabled || false
  const backlink = brandingEnabled
    ? ''
    : `\n<div style="text-align: center; margin-top: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #64748b;">\n  Created with <a href="https://viewora.software/?utm_source=embed&utm_medium=virtual_tour&utm_campaign=platform_branding" target="_blank" rel="noopener" style="color: #3b82f6; text-decoration: none; font-weight: 600;">Viewora Virtual Tour Software</a>\n</div>`
  return `<iframe src="${embedUrl.value}" width="100%" height="600" frameborder="0" allowfullscreen style="border-radius:8px; border:none;"></iframe>${backlink}`
})

function sceneImageUrl(scene: any): string {
  if (!scene) return ''
  // Always prefer thumbnail (2048×1024) as the PSV baseUrl — it's shown as the
  // low-res preview while tiles load, and is a safe WebGL-compatible fallback
  // when tiles don't exist. raw_image_url (40-50 MB) exceeds mobile GPU limits.
  const rawUrl = scene.thumbnail_url || scene.raw_image_url || scene.tile_manifest_url || ''
  if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return rawUrl
  
  // Use Nuxt Image to get a 2048px WebP version for the baseUrl texture
  try {
    return img(rawUrl, { width: 2048, format: 'webp', quality: 85 })
  } catch {
    return rawUrl
  }
}

async function copyPublicUrl() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    urlCopied.value = true
    setTimeout(() => { urlCopied.value = false }, 2000)
    analytics.track('tour_shared', { method: 'link', space_id: props.tour?.space?.id })
  } catch {
    // no-op: user can copy manually
  }
}

async function copyEmbedCode() {
  try {
    await navigator.clipboard.writeText(shareEmbedCode.value)
    embedCopied.value = true
    setTimeout(() => { embedCopied.value = false }, 2000)
    analytics.track('tour_shared', { method: 'embed', space_id: props.tour?.space?.id })
  } catch {
    // no-op: user can copy manually
  }
}

// ── Map raw API scene → TourScene (for passing to initVirtualTourViewer) ──
function mapRawScene(s: any): TourScene {
  const settings360 = props.tour?.space?.property_360_settings?.[0]
  return {
    id: s.id,
    imageUrl: sceneImageUrl(s),
    rawImageUrl: s.raw_image_url || undefined,
    tileManifestUrl: s.tile_manifest_url || undefined,
    tileCols: s.tile_cols ?? undefined,
    tileRows: s.tile_rows ?? undefined,
    tilesReady: s.tiles_ready ?? false,
    tileMediumManifestUrl: s.tile_medium_manifest_url || undefined,
    tileMediumCols: s.tile_medium_cols ?? undefined,
    tileMediumRows: s.tile_medium_rows ?? undefined,
    width: s.width ?? undefined,
    height: s.height ?? undefined,
    positionX: s.position_x ?? 0,
    positionY: s.position_y ?? 0,
    title: s.name,
    hotspots: [],
    settings: {
      hfov_default: settings360?.hfov_default ?? 90,
      pitch_default: s.initial_pitch ?? settings360?.pitch_default ?? 0,
      yaw_default: s.initial_yaw ?? settings360?.yaw_default ?? 0,
      auto_rotate_enabled: settings360?.auto_rotate_enabled ?? false,
    },
  }
}

// ── Build hotspots dict from all scenes in tour ────────────────────────────
function buildAllHotspots(): Record<string, Hotspot[]> {
  const result: Record<string, Hotspot[]> = {}
  for (const s of tourScenes.value) {
    if (Array.isArray(s.hotspots)) {
      result[s.id] = safeHotspots(s.hotspots)
    }
  }
  return result
}

// ── Initialize VirtualTour viewer ─────────────────────────────────────────
async function initVT() {
  if (!vtContainerEl.value || !hasTourData.value) return
  const version = ++vtInitVersion

  // Tear down previous instance
  if (vtHandle.value) {
    destroy(vtHandle.value)
    vtHandle.value = null
  }

  vtReady.value = false
  vtError.value = ''
  vtFocusing.value = false

  // Kick off the same progress bar used during scene switches so the
  // initial black screen gets a consistent loading treatment.
  loadProgressValue.value = 0
  loadProgressVisible.value = true
  if (progressTimer) clearInterval(progressTimer)
  progressTimer = setInterval(() => {
    loadProgressValue.value = Math.min(78, loadProgressValue.value + 3)
  }, 60)

  const mappedScenes = tourScenes.value.map(mapRawScene)
  const hotspotsByScene = buildAllHotspots()

  // ── Scene memory — restore from URL hash if present ─────────────────────
  // When a viewer is refreshed or the link is shared with #scene=<id>,
  // start from the remembered/shared scene instead of always scene 0.
  const hashSceneId = typeof window !== 'undefined'
    ? (window.location.hash.match(/#scene=([^&]+)/)?.[1] ?? '')
    : ''
  const validHashScene = hashSceneId && tourScenes.value.some(s => s.id === hashSceneId)
    ? hashSceneId
    : ''
  const startNodeId = validHashScene || (tourScenes.value[0]?.id ?? '')
  const autoRotate = props.tour?.space?.property_360_settings?.[0]?.auto_rotate_enabled ?? false

  try {
    const handle = await initVirtualTourViewer(
      vtContainerEl.value,
      mappedScenes,
      hotspotsByScene,
      startNodeId,
      {
        autoRotate,
        performanceMode: viewerPerformanceMode.value,
        loadingImg: optimizedLoadingLogo.value,
        onReady: () => {
          if (version !== vtInitVersion) return
          // Complete the initial load progress bar
          if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
          loadProgressValue.value = 100
          setTimeout(() => { loadProgressVisible.value = false; loadProgressValue.value = 0 }, 320)
          vtReady.value = true
          autoRotateActive.value = props.tour?.space?.property_360_settings?.[0]?.auto_rotate_enabled ?? false
          vtActiveNodeId.value = startNodeId
          emit('loaded')
        },
        onError: (err) => {
          if (version !== vtInitVersion) return
          vtTransitioning.value = false
          vtError.value = err.message || 'Panorama load failed'
          emit('error', err)
        },
        onNodeChanged: (nodeId) => {
          if (version !== vtInitVersion) return
          vtTransitioning.value = false
          vtFocusing.value = false
          activeInfoMarkerId = ''
          preFocusPosition = null
          $posthog?.capture('scene_navigated', {
            from_scene: vtActiveNodeId.value,
            to_scene: nodeId,
            via: 'hotspot',
          })
          vtActiveNodeId.value = nodeId

          // Deactivate all info markers
          const allHS = buildAllHotspots()
          for (const hotspots of Object.values(allHS)) {
            for (const h of hotspots) vtToggleMarkerActive(handle, h.id, false)
          }

          // ── Smart entry direction ──────────────────────────────────────
          // Orient the camera so the viewer faces the door they just walked
          // through, not the scene default. This makes navigation feel natural
          // — you "walk in" and immediately see the room you came from.
          if (pendingEntry && pendingEntry.targetSceneId === nodeId) {
            const entry     = pendingEntry
            pendingEntry    = null
            const newSceneHotspots = allHS[nodeId] ?? []

            // Look for the back hotspot in the new scene (one that leads back to where we came from)
            const backHotspot = newSceneHotspots.find(
              h => h.type === 'scene_link' && h.targetSceneId === entry.fromSceneId,
            )

            let facingYaw: number
            if (backHotspot) {
              // Face the hotspot that leads back — you're now "standing in front of" the door you came through
              facingYaw = backHotspot.yaw
            } else {
              // No back hotspot found — flip 180° from the direction we were heading
              facingYaw = entry.clickedYaw + Math.PI
              if (facingYaw > Math.PI) facingYaw -= 2 * Math.PI
            }

            // Short, snappy rotation — just reorients, not a dramatic sweep.
            // 200ms delay lets the thumbnail upload to GPU first so the rotation
            // animation doesn't compete with texture upload on scene entry.
            setTimeout(() => {
              requestAnimationFrame(() => {
                try {
                  handle.viewer?.animate({
                    yaw:   facingYaw,
                    pitch: 0,
                    speed: '8rpm',
                  })
                } catch { /* noop */ }
              })
            }, 200)
          } else {
            // Dock/autoplay navigation: no pendingEntry means the camera pitch was
            // never reset. If the user was looking at a floor arrow (pitch ≈ -0.8 rad)
            // before clicking the dock button, they'd arrive in the new scene staring
            // at the floor. Reset to the scene's configured default pitch/yaw.
            const targetScene = mappedScenes.find(s => s.id === nodeId)
            setTimeout(() => {
              requestAnimationFrame(() => {
                try {
                  handle.viewer?.animate({
                    yaw:   targetScene?.settings.yaw_default ?? 0,
                    pitch: targetScene?.settings.pitch_default ?? 0,
                    speed: '8rpm',
                  })
                } catch { /* noop */ }
              })
            }, 200)
          }
        },
        onMarkerClick: (markerId, type, url) => {
          if (version !== vtInitVersion) return
          $posthog?.capture('hotspot_interacted', { hotspot_type: type })
          handleMarkerClick(handle, markerId, type, url)
        },
        onBackgroundClick: () => {
          if (version !== vtInitVersion) return
          if (!vtFocusing.value) return
          dismissInfoCard(handle)
        },
        onAutorotateChange: (enabled) => {
          autoRotateActive.value = enabled
        },
      }
    )
    if (version !== vtInitVersion) { destroy(handle); return }
    vtHandle.value = handle
  } catch (err: any) {
    if (version !== vtInitVersion) return
    vtError.value = err?.message || 'Viewer initialisation failed'
    emit('error', err instanceof Error ? err : new Error(String(err)))
  }
}

// Plays once per viewer mount — wide-angle zoom settling into the scene

function loadFullQuality() {
  viewerPerformanceMode.value = 'full'
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem('viewora-viewer-performance-mode', 'full')
    } catch { /* noop */ }
  }
  if (hasTourData.value) {
    setTimeout(() => initVT(), 0)
  }
}

let activeInfoMarkerId = ''
let preFocusPosition: { yaw: number; pitch: number; zoom: number } | null = null

function dismissInfoCard(handle: PsvViewerHandle) {
  vtFocusing.value = false
  activeInfoMarkerId = ''
  const allHS = buildAllHotspots()
  for (const hotspots of Object.values(allHS)) {
    for (const h of hotspots) vtToggleMarkerActive(handle, h.id, false)
  }
  // Restore camera to pre-focus position
  if (preFocusPosition && handle.viewer) {
    const pos = preFocusPosition
    preFocusPosition = null
    try {
      handle.viewer.animate({ yaw: pos.yaw, pitch: pos.pitch, zoom: pos.zoom, speed: '4rpm' })
    } catch { /* noop */ }
  } else {
    preFocusPosition = null
  }
}

async function handleMarkerClick(handle: PsvViewerHandle, markerId: string, type: string, url = '') {
  if (vtTransitioning.value) return

  if (type === 'info') {
    // Toggle: clicking the already-active info hotspot closes the card
    if (vtFocusing.value && activeInfoMarkerId === markerId) {
      dismissInfoCard(handle)
      return
    }
    // Save camera position before zooming so we can restore it on dismiss
    try {
      const pos = handle.viewer?.getPosition?.()
      const zoom = handle.viewer?.getZoomLevel?.() ?? 50
      if (pos) preFocusPosition = { yaw: pos.yaw, pitch: pos.pitch, zoom }
    } catch { /* noop */ }
    // Deactivate any other active info cards
    const all = buildAllHotspots()
    for (const hotspots of Object.values(all)) {
      for (const h of hotspots) {
        if (h.id !== markerId) vtToggleMarkerActive(handle, h.id, false)
      }
    }
    activeInfoMarkerId = markerId
    vtFocusing.value = true
    vtToggleMarkerActive(handle, markerId, true)
    await focusHotspot(handle, markerId)
    return
  }

  // For non-info types, always clear any active info card first
  dismissInfoCard(handle)

  const all = buildAllHotspots()

  if (type === 'url') {
    // Open external link — url comes directly from the marker data attribute
    const target = url || (() => {
      for (const hotspots of Object.values(all)) {
        const h = hotspots.find(x => x.id === markerId)
        if (h?.url) return h.url
      }
      return ''
    })()
    if (target) window.open(target, '_blank', 'noopener,noreferrer')

  } else if (type === 'scene_link') {
    try {
      const marker = handle.markers?.getMarker(markerId)
      const targetSceneId = marker?.config?.data?.targetSceneId
        || (() => {
          for (const hotspots of Object.values(all)) {
            const h = hotspots.find(x => x.id === markerId)
            if (h?.targetSceneId) return h.targetSceneId
          }
          return null
        })()

      if (targetSceneId) {
        // Capture the yaw of the clicked hotspot so onNodeChanged can orient
        // the camera toward the entry point (facing the door you walked through).
        const clickedHotspot = (() => {
          for (const hotspots of Object.values(all)) {
            const h = hotspots.find(x => x.id === markerId)
            if (h) return h
          }
          return null
        })()

        if (clickedHotspot) {
          pendingEntry = {
            fromSceneId:   vtActiveNodeId.value,
            clickedYaw:    clickedHotspot.yaw,
            targetSceneId,
          }
        }

        vtTransitioning.value = true
        const success = await vtGoToNode(handle, targetSceneId)
        if (!success) { vtTransitioning.value = false; pendingEntry = null }
      }
    } catch {
      vtTransitioning.value = false
      pendingEntry = null
    }
  }

  emit('hotspot-click', markerId)
}

// ── GlassDock navigation ───────────────────────────────────────────────────
async function handleDockSelect(sceneId: string) {
  autoplayFromButton = true
  if (autoplaying.value) { autoplaying.value = false; if (autoplayTimer) { clearTimeout(autoplayTimer); autoplayTimer = null } }
  if (vtHandle.value && !vtTransitioning.value && vtActiveNodeId.value !== sceneId) {
    vtTransitioning.value = true
    $posthog?.capture('scene_navigated', {
      from_scene: vtActiveNodeId.value,
      to_scene: sceneId,
      via: 'dock',
    })
    try {
      const success = await vtGoToNode(vtHandle.value, sceneId)
      if (!success) vtTransitioning.value = false
    } catch {
      vtTransitioning.value = false
    }
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
// ── Tooltip touch flash ────────────────────────────────────────────────────
let tooltipFlashTimer: ReturnType<typeof setTimeout> | null = null

function onRailTouchStart(e: TouchEvent) {
  const btn = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement | null
  if (!btn) return
  // Remove any existing flash first (handles rapid taps)
  controlStackEl.value?.querySelectorAll('.tooltip-show').forEach(el => el.classList.remove('tooltip-show'))
  if (tooltipFlashTimer) clearTimeout(tooltipFlashTimer)
  btn.classList.add('tooltip-show')
  tooltipFlashTimer = setTimeout(() => btn.classList.remove('tooltip-show'), 1200)
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    // Detect input type: coarse = touch/stylus, fine = mouse
    isTouchInput.value = window.matchMedia('(pointer: coarse)').matches

    // Check for motion sensor support — reliably indicated by touch support
    // (Laptops with touch/gyro will show it, standard desktops will not)
    gyroscopeSupported.value = navigator.maxTouchPoints > 0

    try {
      const savedMode = window.sessionStorage.getItem('viewora-viewer-performance-mode')
      viewerPerformanceMode.value = savedMode === 'lite' || savedMode === 'full'
        ? savedMode
        : detectViewerPerformanceMode()
    } catch {
      viewerPerformanceMode.value = detectViewerPerformanceMode()
    }
  } else {
    viewerPerformanceMode.value = detectViewerPerformanceMode()
  }

  controlStackEl.value?.addEventListener('touchstart', onRailTouchStart, { passive: true })

  // Restore WebGL context after screen wake / tab return.
  // Mobile browsers reclaim GPU resources when the screen turns off, leaving a blank
  // canvas. Re-loading the current scene rebuilds the WebGL context automatically.
  const onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return
    if (!vtHandle.value) return
    const renderer = vtHandle.value.viewer?.renderer?.renderer
    if (renderer?.isContextLost()) {
      const scene = tourScenes.value.find((s: TourScene) => s.id === vtActiveNodeId.value)
      if (scene) loadScene(vtHandle.value, scene).catch(() => {})
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  _removeVisibility = () => document.removeEventListener('visibilitychange', onVisibilityChange)

  // Cancel any in-progress camera animation the instant the user interacts.
  // PSV's animate() doesn't stop on user input by default — without this, the
  // smart-entry rotation fights the user until it completes.
  const onInterruptAnimation = () => {
    try { vtHandle.value?.viewer?.stopAnimation() } catch { /* noop */ }
  }
  viewerRootEl.value?.addEventListener('pointerdown', onInterruptAnimation, { passive: true })
  _removeInterruptAnimation = () => viewerRootEl.value?.removeEventListener('pointerdown', onInterruptAnimation)

  if (hasTourData.value) {
    // wait one tick for vtContainerEl to be rendered by ClientOnly
    setTimeout(() => initVT(), 0)
  }

  // Prefetch thumbnails + first tile of the 2nd and 3rd scenes during idle time.
  // Thumbnails appear instantly on navigation; the first tile primes the browser cache
  // so the transition feels immediate even before PSV's preload finishes.
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      const nextScenes = tourScenes.value.slice(1, 3)
      const isLite = viewerPerformanceMode.value === 'lite'
      for (const s of nextScenes) {
        // Always warm the thumbnail (fast, tiny)
        const thumb = s.thumbnail_url || s.raw_image_url
        if (thumb) { const img = new Image(); img.src = thumb }

        // Warm the first tile (col 0, row 0) of the appropriate tile set
        if (isLite && s.tile_medium_manifest_url) {
          fetch(`${s.tile_medium_manifest_url}/0_0.webp`, { priority: 'low' } as any).catch(() => {})
        } else if (!isLite && s.tile_manifest_url) {
          fetch(`${s.tile_manifest_url}/0_0.webp`, { priority: 'low' } as any).catch(() => {})
        }
      }
    }, { timeout: 3000 })
  }
})

// Show hint after the viewer is ready — wait for the init overlay to finish fading (600ms transition + buffer)
watch(vtReady, (ready) => {
  if (!ready) return
  if (typeof window === 'undefined') return
  try { if (window.localStorage.getItem('viewora-hint-dismissed')) return } catch { /* noop */ }
  setTimeout(() => {
    if (showInteractionHint.value) return
    showInteractionHint.value = true
    setupHintDismissListener()
  }, 900) // 600ms overlay fade + 300ms buffer
})

onUnmounted(() => {
  vtInitVersion++
  if (vtHandle.value) { destroy(vtHandle.value); vtHandle.value = null }
  if (sceneToastTimer) clearTimeout(sceneToastTimer)
  if (progressTimer) clearInterval(progressTimer)
  if (autoplayTimer) clearTimeout(autoplayTimer)
  if (tooltipFlashTimer) clearTimeout(tooltipFlashTimer)
  controlStackEl.value?.removeEventListener('touchstart', onRailTouchStart)
  teardownHintDismissListener()
  _removeVisibility()
  _removeInterruptAnimation()
})

// Re-init VT if the tour data changes (e.g. navigating to a different tour)
watch(
  () => tourLoadKey.value,
  (next, prev) => {
    if (next && next !== prev && hasTourData.value) {
      // wait for vtContainerEl after re-render
      setTimeout(() => initVT(), 0)
    }
  }
)

// Close info card on background click; restore chrome if hidden
function onViewerClick() {
  if (chromeHidden.value) {
    toggleChrome()
    return
  }
  if (vtFocusing.value && vtHandle.value) {
    dismissInfoCard(vtHandle.value)
  }
}

function showActionMessage(message: string) {
  void message
}

function toggleChrome() {
  chromeHidden.value = !chromeHidden.value
  emit('chrome-toggle', chromeHidden.value)
}

function toggleAutoRotate() {
  if (hasTourData.value) {
    if (vtHandle.value) {
      toggleAutorotate(vtHandle.value)
      autoRotateActive.value = isAutorotateEnabled(vtHandle.value)
    }
  } else {
    viewerShellRef.value?.toggleAutorotate?.()
    autoRotateActive.value = !autoRotateActive.value
  }
}

async function handleGyroscopeToggle() {
  if (!vtHandle.value) return
  // iOS 13+ requires explicit permission before DeviceOrientationEvent fires.
  // Requesting it inside a user-gesture handler (button click) satisfies the requirement.
  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as any).requestPermission === 'function'
  ) {
    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission()
      if (permission !== 'granted') return
    } catch {
      return
    }
  }
  toggleGyroscope(vtHandle.value)
  gyroscopeActive.value = isGyroscopeEnabled(vtHandle.value)
}

function shareTour() {
  showShareModal.value = true
}

async function toggleFullscreen() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    const target = viewerRootEl.value?.parentElement || viewerRootEl.value
    if (target?.requestFullscreen) {
      await target.requestFullscreen()
    }
  } catch {
    // silent by design
  }
}

function toggleStereoView() {
  if (hasTourData.value) {
    if (vtHandle.value) toggleStereo(vtHandle.value)
    return
  }
  viewerShellRef.value?.toggleStereo?.()
}

function scheduleNextAutoplayScene() {
  if (autoplayTimer) clearTimeout(autoplayTimer)
  autoplayTimer = setTimeout(async () => {
    if (!autoplaying.value || !vtHandle.value) return
    const idx = tourScenes.value.findIndex((s: any) => s.id === vtActiveNodeId.value)
    const isLast = idx === tourScenes.value.length - 1
    if (isLast) {
      autoplaying.value = false
      if (autoplayTimer) { clearTimeout(autoplayTimer); autoplayTimer = null }
      showPostTourModal.value = true
      return
    }
    const next = tourScenes.value[idx + 1]
    if (!next) return
    vtTransitioning.value = true
    autoplayFromButton = false
    try {
      const ok = await vtGoToNode(vtHandle.value, next.id)
      if (!ok) vtTransitioning.value = false
    } catch { vtTransitioning.value = false }
  }, 9000)
}

function toggleAutoplay() {
  autoplaying.value = !autoplaying.value
  if (autoplaying.value) {
    scheduleNextAutoplayScene()
  } else {
    if (autoplayTimer) { clearTimeout(autoplayTimer); autoplayTimer = null }
  }
}

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
      color: { dark: '#111827', light: '#ffffff' },
    })
  } finally {
    qrLoading.value = false
  }
})

watch(
  () => hasTourData.value,
  () => {
    autoRotateActive.value = false
  },
)

// Scene name toast on transition
watch(vtActiveNodeId, (newId, oldId) => {
  if (!newId || newId === oldId) return

  // ── Persist current scene in URL hash ─────────────────────────────────
  // Allows the viewer to resume from this scene on refresh, and makes the
  // URL shareable — someone opening the link lands on the same scene.
  if (typeof window !== 'undefined') {
    const url = `${window.location.pathname}${window.location.search}#scene=${newId}`
    window.history.replaceState(null, '', url)
  }

  if (!oldId) return   // suppress toast on initial load
  const scene = tourScenes.value.find((s: any) => s.id === newId)
  const name = scene?.name || ''
  if (!name) return
  sceneToastText.value = name
  sceneToastVisible.value = true
  if (sceneToastTimer) clearTimeout(sceneToastTimer)
  sceneToastTimer = setTimeout(() => { sceneToastVisible.value = false }, 2600)
  if (autoplaying.value && !autoplayFromButton) scheduleNextAutoplayScene()
})

// Loading progress bar during transitions
watch(() => vtTransitioning.value, (loading) => {
  if (loading) {
    loadProgressValue.value = 0
    loadProgressVisible.value = true
    if (progressTimer) clearInterval(progressTimer)
    progressTimer = setInterval(() => {
      loadProgressValue.value = Math.min(78, loadProgressValue.value + 3)
    }, 60)
  } else {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
    loadProgressValue.value = 100
    setTimeout(() => {
      loadProgressVisible.value = false
      loadProgressValue.value = 0
    }, 320)
  }
})
</script>

<style scoped>
.public-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
  overscroll-behavior: none;
}

/* Stack: holds the always-visible toggle + the hideable rail */
.viewer-control-stack {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 35;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* Rail: no longer absolutely positioned — stack handles that */
.viewer-rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: opacity 220ms ease, transform 220ms ease;
}

.public-viewer--chrome-hidden .viewer-rail {
  opacity: 0;
  pointer-events: none;
  transform: translateX(8px);
}

.viewer-rail__btn {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(10, 12, 20, 0.66);
  backdrop-filter: blur(14px) saturate(1.15);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
  color: rgba(255, 255, 255, 0.68);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 140ms ease, background 140ms ease, color 140ms ease, border-color 140ms ease;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

.viewer-rail__btn svg {
  width: 18px;
  height: 18px;
}

.viewer-rail__btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}

.viewer-rail__btn--active {
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.26);
}

.viewer-rail__btn:active {
  transform: scale(0.96);
}

/* Tooltip on hover — floats to the left of each button */
.viewer-rail__btn[data-tooltip]::before {
  content: attr(data-tooltip);
  position: absolute;
  right: calc(100% + 9px);
  top: 50%;
  transform: translateY(-50%) translateX(4px);
  background: rgba(10, 11, 16, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(14px);
  color: rgba(255, 255, 255, 0.88);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  padding: 5px 10px;
  border-radius: 6px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 130ms ease, transform 130ms ease;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  z-index: 50;
}

/* Desktop hover */
.viewer-rail__btn[data-tooltip]:hover::before {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* Mobile tap flash — self-dismissing via keyframe */
.viewer-rail__btn.tooltip-show::before {
  animation: tooltip-flash 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes tooltip-flash {
  0%   { opacity: 0; transform: translateY(-50%) translateX(4px); }
  18%  { opacity: 1; transform: translateY(-50%) translateX(0); }
  72%  { opacity: 1; transform: translateY(-50%) translateX(0); }
  100% { opacity: 0; transform: translateY(-50%) translateX(2px); }
}

/* Toggle switch (chrome hide/show button) */
.viewer-rail__chrome-toggle svg {
  display: none;
}

.chrome-switch {
  width: 28px;
  height: 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  padding: 2px;
  display: flex;
  align-items: center;
  transition: background 220ms ease;
  flex-shrink: 0;
}

.chrome-switch--off {
  background: rgba(255, 255, 255, 0.08);
}

.chrome-switch__thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: translateX(12px);
  flex-shrink: 0;
}

.chrome-switch--off .chrome-switch__thumb {
  transform: translateX(0);
}

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

.share-modal__tab--active { color: #1a73e8; }

.share-modal__tab--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 999px;
  background: #1a73e8;
}

.share-modal__body { padding: 16px 20px 20px; }

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
.share-modal__share-icon--facebook { color: #1877F2; background: rgba(24, 119, 242, 0.10); }
.share-modal__share-icon--linkedin { color: #0A66C2; background: rgba(10, 102, 194, 0.10); }
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

.share-modal__panel--qr { align-items: center; }

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
  transition: opacity 180ms ease;
}

.share-modal-enter-active .share-modal, .share-modal-leave-active .share-modal {
  transition: transform 180ms ease, opacity 180ms ease;
}

.share-modal-enter-from { opacity: 0; }
.share-modal-enter-from .share-modal { transform: scale(0.92) translateY(12px); }
.share-modal-leave-to { opacity: 0; }
.share-modal-leave-to .share-modal { transform: scale(0.95) translateY(6px); }

.viewer-quality-banner {
  position: absolute;
  left: 50%;
  top: 18px;
  transform: translateX(-50%);
  z-index: 36;
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(100vw - 24px, 680px);
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(7, 10, 16, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px) saturate(1.1);
  -webkit-backdrop-filter: blur(18px) saturate(1.1);
}

.viewer-quality-banner__copy {
  min-width: 0;
  flex: 1;
}

.viewer-quality-banner__title {
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 2px;
}

.viewer-quality-banner__msg {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.55);
}

.viewer-quality-banner__btn {
  flex-shrink: 0;
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.88);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
}

.viewer-quality-banner__btn:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.viewer-action-badge {
  position: absolute;
  right: 18px;
  top: calc(50% + 210px);
  z-index: 36;
  max-width: 220px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(8, 10, 16, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.84);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.public-viewer--chrome-hidden :deep(.dock-glass-superdark) {
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 640px) {
  .viewer-control-stack {
    right: 10px;
    /* Add safe-area-inset-right for Android devices in landscape
       where the gesture bar is on the right side */
    right: calc(10px + env(safe-area-inset-right, 0px));
    top: auto;
    /* Add safe-area-inset-bottom so controls clear the home indicator/gesture bar */
    bottom: calc(130px + env(safe-area-inset-bottom, 0px));
    transform: none;
    gap: 8px;
  }

  .viewer-rail {
    gap: 8px;
  }

  .viewer-rail__btn {
    width: 38px;
    height: 38px;
    border-radius: 12px;
  }

  .viewer-action-badge {
    right: 10px;
    top: auto;
    bottom: 42px;
    max-width: 180px;
  }

  .viewer-quality-banner {
    top: 10px;
    width: calc(100vw - 20px);
    padding: 10px 12px;
    gap: 10px;
    border-radius: 14px;
  }

  .viewer-quality-banner__title {
    font-size: 11px;
  }

  .viewer-quality-banner__msg {
    font-size: 10px;
  }

  .viewer-quality-banner__btn {
    height: 32px;
    padding: 0 10px;
    font-size: 10px;
  }
}

/* ── VirtualTour canvas ─────────────────────────────────── */
.vt-canvas {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.9s ease, filter 0.5s ease;
  touch-action: none;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  /* WebGL is already GPU-composited — will-change: transform would create an
     unnecessary EXTRA compositor layer on top, wasting mobile GPU memory. */
}
.vt-canvas--ready { opacity: 1; }
.vt-canvas--focused :deep(.psv-canvas-container) { filter: blur(3px) brightness(0.7); }

.vt-canvas :deep(.psv-container) {
  width: 100% !important;
  height: 100% !important;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  /* Remove PSV's default cursor so we can set our own below */
  cursor: default;
}

/* Grab cursor on desktop — consistent with native panorama viewers */
@media (pointer: fine) {
  .vt-canvas :deep(.psv-container) { cursor: grab; }
  .vt-canvas :deep(.psv-container:active) { cursor: grabbing; }
}

/* ── Overlays ───────────────────────────────────────────── */
.vt-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  pointer-events: none;
  background: rgba(8, 10, 16, 0.85);
  backdrop-filter: blur(12px);
  z-index: 10;
}
.vt-overlay--error { background: rgba(10, 10, 10, 0.85); }

.vt-overlay-icon { width: 28px; height: 28px; color: rgba(255,255,255,0.25); }
.vt-overlay-msg  { font-size: 12px; color: rgba(255,255,255,0.3); font-weight: 500; }

/* ── Plugin arrow hover — scene thumbnail card ──────────────────────────── */
:global(.vt-link-card) {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 130px;
  max-width: 160px;
}

:global(.vt-link-card__img) {
  width: 100%;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
  pointer-events: none;
  user-select: none;
}

:global(.vt-link-card__name) {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  text-align: center;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.vt-loading-ring {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255,255,255,0.12);
  border-top-color: rgba(59, 130, 246, 0.7);
  border-radius: 50%;
  animation: vt-spin 0.8s linear infinite;
}
@keyframes vt-spin { to { transform: rotate(360deg); } }

/* ── Cinematic vignette ─────────────────────────────────── */
.vt-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, transparent 40%, rgba(0,0,0,0.6) 100%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
  z-index: 5;
}
.vt-vignette--active { opacity: 1; }

/* ── PSV/VirtualTour overrides ──────────────────────────── */
:global(.psv-virtual-tour-arrow) {
  /* Let viewora-hotspot control its own display */
  background: transparent !important;
  border: none !important;
}

.vt-canvas :deep(.psv-compass) {
  background: rgba(10, 12, 20, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  margin-left: 12px;
  margin-bottom: 220px;
  width: 80px !important;
  height: 80px !important;
}
@media (min-width: 640px) {
  .vt-canvas :deep(.psv-compass) {
    margin-left: 20px;
    margin-bottom: 20px;
    width: 120px !important;
    height: 120px !important;
  }
}

.vt-canvas :deep(.psv-tooltip) {
  background: rgba(10, 12, 20, 0.75);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

/* Raise the PSV markers layer above the GlassDock (z-index: 30).
   PSV's default .psv-markers z-index is 10 which creates a stacking context
   that sits below the dock, hiding nav arrows behind it. */
.vt-canvas :deep(.psv-markers) {
  z-index: 35 !important;
}

:global(.psv-marker) { overflow: visible !important; }
:global(viewora-hotspot) {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  position: relative !important;
}

/* ── Settings gear button ───────────────────────────────── */
.vt-settings-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 20;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(10, 12, 20, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms, color 150ms, transform 150ms;
}
.vt-settings-btn:hover {
  background: rgba(255, 255, 255, 0.10);
  color: #fff;
  transform: rotate(30deg);
}
.vt-settings-btn svg { width: 17px; height: 17px; }

/* ── PSV Settings panel overrides ───────────────────────── */
:global(.psv-settings) {
  background: rgba(10, 12, 20, 0.96) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 14px !important;
  backdrop-filter: blur(16px) !important;
  padding: 6px !important;
  min-width: 200px !important;
}
:global(.psv-settings-item) {
  border-radius: 8px !important;
  padding: 10px 14px !important;
  color: rgba(255, 255, 255, 0.75) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  transition: background 120ms !important;
}
:global(.psv-settings-item:hover) {
  background: rgba(255, 255, 255, 0.07) !important;
  color: #fff !important;
}
:global(.psv-settings-item--active .psv-settings-item-icon) {
  color: #3b82f6 !important;
}
:global(.dock-glass-superdark) {
  background: rgba(255, 255, 255, 0.10) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.20) !important;
  /* Lift above iPhone home indicator bar when viewport-fit=cover is active */
  margin-bottom: env(safe-area-inset-bottom, 0px) !important;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(255, 255, 255, 0.05) !important;
}

/* ── Plain-DOM hotspot styles ───────────────────────────── */

/* ── NAV hotspot: indigo circle + pulse ring + label ──── */
:global(.vhs-nav) {
  position: relative;
  width: 52px;
  height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
  transition: transform 0.2s ease;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
}
:global(.vhs-nav:hover) { transform: scale(1.18); }

:global(.vhs-nav__pulse) {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 20px;
  margin: auto;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(99, 102, 241, 0.75);
  animation: vhs-nav-pulse 2s ease-out infinite;
  pointer-events: none;
}
@keyframes vhs-nav-pulse {
  0%   { transform: scale(1);   opacity: 0.8; }
  100% { transform: scale(1.9); opacity: 0;   }
}

:global(.vhs-nav__icon) {
  width: 48px;
  height: 48px;
  object-fit: contain;
  pointer-events: none;
}

:global(.vhs-nav__arrow) {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.65), inset 0 1px 0 rgba(255,255,255,0.25);
}
:global(.vhs-nav__arrow svg) { width: 22px; height: 22px; }

:global(.vhs-nav__label) {
  margin-top: 6px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.85);
  white-space: nowrap;
  text-shadow: 0 1px 6px rgba(0,0,0,0.95);
  background: rgba(0,0,0,0.55);
  padding: 2px 7px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── INFO hotspot: colored pin trigger + animated card ── */
:global(.vhs-info) {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
}

:global(.vhs-info__trigger) {
  position: relative;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
  z-index: 2;
}
:global(.vhs-info:hover .vhs-info__trigger) { transform: scale(1.25); }

:global(.vhs-info__pin-ring) {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 2px solid var(--vhs-color, #6366f1);
  opacity: 0.6;
  animation: vhs-info-ring 2.5s ease-out infinite;
  pointer-events: none;
}
@keyframes vhs-info-ring {
  0%   { transform: scale(1);   opacity: 0.65; }
  100% { transform: scale(2.1); opacity: 0;    }
}

:global(.vhs-info__trigger-icon) {
  width: 34px;
  height: 34px;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 2px 10px rgba(0,0,0,0.6));
  position: relative;
  z-index: 1;
}
:global(.vhs-info:hover .vhs-info__trigger-icon) { filter: drop-shadow(0 4px 14px rgba(0,0,0,0.7)) brightness(1.08); }

:global(.vhs-info__pin-dot) {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  box-shadow: 0 0 12px var(--vhs-color, #6366f1), 0 2px 6px rgba(0,0,0,0.5);
  border: 2.5px solid rgba(255,255,255,0.95);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
:global(.vhs-info--active .vhs-info__pin-dot) {
  box-shadow: 0 0 20px var(--vhs-color, #6366f1), 0 2px 8px rgba(0,0,0,0.6);
}

/* Card hidden by default — floats above the pin, slides in on .vhs-info--active */
:global(.vhs-info__card) {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  width: 220px;
  background: rgba(6, 8, 16, 0.97);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.11);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.07);
  color: #fff;
  font-family: -apple-system, 'Inter', sans-serif;
  /* Hidden state */
  opacity: 0;
  transform: translateX(-50%) translateY(8px) scale(0.93);
  pointer-events: none;
  transition: opacity 0.32s cubic-bezier(0.23,1,0.32,1), transform 0.32s cubic-bezier(0.23,1,0.32,1);
}
/* Active: card visible */
:global(.vhs-info--active .vhs-info__card) {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
  pointer-events: auto;
}

:global(.vhs-info__img) {
  width: 100%;
  height: 110px;
  background-size: cover;
  background-position: center;
  background-color: rgba(255,255,255,0.04);
}

:global(.vhs-info__body) { padding: 12px 14px 14px; }

:global(.vhs-info__header) {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
}

:global(.vhs-info__icon) {
  width: 14px; height: 14px;
  object-fit: contain;
  opacity: 0.9;
  flex-shrink: 0;
}

:global(.vhs-info__tag) {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

:global(.vhs-info__title) {
  margin: 0 0 5px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

:global(.vhs-info__desc) {
  margin: 0 0 8px;
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  line-height: 1.55;
}

:global(.vhs-info__link) {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  margin-top: 2px;
}
:global(.vhs-info__link:hover) { text-decoration: underline; }

/* On touch devices (mobile), disable the continuous pulse animations entirely.
   These rings repaint every frame. On desktop the GPU handles it easily;
   on mobile the ongoing GPU cost contributes to dropped frames during panning.
   The hotspot dot and icon remain visible — only the animated ring is off. */
@media (hover: none) and (pointer: coarse) {
  :global(.vhs-nav__pulse),
  :global(.vhs-info__pin-ring) {
    animation: none;
  }
}

/* Reset PSV marker defaults */
:global(.psv-marker) { overflow: visible !important; background: none !important; border: none !important; }

/* Hide arrows when dock is open */
/* Only the VirtualTourPlugin's native floor arrows toggle with the dock.
   Hotspot markers (.vhs-nav, .vhs-info) are always visible regardless of dock state. */
:global(.hide-nav-arrows .psv-virtual-tour-arrow) {
  display: none !important;
}

/* ── Loading progress bar ─────────────────────────────── */
.viewer-progress {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  z-index: 100;
  pointer-events: none;
  overflow: hidden;
  background: rgba(255,255,255,0.06);
}
.viewer-progress__bar {
  height: 100%;
  background: rgba(255,255,255,0.75);
  transition: width 80ms linear;
}
.viewer-progress-enter-active, .viewer-progress-leave-active { transition: opacity 280ms ease; }
.viewer-progress-enter-from, .viewer-progress-leave-to { opacity: 0; }

/* ── Initial tour loading overlay ────────────────────── */
.vt-init-overlay {
  position: absolute;
  inset: 0;
  z-index: 25;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: #0a0a0a;
  pointer-events: none;
}

.vt-init-overlay__logo-wrap {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.05), inset 0 0 15px rgba(255, 255, 255, 0.05);
  animation: init-logo-glow 2s ease-in-out infinite alternate;
}

.vt-init-overlay__logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  animation: init-logo-spin 6s linear infinite;
}

.vt-init-overlay__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

@keyframes init-logo-spin { to { transform: rotate(360deg); } }
@keyframes init-logo-glow {
  from { border-color: rgba(255,255,255,0.08); box-shadow: 0 0 20px rgba(255,255,255,0.03), inset 0 0 10px rgba(255,255,255,0.03); }
  to   { border-color: rgba(255,255,255,0.2);  box-shadow: 0 0 40px rgba(255,255,255,0.1),  inset 0 0 20px rgba(255,255,255,0.1); }
}

.vt-init-load-leave-active { transition: opacity 0.6s ease; }
.vt-init-load-leave-to     { opacity: 0; }

/* ── Scene name toast ─────────────────────────────────── */
.scene-toast {
  position: absolute;
  top: 18px; left: 50%; transform: translateX(-50%);
  z-index: 60;
  display: flex; align-items: center; gap: 7px;
  padding: 6px 14px 6px 10px;
  border-radius: 8px;
  background: rgba(10, 11, 16, 0.92);
  border: 1px solid rgba(255,255,255,0.09);
  backdrop-filter: blur(20px) saturate(1.2);
  color: rgba(255,255,255,0.88);
  font-size: 12px; font-weight: 600; letter-spacing: 0.02em;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  pointer-events: none;
}
.scene-toast__dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: rgba(255,255,255,0.55);
  flex-shrink: 0;
}
.scene-toast-enter-active { transition: opacity 200ms ease, transform 200ms cubic-bezier(0.22,1,0.36,1); }
.scene-toast-leave-active  { transition: opacity 240ms ease, transform 240ms ease; }
.scene-toast-enter-from    { opacity: 0; transform: translateX(-50%) translateY(-6px); }
.scene-toast-leave-to      { opacity: 0; transform: translateX(-50%) translateY(-4px); }



/* ── Hotspot hover labels ─────────────────────────────── */
:global(.vhs-info__hover-label) {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) translateY(3px);
  background: rgba(10,11,16,0.95);
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(14px);
  color: rgba(255,255,255,0.82);
  font-size: 10px; font-weight: 600; letter-spacing: 0.02em;
  white-space: nowrap;
  padding: 4px 8px; border-radius: 5px;
  opacity: 0; pointer-events: none;
  transition: opacity 140ms ease, transform 140ms ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35);
}
:global(.vhs-info:hover .vhs-info__hover-label) {
  opacity: 1; transform: translateX(-50%) translateY(0);
}
:global(.vhs-info--active .vhs-info__hover-label) { opacity: 0; }

@media (max-width: 640px) {
  .scene-toast { font-size: 11px; padding: 6px 12px 6px 10px; top: 12px; }
}

/* ── Floating CTA button ──────────────────────────────── */
.viewer-cta-btn {
  position: absolute;
  left: 20px;
  left: calc(20px + env(safe-area-inset-left, 0px));
  bottom: calc(26px + env(safe-area-inset-bottom, 0px));
  z-index: 35;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  background: #ffffff;
  color: #0a0b10;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 4px 20px rgba(0,0,0,0.35);
  transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
}
.viewer-cta-btn:hover {
  background: rgba(255,255,255,0.92);
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(0,0,0,0.4);
}
.viewer-cta-btn:active { transform: scale(0.97); }
.viewer-cta-fade-enter-active, .viewer-cta-fade-leave-active { transition: opacity 200ms ease, transform 200ms ease; }
.viewer-cta-fade-enter-from, .viewer-cta-fade-leave-to { opacity: 0; transform: translateY(6px); }


/* ── WhatsApp contact button (left side, mirrors control stack) ────────────── */
.viewer-wa-btn {
  position: absolute;
  left: 18px;
  left: calc(18px + env(safe-area-inset-left, 0px));
  top: 50%;
  transform: translateY(-50%);
  z-index: 35;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #25D366;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-shadow: 0 4px 24px rgba(37, 211, 102, 0.55), 0 2px 10px rgba(0, 0, 0, 0.35);
  transition: transform 140ms ease, box-shadow 140ms ease;
}
.viewer-wa-btn svg {
  width: 28px;
  height: 28px;
  position: relative;
  z-index: 1;
}
.viewer-wa-btn::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid rgba(37, 211, 102, 0.7);
  animation: wa-ring 2.4s ease-out infinite;
  pointer-events: none;
}
@keyframes wa-ring {
  0%   { transform: scale(1);   opacity: 0.9; }
  100% { transform: scale(1.75); opacity: 0; }
}
.viewer-wa-btn:hover {
  transform: translateY(-50%) translateY(-2px);
  box-shadow: 0 8px 32px rgba(37, 211, 102, 0.7), 0 2px 12px rgba(0, 0, 0, 0.4);
}
.viewer-wa-btn:hover::after { animation: none; opacity: 0; }
.viewer-wa-btn:active { transform: translateY(-50%) scale(0.95); }
/* Tooltip floats to the right of the button */
.viewer-wa-btn[data-tooltip]::before {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + 9px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
  background: rgba(10, 11, 16, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(14px);
  color: rgba(255, 255, 255, 0.88);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  padding: 5px 10px;
  border-radius: 6px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 130ms ease, transform 130ms ease;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  z-index: 50;
}
.viewer-wa-btn[data-tooltip]:hover::before {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}
.public-viewer--chrome-hidden .viewer-wa-btn {
  opacity: 0;
  pointer-events: none;
}
.wa-btn-enter-active, .wa-btn-leave-active { transition: opacity 200ms ease, transform 200ms ease; }
.wa-btn-enter-from, .wa-btn-leave-to { opacity: 0; transform: translateY(-50%) translateX(-8px); }

@media (max-width: 640px) {
  .viewer-wa-btn {
    left: 10px;
    left: calc(10px + env(safe-area-inset-left, 0px));
    top: auto;
    bottom: calc(200px + env(safe-area-inset-bottom, 0px));
    transform: none;
    width: 46px;
    height: 46px;
  }
  .viewer-wa-btn svg { width: 24px; height: 24px; }
  .viewer-wa-btn:hover { transform: translateY(-2px); }
  .viewer-wa-btn:active { transform: scale(0.95); }
  .wa-btn-enter-from, .wa-btn-leave-to { transform: translateX(-8px); }
}


/* ── Post-tour modal ──────────────────────────────────────────────────────── */
.post-tour-overlay {
  position: absolute;
  inset: 0;
  z-index: 150;
  background: rgba(4, 5, 10, 0.65);
  backdrop-filter: blur(12px) saturate(1.1);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.post-tour-card {
  position: relative;
  width: 100%;
  max-width: 340px;
  background: rgba(10, 11, 16, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 28px 24px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05);
  text-align: center;
}
.post-tour__close {
  position: absolute;
  top: 12px; right: 12px;
  width: 22px; height: 22px;
  border-radius: 5px;
  background: rgba(255,255,255,0.06);
  border: none; cursor: pointer;
  color: rgba(255,255,255,0.38);
  display: flex; align-items: center; justify-content: center;
  transition: background 120ms, color 120ms;
}
.post-tour__close:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.82); }
.post-tour__logo {
  max-width: 100px; max-height: 36px;
  object-fit: contain; opacity: 0.88;
}
.post-tour__body { display: flex; flex-direction: column; gap: 5px; }
.post-tour__eyebrow {
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: rgba(255,255,255,0.35);
}
.post-tour__title {
  font-size: 18px; font-weight: 700;
  color: rgba(255, 255, 255, 0.93);
  letter-spacing: -0.02em; line-height: 1.25; margin: 0;
}
.post-tour__desc {
  font-size: 12.5px; color: rgba(255,255,255,0.4);
  line-height: 1.6; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.post-tour__cta {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  width: 100%; height: 44px;
  border-radius: 9px;
  background: #ffffff;
  color: #0a0b10; font-size: 13px; font-weight: 700;
  text-decoration: none; letter-spacing: 0.02em;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  transition: background 140ms ease, transform 140ms ease;
}
.post-tour__cta:hover { background: rgba(255,255,255,0.92); transform: translateY(-1px); }
.post-tour__cta--whatsapp { background: #25D366; color: #fff; }
.post-tour__cta--whatsapp:hover { background: #20bd5a; }
.post-tour__dismiss {
  background: none; border: none; cursor: pointer;
  font-size: 11px; font-weight: 500;
  color: rgba(255,255,255,0.25); letter-spacing: 0.03em;
  transition: color 120ms;
}
.post-tour__dismiss:hover { color: rgba(255,255,255,0.5); }
.post-tour-enter-active { transition: opacity 220ms ease; }
.post-tour-enter-active .post-tour-card { transition: transform 220ms cubic-bezier(0.22,1,0.36,1); }
.post-tour-leave-active  { transition: opacity 180ms ease; }
.post-tour-enter-from    { opacity: 0; }
.post-tour-enter-from .post-tour-card { transform: scale(0.93) translateY(16px); }
.post-tour-leave-to      { opacity: 0; }

@media (max-width: 640px) {
  .viewer-cta-btn {
    left: 12px;
    bottom: 88px;
    height: 34px;
    font-size: 11px;
    padding: 0 13px;
  }
  .post-tour-card { padding: 22px 18px 18px; gap: 12px; }
  .post-tour__title { font-size: 17px; }
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE PERFORMANCE — strip every backdrop-filter and heavy GPU effect
   ─────────────────────────────────────────────────────────────────────────
   During panorama pan, the WebGL canvas redraws at 60fps. Every element
   with backdrop-filter must re-sample and re-blur that changing canvas
   on EVERY FRAME. With 15+ blur layers, mobile GPUs drop frames continuously.

   On touch devices we replace all backdrop-filter blurs with solid
   semi-transparent backgrounds. Visual quality drops slightly; frame rate
   goes from 20-30fps → 60fps. That trade-off is always correct on mobile.

   Also removes will-change: transform from overlay elements — stacking
   compositor layers exhausts GPU memory on mid-range Android phones.
   ───────────────────────────────────────────────────────────────────────── */
@media (hover: none) and (pointer: coarse) {

  /* NOTE: do NOT add contain:layout to .public-viewer or .vt-canvas —
     contain:layout breaks height:100% resolution from the parent, which
     causes the viewer to be shorter than the screen on Android. */

  /* Control rail buttons */
  .viewer-rail__btn {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(8, 10, 16, 0.88) !important;
  }

  /* Scene toast */
  .scene-toast {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(8, 10, 16, 0.92) !important;
  }

  /* Overlays */
  .vt-overlay {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(8, 10, 16, 0.90) !important;
  }

  /* Share modal */
  .share-overlay {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(10, 12, 18, 0.82) !important;
  }

  /* Quality banner */
  .viewer-quality-banner {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(7, 10, 16, 0.92) !important;
  }

  /* Post-tour modal */
  .post-tour-overlay {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(4, 5, 10, 0.85) !important;
  }

  /* Dock — the heaviest offender: full-width, always visible during pan */
  :global(.dock-glass-superdark) {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(10, 12, 18, 0.92) !important;
  }

  /* Hotspot info card */
  :global(.vhs-info__card) {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(6, 8, 16, 0.97) !important;
  }

  /* Hotspot hover label */
  :global(.vhs-info__hover-label) {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(8, 10, 16, 0.95) !important;
  }

  /* Nav hotspot label (if shown) */
  :global(.vhs-nav__label) {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(0, 0, 0, 0.7) !important;
  }

  /* PSV tooltip */
  .vt-canvas :deep(.psv-tooltip) {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(8, 10, 16, 0.95) !important;
  }

  /* PSV compass */
  .vt-canvas :deep(.psv-compass) {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(8, 10, 16, 0.80) !important;
  }

  /* Drop shadows on hotspot icons force per-frame filter recalculation —
     replace with a simpler box-shadow which is compositor-only */
  :global(.vhs-nav) {
    filter: none !important;
  }
  :global(.vhs-nav__icon),
  :global(.psv-hs-icon-img) {
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5)) !important;
  /* Remove will-change from overlay elements — too many compositor layers
     exhausts GPU memory on mid-range Android */
  }

  .viewer-control-stack,
  .viewer-cta-btn,
  .viewer-wa-btn,
  .scene-toast {
    will-change: auto !important;
  }
  /* Ring animation is cheap but adds a repaint layer — disable on touch */
  .viewer-wa-btn::after { animation: none; }
  .viewer-wa-btn[data-tooltip]::before { backdrop-filter: none !important; }
}

/* ── Interaction Hint Overlay ─────────────────────────────────────────── */
.viewer-hint {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.22);
  pointer-events: none;
  user-select: none;
}

.viewer-hint__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  color: #ffffff;
}

.viewer-hint__icon-wrap {
  position: relative;
  width: 120px;
  height: 120px;
}

.viewer-hint__icon {
  width: 72px;
  height: 72px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: hint-swipe-move 2.4s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
}

.viewer-hint__icon--mouse {
  animation: hint-drag-move 2.4s ease-in-out infinite;
}

.viewer-hint__arrows {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.viewer-hint__arrow {
  width: 30px;
  height: 30px;
  opacity: 0.8;
  animation: hint-arrow-pulse 2.4s ease-in-out infinite;
}

.viewer-hint__arrow--left  { animation-delay: 0s; }
.viewer-hint__arrow--right { animation-delay: 0.18s; }

.viewer-hint__text {
  font-family: var(--font-outfit, sans-serif);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
  animation: hint-text-fade 2.4s ease-in-out infinite;
}

@keyframes hint-swipe-move {
  0%   { transform: translate(-80%, -50%) rotate(-6deg); }
  50%  { transform: translate(-20%, -50%) rotate( 6deg); }
  100% { transform: translate(-80%, -50%) rotate(-6deg); }
}

@keyframes hint-drag-move {
  0%   { transform: translate(-70%, -50%) rotate(-4deg); }
  50%  { transform: translate(-30%, -50%) rotate( 4deg); }
  100% { transform: translate(-70%, -50%) rotate(-4deg); }
}

@keyframes hint-arrow-pulse {
  0%, 100% { opacity: 0.1;  transform: scale(0.88); }
  50%       { opacity: 0.85; transform: scale(1.12); }
}

@keyframes hint-text-fade {
  0%, 100% { opacity: 0.65; transform: translateY(0); }
  50%       { opacity: 1;    transform: translateY(-3px); }
}

.hint-fade-enter-active,
.hint-fade-leave-active { transition: opacity 0.5s ease; }
.hint-fade-enter-from,
.hint-fade-leave-to     { opacity: 0; }

/* ── Viewer: tier-specific overrides ────────────────────────────────────
   The broad @media block above strips backdrop-filter on ALL touch devices.
   These tier classes apply finer control inside the viewer itself.         */

/* LOW-END: also kill hotspot marker animations and pulse rings */
:global(.device-tier-low) .vt-canvas :deep(.psv-markers) {
  /* Reduce marker complexity — no animations at all */
}
:global(.device-tier-low .vhs-nav__pulse),
:global(.device-tier-low .vhs-info__pin-ring) {
  animation: none !important;
  opacity: 0.4;
}
:global(.device-tier-low .vhs-nav__arrow) {
  box-shadow: none !important;
}

/* MID-RANGE: pulse rings visible but slower/simpler */
:global(.device-tier-mid .vhs-nav__pulse) {
  animation-duration: 3s !important;
}
:global(.device-tier-mid .vhs-info__pin-ring) {
  animation-duration: 3.5s !important;
}
</style>