<template>
  <!-- Hero section with a video embedded inside a stylised iPhone frame -->
  <section class="hero">
    <div class="container flex">
      <!-- Video side showing the phone with looping demo -->
      <div class="video-container">
        <div class="iphone-x">
          <div class="side">
            <div class="screen">
              <video
                src="https://ar-code.com/images/AR-Code-demo.mp4"
                autoplay
                loop
                muted
                playsinline
                poster="https://ar-code.com/images/arcode-video.webp"
              ></video>
            </div>
          </div>
          <div class="line"></div>
          <div class="volume-button"></div>
          <div class="power-button"></div>
        </div>
      </div>
      <!-- Textual side with headline, description and call to action -->
      <div class="text-container">
        <h1>Augmented Reality Code</h1>
        <p class="subtitle"><strong>No need for an app.</strong></p>
        <p class="description">
          An AR Code is a type of barcode that contains the necessary
          information to generate an augmented reality 3D experience. It
          operates without the need for a dedicated app on smartphones and
          AR/VR headsets like the Apple Vision Pro. Begin creating,
          managing, and tracking your AR experiences.
        </p>
        <div class="actions">
          <NuxtLink to="/register" class="btn-primary">Get Started</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// This is a purely presentational component. No script logic is required.
</script>

<!-- Component styling is delegated to the global stylesheet -->